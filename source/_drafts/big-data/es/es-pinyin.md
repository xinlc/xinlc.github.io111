ElasticSearch实战系列：中文+拼音混合检索，并高亮显示
===

本文仿照QQ的用户搜索，搭建一个中文+拼音的混合检索系统，并高亮显示检索字段。全文共分为以下几部分：

1. 项目简介，包括需求描述与分析等；
2. 项目开发，通过两个版本的index，验证并完成需求；
3. 从分词和高亮原理入手，深度分析高亮显示问题；
4. SpringBoot+RestHighLevelClient 完成项目开发。

## 项目简介

本项目基于ElasticSearch 7.7.1，analysis-pinyin 7.7.1，参考QQ的用户搜索效果，完成一个中文+拼音的混合检索系统。

### 检索场景示例

中文+首字母+全拼检索

其实QQ的用户检索是有很多限制的，比如说首字母检索时，必须从第一个字开始匹配【输入“gz”，可以检索到“关注我”，但是不能检索到“我关注”】；

再比如说全拼+首字母检索时，全拼必须在前面【输入“guanz”，可以检索到“关注我”，但是输入“gzhu”，是不能检索到结果的】；

至于为什么会有如此限制，个人猜测是考虑检索性能。

### 检索需求描述

参考QQ，列出“用户检索系统”的需求如下：

- 1）支持首字母检索；
- 2）支持首字母+全拼检索；
- 3）支持中文+首字母+全拼混合检索；
- 4）检索词有中文，则必须包含；
- 5）高亮显示检索命中词。

### 需求分析

- 从需求1，可知，需要建立【首字母的倒排索引】；
- 从需求2，可知，需要建立【全拼的倒排索引】；

## 项目开发

### 第一个版本

根据上面的分析，参考 analysis-pinyin 官网，创建了第一版index：

```json
# ps：关于 analysis-pinyin 各个配置项的含义可参考官网
PUT /user_index/
{
  "settings": {
    "index": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    },
    "analysis": {
      "analyzer": {
        "pinyin_analyzer": {
          "tokenizer": "my_pinyin"
        }
      },
      "tokenizer": {
        "my_pinyin": {
          "type": "pinyin",
          "keep_first_letter": true,
          "keep_separate_first_letter": true,
          "keep_full_pinyin": true,
          "keep_original": false,
          "limit_first_letter_length": 16,
          "lowercase": true
        }
      }
    }
  },
  "mappings": {
    "dynamic": false,
    "properties": {
      "nickName": {
        "type": "keyword",
        "fields": {
          "pinyin": {
            "type": "text",
            "store": false,
            "analyzer": "pinyin_analyzer"
          }
        }
      }
    }
  }
}
```

使用_analyze接口，看下分词效果：

```json
GET user_index/_analyze
{
  "field": "nickName.pinyin",
  "text": [
    "关注我"
  ]
}

# 结果如下：
{
  "tokens" : [
    {
      "token" : "g",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 0
    },
    {
      "token" : "guan",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 0
    },
    {
      "token" : "gzw",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 0
    },
    {
      "token" : "z",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 1
    },
    {
      "token" : "zhu",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 1
    },
    {
      "token" : "w",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 2
    },
    {
      "token" : "wo",
      "start_offset" : 0,
      "end_offset" : 0,
      "type" : "word",
      "position" : 2
    }
  ]
}
```

一切都ok，好像能满足需求，插入几条数据，验证下：

```json
POST _bulk
{"index":{"_index":"user_index","_id":"1"}}
{"nickName":"关注我"}
{"index":{"_index":"user_index","_id":"2"}}
{"nickName":"我关注"}
{"index":{"_index":"user_index","_id":"3"}}
{"nickName":"系统学ES就关注我"}
{"index":{"_index":"user_index","_id":"4"}}
{"nickName":"系统学ES"}
```

试试检索效果：

```json
GET /user_index/_search
{
  "query": {
    "match_phrase": {
      "nickName.pinyin": "guanz我"
    }
  }
}
结果如下：
    "hits" : [
      {
        "_index" : "user_index",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 1.9991971,
        "_source" : {
          "nickName" : "关注我"
        }
      },
      {
        "_index" : "user_index",
        "_type" : "_doc",
        "_id" : "3",
        "_score" : 1.4875543,
        "_source" : {
          "nickName" : "系统学ES就关注我"
        }
      }
    ]
```

经过测试，发现是可以满足需求1、2、3的。

但别忘了，我们还有需求4和5，关于需求4，可以简单的使用 post_filter 后置过滤完成需求。

对于高亮显示，ES本身是提供了 highlight 语法的，写个DSL验证一下：

```json
# 检索语句
GET /user_index/_search
{
  "query": {
    "match_phrase": {
      "nickName.pinyin": "guanz我"
    }
  },
  "highlight": {
    "fields": {
      "nickName.pinyin": {}
    }
  }
}
# 部分结果     
      {
        "_index" : "user_index",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 1.9991971,
        "_source" : {
          "nickName" : "关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "<em></em><em></em><em></em>关注我"
          ]
        }
      }
```

