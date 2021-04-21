Lucene系列六：Lucene搜索详解（Lucene搜索流程详解、搜索核心API详解、基本查询详解、QueryParser详解）
===

## 搜索流程详解

1. 先看一下Lucene的架构图

![001][001]

由图可知搜索的过程如下：

　　用户输入搜索的关键字、对关键字进行分词、根据分词结果去索引库里面找到对应的文章id、根据文章id找到对应的文章

2. Lucene搜索API 图示

![1][1]

3. Lucene搜索代码示例

先在pom.xml里面引入查询分析器模块

```xml
<!--  lucene-queryparser 查询分析器模块 -->
<dependency>
    <groupId>org.apache.lucene</groupId>
    <artifactId>lucene-queryparser</artifactId>
    <version>7.3.0</version>
</dependency>
```

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;
import java.text.ParseException;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;

/**
 * @Description: lucene 搜索基本流程示例
 * @author liguangsheng
 * @date 2018年5月11日
 *
 */

public class SearchBaseFlow {

    public static void main(String[] args)
            throws IOException, ParseException, org.apache.lucene.queryparser.classic.ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);
        // 要搜索的字段
        String filedName = "name";
        // 查询生成器（解析输入生成Query查询对象）
        QueryParser parser = new QueryParser(filedName, analyzer);
        // 通过parse解析输入（分词），生成query对象
        Query query = parser.parse("Thinkpad");
        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        // 获得总命中数
        System.out.println(topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            // 取文档的字段
            System.out.println(hitDoc.get(filedName));
        }

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }
}
```

示例代码的图解：

![2][2]

## 搜索核心API详解

1. IndexReader  索引读取器

Open一个读取器，读取的是该时刻点的索引视图。如果后续索引发生改变，需重新open一个读取器。获得索引读取器的方式：

DirectoryReader.open(IndexWriter indexWriter) 优先使用

DirectoryReader.open(Directory)

DirectoryReader.openIfChanged(DirectoryReader) 共享当前reader资源重新打开一个（当索引变化时）

IndexReader分为两类：

- IndexReder
  - CompositeReder：复合读取器
  - LeafReder：叶子读取器

复合读取器，多个读取器的复合。只可直接用它获取stored fields 。在内部通过CompositeReader.getSequentialSubReaders 得到里面的叶子读取器来获取其他数据

叶子读取器：支持获取stored fields, doc values, terms（词项）, and postings （词项对应的文档）

DirectoryReader 是 复合读取器

IndexReader 主要API：

![3][3]

LeafReader 主要API：

![4][4]

2. IndexSearcher 索引搜索器

应用通过调用它的search(Query,int)重载方法在一个IndexReader上实现搜索。出于性能的考虑，请使用一个IndexSearcher实例，除非索引发生变化。如索引更新了则通过DirectoryReader.openIfChanged(DirectoryReader)  取得新的读取器，再创建新的搜索器。

IndexSearcher 索引搜索器 API

搜索 API：

![5][5]

获取文档 API：

![6][6]

TopDocs 搜索命中的结果集 （Top-N）

![7][7]

TopFieldDocs 按字段排序的搜索命中结果集

![8][8]

ScoreDoc

![9][9]

## 基本查询详解

Query  查询的表示，它的可实例化子类有

![10][10]

1、TermQuery  词项查询
　　最基本、最常用的查询。用来查询指定字段包含指定词项的文档。

　　TermQuery tq = new TermQuery(new Term(“name", “thinkpad"));

2、BooleanQuery  布尔查询
　　搜索的条件往往是多个的，如要查询名称包含“电脑” 或 “thinkpad”的商品，就需要两个词项查询做或合并。布尔查询就是用来组合多个子查询的。每个子查询称为布尔字句 BooleanClause，布尔字句自身也可以是组合的。 组合关系支持如下四种：

Occur.SHOULD 或

Occur.MUST 且

Occur.MUST_NOT 且非

Occur.FILTER 同 MUST，但该字句不参与评分

布尔查询默认的最大字句数为1024，在将通配符查询这样的查询rewriter为布尔查询时，往往会产生很多的字句，可能抛出TooManyClauses 异常。可通过BooleanQuery.setMaxClauseCount(int)设置最大字句数。

```java
// 布尔查询
Query query1 = new TermQuery(new Term(filedName, "thinkpad"));
Query query2 = new TermQuery(new Term("simpleIntro", "英特尔"));
BooleanQuery.Builder booleanQueryBuilder = new BooleanQuery.Builder();
booleanQueryBuilder.add(query1, Occur.SHOULD);
booleanQueryBuilder.add(query2, Occur.MUST);
BooleanQuery booleanQuery = booleanQueryBuilder.build();

