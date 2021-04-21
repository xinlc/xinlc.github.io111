# 08 Mapping参数详解

## 1、mapping

### 基础配置

- properties

	- mappings、object字段和nested字段 包含的子字段就叫做 properties
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": { 
	        "manager": {
	          "properties": { 
	            "age":  { "type": "integer" },
	            "name": { "type": "text"  }
	          }
	        },
	        "employees": {
	          "type": "nested",
	          "properties": { 
	            "age":  { "type": "integer" },
	            "name": { "type": "text"  }
	          }
	        }
	      }
	    }
	  }

### 与分词相关的配置

- fields

	- 对同一个字段建立不同的索引方式
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "name": { 
	          "type": "text",
	          "fields": {
	            "english": { 
	              "type":     "text",
	              "analyzer": "english"
	            }
	          }
	        }
	      }
	    }
	  }
	  
	  或
	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "city": {
	          "type": "text",
	          "fields": {
	            "raw": { 
	              "type":  "keyword"
	            }
	          }
	        }
	      }
	    }
	  }

- analyzer

  该 analyzer 参数指定索引或搜索字段时用于 文本分析的分析器。
  
  除非使用 search_analyzer 映射参数覆盖，否则此分析器将同时用于索引和搜索分析。

	- 仅text字段支持

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "title": {
	          "type": "text",
	          "analyzer": "whitespace"
	        }
	      }
	    }
	  }

- search_quote_analyzer

	- 为 match_pharse 查询指定分词器
	- 示例

	  PUT my_index
	  {
	     "settings":{
	        "analysis":{
	           "analyzer":{
	              "my_analyzer":{ 
	                 "type":"custom",
	                 "tokenizer":"standard",
	                 "filter":[
	                    "lowercase"
	                 ]
	              },
	              "my_stop_analyzer":{ 
	                 "type":"custom",
	                 "tokenizer":"standard",
	                 "filter":[
	                    "lowercase",
	                    "english_stop"
	                 ]
	              }
	           },
	           "filter":{
	              "english_stop":{
	                 "type":"stop",
	                 "stopwords":"_english_"
	              }
	           }
	        }
	     },
	     "mappings":{
	         "properties":{
	            "title": {
	               "type":"text",
	               "analyzer":"my_analyzer", 
	               "search_analyzer":"my_stop_analyzer", 
	               "search_quote_analyzer":"my_analyzer" 
	           }
	        }
	     }
	  }

- search_analyzer

	- 示例

	  PUT my_index
	  {
	    "settings": {
	      "analysis": {
	        "filter": {
	          "autocomplete_filter": {
	            "type": "edge_ngram",
	            "min_gram": 1,
	            "max_gram": 20
	          }
	        },
	        "analyzer": {
	          "autocomplete": { 
	            "type": "custom",
	            "tokenizer": "standard",
	            "filter": [
	              "lowercase",
	              "autocomplete_filter"
	            ]
	          }
	        }
	      }
	    },
	    "mappings": {
	      "properties": {
	        "text": {
	          "type": "text",
	          "analyzer": "autocomplete", 
	          "search_analyzer": "standard" 
	        }
	      }
	    }
	  }
	  
	  PUT my_index/_doc/1
	  {
	    "text": "Quick Brown Fox" 
	  }
	  # 可以检索到
	  GET my_index/_search
	  {
	    "query": {
	      "match": {
	        "text": {
	          "query": "Quick Br", 
	          "operator": "and"
	        }
	      }
	    }
	  }

- normalizer

	- keyword 字段的normalizer属性与analyzer类似，
不同之处在于它保证分析链生成单个 token。
	- 与 analyzer相比，缺少了 tokenizer
	- 示例

	  PUT index
	  {
	    "settings": {
	      "analysis": {
	        "normalizer": {
	          "my_normalizer": {
	            "type": "custom",
	            "char_filter": [],
	            "filter": ["lowercase", "asciifolding"]
	          }
	        }
	      }
	    },
	    "mappings": {
	      "properties": {
	        "foo": {
	          "type": "keyword",
	          "normalizer": "my_normalizer"
	        }
	      }
	    }
	  }

		- 测试数据

		  PUT index/_doc/1
		  {
		    "foo": "BÀR a"
		  }
		  
		  PUT index/_doc/2
		  {
		    "foo": "bar"
		  }
		  
		  PUT index/_doc/3
		  {
		    "foo": "baz"
		  }
		  
		  POST index/_refresh
		  
		  GET index/_search
		  {
		    "query": {
		      "term": {
		        "foo": "BAR"
		      }
		    }
		  }

