# 03 Compound queries

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/compound-queries.html

## 上下文

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-filter-context.html

### Query context

此文档与该查询子句的匹配程度如何？除了确定文档是否匹配之外，查询子句还计算一个_score表示文档相对于其他文档的匹配程度的表示。

### Filter context

此文档是否与此查询子句匹配？答案很简单，是或否-不计算分数。过滤器上下文主要用于过滤结构化数据，

常用过滤器将由Elasticsearch自动缓存，以提高性能。

每当将查询子句传递到filter 参数（例如 bool查询中的
filter或must_not参数，constant_score查询中的filter参数 或filter聚合）时， 过滤器上下文即有效。

### 关于缓存

其核心实际是采用一个 bitset 记录与过滤器匹配的文档。Elasticsearch 积极地把这些 bitset 缓存起来以备随后使用。一旦缓存成功，bitset 可以复用 任何 已使用过的相同过滤器，而无需再次计算整个过滤器。

这些 bitsets 缓存是“智能”的：它们以增量方式更新。当我们索引新文档时，只需将那些新文档加入已有 bitset，而不是对整个缓存一遍又一遍的重复计算。和系统其他部分一样，过滤器是实时的，我们无需担心缓存过期问题。

- 独立的过滤器缓存

  属于一个查询组件的 bitsets 是独立于它所属搜索请求其他部分的。这就意味着，一旦被缓存，一个查询可以被用作多个搜索请求。bitsets 并不依赖于它所存在的查询上下文。这样使得缓存可以加速查询中经常使用的部分，从而降低较少、易变的部分所带来的消耗。

- 自动缓存行为

  为了解决问题，Elasticsearch 会基于使用频次自动缓存查询。如果一个非评分查询在最近的 256 次查询中被使用过（次数取决于查询类型），那么这个查询就会作为缓存的候选。但是，并不是所有的片段都能保证缓存 bitset 。只有那些文档数量超过 10,000 （或超过总文档数量的 3% )才会缓存 bitset 。因为小的片段可以很快的进行搜索和合并，这里缓存的意义不大。
  
  一旦缓存了，非评分计算的 bitset 会一直驻留在缓存中直到它被剔除。剔除规则是基于 LRU 的：一旦缓存满了，最近最少使用的过滤器会被剔除。

## constant_score query

Filter子句在filter上下文中执行，这意味着计分被忽略，并且子句被考虑用于缓存。

GET /_search
{
    "query": {
        "constant_score" : {
            "filter" : {
                "term" : { "user" : "kimchy"}
            },
            "boost" : 1.2
        }
    }
}

### 一个查询，它包装另一个查询，但是在过滤器上下文中执行它。
所有匹配的文档都被赋予相同的“常量” _score。

### DSL 示例

GET /_search
{
  "query": {
    "bool": {
      "should": [
        { "constant_score": {
          "query": { "match": { "features": "wifi" }}
        }},
        { "constant_score": {
          "query": { "match": { "features": "garden" }}
        }},
        { "constant_score": {
          "boost":   2
          "query": { "match": { "features": "pool" }}
        }}
      ]
    }
  }
}
最终的评分并不是所有匹配语句的简单求和， 协调因子（coordination factor） 和 查询归一化因子（query normalization factor） 仍然会被考虑在内。

### DSL 2

GET /blogs_index/_search
{
  "query": {
    "bool": {
      "should": [
        { "constant_score": {
          "filter": { "match": { "title": "学习" }}
        }},
        { "constant_score": {
          "filter": { "match": { "tag": "1" }}
        }},
        { "constant_score": {
          "boost":   2,
          "filter": { "match": { "content": "es" }}
        }}
      ]
    }
  }
}

### 参数

- filter
- boost

  （可选，float）浮点数用作与查询匹配的每个文档 的恒定 相关性得分filter。默认为1.0。

## bool query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-bool-query.html



### 两个上下文

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-filter-context.html

- Query context

  此文档与该查询子句的匹配程度如何？除了确定文档是否匹配之外，查询子句还计算一个_score表示文档相对于其他文档的匹配程度的表示。

