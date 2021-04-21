# 00ElasticSearch 概览

详情参考官方文档中文版: https://es.xiaoleilu.com/010_Intro/50_Conclusion.html


https://www.elastic.co/guide/en/elasticsearch/reference/6.4/docs-get.html
1、简介
ES=elaticsearch简写， Elasticsearch是一个开源的高扩展的分布式全文检索引擎，它可以近乎实时的存储、检索数据；本身扩展性很好，可以扩展到上百台服务器，处理PB级别的数据。 
Elasticsearch也使用Java开发并使用Lucene作为其核心来实现所有索引和搜索的功能，但是它的目的是通过简单的RESTful API来隐藏Lucene的复杂性，从而让全文搜索变得简单。


2. ES特点和优势
1）分布式实时文件存储，可将每一个字段存入索引，使其可以被检索到。 
2）实时分析的分布式搜索引擎。 
分布式：索引分拆成多个分片，每个分片可有零个或多个副本。集群中的每个数据节点都可承载一个或多个分片，并且协调和处理各种操作； 
负载再平衡和路由在大多数情况下自动完成。 
3）可以扩展到上百台服务器，处理PB级别的结构化或非结构化数据。也可以运行在单台PC上（已测试） 
4）支持插件机制，分词插件、同步插件、Hadoop插件、可视化插件等。


存在磁盘上，搜索的时候 通过内存，主要还是通过缓存的原理，所以 你给缓存足够大的内存 ，搜索的时候 基本上都是通过内存 搜索的，所以快


## 一、基本概念

### 数据结构

（1）关系型数据库中的数据库（DataBase），等价于ES中的索引（Index） 
（2）一个数据库下面有N张表（Table），等价于1个索引Index下面有N多类型（Type）， 
（3）一个数据库表（Table）下的数据由多行（ROW）多列（column，属性）组成，等价于1个Type由多个文档（Document）和多Field组成。 
（4）在一个关系型数据库里面，schema定义了表、每个表的字段，还有表和字段之间的关系。 与之对应的，在ES中：Mapping定义索引下的Type的字段处理规则，即索引如何建立、索引类型、是否保存原始索引JSON文档、是否压缩原始JSON文档、是否需要分词处理、如何进行分词处理等。 
（5）在数据库中的增insert、删delete、改update、查search操作等价于ES中的增PUT/POST、删Delete、改_update、查GET.


- 索引（index）

   ES将数据存储于一个或多个索引中，索引是具有类似特性的文档的集合。类比传统的关系型数据库领域来说，索引相当于SQL中的一个数据库，或者一个数据存储方案(schema)。
  
  索引由其名称(必须为全小写字符)进行标识，并通过引用此名称完成文档的创建、搜索、更新及删除操作。
  
  一个ES集群中可以按需创建任意数目的索引。

	- = 数据库
	- 查询所有的index

	  GET /_cat/indices?v

- 类型(Type)

   类型是索引内部的逻辑分区(category/partition)，然而其意义完全取决于用户需求。因此，一个索引内部可定义一个或多个类型(type)。一般来说，类型就是为那些拥有相同的域的文档做的预定义。
  
  例如，在索引中，可以定义一个用于存储用户数据的类型，一个存储日志数据的类型，以及一个存储评论数据的类型。类比传统的关系型数据库领域来说，类型相当于“表”。

	- = 表
	- 版本注意

	  在Elasticsearch 6.0.0或更高版本中创建的索引只能包含一个映射类型。在5.x中创建的具有多种映射类型的索引将继续像在Elasticsearch 6.x中一样工作。类型将在Elasticsearch 7.0.0中的API中弃用，并在8.0.0中完全删除。
	  

- 文档(Document)

  文档是Lucene索引和搜索的原子单位，它是包含了一个或多个域的容器，基于JSON格式进行表示。文档由一个或多个域组成，每个域拥有一个名字及一个或多个值，有多个值的域通常称为“多值域”。每个文档可以存储不同的域集，但同一类型下的文档至应该有某种程度上的相似之处。
  
  相当于mysql表中的一行

	- = 行

- 域（Field）

  域最重要的属性是 type
  
  
  string 域映射的两个最重要属性是 index 和 analyzer 。
  
  
  index 属性控制怎样索引字符串。它可以是下面三个值：
  
  1）analyzed
  首先分析字符串，然后索引它。换句话说，以全文索引这个域。（对于 analyzed 字符串域，用 analyzer 属性指定在搜索和索引时使用的分析器。默认， Elasticsearch 使用 standard 分析器， 但你可以指定一个内置的分析器替代它，例如 whitespace 、 simple 和 english：）
  
  2）not_analyzed
    索引这个域，所以它能够被搜索，但索引的是精确值。不会对它进行分析。
  
  3）no
  不索引这个域。这个域不会被搜索到。

	- = 列
	- 属性设置

	  文档字段和属性的三个最重要的设置：
	  
	  1）type
	  字段的数据类型，例如 string 或 date
	  
	  2）index
	  字段是否应当被当成全文来搜索（ analyzed ），或被当成一个准确的值（ not_analyzed ），还是完全不可被搜索（ no ）
	  
	  3）analyzer
	  用 analyzer 属性指定在搜索和索引时使用的分析器。默认， Elasticsearch 使用 standard 分析器， 但你可以指定一个内置的分析器替代它，例如 whitespace 、 simple 和 english：

		- index

		  index 属性控制怎样索引字符串。它可以是下面三个值：
		  
		  1）analyzed
		  首先分析字符串，然后索引它。换句话说，以全文索引这个域。
		  
		  2）not_analyzed
		    索引这个域，所以它能够被搜索，但索引的是精确值。不会对它进行分析。
		  
		  3）no
		  不索引这个域。这个域不会被搜索到。
		  
		  string 域 index 属性默认是 analyzed 。如果我们想映射这个字段为一个精确值，我们需要设置它为 not_analyzed ：

- 与mysql对比的图片

### 数据类型

https://www.elastic.co/guide/en/elasticsearch/reference/6.5/mapping-types.html 

详情阅读官网


- String类型

	- keyword
	- text