// 可像下一行这样写
// BooleanQuery booleanQuery = new BooleanQuery.Builder()
//     .add(query1, Occur.SHOULD).add(query2, Occur.MUST).build();
```
3、PhraseQuery  短语查询
　　最常用的查询，匹配特定序列的多个词项。PhraserQuery使用一个位置移动因子（slop）来决定任意两个词项的位置可最大移动多少个位置来进行匹配，默认为0。有两种方式来构建对象：

![11][11]

> 注意：所有加入的词项都匹配才算匹配（即使是你在同一位置加入多个词项）。如果需要在同一位置匹配多个同义词中的一个，适合用MultiPhraseQuery

```java
PhraseQuery phraseQuery1 = new PhraseQuery("name", "thinkpad",
    "carbon");

PhraseQuery phraseQuery2 = new PhraseQuery(1, "name", "thinkpad",
    "carbon");

PhraseQuery phraseQuery3 = new PhraseQuery("name", "笔记本电脑", "联想");

PhraseQuery phraseQuery4 = new PhraseQuery.Builder()
    .add(new Term("name", "笔记本电脑"), 4)
    .add(new Term("name", "联想"), 5).build();
// 这两句等同
PhraseQuery phraseQuery5 = new PhraseQuery.Builder()
    .add(new Term("name", "笔记本电脑"), 0)
    .add(new Term("name", "联想"), 1).build();
```

PhraseQuery  slop  移动因子说明：

String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";

A、如果想用  “thinkpad  carbon” 来匹配 name。因中间有 x1,则需要将thinkpad 向右移动1个位置。

B、如果想用  “carbon  thinkpad” 来匹配 name。因中间有 x1,则需要将carbon 向右移动3个位置。

```java
// String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";

// PhraseQuery 短语查询
PhraseQuery phraseQuery2 = new PhraseQuery(1, "name", "thinkpad","carbon");
// slop示例
PhraseQuery phraseQuery2Slop = new PhraseQuery(3, "name", "carbon",    "thinkpad");
PhraseQuery phraseQuery3 = new PhraseQuery("name", "笔记本电脑", "联想");
// slop示例
PhraseQuery phraseQuery3Slop = new PhraseQuery(2, "name", "联想","笔记本电脑");
```

4、MultiPhraseQuery 多重短语查询

短语查询的一种更通用的用法，支持同位置多个词的OR匹配。通过里面的Builder来构建MultiPhraseQuery：

![12][12]

```java
// 4 MultiPhraseQuery 多重短语查询
Term[] terms = new Term[2];
terms[0] = new Term("name", "笔记本");
terms[1] = new Term("name", "笔记本电脑");
Term t = new Term("name", "联想");
MultiPhraseQuery multiPhraseQuery = new MultiPhraseQuery.Builder()
    .add(terms).add(t).build();

// 对比 PhraseQuery在同位置加入多个词 ，同位置的多个词都需匹配，所以查不出。
PhraseQuery pquery = new PhraseQuery.Builder().add(terms[0], 0)
    .add(terms[1], 0).add(t, 1).build();