发现居然没办法高亮！这可不行呀，这么简单的需求，必须实现了！

通过阅读 ES官方文档 + 不断尝试，终于找到原因，完美解决。

### 第二版

先看index的配置：

```json
PUT /user_index_v2/
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
          "filter": "my_pinyin"
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
    "dynamic": false,
    "properties": {
      "nickName": {
        "type": "keyword",
        "fields": {
          "pinyin": {
            "type": "text",
            "analyzer": "pinyin_analyzer"
          }
        }
      }
    }
  }
}
```

简单解释一下 pinyin 插件的配置∶

```json
"my_pinyin": {
  "type": "pinyin",
  # 保留首字母，比如 关注我 -> gzw
  "keep_first_letter": true,
  # 保留首字母分开，比如 关注我 -> g,z,w
  "keep_separate_first_letter": true,
  # 保留全拼，比如 关注我 -> guanzhuwo
  "keep_full_pinyin": true,
  # 保留原始输入，比如 关注我 -> 关注我
  "keep_original": true,
  # 设置first_letter结果的最大长度
  "limit_first_letter_length": 16,
  # 小写非中文字母
  "lowercase": true
}
```

pinyin 其它配置说明：

```json
keep_first_letter:这个参数会将词的第一个字母全部拼起来.例如:刘德华->ldh.默认为:true
keep_separate_first_letter:这个会将第一个字母一个个分开.例如:刘德华->l,d,h.默认为:flase.如果开启,可能导致查询结果太过于模糊,准确率太低.
limit_first_letter_length:设置最大keep_first_letter结果的长度,默认为:16
keep_full_pinyin:如果打开,它将保存词的全拼,并按字分开保存.例如:刘德华> [liu,de,hua],默认为:true
keep_joined_full_pinyin:如果打开将保存词的全拼.例如:刘德华> [liudehua],默认为:false
keep_none_chinese:将非中文字母或数字保留在结果中.默认为:true
keep_none_chinese_together:保证非中文在一起.默认为: true, 例如: DJ音乐家 -> DJ,yin,yue,jia, 如果设置为:false, 例如: DJ音乐家 -> D,J,yin,yue,jia, 注意: keep_none_chinese应该先开启.
keep_none_chinese_in_first_letter:将非中文字母保留在首字母中.例如: 刘德华AT2016->ldhat2016, 默认为:true
keep_none_chinese_in_joined_full_pinyin:将非中文字母保留为完整拼音. 例如: 刘德华2016->liudehua2016, 默认为: false
none_chinese_pinyin_tokenize:如果他们是拼音,切分非中文成单独的拼音项. 默认为:true,例如: liudehuaalibaba13zhuanghan -> liu,de,hua,a,li,ba,ba,13,zhuang,han, 注意: keep_none_chinese和keep_none_chinese_together需要先开启.
keep_original:是否保持原词.默认为:false
lowercase:小写非中文字母.默认为:true
trim_whitespace:去掉空格.默认为:true
remove_duplicated_term:保存索引时删除重复的词语.例如: de的>de, 默认为: false, 注意:开启可能会影响位置相关的查询.
ignore_pinyin_offset:在6.0之后,严格限制偏移量,不允许使用重叠的标记.使用此参数时,忽略偏移量将允许使用重叠的标记.请注意,所有与位置相关的查询或突出显示都将变为错误,您应使用多个字段并为不同的字段指定不同的设置查询目的.如果需要偏移量,请将其设置为false。默认值:true
```

导入同样的数据验证检索结果：

```json
POST _bulk
{"index":{"_index":"user_index_v2","_id":"1"}}
{"nickName":"关注我"}
{"index":{"_index":"user_index_v2","_id":"2"}}
{"nickName":"我关注"}
{"index":{"_index":"user_index_v2","_id":"3"}}
{"nickName":"系统学ES就关注我"}
{"index":{"_index":"user_index_v2","_id":"4"}}
{"nickName":"系统学ES"}
```

```json
GET /user_index_v2/_search
{
  "query": {
    "match_phrase": {
      "nickName.pinyin": "guanz我"
    }
  },
  "highlight": {
    "fields": {
      "nickName.pinyin": {}
    }
  }
}
# 结果
{
  "took" : 101,
  "timed_out" : false,
  "_shards" : {
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 2,
      "relation" : "eq"
    },
    "max_score" : 2.615616,
    "hits" : [
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 2.615616,
        "_source" : {
          "nickName" : "关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "<em>关</em><em>注</em><em>我</em>"
          ]
        }
      },
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "3",
        "_score" : 2.06496,
        "_source" : {
          "nickName" : "系统学ES就关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "系统学ES就<em>关</em><em>注</em><em>我</em>"
          ]
        }
      }
    ]
  }
}
```