- 数值数据类型

	- 整数型

		- long
		- integer
		- short
		- byte

	- 浮点型

		- double
		- float
		- half_float
		- scaled_float

- 时间类型

	- date

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

- 布尔类型

	- boolean

- 二进制类型

	- binary

- 区间类型

	- integer_range
	- long_range
	- float_range
	- double_range
	- date_range

- 复杂类型

	- 数组类型

		- Array

		  在Elasticsearch中，数组不需要专用的字段数据类型。默认情况下，任何字段都可以包含零个或多个值，但是，数组中的所有值都必须具有相同的数据类型。
		  
		  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/nested.html
		  
		  不允许彼此独立地索引查询对象数组。

			- 使用

			  PUT /mfctest2/_doc/3?pretty
			  {
			  
			    "tags":  ["elasticsearch","dddd"],
			  
			  }
			  
			  查询：
			  GET /mfctest2/_search?pretty
			  {
			  
			    "query": {
			      "bool": {
			        "must": [
			          {
			            "match": {
			              "tags.keyword": "elasticsearch"
			            }
			          },
			  
			         {
			            "match": {
			              "tags.keyword": "dddd"
			            }
			          }
			        ]
			      }
			    
			    }
			  
			  }

	- 对象类型

		- Object

		  用于单个JSON对象
		  
		  PUT my_index
		  {
		    "mappings": {
		      "_doc": { 
		        "properties": {
		          "region": {
		            "type": "keyword"
		          },
		          "manager": { 
		            "properties": {
		              "age":  { "type": "integer" },
		              "name": { 
		                "properties": {
		                  "first": { "type": "text" },
		                  "last":  { "type": "text" }
		                }
		              }
		            }
		          }
		        }
		      }
		    }
		  }
		  
		  
		  The mapping type is a type of object, and has a properties field.
		  
		  
		  The manager field is an inner object field.
		  
		  
		  The manager.name field is an inner object field within the manager field.

	- Nested类型

		- nested

		  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/nested.html
		  用于JSON对象数组
		  
		  需要建立对象数组的索引并保持数组中每个对象的独立性，则应使用nested数据类型而不是 object数据类型。在内部，嵌套对象索引阵列作为一个单独的隐藏文档中的每个对象，这意味着每个嵌套的对象可以被查询独立于其它的
		  
		  

- 特定类型

	- GEO 地理位置类型

		- Geo-point

		  纬度/经度积分
		  
		  PUT my_index
		  {
		    "mappings": {
		      "_doc": {
		        "properties": {
		          "location": {
		            "type": "geo_point"
		          }
		        }
		      }
		    }
		  }
		  
		  PUT my_index/_doc/1
		  {
		    "text": "Geo-point as an object",
		    "location": { 
		      "lat": 41.12,
		      "lon": -71.34
		    }
		  }
		  
		  PUT my_index/_doc/2
		  {
		    "text": "Geo-point as a string",
		    "location": "41.12,-71.34" 
		  }
		  
		  PUT my_index/_doc/3
		  {
		    "text": "Geo-point as a geohash",
		    "location": "drm3btev3e86" 
		  }
		  
		  PUT my_index/_doc/4
		  {
		    "text": "Geo-point as an array",
		    "location": [ -71.34, 41.12 ] 
		  }

		- Geo-shape

		  用于多边形等复杂形状

	- Ip类型

		- ip

	- 自动补全类型

		- completion

	- 令牌计数数据类型

		- token_count

	- percolate类型

		- mumur3

	- 父子索引

		- percolator

	- 别名类型

		- alias

### 节点(Node)

运行了单个实例的ES主机称为节点，它是集群的一个成员，可以存储数据、参与集群索引及搜索操作。类似于集群，节点靠其名称进行标识，默认为启动时自动生成的随机Marvel字符名称。用户可以按需要自定义任何希望使用的名称，但出于管理的目的，此名称应该尽可能有较好的识别性。节点通过为其配置的ES集群名称确定其所要加入的集群。

### 集群（cluster）

ES可以作为一个独立的单个搜索服务器。不过，为了处理大型数据集，实现容错和高可用性，ES可以运行在许多互相合作的服务器上。这些服务器的集合称为集群。

- 单节点、集群安装与部署
- 健康状态（red/yellow/green）

  Green-一切都很好（集群功能齐全）
  
  Yellow-所有数据均可用，但某些副本尚未分配（集群功能齐全）
  
  Red-由于某些原因，某些数据不可用（集群部分起作用）

### 分片(Shard)

  ES的“分片(shard)”机制可将一个索引内部的数据分布地存储于多个节点，它通过将一个索引切分为多个底层物理的Lucene索引完成索引数据的分割存储功能，这每一个物理的Lucene索引称为一个分片(shard)。

当有大量的文档时，由于内存的限制、磁盘处理能力不足、无法足够快的响应客户端的请求等，一个节点可能不够。这种情况下，数据可以分为较小的分片。每个分片放到不同的服务器上。 
当你查询的索引分布在多个分片上时，ES会把查询发送给每个相关的分片，并将结果组合在一起，而应用程序并不知道分片的存在。即：这个过程对用户来说是透明的。 


   Shard有两种类型：primary和replica，即主shard及副本shard。Primary shard用于文档存储，每个新的索引会自动创建5个Primary shard，当然此数量可在索引创建之前通过配置自行定义，不过，一旦创建完成，其Primary shard的数量将不可更改。Replica shard是Primary Shard的副本，用于冗余数据及提高搜索性能。每个Primary shard默认配置了一个Replica shard，但也可以配置多个，且其数量可动态更改。ES会根据需要自动增加或减少这些Replica shard的数量。

   ES集群可由多个节点组成，各Shard分布式地存储于这些节点上。

ES可自动在节点间按需要移动shard，例如增加节点或节点故障时。简而言之，分片实现了集群的分布式存储，而副本实现了其分布式处理及冗余功能。

### 副本(Replica)

为提高查询吞吐量或实现高可用性，可以使用分片副本。 
副本是一个分片的精确复制，每个分片可以有零个或多个副本。ES中可以有许多相同的分片，其中之一被选择更改索引操作，这种特殊的分片称为主分片。 


