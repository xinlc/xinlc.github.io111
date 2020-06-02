---
title: MySQL 之 七七八八
date: 2019-12-18 13:38:00
categories: Database
tags:
  - MySQL
---

MySQL记录——七七八八

<!--more-->

## Mysql 悲观锁（for update)

加锁(sql 最后加 FOR UPDATE)：

检索的时候 如果检索条件不是主键和索引，有没有结果都会锁整表。

有主键或其他索引有结果，行级锁，没结果，不会锁。

由于MySQL的行锁是针对索引加的锁，不是针对记录加的锁，所以虽然是访问不同行的记录，但是如果是使用相同的索引键，是会出现锁冲突的。应用设计的时候要注意这一点。使用 explain 检查两条SQL的执行计划，查看索引设计是否合理。

解锁：

1. 执行相同条件的 update
2. 执行 commit 或当前事务结束
3. 退出数据库 logout

## MySQL 查看索引相关

### 在sys库中查看没用的索引

```sql
select * from sys.schema_unused_indexes;
```

### 通过show status like '%Handler_read%'方法查看索引读取情况

```sql
show status like '%Handler_read%';
```

- Handler_read_key：这个值代表了一个行将索引值读的次数，很低的值表明增加索引得到的性能改善不高，因为索引并不经常使用；
- Handler_read_rnd_next：的值高则查询低效，并且应该建立索引补救。这个值是指在数据文件中读下一行的请求数。如果正进行大量的表扫描，Handler_read_rnd_next的值较高，则通常说明表索引不正确或查询没有利用索引；

### 通过 performance_schema 查询 test1 表索引情况的查询语句

```sql
select object_type,object_schema,object_name,index_name,count_star,count_read,COUNT_FETCH from performance_schema.table_io_waits_summary_by_index_usage where object_name='test1';
```

## 使用 explain 查看具体某一个sql的索引使用情况

```sql
explain select * from test1 where id=1;
```

字段说明:

### id: 选中标识符

SELECT识别符。这是SELECT的查询序列号
我的理解是SQL执行的顺序的标识，SQL从大到小的执行

1. id相同时，执行顺序由上至下
2. 如果是子查询，id的序号会递增，id值越大优先级越高，越先被执行
3. id如果相同，可以认为是一组，从上往下顺序执行；在所有组中，id值越大，优先级越高，越先执行

### select_type: 表示查询的类型

查询中每个select子句的类型

- SIMPLE(简单SELECT，不使用UNION或子查询等)；
- PRIMARY(子查询中最外层查询，查询中若包含任何复杂的子部分，最外层的select被标记为PRIMARY)；
- UNION(UNION中的第二个或后面的SELECT语句)；
- DEPENDENT UNION(UNION中的第二个或后面的SELECT语句，取决于外面的查询)；
- UNION RESULT(UNION的结果，union语句中第二个select开始后面所有select)；
- SUBQUERY(子查询中的第一个SELECT，结果不依赖于外部查询)；
- DEPENDENT SUBQUERY(子查询中的第一个SELECT，依赖于外部查询)；
- DERIVED(派生表的SELECT, FROM子句的子查询)；
- UNCACHEABLE SUBQUERY(一个子查询的结果不能被缓存，必须重新评估外链接的第一行)；

### table

显示这一步所访问数据库中表名称（显示这一行的数据是关于哪张表的），有时不是真实的表名字，可能是简称，例如上面的e，d，也可能是第几步执行的结果的简称。

### type：表示表的连接类型

对表访问方式，表示MySQL在表中找到所需行的方式，又称“访问类型”。

常用的类型有： ALL、index、range、 ref、eq_ref、const、system、NULL（从左到右，性能从差到好）

- all：全表扫描；
- index：全索引扫描；index与ALL区别为index类型只遍历索引树；
- rang：索引范围扫描；只检索给定范围的行，使用一个索引来选择行；
- ref：Join 语句中被驱动表索引引用查询；表示上述表的连接匹配条件，即哪些列或常量被用于查找索引列上的值；
- eq_ref：最多只会有一条匹配结果，一般是通过主键或者唯一键索引来访问；类似ref，区别就在使用的索引是唯一索引，对于每个索引键值，表中只有一条记录匹配，简单来说，就是多表连接中使用primary key或者 unique key作为关联条件；
- const：读常量，且最多只会有一条记录匹配，由于是常量，所以实际上只需要读一次；当MySQL对查询某部分进行优化，并转换为一个常量时，使用这些类型访问。如将主键置于where列表中，MySQL就能将该查询转换为一个常量；
- system：系统表，表中只有一行数据；system是const类型的特例，当查询的表只有一行的情况下，使用system；
- index_merge：查询中同时使用两个（或更多）索引，然后对索引结果进行merge 之后再读取表数据；
- index_subquery：子查询中的返回结果字段组合是一个索引（或索引组合），但不是一个主键或者唯一索引；
- ref_or_null：与ref 的唯一区别就是在使用索引引用查询之外再增加一个空值的查询；
- unique_subquery：子查询中的返回结果字段组合是主键或者唯一约束；

