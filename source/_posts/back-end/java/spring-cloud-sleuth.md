---
title: 微服务架构之调用链监控：Spring Cloud Sleuth & CAT & Skywalking
date: 2020-03-21 13:30:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

随着系统规模越来越庞大，服务数目增加，各个服务间的调用关系也变得越来越复杂。当客户端发起一个请求时，这个请求经过多个服务后，最终返回了结果，经过的每一个服务都有可能发生延迟或错误，从而导致请求失败。这时候我们就需要请求链路跟踪工具来帮助我们，理清请求调用的服务链路，解决问题。

<!--more-->

## 调用链监控业务需求

在微服务时代，内部系统应用都是分布式的可能有几十甚至上百个服务，服务间的调用会形成复杂的网状结构，如果没有监控手段一旦出现问题很难定位。调用链监控一方面可以帮助我们快速定位错误问题和性能问题，另一方面可以帮助开发人员比较全面的理解整个系统的微服务体系。

应用监控缺失造成的坑：

- 线上发布了服务，怎么知道一切正常？
- 大量报错，到底哪里产生的，谁才是根因？
- 人工配置错误，通宵排错，劳民伤财！
- 应用程序有性能问题，怎么尽早发现问题？
- 数据库问题，在出问题之前能洞察吗？
- “网络问题”成为“最好借口”，运维如何反击？
- 任何可能出问题的地方都会出错！！！(康威定律)
- 微服务需要应用监控！！！

DevOps 实践：

- 要提升必先测量：给开发人员一把测量反馈“尺”；
- 研发自助监控：You build it, you run it, you monitor it.

## 调用链监控原理

### Google Dapper 论文