```

前面4个查询的完整示例代码：

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.BooleanClause.Occur;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.MultiPhraseQuery;
import org.apache.lucene.search.PhraseQuery;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TermQuery;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;

/**
 * @Description: 搜索查询示例
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */

public class SearchQueryDemo {

    public static void main(String[] args) throws IOException, ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);
        // 要搜索的字段
        String filedName = "name";

        // 1、词项查询
        Query query1 = new TermQuery(new Term(filedName, "thinkpad"));
        System.out.println("************** 词项查询 ******************");
        doSearch(query1, indexSearcher);

        // 2、布尔查询
        Query query2 = new TermQuery(new Term("simpleIntro", "英特尔"));
        BooleanQuery.Builder booleanQueryBuilder = new BooleanQuery.Builder();
        booleanQueryBuilder.add(query1, Occur.SHOULD);
        booleanQueryBuilder.add(query2, Occur.MUST);
        BooleanQuery booleanQuery = booleanQueryBuilder.build();

        // 可像下一行这样写
        // BooleanQuery booleanQuery = new BooleanQuery.Builder()
        // .add(query1, Occur.SHOULD).add(query2, Occur.MUST).build();

        System.out.println("************** 布尔查询 ******************");
        doSearch(booleanQuery, indexSearcher);

        // 3、PhraseQuery 短语查询
        // String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";
        PhraseQuery phraseQuery1 = new PhraseQuery("name", "thinkpad", "carbon");
        System.out.println("************** phrase 短语查询  ******************");
        doSearch(phraseQuery1, indexSearcher);

        PhraseQuery phraseQuery2 = new PhraseQuery(1, "name", "thinkpad", "carbon");
        System.out.println("************** phrase 短语查询  ******************");
        doSearch(phraseQuery2, indexSearcher);

        // slop示例 3表示最大可以移动的位置，移动的过程中只要匹配短语carbon thinkpad即可
        PhraseQuery phraseQuery2Slop = new PhraseQuery(3, "name", "carbon", "thinkpad");
        System.out.println("********** phrase slop 短语查询  ***************");
        doSearch(phraseQuery2Slop, indexSearcher);

        PhraseQuery phraseQuery3 = new PhraseQuery("name", "笔记本电脑", "联想");
        System.out.println("************** phrase 短语查询  ******************");
        doSearch(phraseQuery3, indexSearcher);

        // slop示例
        PhraseQuery phraseQuery3Slop = new PhraseQuery(2, "name", "联想", "笔记本电脑");
        System.out.println("************** phrase s 短语查询  ******************");
        doSearch(phraseQuery3Slop, indexSearcher);

        PhraseQuery phraseQuery4 = new PhraseQuery.Builder().add(new Term("name", "笔记本电脑"), 4) // 4、5是这个词的位置，和 0、1等同
                .add(new Term("name", "联想"), 5).build();
        System.out.println("********** phrase Builder 1 短语查询  **************");
        doSearch(phraseQuery4, indexSearcher);

        // 等同 phraseQuery4
        PhraseQuery phraseQuery5 = new PhraseQuery.Builder().add(new Term("name", "笔记本电脑"), 0) // 4、5是这个词的位置，和 0、1等同
                .add(new Term("name", "联想"), 1).build();
        System.out.println("*********** phrase Builder 2  短语查询  ***********");
        doSearch(phraseQuery5, indexSearcher);

        // 4 MultiPhraseQuery 多重短语查询
        Term[] terms = new Term[2];
        terms[0] = new Term("name", "笔记本");
        terms[1] = new Term("name", "笔记本电脑");
        Term t = new Term("name", "联想");
        MultiPhraseQuery multiPhraseQuery = new MultiPhraseQuery.Builder().add(terms).add(t).build();
        System.out.println("************** multiPhraseQuery 短语查询  ******************");
        doSearch(multiPhraseQuery, indexSearcher);

        // 对比 PhraseQuery在同位置加入多个词 ，同位置的多个词都需匹配，所以查不出。
        PhraseQuery pquery = new PhraseQuery.Builder().add(terms[0], 0).add(terms[1], 0).add(t, 1).build();
        System.out.println("************** multiPhraseQuery  对比 PhraseQuery 短语查询  ******************");
        doSearch(pquery, indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher) throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score=" + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }

    }
}
```

5、SpanNearQuery  临近查询（跨度查询）

用于更复杂的短语查询，可以指定词间位置的最大间隔跨度。通过组合一系列的SpanQuery 实例来进行查询，可以指定是否按顺序匹配、slop、gap。

```java
// SpanNearQuery 临近查询
SpanTermQuery tq1 = new SpanTermQuery(new Term("name", "thinkpad"));
SpanTermQuery tq2 = new SpanTermQuery(new Term("name", "carbon"));
SpanNearQuery spanNearQuery = new SpanNearQuery(
    new SpanQuery[] { tq1, tq2 }, 1, true);

// SpanNearQuery 临近查询 gap slop 使用
SpanNearQuery.Builder spanNearQueryBuilder = SpanNearQuery
    .newOrderedNearQuery("name");
spanNearQueryBuilder.addClause(tq1).addGap(0).setSlop(1)
    .addClause(tq2);
SpanNearQuery spanNearQuery5 = spanNearQueryBuilder.build();
```