- position_increment_gap

	- 用于 text 的 array 配置， 当为具有多个值的文本字段建立索引时，将在值之间添加“伪”间隙，间隙的大小使用配置position_increment_gap，默认为 100。
	- 示例

	  PUT my_index/_doc/1
	  {
	      "names": [ "John Abraham", "Lincoln Smith"]
	  }
	  # 检索不到
	  GET my_index/_search
	  {
	      "query": {
	          "match_phrase": {
	              "names": {
	                  "query": "Abraham Lincoln" 
	              }
	          }
	      }
	  }
	  # 可以检索到
	  GET my_index/_search
	  {
	      "query": {
	          "match_phrase": {
	              "names": {
	                  "query": "Abraham Lincoln",
	                  "slop": 101 
	              }
	          }
	      }
	  }

		- 修改参数

		  PUT my_index
		  {
		    "mappings": {
		      "properties": {
		        "names": {
		          "type": "text",
		          "position_increment_gap": 0 
		        }
		      }
		    }
		  }
		  
		  PUT my_index/_doc/1
		  {
		      "names": [ "John Abraham", "Lincoln Smith"]
		  }
		  # 可以检索到
		  GET my_index/_search
		  {
		      "query": {
		          "match_phrase": {
		              "names": "Abraham Lincoln" 
		          }
		      }
		  }

- 相关

	- ES如何确定 index 的analyzer

		- 1）读取字段的“analyzer”配置

		  PUT my_index
		  {
		    "mappings": {
		      "properties": {
		        "title": {
		          "type": "text",
		          "analyzer": "whitespace"
		        }
		      }
		    }
		  }
		  
		  指定字段 title 的 倒排索引的 analyzer 为 whitespace，
		  
		  检索该字段时，检索词的 analyzer 为 simple。

		- 2）上述步骤没有，再读取index的setting： analysis.analyzer.default

		  PUT my_index
		  {
		    "settings": {
		      "analysis": {
		        "analyzer": {
		          "default": {
		            "type": "simple"
		          }
		        }
		      }
		    }
		  }

		- 3）都没有，使用默认的 standard analyzer

	- ES 如何确定 search 的 analyzer

		- 1）search API 指定 analyzer

		  GET my_index/_search
		  {
		    "query": {
		      "match": {
		        "message": {
		          "query": "Quick foxes",
		          "analyzer": "stop"
		        }
		      }
		    }
		  }

		- 2）读取 index 的 mapping 字段配置 search_analyzer

		  PUT my_index
		  {
		    "mappings": {
		      "properties": {
		        "title": {
		          "type": "text",
		          "analyzer": "whitespace",
		          "search_analyzer": "simple"
		        }
		      }
		    }
		  }

		- 3）读取 index 的 setting 的 analysis.analyzer.default_search

		  PUT my_index
		  {
		    "settings": {
		      "analysis": {
		        "analyzer": {
		          "default": {
		            "type": "simple"
		          },
		          "default_search": {
		            "type": "whitespace"
		          }
		        }
		      }
		    }
		  }

		- 4）field 的 analyzer
		- 5）都没有，使用默认的 standard analyzer

### 与相关性算分相关的配置

- boost

	- 增强字段的权重

	  
	  提升仅适用于术语查询（不提升前缀，范围和模糊查询）。

	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "title": {
	          "type": "text",
	          "boost": 2 
	        },
	        "content": {
	          "type": "text"
	        }
	      }
	    }
	  }

- norms

	- 如果想要忽略字段长度对相关性算分的影响，可以关闭
	-  Norms 设置成 false，结果就是：
相关性评分公式BM25 里的 fieldLength 始终为 1
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "title": {
	          "type": "text",
	          "norms": false
	        }
	         
	        
	      }
	    }
	  }
	  
	  POST /my_index/_doc/1
	  {
	    "title":"this is",
	    "title1":"this is"
	  }
	  POST /my_index/_doc/2
	  {
	    "title":"is test",
	    "title1":"is test"
	  }
	  
	  GET /my_index/_search
	  {
	    "explain": true,
	    "query": {
	      "match": {
	        "title1": "is"
	      }
	    }
	  }

		- 结果

		   {
		                        "value" : 1.0,
		                        "description" : "dl, length of field",
		                        "details" : [ ]
		                      },

- similarity

	- 配置field的 评分算法

	  https://www.elastic.co/guide/en/elasticsearch/reference/7.7/index-modules-similarity.html
	  
	  自定义 similarity

	- 可选参数

		- BM25、boolean【一个简单的相似度算法】

### 与数据处理相关的配置

