Solr系列二：solr-部署详解（solr两种部署模式介绍、独立服务器模式详解、SolrCloud分布式集群模式详解）
===

## solr两种部署模式介绍

Standalone Server 独立服务器模式：适用于数据规模不大的场景

SolrCloud  分布式集群模式：适用于数据规模大，高可靠、高可用、高并发的场景

## 独立服务器模式详解

1. 独立服务器模式架构

![1][1]

说明：

1、每个solr服务器实例（启动的一个solr服务器进程）都有一个solr主目录（系统变量名为：solr.solr.home）。启动服务器实例时须为实例指定主目录（默认为：server/solr目录）。

2、solr主目录中存放该服务器实例托管的内核。

3、一个solr服务器实例中可托管多个内核。

2. Solr主目录介绍

每个主目录下都有一个solr服务器实例配置文件solr.xml。 solrCloud模式下solr.xml可放置在zk上。

mycore、new_core：内核

solr.xml：配置文件

创建一个主目录（复制solr.xml），在它之上启动一个服务实例

启动命令：solr.cmd start -s D:/test/solrhome -p 8984

3. solr命令介绍

启动服务器实例命令：

bin/solr start [options]

bin/solr start -help

bin/solr restart [options]

bin/solr restart -help

注意：重启要用和启动时一样的options

启动时指定solr主目录的命令：solr.cmd start -s D:/test/solrhome -p 8984

查看本机上运行的solr服务实例的状态：bin/solr status

停止solr服务实例：

bin/solr stop [options]

bin/solr stop -help

停止单个服务：

bin/solr stop –p port

停止所有solr实例：

bin/solr stop -all

4. core  内核详解

4.1 内核以及内核的用途

内核：是在Solr服务器中的具体唯一命名的、可管理和可配置的索引。一台solr服务器可以托管一个或多个内核。

内核的典型用途：区分不同模式的文档

4.2 core 内核管理：

创建内核

bin/solr create [options]

bin/solr create –help

bin/solr create_core [options]

bin/solr create_core -help

示例：

bin/solr create –c mycore –p 8983

`-c <name>` 内核的名字(必需).

`-d <confdir>` 内核配置目录。默认_default.

`-p <port>` 创建命令要发送到的solr服务实例的端口。如未指定则获取本机运行的solr服务实例列表的第一个。

删除内核

bin/solr delete [options]

bin/solr delete -help

 示例：

bin/solr delete –c corename –p port

4.3 core 内核目录结构

![2][2]

内核属性文件core.properties的作用：配置内核的一些配置、作为内核的标识在启动solr的时候加载内核

 注意：可以看到集群模式下是没有conf目录的，这是因为集群模式的conf是放在zk下给所有的内核使用的

内核配置文件目录

![3][3]

## SolrCloud分布式集群模式详解

1. 为什么需要分布式集群模式？
源于需求：

  1. 索引数据量大

  如何存储？ 如何保证搜索性能？

  2. 如何保证高可靠、高可用？

  3. 如何应对高并发、实时响应需求？

索引将被如何存储？

分割成多个片存储到集群的不同节点上，每个分片有备份，存储在集群的不同节点上。

 独立服务器上索引叫内核，那集群上索引叫什么？

 solrCloud中以 collection（集合）来称呼索引，内核存储的是集合分片（shard）的备份（replication）

2. SolrCloud分布式集群架构  

![4][4]

3. 分布式集群模式启动

3.1  启动zookeeper

独立的zookeeper，则需先启动zookeeper

内嵌的zookeeper，则先启动包含zookeeper的solrNode

3.2 启动solrNode

内嵌的zookeeper的第一个solrNode节点服务启动:

 bin/solr start –c –p port –s solrhome

其他solr节点的启动:

bin/solr start –c –p port –s solrhome –z zkhost:port

 注意：启动的zookeeper实例的端口为 slor实例的端口+1000

在浏览器输入地址http://localhost:8983/solr查看现在的solr的web控制台有什么变化

**创建集合 collection**

 集合—分片数2---备份因子2

 solr.cmd create –c collection01 –d _default –shards 2 –replicationFactor 2 –p 8983

说明：在8983这个solr实例上使用默认配置_default创建一个集合collection01，这个集合有2个分片，每个分片有2个备份

 solr.cmd create –c collection02 –d sample_techproducts_configs –shards 2 –replicationFactor 2 –p 8983

 说明：在8983这个solr实例上使用默认配置sample_techproducts_configs创建一个集合collection02，这个集合有2个分片，每个分片有2个备份

创建完成以后就可以在solr的管理页面看到创建的集合了

提交数据到集合collection02中：

Linux/Mac;

solr-7.3.0:$ bin/post -c collection02 example/exampledocs/*

Windows:

java -jar -Dc=collection02 -Dauto example\exampledocs\post.jar example\exampledocs\*

执行完以后就可以在集合的备份内核中看到提交的数据了

> 原文：https://www.cnblogs.com/leeSmall/p/9094946.html

[1]: ./img/solr/02/1.jpg
[2]: ./img/solr/02/2.jpg
[3]: ./img/solr/02/3.jpg
[4]: ./img/solr/02/4.jpg