### possible_keys

指出MySQL能使用哪个索引在表中找到记录，查询涉及到的字段上若存在索引，则该索引将被列出，但不一定被查询使用（该查询可以利用的索引，如果没有任何索引显示 null）

该列完全独立于EXPLAIN输出所示的表的次序。这意味着在possible_keys中的某些键实际上不能按生成的表次序使用。

如果该列是NULL，则没有相关的索引。在这种情况下，可以通过检查WHERE子句看是否它引用某些列或适合索引的列来提高你的查询性能。如果是这样，创造一个适当的索引并且再次用EXPLAIN检查查询

### key

key列显示MySQL实际决定使用的键（索引），必然包含在possible_keys中

如果没有选择索引，键是NULL。要想强制MySQL使用或忽视possible_keys列中的索引，在查询中使用FORCE INDEX、USE INDEX或者IGNORE INDEX。

### key_len

表示索引中使用的字节数，可通过该列计算查询中使用的索引的长度（key_len显示的值为索引字段的最大可能长度，并非实际使用长度，即key_len是根据表定义计算而得，不是通过表内检索出的）

不损失精确性的情况下，长度越短越好。

### ref

列与索引的比较，表示上述表的连接匹配条件，即哪些列或常量被用于查找索引列上的值。

列出是通过常量（const），还是某个表的某个字段（如果是join）来过滤（通过key）
的。

### rows

估算出结果集行数，表示MySQL根据表统计信息及索引选用情况，估算的找到所需的记录所需要读取的行数

MySQL所认为的它在找到正确的结果之前必须扫描的记录数。显然，这里最理想的数字就是1。

### Extra

该列包含MySQL解决查询的详细信息,有以下几种情况：

- Using where：不用读取表中所有信息，仅通过索引就可以获取所需数据，这发生在对表的全部的请求列都是同一个索引的部分的时候，表示mysql服务器将在存储引擎检索行后再进行过滤；
- Using temporary：表示MySQL需要使用临时表来存储结果集，常见于排序和分组查询，常见 group by ; order by；
- Using filesort：当Query中包含 order by 操作，而且无法利用索引完成的排序操作称为“文件排序”；
- Using join buffer：改值强调了在获取连接条件时没有使用索引，并且需要连接缓冲区来存储中间结果。如果出现了这个值，那应该注意，根据查询的具体情况可能需要添加索引来改进能；
- Impossible where：这个值强调了where语句会导致没有符合条件的行（通过收集统计信息不可能存在结果）；
- Select tables optimized away：这个值意味着仅通过使用索引，优化器可能仅从聚合函数结果中返回一行；
- No tables used：Query 语句中使用 from dual 或不含任何 from 子句；

## mysql 中 tinyint、smallint、int、bigint 的区别

tinyint

从 -2^7 (-128) 到 2^7 - 1 (127) 的整型数据。存储大小为 1 个字节。

unsigned 是从 0 到 255 的整型数据。

所以建表的时候 只能是 tinyint(3),哪怕你建 tinyint(100)，他最大还是 3 位这么多。

smallint

从 -2^15 (-32,768) 到 2^15 - 1 (32,767) 的整型数据。存储大小为 2 个字节。

unsigned 是从 0 到 65535 的整型数据。

所以建表的时候 只能是 smallint(5),哪怕你建 smallint(100)，他最大还是 5 位这么多。

int

从 -2^31 (-2,147,483,648) 到 2^31 - 1 (2,147,483,647) 的整型数据（所有数字）.存储大小为 4 个字节。

unsigned 是从 0 到 4294967296 的整型数据。

所以建表的时候 只能是 int(10),哪怕你建 int(100)，他最大还是 10 位这么多。

bigint