- dynamic

	- 控制是否可以动态添加新字段

	  可接受的选项如下：
	  
	  true 动态添加新的字段--缺省
	  
	  false 忽略新的字段,【不会被索引】不会添加字段映射，但是会存在于_source中
	  
	  strict 如果遇到新字段抛出异常
	  
	  配置参数 dynamic 可以用在根 object 或任何 object 类型的字段上。你可以将 dynamic 的默认值设置为 strict , 而只在指定的内部对象中开启它, 例如：
	  
	  PUT my_index
	  {
	    "mappings": {
	      "dynamic": "strict", 
	      "properties": {
	        "user": { 
	          "properties": {
	            "name": {
	              "type": "text"
	            },
	            "social_networks": { 
	              "dynamic": true,
	              "properties": {}
	            }
	          }
	        }
	      }
	    }
	  }
	  

	- 动态模板

		- 格式

		    "dynamic_templates": [
		      {
		  #模板名称可以是任何字符串值
		        "my_template_name": { 
		  # 匹配条件
		          ...  match conditions ... 
		  #	匹配字段应使用的映射。
		          "mapping": { ... } 
		        }
		      },
		      ...
		    ]
		  
		  匹配条件可以包括任何的：
		  match_mapping_type，
		  match，
		  match_pattern，
		  unmatch，
		  path_match，
		  path_unmatch

		- 示例

		  https://www.elastic.co/guide/en/elasticsearch/reference/7.6/query-dsl-match-query.html
		  
		  PUT my_index
		  {
		    "mappings": {
		      "dynamic_templates": [
		        {
		          "strings_as_keywords": {
		            "match_mapping_type": "string",
		            "mapping": {
		              "type": "keyword"
		            }
		          }
		        }
		      ]
		    }
		  }

- format

	- 为 date 类型的字段指定格式
	- 示例

	  ES的date类型允许我们规定格式，可以使用的格式有：
	  
	  yyyy-MM-dd HH:mm:ss
	  yyyy-MM-dd
	  epoch_millis（毫秒值）
	  
	  # 规定格式如下：
	  || 表示或者
	  
	  PUT my_index
	  {
	    "mappings": {
	      "_doc": {
	        "properties": {
	          "date": {
	            "type":   "date",
	            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
	          }
	        }
	      }
	    }
	  }
	  
	  
	  注意：一旦我们规定了格式，如果新增数据不符合这个格式，ES将会报错mapper_parsing_exception。

- copy_to

	- 将多个字段的值复制到组字段中，
然后可以将其作为单个字段进行查询
	- 示例

	  例如，可以将
	  first_name和last_name字段复制到该full_name字段，如下所示：
	  
	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "first_name": {
	          "type": "text",
	          "copy_to": "full_name" 
	        },
	        "last_name": {
	          "type": "text",
	          "copy_to": "full_name" 
	        },
	        "full_name": {
	          "type": "text"
	        }
	      }
	    }
	  }
	  
	  PUT my_index/_doc/1
	  {
	    "first_name": "John",
	    "last_name": "Smith"
	  }
	  
	  GET my_index/_search
	  {
	    "query": {
	      "match": {
	        "full_name": { 
	          "query": "John Smith",
	          "operator": "and"
	        }
	      }
	    }
	  }

	- 注意点

	  1、复制的 是字段值，而不是术语（由分析过程得出）。
	  
	  2、原始_source字段不会存储 copy_to 字段的值，如需存储，请开启 store。
	  
	  3、可以将相同的值复制到多个字段， "copy_to": [ "field_1", "field_2" ]
	  
	  3、您不能通过中介领域递归复制，如copy_to从 field_1到field_2和copy_to从field_2至field_3；期望的索引到field_1会落空的field_3，应该是使用copy_to 直接从原始字段到多个字段。
	  

- coerce

	- 默认开启，是否开启数据类型的⾃动转换（例如，字符串转数字）
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "number_one": {
	          "type": "integer"
	        },
	        "number_two": {
	          "type": "integer",
	          "coerce": false
	        }
	      }
	    }
	  }
	  
	  该number_one字段将包含整数10
	  PUT my_index/_doc/1
	  {
	    "number_one": "10" 
	  }
	  
	  由于禁用了强制，因此该文档将被拒绝。
	  PUT my_index/_doc/2
	  {
	    "number_two": "10" 
	  }

	- index.mapping.coerce

	  该 index.mapping.coerce 设置可以在 index 水平上对所有映射类型禁用强制全局设置：
	  
	  PUT my_index
	  {
	    "settings": {
	      "index.mapping.coerce": false
	    },
	    "mappings": {
	      "properties": {
	        "number_one": {
	          "type": "integer",
	          "coerce": true
	        },
	        "number_two": {
	          "type": "integer"
	        }
	      }
	    }
	  }
	  
	  该number_one字段将覆盖索引级别设置以启用强制。
	  PUT my_index/_doc/1
	  { "number_one": "10" } 
	  
	  	
	  该文档将被拒绝，因为该number_two字段继承了索引级强制设置。
	  PUT my_index/_doc/2
	  { "number_two": "10" } 

