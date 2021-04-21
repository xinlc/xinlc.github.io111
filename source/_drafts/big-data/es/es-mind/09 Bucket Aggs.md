# 09 Bucket Aggs

## 1）Terms 
   术语聚合

### 使用场景：按照某个字段的值，将文档聚合分类;
等价于 SQL 的 group by

### 注意事项

terms 聚合应该是字段类型keyword或适用于存储桶聚合的任何其他数据类型。为了与它一起使用，text您将需要启用 fielddata。



- text 类型的字段需要启用 fielddata
- 默认根据 doc_count 降序排列
- 默认情况下，terms聚合将返回排序的前十项的存储桶；
可以通过设置size参数来更改此默认行为。

  GET /teamwork_task/_search
  {
    "size": 0,
    "aggs": {
      "genres": {
        "terms": {
          "field": "team_id",
          "size": 20
        }
      }
    }
  }

- 精度问题-后续专题解析

### 示例



GET /_search
{
    "aggs" : {
        "genres" : {
            "terms" : { "field" : "genre" } 
        }
    }
}
结果：
{
    ...
    "aggregations" : {
        "genres" : {
            "doc_count_error_upper_bound": 0, 
            "sum_other_doc_count": 0, 
            "buckets" : [ 
                {
                    "key" : "electronic",
                    "doc_count" : 6
                },
                {
                    "key" : "rock",
                    "doc_count" : 3
                },
                {
                    "key" : "jazz",
                    "doc_count" : 2
                }
            ]
        }
    }
}


- 按不同的作者分类博客

### 返回参数解析

- doc_count_error_upper_bound

	- 每个术语的文档计数上的错误上限

- sum_other_doc_count

  当有很多唯一的术语时，Elasticsearch只返回 top terms ；此数字是不属于响应的所有存储桶的文档计数之和

	- 响应中未被包含的所有存储段的文档计数的总和

##  2）Rare Terms 
  稀有术语聚合

从概念上讲，这就像一个 terms 按 _count 升序排序的聚合。正如术语“聚合文档”中所述，实际上terms按计数递增顺序排序agg具有无限错误。相反，您应该使用rare_terms 汇总

{
    "rare_terms": {
        "field": "the_field",
        "max_doc_count": 1
    }
}

max_doc_count : 术语出现的最大文档数，默认值为1。


GET /_search
{
    "aggs" : {
        "genres" : {
            "rare_terms" : {
                "field" : "genre",
                "max_doc_count": 2
            }
        }
    }
}

结果：
{
    ...
    "aggregations" : {
        "genres" : {
            "buckets" : [
                {
                    "key" : "swing",
                    "doc_count" : 1
                },
                {
                    "key" : "jazz",
                    "doc_count" : 2
                }
            ]
        }
    }
}



### 使用场景：与 Terms聚合类似，排序规则不同：按 doc_count 升序排列

### 示例

从概念上讲，这就像一个 terms 按 _count 升序排序的聚合。正如术语“聚合文档”中所述，实际上terms按计数递增顺序排序agg具有无限错误。相反，您应该使用rare_terms 汇总

{
    "rare_terms": {
        "field": "the_field",
        "max_doc_count": 1
    }
}

max_doc_count : 术语出现的最大文档数，默认值为1。


GET /_search
{
    "aggs" : {
        "genres" : {
            "rare_terms" : {
                "field" : "genre",
                "max_doc_count": 2
            }
        }
    }
}

结果：
{
    ...
    "aggregations" : {
        "genres" : {
            "buckets" : [
                {
                    "key" : "swing",
                    "doc_count" : 1
                },
                {
                    "key" : "jazz",
                    "doc_count" : 2
                }
            ]
        }
    }
}



- 根据作者文章数的升序排列

### 重要参数

- max_doc_count：术语出现的最大文档数【返回的bucket 的 doc_count <= 该值】，默认值为1，最大值为100
- precision：精度值越低，近似值越好，但内存使用率更高，默认值0.01
- include：汇总中应包含的术语

  使用正则表达式过滤值：
  GET /_search
  {
      "aggs" : {
          "genres" : {
              "rare_terms" : {
                  "field" : "genre",
                  "include" : "swi*",
                  "exclude" : "electro*"
              }
          }
      }
  }
  
  用精确值过滤值：
  GET /_search
  {
      "aggs" : {
          "genres" : {
               "rare_terms" : {
                   "field" : "genre",
                   "include" : ["swing", "rock"],
                   "exclude" : ["jazz"]
               }
           }
      }
  }
  
  

- exclude：应从汇总中排除的字词
- missing：如果文档中没有汇总字段，则应使用的值

  GET /_search
  {
      "aggs" : {
          "genres" : {
               "rare_terms" : {
                   "field" : "genre",
                   "missing": "N/A" 
               }
           }
      }
  }
  
  tags字段中没有值的文档将与具有该值的文档归入同一存储桶N/A。

## 3）Histogram
  直方图聚合

### 使用场景：根据数值或数值范围类型字段，按固定间隔将文档分类

### 示例

GET /cars/transactions/_search
{
   "size" : 0,
   "aggs":{
      "price":{
         "histogram":{ 
            "field": "price",
            "interval": 20000
         },
         "aggs":{
            "revenue": {
               "sum": { 
                 "field" : "price"
               }
             }
         }
      }
   }
}

	
histogram 桶要求两个参数：一个数值字段以及一个定义桶大小间隔。


sum 度量嵌套在每个售价区间内，用来显示每个区间内的总收入。