从 -2^63 (-9,223,372,036,854,775,808) 到 2^63-1 (9,223,372,036,854,775,807) 的整型数据（所有数字）。存储大小为 8 个字节。

unsigned 是(自己算吧)

所以建表的时候 只能是 bigint(20),哪怕你建 bigint(100)，他最大还是 20 位这么多.

注意：

mysql 提供了五种整型： tinyint、smallint、mediumint、int 和 bigint。int 为 integer 的缩写。这些类型在可表示的取值范围上是不同的。 整数列可定义为 unsigned 从而禁用负值；这使列的取值范围为 0 以上。各种类型的存储量需求也是不同的。取值范围较大的类型所需的存储量较大。

mysql 提供三种浮点类型： float、double 和 decimal。与整型不同，浮点类型不能是 unsigned 的，其取值范围也与整型不同，这种不同不仅在于这些类型有最大 值，而且还有最小非零值。最小值提供了相应类型精度的一种度量，这对于记录科学数据来说是非常重要的（当然，也有负的最大和最小值）。

## 为什么 int 类型字段在 mysql 中默认 int(11) 无符号默认 int(10)

int 类型在数据库中占 4 个字节（byte）,即 32 位

int 有符号类型 取值在 - 2147483648 ~ 2147483647 之间

int 无符号类型 取值在 0 ~ 4294967295 之间

```bash
有符号数最小值:
 - 2 1 4 7 4 8 3 6 4  8
 1 2 3 4 5 6 7 8 9 10 11    --共11位

 无符号数最大值:
 4 2 9 4 9 6 7 2 9 5
 1 2 3 4 5 6 7 8 9 10        --共10位
```

所以 mysql 默认显示的 int（11）和 unsign int（10）,只是表示存储数值显示后的位数，并不是实际存储的位数。

## Mysql text 可以存多少个汉字

以 utf8 编码计算的话

LANGTEXT：4294967295/3=1431655765 个汉字，14 亿，存储空间占用：4294967295/1024/1024/1024=4G 的数据；

MEDIUMTEXT：16777215/3=5592405 个汉字，560 万，存储空间占用：16777215/1024/1024=16M 的数据；

TEXT：65535/3=21845 个汉字，约 20000，存储空间占用：65535/1024=64K 的数据；

## Mysql事务隔离级别和MVCC

### 事务的基本要素（ACID）

- `原子性（Atomicity）`：事务开始后所有操作，要么全部做完，要么全部不做，不可能停滞在中间环节。事务执行过程中出错，会回滚到事务开始前的状态，所有的操作就像没有发生一样。也就是说事务是一个不可分割的整体，就像化学中学过的原子，是物质构成的基本单位；
- `一致性（Consistency）`：事务开始前和结束后，数据库的完整性约束没有被破坏 。比如A向B转账，不可能A扣了钱，B却没收到；
- `隔离性（Isolation）`：同一时间，只允许一个事务请求同一数据，不同的事务之间彼此没有任何干扰。比如A正在从一张银行卡中取钱，在A取钱的过程结束前，B不能向这张卡转账；
- `持久性（Durability）`：事务完成后，事务对数据库的所有更新将被保存到数据库，不能回滚；

### 三种问题

- `脏读(Drity Read)`：事务A读取了事务B更新的数据，然后B回滚操作，那么A读取到的数据是脏数据；
- `不可重复读(Non-repeatable read)`：事务 A 多次读取同一数据，事务 B 在事务A多次读取的过程中，对数据作了更新并提交，导致事务A多次读取同一数据时，结果 不一致；
- `幻读(Phantom Read)`：系统管理员A将数据库中所有学生的成绩从具体分数改为ABCDE等级，但是系统管理员B就在这个时候插入了一条具体分数的记录，当系统管理员A改结束后发现还有一条记录没有改过来，就好像发生了幻觉一样，这就叫幻读；

> 不可重复读的和幻读很容易混淆，不可重复读侧重于修改，幻读侧重于新增或删除。解决不可重复读的问题只需锁住满足条件的行，解决幻读需要锁表

### 四种隔离级别

