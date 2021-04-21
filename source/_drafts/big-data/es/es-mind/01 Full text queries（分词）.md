# 01 Full text queries（分词）

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/full-text-queries.html
高级全文查询通常用于在全文字段（如电子邮件正文）上运行全文查询。他们了解如何分析要查询的字段，并在执行之前将每个字段 analyzer
（或search_analyzer）应用于查询字符串。
全文查询将在执行前将查询字符串分词。


## 中文分词插件

### ik分词

https://github.com/medcl/elasticsearch-analysis-ik



- 测试ik分词

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

- ik_max_word：细颗粒度分词

  ik_max_word: 会将文本做最细粒度的拆分，比如会将“关注我系统学习ES”拆分为“关注，我，系统学，系统，学习，es”，会穷尽各种可能的组合，适合 Term Query；

- ik_smart：粗颗粒度分词

  ik_smart: 会做最粗粒度的拆分，比如会将“关注我系统学习ES”拆分为“关注，我，系统，学习，es”，适合 Phrase 查询。

- 使用建议

  一般情况下，为了提高搜索的效果，需要这两种分词器配合使用。
  
  既索引时用 ik_max_word 尽可能多的分词，
  
  而搜索时用 ik_smart 尽可能提高匹配准度，让用户的搜索尽可能的准确。
  
  比如一个常见的场景，就是搜索"进口红酒"的时候，尽可能的不要出现口红相关商品或者让口红不要排在前面。
  
  

## 一个字段配置多个分词器

相比粗暴的用不同的字段去实现配置不同的分词器而言，一个字段配置多个分词器在数据的存储和操作上方便许多，只用储存一个字段，即可得到不同的分词效果。 



 "content": {
          "type": "keyword", # 默认为 keyword类型
          "fields": {
            "ik_max_analyzer": { # 创建名为 ik_max_analyzer 的子字段
              "type": "text",
              "analyzer": "ik_max_word", # 字段ik_max_analyzer 的倒排序索引分词器为ik_max_word
              "search_analyzer": "ik_max_word" # 检索关键词的分词器为ik_max_word
            },
            "ik_smart_analyzer": {  # 创建名为 ik_smart_analyzer的子字段
              "type": "text",
              "analyzer": "ik_smart" # 字段ik_smart_analyzer 的倒排序索引分词器为ik_smart
                 # 字段ik_smart_analyzer 的检索关键词的分词器默认为ik_smart
            }
          }
        }

## match query

match查询接受文本/数字/日期，对其进行分析并构造查询


GET /tehero_index/_doc/_search
{
  "query":{
    "match":{
      "content.ik_smart_analyzer":"系统编程"
    }
  }
}

检索词“系统编程”被分词为两个Token【系统】【编程】；
将这两个Token在【倒排索引】中，针对Token字段进行检索，等价于sql：【where Token = 系统 or Token = 编程】；


### 用于执行全文查询的标准查询，包括模糊匹配和短语或接近查询。

### 控制Token之间的布尔关系：operator：or/and

默认值为or
GET /_search
{
    "query": {
        "match" : {
            "message" : {
                "query" : "this is a test",
                "operator" : "and"
            }
        }
    }
}

### 指定查询语句的分词器 analyzer

# 可以覆盖映射所指定的分词器

GET /tehero_index/_doc/_search
{
  "query":{
    "match":{
     "content.ik_smart_analyzer" : {
                "query" : "系统学习",
                "analyzer": "ik_max_word",
                "operator" : "and"
            }
    }
  }
}

### 停顿词检索：zero_terms_query

# 使用 stop 分析器，会过滤掉所有的停顿词，

POST _analyze
{
  "analyzer": "stop",
  "text": "to be or not to be"
}

那么就像 这种 字段中的 to be or not to be 这个短语中全部都是停止词，一过滤，就什么也没有了,得不到任何 tokens, 那搜索时岂不什么都搜不到。

zero_terms_query 就是为了解决这个问题而生的。它的默认值是 none ,就是搜不到停止词（对 stop 分析器字段而言）,如果设置成 all ，它的效果就和 match_all 类似，就可以搜到了。

### 忽略数据类型转换异常：lenient 参数

# id 字段是 Integer 类型，但是查询使用的 string 
GET matchtest/_search
{
  "query": {
    "match": {
      "id" : {
        "query": "xxx",
        "lenient": true
      }
    }
  }
}

注意，如果将 id 字段的值设置为字符串 "10", 来查询，由于能够转换成整数，这时 elastic 内部会将 字符串先转换成整数再做查询，不会报错。

### Token匹配数：minimum_should_match

GET /tehero_index/_doc/_search
{
    "query": {
        "match": {
            "content.ik_max_analyzer": {
            	"query": "[1,2,4]",
            	"minimum_should_match":"2"
            }
        }
    }
}