- Filter context

  此文档是否与此查询子句匹配？答案很简单，是或否-不计算分数。过滤器上下文主要用于过滤结构化数据，
  
  常用过滤器将由Elasticsearch自动缓存，以提高性能。
  
  每当将查询子句传递到filter 参数（例如 bool查询中的
  filter或must_not参数，constant_score查询中的filter参数 或filter聚合）时， 过滤器上下文即有效。

### filter

当进行精确值查找时， 我们会使用过滤器（filters）。过滤器很重要，因为它们执行速度非常快，不会计算相关度（直接跳过了整个评分阶段）而且很容易被缓存。

要记住：请尽可能多的使用过滤式查询。

GET /my_store/products/_search
{
    "query" : {
        "constant_score" : { 
            "filter" : {
                "term" : { 
                    "price" : 20
                }
            }
        }
    }
}

- 必须 匹配，在 filter context 中执行
- 忽略评分，es 会考虑是否缓存

### must

- 子句（查询）必须出现在匹配的文档中，并将有助于得分。

### must_not

- 子句（查询）不得出现在匹配的文档中。
- 子句在过滤器上下文中执行，这意味着计分被忽略，并且子句被考虑用于缓存。

### should

- 子句（查询）应出现在匹配的文档中

### filter 与 should 的注意点

如果 bool查询在Query context中并且 bool查询具有must或 filter子句，那么bool的 should查询即使没有匹配到，文档也将与查询匹配。在这种情况下，should的子句仅用于影响得分。

如果bool查询是Filter context  或  bool查询既没有must也没filter子句，则文档至少与一个should的查询相匹配。

可以通过设置minimum_should_match参数来明确控制此行为 。

- should 仅影响得分的情况

  GET /teamwork_tags/_search
  {
    	"query": {
  		"bool": {
  			"filter": {
  这个filter不管
  				"bool": {
  					"should": [{
  							"terms": {
  								"id": [
  									31028, 92, 93, 94, 197
  								]
  							}
  						},
  						{
  							"terms": {
  								"project_id": [
  									1601, 293
  								]
  							}
  						}
  					]
  				}
  			},
  			"must": [
  			  {
  			    "bool": {
  			      "should": [
  			        {
  			          "match": {
  			            "name": "蒲公英"
  			          }
  			        },
  			        {
  			          "match_phrase_prefix": {
  			           "name": "蒲公英"
  			          }
  			        }
  			      ],
   "minimum_should_match": 1, （这句话可以控制should的有效性）
  			      "must": [
  			        {
  			          "term": {
  			            "status": {
  			              "value": "1"
  			            }
  			          }
  			        }
  			      ]
  			    }
  			  }
  			]
  		  
  		}
  }}

- should 至少匹配一个的情况

  如果bool查询是
  Filter context  
  或  
  既没有must也没filter，
  
  则文档至少与一个should的查询相匹配。
  

### minimum_should_match 参数值说明

- 正整数 3

	- 无论可选子句的数量如何，必需匹配数 = 该值

- 负整数 -2

	- 必需匹配数 = 可选句子总数 - 该值

- 正百分比 75%

	- 必需匹配数 = 根据百分比计算得出的数字四舍五入的最小值

- 负百分比 -25%

	- 必需匹配数 = 总数 -  根据百分比计算得出的数字四舍五入的绝对值的最小值

- 组合 3<90%

  一个有条件的规范是一个正整数，后跟小于号，后跟任何前面提到的说明符。它表示如果可选子句的数量等于（或小于）整数，则全部都是必需的，但如果可选子句的数量大于整数，则适用规范。在此示例中：如果有1到3个子句，则全部都需要，但是对于4个或更多子句，则仅需要90％。

	- 可选子句的数量等于（或小于）整数，则全部都是必需的
	- 大于整数，则仅需要90％

- 多种组合

	- 2<-25%  9<-3

	  多个条件规范可以用空格分隔，每个条件规范仅对大于其前一个的数字有效。在此示例中：如果有1或2个子句，则都需要，如果有3-9个子句，则都需要25％，但是，如果有9个以上的子句，则需要3个。