- `Read Uncommitted（读取未提交内容）`：可能读取其它事务未提交的数据。不能避免：脏读+不可重复读+幻读；
- `Read Committed（读取提交内容）`：一个事务只能看见已经提交事务所做的改变。但同一事务的其他实例在该实例处理其间可能会有新的commit，所以同一select可能返回不同结果。不能避免：不可重复读+幻读；
- `Repeatable Read（可重读）`：它确保同一事务的多个实例在并发读取数据时，会看到同样的数据行。不能避免：幻读；
- `Serializable（可串行化）`：这是最高的隔离级别，它通过强制事务排序，使之不可能相互冲突，从而解决幻读问题。简言之，它是在每个读的数据行上加上共享锁。在这个级别，可能导致大量的超时现象和锁竞争；

事务隔离级别 | 脏读 | 不可重复读 | 幻读
----|----|----|----
读未提交（read-uncommitted）| 是 | 是 | 是
不可重复读（read-committed）| 否 | 是 | 是
可重复读（repeatable-read）| 否 | 否 | 是
串行化（serializable）| 否 | 否 | 否

### Mysql默认隔离级别

文档上写的都是：Repeatable Read，也就是说可能会出现幻读。但是注意 Innodb 引擎下不存在幻读！

MySQL InnoDB存储引擎，实现的是基于多版本的并发控制协议——MVCC (Multi-Version Concurrency Control) 在Repeatable Read (RR)隔离级别下不存在幻读。

#### 普通MVCC

- 每行数据都存在一个版本，每次数据更新时都更新该版本；
- 修改时Copy出当前版本随意修改，各个事务之间无干扰；
- 保存时比较版本号，如果成功（commit），则覆盖原记录；失败则放弃copy（rollback）；

就是每行都有版本号，保存时根据版本号决定是否成功，听起来含有乐观锁的味道

#### Innodb的实现方式

- 事务以排他锁的形式修改原始数据；
- 把修改前的数据存放于undo log，通过回滚指针与主数据关联；
- 修改成功（commit）啥都不做，失败则恢复undo log中的数据（rollback）；

二者最本质的区别是，当修改数据时是否要排他锁定，如果锁定了还算不算是MVCC？

- `读锁`：也叫共享锁、S锁，若事务T对数据对象A加上S锁，则事务T可以读A但不能修改A，其他事务只能再对A加S锁，而不能加X锁，直到T释放A上的S 锁。这保证了其他事务可以读A，但在T释放A上的S锁之前不能对A做任何修改；
- `写锁`：又称排他锁、X锁。若事务T对数据对象A加上X锁，事务T可以读A也可以修改A，其他事务不能再对A加任何锁，直到T释放A上的锁。这保证了其他事务在T释放A上的锁之前不能再读取和修改A；
- `表锁`：操作对象是数据表。Mysql大多数锁策略都支持(常见mysql innodb)，是系统开销最低但并发性最低的一个锁策略。事务t对整个表加读锁，则其他事务可读不可写，若加写锁，则其他事务增删改都不行；
- `行级锁`：操作对象是数据表中的一行。是MVCC技术用的比较多的，但在MYISAM用不了，行级锁用mysql的储存引擎实现而不是mysql服务器。但行级锁对系统开销较大，处理高并发较好；

> Innodb的实现真算不上MVCC，因为并没有实现核心的多版本共存，undo log中的内容只是串行化的结果，记录了多个事务的过程，不属于多版本共存。但理想的MVCC是难以实现的，当事务仅修改一行记录使用理想的MVCC模式是没有问题的，可以通过比较版本号进行回滚；但当事务影响到多行数据时，理想的MVCC据无能为力了。理想MVCC难以实现的根本原因在于企图通过乐观锁代替二段提交。修改两行数据，但为了保证其一致性，与修改两个分布式系统中的数据并无区别，而二段提交是目前这种场景保证一致性的唯一手段。二段提交的本质是锁定，乐观锁的本质是消除锁定，二者矛盾。

> 二段提交：参与者将操作成败通知协调者，再由协调者根据所有参与者的反馈情报决定各参与者是否要提交操作还是中止操作。

### 更改事务隔离级别

```bash
# 查看隔离级别
select @@tx_isolation;

# 设置当前事务为 read uncommitted（未提交读）
set session transaction isolation level read uncommitted;
start transaction;
```

## 将编码由utf8改为utf8mb4

查看数据库编码：

```sql
show variables like 'character%';
```

```sql
show variables like '%colla%';
```

修改配置文件 my.ini：

```bash
[client]
default-character-set = utf8mb4

[mysql]
default-character-set = utf8mb4

[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
init_connect='SET NAMES utf8mb4'
```

> 重启 mysql