完整代码示例

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.spans.SpanNearQuery;
import org.apache.lucene.search.spans.SpanQuery;
import org.apache.lucene.search.spans.SpanTermQuery;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;


/**
 * @Description: SpanNearQuery 临近查询（跨度查询）
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */
public class SpanNearQueryDemo {

    public static void main(String[] args) throws IOException, ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);

        // String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";

        // SpanNearQuery 临近查询
        SpanTermQuery tq1 = new SpanTermQuery(new Term("name", "thinkpad"));
        SpanTermQuery tq2 = new SpanTermQuery(new Term("name", "carbon"));
        SpanNearQuery spanNearQuery = new SpanNearQuery(
                new SpanQuery[] { tq1, tq2 }, 1, true);

        System.out.println("************** SpanNearQuery 临近查询  ************");
        doSearch(spanNearQuery, indexSearcher);

        // 下面的例子词是反序的
        SpanNearQuery spanNearQuery2 = new SpanNearQuery(
                new SpanQuery[] { tq2, tq1 }, 1, true);

        System.out.println(
                "************** SpanNearQuery 临近查询 2 1,true************");
        doSearch(spanNearQuery2, indexSearcher);

        SpanNearQuery spanNearQuery3 = new SpanNearQuery(
                new SpanQuery[] { tq2, tq1 }, 3, true);

        System.out.println(
                "************** SpanNearQuery 临近查询 3  3, true************");
        doSearch(spanNearQuery3, indexSearcher);

        SpanNearQuery spanNearQuery4 = new SpanNearQuery(
                new SpanQuery[] { tq2, tq1 }, 3, false);

        System.out.println(
                "************** SpanNearQuery 临近查询 4  3, false************");
        doSearch(spanNearQuery4, indexSearcher);

        // SpanNearQuery 临近查询 gap slop 使用 1
        SpanTermQuery ctq1 = new SpanTermQuery(new Term("name", "张三"));
        SpanTermQuery ctq2 = new SpanTermQuery(new Term("name", "在理"));
        SpanNearQuery.Builder spanNearQueryBuilder = SpanNearQuery
                .newOrderedNearQuery("name");
        spanNearQueryBuilder.addClause(ctq1).addGap(0).setSlop(2)
                .addClause(ctq2);

        System.out.println("************** SpanNearQuery 临近查询  ************");
        doSearch(spanNearQueryBuilder.build(), indexSearcher);

        // SpanNearQuery 临近查询 gap slop 使用 2
        SpanNearQuery.Builder spanNearQueryBuilder2 = SpanNearQuery
                .newOrderedNearQuery("name");
        spanNearQueryBuilder2.addClause(ctq1).addGap(2).setSlop(0)
                .addClause(ctq2);

        System.out.println("************** SpanNearQuery 临近查询  ************");
        doSearch(spanNearQueryBuilder2.build(), indexSearcher);

        // SpanNearQuery 临近查询 gap slop 使用 3
        SpanNearQuery.Builder spanNearQueryBuilder3 = SpanNearQuery
                .newOrderedNearQuery("name");
        spanNearQueryBuilder3.addClause(ctq1).addGap(1).setSlop(1)
                .addClause(ctq2);

        System.out.println("************** SpanNearQuery 临近查询  ************");
        doSearch(spanNearQueryBuilder3.build(), indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher)
            throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score="
                    + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }

    }
}
```

6、TermRangeQuery 词项范围查询

用于查询包含某个范围内的词项的文档，如以字母开头a到c的词项。词项在反向索引中是排序的，只需指定的开始词项、结束词项，就可以查询该范围的词项。 如果是做数值的范围查询则用 PointRangeQuery 。

参数说明:

- 第1个参数：要查询的字段-field
- 第2个参数:：下边界词-lowerTerm
- 第3个参数：上边界词-upperTerm
- 第4个参数：是否包含下边界-includeLower
- 第5个参数：是否包含上边界 includeUpper

```java
// TermRangeQuery 词项范围查询
TermRangeQuery termRangeQuery = TermRangeQuery.newStringRange("name",
    "carbon", "张三", false, true);