谈到调用链监控就不得不提 Google Dapper 论文，Google 在2010年之前就研发了 Dapper 分布式调用链监控系统，在 Google 内部有大规模的应用，在2010年的时候 Google 把 Dapper 的经验总结出来写成了 [论文 《Dapper, a Large-Scale Distributed Systems Tracing Infrastructure》](http://research.google.com/pubs/archive/36356.pdf)。后来社区中很多基于 Dapper 的论文实现了调用链监控比如 Zipkin。

Dapper Deployment：

![1][1]

Dapper 论文里讲解了它内部发布的架构如上图。Google 的生产机器上面都会安装 Dapper daemon 组件，应用程序会使用 Dapper 埋点过的库，应用程序在运行的时候就会把调用链写到日志文件中，Dapper daemon 就会定期到日志文件中把调用链抓取出来发送到后端 Dapper Collectors 集群。调用链最终存储到 Bigtable 中，后期就可以去 Bigtable 中查询调用链信息。

Dapper UI：

![2][2]

开发人员就可以通过 Dapper UI 查看系统调用链情况。

### 调用链核心概念

![3][3]

用户的一个请求调用了 Service1 进来的请求和出去的响应（橙色标注的）叫一个 Span（sid）， Service1 去调用了 Redis 进来和回去也叫一个 Span，Service1 又调用了 Service2 又产生了一个 Span，任何一次调用都会产生 Span，这一整个调用叫一个 Trace（tid），其中 ParentId（pid）是标识父子关系指向 sid。

- Trace：一次分布式调用的链路踪迹；
- Span：一个方法（局部或远程）调用踪迹；
- Annotation：附着在 Spane 上的日志信息；
- Sampling：采样率（0-1，1是全采样）；

## 调用链监控产品演进历史

![4][4]

2002 年 eBay 内部比较早就使用了调用链监控产品叫CAL（Centralized Application Logging）。

这个时间 Google 内部也研发了 Dapper，2010年 Google 虽没有开源 Dapper 但是发表了 Dapper 设计的论文，这篇论文可以说是现代调用链监控的鼻祖。

2011年前 eBay 架构师吴其敏来到大众点评，主导了点评的调用链系统 CAT（Centralized Application Tracking）的研发，吴其敏在 eBay工作长达十几年，对 CAL 系统有深刻的理解，CAT 不仅增强了 CAL 系统核心模型，还添加了更丰富的报表。2014年在社区开源。

2012年 Twitter 参考了 Google Dapper 论文研发了 Zipkin 调用链产品并开源。同年一家韩国公司也参考了 Dapper 论文 研发了 Pinpoint 监控产品并开源，这个产品独树一帜采用字节码注入无侵入的方式。

2015年工程师吴晟开发了 Skywalking 并借鉴了 Pinpoint 思路也采用字节码注入方式。后来他加入了华为并把这个产品推荐到了 Apache 孵化器，现在已经成为 Apache 顶级项目。

2016年Uber公司借鉴了 Zipkin 使用 Golang 研发了 Jaeger，现在是 CNCF 组织推荐的云原生产品。

## Zipkin 简介

Zipkin 是一个开放源代码分布式的跟踪系统，由 Twitter 公司开源，它致力于收集服务的定时数据，以解决微服务架构中的延迟问题，包括数据的收集、存储、查找和展现，Zipkin 的设计是基于谷歌的 Google Dapper 论文。

![5][5]

Zipkin 的服务端已经打包成了一个 jar，使用 java -jar zipkin-server.jar 启动，访问 http://localhost:9411 查看 zipkin 主页。

![6][6]

可以用 docker 或 jar 方式运行 Zipkin：

```bash
docker run -d -p 9411:9411 openzipkin/zipkin

# https://repo1.maven.org/maven2/io/zipkin/zipkin-server/2.20.2/zipkin-server-2.20.2-exec.jar
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

## Spring Cloud Sleuth 简介

Spring Cloud Sleuth 可以理解为是 Zipkin 的客户端。Zipkin 收集 Sleuth 产生的数据，并以界面的形式呈现出来。

- Spring Cloud 封装的 Zipkin 兼容客户端 Tracer
- 添加 traceId 和 spanId 到 Slf4J MDC
- 支持埋点的库
  - Hystrix
  - RestTemplate
  - Feign
  - Messaging with Spring Integration
  - Zuul
  - ...
- 支持采样策略
- 老版本基于 HTrace，最新版本基于 Brave
- 依赖
  - spring-cloud-sleuth-zipkin
  - spring-cloud-sleuth-stream

### Sleuth 集成架构

![7][7]

Spring Cloud 的组件大部分都进行了埋点，只要进入相关的 starter 就可以进行监控。日志的传送可以发送到 MQ 中或直接用 Http 发送到 Zipkin 服务端，存储可以用 Elasticsearch。

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
- Spring Cloud：Hoxton.SR1

## 给服务添加请求链路跟踪

添加依赖：

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-zipkin</artifactId>
</dependency>
```

修改 application.yml 文件，配置收集日志的 zipkin-server 访问地址：

```yaml
spring:
  zipkin:
    base-url: http://localhost:9411
  sleuth:
    web:
      enabled: true
    sampler:
      probability: 0.1 # 设置 Sleuth 的抽样收集概率
```

起两个服务并用 Service1 用 RestTemplate 调用 Service 2，然后在 Zipkin 上查看调用链信息。

### 使用 Elasticsearch 存储跟踪信息

如果把 Zipkin 重启一下就会发现刚刚的存储的跟踪信息全部丢失了，可见其是存储在内存中的，一般会存储到 Elasticsearch 中。[下载 ES](https://www.elastic.co/cn/downloads/elasticsearch/)

```bash
# 启动 ES 单节点
bin/elasticsearch -E node.name=node0 -E cluster.name=zk -E path.data=node0_data

# STORAGE_TYPE：表示存储类型 ES_HOSTS：表示ES的访问地址
java -jar zipkin.jar --STORAGE_TYPE=elasticsearch --ES_HOSTS=localhost:9200
```

## CAT 简介

CAT是大众点评开源的基础监控框架，在中间件（MVC框架、RPC框架、数据库框架、缓存框架等）得到广泛应用，为点评各个业务线提供系统的性能指标、健康状况和基础告警。

- CAT 是基于 Java 开发的实时应用监控平台，为美团点评提供了全面的实时监控告警服务。
- CAT 作为服务端项目基础组件，提供了 Java, C/C++, Node.js, Python, Go 等多语言客户端，已经在美团点评的基础架构中间件框架（MVC框架，RPC框架，数据库框架，缓存框架等，消息队列，配置系统等）深度集成，为美团点评各业务线提供系统丰富的性能指标、健康状况、实时告警等。
- CAT 很大的优势是它是一个实时系统，CAT 大部分系统是分钟级统计，但是从数据生成到服务端处理结束是秒级别，秒级定义是48分钟40秒，基本上看到48分钟38秒数据，整体报表的统计粒度是分钟级；第二个优势，监控数据是全量统计，客户端预计算；链路数据是采样计算。

CAT 产品价值：

- 减少故障发现时间
- 降低故障定位成本
- 辅助应用程序优化

CAT 优势：

- 实时处理：信息的价值会随时间锐减，尤其是事故处理过程中
- 全量数据：全量采集指标数据，便于深度分析故障案例
- 高可用：故障的还原与问题定位，需要高可用监控来支撑
- 故障容忍：故障不影响业务正常运转、对业务透明
- 高吞吐：海量监控数据的收集，需要高吞吐能力做保证
- 可扩展：支持分布式、跨 IDC 部署，横向扩展的监控系统

### CAT 监控场景

CAT 主要针对业务层和应用层监控。

![9][9]

### CAT 架构设计

CAT设计目标：

- 对应用无影响(服务端上下线、宕机等)
- 实时性(消息尽快到达服务端)
- 吞吐量(服务端高的吞吐量)
- 开销低(客户端尽可能开销低) (开销2%以内)

不是CAT的设计目标：

- 可靠性(消息100%到达服务端)
- 服务端100%的处理到达消息

### 客户端设计

![10][10]

CAT提供了 Client，Java 里就是一个 JAR 包。内部基于 ThreadLocal 机制，每次调用进来开始阶段客户端会创建消息树之后的调用都会在这个数里面创建响应的 call 节点，整个调用结束就会打包发送到 MQ 中，然后会有个 Sender 去扫描 MQ 定期发送到服务端。

> **注意**：Spring Cloud Gateway 不能使用 CAT，原因是 CAT 内部 Context 对象使用了 ThreadLocal，而 Gateway 使用异步 Netty，也就是说在发起真正的请求下游前和在得到 response 后的处理已经不是一个线程了。这样就会导致使用 ThreadLocal 产生不是我们想要的结果，即发生线程同步问题。

### 服务器端设计

![11][11]

CAT 服务器端叫消息消费机，有很多 Receiver 线程接受消息，然后丢到消费机的队列中，然后由分析器来进行分析聚合，聚合好的数据存储到 Mysql 中，原始的数据存到 HDFS 文件系统中。

### 监控模型

CAT 中的四种监控模型：

![12][12]

### 参考部署架构

最小部署架构一台物理机可以支持上千个应用接入。

![13][13]

Collector 参考硬件规格：

- 参考硬件和操作系统配置
  - CPU 32 core
  - Mem 64g
  - 3.6T SAS盘
  - OS centos7
- 参考JVM内存设置
  - 建议使用cms或g1 gc
  - 建议CAT使用堆大小至少10G以上
  - -Xms50g –Xmx50g –XX:+UseG1GC

### 生产治理实践

- 框架统一埋点
  - MVC/RPC/Cache/DAL
  - 日志关联TraceId
  - Error log（log4j/logback）集成Cat
- 技术债
  - 红黑榜
  - Matrix/Cross调用和依赖关系合理性
  - 数据库N+1问题
- Metric
  - 推荐使用专门时间序列数据库TSDB(KairosDB/InfluxDB等)作为补充
- 告警
  - 推荐使用专门的告警服务(Zmon)作为补充
- 项目定期分组
- 定期关注State报表和HDFS使用情况

## SkyWalking 简介

- SkyWalking 是观察性分析平台和应用性能管理系统。
- 提供分布式追踪、服务网格遥测分析、度量聚合和可视化一体化解决方案.
- 支持Java, .Net Core, PHP, NodeJS, Golang, LUA语言探针
- 支持Envoy + Istio构建的Service Mesh

### SkyWalking 架构设计

![14][14]

SkyWalking 的核心是数据分析和度量结果的存储平台，通过 HTTP 或 gRPC 方式向 SkyWalking Collecter 提交分析和度量数据，SkyWalking Collecter 对数据进行分析和聚合，存储到 Elasticsearch、H2、MySQL、TiDB 等其一即可，最后我们可以通过 SkyWalking UI 的可视化界面对最终的结果进行查看。Skywalking 支持从多个来源和多种格式收集数据：多种语言的 Skywalking Agent 、Zipkin v1/v2 、Istio 勘测、Envoy 度量等数据格式。

Skywalking Java Agent 支持库：

- https://github.com/apache/skywalking/blob/master/docs/en/setup/service-agent/java-agent/Supported-list.md

### Spring Cloud 整合 SkyWalking

待完善……

## Open Tracing 简介

![15][15]

现在调用链监控很多，那么就存在一个问题就是互操作的问题，企业有不同的语言，要埋点的应用和库也很多，如果说这些工具不兼容的话集成的成本就很高。Open Tracing 是一个组织，这个组织主要是定义标准，规范调用链监控API 和格式，只要符合 Open Tracing 的标准就可以用不同的调用链监控产品进行收集和监控。架构师在选型的时尽量选兼容 Open Tracing 标准的产品。

## 开源产品比较

|                | CAT | Zipkin | Pinpoint | Skywalking  |
| -------------- | ----------------- | ------------------- | ----------------- | ----------------- |
| 调用链可视化 | 有 | 有 | 有 | 有 |
| 聚合报表 | 非常丰富 | 少 | 中 | 较丰富 |
| 服务依赖图 | 简单 | 简单 | 好 | 好
| 埋点方式 | 侵入 | 侵入 | 非侵入字节码增强 | 非侵入，运行期字节码增强|
| VM指标监控 | 好 | 无 | 有 | 有 |
| 告警支持 | 有 | 无 |有 | 有 |
| 多语言支持 | Java/.Net | 丰富 | 只有Java | Java/.Net/NodeJS/PHP自动/Go手动|
| 存储机制 | Mysql(报表)，本地文件/HDFS（调用链) | 可选in memory, mysql, ES(生产), Cassandra(生产) | HBase | H2, ES(生产) |
| 社区支持 | 主要在国内，点评/美团 | 文档丰富，国外主流 | 文档一般，暂无中文社区 | Apache支持，国内社区好 |
| 国内案例 | 点评、携程、陆金所、拍拍贷 | 京东、阿里定制不开源 | 唯品会改造定制 | 华为，小米，当当，微众银行 |
|APM | Yes | No | Yes | Yes |
| 祖先源头 | eBay CAL | Google Dapper | Google Dapper | Google Dapper |
| 同类产品 | 暂无 | Uber Jaeger, Spring Cloud Sleuth | Apache Skywalking | Naver Pinpoint |
| 亮点 | 企业生产级，报表丰富 | 社区社区生态好 | 非侵入 | 非侵入，Apache背书 |
| 不足 | 用户体验一般，社区一般 | APM报表能力弱 | 国内生产案例少 | 时间不长，文档一般，仅限中文
社区|

## 参考

- https://cloud.spring.io/spring-cloud-sleuth/reference/html/
- https://cloud.spring.io/spring-cloud-static/spring-cloud-sleuth/2.2.2.RELEASE/reference/html/
- https://cloud.spring.io/spring-cloud-sleuth/2.0.x/multi/multi__introduction.html
- http://research.google.com/pubs/archive/36356.pdf
- https://tech.meituan.com/2018/11/01/cat-in-depth-java-application-monitoring.html
- https://github.com/openzipkin/zipkin/
- https://github.com/dianping/cat/
- https://github.com/naver/pinpoint/
- https://github.com/apache/skywalking/
- https://github.com/jaegertracing/jaeger/
- https://github.com/opentracing/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/spring-cloud-sleuth/1.jpg
[2]: /images/java/spring-cloud-sleuth/2.jpg
[3]: /images/java/spring-cloud-sleuth/3.jpg
[4]: /images/java/spring-cloud-sleuth/4.jpg
[5]: /images/java/spring-cloud-sleuth/5.jpg
[6]: /images/java/spring-cloud-sleuth/6.jpg
[7]: /images/java/spring-cloud-sleuth/7.jpg
[8]: /images/java/spring-cloud-sleuth/8.jpg
[9]: /images/java/spring-cloud-sleuth/9.jpg
[10]: /images/java/spring-cloud-sleuth/10.jpg
[11]: /images/java/spring-cloud-sleuth/11.jpg
[12]: /images/java/spring-cloud-sleuth/12.jpg
[13]: /images/java/spring-cloud-sleuth/13.jpg
[14]: /images/java/spring-cloud-sleuth/14.jpeg
[15]: /images/java/spring-cloud-sleuth/15.jpg
