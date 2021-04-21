# 10 Metrics Aggs

## 指标分析类型，一些数学运算，对文档字段进行统计分析

### 类似于 sql 的 COUNT() 、 SUM() 、 MAX() 等统计方法。

## 18种Metrics聚合

https://www.elastic.co/guide/en/elasticsearch/reference/7.7/search-aggregations-metrics-avg-aggregation.html




### 1） Avg 
 平均聚合

POST /exams/_search?size=0
{
    "aggs" : {
        "avg_grade" : { "avg" : { "field" : "grade" } }
    }
}

结果：
{
    ...
    "aggregations": {
        "avg_grade": {
            "value": 75.0
        }
    }
}

- 场景：一个单值度量聚合，计算聚合的文档中对应数值字段的平均值
- 示例

  POST /exams/_search?size=0
  {
      "aggs" : {
          "avg_grade" : { "avg" : { "field" : "grade" } }
      }
  }
  
  结果：
  {
      ...
      "aggregations": {
          "avg_grade": {
              "value": 75.0
          }
      }
  }

	- 求学生的平均成绩

- 重要参数

	- missing

		- 对于Field没有值的文档，以该参数的值填充

		  POST /exams/_search?size=0
		  {
		      "aggs" : {
		          "grade_avg" : {
		              "avg" : {
		                  "field" : "grade",
		                  "missing": 10 
		              }
		          }
		      }
		  }

	- 支持脚本 Script

	  POST /exams/_search?size=0
	  {
	      "aggs" : {
	          "avg_grade" : {
	              "avg" : {
	                  "script" : {
	                      "source" : "doc.grade.value"
	                  }
	              }
	          }
	      }
	  }

	- Value Script

	  POST /exams/_search?size=0
	  {
	      "aggs" : {
	          "avg_corrected_grade" : {
	              "avg" : {
	                  "field" : "grade",
	                  "script" : {
	                      "lang": "painless",
	                      "source": "_value * params.correction",
	                      "params" : {
	                          "correction" : 1.2
	                      }
	                  }
	              }
	          }
	      }
	  }

### 2）Max
 最大聚合

POST /sales/_search?size=0
{
    "aggs" : {
        "max_price" : { "max" : { "field" : "price" } }
    }
}

结果：
{
    ...
    "aggregations": {
        "max_price": {
            "value": 200.0
        }
    }
}

- 和 Avg Aggs 类似

### 3）Min
最小聚合

POST /sales/_search?size=0
{
    "aggs" : {
        "min_price" : { "min" : { "field" : "price" } }
    }
}

结果：
{
    ...

    "aggregations": {
        "min_price": {
            "value": 10.0
        }
    }
}

- 和 Avg Aggs 类似

### 4）Sum
 总和聚合

POST /sales/_search?size=0
{
    "query" : {
        "constant_score" : {
            "filter" : {
                "match" : { "type" : "hat" }
            }
        }
    },
    "aggs" : {
        "hat_prices" : { "sum" : { "field" : "price" } }
    }
}

结果：
{
    ...
    "aggregations": {
        "hat_prices": {
           "value": 450.0
        }
    }
}

- 和 Avg Aggs 类似

### 5）Value Count
  value计数聚合

对从聚合的文档中提取的值进行计数。

POST /sales/_search?size=0
{
    "aggs" : {
        "types_count" : { "value_count" : { "field" : "type" } }
    }
}

结果：
{
    ...
    "aggregations": {
        "types_count": {
            "value": 7
        }
    }
}

- 场景：统计Field 不为null 的文档数
- 等价于SQL 中的 count··· where field is null

### 6）Stats
 统计聚合

- 返回的统计数据包括：min，max，sum，count 和 avg
- 示例

  POST /exams/_search?size=0
  {
      "aggs" : {
          "grades_stats" : { 
  			"stats" : { "field" : "grade" } }
      }
  }
  
  结果：
  {
      ...
      "aggregations": {
          "grades_stats": {
              "count": 2,
              "min": 50.0,
              "max": 100.0,
              "avg": 75.0,
              "sum": 150.0
          }
      }
  }
  

- 注意

	- count ，统计的是 value count agg 的值

- 重要参数

	- missing
	- 支持脚本 Script
	- Value Script