```

完整示例代码

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TermRangeQuery;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;


/**
 * @Description: TermRangeQuery 词项范围查询
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */
public class TermRangeQueryDemo {

    /**
     * lucene 搜索查询示例
     */
    public static void main(String[] args) throws IOException, ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);

        // String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";

        // TermRangeQuery 词项范围查询
        TermRangeQuery termRangeQuery = TermRangeQuery.newStringRange("name",
                "carbon", "张三", false, true);

        System.out.println("********** TermRangeQuery 词项范围查询  ***********");
        doSearch(termRangeQuery, indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher)
            throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score="
                    + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }

    }
}
```

7、PrefixQuery, WildcardQuery, RegexpQuery

PrefixQuery：前缀查询，查询包含以xxx为前缀的词项的文档，是通配符查询，如 app，实际是 app*

```java
// PrefixQuery 前缀查询
PrefixQuery prefixQuery = new PrefixQuery(new Term("name", "think"));
```

WildcardQuery：通配符查询， *表示0个或多个字符，?表示1个字符，\是转义符。通配符查询可能会比较慢，不可以通配符开头（那样就是所有词项了）

```java
// WildcardQuery 通配符查询
WildcardQuery wildcardQuery = new WildcardQuery(
    new Term("name", "think*"));
```

RegexpQuery：正则表达式查询，词项符合某正则表达式

```java
// RegexpQuery 正则表达式查询
RegexpQuery regexpQuery = new RegexpQuery(new Term("name", "厉害.{4}"));
```

> 注意：这三种查询可能会比较慢，使用时谨慎

8、FuzzyQuery 模糊查询

简单地与索引词项进行相近匹配，允许最大2个不同字符。常用于拼写错误的容错：如把 “thinkpad” 拼成 “thinkppd”或 “thinkd”，使用FuzzyQuery 仍可搜索到正确的结果。

```java
// FuzzyQuery 模糊查询
FuzzyQuery fuzzyQuery = new FuzzyQuery(new Term("name", "thind"));

FuzzyQuery fuzzyQuery2 = new FuzzyQuery(new Term("name", "thinkd"), 2);

FuzzyQuery fuzzyQuery3 = new FuzzyQuery(new Term("name", "thinkpaddd"));

FuzzyQuery fuzzyQuery4 = new FuzzyQuery(new Term("name", "thinkdaddd"));
```

7和8对应查询的完整示例代码

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.index.Term;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.FuzzyQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.PrefixQuery;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.RegexpQuery;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.search.WildcardQuery;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;


/**
 * @Description: PrefixQuery前缀查询/WildcardQuery通配符查询/RegexpQuery正则表达式查询/FuzzyQuery模糊查询
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */
public class PrefixWildcardRegexpFuzzyQueryDemo {

    public static void main(String[] args) throws IOException, ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);

        // String name = "ThinkPad X1 Carbon 20KH0009CD/25CD 超极本轻薄笔记本电脑联想";

        // PrefixQuery 前缀查询
        PrefixQuery prefixQuery = new PrefixQuery(new Term("name", "think"));
        System.out.println("********** PrefixQuery 前缀查询  ***********");
        doSearch(prefixQuery, indexSearcher);

        // WildcardQuery 通配符查询
        WildcardQuery wildcardQuery = new WildcardQuery(
                new Term("name", "think*"));

        System.out.println("********** WildcardQuery 通配符  ***********");
        doSearch(wildcardQuery, indexSearcher);

        // WildcardQuery 通配符查询
        WildcardQuery wildcardQuery2 = new WildcardQuery(
                new Term("name", "厉害了???"));
        System.out.println("********** WildcardQuery 通配符  ***********");
        doSearch(wildcardQuery2, indexSearcher);

        // RegexpQuery 正则表达式查询
        RegexpQuery regexpQuery = new RegexpQuery(new Term("name", "厉害.{4}"));
        System.out.println("**********RegexpQuery 正则表达式查询***********");
        doSearch(regexpQuery, indexSearcher);

        // FuzzyQuery 模糊查询
        FuzzyQuery fuzzyQuery = new FuzzyQuery(new Term("name", "thind"));
        System.out.println("**********FuzzyQuery 模糊查询***********");
        doSearch(fuzzyQuery, indexSearcher);

        // FuzzyQuery 模糊查询
        FuzzyQuery fuzzyQuery2 = new FuzzyQuery(new Term("name", "thinkd"), 2);
        System.out.println("**********FuzzyQuery 模糊查询***********");
        doSearch(fuzzyQuery2, indexSearcher);

        // FuzzyQuery 模糊查询
        FuzzyQuery fuzzyQuery3 = new FuzzyQuery(new Term("name", "thinkpaddd"));
        System.out.println("**********FuzzyQuery 模糊查询***********");
        doSearch(fuzzyQuery3, indexSearcher);

        // FuzzyQuery 模糊查询
        FuzzyQuery fuzzyQuery4 = new FuzzyQuery(new Term("name", "thinkdaddd"));
        System.out.println("**********FuzzyQuery 模糊查询***********");
        doSearch(fuzzyQuery4, indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher)
            throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score="
                    + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }
    }
}
```

9、数值查询

前提：查询的数值字段必须索引。通过 IntPoint, LongPoint, FloatPoint, or DoublePoint 中的方法构建对应的查询。以IntPoint为例：

```java
// 精确值查询
Query exactQuery = IntPoint.newExactQuery("price", 1999900);

