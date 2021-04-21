# 02 Term-level queries（精确匹配）

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/term-level-queries.html


在执行前不会将查询字符串分词。

## 与 Full Text queries 的区别

### 检索词不会被分析

## term query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-term-query.html


字符串字段可以是类型text（作为全文，如电子邮件的正文），或keyword（作为精确值，如电子邮件地址或邮政编码）。
精确值（具有在字段中指定的确切值，该字段已添加到倒排索引中，以使其可搜索。

但是，text字段为analyzed。这意味着它们的值首先会通过分析器生成一个术语列表，然后将其添加到倒排索引中。
如：
“Quick Brown Fox!” into the terms [quick, brown, fox].

使用term搜索  ：Quick Brown Fox是搜索不到的，但是使用term搜索：Quick是可以搜索到的

### 示例

查找在 user 字段的倒排索引中包含确切术语 Kimchy 的文档。

POST _search
{
  "query": {
    "term" : { "user" : "Kimchy" } 
  }
}

### 检索词不会被分词，作为一个Token/term

## terms query

类似于 mysql 的  in ( )

### 类似于 mysql 的  in ( )

- 示例1：in（）

  GET /_search
  {
      "query": {
          "terms" : { "user" : ["kimchy", "elasticsearch"]}
      }
  }

### Terms lookup mechanism

当需要指定一个terms包含大量术语的过滤器时，从索引中的文档中获取这些术语值将是有益的。

- 示例2：联表查询

  场景：根据 tagIds 获取tag 详情
  
  PUT /users/_doc/2
  {
      "followers" : ["1", "3"]
  }
  
  PUT /tweets/_doc/1
  {
      "user" : "1"
  }
  
  PUT /tweets/_doc/2
  {
      "user" : "2"
  }
  
  PUT /tweets/_doc/3
  {
      "user" : "3"
  }
  
  GET /tweets/_search
  {
      "query" : {
          "terms" : {
              "user" : {
                  "index" : "users",
                  "type" : "_doc",
                  "id" : "2",
                  "path" : "followers"
              }
          }
      }
  }
  

## range query

用于：dates, numbers, or strings

该range查询接受以下参数：

gte 大于或等于

gt 大于

lte 小于或等于

lt 少于

boost  设置查询的提升值，默认为 1.0

GET _search
{
    "query": {
        "range" : {
            "age" : {
                "gte" : 10,
                "lte" : 20,
                "boost" : 2.0
            }
        }
    }
}

### 字段类型决定查询类型

将文档与字段在一定范围内的字段匹配。Lucene查询的类型取决于字段类型，对于string 字段TermRangeQuery，则为，而对于数字/日期字段，查询为NumericRangeQuery。

- string

	- TermRangeQuery

- number/date

	- NumericRangeQuery

### 日期字段的范围查询

GET _search
{
    "query": {
        "range" : {
            "date" : {
                "gte" : "now-1d/d",
                "lt" :  "now/d"
            }
        }
    }
}

- 可使用 Date Math 作为检索词

  GET _search
  {
      "query": {
          "range" : {
              "date" : {
                  "gte" : "now-1d/d",
                  "lt" :  "now/d"
              }
          }
      }
  }

- Date Math

	-  date math to round

	  使用日期数学将日期四舍五入到最接近的日期，月份，小时等时，四舍五入的日期取决于范围的结尾是包含端点还是排除端点。
	  
	  
	  
	  

		- 包含端点：按最大范围舍入

		  gte
		  大于或等于四舍五入的日期：2014-11-18||/M变为 2014-11-01，即包括整个月份。
		  
		  lte
		  
		  小于或等于四舍五入的日期：2014-11-18||/M变为 2014-11-30T23:59:59.999，即包括整个月份。

		- 排除端点：按最小范围

		  
		  gt
		  
		  大于四舍五入的日期：2014-11-18||/M变为 2014-11-30T23:59:59.999，即排除整个月份。
		  
		  
		  lt
		  
		  少于四舍五入的日期：2014-11-18||/M变为2014-11-01，即排除整个月份。