## Innodb 行格式

表的行格式决定了它的每行数据是怎么物理存储的，其对查询和DML操作也是有影响。每个磁盘页存的行数越多，查询和索引的查找就越快，缓冲池需要的内存也越少，同时也能减少更新数据的I/O。

每个表的数据都被分成多个页，这些页都存在一个叫B-树索引的树数据结构中。表数据和非主键索引都用这种数据结构。保存了整个表数据的B-树索引叫做聚簇索引，它是根据表的主键来进行组织的。聚簇索引树的节点保存了一行的所有列的值，非主键索引的节点只包含索引列和主键列的值。

变长列在B-树索引节点的存储策略不太一样，如果长度超过了B-树页的长度，则它们会保存在单独申请的磁盘页中，即溢出页。这些列也叫做off-page列。off-page列的值保存在多个溢出页中，这些溢出页使用单独的链表连接在一起，每个列都有它自己的溢出页链表。为了避免浪费空间或者读取额外的页数据，当列长度超过B-树页大小时，会将变长列的部分前缀串保存在B-树种。

InnoDB存储引擎支持的行格式： REDUNDANT, COMPACT, DYNAMIC, COMPRESSED，FIXED。

Version 5.6 已经默认使用 Compact，Version 5.7 默认使用Dynamic，Redundant 是比较老的数据格式，Compressed 不能应用在System data，所以Compact和Dynamic应用较广泛。

### REDUNDANT 行格式

REDUNDANT兼容MySQL的旧版本。
表存储变长列(varchar,varbinary,blob,text)的前768个字节在B-树的索引节点中，剩下的保存在溢出页中。固定长度列大小大于等于768字节时，会被当做变长列处理，保存在off-page中。比如，当列的字符集使用的是utf8mb4时，char(255)的列有可能超过768字节，因为utf8mb4字符的最大字符字节长度为4字节，255*4 = 1020 > 768。

如果列大小不超过768字节，则不会用到溢出页，这样就能节省一点I/O消耗。这对于相对较短的blob列来说，不会有很大影响，但有可能导致B-树节点空间被这些数据占满，这样节点可存放的索引量较少，影响性能。一个表，有太多blob列的话，就会导致B-树节点太满，能保存的行数更少，索引效率也就更低了。

REDUNDANT 存储特性：

- 每个索引节点包含6字节头信息，用来连接其他的行以及行锁时用；
- 聚集索引包含所有的数据列，因此也包含了6字节的事务ID和7字节的回滚指针id；
- 如果没有定义表主键的话，每个聚集索引的节点会自动添加一个6字节的row ID；
- 每个辅助索引记录包含所有的主键列
- 每个记录包含一个指向每个字段的指针，如果所有字段的总长度小于128字节，指针是一个字节大小；否则，为2字节大小。指针数组被叫做记录目录。指针所指向的区域为记录的数据部分；
- 在系统内部，固定长度的字符列，如char(10)是以固定长度存储的，尾部空格不会被截断；
- 大于等于768字节的固定长度列会被编码成变长列，可以存储在溢出中。如，char(255)，当使用字符编码位utf8mb4时，它长度就可能超过768字节，因为utf8mb4字符最大的字节长度为4字节；
- 可NULL值的列需要在记录目录预留一到两个字节。如果列是变成的话，NULL值在记录的数据部分是不需要存储空间的。对于固定长列，数据部分是要预留固定长度空间的。预留固定长度给NULL值得列使得当列值从NULL变为非NULL时，不会引起索引页锁片；

### COMPACT 行格式

compact行格式可以比redundant行格式较少20%的行存储空间，但是某些操作会增加cpu使用负担。如果服务器受限于缓存命中率和磁盘速度的话，compact格式可能会更快。如果受限于cpu速度的话，compact可能会更慢。

使用compact格式的表存储变长列(varchar, varbinary, blob, text)的开头的768字节在索引记录结点,剩下的存储在溢出页中。大于等于768字节的固定长度列会被编码成变长列，可以存储在off-page中。比如，varchar(255), 当使用utfbmb4编码时，就可能超过768字节了。

如果列大小不超过768字节，则不会使用溢出页，这样就能节省一些I/O开销，因为值直接在B-tree结点就可以获取了。这个对于短的blob列也是有好处的，但是这样会导致B-tree索引节点都被数据填充了（每页存储的行记录就更少了，页是数据库存储的基本单位），而存储的键值更少了，降低了效率。如果一个表有很多blob列，就会导致B-tree索引节点太满，存储的行数太少，使得整个索引的效率就大大降低了。