// 数值范围查询
Query pointRangeQuery = IntPoint.newRangeQuery("price", 499900,1000000);

// 集合查询
Query setQuery = IntPoint.newSetQuery("price", 1999900, 1000000,2000000);
```

完整示例代码

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.IntPoint;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;

/**
 * @Description: 数值查询
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */
public class PointQueryDemo {
    public static void main(String[] args) throws IOException, ParseException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);

        // 精确值查询
        Query exactQuery = IntPoint.newExactQuery("price", 1999900);
        System.out.println("********** pointRangeQuery 数值精确查询  ***********");
        doSearch(exactQuery, indexSearcher);

        // PointRangeQuery 数值范围查询
        Query pointRangeQuery = IntPoint.newRangeQuery("price", 499900,
                1000000);
        System.out.println("********** pointRangeQuery 数值范围查询  ***********");
        doSearch(pointRangeQuery, indexSearcher);

        // 集合查询
        Query setQuery = IntPoint.newSetQuery("price", 1999900, 1000000,
                2000000);
        System.out.println("********** pointRangeQuery 数值集合查询  ***********");
        doSearch(setQuery, indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher)
            throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score="
                    + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }
    }
}
```

> 总结：不同的查询需求只是不同字段的不同基本查询的组合

## QueryParser详解

![13][13]

QueryParser 查询解析生成器

Lucene QueryPaser包中提供了两类查询解析器：

- 传统的解析器：QueryParser和MultiFieldQueryParser
- 基于新的 flexible 框架的解析器：StandardQueryParser

1. 用法

用法1 传统解析器-单默认字段 QueryParser：

```java
QueryParser parser = new QueryParser("defaultFiled", analyzer);
//parser.setPhraseSlop(2);
Query query = parser.parse("query String");
```

用法2  传统解析器-多默认字段  MultiFieldQueryParser：

```java
// 传统查询解析器-多默认字段
String[] multiDefaultFields = { "name", "type", "simpleIntro" };
MultiFieldQueryParser multiFieldQueryParser = new MultiFieldQueryParser(
        multiDefaultFields, analyzer);
// 设置默认的组合操作，默认是 OR
multiFieldQueryParser.setDefaultOperator(Operator.OR);
Query query4 = multiFieldQueryParser.parse("笔记本电脑 AND price:1999900");
```

用法3  新解析框架的标准解析器：StandardQueryParser：

```java
StandardQueryParser queryParserHelper = new StandardQueryParser(analyzer);
// 设置默认字段
// queryParserHelper.setMultiFields(CharSequence[] fields);
// queryParserHelper.setPhraseSlop(8);
// Query query = queryParserHelper.parse("a AND b", "defaultField");
Query query5 = queryParserHelper.parse(
    "(\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 AND price:1999900","name");
```

以上3种用法的完整示例代码：