- 按商品价格区间聚合，得到不同价格区间的商品数
- 结果

  应该注意到直方图的键值是区间的下限。
  
  键 0 代表区间 0-19999 ，
  
  键 20000 代表区间 20000-39999
  
  {
  ...
     "aggregations": {
        "price": {
           "buckets": [
              {
                 "key": 0,
                 "doc_count": 3,
                 "revenue": {
                    "value": 37000
                 }
              },
              {
                 "key": 20000,
                 "doc_count": 4,
                 "revenue": {
                    "value": 95000
                 }
              },
              {
                 "key": 80000,
                 "doc_count": 1,
                 "revenue": {
                    "value": 80000
                 }
              }
           ]
        }
     }
  
  

### 重要参数

- interval：间隔值

	- 左闭右开

- min_doc_count：不返回 doc_count 小于该值的存储桶

  默认情况下，histogram 返回数据本身范围内的所有存储桶，即，值最小的文档（带有直方图的文档）将确定最小存储桶（键最小的存储桶）和值最大的文档将确定最大存储桶（密钥最高的存储桶）
  
  默认情况下，响应将用空桶填充直方图中的空白。
  
  当 doc_count < min_doc_count 时，
  对应的 key 将不会在结果中展示出来。

- extended_bounds：指定返回的 doc_count 范围

  POST /sales/_search?size=0
  {
      "query" : {
          "constant_score" : { "filter": { "range" : { "price" : { "to" : "500" } } } }
      },
      "aggs" : {
          "prices" : {
              "histogram" : {
                  "field" : "price",
                  "interval" : 50,
                  "extended_bounds" : {
                      "min" : 0,
                      "max" : 500
                  }
              }
          }
      }
  }

- missing：对于Field没有值的文档，以该参数的值填充

  POST /sales/_search?size=0
  {
      "aggs" : {
          "quantity" : {
               "histogram" : {
                   "field" : "quantity",
                   "interval": 10,
                   "missing": 0 
               }
           }
      }
  }
  
  quantity字段中没有值的文档将与具有该值的文档归入同一存储桶0。

- keyed：更改返回格式，将 key 作为键 返回

  POST /sales/_search?size=0
  {
      "aggs" : {
          "prices" : {
              "histogram" : {
                  "field" : "price",
                  "interval" : 50,
                  "keyed" : true
              }
          }
      }
  }
  
  结果：
  {
      ...
      "aggregations": {
          "prices": {
              "buckets": {
                  "0.0": {
                      "key": 0.0,
                      "doc_count": 1
                  },
                  "50.0": {
                      "key": 50.0,
                      "doc_count": 1
                  },
          
              }
          }
      }
  }

## 4）Date histogram
   日期直方图聚合

### 使用场景：根据 date or date range 类型字段，按固定间隔将文档分类

### 两种指定间隔的方式

- 日历间隔 calendar_interval

  使用calendar_interval参数配置日历感知间隔。日历间隔只能在单元的“奇”量（指定1d，1M等等）。2d不支持诸如的倍数，并且会引发异常
  
  日历间隔的可接受单位为：
  
  minute   分钟（1m）
  hour   小时（1h）
  day  天（1d）
  week 周（1w）
  month   月（1M）
  quarter  季度（1q）
  year  年（1y）
  
  
  
  
  
  
  
  
  
  
  

	- 示例

	  GET /product/_search
	  {
	     "size" : 0,
	     "aggs": {
	        "sales": {
	           "date_histogram": {
	              "field": "sold",
	              "calendar_interval": "month", 
	              "format": "yyyy-MM-dd" 
	           }
	        }
	     }
	  }
	  
	  
	  【calendar_interval】 时间间
	  
	  
	  format 提供日期格式以便 buckets 的键值便于阅读。

		- 查看每个月的商品销售量
		- 结果

		  {
		     ...
		     "aggregations": {
		        "sales": {
		           "buckets": [
		              {
		                 "key_as_string": "2014-01-01",
		                 "key": 1388534400000,
		                 "doc_count": 1
		              },
		              {
		                 "key_as_string": "2014-02-01",
		                 "key": 1391212800000,
		                 "doc_count": 1
		              },
		              {
		                 "key_as_string": "2014-05-01",
		                 "key": 1398902400000,
		                 "doc_count": 1
		              },

- 固定间隔 fixed_interval

  与日历感知间隔相比，固定间隔是固定数量的SI单位，并且从不偏离，无论它们位于日历上的什么位置。一秒始终由1000毫秒组成。这允许以任意多个受支持单位指定固定间隔。
  
  但是，这意味着固定间隔不能表示其他单位，例如月份，因为一个月的持续时间不是固定数量。
  
  固定间隔的可接受单位为：
  
  毫秒（ms）
  秒（s）
  
  分钟（m）
  
  小时（h）
  
  天（d）
  
  POST /sales/_search?size=0
  {
      "aggs" : {
          "sales_over_time" : {
              "date_histogram" : {
                  "field" : "date",
                  "fixed_interval" : "30d"
              }
          }
      }
  }
  
  

	- 不支持小数时间值，
通过单位转换实现

### 使用脚本按星期几汇总

POST /sales/_search?size=0
{
    "aggs": {
        "dayOfWeek": {
            "terms": {
                "script": {
                    "lang": "painless",
                    "source": "doc['date'].value.dayOfWeekEnum.value"
                }
            }
        }
    }
}

结果：
      "buckets": [
        {
          "key": "7",
          "doc_count": 4
        },
        {
          "key": "4",
          "doc_count": 3
        }
      ]

响应将包含所有具有星期几作为关键的时段：1代表星期一，2代表星期二... 7代表星期日。

### 重要参数

- min_doc_count：不返回 doc_count 小于该值的存储桶

  默认情况下，histogram 返回数据本身范围内的所有存储桶，即，值最小的文档（带有直方图的文档）将确定最小存储桶（键最小的存储桶）和值最大的文档将确定最大存储桶（密钥最高的存储桶）
  
  默认情况下，响应将用空桶填充直方图中的空白。
  
  当 doc_count < min_doc_count 时，
  对应的 key 将不会在结果中展示出来。

- extended_bounds：指定返回的 doc_count 范围

  POST /sales/_search?size=0
  {
      "query" : {
          "constant_score" : { "filter": { "range" : { "price" : { "to" : "500" } } } }
      },
      "aggs" : {
          "prices" : {
              "histogram" : {
                  "field" : "price",
                  "interval" : 50,
                 "extended_bounds" : { 
                  "min" : "2014-01-01",
                  "max" : "2014-12-31"
              }
           }
  }
  
  
  extended_bounds：这个参数强制返回整年

- missing：对于Field没有值的文档，以该参数的值填充

  POST /sales/_search?size=0
  {
      "aggs" : {
          "sale_date" : {
               "date_histogram" : {
                   "field" : "date",
                   "calendar_interval": "year",
                   "missing": "2000/01/01" 
               }
           }
      }
  }
  
  

- format：bucket key的格式转换，增加可读性

  POST /sales/_search?size=0
  {
      "aggs" : {
          "sales_over_time" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "1M",
                  "format" : "yyyy-MM-dd" 
              }
          }
      }
  }
  
  结果：
  {
      ...
      "aggregations": {
          "sales_over_time": {
              "buckets": [
                  {
                      "key_as_string": "2015-01-01",
                      "key": 1420070400000,
                      "doc_count": 3
                  }
              ]
          }
      }
  }
  
  如果未指定format，则使用在字段映射中指定的第一个日期 格式。

- time_zone ：指定时区

  GET my_index/_search?size=0
  {
    "aggs": {
      "by_day": {
        "date_histogram": {
          "field":     "date",
          "calendar_interval":  "day",
          "time_zone": "-01:00"
        }
      }
    }
  }
  
  原始数据：
  PUT my_index/_doc/1?refresh
  {
    "date": "2015-10-01T00:30:00Z"
  }
  
  PUT my_index/_doc/2?refresh
  {
    "date": "2015-10-01T01:30:00Z"
  }
  
  时区聚合：
  GET my_index/_search?size=0
  {
    "aggs": {
      "by_day": {
        "date_histogram": {
          "field":     "date",
          "calendar_interval":  "day",
          "time_zone": "-01:00"
        }
      }
    }
  }
  结果：
  {
    ...
    "aggregations": {
      "by_day": {
        "buckets": [
          {
            "key_as_string": "2015-09-30T00:00:00.000-01:00", 
            "key": 1443574800000,
            "doc_count": 1
          },
          {
            "key_as_string": "2015-10-01T00:00:00.000-01:00", 
            "key": 1443661200000,
            "doc_count": 1
          }
        ]
      }
    }
  }

- offset：起始值正偏移（+）或负偏移（-）

  当使用时间间隔为时day，每个存储桶从午夜运行到下一天的午夜。设置offset参数以+6h将每个存储桶的时间区间改为从当天的上午6点到第二天的上午6点：
  
  GET my_index/_search?size=0
  {
    "aggs": {
      "by_day": {
        "date_histogram": {
          "field":     "date",
          "calendar_interval":  "day",
          "offset":    "+6h"
        }
      }
    }
  }
  
  结果：
  {
    ...
    "aggregations": {
      "by_day": {
        "buckets": [
          {
            "key_as_string": "2015-09-30T06:00:00.000Z",
            "key": 1443592800000,
            "doc_count": 1
          },
          {
            "key_as_string": "2015-10-01T06:00:00.000Z",
            "key": 1443679200000,
            "doc_count": 1
          }
        ]
      }
    }
  }

- keyed：更改返回格式，将 key 作为键 返回

  POST /sales/_search?size=0
  {
      "aggs" : {
          "sales_over_time" : {
              "date_histogram" : {
                  "field" : "date",
                  "calendar_interval" : "1M",
                  "format" : "yyyy-MM-dd",
                  "keyed": true
              }
          }
      }
  }
  
  结果：
  "aggregations": {
          "sales_over_time": {
              "buckets": {
                  "2015-01-01": {
                      "key_as_string": "2015-01-01",
                      "key": 1420070400000,
                      "doc_count": 3
                  }
     
              }
          }
      }

## 5）Auto-interval Date Histogram
   自动间隔日期直方图聚合

类似于日期直方图聚合的多存储桶聚合，除了提供一个间隔作为每个存储桶的宽度之外，它提供目标存储桶数以指示所需的存储桶数，并且自动选择存储桶的间隔以达到最佳效果实现那个目标。返回的存储桶数将始终小于或等于此目标数。

POST /sales/_search?size=0
{
    "aggs" : {
        "sales_over_time" : {
            "auto_date_histogram" : {
                "field" : "date",
                "buckets" : 10
            }
        }
    }
}
结果;
{
    ...
    "aggregations": {
        "sales_over_time": {
            "buckets": [
                {
                    "key_as_string": "2015-01-01",
                    "key": 1420070400000,
                    "doc_count": 3
                },
                {
                    "key_as_string": "2015-02-01",
                    "key": 1422748800000,
                    "doc_count": 2
                },
                {
                    "key_as_string": "2015-03-01",
                    "key": 1425168000000,
                    "doc_count": 2
                }
            ],
            "interval": "1M"
        }
    }
}

### 使用场景：类似于日期直方图聚合的多存储桶聚合，不同点在于它提供目标存储桶数

### 与普通的日期直方图一样，文档级脚本和值级脚本都受支持。但是，这个聚合不支持min_doc_count、extended_bounds和order参数。

### 示例

类似于日期直方图聚合的多存储桶聚合，除了提供一个间隔作为每个存储桶的宽度之外，它提供目标存储桶数以指示所需的存储桶数，并且自动选择存储桶的间隔以达到最佳效果实现那个目标。返回的存储桶数将始终小于或等于此目标数。

POST /sales/_search?size=0
{
    "aggs" : {
        "sales_over_time" : {
            "auto_date_histogram" : {
                "field" : "date",
"format": "yyyy-MM-dd",
                "buckets" : 10
            }
        }
    }
}
结果;
{
    ...
    "aggregations": {
        "sales_over_time": {
            "buckets": [
                {
                    "key_as_string": "2015-01-01",
                    "key": 1420070400000,
                    "doc_count": 3
                },
                {
                    "key_as_string": "2015-02-01",
                    "key": 1422748800000,
                    "doc_count": 2
                },
                {
                    "key_as_string": "2015-03-01",
                    "key": 1425168000000,
                    "doc_count": 2
                }
            ],
            "interval": "1M"
        }
    }
}

- 直接指定我需要的buckets桶的数量

### 重要参数

- buckets：返回的存储桶数将始终小于或等于此目标数
- format：bucket key的格式转换，增加可读性
- interval：根据 buckets参数自动计算出的间隔值

  返回的可能间隔是：
  
  秒
  以1、5、10和30的倍数
  
  分钟
  以1、5、10和30的倍数
  
  小时
  以1、3和12的倍数
  
  天
  以1和7的倍数
  
  月
  以1和3的倍数
  
  年份
  以1、5、10、20、50和100的倍数

- missing：对于Field没有值的文档，以该参数的值填充

  该missing参数定义应如何处理缺少值的文档。默认情况下，它们将被忽略，但也可以将它们视为具有值。
  
  
  POST /sales/_search?size=0
  {
      "aggs" : {
          "sale_date" : {
               "auto_date_histogram" : {
                   "field" : "date",
                   "buckets": 10,
                   "missing": "2000/01/01" 
               }
           }
      }
  }
  
  

- time_zone ：指定时区

  GET my_index/_search?size=0
  {
    "aggs": {
      "by_day": {
        "date_histogram": {
          "field":     "date",
          "calendar_interval":  "day",
          "time_zone": "-01:00"
        }
      }
    }
  }
  
  原始数据：
  PUT my_index/_doc/1?refresh
  {
    "date": "2015-10-01T00:30:00Z"
  }
  
  PUT my_index/_doc/2?refresh
  {
    "date": "2015-10-01T01:30:00Z"
  }
  
  时区聚合：
  GET my_index/_search?size=0
  {
    "aggs": {
      "by_day": {
        "date_histogram": {
          "field":     "date",
          "calendar_interval":  "day",
          "time_zone": "-01:00"
        }
      }
    }
  }
  结果：
  {
    ...
    "aggregations": {
      "by_day": {
        "buckets": [
          {
            "key_as_string": "2015-09-30T00:00:00.000-01:00", 
            "key": 1443574800000,
            "doc_count": 1
          },
          {
            "key_as_string": "2015-10-01T00:00:00.000-01:00", 
            "key": 1443661200000,
            "doc_count": 1
          }
        ]
      }
    }
  }

- minimum_interval：最小间隔单位

  接受的单位为minimum_interval：
  
  year
  month
  day
  hour
  minute
  second
  
  POST /sales/_search?size=0
  {
      "aggs" : {
          "sale_date" : {
               "auto_date_histogram" : {
                   "field" : "date",
                   "buckets": 10,
                   "minimum_interval": "minute"
               }
           }
      }
  }

## 6）Range
 范围聚合

### 使用场景：用户自定义一组范围【每个范围代表一个桶】进行聚合

### 此聚合包括from 的值，但不包括to 的值

- 左闭右开

### 示例



GET /_search
{
    "aggs" : {
        "price_ranges" : {
            "range" : {
                "field" : "price",
                "ranges" : [
                    { "to" : 100.0 },
                    { "from" : 100.0, "to" : 200.0 },
                    { "from" : 200.0 }
                ]
            }
        }
    }
}

结果;
{
    ...
    "aggregations": {
        "price_ranges" : {
            "buckets": [
                {
                    "key": "*-100.0",
                    "to": 100.0,
                    "doc_count": 2
                },
                {
                    "key": "100.0-200.0",
                    "from": 100.0,
                    "to": 200.0,
                    "doc_count": 2
                },
                {
                    "key": "200.0-*",
                    "from": 200.0,
                    "doc_count": 3
                }
            ]
        }
    }
}

- 查看商品价格在100以内，100-200和200以上的数量

### 重要参数

- keyed：更改返回格式，将 key 作为键 返回

  GET /_search
  {
      "aggs" : {
          "price_ranges" : {
              "range" : {
                  "field" : "price",
                  "keyed" : true,
                  "ranges" : [
                      { "to" : 100 },
                      { "from" : 100, "to" : 200 },
                      { "from" : 200 }
                  ]
              }
          }
      }
  }
  结果：
  {
      ...
      "aggregations": {
          "price_ranges" : {
              "buckets": {
                  "*-100.0": {
                      "to": 100.0,
                      "doc_count": 2
                  },
                  "100.0-200.0": {
                      "from": 100.0,
                      "to": 200.0,
                      "doc_count": 2
                  },
                  "200.0-*": {
                      "from": 200.0,
                      "doc_count": 3
                  }
              }
          }
      }
  }
  
  
  

- 为每个范围自定义key

  GET /_search
  {
      "aggs" : {
          "price_ranges" : {
              "range" : {
                  "field" : "price",
                  "keyed" : true,
                  "ranges" : [
                      { "key" : "cheap", "to" : 100 },
                      { "key" : "average", "from" : 100, "to" : 200 },
                      { "key" : "expensive", "from" : 200 }
                  ]
              }
          }
      }
  }
  结果：
  {
      ...
      "aggregations": {
          "price_ranges" : {
              "buckets": {
                  "cheap": {
                      "to": 100.0,
                      "doc_count": 2
                  },
                  "average": {
                      "from": 100.0,
                      "to": 200.0,
                      "doc_count": 2
                  },
                  "expensive": {
                      "from": 200.0,
                      "doc_count": 3
                  }
              }
          }
      }
  }

- Script 支持脚本
- 子聚合

	- 示例

	  以下示例不仅将文档“存储”到不同的存储桶，还计算每个价格范围内的价格统计信息：
	  GET /_search
	  {
	      "aggs" : {
	          "price_ranges" : {
	              "range" : {
	                  "field" : "price",
	                  "ranges" : [
	                      { "to" : 100 },
	                      { "from" : 100, "to" : 200 },
	                      { "from" : 200 }
	                  ]
	              },
	              "aggs" : {
	                  "price_stats" : {
	                      "stats" : { "field" : "price" }
	                  }
	              }
	          }
	      }
	  }
	  
	  结果：
	  {
	    ...
	    "aggregations": {
	      "price_ranges": {
	        "buckets": [
	          {
	            "key": "*-100.0",
	            "to": 100.0,
	            "doc_count": 2,
	            "price_stats": {
	              "count": 2,
	              "min": 10.0,
	              "max": 50.0,
	              "avg": 30.0,
	              "sum": 60.0
	            }
	          },
	          {
	            "key": "100.0-200.0",
	            "from": 100.0,
	            "to": 200.0,
	            "doc_count": 2,
	            "price_stats": {
	              "count": 2,
	              "min": 150.0,
	              "max": 175.0,
	              "avg": 162.5,
	              "sum": 325.0
	            }
	          }
	        ]
	      }
	    }
	  }

	- Field与父聚合相同时，省略其值源定义

	  GET /_search
	  {
	      "aggs" : {
	          "price_ranges" : {
	              "range" : {
	                  "field" : "price",
	                  "ranges" : [
	                      { "to" : 100 },
	                      { "from" : 100, "to" : 200 },
	                      { "from" : 200 }
	                  ]
	              },
	              "aggs" : {
	                  "price_stats" : {
	                      "stats" : {} 
	                  }
	              }
	          }
	      }
	  }
	  
	  我们不需要指定price默认值，因为我们默认是从父range聚合中“继承”它。
	  
	  与上一个示例效果相同。

## 7）Date Range
  日期范围聚合

欢迎各位小主人进群哦～   三只松鼠万达店7.18开业来袭，活动多多，礼物多多  群内会不定期发布活动邀请主人们参与哦  

### 使用场景：针对 date 类型字段的范围聚合

### 区别在于 from和to值可以在 Date Math表达式中表示，并且还可以指定日期格式

### 示例



POST /sales/_search?size=0
{
    "aggs": {
        "range": {
            "date_range": {
                "field": "date",
                "format": "MM-yyyy",
                "ranges": [
                    { "to": "now-10M/M" }, 
                    { "from": "now-10M/M" } 
                ]
            }
        }
    }
}
to：	< 现在减去10个月，向下舍入到月初。
from：> = 现在减去10个月，向下舍入到月初。

结果：
to：得到 日期在 < now-10M之前的所有文档。
from：得到日期在 >=now-10M
之间的所有文档。
{
    ...
    "aggregations": {
        "range": {
            "buckets": [
                {
                    "to": 1.4436576E12,
                    "to_as_string": "10-2015",
                    "doc_count": 7,
                    "key": "*-10-2015"
                },
                {
                    "from": 1.4436576E12,
                    "from_as_string": "10-2015",
                    "doc_count": 0,
                    "key": "10-2015-*"
                }
            ]
        }
    }
}



- 获取过去到10个月之前的所有商品总数和10个月之前的商品总数

### 重要参数

POST /sales/_search?size=0
{
   "aggs": {
       "range": {
           "date_range": {
               "field": "date",
			  "format": "MM-yyyy",
               "missing": "1976/11/30",
               "ranges": [
                  {
                    "key": "Older",
                    "to": "2016/02/01"
                  }, 
                  {
                    "key": "Newer",
                    "from": "2016/02/01",
                    "to" : "now/d"
                  }
              ]
          }
      }
   }
}


- keyed：更改返回格式，将 key 作为键 返回
- 为每个范围自定义key
- missing：对于Field没有值的文档，以该参数的值填充

  POST /sales/_search?size=0
  {
     "aggs": {
         "range": {
             "date_range": {
                 "field": "date",
  			  "format": "MM-yyyy",
                 "missing": "1976/11/30",
                 "ranges": [
                    {
                      "key": "Older",
                      "to": "2016/02/01"
                    }, 
                    {
                      "key": "Newer",
                      "from": "2016/02/01",
                      "to" : "now/d"
                    }
                ]
            }
        }
     }
  }
  

- format：bucket key的格式转换，增加可读性

## 8）IP Range 
   IP范围聚合

### 使用场景：和日期范围聚合一样，IP类型字段也有专用范围聚合

### 示例

就像专用日期范围聚合一样，IP类型字段也有专用范围聚合：

GET /ip_addresses/_search
{
    "size": 10,
    "aggs" : {
        "ip_ranges" : {
            "ip_range" : {
                "field" : "ip",
                "ranges" : [
                    { "to" : "10.0.0.5" },
                    { "from" : "10.0.0.5" }
                ]
            }
        }
    }
}

结果：
{
    ...

    "aggregations": {
        "ip_ranges": {
            "buckets" : [
                {
                    "key": "*-10.0.0.5",
                    "to": "10.0.0.5",
                    "doc_count": 10
                },
                {
                    "key": "10.0.0.5-*",
                    "from": "10.0.0.5",
                    "doc_count": 260
                }
            ]
        }
    }
}

### 重要参数

- keyed：更改返回格式，将 key 作为键 返回
- 为每个范围自定义key

## 9）Composite
  复合聚合

### 使用场景：1、用于存储桶的分页；2、对多个Field创建复合存储桶，根据value穷尽组合

### 翻页示例

- 类似于 scroll 对文档所做的操作
- 第一页

  GET /teamwork_task/_search
  {
    "size": 0,
    "aggs": {
      "my_buckets": {
        "composite": {
          "size": 2,
          "sources": [
            {
              "customName": {
                "terms": {
                  "field": "team_id"
                }
              }
            }
          ]
        }
      }
    }
  }
  
  结果：
    "aggregations" : {
      "my_buckets" : {
        "after_key" : {
          "customName" : 135
        },
        "buckets" : [
          {
            "key" : {
              "customName" : 128
            },
            "doc_count" : 2
          },
          {
            "key" : {
              "customName" : 135
            },
            "doc_count" : 3
          }
        ]
      }
    }
  }
  
  

	- 翻页示例

	  查询 body不变，添加上次返回的 after即可：
	  
	  GET /teamwork_task/_search
	  {
	    "size": 0,
	    "aggs": {
	      "my_buckets": {
	        "composite": {
	          "size": 2,
	          "sources": [
	            {
	              "customName": {
	                "terms": {
	                  "field": "team_id"
	                }
	              }
	            }
	          ],
	          "after": {
	            "customName": 135
	          }
	        }
	      }
	    }
	  }

### 不同的 values source 
创建复合存储桶

- 问卷结果统计：假设有A、B两道题，每题都有2个答案，那么 Composite聚合就可以得到所有可能组合的答案的问卷数

  假设文档结构：
  
  {
      "question_A": ["A", "B"],
      "question_B": [1,2]
  }
  
  
  在question_A 和 question_B用作聚合的值源时，创建以下复合存储桶：
  
  { "question_A": "A", "question_B": 1 }
  
  { "question_A": "A", "question_B": 2 }
  
  { "question_A": "B", "question_B": 1 }
  
  { "question_A": "B", "question_B": 2 }
  
  

- 示例

  GET /question_index/_search
  {
    "size": 0,
    "aggs": {
      "my_buckets": {
        "composite": {
          "sources": [
             {
              "question_A": {
                "terms": {
                  "field": "question_A"
                }
              }
            },
            {
              "question_B": {
                "terms": {
                  "field": "question_B"
                }
              }
            }
          ]
        }
      }
    }
  }

	- 部分结果

	    "aggregations" : {
	      "my_buckets" : {
	        "after_key" : {
	          "question_A" : "B",
	          "question_B" : 1
	        },
	        "buckets" : [
	          {
	            "key" : {
	              "question_A" : "A",
	              "question_B" : 1
	            },
	            "doc_count" : 1
	          },
	          {
	            "key" : {
	              "question_A" : "B",
	              "question_B" : 1
	            },
	            "doc_count" : 1
	          }
	        ]
	      }
	    }

### sources 支持3种bucket

- Terms
- Histogram

  GET /_search
  {
      "size": 0,
      "aggs" : {
          "my_buckets": {
              "composite" : {
                  "sources" : [
                      { "histo": { "histogram" : { "field": "price", "interval": 5 } } }
                  ]
              }
          }
      }
  }

- Date Histogram

  GET /_search
  {
      "size": 0,
      "aggs" : {
          "my_buckets": {
              "composite" : {
                  "sources" : [
                      { "date": { "date_histogram" : { "field": "timestamp", "calendar_interval": "1d" } } }
                  ]
              }
          }
      }
  }

## 10）Filter 
过滤器聚合

POST /sales/_search?size=0
{
    "aggs" : {
        "t_shirts" : {
            "filter" : { "term": { "type": "t-shirt" } },
            "aggs" : {
                "avg_price" : { "avg" : { "field" : "price" } }
            }
        }
    }
}

这将用于将当前聚合上下文缩小到一组特定的文档。



### 使用场景：改变聚合的作用范围，
filter 在 query结果集基础上再筛选下文档

- 聚合的作用范围默认是 query的结果集

### 示例

POST /sales/_search?size=0
{
    "aggs" : {
        "t_shirts" : {
            "filter" : { "term": { "type": "t-shirt" } },
            "aggs" : {
                "avg_price" : { "avg" : { "field" : "price" } }
            }
        }
    }
}

这将用于将当前聚合上下文缩小到一组特定的文档。



- 只查看 商品t-shirt 的平均价格

## 11）Filters
过滤器集合聚合

定义一个多存储桶聚合，其中每个存储桶都与一个过滤器相关联。每个存储桶将收集与其关联的过滤器匹配的所有文档。

PUT /logs/_bulk?refresh
{ "index" : { "_id" : 1 } }
{ "body" : "warning: page could not be rendered" }
{ "index" : { "_id" : 2 } }
{ "body" : "authentication error" }
{ "index" : { "_id" : 3 } }
{ "body" : "warning: connection timed out" }

GET logs/_search
{
  "size": 0,
  "aggs" : {
    "messages" : {
      "filters" : {
        "filters" : {
          "errors" :   { "match" : { "body" : "error"   }},
          "warnings" : { "match" : { "body" : "warning" }}
        }
      }
    }
  }
}
在上面的示例中，我们分析了日志消息。聚合将建立两个日志消息集（存储桶）-一个用于所有包含错误的日志消息，另一个用于所有包含警告的日志消息。
结果：
{
  "took": 9,
  "timed_out": false,
  "_shards": ...,
  "hits": ...,
  "aggregations": {
    "messages": {
      "buckets": {
        "errors": {
          "doc_count": 1
        },
        "warnings": {
          "doc_count": 2
        }
      }
    }
  }
}

### 使用场景：一个多存储桶聚合，其中每个存储桶都与一个自定义的过滤器相关联

### 示例

定义一个多存储桶聚合，其中每个存储桶都与一个过滤器相关联。每个存储桶将收集与其关联的过滤器匹配的所有文档。

PUT /logs/_bulk?refresh
{ "index" : { "_id" : 1 } }
{ "body" : "warning: page could not be rendered" }
{ "index" : { "_id" : 2 } }
{ "body" : "authentication error" }
{ "index" : { "_id" : 3 } }
{ "body" : "warning: connection timed out" }

GET logs/_search
{
  "size": 0,
  "aggs" : {
    "messages" : {
      "filters" : {
        "filters" : {
          "errors" :   { "match" : { "body" : "error"   }},
          "warnings" : { "match" : { "body" : "warning" }}
        }
      }
    }
  }
}
在上面的示例中，我们分析了日志消息。聚合将建立两个日志消息集（存储桶）-一个用于所有包含错误的日志消息，另一个用于所有包含警告的日志消息。
结果：
{
  "took": 9,
  "timed_out": false,
  "_shards": ...,
  "hits": ...,
  "aggregations": {
    "messages": {
      "buckets": {
        "errors": {
          "doc_count": 1
        },
        "warnings": {
          "doc_count": 2
        }
      }
    }
  }
}

- 日志统计，统计 error 和 warning 各有多少条记录
- 等价于SQL 的多个 count sql

### other_bucket

该参数的值可以如下：
false
不计算other存储桶

true
如果正在使用命名过滤器，则 返回other存储桶中的存储桶（_other_默认情况下的命名），如果使用匿名过滤器，则返回最后一个存储桶


other_bucket_key 参数可用于将other存储桶的密钥设置为除默认值_other_以外的其他值。设置此参数会将其隐式设置other_bucket为true。

GET logs/_search
{
  "size": 0,
  "aggs" : {
    "messages" : {
      "filters" : {
        "other_bucket_key": "other_messages",
        "filters" : {
          "errors" :   { "match" : { "body" : "error"   }},
          "warnings" : { "match" : { "body" : "warning" }}
        }
      }
    }
  }
}

结果：
{
  "took": 3,
  "timed_out": false,
  "_shards": ...,
  "hits": ...,
  "aggregations": {
    "messages": {
      "buckets": {
        "errors": {
          "doc_count": 1
        },
        "warnings": {
          "doc_count": 2
        },
        "other_messages": {
          "doc_count": 1
        }
      }
    }
  }
}

- 该存储桶将包含与任何给定过滤器都不匹配的所有文档

### Anonymous filters

- 匿名过滤器：不指定 bucket Name

  GET logs/_search
  {
    "size": 0,
    "aggs" : {
      "messages" : {
        "filters" : {
          "filters" : [
            { "match" : { "body" : "error"   }},
            { "match" : { "body" : "warning" }}
          ]
        }
      }
    }
  }
  结果按顺序返回：
    "aggregations": {
      "messages": {
        "buckets": [
          {
            "doc_count": 1
          },
          {
            "doc_count": 2
          }
        ]
      }
    }
  }

## 12）Global
全局聚合

在搜索执行上下文中定义所有文档的单个存储桶

POST /sales/_search?size=0
{
    "query" : {
        "match" : { "type" : "t-shirt" }
    },
    "aggs" : {
        "all_products" : {
            "global" : {}, 
            "aggs" : { 
                "avg_price" : { "avg" : { "field" : "price" } }
            }
        },
        "t_shirts": { "avg" : { "field" : "price" } }
    }
}

### 使用场景：改变聚合的作用范围，
将所有文档作为聚合对象，抛开 query的影响

### 示例

在搜索执行上下文中定义所有文档的单个存储桶

POST /sales/_search?size=0
{
    "query" : {
        "match" : { "type" : "t-shirt" }
    },
    "aggs" : {
        "all_products" : {
            "global" : {}, 
            "aggs" : { 
                "avg_price" : { "avg" : { "field" : "price" } }
            }
        },
        "t_shirts": { "avg" : { "field" : "price" } }
    }
}

结果：
{
    ...
    "aggregations" : {
        "all_products" : {
            "doc_count" : 7, 
            "avg_price" : {
                "value" : 140.71428571428572 
            }
        },
        "t_shirts": {
            "value" : 128.33333333333334 
        }
    }
}

- 一句DSL，得到商品类型为 t-shirt 的商品集合及其平均价格，同时得到所有商品的平均价格

## 13）Missing
缺少聚合

在当前文档集上下文中创建所有缺少字段值（实际上是缺少字段或配置了NULL值）的所有文档的存储桶。

POST /sales/_search?size=0
{
    "aggs" : {
        "products_without_a_price" : {
            "missing" : { "field" : "price" }
        }
    }
}


结果：
{
    ...
    "aggregations" : {
        "products_without_a_price" : {
            "doc_count" : 00
        }
    }
}



### 使用场景：获取指定 Filed 没有 value【缺少字段或配置了NULL值】 的文档集合

### 示例

在当前文档集上下文中创建所有缺少字段值（实际上是缺少字段或配置了NULL值）的所有文档的存储桶。

POST /sales/_search?size=0
{
    "aggs" : {
        "products_without_a_price" : {
            "missing" : { "field" : "price" }
        }
    }
}


结果：
{
    ...
    "aggregations" : {
        "products_without_a_price" : {
            "doc_count" : 00
        }
    }
}



- 等价于SQL 中的 count··· where field is null

## 14）Adjacency Matrix
 邻接矩阵聚合

### 使用场景：类似于Filters聚合，但响应中的每个桶代表交叉滤波器矩阵中的一个非空单元。

### 概念理解图示

### 示例

PUT /emails/_bulk?refresh
{ "index" : { "_id" : 1 } }
{ "accounts" : ["hillary", "sidney"]}
{ "index" : { "_id" : 2 } }
{ "accounts" : ["hillary", "donald"]}
{ "index" : { "_id" : 3 } }
{ "accounts" : ["vladimir", "donald"]}

GET emails/_search
{
  "size": 0,
  "aggs" : {
    "interactions" : {
      "adjacency_matrix" : {
        "filters" : {
          "grpA" : { "terms" : { "accounts" : ["hillary", "sidney"] }},
          "grpB" : { "terms" : { "accounts" : ["donald", "mitt"] }},
          "grpC" : { "terms" : { "accounts" : ["vladimir", "nigel"] }}
        }
      }
    }
  }
}

结果：
{
  "took": 9,
  "timed_out": false,
  "_shards": ...,
  "hits": ...,
  "aggregations": {
    "interactions": {
      "buckets": [
        {
          "key":"grpA",
          "doc_count": 2
        },
        {
          "key":"grpA&grpB",
          "doc_count": 1
        },
        {
          "key":"grpB",
          "doc_count": 2
        },
        {
          "key":"grpB&grpC",
          "doc_count": 1
        },
        {
          "key":"grpC",
          "doc_count": 1
        }
      ]
    }
  }
}

## 15）Geo Distance
地理位置距离聚合

### 使用场景：针对 geo_point 类型字段的 Range 聚合

### 示例

在概念上与范围聚合非常相似。用户可以定义一个原点和一组距离范围桶。聚合评估每个文档值到起点的距离，并根据范围确定它所属的存储桶（如果文档和原点之间的距离在存储桶的距离范围内，则文档属于存储桶）。

POST /museums/_search?size=0
{
    "aggs" : {
        "rings_around_amsterdam" : {
            "geo_distance" : {
                "field" : "location",
                "origin" : "52.3760, 4.894",
                "ranges" : [
                    { "to" : 100000 },
                    { "from" : 100000, "to" : 300000 },
                    { "from" : 300000 }
                ]
            }
        }
    }
}

结果：
{
    ...
    "aggregations": {
        "rings_around_amsterdam" : {
            "buckets": [
                {
                    "key": "*-100000.0",
                    "from": 0.0,
                    "to": 100000.0,
                    "doc_count": 3
                },
                {
                    "key": "100000.0-300000.0",
                    "from": 100000.0,
                    "to": 300000.0,
                    "doc_count": 1
                },
                {
                    "key": "300000.0-*",
                    "from": 300000.0,
                    "doc_count": 2
                }
            ]
        }
    }
}

- 聚合距离指定位置的各个范围的文档集合

### 重要参数

- unit：单位 默认为m（米），mi（英里），in（英寸），yd（码），km（公里），cm（厘米），mm（毫米）
- distance_type：距离计算模式，arc（默认）和plane

  该arc计算是最准确的。
  
  该plane是最快的，但最不准确的。
  
  arc当您的搜索上下文为“窄”且跨较小的地理区域（约5公里）时，请考虑使用。
  
  plane对于很大范围的搜索（例如跨大洲搜索），将返回较高的误差范围。

- keyed：更改返回格式，将 key 作为键 返回
- 为每个范围自定义key

## 16）GeoHash grid
GeoHash网格聚合

## 17）GeoTile Grid 
GeoTile网格聚合

## 18）Parent

用于选择具有指定类型（如 join field 中定义）的父级文档。

此聚合只有一个选项：
type -应该选择的子类型。

PUT parent_example
{
  "mappings": {
     "properties": {
       "join": {
         "type": "join",
         "relations": {
           "question": "answer"
         }
       }
     }
  }
}

聚合
POST parent_example/_search?size=0
{
  "aggs": {
    "top-names": {
      "terms": {
        "field": "owner.display_name.keyword",
        "size": 10
      },
      "aggs": {
        "to-questions": {
          "parent": {
            "type" : "answer" 
          },
          "aggs": {
            "top-tags": {
              "terms": {
                "field": "tags.keyword",
                "size": 10
              }
            }
          }
        }
      }
    }
  }
}

### 使用场景：用于 join 类型的字段聚合

## 19）Children 

用于选择具有指定类型（如 joinfield 中定义）的子文档。

此聚合只有一个选项：
type -应该选择的子类型。

### 使用场景：用于 join 类型的字段聚合

## 20） Nested
 嵌套聚合

对于 nested 类型字段的聚合


PUT /products
{
    "mappings": {
        "properties" : {
            "resellers" : { 
                "type" : "nested",
                "properties" : {
                    "reseller" : { "type" : "text" },
                    "price" : { "type" : "double" }
                }
            }
        }
    }
}


GET /products/_search
{
    "query" : {
        "match" : { "name" : "led tv" }
    },
    "aggs" : {
        "resellers" : {
            "nested" : {
                "path" : "resellers"
            },
            "aggs" : {
                "min_price" : { "min" : { "field" : "resellers.price" } }
            }
        }
    }
}

### 使用场景：用于 nested 类型的字段聚合

## 21）Reverse nested
   反向嵌套聚合

可从嵌套文档聚合父文档。
该 reverse_nested 聚合必须在内部被定义 nested 聚集。

GET /issues/_search
{
  "query": {
    "match_all": {}
  },
  "aggs": {
    "comments": {
      "nested": {
        "path": "comments"
      },
      "aggs": {
        "top_usernames": {
          "terms": {
            "field": "comments.username"
          },
          "aggs": {
            "comment_to_issue": {
              "reverse_nested": {}, 
              "aggs": {
                "top_tags_per_comment": {
                  "terms": {
                    "field": "tags"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

### reverse_nested聚合必须在嵌套聚合中定义。

## 22） Sampler
 采样器聚合

### 使用场景：一个过滤聚合，用于将任何子聚合的处理限制为得分最高的文档样本。

### 示例

一个过滤聚合，用于将任何子聚合的处理限制为得分最高的文档样本。

使用场景：
将分析重点放在高相关性匹配上，而不是潜在的很长的低质量匹配尾部
降低仅使用样本即可产生有用结果的聚合的运行成本 significant_terms。

POST /stackoverflow/_search?size=0
{
    "query": {
        "query_string": {
            "query": "tags:kibana OR tags:javascript"
        }
    },
    "aggs": {
        "sample": {
            "sampler": {
                "shard_size": 200
            },
            "aggs": {
                "keywords": {
                    "significant_terms": {
                        "field": "tags",
                        "exclude": ["kibana", "javascript"]
                    }
                }
            }
        }
    }
}

结果：
{
    ...
    "aggregations": {
        "sample": {
            "doc_count": 200,
            "keywords": {
                "doc_count": 200,
                "bg_count": 650,
                "buckets": [
                    {
                        "key": "elasticsearch",
                        "doc_count": 150,
                        "score": 1.078125,
                        "bg_count": 200
                    },
                    {
                        "key": "logstash",
                        "doc_count": 50,
                        "score": 0.5625,
                        "bg_count": 50
                    }
                ]
            }
        }
    }
}

## 23） Diversified Sampler
 多样化采集器聚合

将分析重点放在高相关性匹配上，而不是潜在的很长的低质量匹配尾部

通过确保公平表示不同来源的内容来消除分析中的偏见

降低仅使用样本即可产生有用结果的聚合的运行成本 significant_terms

POST /stackoverflow/_search?size=0
{
    "query": {
        "query_string": {
            "query": "tags:elasticsearch"
        }
    },
    "aggs": {
        "my_unbiased_sample": {
            "diversified_sampler": {
                "shard_size": 200,
                "field" : "author"
            },
            "aggs": {
                "keywords": {
                    "significant_terms": {
                        "field": "tags",
                        "exclude": ["elasticsearch"]
                    }
                }
            }
        }
    }

### 将分析重点放在高相关性匹配上

## 24）Significant Terms
 重要术语聚合

一种聚合，返回集合中感兴趣或不寻常出现的术语。

用例示例：

当用户在文本中搜索“禽流感”时建议“ H5N1”

从报告损失的信用卡所有者的交易历史中识别出“妥协的共同点”的商人

为自动新闻分类器建议与股票代码$ ATI相关的关键字

发现欺诈性医生，他的诊断不仅仅是鞭打伤害

发现爆胎次数不成比例的轮胎制造商

GET /_search
{
    "query" : {
        "terms" : {"force" : [ "British Transport Police" ]}
    },
    "aggregations" : {
        "significant_crime_types" : {
            "significant_terms" : { "field" : "crime_type" }
        }
    }
}

结果：
{
    ...
    "aggregations" : {
        "significant_crime_types" : {
            "doc_count": 47347,
            "bg_count": 5064554,
            "buckets" : [
                {
                    "key": "Bicycle theft",
                    "doc_count": 3640,
                    "score": 0.371235374214817,
                    "bg_count": 66799
                }
                ...
            ]
        }
    }
}

### 返回集合中感兴趣或不寻常出现的术语。

## 25）Significant Text
 重要文本聚合

一种聚合，返回集合中有趣的或不寻常的自由文本术语。它类似于重要术语聚合，

但有一点不同:
1、它是专门设计用于 text 类型字段
2、它不需要 field data or doc-values
3、它会实时地重新分析文本内容，这意味着它还可以过滤干扰文本的重复部分，否则会导致统计数据失真。
【重新分析大型结果集将需要大量时间和内存。建议将significant_text 聚合用作采样器或 多样化采样器聚合的子级，以将分析限制在少量匹配的顶级文档（例如200）中。这通常会提高速度，内存使用和结果质量。】



### 示例

GET news/_search
{
    "query" : {
        "match" : {"content" : "Bird flu"}
    },
    "aggregations" : {
        "my_sample" : {
            "sampler" : {
                "shard_size" : 100
            },
            "aggregations": {
                "keywords" : {
                    "significant_text" : { "field" : "content" }
                }
            }
        }
    }
}
结果：
{
  "took": 9,
  "timed_out": false,
  "_shards": ...,
  "hits": ...,
    "aggregations" : {
        "my_sample": {
            "doc_count": 100,
            "keywords" : {
                "doc_count": 100,
                "buckets" : [
                    {
                        "key": "h5n1",
                        "doc_count": 4,
                        "score": 4.71235374214817,
                        "bg_count": 5
                    }
                    ...
                ]
            }
        }
    }
}
结果表明，“ h5n1”是与禽流感密切相关的几个术语之一。总体而言，它仅发生5次（请参阅参考资料bg_count），但是其中有4次幸运地出现在我们的100份“禽流感”结果样本中。这表明一个重要的单词，用户可以将其潜在地添加到他们的搜索中。

### 返回集合中有趣的或不寻常的自由文本术语