当主分片丢失时，如：该分片所在的数据不可用时，集群将副本提升为新的主分片。

### 映射(Mapping)

 ES中，所有的文档在存储之前都要首先进行分析。用户可根据需要定义如何将文本分割成token、哪些token应该被过滤掉，以及哪些文本需要进行额外处理等等。另外，ES还提供了额外功能，例如将域中的内容按需排序。事实上，ES也能自动根据其值确定域的类型。

映射(mapping)机制用于进行字段类型确认，将每个字段匹配为一种确定的数据类型(string, number, booleans, date等)。

数据在每个字段中的解释说明



- 动态映射

  https://www.elastic.co/guide/en/elasticsearch/reference/6.5/dynamic-templates.html
  
  

	- dynamic 配置

	  dynamic 配置来控制这种行为 ，可接受的选项如下：
	  
	  true 动态添加新的字段--缺省
	  
	  false 忽略新的字段,不会添加字段映射，但是会存在于_source中
	  
	  strict 如果遇到新字段抛出异常
	  
	  配置参数 dynamic 可以用在根 object 或任何 object 类型的字段上。你可以将 dynamic 的默认值设置为 strict , 而只在指定的内部对象中开启它, 例如：
	  
	  PUT /my_index
	  {
	      "mappings": {
	          "my_type": {
	              "dynamic":      "strict",
	              "properties": {
	                  "title":  { "type": "string"},
	                  "stash":  {
	                      "type":     "object",
	                      "dynamic":  true 
	                  }
	              }
	          }
	      }
	  }
	  

- 静态映射
- 映射参数

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/mapping-params.html

### 分析(Analysis)

分析(Analysis)	全文是如何处理的可以被搜索的

分析(analysis)机制用于进行全文文本(Full Text)的分词，以建立供搜索用的反向索引。

分析 包含下面的过程：

首先，将一块文本分成适合于倒排索引的独立的 词条 ，
之后，将这些词条统一化为标准格式以提高它们的“可搜索性”，或者 recall

分析器执行上面的工作。 分析器 实际上是将三个功能封装到了一个包里：

1）字符过滤器  character filter
首先，字符串按顺序通过每个 字符过滤器 。他们的任务是在分词前整理字符串。一个字符过滤器可以用来去掉HTML，或者将 & 转化成 and。
2）分词器 tokenizer 
其次，字符串被 分词器 分为单个的词条。一个 whitespace
的分词器遇到空格和标点的时候，可能会将文本拆分成词条。
3）令牌过滤器token filter
最后，词条按顺序通过每个 token 过滤器 。这个过程可能会改变词条（例如，lowercase token filter  小写化 Quick ）， stop token filter 删除词条（例如， 像 a， and， the 等无用词），或者synonym token filter 增加词条（例如，像 jump 和 leap 这种同义词）。

- 自定义分析器

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/_testing_analyzers.html
  
  1、定义名为“std_folded”
  的自定义分析器
  PUT my_index
  {
    "settings": {
      "analysis": {
        "analyzer": {
          "std_folded": { 
            "type": "custom",
            "tokenizer": "standard",
            "filter": [
              "lowercase",
              "asciifolding"
            ]
          }
        }
      }
    },
  2、该字段my_text使用std_folded分析器
    "mappings": {
      "_doc": {
        "properties": {
          "my_text": {
            "type": "text",
            "analyzer": "std_folded" 
          }
        }
      }
    }
  }
  3、要引用此分析器，analyzeAPI必须指定索引名称。
  4、直接使用分析器
  GET my_index/_analyze 
  {
    "analyzer": "std_folded", 
    "text":     "Is this déjà vu?"
  }
  5、通过字段使用
  GET my_index/_analyze 
  {
    "field": "my_text", 
    "text":  "Is this déjà vu?"
  }

- 测试分词

  POST _analyze
  {
    "analyzer": "whitespace",
    "text":     "The quick brown fox."
  }
  
  POST _analyze
  {
    "tokenizer": "standard",
    "filter":  [ "lowercase", "asciifolding" ],
    "text":      "Is this déja vu?"
  }

- 位置和字符偏移

  从analyzeAPI 的输出可以看出，分析器不仅将单词转换为术语，而且还记录 每个术语的顺序或相对位置（用于短语查询或单词接近性查询），以及每个单词的开始和结束字符偏移量原始文字中的字词（用于突出显示搜索摘要）。

### 倒排索引原理

### 分词（英文分词、拼音分词、中文分词）

- ik分词

  https://github.com/medcl/elasticsearch-analysis-ik
  
  ik_max_word: 会将文本做最细粒度的拆分，比如会将“中华人民共和国国歌”拆分为“中华人民共和国,中华人民,中华,华人,人民共和国,人民,人,民,共和国,共和,和,国国,国歌”，会穷尽各种可能的组合，适合 Term Query；
  
  ik_smart: 会做最粗粒度的拆分，比如会将“中华人民共和国国歌”拆分为“中华人民共和国,国歌”，适合 Phrase 查询。

	- DSL

	  GET /_analyze/?pretty
	  {
	    "analyzer": "ik_max_word", 
	    "text": "中华人民共和国国歌"
	  }
	  
	  
	  GET /_analyze/?pretty
	  {
	    "analyzer": "ik_smart", 
	    "text": "中华人民共和国国歌"
	  }

	- Analyzer

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/analysis-analyzers.html
	  
	  

	- Tokenizer

- pinyin 分词

  https://github.com/medcl/elasticsearch-analysis-pinyin
  
  注意各可变参数的含义

## 二、基础操作

### 索引和文档的CURD