### 7）Weighted Avg
   加权平均聚合 

POST /exams/_search
{
    "size": 0,
    "aggs" : {
        "weighted_grade": {
            "weighted_avg": {
#提供值的字段或脚本的配置
                "value": {
                    "field": "grade"
                },

#提供权重的字段或脚本的配置
                "weight": {
                    "field": "weight"
                }
            }
        }
    }
}

加权平均值为 ∑(value * weight) / ∑(weight)

结果：
{
    ...
    "aggregations": {
        "weighted_grade": {
            "value": 70.0
        }
    }
}

- 场景：和Avg Aggs类似，但是对每一个数据点可以设置不同的权重【计算公式： ∑(value * weight) / ∑(weight)】
- 示例

  POST /exams/_search
  {
      "size": 0,
      "aggs" : {
          "weighted_grade": {
              "weighted_avg": {
                  "value": {
                      "field": "grade"
                  },
                  "weight": {
                      "field": "weight"
                  }
              }
          }
      }
  }
  
  结果：
  {
      ...
      "aggregations": {
          "weighted_grade": {
              "value": 70.0
          }
      }
  }

	- 博客文章指数计算：阅读量*作者影响力

- 注意事项

	- value参数的字段允许多个值
	- weight参数的字段仅允许单个值
	- 示例

	  POST /exams/_doc?refresh
	  {
	      "grade": [1, 2, 3],
	      "weight": 2
	  }
	  
	  POST /exams/_search
	  {
	      "size": 0,
	      "aggs" : {
	          "weighted_grade": {
	              "weighted_avg": {
	                  "value": {
	                      "field": "grade"
	                  },
	                  "weight": {
	                      "field": "weight"
	                  }
	              }
	          }
	      }
	  }
	  结果：
	  ((1*2) + (2*2) + (3*2)) / (2+2+2) = 2
	  {
	      ...
	      "aggregations": {
	          "weighted_grade": {
	              "value": 2.0
	          }
	      }
	  }

- 重要参数

	- missing

		- 对于Field没有值的文档，以该参数的值填充

		  POST /exams/_search
		  {
		      "size": 0,
		      "aggs" : {
		          "weighted_grade": {
		              "weighted_avg": {
		                  "value": {
		                      "field": "grade",
		                      "missing": 2
		                  },
		                  "weight": {
		                      "field": "weight",
		                      "missing": 3
		                  }
		              }
		          }
		      }
		  }

	- 支持脚本 Script

	  POST /exams/_doc?refresh
	  {
	      "grade": 1,
	      "weight": 2
	  }
	  
	  
	  
	  POST /exams/_search
	  {
	      "size": 0,
	      "aggs" : {
	          "weighted_grade": {
	              "weighted_avg": {
	                  "value": {
	                      "script": "doc.grade.value + 1"
	                  },
	                  "weight": {
	                      "script": "doc.weight.value + 1"
	                  }
	              }
	          }
	      }
	  }

### 8）cardinality
 基数聚合

提供一个字段的基数，即该字段的 distinct 或者 unique 值的数目。

 它是基于 HyperLogLog++ （HLL）算法的。 HLL 会先对我们的输入作哈希运算，然后根据哈希运算的结果中的 bits 做概率估算从而得到基数。

- 场景：一个单值度量聚合，计算Field value 有多少种不同的值【近似计算】（类似 SQL 的 SELECT COUNT(DISTINCT field ) FROM ···）
- 示例

  我们可以用 cardinality 度量确定经销商销售汽车颜色的数量：
  
  GET /cars/_search
  {
      "size" : 0,
      "aggs" : {
          "distinct_colors" : {
              "cardinality" : {
                "field" : "color"
              }
          }
      }
  }
  
  返回的结果表明已经售卖了三种不同颜色的汽车：
  
  ...
  "aggregations": {
    "distinct_colors": {
       "value": 3
    }
  }
  ...
  
  可以让我们的例子变得更有用：每月有多少颜色的车被售出？为了得到这个度量，我们只需要将一个 cardinality 度量嵌入一个 date_histogram ：
  
  GET /cars/transactions/_search
  {
    "size" : 0,
    "aggs" : {
        "months" : {
          "date_histogram": {
            "field": "sold",
            "interval": "month"
          },
          "aggs": {
            "distinct_colors" : {
                "cardinality" : {
                  "field" : "color"
                }
            }
          }
        }
    }
  }

	- 统计已销售汽车的颜色一共有多少种