COMPACT 行格式存储特性：

- 每个索引记录包含5字节头信息，可能用来处理变长字段的信息。用来连接相连的记录及行锁；
- 记录的变长部分头信息，包含一个位向量用来标记可为NULL值的列的值是否为NULL。如果可为NULL值的列数量为N，位向量的大小为ceiling（N/8）字节（向上取整）。(比如，如果有15个列可为NULL，则位向量的大小就为2字节)。NULL值的列除了位向量的空间外，就不需要其他的存储空间了。变长部分头信息同样也包含了每个变长列的长度，每个长度需要1或者2字节，取决于列的最大长度。（比如，varchar(100)只需要1字节，varchar（256）则需要两字节）。如果索引上所有的都是NOT NULL并且是固定长度的，则记录头信息就没有变长部分；
- 对于每个非NULL的变长列，记录头包含1到2字节来记录列的长度。只有当列存储到外部溢出页或者列最大长度超过255字节或者实际长度超过127字节时才使用2个字节。对于外部存储列，2字节长度包含的是内部存储部分长度外加20个字节的指针长度，用来指向外部存储部分的地址。内部存储是768字节，所以长度是768+20字节。20字节里包含了列的实际长度；
- 记录头信息后紧跟着是非NULL列的数据部分；
- 聚集索引的记录包含了用户定义的所有列，同时有额外的6字节用来存储事务ID和7字节回滚指针；
- 如果没有定义主键的话，每个聚集索引记录还会包含6字节的行ID记录；
- 每个辅助索引记录包含所有的主键列，如果主键列有变长的话，每个辅助索引的记录头会有一个变长部分用来记录他们的长度，即使辅助索引是建立在固定长的列上的；
- 系统内，对于非变长编码的字符集来说，固定长字符列如char(10)是以固定长度保存的，尾部空格也不会从变长列截断；
- 系统内，对于变长字符集如utf8mb3/utf8mb4，InnoDB试图将char(N)存储为N字节，对于尾部的空格会过滤掉。如果char(N)列的字节超过了N字节，尾部空格被调整为列值的最小字节长度。char(N)的最大长度为字符最大字节长度xN。char(N)预留最少N字节，大多数情况下都可以使列能够在原地更新而不会导致索引页碎片。对于redundant格式来说，char(N)需要预留字符最大长度xN字节的空间。大于等于768字节的固定长列被编码成变长列，可以存储在off-page中。如varchar(255)，当使用utf8mb4时，最大长度就超过了768字节；

### DYNAMIC 行格式

DYNAMIC格式和compact格式的存储特性是一样的，不一样的是它增强了对于较长变长列的存储能力及支持更大的索引前缀。

DYNAMIC格式的表，可以将较长的变长列（varchar、varbinary、blob、text）全部存储在off-page中，而聚集索引记录里只需要保存20字节长度的指针指向溢出页。大于等于768字节的固定长度列被编码为变长列。。如varchar(255)，当使用utf8mb4时，最大长度就超过了768字节。

列是否存储在off-page，取决于页大小和行的总大小。当一行太长时，最长的那些列被选择为存到off-page直到聚集索引记录页大小足够存下此列。不超过40字节的text和blob存储在一行。

DYNAMIC格式存储整行数据在索引节点，保持了效率（redundant和compact也是如此），但是DYNAMIC格式避免了B-tree节点都被长字段数据填充带来的低效。DYNAMIC格式是基于，通常情况下，将整个字段保存在off-page比部分数据存储在off-page更有效。DYNAMIC格式中，较短的列更有可能保存在B-tree索引节点，最小化行需要的溢出页数量。

DYNAMIC格式支持最大的3072字节的索引前缀。

DYNAMIC格式的表可以存储在system tablespace, file-per-table，tablespaces, 及general tablespaces中。可以通过禁用 innodb_file_per_table 或者使用create table、alter table的tablespace[=] innodb_system选项设置。innodb_file_per_table变量不可用于
general tablespaces和当使用TABLESPACE [=] innodb_system表选项将DYNAMIC表存储在系统表空间中。

DYNAMIC格式是compact格式的变种，存储特性和COMPACT格式一样。

### COMPRESSED 行格式

COMPRESSED格式和DYNAMIC存储特性一样，同时提供了表和索引数据的压缩处理。