- 文档 API

	- 新增

	  # 新增单条数据，并指定es的id 为 1
	  PUT /tehero_index/_doc/1?pretty
	  {
	    "name": "Te Hero"
	  }
	  
	  # 新增单条数据，使用ES自动生成id
	  POST /tehero_index/_doc?pretty
	  {
	    "name": "Te Hero2"
	  }
	  
	  # 使用 op_type 属性，强制执行某种操作
	  PUT tehero_index/_doc/1?op_type=create
	  {
	       "name": "Te Hero3"
	  }

	- 删除（delete/deletebyquery）

	  值得注意的是，删除整个索引比使用Delete By Query API删除所有文档要有效得多。
	  
	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/docs-delete.html
	  
	  1、删除单个 document
	  DELETE /twitter/_doc/1
	  
	  2、Delete By Query 
	  POST twitter/_delete_by_query
	  {
	   "query": { 
	   "match": {
	   "message": "some message"
	   }
	   }
	  }
	  
	  3、删除所有 document
	  POST twitter/_delete_by_query
	  {
	   "query": {
	   "match_all": {}
	   }
	  }
	  

	- 修改（update/updatebyquery）

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/docs-update.html
	  1、update 
	  PUT test/_doc/1
	  {
	   "counter" : 1,
	   "tags" : ["red"]
	  }
	  
	  2、update_by_query
	  POST tehero_index/_update_by_query
	  {
	   "script": {
	   "source": "ctx._source.name = params.name",
	   "lang": "painless",
	   "params":{
	   "name":"更新后的name"
	   }
	   },
	   "query": {
	   "term": {
	   "id": "10"
	   }
	   }
	  }
	  （版本冲突而不会导致_update_by_query 中止）
	  
	  

	- updateByQuery的用处