- null_value

	- null 值默认是不能被索引和检索的【字段设置为null时
（或null值数组），将其视为该字段没有值】
	- 该参数允许用指定的显式值替换 null 值，以对其进行检索
	- 该null_value 数据只影响如何索引，不会修改_source文档。
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "status_code": {
	          "type":       "keyword",
	          "null_value": "NULL" 
	        }
	      }
	    }
	  }
	  
	  PUT my_index/_doc/1
	  {
	    "status_code": null
	  }
	  
	  PUT my_index/_doc/2
	  {
	    "status_code": [] 
	  }
	  PUT my_index/_doc/3
	  {
	    "status_code": [null] 
	  }
	  
	  # 可以检索到文档1和3
	  GET my_index/_search
	  {
	    "query": {
	      "term": {
	        "status_code": "NULL" 
	      }
	    }
	  }

- ignore_above

	- 长于 ignore_above设置的 keyword 字段将不会被索引或存储
	- 对于 Arrays of Keywords，ignore_above将分别应用于每个数组元素
	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "message": {
	          "type": "keyword",
	          "ignore_above": 20 
	        }
	      }
	    }
	  }
	  
	  PUT my_index/_doc/1 
	  {
	    "message": "Syntax error"
	  }
	  
	  PUT my_index/_doc/2 
	  {
	    "message": "Syntax error with some long stacktrace"
	  }
	  
	  GET my_index/_search 
	  {
	    "aggs": {
	      "messages": {
	        "terms": {
	          "field": "message"
	        }
	      }
	    }
	  }
	  搜索返回两个文档，但术语聚合中仅存在第一个文档。

	- 关于 Lucene的 term 长度的默认限制

	  This option is also useful for protecting against Lucene’s term byte-length limit of 32766.
	  
	  如果您使用带有许多非ASCII字符的UTF-8文本，则您可能希望将限制设置为，32766 / 4 = 8191
	  因为UTF-8字符最多可以占用4个字节。

- ignore_malformed

	- 当尝试将一个错误的数据类型索引到字段中时，
默认情况会报 format_exception
	- 设置为 true，表示忽略 数据类型异常；
数据会被存储进去，但是不会被索引
	- 字段级示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "number_one": {
	          "type": "integer",
	          "ignore_malformed": true
	        },
	        "number_two": {
	          "type": "integer"
	        }
	      }
	    }
	  }
	  # 该文档将为该text字段建立索引，但不对该number_one字段进行索引。
	  PUT my_index/_doc/1
	  {
	    "text":       "Some text value",
	    "number_one": "foo" 
	  }
	  
	  #该文档将被拒绝，因为number_two不允许格式错误的值
	  PUT my_index/_doc/2
	  {
	    "text":       "Some text value",
	    "number_two": "foo" 
	  }
	  
	  # 测试聚合，没有结果
	  GET /my_index/_search
	  {
	    "aggs": {
	      "NAME": {
	        "terms": {
	          "field": "number_one",
	          "size": 10
	        }
	      }
	    }
	  }

	- index级示例 index.mapping.ignore_malformed

	  PUT my_index
	  {
	    "settings": {
	      "index.mapping.ignore_malformed": true 
	    },
	    "mappings": {
	      "properties": {
	  # 该number_one字段继承索引级设置。
	        "number_one": { 
	          "type": "byte"
	        },
	  
	  #该number_two字段将覆盖索引级别设置以关闭 ignore_malformed。
	        "number_two": {
	          "type": "integer",
	          "ignore_malformed": false 
	        }
	      }
	    }
	  }

	- 注意点

	  不能使用ignore_malformed以下数据类型：
	  
	  Nested datatype
	  Object datatype
	  Range datatypes

### 与性能相关配置

- store

	- 默认false，不存储，数据默认存储在 _source。
	- 如果字段的store设为true，则在lucene中该字段的值被单独存储。
	- 设置为true后，通过 stored_fields 显示

	  #搜索，通过store 字段显示数据，同时高亮显示 conent的内容
	  POST books/_search
	  {
	    "stored_fields": ["title","author","public_date"],
	    "query": {
	      "match": {
	        "content": "searching"
	      }
	    }
	  }