从上面可以看到，这就是我们想要的，到此，高亮显示也ok了。

那就还剩下需求4【中文必须被包含】，需求4主要是为了保证检索精度。

```json
# 先新增一个同音词
POST _bulk
{"index":{"_index":"user_index_v2","_id":"5"}}
{"nickName":"观注我"}
```

执行如下DSL看看检索效果

```json
GET /user_index_v2/_search
{
  "query": {
    "match_phrase": {
      "nickName.pinyin": "关zwo"
    }
  },
  "highlight": {
    "fields": {
      "nickName.pinyin": {}
    }
  }
}
# 结果
{
  "took" : 1063,
  "timed_out" : false,
  "_shards" : {
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 3,
      "relation" : "eq"
    },
    "max_score" : 3.1733859,
    "hits" : [
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 3.1733859,
        "_source" : {
          "nickName" : "关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "<em>关</em><em>注</em><em>我</em>"
          ]
        }
      },
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "5",
        "_score" : 2.9570186,
        "_source" : {
          "nickName" : "观注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "<em>观</em><em>注</em><em>我</em>"
          ]
        }
      },
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "3",
        "_score" : 2.8284526,
        "_source" : {
          "nickName" : "系统学ES就关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "系统学ES就<em>关</em><em>注</em><em>我</em>"
          ]
        }
      }
    ]
  }
}
```

我们发现“观注我”也被检索出来了，模糊性很大，所以最终优化后的DSL如下：

```json
GET /user_index_v2/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "match": {
            "nickName.pinyin":{
              "query": "关",
              "analyzer": "standard",
              "minimum_should_match": "100%"
            }
          }
        }
      ],
      "must": [
        {
          "match_phrase": {
            "nickName.pinyin": "关zwo"
          }
        }
      ]
    }
  },
  "highlight": {
    "fields": {
      "nickName.pinyin": {}
    }
  }
}
# 结果
{
  "took" : 3,
  "timed_out" : false,
  "_shards" : {
    "total" : 1,
    "successful" : 1,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 2,
      "relation" : "eq"
    },
    "max_score" : 3.1733859,
    "hits" : [
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "1",
        "_score" : 3.1733859,
        "_source" : {
          "nickName" : "关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "<em>关</em><em>注</em><em>我</em>"
          ]
        }
      },
      {
        "_index" : "user_index_v2",
        "_type" : "_doc",
        "_id" : "3",
        "_score" : 2.8284526,
        "_source" : {
          "nickName" : "系统学ES就关注我"
        },
        "highlight" : {
          "nickName.pinyin" : [
            "系统学ES就<em>关</em><em>注</em><em>我</em>"
          ]
        }
      }
    ]
  }
}
```

终于，我们完成了所有的需求点，中文+首字母+全拼混合检索，命中词高亮，中文必须包含。

可能有的小伙伴就有疑问了，第一版和第二版的区别究竟是什么呢?为什么第二版的index就可以满足需求呢?

## analyzer与高亮

![1][1]

注意高亮的最后一步，会根据命中的 Fragment 反向拿到实际文本，该步骤就必须知道原始文本中每个Token 的偏移量。

对比下第一版和第二版对同一个字符串【关注我】分词后得到的position List，发现第一版 index分词得到的 Token Stream 缺少 offset 偏移量信息，所以没办法正常高亮。

![2][2]

那为何第一个版本得到的position lIst 会缺少offset信息呢?先看一下 analyzer的过程∶

![3][3]

通过上图我们可以看到，tokenizer是非常关键的一步，因为最关键的Token Stream是依靠 tokenizer生成的，其中就包含了高亮显示所必须的 offset 信息。

对于第一个版本而言，依靠pinyin插件生成Token Stream，是不能得到 offset信息的，这是 pinyin 插件本身的机制所决定了的;

对于第二个版本而言，Token Stream 的生成依靠的是 standard分词器，pinyin插件只负责转化Token。

根据高亮的原理：从 Token Stream中对term进行高亮的。结合index原理：利用 tokenizer 生成 token Stream。 所以问题的关键在于 analyzer 配置中的tokenizer

对于高亮显示，必须要有 positionList的offset信息，因为高亮的最后一步是根据 offset信息进行替换填充。 所以在 analyzer配置的时候，不能直接将 tokenizer 参数设置为对应pinyin分析器【生成的token没有offset信息】

ps∶关于ElasticSearch的highlight是有很多内容的，每种highlight类型的高亮流程也是不一样的，但相同的是都必须依赖于Token 的 offset 信息，虽然 offset信息的来源有3种∶ Position List【默认的unified类型就是使用的这个】、Term vectors、Plain highlight。有兴趣的伙伴可以去深入学习研究下。


[1]: ./img/es/es-pinyin/1.jpg
[2]: ./img/es/es-pinyin/2.jpg
[3]: ./img/es/es-pinyin/3.jpg