- indices API

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/indices-get-settings.html

	- updating index Analysis

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/indices-update-settings.html
	  
	  1、关闭索引
	  POST /twitter/_close
	  
	  2、更新配置
	  PUT /twitter/_settings
	  {
	    "analysis" : {
	      "analyzer":{
	        "content":{
	          "type":"custom",
	          "tokenizer":"whitespace"
	        }
	      }
	    }
	  }
	  
	  3、开启索引
	  POST /twitter/_open

	- Analyze

	  Performs the analysis process on a text and return the tokens breakdown of the text.
	  
	  GET _analyze
	  {
	    "analyzer" : "standard",
	    "text" : "this is a test"
	  }

	- create index

	  PUT /tehero_index
	  {
	    "settings": {
	      "index": {
	        "number_of_shards": 1,
	        "number_of_replicas": 1
	      }
	    },
	    "mappings": {
	      "_doc": {
	        "dynamic": false,
	        "properties": {
	          "id": {
	            "type": "integer"
	          },
	          "name": {
	            "type": "text",
	            "analyzer": "ik_max_word",
	            "search_analyzer": "ik_smart"
	          },
	          "createAt": {
	            "type": "date"
	          }
	        }
	      }
	    }
	  }

		- 常用设置

		  {
		        "settings" : {
		          "number_of_shards": "1",
		          "number_of_replicas": "1"
		      },
		  	"mappings": {
		  		"_doc": {
		  		  “dynamic": "strict" 在6.2.4上可以防止字段名错误而新增字段的情况， 它会抛出异常。
		  
		  
		  			"properties": { }
		  }

		- dynamic 配置

		  dynamic 配置来控制这种行为 ，可接受的选项如下：
		  
		  true 动态添加新的字段--缺省
		  
		  false 忽略新的字段,不会添加字段映射，但是会存在于_source中
		  
		  strict 如果遇到新字段抛出异常
		  
		  配置参数 dynamic 可以用在根 object 或任何 object 类型的字段上。你可以将 dynamic 的默认值设置为 strict , 而只在指定的内部对象中开启它, 例如：
		  
		  PUT /my_index
		  {
		      "mappings": {
		          "my_type": {
		              "dynamic":      "strict",
		              "properties": {
		                  "title":  { "type": "string"},
		                  "stash":  {
		                      "type":     "object",
		                      "dynamic":  true 
		                  }
		              }
		          }
		      }
		  }
		  

	- delete index

	  DELETE /indexName

	- split index

	  拆分索引API允许您将现有索引拆分为新索引

	-  PUT mapping

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/indices-put-mapping.html

		- 添加新字段到索引

		  PUT twitter 
		  {}
		  
		  新增映射：
		  PUT twitter/_mapping/_doc 
		  {
		    "properties": {
		      "email": {
		        "type": "keyword"
		      }
		    }
		  }

		- 更新字段映射

		  PUT my_index 
		  {
		    "mappings": {
		      "_doc": {
		        "properties": {
		          "name": {
		            "properties": {
		              "first": {
		                "type": "text"
		              }
		            }
		          },
		          "user_id": {
		            "type": "keyword"
		          }
		        }
		      }
		    }
		  }
		  
		  PUT my_index/_mapping/_doc
		  {
		    "properties": {
		      "name": {
		        "properties": {
		          "last": { （	
		  Add a last field under the name object field.）
		            "type": "text"
		          }
		        }
		      },
		      "user_id": {
		        "type": "keyword",
		        "ignore_above": 100 （	
		  Update the ignore_above setting from its default of 0.）
		      }
		    }
		  }

	- 查询

	  GET /tehero_index 
	   # 索引名，可以同时检索多个索引或所有索引
	  如：
	  GET /*    
	  GET /tehero_index,other_index
	  
	  GET /_cat/indices?v 
	   #查看所有 index

### 常用 search

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-request-sort.html

- search的响应分析

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/getting-started-search-API.html
  
  took – Elasticsearch执行搜索的时间（以毫秒为单位）
  
  timed_out –告诉我们搜索是否超时
  
  _shards –告诉我们搜索了多少个分片，以及成功/失败的搜索分片的数量
  
  hits - 搜索结果
  
  hits.total –符合我们搜索条件的文件总数
  
  hits.hits –搜索结果的实际数组（默认为前10个文档）
  
  hits.sort -结果的排序键（如果按得分排序则丢失）
  
  hits._score并且
  max_score-现在暂时忽略这些字段

- 指定关键词返回

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/getting-started-search.html
  
  GET /bank/_search
  {
    "query": { "match_all": {} },
    "_source": ["account_number", "balance"]
  }

- 索引级别比：indices_boost

  跨多个索引搜索时，允许为每个索引配置不同的提升级别。当来自一个索引的匹配比来自另一个索引的匹配更重要时，这非常方便（请考虑每个用户都有一个索引的社交图）。
  
  GET /_search
  {
      "indices_boost" : [
          { "alias1" : 1.4 },
          { "index*" : 1.3 }
      ]
  }

- 搜索建议：Suggesters 

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-suggesters-completion.html
  
  这是一个导航功能，可在用户键入内容时指导他们获得相关结果，从而提高搜索精度

- 计数：count

  GET /twitter/_doc/_count
  {
      "query" : {
          "term" : { "user" : "kimchy" }
      }
  }
  
  结果：
  {
      "count" : 1,
      "_shards" : {
          "total" : 5,
          "successful" : 5,
          "skipped" : 0,
          "failed" : 0
      }
  }
  

- 验证：validate

  GET twitter/_validate/query?q=user:foo
  
  
  结果：
  {"valid":true,"_shards":{"total":1,"successful":1,"failed":0}}

- 解释：explain

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-explain.html
  
  GET /twitter/_doc/0/_explain
  {
        "query" : {
          "match" : { "message" : "elasticsearch" }
        }
  }

-  Profile API

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-profile.html
  
  Profile API提供了有关搜索请求中各个组件的执行的详细时序信息。它使用户可以洞悉搜索请求是如何在低级执行的，从而使用户可以理解为什么某些请求很慢的原因，并采取措施来改进它们。

- 常用API

	- 分页：from、size

	  GET /_search
	  {
	      "from" : 0, "size" : 10,
	      "query" : {
	          "term" : { "user" : "kimchy" }
	      }
	  }

	- 排序：sort

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-request-sort.html
	  
	  Elasticsearch支持按数组或多值字段排序。该mode选项控制选择哪个数组值对它所属的文档进行排序。
	  
	  POST /_search
	  {
	     "query" : {
	        "term" : { "product" : "chocolate" }
	     },
	     "sort" : [
	        {"price" : {"order" : "asc", "mode" : "avg"}}
	     ]
	  }

	- 后过滤器：post_filter

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-request-post-filter.html
	  
	  从搜索中删除不满足条件的
	  GET /teamwork_user/_search
	  {
	    "query": {
	      "bool": {
	        "must": 
	          {
	               "match_phrase": {              "nickName.pinyin": "x"
	               }
	             }
	          } },
	    "post_filter": {
	     "terms": {
	            "userKey": [
	              "PYhMVZ4v",
	              "Dfl7VtJ3",
	              "IO8886HA",
	              "UMYGIvZu"
	            ]
	      }
	    }
	  }

		- 后过滤器

		  post_filter （只影响搜索结果，不影响聚合）
		  它是接收一个过滤器的顶层搜索请求元素。这个过滤器在查询 之后 执行（这正是该过滤器的名字的由来：它在查询之后 post 执行）。正因为它在查询之后执行，它对查询范围没有任何影响，所以对聚合也不会有任何影响。
		  
		  当你需要对搜索结果和聚合结果做不同的过滤时，你才应该使用 post_filter ，
		   有时用户会在普通搜索使用 post_filter 。不要这么做！ post_filter 的特性是在查询 之后 执行，任何过滤对性能带来的好处（比如缓存）都会完全失去。

	- 高亮显示：Highlighter

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-request-highlighting.html#search-request-highlighting
	  
	  GET /_search
	  {
	      "query" : {
	          "match": { "user": "kimchy" }
	      },
	      "highlight" : {
	          "pre_tags" : ["<tag1>"],
	          "post_tags" : ["</tag1>"],
	          "fields" : {
	              "comment" : {}
	          }
	      }
	  }

	- 评分过滤：min_score

	  排除文档中_score值小于min_score指定的最小值的文档：
	  GET /_search
	  {
	      "min_score": 0.5,
	      "query" : {
	          "term" : { "user" : "kimchy" }
	      }
	  }

### 查询DSL

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl.html

- 基础概念

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-filter-context.html

	- Query context

	  此文档与该查询子句的匹配程度如何？除了确定文档是否匹配之外，查询子句还计算一个_score表示文档相对于其他文档的匹配程度的表示。

	- Filter context

	  此文档是否与此查询子句匹配？答案很简单，是或否-不计算分数。过滤器上下文主要用于过滤结构化数据，
	  
	  常用过滤器将由Elasticsearch自动缓存，以提高性能。
	  
	  每当将查询子句传递到filter 参数（例如 bool查询中的
	  filter或must_not参数，constant_score查询中的filter参数 或filter聚合）时， 过滤器上下文即有效。

	- 关于缓存

	  其核心实际是采用一个 bitset 记录与过滤器匹配的文档。Elasticsearch 积极地把这些 bitset 缓存起来以备随后使用。一旦缓存成功，bitset 可以复用 任何 已使用过的相同过滤器，而无需再次计算整个过滤器。
	  
	  这些 bitsets 缓存是“智能”的：它们以增量方式更新。当我们索引新文档时，只需将那些新文档加入已有 bitset，而不是对整个缓存一遍又一遍的重复计算。和系统其他部分一样，过滤器是实时的，我们无需担心缓存过期问题。

		- 独立的过滤器缓存

		  属于一个查询组件的 bitsets 是独立于它所属搜索请求其他部分的。这就意味着，一旦被缓存，一个查询可以被用作多个搜索请求。bitsets 并不依赖于它所存在的查询上下文。这样使得缓存可以加速查询中经常使用的部分，从而降低较少、易变的部分所带来的消耗。

		- 自动缓存行为

		  为了解决问题，Elasticsearch 会基于使用频次自动缓存查询。如果一个非评分查询在最近的 256 次查询中被使用过（次数取决于查询类型），那么这个查询就会作为缓存的候选。但是，并不是所有的片段都能保证缓存 bitset 。只有那些文档数量超过 10,000 （或超过总文档数量的 3% )才会缓存 bitset 。因为小的片段可以很快的进行搜索和合并，这里缓存的意义不大。
		  
		  一旦缓存了，非评分计算的 bitset 会一直驻留在缓存中直到它被剔除。剔除规则是基于 LRU 的：一旦缓存满了，最近最少使用的过滤器会被剔除。

- Full text queries【分词】

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/full-text-queries.html
  
  
  高级全文查询通常用于在全文字段（如电子邮件正文）上运行全文查询。他们了解如何分析要查询的字段，并在执行之前将每个字段 analyzer
  （或search_analyzer）应用于查询字符串。
  
  
  全文查询将在执行前将查询字符串分词。

- Term-level queries【精确匹配】

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/term-level-queries.html
  
  
  在执行前不会将查询字符串分词。

- Compound queries 【组合检索】

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/compound-queries.html

- 其他查询

	- Joining queries

	  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/joining-queries.html

		- nested query
		- has_child and has_parent queries

	- Geo queries

	  针对地图点来说：
	  PUT /my_locations
	  {
	      "mappings": {
	          "_doc": {
	              "properties": {
	                  "pin": {
	                      "properties": {
	                          "location": {
	                              "type": "geo_point"
	                          }
	                      }
	                  }
	              }
	          }
	      }
	  }
	  
	  PUT /my_locations/_doc/1
	  {
	      "pin" : {
	          "location" : {
	              "lat" : 40.12,
	              "lon" : -71.34
	          }
	      }
	  }

		- Geo Bounding Box Query

		  针对类型为：geo_point
		  
		  GET /_search
		  {
		      "query": {
		          "bool" : {
		              "must" : {
		                  "match_all" : {}
		              },
		              "filter" : {
		                  "geo_bounding_box" : {
		                      "pin.location" : {
		                          "top_left" : {
		                              "lat" : 40.73,
		                              "lon" : -74.1
		                          },
		                          "bottom_right" : {
		                              "lat" : 40.01,
		                              "lon" : -71.12
		                          }
		                      }
		                  }
		              }
		          }
		      }
		  }

		- Geo Distance Query

		  GET /my_locations/_search
		  {
		      "query": {
		          "bool" : {
		              "must" : {
		                  "match_all" : {}
		              },
		              "filter" : {
		                  "geo_distance" : {
		                      "distance" : "200km",
		                      "pin.location" : {
		                          "lat" : 40,
		                          "lon" : -70
		                      }
		                  }
		              }
		          }
		      }
		  }

		- 4种存储形式

		  
		  Geo-point expressed as an object, with lat and lon keys.
		  
		  Geo-point expressed as a string with the format: "lat,lon".
		  
		  Geo-point expressed as a geohash.
		  
		  Geo-point expressed as an array with the format: [ lon, lat]
		  
		  PUT my_index/_doc/1
		  {
		    "text": "Geo-point as an object",
		    "location": { 
		      "lat": 41.12,
		      "lon": -71.34
		    }
		  }
		  
		  PUT my_index/_doc/2
		  {
		    "text": "Geo-point as a string",
		    "location": "41.12,-71.34" 
		  }
		  
		  PUT my_index/_doc/3
		  {
		    "text": "Geo-point as a geohash",
		    "location": "drm3btev3e86" 
		  }
		  
		  PUT my_index/_doc/4
		  {
		    "text": "Geo-point as an array",
		    "location": [ -71.34, 41.12 ] 
		  }

	- Specialized queries
	- Span queries

## 七、Logstash

### Logstash 的安装与部署

### Logstash 将本地文件导入 ES

### logstashinputjdbc 插件（5.X后无需安装）将 MySQL/Oracle 等
关系型数据库数据导入 ES，全量导入和增量导入实现。

### logstashinputmongo插件将 Mongo 数据导入 ES

### logstashinputkafaka 插件将 Kafak 数据导入 ES

### logstashoutput* 插件将 ES 数据导入不同的数据库和实时数据流中

## 六、Kibana

Kibana 的版本需要和 Elasticsearch 的版本一致。这是官方支持的配置。


运行一个 Elasticsearch 子版本号大于 Kibana 的版本基本不会有问题，

Kibana 强制要求安装的插件版本必须和 Kibana 版本一致。

参考官网：
https://www.elastic.co/guide/cn/kibana/current/setup.html

### Kibana 安装与部署

### ES 节点数据同步到 Kibana

### Kibana Dev Tools 开发工具熟练使用

### Kibana 图像化组合展示

### 将 Kibana 图像化展示效果图应用到自己的开发环境中

## 五、整合在SpringBoot

### 1、与 mysql 的数据同步

Mysql数据同步Elasticsearch方案总结


https://my.oschina.net/u/4000872/blog/2252620

-  logstash-input-jdbc

  logstash官方插件,集成在logstash中,下载logstash即可,通过配置文件实现mysql与
  elasticsearch数据同步
  
  优点：
  1、能实现mysql数据全量和增量的数据同步,且能实现定时同步.
  2、版本更新迭代快,相对稳定.
  3、作为ES固有插件logstash一部分,易用
  
  缺点：
  1、不能实现同步删除操作,MySQL数据删除后Elasticsearch中数据仍存在.
  2、同步最短时间差为一分钟,一分钟数据同步一次,无法做到实时同步.

- go-mysql-elasticsearch

  go-mysql-elasticsearch 是国内作者开发的一款插件
  
  优点
  
  能实现mysql数据增加,删除,修改操作的实时数据同步
  
  缺点
  无法实现数据全量同步Elasticsearch，仍处理开发、相对不稳定阶段

- elasticsearch-jdbc

  目前最新的版本是2.3.4，支持的ElasticSearch的版本为2.3.4, 未实践
  
  优点
  能实现mysql数据全量和增量的数据同步.
  
  缺点
  目前最新的版本是2.3.4，支持的
  ElasticSearch的版本为2.3.4；
  不能实现同步删除操作,MySQL数据删除后Elasticsearch中数据仍存在.

- canal

  1、ElasticSearch 配置：
   1）安装 ik 插件（需重启才能生效）ik 地址：https://github.com/medcl/elasticsearch-analysis-ik （注意版本与ES版本一致）
   2）创建ES 的 index，参考附件。
   3）同步mysql数据到ES，参考附件。
  
  
  
  一、新增表格的步骤：
  
  1、修改canal_deployer配置：（该服务更新后不需要重启）
   1）vi conf/example/instance.properties
   2）添加白名单：在 canal.instance.filter.regex 后面新增： teamwork.project,teamwork.task,teamwork.tags,teamwork.attachment,teamwork.comment,teamwork.reply_comment
   3）删除 instance.properties 同级下的其他文件：h2.mv.db 、meta.dat
  
  
  2、修改canal_adapter 配置：
   1）在canal.adapter/conf/es 下添加如下几个 .yml 文件;
   2) 重启服务器
  
  
  二、完整配置的流程：
  1、使用canal-admin，新建 instance实例，在里面配置 mysql的地址和账户密码，设置白名单canal.instance.filter.regex=；
   参考：https://www.yuque.com/docs/share/f2e674cd-d213-4e7a-b591-b98cf6ee932d#lM0ey 配置instance部分。
  
  2、在canal-adapter，修改适配器总配置：conf/application.yml，配置 （srcDataSources）数据库 + （instance）ES
   2）在 conf/es 下配置instance 的 yml文件： 配置 ES映射与mysql数据的对应关系 ，参考 yml文件。
   注意yml文件里各种配置的对应关系。
   dataSourceKey: teamworkUser #srcDataSources的名称
   destination: teamwork_prod # cannal的instance
   outerAdapterKey: teamwork #对应application.yml中es配置的key
   groupId: teamwork #对应application.yml中es配置的分组id
  

	- 相关网页

	  canal安装：
	  https://www.yuque.com/docs/share/f2e674cd-d213-4e7a-b591-b98cf6ee932d#lM0ey
	  canal官网：
	  https://github.com/alibaba/canal/wiki/QuickStart
	  

### 2、SpringBoot实战

- Java API

	- Elasticsearch 原生自带 API、JEST、Springboot 等 API 选型
	- Elasticsearch 多条件 bool 复杂检索 API
	- Elasticsearch 分页 API
	- Elasticsearch 高亮 API
	- Elasticsearch 聚合 API
	- Elasticsearch 相关 JSON 数据解析

## 四、场景开发实战

### 数据可视化（Kibana、Grafana 等 其中 Grafana 比较适合监控类场景）

### 通过 logstash/beats 等导入数据

### Elasticsearch 和 Kafka 结合的应用场景

### Elasticsearch 和 Mongo 结合的应用场景

### Elasticsearch 和 Hadoop 结合的应用场景

### 结合业务需求的定制化应用场景（日志分析、文档检索、全文检索、金融等各行业检索）

## 三、高级操作

### 聚合统计

https://www.elastic.co/guide/cn/elasticsearch/guide/current/_buckets_inside_buckets.html

（数量聚合、最大值、最小值、平均值、求和等聚合操作）

-  Bucket Aggregations
- Metrics Aggregations
- Pipeline Aggregations

### nested 嵌套类型

如果需要建立对象数组的索引并保持数组中每个对象的独立性，则应使用nested数据类型而不是 object数据类型。在内部，嵌套对象索引阵列作为一个单独的隐藏文档中的每个对象，这意味着每个嵌套的对象可以被查询独立于其它的

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/nested.html


- 1）映射

  PUT my_index
  {
    "mappings": {
      "_doc": {
        "properties": {
          "user": {
            "type": "nested" 
          }
        }
      }
    }
  }
  
  PUT my_index/_doc/1
  {
    "group" : "fans",
    "user" : [
      {
        "first" : "John",
        "last" :  "Smith"
      },
      {
        "first" : "Alice",
        "last" :  "White"
      }
    ]
  }

	- 实例2

	  PUT /issues
	  {
	      "mappings": {
	          "issue" : {
	              "properties" : {
	                  "tags" : { "type" : "keyword" },
	                  "comments" : { 
	                      "type" : "nested",
	                      "properties" : {
	                          "username" : { "type" : "keyword" },
	                          "comment" : { "type" : "text" }
	                      }
	                  }
	              }
	          }
	      }
	  }

- 2）限制 nested 字段数

  
  由于嵌套文档被索引为单独的文档，因此只能在nested查询， nested/ reverse_nested聚合或嵌套内部hits范围内访问它们。
  
  
  为具有100个嵌套字段的文档建立索引实际上是为101个文档建立索引，因为每个嵌套文档都被索引为一个单独的文档。为了防止定义不正确的映射，每个索引可以定义的嵌套字段的数量限制为50。请参阅 “设置以防止映射爆炸”。
  

- 3）查询与高亮

  GET my_index/_search
  {
    "query": {
      "nested": {
        "path": "user",
        "query": {
          "bool": {
            "must": [
              { "match": { "user.first": "Alice" }},
              { "match": { "user.last":  "White" }} 
            ]
          }
        },
        "inner_hits": { 
          "highlight": {
            "fields": {
              "user.first": {}
            }
          }
        }
      }
    }
  }
  
  inner_hits 让我们突出显示匹配的嵌套文档。

- 4）sort

  GET /my_index/_search
  {
    "sort": [
      {
        "user.last": {
          "order": "desc",
          "nested_path": "user",
          "nested_filter": {
            "term": {
              "user.first.keyword": "Alice"
            }
          }
        }
      }
    ]
  }
  
  nested_path：排序的对象
  
  nested_filter：过滤条件（nested对象可能是arrays）

- 5) aggregation

  https://www.elastic.co/guide/en/elasticsearch/reference/6.4/search-aggregations-bucket-nested-aggregation.html

	- 指标类聚合 count、max等函数

	  GET /mfc_field_test/_search
	  {
	    "query": {
	      "bool": {
	        "filter": {
	          "term": {
	            "project_id": "1"
	          }
	        }
	      }
	    },
	    "size": 0, 
	    "aggs": {
	      "ThisIsAggsName": {
	        "aggs": {
	          "test":{
	          "max":{
	            "field":"type_number.field_value"
	          }
	          }
	        },
	        "nested": {
	          "path": "type_number"
	        }
	        
	      }
	    }
	  }

	- 桶聚合 group By

	  聚合：group By
	  GET /mfc_field_test/_search
	  {
	    "query": {
	      "bool": {
	        "filter": {
	          "term": {
	            "project_id": "1"
	          }
	        }
	      }
	    },
	    "size": 0, 
	    "aggs": {
	      "thisIsGroupBy": {
	        "nested": {
	          "path": "type_menu"
	        }, 
	        "aggs": {
	          "test":{
	            "terms": {
	              "field": "type_menu.field_value",
	              "size": 10
	            }
	          }
	        }
	      }
	    }
	  }

		- 存在问题：nested被单独计数了

	- 条形图 histogram

	  直方图 histogram 桶要求两个参数：一个数值字段以及一个定义桶大小间隔。
	  
	  
	  /mfc_field_test/_search
	  {
	  
	    "size": 0, 
	    "aggs": {
	      "thisIsGroupBy": {
	        "nested": {
	          "path": "type_number"
	        }, 
	        "aggs": {
	          "test":{
	            "histogram": {
	              "field": "type_number.field_value",
	              "interval": 500,
	              "extended_bounds": {
	                "min": 0,
	                "max": 1000
	              }
	            }
	          }
	        }
	      }
	    }
	  }

		- 存在问题：nested被单独计数了

	- date_histogram

	  聚合：按时间统计
	  GET /mfc_field_test/_search
	  {
	  	"size": 0,
	  	"aggs": {
	  		"thisIsGroupBy": {
	  			"filter": {
	  				"bool": {
	  					"must": [{
	  						"term": {
	  							"project_id": {
	  								"value": "1"
	  							}
	  						}
	  					}]
	  				}
	  			},
	  			"aggs": {
	  				"nested_NAME": {
	  					"nested": {
	  						"path": "type_date"
	  					},
	  					"aggs": {
	  						"test": {
	  							"filter": {
	  								"bool": {
	  									"must": [{
	  										"term": {
	  											"type_date.field_id": {
	  												"value": "305"
	  											}
	  										}
	  									}]
	  								}
	  							},
	  							"aggs": {
	  								"ThisIsdate_histogram": {
	  									"date_histogram": {
	  										"field": "type_date.field_value",
	  										"interval": "year",
	  										"format": "yyyy-MM-dd"
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

		- nested被单独计数了已解决，注意aggs下的filter

- 6）reverse_nested aggregation

	- 通过 nested 对象聚合 根文档

### ES 性能调优（配置调优、集群调优等）

- 1）ES索引性能

  https://yq.aliyun.com/articles/670118
  
  阿里云Elasticsearch性能优化实践

	- ES 配置

		- 调大refresh interval

		  写入和打开一个新段的轻量的过程叫做 refresh 。 默认情况下每个分片会每秒自动刷新一次。

		- 设计mapping配置合适的字段类型

			- 注意动态映射

		- 扩容集群节点个数、升级节点规格

	- 同步内容

		- 只放索引字段：增加可缓存的数据量
		- 通过多进程/线程发送数据

	- 设置合理的索引分片数和副本数

	  Elasticsearch6.X及之前的版本默认索引分片数为5、副本数为1，
	  
	  从Elasticsearch7.0开始调整为默认索引分片数为1、副本数为1。

		- 分片(Shard)

		    ES的“分片(shard)”机制可将一个索引内部的数据分布地存储于多个节点，它通过将一个索引切分为多个底层物理的Lucene索引完成索引数据的分割存储功能，这每一个物理的Lucene索引称为一个分片(shard)。
		  
		  当有大量的文档时，由于内存的限制、磁盘处理能力不足、无法足够快的响应客户端的请求等，一个节点可能不够。这种情况下，数据可以分为较小的分片。每个分片放到不同的服务器上。 
		  当你查询的索引分布在多个分片上时，ES会把查询发送给每个相关的分片，并将结果组合在一起，而应用程序并不知道分片的存在。即：这个过程对用户来说是透明的。 
		  
		  
		     Shard有两种类型：primary和replica，即主shard及副本shard。Primary shard用于文档存储，每个新的索引会自动创建5个Primary shard，当然此数量可在索引创建之前通过配置自行定义，不过，一旦创建完成，其Primary shard的数量将不可更改。Replica shard是Primary Shard的副本，用于冗余数据及提高搜索性能。每个Primary shard默认配置了一个Replica shard，但也可以配置多个，且其数量可动态更改。ES会根据需要自动增加或减少这些Replica shard的数量。
		  
		     ES集群可由多个节点组成，各Shard分布式地存储于这些节点上。
		  
		  ES可自动在节点间按需要移动shard，例如增加节点或节点故障时。简而言之，分片实现了集群的分布式存储，而副本实现了其分布式处理及冗余功能。

			-  索引分片数建议设置为集群节点的整数倍

			  单节点索引分片数建议不要超过3个，每个索引分片推荐10-40GB大小

		- 副本(Replica)

		  为提高查询吞吐量或实现高可用性，可以使用分片副本。 
		  副本是一个分片的精确复制，每个分片可以有零个或多个副本。ES中可以有许多相同的分片，其中之一被选择更改索引操作，这种特殊的分片称为主分片。 
		  
		  
		  当主分片丢失时，如：该分片所在的数据不可用时，集群将副本提升为新的主分片。

			- 副本数建议设置为1

	- 查询性能调优

		- 缓存机制相关：尽量使用 filter-Context

			- 查看缓存占用内存情况

			  name表示节点名, query_cache表示过滤器缓存，request_cache表示分片缓存，fielddata表示字段数据缓存，segments表示索引段
			  
			  
			  url -XGET "http://localhost:9200/_cat/nodes?h=name,query_cache.memory_size,request_cache.memory_size,fielddata.memory_size,segments.memory&v" 

		- 使用批量请求

		    使用批量请求将产生比单文档索引请求好得多的性能。

		- 使用路由routing

		  语句：GET /teamwork_comment/_search?routing=user1
		  {
		     }
		   
		   Elasticsearch写入文档时，文档会通过一个公式路由到一个索引中的一个分片上。
		  
		  
		  1、写入时指定路由（指定存储的位置-”分片“）；
		  
		  2、 查询时不指定路由，需要查询所有分片；
		  
		  3、
		  
		  

			- 这块需要结合数据结构+搜索需求

		- 设置查询读取记录条数和字段
		- 避免前缀模糊匹配

### ES 插件错误排查（集群问题、检索问题、性能问题）