- _source

	- 默认将文档内容压缩后，以json格式存储在 _source 字段中

	  选择将Source 关闭
	  PUT books
	  {
	        "mappings" : {
	        "_source": {"enabled": false},
	        "properties" : {
	          "author" : {"type" : "keyword",
	  
	  "store": true}
	       
	          }
	        }
	      }

	- 在lucene中_source只是一个字段
	- 官方，不建议关闭。因为关闭后会有多种限制

	  https://www.elastic.co/guide/en/elasticsearch/reference/7.7/mapping-source-field.html

- enabled

	- 设置成 false，仅做存储，不⽀持搜索和聚合分析 （数据保存在 _source 中）
	- 该enabled设置仅可应用于顶级映射定义和object字段【仍然可以从_source字段中检索JSON】
	- 顶级映射示例

	  PUT my_index
	  {
	    "mappings": {
	      "enabled": false 
	    }
	  }
	  
	  PUT my_index/_doc/session_1
	  {
	   
	    "session_data": {
	      "arbitrary_object": {
	        "some_array": [ "foo", "bar", { "baz": 2 } ]
	      }
	    },
	    "last_updated": "2015-12-06T18:20:22"
	  }
	  
	  # 可以查询到文档
	  GET my_index/_doc/session_1 
	  
	  # 检查映射配置，没有新增映射
	  GET my_index/_mapping 

	- object字段示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "user_id": {
	          "type":  "keyword"
	        },
	        "last_updated": {
	          "type": "date"
	        },
	        "session_data": { 
	          "type": "object",
	          "enabled": false
	        }
	      }
	    }
	  }
	  
	  # 任何任意数据都可以传递到该session_data字段，因为它将被完全忽略。 
	  PUT my_index/_doc/session_1
	  {
	    "user_id": "kimchy",
	    "session_data": { 
	      "arbitrary_object": {
	        "some_array": [ "foo", "bar", { "baz": 2 } ]
	      }
	    },
	    "last_updated": "2015-12-06T18:20:22"
	  }
	  
	  PUT my_index/_doc/session_2
	  {
	    "user_id": "jpountz",
	    "session_data": "none", 
	    "last_updated": "2015-12-06T18:22:13"
	  }

- doc_values

	- 深入理解

	  Doc Values 是在索引时与 倒排索引 同时生成。也就是说 Doc Values 和 倒排索引 一样，基于 Segement 生成并且是不可变的。同时 Doc Values 和 倒排索引 一样序列化到磁盘，这样对性能和扩展性有很大帮助。
	  
	  Doc Values 通过序列化把数据结构持久化到磁盘，我们可以充分利用操作系统的内存，而不是 JVM 的 Heap 。 当 working set 远小于系统的可用内存，系统会自动将 Doc Values 驻留在内存中，使得其读写十分快速；不过，当其远大于可用内存时，系统会根据需要从磁盘读取 Doc Values，然后选择性放到分页缓存中。很显然，这样性能会比在内存中差很多，但是它的大小就不再局限于服务器的内存了。

	- 列式存储 的压缩

		- 压缩模式:

		  Doc Values 在压缩过程中使用如下技巧。它会按依次检测以下压缩模式:
		  
		  1、如果所有的数值各不相同（或缺失），设置一个标记并记录这些值
		  
		  2、如果这些值小于 256，将使用一个简单的编码表
		  
		  3、如果这些值大于 256，检测是否存在一个最大公约数
		  
		  4、如果没有存在最大公约数，从最小的数值开始，统一计算偏移量进行编码

		- 适用于聚合、排序、脚本等操作。

	- Doc Values 默认对所有字段启用，除了 text and annotated_text fields.
	- 禁用 Doc Values

	  如果你知道你永远也不会对某些字段进行聚合、排序或是使用脚本操作？ 尽管这并不常见，但是你可以通过禁用特定字段的 Doc Values 。这样可以节省磁盘空间
	  
	  
	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "test_field": {
	          "type": "keyword",
	          "doc_values": false
	        }
	      }
	    }
	  }
	  PUT /my_index/_doc/1
	  {
	    "test_field":"关注我"
	  }
	  # 可以检索到
	  GET /my_index/_search
	  {
	    "query": {
	      "term": {
	        "test_field": {
	          "value": "关注我"
	        }
	      }
	    }
	  }
	  # 直接报错 illegal_argument_exception
	  GET /my_index/_search
	  {
	   "aggs": {
	     "test_agg": {
	       "terms": {
	         "field": "test_field",
	         "size": 10
	       }
	     }
	   }
	  }
	  

		- 节省磁盘空间
		- 不能被用于聚合、排序以及脚本操作
		- 但仍然可以查询