- 日期格式

	- 默认使用检索字段的format，但是可以覆盖

	  GET _search
	  {
	      "query": {
	          "range" : {
	              "born" : {
	                  "gte": "01/01/2012",
	                  "lte": "2013",
	                  "format": "dd/MM/yyyy||yyyy"
	              }
	          }
	      }
	  }
	  
	  
	  请注意，如果日期缺少年，月和日的某些坐标，则丢失的部分将以unix time的开始（即1970年1月1日）填充 。这意味着，例如，当指定dd格式时，"gte" : 10 将使用翻译成1970-01-10T00:00:00.000Z。

	- 时区问题：time_zone参数

	  GET _search
	  {
	      "query": {
	          "range" : {
	              "timestamp" : {
	                  "gte": "2015-01-01T00:00:00", 
	                  "lte": "now", 
	                  "time_zone": "+01:00"
	              }
	          }
	      }
	  }
	  
	  
	  "gte": "2015-01-01T00:00:00", 	
	  该日期将转换为2014-12-31T23:00:00 UTC。
	  
	  
	  now不受time_zone参数的影响，它始终是当前系统时间（以UTC为单位）。但是，在使用日期数学舍入时（例如，使用向下舍入到最近的日期now/d），time_zone将考虑提供的值。

		- 将日期从另一个时区转换为UTC 

### 对字段类型为 range  的查询

- relation参数

  该relation参数控制这两个范围如何匹配：
  
  WITHIN
  文档的范围字段要完全在检索关键词的范围里。
  
  
  CONTAINS
  
  文档的范围字段完全包含检索关键词的范围；
  
  
  INTERSECTS
  
  文档的范围字段与检索关键词的范围有交集即可。
  这是查询范围字段时的默认值。

- 示例

  PUT range_index
  {
    "settings": {
      "number_of_shards": 2
    },
    "mappings": {
      "_doc": {
        "properties": {
          "expected_attendees": {
            "type": "integer_range"
          },
          "time_frame": {
            "type": "date_range", 
            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
          }
        }
      }
    }
  }
  
  PUT range_index/_doc/1?refresh
  {
    "expected_attendees" : { 
      "gte" : 10,
      "lte" : 20
    },
    "time_frame" : { 
      "gte" : "2015-10-31 12:00:00", 
      "lte" : "2015-11-01"
    }
  }
  检索：
  GET range_index/_search
  {
    "query" : {
      "range" : {
        "time_frame" : { 
          "gte" : "2015-10-31",
          "lte" : "2015-11-01",
          "relation" : "within" 
        }
      }
    }
  }

## wildcard query

匹配具有匹配通配符表达式（未分析）的字段的文档。支持的通配符是*，它匹配任何字符序列（包括空字符），和?，它匹配任何单个字符。

请注意，此查询的速度可能很慢，因为它需要迭代许多项。为了防止极慢的通配符查询，通配符术语不应以通配符*或？之一开头?

GET /_search
{
    "query": {
        "wildcard" : { "user" : "ki*y" }
    }
}

### 该模式支持单字符通配符（?）和多字符通配符（*）

## prefix query

匹配具有包含带有指定前缀（未分析）的术语的字段的文档。

GET /_search
{ "query": {
    "prefix" : { "user" : "ki" }
  }
}

### 查找指定字段包含以指定确切前缀开头的术语的文档。

## exists query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-exists-query.html

1、查询 user 字段不为 null 的文档
GET /_search
{
    "query": {
        "exists" : { "field" : "user" }
    }
}

2、查询 user 字段为 null 的文档
没有missing查询。而是exists在must_not子句中使用查询 
GET /_search
{
    "query": {
        "bool": {
            "must_not": {
                "exists": {
                    "field": "user"
                }
            }
        }
    }
}

### 查找指定字段包含任何非空值【不是null 也不是[ ]】的文档。

### 注意：这些值不属于空值



1、空字符串，例如""或"-"

2、包含null和另一个值的数组，例如[null, "foo"]

3、自定义null-value，在字段映射中定义

### 查询为null的字段

- must_not + exists

  2、查询 user 字段为 null 的文档
  没有missing查询。而是exists在must_not子句中使用查询 
  GET /_search
  {
      "query": {
          "bool": {
              "must_not": {
                  "exists": {
                      "field": "user"
                  }
              }
          }
      }
  }

## fuzzy query

https://www.jianshu.com/p/f8edfaf98c4a

Elasticsearch的误拼写时的fuzzy模糊搜索技术

搜索的时候可能输入的文本会出现误拼写的情况
比如输入hallo，这时候也要匹配到hello。


GET /_search
{
    "query": {
        "fuzzy" : {
            "user" : {
                "value": "ki",
                "boost": 1.0,
                "fuzziness": 2,
                "prefix_length": 0,
                "max_expansions": 100
            }
        }
    }
}