- 注意：

  当处理百分比时，负值可用于在极端情况下获得不同的行为。在处理4个子句时，75％和-25％表示相同的内容，但是在处理5个子句时，75％表示需要3，而-25％表示需要4。
  
  
  
  无论计算达到多少，都将永远不会使用大于可选子句数量的值或小于1的值。（即：无论计算结果的结果有多低或多高，所需匹配项的最小数量都不会低于1或大于子句的数量。

### 练习题

影响力 influence在范围12~20；文章标签tag包含3或者4，同时不能包含1；发布时间createAt一周内；标题title或内容content 包含“es”、“编程”、“必看”【3选2】且需要相关性评分。

- 答案

  GET /blogs_index/_search
  {
    "query": {
      "bool": {
        "filter": {
          "bool": {
            "must": [
              {
                "range": {
                  "influence": {
                    "gte": 12,
                    "lte": 20,
                    "relation": "WITHIN"
                  }
                }
              },
              {
                "range": {
                  "createAt": {
                    "gte": "now-1w/d"
                  }
                }
              },
              {
                "terms": {
                  "tag": [
                    3,
                    4
                  ]
                }
              }
            ],
            "must_not": [
              {
                "term": {
                  "tag": 1
                }
              }
            ]
          }
        },
        "should": [
          {
            "multi_match": {
              "query": "es",
              "fields": [
                "title",
                "content"
              ]
            }
          },
          {
            "multi_match": {
              "query": "编程",
              "fields": [
                "title",
                "content"
              ]
            }
          },
          {
            "multi_match": {
              "query": "必看",
              "fields": [
                "title",
                "content"
              ]
            }
          }
        ],
        "minimum_should_match": 2
      }
    }
  }

### 注意事项

5）Bool query 注意事项：
1、Bool query 只支持以上4种查询的子句；
2、以上4种查询的子句，只支持 Full text queries 和 Term-level queries 和 Bool query ；
3、简单而言就是：bool -》filter/must等-》bool -》filter/must等-》 queries 或者 bool -》filter/must等-》 queries ；
4、只有must 和 should 子句会计算相关性评分；filter 和 must_not 子句都是在过滤器上下文中执行，计分被忽略，并且子句被考虑用于缓存。


## dis_max query

### dis_max查询使用单个最佳匹配查询子句的分数。

### DSL示例

GET /_search
{
 "query": {
 "dis_max" : {
"tie_breaker" : 0.7,
 "boost" : 1.2,
 "queries" : [
 {
 "term" : { "age" : 34 }
 },
 {
 "term" : { "age" : 35 }
 }
 ]
 }
 }
}


## function_score 查询 

https://www.elastic.co/guide/en/elasticsearch/reference/6.8/query-dsl-function-score-query.html


允许为每个与主查询匹配的文档应用一个函数，以达到改变甚至完全替换原始查询评分 _score 的目的。

实际上，也能用过滤器对结果的 子集 应用不同的函数，这样一箭双雕：既能高效评分，又能利用过滤器缓存。

### 5种得分函数

- weight

  为每个文档应用一个简单而不被规范化的权重提升值：当 weight 为 2 时，最终结果为 2 * _score 。
  
  GET /_search
  {
      "query": {
          "function_score": {
            "query": { "match_all": {} },
            "boost": "5", 
            "functions": [
                {
                    "filter": { "match": { "test": "bar" } },
                    "random_score": {}, 
                    "weight": 23
                },
                {
                    "filter": { "match": { "test": "cat" } },
                    "weight": 42
                }
            ]
  
          }
      }
  }