- index

	-  设置为 false

		- 不构建倒排索引，不能被查询

		  PUT my_index
		  {
		    "mappings": {
		      "my_type": {
		        "properties": {
		          "customer_token": {
		            "type":       "keyword",
		            "index": false
		          }
		        }
		      }
		    }
		  }
		  得到一个只能被用于聚合/排序/脚本的字段。

		- 但还是⽀持 aggregation，排序，脚本，并出现在 _source 
		- 倒排词典的索引需要常驻内存，可以节约内存

	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "test_field": {
	          "type": "keyword",
	           "index": false
	        }
	      }
	    }
	  }
	  PUT /my_index/_doc/1
	  {
	    "test_field":"关注我"
	  }
	  # 直接报错
	  GET /my_index/_search
	  {
	    "query": {
	      "term": {
	        "test_field": {
	          "value": "关注我"
	        }
	      }
	    }
	  }
	  # 可以聚合
	  GET /my_index/_search
	  {
	   "aggs": {
	     "test_agg": {
	       "terms": {
	         "field": "test_field",
	         "size": 10
	       }
	     }
	   }
	  }
	  

- fielddata

  https://www.elastic.co/guide/en/elasticsearch/reference/7.7/fielddata.html

	- 对于text 字段，该参数默认是禁止的。所以直接对 text 字段进行聚合、排序或在脚本中使用时，es会报错
	- fielddate示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "test_field": {
	          "type": "text",
	          "fielddata": true
	        },
	        "test_field2":{
	          "type": "text"
	        }
	      }
	    }
	  }
	  PUT /my_index/_doc/1
	  {
	    "test_field":"点个在看",
	    "test_field2":"可好"
	  }
	  
	  # 可以聚合
	  GET /my_index/_search
	  {
	    "size": 0, 
	   "aggs": {
	     "test_agg": {
	       "terms": {
	         "field": "test_field",
	         "size": 10
	       }
	     }
	   }
	  }
	  # 聚合报错
	  GET /my_index/_search
	  {
	    "size": 0, 
	   "aggs": {
	     "test_agg": {
	       "terms": {
	         "field": "test_field2",
	         "size": 10
	       }
	     }
	   }
	  }

		- 一旦将 fielddata 加载到堆中，它在该 segment 的生命周期内将一直保留在堆中。
		- 所以该字段会占用大量的堆内存，影响性能

	- 综上，个人建议，如有以上需求，建议通过
fields配置多字段： 新增 keyword类型

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "my_field": { 
	          "type": "text",
	          "fields": {
	            "keyword": { 
	              "type": "keyword",
	              "index":false
	            }
	          }
	        }
	      }
	    }
	  }
	  PUT /my_index/_doc/1
	  {
	    "my_field":"点个在看,可好"
	  }
	  
	  # 可以聚合
	  GET /my_index/_search
	  {
	    "size": 0, 
	   "aggs": {
	     "test_agg": {
	       "terms": {
	         "field": "my_field.keyword",
	         "size": 10
	       }
	     }
	   }
	  }

		- 对于非 text 类型字段的聚合，使用的是 doc_value，性能会好很多
		- doc_value 原理解释

		  Doc Values 是在索引时与 倒排索引 同时生成。也就是说 Doc Values 和 倒排索引 一样，基于 Segement 生成并且是不可变的。同时 Doc Values 和 倒排索引 一样序列化到磁盘，这样对性能和扩展性有很大帮助。
		  
		  Doc Values 通过序列化把数据结构持久化到磁盘，我们可以充分利用操作系统的内存，而不是 JVM 的 Heap 。 当 working set 远小于系统的可用内存，系统会自动将 Doc Values 驻留在内存中，使得其读写十分快速；不过，当其远大于可用内存时，系统会根据需要从磁盘读取 Doc Values，然后选择性放到分页缓存中。很显然，这样性能会比在内存中差很多，但是它的大小就不再局限于服务器的内存了。