如果prefix_length将设置为0，
并且max_expansions将设置为很高的数字，则 此查询可能会很繁琐。这可能会导致索引中的每一项都受到检查！



### fuzziness

- 最大编辑距离。默认为AUTO。
- 一个字符串要与另一个字符串相同必须更改的一个字符数。

### prefix_length

- 不会被“模糊化”的初始字符数。这有助于减少必须检查的术语数量。默认为0。

### max_expansions

- fuzzy查询将扩展到 的最大术语数。默认为50。

### transpositions

- 是否支持模糊转置（ab→ ba）。默认值为false。

## terms_set query

返回的文档至少匹配一个或多个检索的术语。这些术语未进行分析，因此必须完全匹配。每个文档中必须匹配的术语数会有所不同，并由“最小匹配项”字段控制，或者由“最小匹配项”脚本中的每个文档计算。

控制必须匹配的必需术语数量的字段必须是数字字段：

### 示例

PUT /my-index
{
    "mappings": {
        "_doc": {
            "properties": {
                "required_matches": {
                    "type": "long"
                }
            }
        }
    }
}

PUT /my-index/_doc/1?refresh
{
    "codes": ["ghi", "jkl"],
    "required_matches": 2
}

PUT /my-index/_doc/2?refresh
{
    "codes": ["def", "ghi"],
    "required_matches": 2
}



- minimum_should_match_field

  检索：
  GET /my-index/_search
  {
      "query": {
          "terms_set": {
              "codes" : {
                  "terms" : ["abc", "def", "ghi"],
                  "minimum_should_match_field": "required_matches"
              }
          }
      }
  }

- minimum_should_match_script

  GET /my-index/_search
  {
      "query": {
          "terms_set": {
              "codes" : {
                  "terms" : ["abc", "def", "ghi"],
                  "minimum_should_match_script": {
                     "source": "Math.min(params.num_terms, doc['required_matches'].value)"
                  }
              }
          }
      }
  }

## regexp query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-regexp-query.html

GET /_search
{
    "query": {
        "regexp":{
            "name.first": "s.*y"
        }
    }
}

注意：regexp查询的性能在很大程度上取决于所选的正则表达式。匹配所有类似的东西.*都很慢，而且使用环视正则表达式也很慢。如果可能，应在正则表达式开始之前尝试使用长前缀。

### 使用正则表达式术语查询。

## type query

### 筛选与提供的文档/映射类型匹配的文档。

GET /_search
{
    "query": {
        "type" : {
            "value" : "_doc"
        }
    }
}

### 几乎无用，因为 type 在7.x已被弃用

在Elasticsearch 6.0.0或更高版本中创建的索引只能包含一个映射类型。在5.x中创建的具有多种映射类型的索引将继续像在Elasticsearch 6.x中一样工作。类型将在Elasticsearch 7.0.0中的API中弃用，并在8.0.0中完全删除。

## ids query

GET /_search
{
    "query": {
        "ids" : {
            "type" : "_doc",
            "values" : ["1", "4", "100"]
        }
    }
}

### 根据index的 _id 字段检索文档

## Term-level queries（3）

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/term-level-queries.html


在执行前不会将查询字符串分词。

### wildcard query

匹配具有匹配通配符表达式（未分析）的字段的文档。支持的通配符是*，它匹配任何字符序列（包括空字符），和?，它匹配任何单个字符。

请注意，此查询的速度可能很慢，因为它需要迭代许多项。为了防止极慢的通配符查询，通配符术语不应以通配符*或？之一开头?

GET /_search
{
    "query": {
        "wildcard" : { "user" : "ki*y" }
    }
}

- 多字符通配符（*）

	- 等价于 mysql 的 like ("检索词%")

- 单字符通配符（?）

	- 等价于 mysql 的 like ("检索词_")

### prefix query

匹配具有包含带有指定前缀（未分析）的术语的字段的文档。

GET /_search
{ "query": {
    "prefix" : { "user" : "ki" }
  }
}

- 查找指定字段包含以指定确切前缀开头的术语的文档。

### fuzzy query

https://www.jianshu.com/p/f8edfaf98c4a

Elasticsearch的误拼写时的fuzzy模糊搜索技术

搜索的时候可能输入的文本会出现误拼写的情况
比如输入hallo，这时候也要匹配到hello。


GET /_search
{
    "query": {
        "fuzzy" : {
            "user" : {
                "value": "ki",
                "boost": 1.0,
                "fuzziness": 2,
                "prefix_length": 0,
                "max_expansions": 100
            }
        }
    }
}

