# 11 Pipeline Aggs

## 对其他聚合结果进行二次聚合

### 分为Parent 和 Sibling 两类


管道聚合不能具有子聚合，但是根据其类型，它可以引用buckets_path 允许管道聚合链接的另一个管道。例如，您可以将两个导数链接在一起以计算第二个导数（即导数的导数）。

## buckets_path 的语法

### 1）与操作的聚合对象同级，就是 Agg_Name

POST /_search
{
    "aggs": {
        "my_date_histo":{
            "date_histogram":{
                "field":"timestamp",
                "calendar_interval":"day"
            },
            "aggs":{
                "the_sum":{
                    "sum":{ "field": "lemmings" } 
                },
                "the_movavg":{
                    "moving_avg":{ "buckets_path": "the_sum" } 
                }
            }
        }
    }
}

### 2）与操作的聚合对象不同级，就是 Agg_Name的相对路径，多个 Agg_Name间使用“>”连接

POST /_search
{
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sales": {
                    "sum": {
                        "field": "price"
                    }
                }
            }
        },
        "max_monthly_sales": {
            "max_bucket": {
                "buckets_path": "sales_per_month>sales" 
            }
        }
    }
}

### 3）操作对象是多值桶某个key 的聚合，就是 Agg_Name1['keyName']>Agg_Name2

POST /_search
{
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sale_type": {
                    "terms": {
                        "field": "type"
                    },
                    "aggs": {
                        "sales": {
                            "sum": {
                                "field": "price"
                            }
                        }
                    }
                },
                "hat_vs_bag_ratio": {
                    "bucket_script": {
                        "buckets_path": {
                            "hats": "sale_type['hat']>sales", 
                            "bags": "sale_type['bag']>sales"  
                        },
                        "script": "params.hats / params.bags"
                    }
                }
            }
        }
    }
}

### 4）特殊路径

POST /_search
{
    "aggs": {
        "my_date_histo": {
            "date_histogram": {
                "field":"timestamp",
                "calendar_interval":"day"
            },
            "aggs": {
                "the_movavg": {
                    "moving_avg": { "buckets_path": "_count" } 
                }
            }
        }
    }
}

或者
POST /sales/_search
{
  "size": 0,
  "aggs": {
    "histo": {
      "date_histogram": {
        "field": "date",
        "calendar_interval": "day"
      },
      "aggs": {
        "categories": {
          "terms": {
            "field": "category"
          }
        },
        "min_bucket_selector": {
          "bucket_selector": {
            "buckets_path": {
              "count": "categories._bucket_count" 
            },
            "script": {
              "source": "params.count != 0"
            }
          }
        }
      }
    }
  }
}

## Parent【9种】

### 结果内嵌到现有的聚合分析结果中

### 1）Bucket Script
  桶脚本聚合

语法：

{
    "bucket_script": {
        "buckets_path": {
            "my_var1": "the_sum", 
            "my_var2": "the_value_count"
        },
        "script": "params.my_var1 / params.my_var2"
    }
}

- 场景：执行一个脚本，该脚本可以在父多桶聚合中按指定的指标执行每个桶的计算。【指定的指标必须是数字的，脚本必须返回数字值】
- 示例

  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "total_sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "t-shirts": {
                    "filter": {
                      "term": {
                        "type": "t-shirt"
                      }
                    },
                    "aggs": {
                      "sales": {
                        "sum": {
                          "field": "price"
                        }
                      }
                    }
                  },
                  "t-shirt-percentage": {
                      "bucket_script": {
                          "buckets_path": {
                            "tShirtSales": "t-shirts>sales",
                            "totalSales": "total_sales"
                          },
                          "script": "params.tShirtSales / params.totalSales * 100"
                      }
                  }
              }
          }
      }
  }

	- 计算出每月T恤销售额与总销售额的比例百分比
	- 结果

	  {
	     "took": 11,
	     "timed_out": false,
	     "_shards": ...,
	     "hits": ...,
	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "total_sales": {
	                     "value": 550.0
	                 },
	                 "t-shirts": {
	                     "doc_count": 1,
	                     "sales": {
	                         "value": 200.0
	                     }
	                 },
	                 "t-shirt-percentage": {
	                     "value": 36.36363636363637
	                 }
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "total_sales": {
	                     "value": 60.0
	                 },
	                 "t-shirts": {
	                     "doc_count": 1,
	                     "sales": {
	                         "value": 10.0
	                     }
	                 },
	                 "t-shirt-percentage": {
	                     "value": 16.666666666666664
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "total_sales": {
	                     "value": 375.0
	                 },
	                 "t-shirts": {
	                     "doc_count": 1,
	                     "sales": {
	                         "value": 175.0
	                     }
	                 },
	                 "t-shirt-percentage": {
	                     "value": 46.666666666666664
	                 }
	              }
	           ]
	        }
	     }
	  }