### 对应的sql语句

GET /tehero_index/_doc/_search
{
  "query":{
    "match":{
      "content.ik_smart_analyzer":"系统编程"
    }
  }
}

检索词“系统编程”被分词为两个Token【系统】【编程】；

将这两个Token在【倒排索引】中，针对Token字段进行检索，等价于sql：【where Token = 系统 or Token = 编程】；


## match_phrase query

match_phrase查询分析文本并根据分析的文本创建一个短语查询。


match_phrase是分词的，text也是分词的。match_phrase的分词结果必须在text字段分词中都包含，而且顺序必须相同，而且必须都是连续的。


### 与match查询类似，但用于匹配确切的短语或单词接近匹配。

### Token之间的位置距离：slop 参数

想要包含 “quick brown fox” 的文档也能够匹配 “quick fox,” ，


GET /my_index/my_type/_search
{
    "query": {
        "match_phrase": {
            "title": {
            	"query": "quick fox",
            	"slop":  1
            }
        }
    }
}

quick 与 fox 的位置相差  1

### 对应到sql

GET /tehero_index/_doc/_search
{
  "query":{
    "match_phrase":{
      "content.ik_smart_analyzer":"系统编程"
    }
  }
}
分析：
检索词“系统编程”被分词为两个Token【系统，Position=0】【编程，Position=1】；

倒排索引检索时，等价于sql：【where Token = 系统  and 系统_Position=0 and Token = 编程 and  编程_Position=1】；

## 【7.7特有】match_bool_prefix query

https://www.elastic.co/guide/en/elasticsearch/reference/7.7/query-dsl-match-bool-prefix-query.html

### DSL 示例

GET /_search
{
    "query": {
        "match_bool_prefix" : {
            "message" : "quick brown f"
        }
    }
}

等价于：

GET /_search
{
    "query": {
        "bool" : {
            "should": [
                { "term": { "message": "quick" }},
                { "term": { "message": "brown" }},
                { "prefix": { "message": "f"}}
            ]
        }
    }
}

### 支持参数：minimum_should_match 等

## match_phrase_prefix query

GET /_search
{
    "query": {
        "match_phrase_prefix" : {
            "message" : "quick brown f"
        }
    }
}

它接受一个
max_expansions参数（默认值50），该参数可以控制将最后一项扩展为多少个后缀。强烈建议将其设置为可接受的值，以控制查询的执行时间

### 与match_phrase查询类似，但是会对最后一个Token在倒排序索引列表中进行通配符搜索。

### 模糊匹配数控制：max_expansions 默认值50

GET /_search
{
    "query": {
        "match_phrase_prefix" : {
            "message" : {
                "query" : "quick brown f",
                "max_expansions" : 10
            }
        }
    }
}

### 主要用于搜索建议

### 对应到sql

GET tehero_index/_doc/_search
{
  "query": {
    "match_phrase_prefix": {
      "content.ik_smart_analyzer": {
        "query": "系",
        "max_expansions": 1
      }
    }
  }
}
分析：
检索词“系”被分词为一个个Token【系】+ 1个通配符；

倒排索引检索时，等价于sql：【where Token = 系  or Token like “系_”】；

## multi_match query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-multi-match-query.html

GET /_search
{
  "query": {
    "multi_match" : {
      "query":    "this is a test",

（#要查询的字段：字段可以用通配符指定） 
      "fields": [ "subject", "*_name" ]  
    }
  }
}

### match查询 的多字段版本。

### multi_match 的查询类型


best_fields

（默认）查找与任何字段匹配但使用_score最佳字段中的文档 。请参阅best_fields。

most_fields

查找与任何字段匹配的文档，并将_score每个字段中的合并。请参阅most_fields。

cross_fields

像对待analyzer一个大字段一样对待字段。在任何 字段中查找每个单词。请参阅cross_fields。

phrase

match_phrase在每个字段上 运行查询，并使用 _score 最佳字段中的。请参阅phrase和phrase_prefix。

phrase_prefix

match_phrase_prefix在每个字段上 运行查询并组合_score每个字段中的。请参阅phrase和phrase_prefix。

### 字段^数字：表示增强该字段（权重影响相关性评分）

## common terms query

https://www.elastic.co/guide/en/elasticsearch/reference/6.4/query-dsl-common-terms-query.html

### 目的：在保证性能的前提下，提高搜索结果的准确度

### 问题：耗费性能or丢失精度

查询中的每个字词都有消耗。一种用于搜索"The brown fox" 需要三个单项查询，每个的"the"，
"brown"并且 "fox"，所有这些都对索引中的所有文件执行。查询"the"可能匹配许多文档，因此对相关性的影响要比其他两个术语小得多。