- eager_global_ordinals

	- 什么 global_ordinals

	  为了支持需要在每个文档中查找字段值的聚合和其他操作，Elasticsearch使用一种称为doc values的数据结构 。基于术语的字段类型（例如，keyword使用ordinal mapping  存储其doc值）以获得更紧凑的表示形式。这种映射的工作方式是 根据其词典顺序为每个术语分配一个增量整数或序数。字段的doc值仅存储每个文档的序号，而不存储原始术语，并具有单独的查找结构，可在序号和术语之间进行转换。
	  
	  在聚合过程中使用时，ordinals 可以大大提高性能。例如，terms聚合仅依靠序号将文档收集到分片级别的存储桶中，然后在合并各个分片的结果时将序号转换回其原始术语值。
	  
	  
	  全局顺序映射是堆上的数据结构。在测量内存使用情况时，Elasticsearch将来自全局序号的内存计为 fielddata。
	  
	  通常，就其加载时间和内存使用而言，全局序号不会带来很大的开销。但是，对于具有较大分片的索引，或者如果字段包含大量唯一项值，则加载全局序号可能会很昂贵。

	- 主要用于提高聚合性能【聚合对象的唯一值数量比较少】
	- 示例

	  PUT my_index/_mapping
	  {
	    "properties": {
	      "tags": {
	        "type": "keyword",
	        "eager_global_ordinals": true
	      }
	    }
	  }
	  当eager_global_ordinals被启用时，在刷新分片时构建全局序数—Elasticsearch总是在对索引内容进行更改之前加载它们。这将构建全局序数的成本从搜索转移到索引时间。当创建一个碎片的新副本时，Elasticsearch也会急切地构建全局序数，就像增加副本数量或将一个碎片重新定位到一个新节点时发生的情况一样。
	  
	  随时可以通过更新eager_global_ordinals设置来禁用预先加载：
	  
	  PUT my_index/_mapping
	  {
	    "properties": {
	      "tags": {
	        "type": "keyword",
	        "eager_global_ordinals": false
	      }
	    }
	  }
	  在冻结索引上，全局序号在每次搜索后被丢弃，并在需要时重新构建。
	  

- index_prefixes

	- 该参数启用术语前缀的索引，以加快前缀搜索
	- 可选参数

		- min_chars

			- 要索引的最小前缀长度。必须大于0，并且默认为2。该值包含在内。

		- max_chars

			- 要索引的最大前缀长度。必须小于20，默认为5。该值包含在内。

	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "full_name": {
	          "type": "text",
	          "index_prefixes": {
	            "min_chars" : 1,
	            "max_chars" : 10
	          }
	        }
	      }
	    }
	  }

### 其他

- index_options

	- 该参数控制将哪些信息添加到倒排索引中以进行搜索和突出显示。
	- 该参数仅适用于text字段
	- 参数值可选项

	  它接受以下值：
	  
	  docs：
	  只记录 doc id
	  
	  freqs：
	  记录 doc id 和 term frequencies
	  
	  positions（默认）：
	  记录 doc id、term frequencies 和 term position
	  
	  offsets：
	  记录 doc id、term frequencies、term position 和 character offects
	  
	  另外，text 类型默认配置为 positions，其他类型默认为 docs，记录内容越多，占用存储空间越大。

	- 示例【感觉有点问题】

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "text": {
	          "type": "text",
	          "index": true,
	          "index_options": "offsets"
	        },
	         "text1": {
	          "type": "text",
	          "index": true,
	          "index_options": "positions"
	        },
	         "text2": {
	          "type": "text",
	           "index": true,
	          "index_options": "freqs"
	        },
	         "text3": {
	          "type": "text",
	          "index": true, 
	          "index_options": "docs"
	        }
	      }
	    }
	  }
	  PUT /my_index/_doc/1
	  {
	    "text": "this is",
	    "text1": "this is",
	    "text2": "this is",
	    "text3": "this is"
	  }
	  POST /my_index/_analyze
	  {
	    "text": ["brown fox"],
	    "field": "text2"
	  }
	  
	  GET /my_index/_search
	  {
	    "explain": true, 
	    "query": {
	      "match": {
	        "text2": "this"
	      }
	    }
	  }

	- 该参数有问题，完全没起作用！

- index_phrases

	- ？

	  如果启用，则将两个词的单词组合（带状疱疹）索引到单独的字段中。这样可以使精确的短语查询（无延迟）更有效地运行，但要以较大的索引为代价。请注意，这在不删除停用词的情况下效果最好，因为包含停用词的短语将不会使用子字段，并且会退回到标准短语查询中。接受true或false（默认）。

- meta

	- ？

	  附加到字段的元数据。该元数据对Elasticsearch不透明，仅对在相同索引上工作的多个应用程序共享有关字段（例如单位）的元信息有用
	  
	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "latency": {
	          "type": "long",
	          "meta": {
	            "unit": "ms"
	          }
	        }
	      }
	    }
	  }