- field_value_factor

  使用这个值来修改 _score ，如将 popularity 或 votes （受欢迎或赞）作为考虑因素。
  
  PUT /blogposts/post/1
  {
    "title":   "About popularity",
    "content": "In this post we will talk about...",
    "votes":   6
  }
  
  
  

	- field

		- 要从文档中提取的字段

	- modifier

	  种融入受欢迎度更好方式是用 modifier 平滑 votes 的值。换句话说，我们希望最开始的一些赞更重要，但是其重要性会随着数字的增加而降低。 0 个赞与 1 个赞的区别应该比 10 个赞与 11 个赞的区别大很多。
	  
	  对于上述情况，典型的 modifier 应用是使用 log1p 参数值，公式如下：
	  
	  new_score = old_score * log(1 + number_of_votes)
	  
	  
	  修饰语 modifier 的值可以为： none （默认状态）、 log 、 log1p 、 log2p 、 ln 、 ln1p 、 ln2p 、 square 、 sqrt 以及 reciprocal 

		- DSL

		  GET /blogposts/post/_search
		  {
		    "query": {
		      "function_score": {
		        "query": {
		          "multi_match": {
		            "query":    "popularity",
		            "fields": [ "title", "content" ]
		          }
		        },
		        "field_value_factor": {
		          "field":    "votes",
		          "modifier": "log1p" 
		        }
		      }
		    }
		  }
		  
		  修饰语 modifier 的值可以为： none （默认状态）、 log 、 log1p 、 log2p 、 ln 、 ln1p 、 ln2p 、 square 、 sqrt 以及 reciprocal 

	- factor

		- 字段值乘以的可选因子，默认为1。

	- DSL 示例

	  GET /blogposts/post/_search
	  {
	    "query": {
	      "function_score": { 
	        "query": { 
	          "multi_match": {
	            "query":    "popularity",
	            "fields": [ "title", "content" ]
	          }
	        },
	        "field_value_factor": { 
	          "field": "votes" ,
	   		"factor": 1.2,
	            "modifier": "sqrt",
	             "missing": 1
	        }
	      }
	    }
	  }
	  每个文档的最终评分 _score 都做了如下修改：
	  
	  new_score = old_score * number_of_votes
	  
	  将转化为以下得分公式：
	  sqrt(1.2 * doc['votes'].value)
	  	
	  
	  function_score 查询将主查询和函数包括在内。
	  
	  主查询优先执行。
	  
	  field_value_factor 函数会被应用到每个与主 query 匹配的文档。
	  
	  
	  每个文档的 votes 字段都 必须 有值供 function_score 计算。如果 没有 文档的 votes 字段有值，那么就 必须 使用 missing 属性 提供的默认值来进行评分计算。
	  
	  

		- 问题

		  然而这并不会带来出人意料的好结果，全文评分 _score 通常处于 0 到 10 之间，如下图 Figure 29, “受欢迎度的线性关系基于 _score 的原始值 2.0” 中，有 10 个赞的博客会掩盖掉全文评分，而 0 个赞的博客的评分会被置为 0 。
		  
		  

- random_score

  为每个用户都使用一个不同的随机评分对结果排序，但对某一具体用户来说，看到的顺序始终是一致的。
  
  GET /_search
  {
      "query": {
          "function_score": {
              "random_score": {
                  "seed": 10,
                  "field": "_seq_no"
              }
          }
      }
  }

- 衰减函数

  https://www.elastic.co/guide/en/elasticsearch/reference/6.8/query-dsl-function-score-query.html

	- DSL示例

	  "DECAY_FUNCTION": { 
	      "FIELD_NAME": { 
	            "origin": "11, 12",
	            "scale": "2km",
	            "offset": "0km",
	            "decay": 0.33
	      }
	  }
	  
	  
	  
	  

	- 3种DECAY_FUNCTION 

		- gauss

			- 正常衰减

		- exp

			- 指数衰减

		- linear

			- 线性衰减

	- Field

		- 必须是数字，日期或地理点字段。
		- 对于多值字段【Array】

			- multi_value_mode

			  
			  min
			  距离是最小距离
			  
			  max
			  距离是最大距离
			  
			  avg
			  距离是平均距离
			  
			  sum
			  距离是所有距离的总和

	- origin

		- 用于计算距离的原点

	- scale

		- 定义到原点的距离+偏移

	- offset

		- 衰减函数将仅计算距离大于 offset 文档的衰减函数。默认值为0。

	- decay

		- 如何在 scale 给定的距离处对文档进行评分
		- 如果decay未定义，则 scale 处文档得分为0.5。