### 2）Bucket Selector
 桶选择器聚合

语法：

{
    "bucket_selector": {
        "buckets_path": {
            "my_var1": "the_sum", 
            "my_var2": "the_value_count"
        },
        "script": "params.my_var1 > params.my_var2"
    }
}

- 场景：该脚本确定当前存储桶是否将保留在父多存储桶聚合中。【指定的指标必须为数字，并且脚本必须返回布尔值】
- 注意

	- 像所有管道聚合一样，bucket_selector聚合在所有其他同级聚合之后执行
	- 这意味着使用bucket_selector聚合来过滤响应中返回的存储桶不会节省运行聚合的执行时间。

- 示例

  
  
  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "total_sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "sales_bucket_filter": {
                      "bucket_selector": {
                          "buckets_path": {
                            "totalSales": "total_sales"
                          },
                          "script": "params.totalSales > 200"
                      }
                  }
              }
          }
      }
  }

	- 获取当月总销售额超过200的存储分区
	- 结果

	  {
	     "took": 11,
	     "timed_out": false,
	     "_shards": ...,
	     "hits": ...,
	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "total_sales": {
	                     "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "total_sales": {
	                     "value": 375.0
	                 },
	              }
	           ]
	        }
	     }
	  }

### 3）Bucket Sort
  桶排序聚合

语法：

{
    "bucket_sort": {
        "sort": [
            {"sort_field_1": {"order": "asc"}},
            {"sort_field_2": {"order": "desc"}},
            "sort_field_3"
        ],
        "from": 1,
        "size": 3
    }
}

- 场景：对其父级多桶聚合的桶进行排序。可以指定零个或多个排序字段以及相应的排序顺序。
- 参数

	- sort 参数可以是：_key、_count 或子聚合【该参数可以不赋值】
	- 支持from、size参数，截断结果存储桶

- 注意

	- 该聚合在所有其他非管道聚合之后执行，
这意味着排序仅适用于父聚合已经返回的所有存储桶。
	- 比如：父聚合terms其size设置为10，bucket_sort则只会对返回的这10个条件项进行排序。

- 示例

  
  
  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "total_sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "sales_bucket_sort": {
                      "bucket_sort": {
                          "sort": [
                            {"total_sales": {"order": "desc"}}
                          ],
                          "size": 3，                        				
  		        		"from": 0
                      }
                  }
              }
          }
      }
  }
  
  也可以使用此聚合来截断结果存储桶，而不进行任何排序。为此，只需使用from和/或size参数而无需指定sort。

	- 按降序返回总销售额最高的3个月相对应的存储桶
	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "total_sales": {
	                     "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "total_sales": {
	                     "value": 375.0
	                 },
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "total_sales": {
	                     "value": 60.0
	                 },
	              }
	           ]
	        }
	     }

### 4）Cumulative Cardinality
  累积基数聚合

语法：
{
    "cumulative_cardinality": {
        "buckets_path": "my_cardinality_agg"
    }
}

- 场景：用于计算父直方图（或date_histogram）聚合中的累积基数。【指定的指标必须是基数聚合，并且包围的直方图必须已min_doc_count设置为0（histogram聚合默认）】
- 示例

  累积基数聚合可用于确定每天有多少唯一身份访问者是“新访客”。
  
  GET /user_hits/_search
  {
      "size": 0,
      "aggs" : {
          "users_per_day" : {
              "date_histogram" : {
                  "field" : "timestamp",
                  "calendar_interval" : "day"
              },
              "aggs": {
                  "distinct_users": {
                      "cardinality": {
                          "field": "user_id"
                      }
                  },
                  "total_new_users": {
                      "cumulative_cardinality": {
                          "buckets_path": "distinct_users" 
                      }
                  }
              }
          }
      }
  }

	- 获取网站每天的新访问者总的累计数量