- term_vector

	- 包含有关 analyzer 过程产生的术语的信息

	  包括：
	  
	  条款列表。
	  
	  每个术语的位置（或顺序）。
	  
	  起始和结束字符偏移量，将术语映射到其在原始字符串中的起点。
	  
	  有效负载（如果可用）—与每个术语位置关联的用户定义的二进制数据。

	- 该term_vector设置接受参数

	  no
	  没有术语向量被存储。（默认）
	  
	  
	  yes
	  仅存储该字段中的术语。
	  
	  
	  with_positions
	  条款和职位已存储。
	  
	  
	  with_offsets
	  存储术语和字符偏移量。
	  
	  
	  with_positions_offsets
	  存储术语，位置和字符偏移量。
	  
	  
	  with_positions_payloads
	  术语，位置和有效载荷已存储。
	  
	  
	  with_positions_offsets_payloads
	  存储术语，位置，偏移量和有效载荷。

	- 示例

	  PUT my_index
	  {
	    "mappings": {
	      "properties": {
	        "text": {
	          "type":        "text",
	          "term_vector": "with_positions_offsets"
	        }
	      }
	    }
	  }

### 总结

- 在实践中如何建立合适的mapping

	- 1、选择合适的数据类型

		- 1）字符串类型——需要分词 text，否则 keyword
		- 2）枚举类型——优先keyword
		- 3）数值类型——选择贴近大小的类型
		- 4）其他类型，date、object、ip、nested等

	- 2、数据是否需要处理

		- copy_to、null_value、format等
		- dynamic 建议设置为 strict
		- 甚至使用 ingest 进行数据预处理【这不属于mapping了】

	- 3、是否仅做储存【不做检索、排序、聚合等】

		- 是，设置 enable 为 false

	- 4、是否检索

		- 否，设置 index 为 false
		- 是

			- 选用合理的分词器

				- fields：考虑是否需要不同的分词方式
				- search_analyzer：检索与倒排索引的分词器是否相同

			- boost：字段权重不一样

	- 5、是否排序or聚合

		- 否，设置 doc_values 为 false
		- 是

			- 如果是text类型，使用 fields建立多字段的 keyword类型 
			- 数据量较大，但聚合对象唯一值较少，"eager_global_ordinals": true

	- 6、是否有大字段需要返回

		- 是，设置 store 为 true

- 示例 mapping 配置

  PUT /blogs_index/
  {
    "settings": {
      "index": {
        "number_of_shards": 1,
        "number_of_replicas": 1
      },
      "analysis": {
        "analyzer": {
          "pinyin_analyzer": {
            "tokenizer": "standard",
            "filter": [
              "my_pinyin"
            ]
          }
        },
        "filter": {
          "my_pinyin": {
            "type": "pinyin",
            "keep_first_letter": true,
            "keep_separate_first_letter": true,
            "keep_full_pinyin": true,
            "keep_original": true,
            "limit_first_letter_length": 16,
            "lowercase": true
          }
        }
      }
    },
    "mappings": {
      # 禁止新增字段
      "dynamic": "strict",
      "properties": {
        "id": {
          "type": "integer"
        },
        "author": {
          "type": "text",
          # 对作者使用拼音分词
          "analyzer": "pinyin_analyzer",
          "fields": {
            # 建立多字段，用于聚合
            "keyword": {
              "type": "keyword",
              "index":false
            }
          }
        },
        # 博客的分类，支持 term 查询
        "blog_sort": {
          "type": "keyword",
          # 需要聚合，且数据量较大，但唯一值较少
          "eager_global_ordinals": true,
          # 提升该字段的权重
          "boost": 3
        },
        "title": {
          "type": "text",
          "analyzer": "ik_max_word",
          # 检索的分词没必要细粒度，提升效率
          "search_analyzer": "ik_smart",
          # 对 标题 不需要聚合、排序
          "doc_values": false,
          # 提升该字段的权重
          "boost": 5
        },
        "content": {
          "type": "text",
          "analyzer": "ik_max_word",
          "search_analyzer": "ik_smart",
          # 博客内容为大字段，单独存储，用于查询返回
          "store": true,
          # 不需要聚合、排序
          "doc_values": false
        },
        "update_time":{
          "type": "date",
          # 规定格式，提高可读性
          "format": ["yyyy-MM-dd HH:mm:ss"],
          # 该字段仅用于显示，不用检索、聚合、排序【非object类型，不能使用 enabled 参数】
          "index":false,
          "doc_values": false
        },
        "create_time":{
          "type": "date",
          "format": ["yyyy-MM-dd HH:mm:ss"]
        }
      }
    }
  }