- script_score

  如果需求超出以上范围时，用自定义脚本可以完全控制评分计算，实现所需逻辑。
  
  GET /_search
  {
      "query": {
          "function_score": {
              "query": {
                  "match": { "message": "elasticsearch" }
              },
              "script_score" : {
                  "script" : {
                    "source": "Math.log(2 + doc['likes'].value)"
                  }
              }
          }
      }
  }
  
  分数必须为非负数。否则，Elasticsearch返回错误。

### score_mode

参数 score_mode 指定如何组合计算出的分数：
multiply 分数相乘（默认）
sum 分数相加
avg 分数是平均值
first 具有匹配过滤器的第一个函数被应用
max 使用最高分
min 使用最低分数


### boost_mode

新计算的分数与查询分数合并。该参数boost_mode定义如何：

multiply
查询分数和功能分数相乘（默认）

replace
仅使用功能分数，查询分数将被忽略

sum
查询分数和功能分数相加

avg
平均

max
查询分数和功能分数的最大值

min
查询分数和功能分数的最小值

### max_boost

- 将新分数限制为不超过特定限制

### min_score

- 文档所需分数阈值，排除不符合特定分数阈值的文档
- 需要对查询返回的所有文档进行打分，然后一一过滤掉。

### DSL 综合示例

GET /_search
{
    "query": {
        "function_score": {
          "query": { "match_all": {} },
          "boost": "5", 
          "functions": [
              {
                  "filter": { "match": { "test": "bar" } },
                  "random_score": {}, 
                  "weight": 23
              },
              {
                  "filter": { "match": { "test": "cat" } },
                  "weight": 42
              }
          ],
          "max_boost": 42,
          "score_mode": "max",
          "boost_mode": "multiply",
          "min_score" : 10
        }
    }
}



## boosting query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-boosting-query.html

该boosting查询可用于有效降级与给定查询匹配的结果。与布尔查询中的“ NOT”子句不同的是，它仍会选择包含不良词的文档，但会降低其总体得分


### positive

- 用于获取返回结果

### negative

- 对上述结果的相关性打分进行调整

### negative_boost

- 升权(>1), 降权(>0 and <1), 减分(<0)

### DSL示例

GET /_search
{
    "query": {
        "boosting" : {
            "positive" : {
                "term" : {
                    "field1" : "value1"
                }
            },
            "negative" : {
                 "term" : {
                     "field2" : "value2"
                }
            },
            "negative_boost" : 0.2
        }
    }
}

它接受 positive 和 negative 查询。只有那些匹配 positive 查询的文档罗列出来，对于那些同时还匹配 negative 查询的文档将通过文档的原始 _score 与 negative_boost 相乘的方式降级后的结果。

为了达到效果， negative_boost 的值必须小于 1.0 。在这个示例中，所有包含负向词的文档评分 _score 都会减半。



## 5、 Doc Values 介绍

当你对一个字段进行排序时，Elasticsearch 需要访问每个匹配到的文档得到相关的值。倒排索引的检索性能是非常快的，但是在字段值排序时却不是理想的结构。

在搜索的时候，我们能通过搜索关键词快速得到结果集。

当排序的时候，我们需要倒排索引里面某个字段值的集合。换句话说，我们需要 转置 倒排索引。


转置 结构在其他系统中经常被称作 列存储 。

### 是一种列式存储结构

### 默认情况下每个字段的 Doc Values 都是激活的

### Doc Values 是在索引时创建的

当字段索引时，Elasticsearch 为了能够快速检索，会把字段的值加入倒排索引中，同时它也会存储该字段的 Doc Values。

### 文档值被序列化到磁盘

因为文档值被序列化到磁盘，我们可以依靠操作系统的帮助来快速访问。

当 working set 远小于节点的可用内存，系统会自动将所有的文档值保存在内存中，使得其读写十分高速； 

当其远大于可用内存，操作系统会自动把 Doc Values 加载到系统的页缓存中，从而避免了 jvm 堆内存溢出异常。

### 被应用到以下场景

- 对一个字段进行排序
- 对一个字段进行聚合
- 某些过滤，比如地理位置过滤
- 某些与字段相关的脚本计算