如果prefix_length将设置为0，
并且max_expansions将设置为很高的数字，则 此查询可能会很繁琐。这可能会导致索引中的每一项都受到检查！



- fuzziness

	- 最大编辑距离。默认为AUTO。
	- 一个字符串要与另一个字符串相同必须更改的一个字符数。

- prefix_length

	- 不会被“模糊化”的初始字符数。这有助于减少必须检查的术语数量。默认为0。

- max_expansions

	- fuzzy查询将扩展到 的最大术语数。默认为50。

- transpositions

	- 是否支持模糊转置（ab→ ba）。默认值为false。

### exists query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-exists-query.html

1、查询 user 字段不为 null 的文档
GET /_search
{
    "query": {
        "exists" : { "field" : "user" }
    }
}

2、查询 user 字段为 null 的文档
没有missing查询。而是exists在must_not子句中使用查询 
GET /_search
{
    "query": {
        "bool": {
            "must_not": {
                "exists": {
                    "field": "user"
                }
            }
        }
    }
}

- 查找指定字段包含任何非空值【不是null 也不是[ ]】的文档。
- 注意：这些值不属于空值

  
  
  1、空字符串，例如""或"-"
  
  2、包含null和另一个值的数组，例如[null, "foo"]
  
  3、自定义null-value，在字段映射中定义

- 查询为null的字段

	- must_not + exists

	  2、查询 user 字段为 null 的文档
	  没有missing查询。而是exists在must_not子句中使用查询 
	  GET /_search
	  {
	      "query": {
	          "bool": {
	              "must_not": {
	                  "exists": {
	                      "field": "user"
	                  }
	              }
	          }
	      }
	  }

### terms_set query

返回的文档至少匹配一个或多个检索的术语。这些术语未进行分析，因此必须完全匹配。每个文档中必须匹配的术语数会有所不同，并由“最小匹配项”字段控制，或者由“最小匹配项”脚本中的每个文档计算。

控制必须匹配的必需术语数量的字段必须是数字字段：

- 示例

  PUT /my-index
  {
      "mappings": {
          "_doc": {
              "properties": {
                  "required_matches": {
                      "type": "long"
                  }
              }
          }
      }
  }
  
  PUT /my-index/_doc/1?refresh
  {
      "codes": ["ghi", "jkl"],
      "required_matches": 2
  }
  
  PUT /my-index/_doc/2?refresh
  {
      "codes": ["def", "ghi"],
      "required_matches": 2
  }
  
  

	- minimum_should_match_field

	  检索：
	  GET /my-index/_search
	  {
	      "query": {
	          "terms_set": {
	              "codes" : {
	                  "terms" : ["abc", "def", "ghi"],
	                  "minimum_should_match_field": "required_matches"
	              }
	          }
	      }
	  }

	- minimum_should_match_script

	  GET /my-index/_search
	  {
	      "query": {
	          "terms_set": {
	              "codes" : {
	                  "terms" : ["abc", "def", "ghi"],
	                  "minimum_should_match_script": {
	                     "source": "Math.min(params.num_terms, doc['required_matches'].value)"
	                  }
	              }
	          }
	      }
	  }

### regexp query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-regexp-query.html

GET /_search
{
    "query": {
        "regexp":{
            "name.first": "s.*y"
        }
    }
}

注意：regexp查询的性能在很大程度上取决于所选的正则表达式。匹配所有类似的东西.*都很慢，而且使用环视正则表达式也很慢。如果可能，应在正则表达式开始之前尝试使用长前缀。

- 使用正则表达式术语查询。

### type query

- 筛选与提供的文档/映射类型匹配的文档。

  GET /_search
  {
      "query": {
          "type" : {
              "value" : "_doc"
          }
      }
  }

- 几乎无用，因为 type 在7.x已被弃用

  在Elasticsearch 6.0.0或更高版本中创建的索引只能包含一个映射类型。在5.x中创建的具有多种映射类型的索引将继续像在Elasticsearch 6.x中一样工作。类型将在Elasticsearch 7.0.0中的API中弃用，并在8.0.0中完全删除。

### ids query

GET /_search
{
    "query": {
        "ids" : {
            "type" : "_doc",
            "values" : ["1", "4", "100"]
        }
    }
}

- 根据index的 _id 字段检索文档

### range query

用于：dates, numbers, or strings

该range查询接受以下参数：

gte 大于或等于