```java
package com.study.lucene.searchdetail;

import java.io.IOException;
import java.nio.file.Paths;

import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.IntPoint;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.MultiFieldQueryParser;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.queryparser.classic.QueryParser.Operator;
import org.apache.lucene.queryparser.flexible.core.QueryNodeException;
import org.apache.lucene.queryparser.flexible.standard.StandardQueryParser;
import org.apache.lucene.search.BooleanClause.Occur;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;

import com.study.lucene.ikanalyzer.Integrated.IKAnalyzer4Lucene7;


/**
 * @Description: QueryParser示例,查询解析器会对输入的查询短语进行分词
 * @author liguangsheng
 * @date 2018年5月12日
 *
 */
   
public class QueryParserDemo {

    public static void main(String[] args)
            throws IOException, ParseException, QueryNodeException {
        // 使用的分词器
        Analyzer analyzer = new IKAnalyzer4Lucene7(true);
        // 索引存储目录
        Directory directory = FSDirectory.open(Paths.get("f:/test/indextest"));
        // 索引读取器
        IndexReader indexReader = DirectoryReader.open(directory);
        // 索引搜索器
        IndexSearcher indexSearcher = new IndexSearcher(indexReader);

        /**
         * 用法1 传统解析器-单默认字段 QueryParser：
         */
        // 要搜索的默认字段
        String defaultFiledName = "name";
        // 查询生成器（解析输入生成Query查询对象）
        QueryParser parser = new QueryParser(defaultFiledName, analyzer);
        // parser.setPhraseSlop(2);
        // 通过parse解析输入，生成query对象
        Query query1 = parser.parse(
                "(name:\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 AND price:999900");
        // 等同query1，如果没有指明要搜索的字段则使用默认值name
        Query query2 = parser.parse(
                "(\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 AND price:999900");

        System.out.println("************** query1  ************");
        doSearch(query1, indexSearcher);

        System.out.println("************** query2  ************");
        doSearch(query2, indexSearcher);

        Query query3 = parser.parse(
                "(\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 AND price:[800000 TO 1000000]");

        System.out.println("************** query3  ************");
        doSearch(query3, indexSearcher);

        // 为什么query3查不出结果？？？ 该如何改
        BooleanQuery bquery = new BooleanQuery.Builder()
                .add(parser
                        .parse("(\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 "),
                        Occur.MUST)
                .add(IntPoint.newRangeQuery("price", 800000, 1000000),
                        Occur.MUST)
                .build();

        System.out.println("************** bquery  ************");
        doSearch(bquery, indexSearcher);

        /**
         * 用法2  传统解析器-多默认字段  MultiFieldQueryParser：
         */
        String[] multiDefaultFields = { "name", "type", "simpleIntro" };
        MultiFieldQueryParser multiFieldQueryParser = new MultiFieldQueryParser(
                multiDefaultFields, analyzer);
        // 设置默认的操作
        multiFieldQueryParser.setDefaultOperator(Operator.OR);
        Query query4 = multiFieldQueryParser.parse("笔记本电脑 AND price:1999900");

        System.out.println("************** query4  ************");
        doSearch(query4, indexSearcher);

        /**
         *  用法3  新解析框架的标准解析器：StandardQueryParser：
         */
        StandardQueryParser queryParserHelper = new StandardQueryParser(
                analyzer);
        // 设置默认字段
        // queryParserHelper.setMultiFields(CharSequence[] fields);
        // queryParserHelper.setPhraseSlop(8);
        // Query query = queryParserHelper.parse("a AND b", "defaultField");
        Query query5 = queryParserHelper.parse(
                "(\"联想笔记本电脑\" OR simpleIntro:英特尔) AND type:电脑 AND price:1999900",
                "name");

        System.out.println("************** query5  ************");
        doSearch(query5, indexSearcher);

        // 使用完毕，关闭、释放资源
        indexReader.close();
        directory.close();
    }

    private static void doSearch(Query query, IndexSearcher indexSearcher)
            throws IOException {
        // 打印输出查询
        System.out.println("query:  " + query.toString());

        // 搜索，得到TopN的结果（结果中有命中总数，topN的scoreDocs（评分文档（文档id，评分）））
        TopDocs topDocs = indexSearcher.search(query, 10); // 前10条

        System.out.println("**** 查询结果 ");
        // 获得总命中数
        System.out.println("总命中数：" + topDocs.totalHits);
        // 遍历topN结果的scoreDocs,取出文档id对应的文档信息
        for (ScoreDoc sdoc : topDocs.scoreDocs) {
            // 根据文档id取存储的文档
            Document hitDoc = indexSearcher.doc(sdoc.doc);
            System.out.println("-------------- docId=" + sdoc.doc + ",score="
                    + sdoc.score);
            // 取文档的字段
            System.out.println("prodId:" + hitDoc.get("prodId"));
            System.out.println("name:" + hitDoc.get("name"));
            System.out.println("simpleIntro:" + hitDoc.get("simpleIntro"));
            System.out.println("price:" + hitDoc.get("price"));

            System.out.println();
        }
    }
}
```