以前，解决此问题的方法是忽略高频项。通过将其"the"视为停用词，我们减小了索引大小，并减少了需要执行的术语查询的数量。

这种方法的问题在于，尽管停用词对相关性的影响很小，但它们仍然很重要。如果删除停用词，我们将失去精度（例如，我们无法区分"happy" 和"not happy"），并且我们将失去索引（例如，在索引中不存在类似"The The"或 "To be or not to be"这种的简单停用词）。

### 解决逻辑：该查询将检索词分割分为两组：更重要（即低频率而言）和不太重要的（即，高频率而言，如先前已停用词）

首先，它搜索与更重要的术语匹配的文档。这些术语出现在较少的文档中，并且对相关性具有更大的影响。

然后，它对不那么重要的词执行第二次查询，这些词经常出现并且对相关性影响很小。但是，它是在第一个查询的结果集基础上，而不是计算所有匹配文档的相关性得分。这样，高频项可以改善相关性计算，而无需付出性能不佳的代价。

如果查询仅由高频词组成，则将单个查询作为AND（合并）查询执行，换句话说，所有词都是必需的。

### 例子

# 文档频率大于0.1％的单词（例如"this"和"is"）将被视为通用术语。
GET /_search
{
    "query": {
        "common": {
            "body": {
                "query": "nelly the elephant as a cartoon",
                "cutoff_frequency": 0.001,
                "low_freq_operator": "and"
            }
        }
    }
}

等价于：

GET /_search
{
    "query": {
        "bool": {
            "must": [
            { "term": { "body": "nelly"}},
            { "term": { "body": "elephant"}},
            { "term": { "body": "cartoon"}}
            ],
            "should": [
            { "term": { "body": "the"}},
            { "term": { "body": "as"}},
            { "term": { "body": "a"}}
            ]
        }
    }
}


## query_string query

GET /_search
{
    "query": {
        "query_string" : {
            "default_field" : "content",
            "query" : "this AND that OR thus"
        }
    }
}


GET /_search
{
    "query": {
        "query_string" : {
            "fields" : ["content", "name"],
            "query" : "this AND that"
        }
    }
}

### 允许您在单个查询字符串中指定AND | OR | NOT条件和多字段搜索。

## simple_query_string query

GET /_search
{
    "query": {
        "simple_query_string" : {
            "fields" : ["content"],
            "query" : "foo bar -baz"
        }
    }
}

将simple_query_string支持以下特殊字符：

+ 表示与运算
| 表示或运算
- 取反单个令牌
“” 表示对检索词进行match_phrase query
* 字词末尾表示前缀查询

检索词~N” Token后模糊性距离为N
~N 在短语表示斜线数量之后

### 类似于Query String，但是会忽略错误的语法，永远不会引发异常，并且会丢弃查询的无效部分

### 控制该查询允许的运算符 ：flags

可用的标志是：

ALL （默认）
启用所有可选的运算符。
AND
启用+AND运算符。
ESCAPE
启用\作为转义字符。
FUZZY
~N在一个单词后 启用运算符，其中N整数表示允许匹配的编辑距离。请参阅模糊性。

NEAR
~N在一个短语之后 启用运算符，其中where N是匹配标记之间允许的最大位置数。的同义词SLOP。

NONE
禁用所有运算符。

NOT
启用-NOT运算符。

OR
启用\|OR运算符。

PHRASE
启用"用于搜索短语的引号运算符。

PRECEDENCE
使(和)运算符可以控制运算符优先级。

PREFIX
启用*前缀运算符。

SLOP
~N在一个短语之后 启用运算符，其中where N是匹配标记之间允许的最大位置数。的同义词NEAR。

WHITESPACE
启用空格作为分割字符。



- DSL

  GET /house-new/_search
  {
   "query": {
   "bool": {
   "filter": {
   "bool": {
   "must": [
   {
   "simple_query_string": {
   "fields": [
   "community",
   "address",
   "title",
   "remark"
   ],
   "query": "\"小区名1\" | \"小区名2\" | \"小区名3\" | \"小区名4\" | \"小区名5\" \"万达广场\"",
   "flags":"OR|AND|PHRASE"
   }
   },
  

## 使用注意点

### 1）对于支持 fields 的查询，如果不指定 field，就检索index 下的所有field

### 2）multi_match 的 Type 参数 非常强大

GET /tehero_index/_doc/_search
{
  "query":{
    "multi_match":{
     
        "query":"关",
        "type": "phrase_prefix",
        "max_expansions":"10"
      
    }
  }
}

### 3）各个查询 可支持的参数大全

## 使用场景

### 1）预期检索效果决定分词器的选用

### 2）如何检索数组类型的字段

- match + minimum_should_match

### 3）如何优雅的检索所有字段

- 所有支持fields参数的查询