gt 大于

lte 小于或等于

lt 少于

boost  设置查询的提升值，默认为 1.0

GET _search
{
    "query": {
        "range" : {
            "age" : {
                "gte" : 10,
                "lte" : 20,
                "boost" : 2.0
            }
        }
    }
}

- 一、日期字段的范围查询

  GET _search
  {
      "query": {
          "range" : {
              "date" : {
                  "gte" : "now-1d/d",
                  "lt" :  "now/d"
              }
          }
      }
  }

	- 1）Date Math
	-  2）date math to round

	  使用日期数学将日期四舍五入到最接近的日期，月份，小时等时，四舍五入的日期取决于范围的结尾是包含端点还是排除端点。
	  
	  
	  
	  

		- 包含端点：按最大范围四舍五入

		  gte
		  大于或等于四舍五入的日期：2014-11-18||/M变为 2014-11-01，即包括整个月份。
		  
		  lte
		  
		  小于或等于四舍五入的日期：2014-11-18||/M变为 2014-11-30T23:59:59.999，即包括整个月份。

		- 排除端点：按最小范围四舍五入

		  
		  gt
		  
		  大于四舍五入的日期：2014-11-18||/M变为 2014-11-30T23:59:59.999，即排除整个月份。
		  
		  
		  lt
		  
		  少于四舍五入的日期：2014-11-18||/M变为2014-11-01，即排除整个月份。

	- 3）使用 Date Math 作为检索词

	  GET _search
	  {
	      "query": {
	          "range" : {
	              "date" : {
	                  "gte" : "now-1d/d",
	                  "lt" :  "now/d"
	              }
	          }
	      }
	  }

	- 4）日期格式

		- 默认使用检索字段的format，但是可以覆盖

		  GET _search
		  {
		      "query": {
		          "range" : {
		              "born" : {
		                  "gte": "01/01/2012",
		                  "lte": "2013",
		                  "format": "dd/MM/yyyy||yyyy"
		              }
		          }
		      }
		  }
		  
		  
		  请注意，如果日期缺少年，月和日的某些坐标，则丢失的部分将以unix time的开始（即1970年1月1日）填充 。这意味着，例如，当指定dd格式时，"gte" : 10 将使用翻译成1970-01-10T00:00:00.000Z。

		- 时区问题：time_zone参数

		  将日期从另一个时区转换为UTC 
		  
		  
		  GET _search
		  {
		      "query": {
		          "range" : {
		              "timestamp" : {
		                  "gte": "2015-01-01T00:00:00", 
		                  "lte": "now", 
		                  "time_zone": "+01:00"
		              }
		          }
		      }
		  }
		  
		  
		  "gte": "2015-01-01T00:00:00", 	
		  该日期将转换为2014-12-31T23:00:00 UTC。
		  
		  
		  now不受time_zone参数的影响，它始终是当前系统时间（以UTC为单位）。但是，在使用日期数学舍入时（例如，使用向下舍入到最近的日期now/d），time_zone将考虑提供的值。

- 二、对区间类型字段的检索

	- relation参数

	  该relation参数控制这两个范围如何匹配：
	  
	  WITHIN
	  文档的范围字段要完全在检索关键词的范围里。
	  
	  
	  CONTAINS
	  
	  文档的范围字段完全包含检索关键词的范围；
	  
	  
	  INTERSECTS
	  
	  文档的范围字段与检索关键词的范围有交集即可。
	  这是查询范围字段时的默认值。

		- WITHIN
		- CONTAINS
		- INTERSECTS

	- 示例

	  PUT range_index
	  {
	    "settings": {
	      "number_of_shards": 2
	    },
	    "mappings": {
	      "_doc": {
	        "properties": {
	          "expected_attendees": {
	            "type": "integer_range"
	          },
	          "time_frame": {
	            "type": "date_range", 
	            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
	          }
	        }
	      }
	    }
	  }
	  
	  PUT range_index/_doc/1?refresh
	  {
	    "expected_attendees" : { 
	      "gte" : 10,
	      "lte" : 20
	    },
	    "time_frame" : { 
	      "gte" : "2015-10-31 12:00:00", 
	      "lte" : "2015-11-01"
	    }
	  }
	  检索：
	  GET range_index/_search
	  {
	    "query" : {
	      "range" : {
	        "time_frame" : { 
	          "gte" : "2015-10-31",
	          "lte" : "2015-11-01",
	          "relation" : "within" 
	        }
	      }
	    }
	  }