2. 使用查询解析器前需考虑三点

  - 查询字符串应是由人输入的，而不应是你编程产生。如果你为了用查询解析器，而在你的应用中编程产生查询字符串，不可取，更应该直接使用基本查询API;

  - 未分词的字段，应直接使用基本查询API加入到查询中，而不应使用查询解析器；

  - 对于普通文本字段，使用查询解析器，而其他值字段：如 时间、数值，则应使用基本查询API

  - 查询描述规则语法（查询解析语法）

3. 查询描述规则语法（查询解析语法）

3.1 Term 词项：

　　单个词项的表示：     电脑

　　短语的表示： "联想笔记本电脑"

3.2 Field 字段：

字段名: 

　　示例： name:“联想笔记本电脑” AND type:电脑

　　如果name是默认字段，则可写成： “联想笔记本电脑” AND type:电脑

　　如果查询串是：type:电脑 计算机 手机，只有第一个是type的值，后两个则是使用默认字段，翻译为type:动脑 OR name：计算机 OR name：手机

3.3 Term Modifiers 词项修饰符：

通配符：

`?` 单个字符

`*` 0个或多个字符

示例：`te?t test* te*t`

注意：通配符不可用在开头。

模糊查询，词后加 `~`

示例： `roam~`

模糊查询最大支持两个不同字符。

示例： `roam~1`

正则表达式： `/xxxx/`

示例： `/[mb]oat/`

临近查询，短语后加 ~移动值

示例： `"jakarta apache"~10`

范围查询：

```json
mod_date:[20020101 TO 20030101]       包含边界值

title:{Aida TO Carmen} 不包含边界值
```

词项加权:

使该词项的相关性更高，通过 ^数值来指定加权因子，默认加权因子值是1

示例：如要搜索包含 jakarta apache 的文章，jakarta更相关，则：

`jakarta^4 apache`

短语也可以： `"jakarta apache"^4 "Apache Lucene"`

3.4  Boolean 操作符

Lucene支持的布尔操作： `AND, “+”, OR, NOT ,"-"`

AND：

`"jakarta apache" AND "Apache Lucene"`

`+` 必须包含：

`+jakarta lucene`

OR：

`"jakarta apache" jakarta = "jakarta apache" OR jakarta`

NOT 非：

`"jakarta apache" NOT "Apache Lucene“`

注意：NOT不可单项使用： `NOT “Apache Lucene“` 是不对的

`-` 同NOT：

`"jakarta apache" -"Apache Lucene“`

3.5 组合 `()`

字句组合：

`(jakarta OR apache) AND website`

字段组合：

`title:(+return +"pink panther")`

3.6  转义 `\`

对语法字符： `+ - && || ! ( ) { } [ ] ^ “ ~ * ? : \ /`     进行转义。

如要查询包含 `(1+1):2` 需要转义为 `\(1\+1\)\:2`

> 原文：https://www.cnblogs.com/leeSmall/p/9027172.html

[001]: ./img/lucene/02/1.jpg
[1]: ./img/lucene/06/1.jpg
[2]: ./img/lucene/06/2.jpg
[3]: ./img/lucene/06/3.jpg
[4]: ./img/lucene/06/4.jpg
[5]: ./img/lucene/06/5.jpg
[6]: ./img/lucene/06/6.png
[7]: ./img/lucene/06/7.png
[8]: ./img/lucene/06/8.png
[9]: ./img/lucene/06/9.png
[10]: ./img/lucene/06/10.jpg
[11]: ./img/lucene/06/11.jpg
[12]: ./img/lucene/06/12.jpg
[13]: ./img/lucene/06/13.jpg