COMPRESSED格式使用和 DYNAMIC的类似的内部细节来处理off-page存储，且基于存储和性能的考虑，压缩表和索引数据，从而使用更小的页大小。COMPRESSED中，KEY_BLOCK_SIZE选项控制多少列数据存储在聚集索引上及多少存放在溢出页中。更多COMPRESSED格式的内容，[请参考文章15.9 InnoDB Table and Page Compression](https://dev.mysql.com/doc/refman/8.0/en/innodb-compression.html)

COMPRESSED格式支持最大前缀长度为3072字节。

COMPRESSED格式的表可以创建在 file-per-table tablespaces 和 general tablespaces中。system tablespaces不支持COMPRESSED格式。如果要将COMPRESSED格式表存储在 file-per-table tablespaces，则必须启用innodb_file_per_table 变量。innodb_file_per_table 变量不能用于general tablespaces。General tablespaces支持所有的行格式，当压缩表和非压缩表同时在General tablespaces时，会有一条告警。更多内容，[请参考15.6.3.3 General Tablespaces](https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html)

COMPRESSED格式是compact格式的变种，存储特性和COMPACT格式一样。

### FIXED 行格式

固定格式，当表不包含变长字段时使用，如varchar，blob，text。因为该行是固定的，所以存取速度相对来说比较快，但是比较占存储空间.

### 定义表的行格式

InnoDB表的默认行格式，可以通过innodb_default_row_format变量设置，默认值为DYNAMIC。当建表时没有指定ROW_FORMAT时或者指定ROW_FORMAT=DEFAULT时，就会使用系统默认的行格式。

表的行格式可以通过建表或者修改语句显式指定，如下：

```sql
CREATE TABLE t1 (c1 INT) ROW_FORMAT=DYNAMIC;
```

显式指定的ROW_FORMAT会覆盖默认的行格式设置。使用ROW_FORMAT=DEFAULT效果与隐式设置一样。
innodb_default_row_format变量可以动态配置

```sql
mysql> SET GLOBAL innodb_default_row_format=DYNAMIC;
```

innodb_default_row_format变量的有效值包括DYNAMIC、COMPACT、REDUNDANT。COMPRESSED 不支持system tablespaces表空间，不能设置为默认的行格式。COMPRESSED 只能显式的在create table或者alter table语句中指定。将innodb_default_row_format设置为COMPRESSED 会导致如下错误：

```sql
mysql> SET GLOBAL innodb_default_row_format=COMPRESSED;
ERROR 1231 (42000): Variable 'innodb_default_row_format'
can't be set to the value of 'COMPRESSED'
```

新建的表如果没有指定ROW_FORMAT或者ROW_FORMAT=DEFAULT时，将使用 innodb_default_row_format指定的行格式。如下：

```sql
CREATE TABLE t1 (c1 INT);
```

```sql
CREATE TABLE t2 (c1 INT) ROW_FORMAT=DEFAULT;
```

当ROW_FORMAT 没有显式指定或者ROW_FORMAT =DEFAULT时，重建表的操作会将表的行格式变成 innodb_default_row_format 指定的格式。

表重建操作包括使用 ALGORITHM=COPY 或者 ALGORITHM=INPLACE选项的alter table操作。更多内容[参考15.12.1 Online DDL Operations](https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html)，OPTIMIZE TABLE也是表重建操作。

下面的例子展示了表重建操作是如何静默修改那些建表时没有显式定义行格式的表的行格式的：

```sql
mysql> SELECT @@innodb_default_row_format;
+-----------------------------+
| @@innodb_default_row_format |
+-----------------------------+
| dynamic                     |
+-----------------------------+

mysql> CREATE TABLE t1 (c1 INT);

mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME LIKE 'test/t1' \G
*************************** 1. row ***************************
     TABLE_ID: 54
         NAME: test/t1
         FLAG: 33
       N_COLS: 4
        SPACE: 35
   ROW_FORMAT: Dynamic
ZIP_PAGE_SIZE: 0
   SPACE_TYPE: Single

mysql> SET GLOBAL innodb_default_row_format=COMPACT;

mysql> ALTER TABLE t1 ADD COLUMN (c2 INT);

mysql> SELECT * FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME LIKE 'test/t1' \G
*************************** 1. row ***************************
     TABLE_ID: 55
         NAME: test/t1
         FLAG: 1
       N_COLS: 5
        SPACE: 36
   ROW_FORMAT: Compact
ZIP_PAGE_SIZE: 0
   SPACE_TYPE: Single
```

考虑如下从REDUNDANT或者COMPACT转成DYNAMIC时的潜在问题。

REDUNDANT和COMPACT行格式支持最大索引前缀为767字节，而DYNAMIC和COMPRESSED支持3072字节。在一个主从环境中，如果innodb_default_row_format 变量在master上设置为DYNAMIC, 在从库上设置为COMPACT，则如下没有显式指定行格式的DDL语句，在master上将成功，在slave上执行失败：

```sql
CREATE TABLE t1 (c1 INT PRIMARY KEY, c2 VARCHAR(5000), KEY i1(c2(3070)));
```

相关内容[参考15.22 InnoDB Limits](https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html)

导入一个没有显式定义行格式的表将导致表shema不匹配错误，如果源server的innodb_default_row_format和目标server的innodb_default_row_format不一致。更多内容[参考15.6.1.3 Importing InnoDB Tables](https://dev.mysql.com/doc/refman/8.0/en/innodb-table-import.html)

修改行格式：

```sql
ALTER TABLE `t1` ROW_FORMAT = Compact;
```

```sql
ALTER TABLE `t1` ROW_FORMAT = Dynamic;
```

```sql
SHOW TABLE STATUS;
```

> 如果要修改现有表的行模式为compressed或dynamic，必须先将文件格式设置成Barracuda：set global innodb_file_format=Barracuda;，再用ALTER TABLE tablename ROW_FORMAT=COMPRESSED;去修改才能生效。

### 查看一个表的行格式

使用 SHOW TABLE STATUS命令可以查看一个表的行格式：

```sql
mysql> SHOW TABLE STATUS LIKE "test%"\G
```

```sql
mysql> SHOW TABLE STATUS IN test1\G
```

也可以通过查询 INFORMATION_SCHEMA.INNODB_TABLES 表来看：

```sql
mysql> SELECT NAME, ROW_FORMAT FROM INFORMATION_SCHEMA.INNODB_TABLES WHERE NAME='test1/t1';
```

```sql
show variables like "innodb_file_format";
```

## mysql锁表查询和解锁操作

在做数据库操作时，有时会因为自己的粗心或者程序设计上的缺陷导致锁表，在mysql中查看锁表和解锁的步骤如下：

```sql
-- 1. 查看当前数据库锁表的情况
SELECT * FROM information_schema.INNODB_TRX;
-- 2. 杀掉查询结果中锁表的trx_mysql_thread_id
kill trx_mysql_thread_id
```

另外一种查询锁方法：

```sql
-- 1. 查询是否锁表
show OPEN TABLES where In_use > 0;
-- 2. 查询进程
show processlist;
-- 查询到相对应的进程===然后 kill id
-- 补充：
-- 查看正在锁的事务
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCKS;
-- 查看等待锁的事务
SELECT * FROM INFORMATION_SCHEMA.INNODB_LOCK_WAITS;
```

## 问题

### MySQL server has gone away 错误的解决办法

在我们使用mysql导入大文件sql时可能会报MySQL server has gone away错误，该问题是max_allowed_packet配置的默认值设置太小，只需要相应调大该项的值之后再次导入便能成功。该项的作用是限制mysql服务端接收到的包的大小，因此如果导入的文件过大则可能会超过该项设置的值从而导致导入不成功！下面我们来看一下如何查看以及设置该项的值。

```bash
# 查看 max_allowed_packet 的值
show global variables like 'max_allowed_packet';
# +--------------------+---------+
# | Variable_name      | Value   |
# +--------------------+---------+
# | max_allowed_packet | 4194304 |
# +--------------------+---------+

# 可以看到默认情况下该项的大小只有4M，接下来将该值设置成150M(1024*1024*150)
set global max_allowed_packet=157286400;
```

通过调大该值，一般来说再次导入数据量大的sql应该就能成功了，如果任然报错，则继续再调大一些就行，请注意通过在命令行中进行设置只对当前有效，重启mysql服务之后则恢复默认值，但可以通过修改配置文件（可以在配置文件my.cnf中添加max_allowed_packet=150M即可）来达到永久有效的目的，可其实我们并不是经常有这种大量数据的导入操作，所以个人觉得通过命令行使得当前配置生效即可，没有必要修改配置文件。