【后一天会累加前一天的，就是以第一天为基准】
	- 结果

	     "aggregations": {
	        "users_per_day": {
	           "buckets": [
	              {
	                 "key_as_string": "2019-01-01T00:00:00.000Z",
	                 "key": 1546300800000,
	                 "doc_count": 2,
	                 "distinct_users": {
	                    "value": 2
	                 },
	                 "total_new_users": {
	                    "value": 2
	                 }
	              },
	              {
	                 "key_as_string": "2019-01-02T00:00:00.000Z",
	                 "key": 1546387200000,
	                 "doc_count": 2,
	                 "distinct_users": {
	                    "value": 2
	                 },
	                 "total_new_users": {
	                    "value": 3
	                 }
	              },
	              {
	                 "key_as_string": "2019-01-03T00:00:00.000Z",
	                 "key": 1546473600000,
	                 "doc_count": 3,
	                 "distinct_users": {
	                    "value": 3
	                 },
	                 "total_new_users": {
	                    "value": 4
	                 }
	              }
	           ]
	        }
	     }
	  }
	  
	  结果分析：
	  请注意，第二天2019-01-02拥有两个不同的用户，但total_new_users累积管道agg生成的指标仅增加到三个。这意味着当天的两个用户中只有一个是新用户，而在前一天已经看到了另一个用户。第三天再次发生这种情况，三个用户中只有一个是全新的。
	  

- derivative 
增量累积基数

	- 累计增量求导，就是新增的
	- 示例

	  
	  这可以通过向derivative我们的查询添加聚合来完成：
	  
	  GET /user_hits/_search
	  {
	      "size": 0,
	      "aggs" : {
	          "users_per_day" : {
	              "date_histogram" : {
	                  "field" : "timestamp",
	                  "calendar_interval" : "day"
	              },
	              "aggs": {
	                  "distinct_users": {
	                      "cardinality": {
	                          "field": "user_id"
	                      }
	                  },
	                  "total_new_users": {
	                      "cumulative_cardinality": {
	                          "buckets_path": "distinct_users"
	                      }
	                  },
	                  "incremental_new_users": {
	                      "derivative": {
	                          "buckets_path": "total_new_users"
	                      }
	                  }
	              }
	          }
	      }
	  }

		- 获取网站每天增加了多少新用户
【数据以前一天为基准】
		- 结果

		     "aggregations": {
		        "users_per_day": {
		           "buckets": [
		              {
		                 "key_as_string": "2019-01-01T00:00:00.000Z",
		                 "key": 1546300800000,
		                 "doc_count": 2,
		                 "distinct_users": {
		                    "value": 2
		                 },
		                 "total_new_users": {
		                    "value": 2
		                 }
		              },
		              {
		                 "key_as_string": "2019-01-02T00:00:00.000Z",
		                 "key": 1546387200000,
		                 "doc_count": 2,
		                 "distinct_users": {
		                    "value": 2
		                 },
		                 "total_new_users": {
		                    "value": 3
		                 },
		                 "incremental_new_users": {
		                    "value": 1.0
		                 }
		              },
		              {
		                 "key_as_string": "2019-01-03T00:00:00.000Z",
		                 "key": 1546473600000,
		                 "doc_count": 3,
		                 "distinct_users": {
		                    "value": 3
		                 },
		                 "total_new_users": {
		                    "value": 4
		                 },
		                 "incremental_new_users": {
		                    "value": 1.0
		                 }
		              }
		           ]
		        }
		     }
		  }

### 5）Cumulative Sum
 累积总和聚合

{
    "cumulative_sum": {
        "buckets_path": "the_sum"
    }
}

- 场景：用于计算父直方图（或date_histogram）聚合中指定指标的累积总和。指定的指标必须是数字，并且包围的直方图必须已min_doc_count设置为0（histogram聚合的默认值）。
- 示例

  
  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "cumulative_sales": {
                      "cumulative_sum": {
                          "buckets_path": "sales" 
                      }
                  }
              }
          }
      }
  }
  
  

	- 计算到当月为止，每月累计销售金额的总和
	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 },
	                 "cumulative_sales": {
	                    "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 },
	                 "cumulative_sales": {
	                    "value": 610.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 375.0
	                 },
	                 "cumulative_sales": {
	                    "value": 985.0
	                 }
	              }
	           ]
	        }
	     }
	  }