- 重要参数

	- 配置精度 precision_threshold

	  该阈值定义了在何种基数水平下我们希望得到一个近乎精确的结果。参考以下示例：
	  
	  GET /cars/transactions/_search
	  {
	      "size" : 0,
	      "aggs" : {
	          "distinct_colors" : {
	              "cardinality" : {
	                "field" : "color",
	                "precision_threshold" : 100 
	              }
	          }
	      }
	  }
	   
	  
	  precision_threshold 接受 0–40,000 之间的数字，更大的值还是会被当作 40,000 来处理。
	  
	  示例会确保当字段唯一值在 100 以内时会得到非常准确的结果。尽管算法是无法保证这点的，但如果基数在阈值以下，几乎总是 100% 正确的。高于阈值的基数会开始节省内存而牺牲准确度，同时也会对度量结果带入误差。
	  
	  在实际应用中， 100 的阈值可以在唯一值为百万的情况下仍然将误差维持 5% 以内。
	  
	  

		- 结果在该参数值以下，接近准确

- 速度优化

   如果想要获得唯一值的数目， 通常 需要查询整个数据集合（或几乎所有数据）。 所有基于所有数据的操作都必须迅速，原因是显然的。 HyperLogLog 的速度已经很快了，它只是简单的对数据做哈希以及一些位操作。
  
  但如果速度对我们至关重要，可以做进一步的优化。 因为 HLL 只需要字段内容的哈希值，我们可以在索引时就预先计算好。 就能在查询时跳过哈希计算然后将哈希值从 fielddata 直接加载出来。

	- HLL 算法的特性

	  1、可配置的精度，用来控制内存的使用（更精确 ＝ 更多内存）。
	  
	  2、小的数据集精度是非常高的。
	  
	  
	  3、我们可以通过配置参数，来设置去重需要的固定内存使用量。无论数千还是数十亿的唯一值，内存使用量只与你配置的精确度相关。

	- 预先计算

	  预先计算哈希值只对内容很长或者基数很高的字段有用，计算这些字段的哈希值的消耗在查询时是无法忽略的。（Elasticsearch 的内部优化能够保证每个唯一值只计算一次哈希。）
	  
	  需要记住的是，预计算只是简单的将查询消耗的时间提前转移到索引时，并非没有任何代价，区别在于你可以选择在 什么时候 做这件事，要么在索引时，要么在查询时。

	- 使用示例

	  我们需要为数据增加一个新的多值字段。我们先删除索引，再增加一个包括哈希值字段的映射，然后重新索引：
	  
	  DELETE /cars/
	  
	  PUT /cars/
	  {
	    "mappings": {
	      "transactions": {
	        "properties": {
	          "color": {
	            "type": "string",
	            "fields": {
	              "hash": {
	                "type": "murmur3" 
	  #多值字段的类型是 murmur3 ，这是一个哈希函数。
	              }
	            }
	          }
	        }
	      }
	    }
	  
	  现在当我们执行聚合时，我们使用 color.hash 字段而不是 color 字段：
	  
	  GET /cars/transactions/_search
	  {
	      "size" : 0,
	      "aggs" : {
	          "distinct_colors" : {
	              "cardinality" : {
	                "field" : "color.hash" 
	  #注意我们指定的是哈希过的多值字段，而不是原始字段。
	  
	  
	              }
	          }
	      }
	  }
	  
	  现在 cardinality 度量会读取 "color.hash" 里的值（预先计算的哈希值），取代动态计算原始值的哈希。

### 9）Top Hits
  热门匹配聚合

top_hits 度量聚合器跟踪正在聚合的最相关的文档。

通过bucket聚合器按特定字段有效地用于对结果集进行分组。

POST /sales/_search?size=0
{
    "aggs": {
        "top_tags": {
            "terms": {
                "field": "type",
                "size": 3
            },
            "aggs": {
                "top_sales_hits": {
                    "top_hits": {
                        "sort": [
                            {
                                "date": {
                                    "order": "desc"
                                }
                            }
                        ],
                        "_source": {
                            "includes": [ "date", "price" ]
                        },
                        "size" : 1
                    }
                }
            }
        }
    }
}
结果：
       "buckets": [
          {
             "key": "hat",
             "doc_count": 3,
             "top_sales_hits": {
                "hits": {
                   "total" : {
                       "value": 3,
                       "relation": "eq"
                   },
                   "max_score": null,
                   "hits": [
                      {
                         "_index": "sales",
                         "_type": "_doc",
                         "_id": "AVnNBmauCQpcRyxw6ChK",
                         "_source": {
                            "date": "2015/03/01 00:00:00",
                            "price": 200
                         },
                         "sort": [
                            1425168000000
                         ],
                         "_score": null
                      }
                   ]
                }
             }
          },
          {
             "key": "t-shirt",
             "doc_count": 3,
             "top_sales_hits": {
                "hits": {
                   "total" : {
                       "value": 3,
                       "relation": "eq"
                   },
                   "max_score": null,
                   "hits": [
                      {
                         "_index": "sales",
                         "_type": "_doc",
                         "_id": "AVnNBmauCQpcRyxw6ChL",
                         "_source": {
                            "date": "2015/03/01 00:00:00",
                            "price": 175
                         },
                         "sort": [
                            1425168000000
                         ],
                         "_score": null
                      }
                   ]
                }
             }
          },



- 场景：top_hits聚合跟踪正在聚合的最相关的文档。此聚合器习惯被用作子聚合器，以便可以按bucket，去聚合顶级匹配的文档
- 示例

  
  POST /sales/_search?size=0
  {
      "aggs": {
          "top_tags": {
              "terms": {
                  "field": "type",
                  "size": 3
              },
              "aggs": {
                  "top_sales_hits": {
                      "top_hits": {
                          "sort": [
                              {
                                  "price": {
                                      "order": "desc"
                                  }
                              }
                          ],
                          "_source": {
                              "includes": [ "date", "price" ]
                          },
                          "size" : 1
                      }
                  }
              }
          }
      }
  }
  结果：
         "buckets": [
            {
               "key": "hat",
               "doc_count": 3,
               "top_sales_hits": {
                  "hits": {
                     "total" : {
                         "value": 3,
                         "relation": "eq"
                     },
                     "max_score": null,
                     "hits": [
                        {
                           "_index": "sales",
                           "_type": "_doc",
                           "_id": "AVnNBmauCQpcRyxw6ChK",
                           "_source": {
                              "date": "2015/03/01 00:00:00",
                              "price": 200
                           },
                           "sort": [
                              1425168000000
                           ],
                           "_score": null
                        }
                     ]
                  }
               }
            },
            {
               "key": "t-shirt",
               "doc_count": 3,
               "top_sales_hits": {
                  "hits": {
                     "total" : {
                         "value": 3,
                         "relation": "eq"
                     },
                     "max_score": null,
                     "hits": [
                        {
                           "_index": "sales",
                           "_type": "_doc",
                           "_id": "AVnNBmauCQpcRyxw6ChL",
                           "_source": {
                              "date": "2015/03/01 00:00:00",
                              "price": 175
                           },
                           "sort": [
                              1425168000000
                           ],
                           "_score": null
                        }
                     ]
                  }
               }
            },
  
  

	- 获取每种类型商品，其中价格最高的商品详情

- 参数

	- from、size
	- sort：排序字段。默认按照 _score 降序排列
	- _source：响应中需要得到的Field

### 10）Top Metrics
  最高度量标准聚合

top_metrics 聚合从具有最大或最小“排序”值的文档中选择指标

POST /test/_bulk?refresh
{"index": {}}
{"s": 1, "m": 3.1415}
{"index": {}}
{"s": 2, "m": 1.0}
{"index": {}}
{"s": 3, "m": 2.71828}
POST /test/_search?filter_path=aggregations
{
  "aggs": {
    "tm": {
      "top_metrics": {
        "metrics": {"field": "m"},
        "sort": {"s": "desc"}
      }
    }
  }
}

结果：
{
  "aggregations": {
    "tm": {
      "top": [ {"sort": [3], 

"metrics": {"m": 2.718280076980591 } } ]
    }
  }
}
可以和 terms aggs 嵌套使用。

- 效果上和 TopHits Agg 类似

  top_metrics 聚合从具有最大或最小“排序”值的文档中选择指标
  
  POST /test/_bulk?refresh
  {"index": {}}
  {"s": 1, "m": 3.1415}
  {"index": {}}
  {"s": 2, "m": 1.0}
  {"index": {}}
  {"s": 3, "m": 2.71828}
  POST /test/_search?filter_path=aggregations
  {
    "aggs": {
      "tm": {
        "top_metrics": {
          "metrics": {"field": "m"},
          "sort": {"s": "desc"}
        }
      }
    }
  }
  
  结果：
  {
    "aggregations": {
      "tm": {
        "top": [ {"sort": [3], 
  
  "metrics": {"m": 2.718280076980591 } } ]
      }
    }
  }
  可以和 terms aggs 嵌套使用。

- 示例

  top_metrics 聚合从具有最大或最小“排序”值的文档中选择指标
  
  POST /test/_bulk?refresh
  {"index": {}}
  {"s": 1, "m": 3.1415}
  {"index": {}}
  {"s": 2, "m": 1.0}
  {"index": {}}
  {"s": 3, "m": 2.71828}
  POST /test/_search?filter_path=aggregations
  {
    "aggs": {
      "tm": {
        "top_metrics": {
          "metrics": {"field": "m"},
          "sort": {"s": "desc"}
        }
      }
    }
  }
  
  结果：
  {
    "aggregations": {
      "tm": {
        "top": [ {"sort": [3], 
  
  "metrics": {"m": 2.718280076980591 } } ]
      }
    }
  }
  可以和 terms aggs 嵌套使用。

- 注意事项

	- metrics：支持返回多字段

	  PUT /test
	  {
	    "mappings": {
	      "properties": {
	        "d": {"type": "date"}
	      }
	    }
	  }
	  POST /test/_bulk?refresh
	  {"index": {}}
	  {"s": 1, "m": 3.1415, "i": 1, "d": "2020-01-01T00:12:12Z"}
	  {"index": {}}
	  {"s": 2, "m": 1.0, "i": 6, "d": "2020-01-02T00:12:12Z"}
	  {"index": {}}
	  {"s": 3, "m": 2.71828, "i": -12, "d": "2019-12-31T00:12:12Z"}
	  POST /test/_search?filter_path=aggregations
	  {
	    "aggs": {
	      "tm": {
	        "top_metrics": {
	          "metrics": [
	            {"field": "m"},
	            {"field": "i"},
	            {"field": "d"}
	          ],
	          "sort": {"s": "desc"}
	        }
	      }
	    }
	  }

		- 结果

		  {
		    "aggregations" : {
		      "tm" : {
		        "top" : [
		          {
		            "sort" : [
		              3
		            ],
		            "metrics" : {
		              "m" : 2.718280076980591,
		              "i" : -12,
		              "d" : "2019-12-31T00:12:12.000Z"
		            }
		          }
		        ]
		      }
		    }
		  }
		  

	- 支持size 参数
	- 也作为 terms 桶聚合的子聚合

	  POST /node/_search?filter_path=aggregations
	  {
	    "aggs": {
	      "ip": {
	        "terms": {
	          "field": "ip"
	        },
	        "aggs": {
	          "tm": {
	            "top_metrics": {
	              "metrics": {"field": "m"},
	              "sort": {"date": "desc"}
	            }
	          }
	        }
	      }
	    }
	  }

### 11）String Stats
 字符串统计聚合

- 场景：统计 keyword 类型字段的5个指标【count、min_length、max_length、avg_length、entropy】
- 示例

  字符串统计聚合返回以下结果：
  
  count -计算的非空字段数。
  min_length -最短期限的长度。
  max_length -最长期限的长度。
  avg_length -计算所有条件下的平均长度。
  entropy- 香农熵值是针对聚合收集的所有项计算的。香农熵可量化字段中包含的信息量。这对于测量数据集的各种属性（例如多样性，相似性，随机性等）非常有用。
  
  POST /twitter/_search?size=0
  {
      "aggs" : {
          "message_stats" : { "string_stats" : { "field" : "message.keyword" } }
      }
  }
  
  结果：
  {
      ...
  
      "aggregations": {
          "message_stats" : {
              "count" : 5,
              "min_length" : 24,
              "max_length" : 30,
              "avg_length" : 28.8,
              "entropy" : 3.94617750050791
          }
      }
  }
  
  

### 12） Extended Stats
   扩展统计聚合

GET /exams/_search
{
    "size": 0,
    "aggs" : {
        "grades_stats" : { "extended_stats" : { "field" : "grade" } }
    }
}

The extended_stats aggregations is an extended version of the stats aggregation, where additional metrics are added such as sum_of_squares, variance, std_deviation and std_deviation_bounds.

结果：
{
    ...

    "aggregations": {
        "grades_stats": {
           "count": 2,
           "min": 50.0,
           "max": 100.0,
           "avg": 75.0,
           "sum": 150.0,
           "sum_of_squares": 12500.0,
           "variance": 625.0,
           "std_deviation": 25.0,
           "std_deviation_bounds": {
            "upper": 125.0,
            "lower": 25.0
           }
        }
    }
}

- 和 Stats Agg 类似，多4个计算指标
【sum_of_squares，variance，
std_deviation 和 std_deviation_bounds】
- 示例

  GET /exams/_search
  {
      "size": 0,
      "aggs" : {
          "grades_stats" : { "extended_stats" : { "field" : "grade" } }
      }
  }
  多一下几个统计指标：
  sum_of_squares, variance, std_deviation and std_deviation_bounds.
  
  结果：
  {
      ...
  
      "aggregations": {
          "grades_stats": {
             "count": 2,
             "min": 50.0,
             "max": 100.0,
             "avg": 75.0,
             "sum": 150.0,
             "sum_of_squares": 12500.0,
             "variance": 625.0,
             "std_deviation": 25.0,
             "std_deviation_bounds": {
              "upper": 125.0,
              "lower": 25.0
             }
          }
      }
  }

### 13）Boxplot
 箱线图聚合

GET latency/_search
{
    "size": 0,
    "aggs" : {
        "load_time_boxplot" : {
            "boxplot" : {
                "field" : "load_time" 
            }
        }
    }
}
该字段 load_time 必须是数字字段

结果：
{
    ...

   "aggregations": {
      "load_time_boxplot": {
         "min": 0.0,
         "max": 990.0,
         "q1": 165.0,
         "q2": 445.0,
         "q3": 725.0
      }
   }
}

该 boxplot 用于制造聚集回报的基本信息箱线图的最小值，最大值中位数，第一个四分位数（第25个百分点）到第三个四分位数（第75百分位）值。

- 场景：用于获取箱线图的最小值，最大值中位数，第一个四分位数（第25个百分点）和第三个四分位数（第75百分位）值。

### 14） Geo Bounds
 地理边界聚合

计算字段的所有 geo_point 值的边界框。

POST /museums/_search?size=0
{
    "query" : {
        "match" : { "name" : "musée" }
    },
    "aggs" : {
        "viewport" : {
            "geo_bounds" : {
                "field" : "location", 
                "wrap_longitude" : true 
            }
        }
    }
}

结果：
{
    ...
    "aggregations": {
        "viewport": {
            "bounds": {
                "top_left": {
                    "lat": 48.86111099738628,
                    "lon": 2.3269999679178
                },
                "bottom_right": {
                    "lat": 48.85999997612089,
                    "lon": 2.3363889567553997
                }
            }
        }
    }
}

- 场景：计算字段的所有 geo_point 值的边界框。

### 15）Geo Centroid 
 地心聚集

它根据 Geo-point 字段的所有坐标值计算加权质心

POST /museums/_search?size=0
{
    "aggs" : {
        "cities" : {
            "terms" : { "field" : "city.keyword" },
            "aggs" : {
                "centroid" : {
                    "geo_centroid" : { "field" : "location" }
                }
            }
        }
    }
}

结果：
{
    ...
    "aggregations": {
        "cities": {
            "sum_other_doc_count": 0,
            "doc_count_error_upper_bound": 0,
            "buckets": [
               {
                   "key": "Amsterdam",
                   "doc_count": 3,
                   "centroid": {
                      "location": {
                         "lat": 52.371655656024814,
                         "lon": 4.909563297405839
                      },
                      "count": 3
                   }
               },
               {
                   "key": "Paris",
                   "doc_count": 2,
                   "centroid": {
                      "location": {
                         "lat": 48.86055548675358,
                         "lon": 2.3316944623366
                      },
                      "count": 2
                   }
                },

- 场景：根据 Geo-point 字段的所有坐标值计算加权质心

### 16）Median Absolute Deviation
 中位数绝对偏差聚合

中位数绝对偏差是变异性的量度。这是一个可靠的统计信息，这意味着它对于描述可能具有异常值或未正常分布的数据很有用。对于此类数据，它比标准偏差更具描述性。

GET reviews/_search
{
  "size": 0,
  "aggs": {
    "review_average": {
      "avg": {
        "field": "rating"
      }
    },
    "review_variability": {
      "median_absolute_deviation": {
        "field": "rating" 
      }
    }
  }
}

结果：
{
  ...
  "aggregations": {
    "review_average": {
      "value": 3.0
    },
    "review_variability": {
      "value": 2.0
    }
  }
}

### 17）percentiles 
 百分位数聚合

percentiles 使用一个 TDigest 算法，（由 Ted Dunning 在 Computing Extremely Accurate Quantiles Using T-Digests 里面提出的）。

- 百分位计算，用于统计分析
- 示例

  GET /website/logs/_search
  {
      "size" : 0,
      "aggs" : {
          "load_times" : {
              "percentiles" : {
                  "field" : "latency" 
              }
          },
          "avg_load_time" : {
              "avg" : {
                  "field" : "latency" 
              }
          }
      }
  }
  
  结果：
  "aggregations": {
    "load_times": {
       "values": {
          "1.0": 75.55,
          "5.0": 77.75,
          "25.0": 94.75,
          "50.0": 101,
          "75.0": 289.75,
          "95.0": 489.34999999999985,
          "99.0": 596.2700000000002
       }
    },
    "avg_load_time": {
       "value": 199.58333333333334
    }
  }
  percentiles 度量告诉我们落在某个百分比以下的所有文档的最小值。
  例如，如果 50 百分位是 101ms，那么有 50% 的文档数值都不超过 101ms。

- percentile_ranks 示例

  GET /website/logs/_search
  {
      "size" : 0,
      "aggs" : {
          "zones" : {
              "terms" : {
                  "field" : "zone"
              },
              "aggs" : {
                  "load_times" : {
                      "percentile_ranks" : {
                        "field" : "latency",
                        "values" : [210, 800] 
                      }
                  }
              }
          }
      }
  }
  结果：
  "aggregations": {
    "zones": {
       "buckets": [
          {
             "key": "eu",
             "doc_count": 6,
             "load_times": {
                "values": {
                   "210.0": 31.944444444444443,
                   "800.0": 100
                }
             }
          },
          {
             "key": "us",
             "doc_count": 6,
             "load_times": {
                "values": {
                   "210.0": 100,
                   "800.0": 100
                }
             }
          }
       ]
    }
  }
  
  这告诉我们三点重要的信息：
  
  在欧洲（EU），210ms 的百分位等级是 31.94% 。
  在美国（US），210ms 的百分位等级是 100% 。
  在欧洲（EU）和美国（US），800ms 的百分位等级是 100% 。

-  TDigest 算法的特性

  1、百分位的准确度与百分位的 极端程度 相关，也就是说 1 或 99 的百分位要比 50 百分位要准确。这只是数据结构内部机制的一种特性，但这是一个好的特性，因为多数人只关心极端的百分位。
  
  
  2、对于数值集合较小的情况，百分位非常准确。如果数据集足够小，百分位可能 100% 精确。
  
  
  3、随着桶里数值的增长，算法会开始对百分位进行估算。它能有效在准确度和内存节省之间做出权衡。 不准确的程度比较难以总结，因为它依赖于 聚合时数据的分布以及数据量的大小。

### 18）Scripted Metric

- 使用脚本执行以提供度量标准输出的度量标准聚合。