### 6）Derivative
  导数聚合

父管道聚合，用于计算父直方图（或date_histogram）聚合中指定指标的导数。指定的指标必须是数字，并且包围的直方图必须已min_doc_count设置为0（histogram聚合的默认值）。

以下代码段计算了每月总计的导数sales：
POST /sales/_search
{
    "size": 0,
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sales": {
                    "sum": {
                        "field": "price"
                    }
                },
                "sales_deriv": {
                    "derivative": {
                        "buckets_path": "sales" 
                    }
                }
            }
        }
    }
}

- 场景：用于计算父直方图（或date_histogram）聚合中指定指标的导数。

  父管道聚合，用于计算父直方图（或date_histogram）聚合中指定指标的导数。指定的指标必须是数字，并且包围的直方图必须已min_doc_count设置为0（histogram聚合的默认值）。
  

- 一阶导数：示例

  
  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "sales_deriv": {
                      "derivative": {
                          "buckets_path": "sales" 
                      }
                  }
              }
          }
      }
  }

	- 计算每月累计销售金额的导数
	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 } 
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 },
	                 "sales_deriv": {
	                    "value": -490.0 
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2, 
	                 "sales": {
	                    "value": 375.0
	                 },
	                 "sales_deriv": {
	                    "value": 315.0
	                 }
	              }
	           ]
	        }
	     }
	  }

- 二阶导数：示例

  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "sales": {
                      "sum": {
                          "field": "price"
                      }
                  },
                  "sales_deriv": {
                      "derivative": {
                          "buckets_path": "sales"
                      }
                  },
                  "sales_2nd_deriv": {
                      "derivative": {
                          "buckets_path": "sales_deriv" 
                      }
                  }
              }
          }
      }
  }

	- 将计算每月总销售额的一阶和二阶导数
	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 } 
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 },
	                 "sales_deriv": {
	                    "value": -490.0
	                 } 
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 375.0
	                 },
	                 "sales_deriv": {
	                    "value": 315.0
	                 },
	                 "sales_2nd_deriv": {
	                    "value": 805.0
	                 }
	              }
	           ]
	        }
	     }
	  }

### 7）Moving Average
 移动平均聚合

给定一系列有序的数据，移动平均聚合将在数据上滑动一个窗口，并发出该窗口的平均值。例如，给定数据[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]，我们可以计算出窗口尺寸5如下的简单移动平均值：

（1 + 2 + 3 + 4 + 5）/ 5 = 3
（2 + 3 + 4 + 5 + 6）/ 5 = 4
（3 + 4 + 5 + 6 + 7）/ 5 = 5
等等

移动平均值是一种平滑顺序数据的简单方法。移动平均值通常应用于基于时间的数据，例如股票价格或服务器指标。平滑可用于消除高频波动或随机噪声，从而使低频趋势更容易可视化，例如季节性。

{
    "moving_avg": {
        "buckets_path": "the_sum",
        "model": "holt",
        "window": 5,
        "gap_policy": "insert_zeros",
        "settings": {
            "alpha": 0.8
        }
    }
}

- 场景：给定一系列有序的数据，移动平均值聚合将在数据上滑动一个窗口，并发出该窗口的平均值。【moving_avg聚合必须嵌入histogram或的内部date_histogram】
- 语法示例

  POST /_search
  {
      "size": 0,
      "aggs": {
          "my_date_histo":{                
              "date_histogram":{
                  "field":"date",
                  "calendar_interval":"1M"
              },
              "aggs":{
                  "the_sum":{
                      "sum":{ "field": "price" } 
                  },
                  "the_movavg":{
                      "moving_avg":{ "buckets_path": "the_sum" } 
                  }
              }
          }
      }
  }

	- 结果

	     "aggregations": {
	        "my_date_histo": {
	           "buckets": [
	               {
	                   "key_as_string": "2015/01/01 00:00:00",
	                   "key": 1420070400000,
	                   "doc_count": 3,
	                   "the_sum": {
	                      "value": 550.0
	                   }
	               },
	               {
	                   "key_as_string": "2015/02/01 00:00:00",
	                   "key": 1422748800000,
	                   "doc_count": 2,
	                   "the_sum": {
	                      "value": 60.0
	                   },
	                   "the_movavg": {
	                      "value": 550.0
	                   }
	               },
	               {
	                   "key_as_string": "2015/03/01 00:00:00",
	                   "key": 1425168000000,
	                   "doc_count": 2,
	                   "the_sum": {
	                      "value": 375.0
	                   },
	                   "the_movavg": {
	                      "value": 305.0
	                   }
	               }
	           ]
	        }
	     }
	  }

### 8） Moving Function
  移动函数聚合

给定一系列有序的数据，移动功能聚合将在数据上滑动一个窗口，并允许用户指定在每个数据窗口上执行的自定义脚本。为了方便起见，预定义了许多常用功能，例如最小/最大，移动平均值等。

从概念上讲，这与移动平均管道聚合非常相似，只是它提供了更多功能。

{
    "moving_fn": {
        "buckets_path": "the_sum",
        "window": 10,
        "script": "MovingFunctions.min(values)"
    }
}

- 场景：给定一系列有序的数据，移动功能聚合将在数据上滑动一个窗口，并允许用户指定在每个数据窗口上执行的自定义脚本。
- 从概念上讲，它与移动平均管道聚合非常相似，只是它提供了更多功能。

### 9） Serial Differencing
 串行差分聚合

串行差分是一种在不同的时间滞后或周期从其自身中减去时间序列中的值的技术。例如，数据点f（x）= f（x t）-f（x t-n），其中n是使用的周期。

## Sibling【7种】

### 结果和现有分析结果同级

### 1）Avg Bucket
 平均存储桶聚合

兄弟管道聚合，用于计算兄弟聚合中指定指标的（平均）平均值。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。

语法：
{
    "avg_bucket": {
        "buckets_path": "the_sum"
    }
}


- 场景：用于计算兄弟聚合中指定指标的（平均）平均值【同级聚合必须是多桶聚合】
- 示例

  
  
  POST /_search
  {
    "size": 0,
    "aggs": {
      "sales_per_month": {
        "date_histogram": {
          "field": "date",
          "calendar_interval": "month"
        },
        "aggs": {
          "sales": {
            "sum": {
              "field": "price"
            }
          }
        }
      },
      "avg_monthly_sales": {
        "avg_bucket": {
          "buckets_path": "sales_per_month>sales" 
        }
      }
    }
  }
  	
  buckets_path指示此avg_bucket聚合我们想要sales_per_month日期直方图中的sales聚合的平均值。
  
  

	- 计算每月销售额总量的平均值
	- 结果

	  {
	     "took": 11,
	     "timed_out": false,
	     "_shards": ...,
	     "hits": ...,
	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 375.0
	                 }
	              }
	           ]
	        },
	        "avg_monthly_sales": {
	            "value": 328.33333333333333
	        }
	     }
	  }

### 2）Max Bucket
 最大存储桶聚合

同级管道聚合，它在同级聚合中以指定指标的最大值标识存储桶，并输出存储桶的值和密钥。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。


以下代码段计算出每月总计的最大值sales：
POST /sales/_search
{
    "size": 0,
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sales": {
                    "sum": {
                        "field": "price"
                    }
                }
            }
        },
        "max_monthly_sales": {
            "max_bucket": {
                "buckets_path": "sales_per_month>sales" 
            }
        }
    }
}



### 3）Min Bucket
  最小存储桶聚合

同级管道聚合，它在同级聚合中用指定指标的最小值标识存储桶，并输出存储桶的值和密钥。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。

以下代码段计算了每月总计的最小值sales：
POST /sales/_search
{
    "size": 0,
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sales": {
                    "sum": {
                        "field": "price"
                    }
                }
            }
        },
        "min_monthly_sales": {
            "min_bucket": {
                "buckets_path": "sales_per_month>sales" 
            }
        }
    }
}

### 4）Sum Bucket
 总和存储桶聚合

同级管道聚合，用于计算同级聚合中指定指标的所有存储区之间的总和。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。

以下代码段计算了所有每月总计的总和sales：

POST /sales/_search
{
    "size": 0,
    "aggs" : {
        "sales_per_month" : {
            "date_histogram" : {
                "field" : "date",
                "calendar_interval" : "month"
            },
            "aggs": {
                "sales": {
                    "sum": {
                        "field": "price"
                    }
                }
            }
        },
        "sum_monthly_sales": {
            "sum_bucket": {
                "buckets_path": "sales_per_month>sales" 
            }
        }
    }
}



### 5）Stats Bucket
  统计数据桶聚合

同级管道聚合，可在同级聚合中计算指定指标的所有存储段中的各种统计信息。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。

{
    "stats_bucket": {
        "buckets_path": "the_sum"
    }
}

- 场景：可在同级聚合中计算指定指标的所有存储段中的各种统计信息【包括：Count、Avg、Max、Min、Sum】
- 示例

  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "sales": {
                      "sum": {
                          "field": "price"
                      }
                  }
              }
          },
          "stats_monthly_sales": {
              "stats_bucket": {
                  "buckets_path": "sales_per_month>sales" 
              }
          }
      }
  }

	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 375.0
	                 }
	              }
	           ]
	        },
	        "stats_monthly_sales": {
	           "count": 3,
	           "min": 60.0,
	           "max": 550.0,
	           "avg": 328.3333333333333,
	           "sum": 985.0
	        }
	     }
	  }

### 6）Extended Stats Bucket
  扩展统计数据桶聚合

同级管道聚合，可在同级聚合中计算指定指标的所有存储段中的各种统计信息。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。

与stats_bucket聚合相比，此聚合提供了更多的统计信息（平方和，标准差等）

{
    "extended_stats_bucket": {
        "buckets_path": "the_sum"
    }
}

示例结果：
      "stats_monthly_sales": {
         "count": 3,
         "min": 60.0,
         "max": 550.0,
         "avg": 328.3333333333333,
         "sum": 985.0,
         "sum_of_squares": 446725.0,
         "variance": 41105.55555555556,
         "std_deviation": 202.74505063146563,
         "std_deviation_bounds": {
           "upper": 733.8234345962646,
           "lower": -77.15676792959795
         }
      }
   }

- 场景：与stats_bucket聚合相比，此聚合提供了更多的统计信息（平方和，标准差等）
- 结果示例

  示例结果：
        "stats_monthly_sales": {
           "count": 3,
           "min": 60.0,
           "max": 550.0,
           "avg": 328.3333333333333,
           "sum": 985.0,
           "sum_of_squares": 446725.0,
           "variance": 41105.55555555556,
           "std_deviation": 202.74505063146563,
           "std_deviation_bounds": {
             "upper": 733.8234345962646,
             "lower": -77.15676792959795
           }
        }
     }

### 7）Percentiles Bucket
 百分数桶聚合

{
    "percentiles_bucket": {
        "buckets_path": "the_sum"
    }
}

- 场景：用于计算同级聚合中指定指标的所有存储桶的百分比。指定的指标必须是数字，并且同级聚合必须是多存储桶聚合。
- 示例

  
  POST /sales/_search
  {
      "size": 0,
      "aggs" : {
          "sales_per_month" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "month"
              },
              "aggs": {
                  "sales": {
                      "sum": {
                          "field": "price"
                      }
                  }
              }
          },
          "percentiles_monthly_sales": {
              "percentiles_bucket": {
                  "buckets_path": "sales_per_month>sales", 
                  "percents": [ 25.0, 50.0, 75.0 ] 
              }
          }
      }
  }

	- 计算每月总销售额存储桶对应的百分比位置的金额
	- 结果

	     "aggregations": {
	        "sales_per_month": {
	           "buckets": [
	              {
	                 "key_as_string": "2015/01/01 00:00:00",
	                 "key": 1420070400000,
	                 "doc_count": 3,
	                 "sales": {
	                    "value": 550.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/02/01 00:00:00",
	                 "key": 1422748800000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 60.0
	                 }
	              },
	              {
	                 "key_as_string": "2015/03/01 00:00:00",
	                 "key": 1425168000000,
	                 "doc_count": 2,
	                 "sales": {
	                    "value": 375.0
	                 }
	              }
	           ]
	        },
	        "percentiles_monthly_sales": {
	          "values" : {
	              "25.0": 375.0,
	              "50.0": 375.0,
	              "75.0": 550.0
	           }
	        }
	     }
	  }

- percents：指定我们要计算的百分位数

