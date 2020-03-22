---
title: 微服务架构之 Metrics 监控：Prometheus
date: 2020-03-22 13:10:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

在应用程序中，通常会记录日志以便事后分析，在很多情况下是产生了问题之后，再去查看日志是一种事后的静态分析。在很多时候，我们可能需要了解整个系统在当前，或者某一时刻运行的情况，比如：每秒钟的请求数是多少（TPS）？请求处理的最长耗时？请求处理正确响应率？以及系统运行出错率等等一系列的实时数据。通过 Metrics 监控这些指标的度量，可以来告诉我们应用是否健康。

<!--more-->

## 监控模式分类

![1][1]

四种主要监控方式：

- Healthchecks：健康检查，监控应用是不是还活着；
- Logging：日志是我们最常用的方式，日志的特点是一些离散的事件，可以是结构化的或无结构的；
- Tracing：调用链监控，特点是 Request-scoped，详情见上一篇调用链监控；
- Metrics：跟日志有点像，是离散的数据点，根据时间发生的数值，是可以聚合的，聚合运算后查看一些重要指标的趋势；

### 常见监控方式比较

![2][2]

- CapEx：研发成本，搭建这些监控手段，前期投入的研发成本，Tracing 的研发成本还是很高，比如 CAT 要进行埋点，如果用 Skywalking 相对研发成本就会低很多；
- OpEx：运维成本，Logging 的运维成本还是很高的，随着业务量增加要不断治理和扩容日志系统，比如用 ELK 要经常扩容和调优；
- Reaction：响应能力，当出问题的时候哪些工具能第一时间给出告警，Metrics 的响应告警能力很好，Tracing 比较低，出了问题我们去查问题，一般用 Tracing 和日志，CAT 的报错大盘响应能力还可以，而且 CAT 内部也集成了告警能力；
- Investigation：调查能力，出了问题哪些工具查问题最有效，Tracing 查问题的能力比较强，我们去看调用链就能马上查出哪里出问题，在去查日志分析具体原因；

### 监控适用场景

![3][3]

- 对于调试发现问题：最管用的还是日志和 Tracing，Metrics 可以查看曲线，某个时间点的异动但是总体还是不如 Log 和 Tracing；
- 对于监控告警：Metrics 最管用在发生抖动曲线的时候可以马上告警出来，非常灵敏，监控检查是最灵敏的，机器出问题了，马上可以屏蔽这个机器；

### Metrics 监控分层

不同人员关注的点不一样：

![4][4]

- 系统层：CPU、内存、硬盘等，运维人员来查看；
- 应用层：延迟、出错等，开发人员或框架团队进行埋点，研发人员查看；
- 业务层：客户转化率、登录数、下单数等，产品来定义，由开发人员埋点，业务人员查看；

### Metrics 监控架构模式

![5][5]

Metrics 监控架构都差不多，对应用或系统进行采集，采集一般有两种方式：Push 方式，我们会在系统或应用中埋一些 Agent 去采集信息然后推动到收集器中；Pull 方式一般不需要去埋 Agent，一般会系统或应用暴露出 Metrics 端点，然后监控系统去拉过来。这些信息存储在时间序列数据库中，然后由 Dashboard 查询引擎去查询这些数据展示出来，由 Alert 告警系统查询这些数据可以发出告警。不管是 Prometheus、KairosDB、InfluxDB 大致都差不多。

### Prometheus 监控 Metrics

![6][6]

Prometheus 是一种 Pull 模式，可以对接 Grafana Dashboard 做展示，自带告警组件 Alert Manager 可以分发到别的告警渠道，比如：邮件、微信、钉钉等等。

## Prometheus 简介

Prometheus 是一套开源的系统监控报警框架。它启发于 Google 的 Borgmon 监控系统，由工作 SoundCloud 的 Google 前员工在 2012 年创建，作为社区开源项目进行开发，并于 2015 年正式发布。2016 年，Prometheus 正式加入 Cloud Native Computing Foundation，能更好地与容器平台、云平台配合。

作为新一代的监控框架，Prometheus 具有以下特点：

- 开源监控工具；
- 本质是时间序列数据库 TSDB，golang 实现；
- Soundcloud 研发，源于谷歌 borgmon；
- 多维度(标签)，拉模式(Pull-based)；
- 白盒&黑盒监控都支持，DevOps 友好；
- Metrics & Alert，不是 loggging/tracing；
- 社区生态丰富，多语言，各种 exporters；
- 所有的 metrics 都可以设置任意的多维标签，使用 pull 模式采集数据；
- 高效：单机性能强，数以百万的监控指标，每秒处理数十万的数据点，消费百万级时间序列，上千个 targets；
- 可以通过服务发现或者静态配置去获取监控的 targets；
- 强大的查询语言 PromQL，有多种可视化图形界面；

需要指出的是，由于数据采集可能会有丢失，所以 Prometheus 不适用对采集数据要 100% 准确的情形。但如果用于记录时间序列数据，Prometheus 具有很大的查询优势，此外，Prometheus 适用于微服务的体系架构。

Prometheus 会将所有采集到的样本数据以时间序列（time-series）的方式保存在内存数据库中，并且定时保存到硬盘上。

```log
指标(metric)：metric name 和描述当前样本特征的 labelsets;
时间戳(timestamp)：一个精确到毫秒的时间戳;
样本值(value)： 一个 folat64 的浮点型数据表示当前样本的值。

<--------------- metric ---------------------><-timestamp -><-value->
http_request_total{status="200", method="GET"}@1434417560938 => 94355
http_request_total{status="200", method="POST"}@1434417560938 => 4748
http_request_total{status="200", method="POST"}@1434417561287 => 4785
```

### 时间序列(Time Series)

![7][7]

时间序列数据库或 Metrics 数据库比我们常用的 Mysql 要简单的多。时间序列的数据类型就是数据跟时间关联的一个点，在某一个时间 t 产生了一个数据 v，（t0,v0）就是一个 Metrics，按照一个时间间隔产生一个数据点，这些数据点连接起来就形成了时间序列。如果以时间为横坐标，序列为纵坐标，就会产生一个时间序列的矩阵。传统数据库存储的是结构化的数据，时间序列数据库存储的就是时间点。

## Prometheus 架构设计

![8][8]

Prometheus 生态圈中包含了多个组件，其中许多组件是可选的：

- Prometheus Server：用于收集和存储时间序列数据；
- Retrieval：定去去获取服务和拉去 Metrics 数据；
- Service discovery：Prometheus 采用 Pull 模式就会有个问题服务发现的问题，所有有个服务发现服务；
- Push Gateway：主要用于短期的 jobs。由于这类 jobs 存在时间较短，可能在 Prometheus 来 Pull 之前就消失了。为此，这次 jobs 可以直接向 Pushgateway 端推送它们的 Metrics，然后 Prometheus Server 在去网关拉去。这种方式主要用于服务层面的 Metrics，对于机器层面的 Metrices，需要使用 Node Exporter；
- Exporters：用于暴露已有的第三方服务的 Metrics 给 Prometheus；
- Alertmanager：从 Prometheus Server 端接收到 Alerts 后，会进行去除重复数据，分组，并路由到对收的接受方式，发出报警。常见的接收方式有：电子邮件，pagerduty，OpsGenie, webhook、企业微信、钉钉 等；
- PromQL：Prometheus 查询语言，主要给展示组件用的，比如 Web UI 或 Grafana 等。
- Client Library：客户端库，为需要监控的服务生成相应的 Metrics 并暴露给 Prometheus Server。当 Prometheus Server 来 Pull 时，直接返回实时状态的 Metrics；
- Prometheus 也可以去抓取其他 Prometheus Server 的数据，称为联邦集群模式；

### Prometheus 2.0 存储设计

![9][9]

Prometheus 是分块存储的，以一个段时间间隔作为一个块，把 Metrics 都存储在这个块中。有个块叫 mutable 是在内存中，存储当前的 Metrics 到了一个定的时间（2小时为间隔）或者满了，这个块就会往后推变成 Immutable。

这个块就是文件结构，chunks 存的就是 Metrics 的数据。index 和 meta 是存储元信息，这个块中存了哪些 Metrics 名字是什么，tag 是什么，存在哪些位置上。tombstones（墓碑）删除不是真的删除而是添加到墓碑中，是个标记，后台有 Job 定期会去删除。

查询就是去查询这些块，给定一个时间范围去查询这些块，然后做一个 merge 返回。

## Prometheus 基本概念

### Metrics 种类

Prometheus 客户端库主要提供四种主要的 Metrics 类型：

- Counter（计数器）：一种累加的 Metrics，始终增加。典型的应用如：http 请求的个数，结束的任务数，出现的错误数等等；
- Gauge（测量仪）：一种常规的 Metrics，仪表盘，当前值的一次快照(snapshot)测量，可增可减。典型的应用如：当前同时在线用户数、温度、内存使用率，运行的 goroutines 的个数，可以任意加减。
- Histogram(直方图)：可以理解为柱状图，通过分桶(bucket)方式统计样本分布。典型的应用如：请求持续时间，响应大小，可以对观察结果采样，分组及统计。
- Summary（汇总）：根据样本统计出百分位 类似于 Histogram。典型的应用如：请求持续时间，响应大小，提供观测值的 count 和 sum 功能，提供百分位的功能，即可以按百分比划分跟踪结果。

### Target

![10][10]

Prometheus 抓取的对象叫 Target，Target 可以是操作系统、机器、应用或服务。对这些 Target 都要求比较暴露 Metrics 端点，默认15秒去这些端点抓取一次，Prometheus 单机的性能很高官方的说法默认15秒可以抓取上百万的 Metrics 上千个 Target，一个单机部署就可以覆盖大部分场景。

### Metrics

![11][11]

比如说我要统计 http 的请求数，http_request_total 叫 Metric Name；{status="200",path="/status"} 叫维度或者 Label 可以打多个 Label，每个 Lable 都会产生一个时间序列；8 这个时间产生的一个值；正式存储的时候是有个时间的，但是在应用端没有时间，只有在 Prometheus 真正抓取的时候才会产生时间；

### Scrape metric

![12][12]

采集方式主要由两种：

- 直接采集：埋点式，很多第三方都已经埋好了，直接抓取就可以了；
- 间接采集：有些黑盒系统比如说：HAProxy、Redis、操作系统等，你不能去改人家源代码，这种一般采用间接方式，通过 Prometheus 的 Exporter 导出器来实现；

### Exporters

![13][13]

Exporter 有很多，最常用的就是 Node Exporter 抓取操作系统的 Metrics，有点像边车代理。有一个比较特殊 BlackBox，有系统是没办法抓取的，但是它会暴露出端口，可以定期去 Ping 这些端口获取一些 Metrics，比如要监控百度的站点，BlackBox 对健健康检查比较好用。[更多 Exporters](https://prometheus.io/docs/instrumenting/exporters/)

### Alertmanager

![14][14]

Prometheus 是支持告警的，告警的定义配置在 Prometheus 上，默认每隔一分钟去评估这些定义的告警规则，去计算这些表达式，如果说满足表达式就会触发告警。

```bash
# 4小时内磁盘是否会满？告警表达式：
ALERT DiskWillFullIn4Hours
IF predict_linear(node_filesystem_free[1h], 4*3600) < 0
```

告警主要是 Prometheus 产生的，Alertmanager 主要是来做路由转发（路由到微信、钉钉）、去抽、分组。

## Spring Boot Actuator 监控实验

Prometheus 下载地址：https://prometheus.io/download/

运行后，访问 Prometheus Web UI http://localhost:9090

在文本框中输入 up，查询 prometheus 监控的服务那些状态是正常的。

新建 SpringBoot 项目 添加 pom.xml 依赖，引用了 io.micrometer 的依赖，它依赖了 prometheus，prometheus 对SpringBoot2.x 版本不是很支持，而 io.micrometer 进行了改进，从而支持 SpringBoot2.x 版本：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-spring-legacy</artifactId>
  <version>1.0.6</version>
</dependency>
<dependency>
  <groupId>io.micrometer</groupId>
  <artifactId>micrometer-registry-prometheus</artifactId>
  <version>1.0.6</version>
</dependency>
<dependency>
    <groupId>io.github.mweirauch</groupId>
    <artifactId>micrometer-jvm-extras</artifactId>
    <version>0.1.2</version>
</dependency>
```

在 application.yaml 中配置下

```yaml
server:
  port: 8088
spring:
  application:
    name: prometheus-test
management:
 endpoints:
   web:
     exposure:
       include: '*'
  metrics:
    tags:
      application: ${spring.application.name}
```

在启动主类中添加 Bean，此配置是监控 jvm ：

```java
@Bean
MeterRegistryCustomizer<MeterRegistry> configurer(@Value("${spring.application.name}") String applicationName){
  return registry -> registry.config().commonTags("application",applicationName);
}
```

启动应用，访问 http://localhost:8080/actuator/prometheus 可以看到应用的一些 Metrics 信息。

## Grafana 简介

Grafana 是一个跨平台的开源的度量分析和可视化工具，可以通过将采集的数据查询然后可视化的展示，并及时通知。它主要有以下六大特点：

- 展示方式：快速灵活的客户端图表，面板插件有许多不同方式的可视化指标和日志，官方库中具有丰富的仪表盘插件，比如热图、折线图、图表等多种展示方式；
- 数据源：Graphite，InfluxDB，OpenTSDB，Prometheus，Elasticsearch，CloudWatch和KairosDB等；
- 通知提醒：以可视方式定义最重要指标的警报规则，Grafana 将不断计算并发送通知，在数据达到阈值时通过Slack、PagerDuty等获得通知；
- 混合展示：在同一图表中混合使用不同的数据源，可以基于每个查询指定数据源，甚至自定义数据源；
- 注释：使用来自不同数据源的丰富事件注释图表，将鼠标悬停在事件上会显示完整的事件元数据和标记；
- 过滤器：Ad-hoc过滤器允许动态创建新的键/值过滤器，这些过滤器会自动应用于使用该数据源的所有查询；

相关连接：

- 官网地址：https://grafana.com/
- 下载地址：https://grafana.com/grafana/download
- 安装指南：http://docs.grafana.org/installation/rpm/
- Grafana 官方有个中央仓库，和 maven 仓库一样，收集了网友制作好的 dashboard，每个 dashboard 有个唯一 id，dashboard 仓库地址：https://grafana.com/dashboards/

访问 localhost:3000 ，系统默认用户名和密码为 admin/admin，第一次登陆系统会要求修改密码，修改密码后登陆，具体使用就不多做介绍了，网上很多资料。

## Prometheus 监控最佳实践

### 黄金指标

Four Golden Signals 是 Google 针对大量分布式监控的经验总结，4个黄金指标可以在服务级别帮助衡量终端用户体验、服务中断、业务影响等层面的问题。主要关注与以下四种类型的指标：延迟，通讯量，错误以及饱和度：

- 延迟：服务请求所需时间。记录用户所有请求所需的时间，重点是要区分成功请求的延迟时间和失败请求的延迟时间。 例如在数据库或者其他关键祸端服务异常触发HTTP 500的情况下，用户也可能会很快得到请求失败的响应内容，如果不加区分计算这些请求的延迟，可能导致计算结果与实际结果产生巨大的差异。除此以外，在微服务中通常提倡“快速失败”，开发人员需要特别注意这些延迟较大的错误，因为这些缓慢的错误会明显影响系统的性能，因此追踪这些错误的延迟也是非常重要的。

- 通讯量：监控当前系统的流量，用于衡量服务的容量需求。流量对于不同类型的系统而言可能代表不同的含义。例如，在HTTP REST API中, 流量通常是每秒HTTP请求数；

- 错误：监控当前系统所有发生的错误请求，衡量当前系统错误发生的速率。对于失败而言有些是显式的(比如, HTTP 500错误)，而有些是隐式(比如，HTTP响应200，单实际业务流程依然是失败的)。对于一些显式的错误如HTTP 500可以通过在负载均衡器(如Nginx)上进行捕获，而对于一些系统内部的异常，则可能需要直接从服务中添加钩子统计并进行获取。

- 饱和度：衡量当前服务的饱和度。主要强调最能影响服务状态的受限制的资源。 例如，如果系统主要受内存影响，那就主要关注系统的内存状态，如果系统主要受限与磁盘I/O，那就主要观测磁盘I/O的状态。因为通常情况下，当这些资源达到饱和后，服务的性能会明显下降。同时还可以利用饱和度对系统做出预测，比如，“磁盘是否可能在4个小时候就满了”。

- RED方法，RED方法是Weave Cloud在基于Google的“4个黄金指标”的原则下结合Prometheus以及Kubernetes容器实践，细化和总结的方法论，特别适合于云原生应用以及微服务架构应用的监控和度量。主要关注以下三种关键指标：
  - (请求)速率：服务每秒接收的请求数。
  - (请求)错误：每秒失败的请求数。
  - (请求)耗时：每个请求的耗时。

在“4大黄金信号”的原则下，RED方法可以有效的帮助用户衡量云原生以及微服务应用下的用户体验问题。

### 三类系统的监控

![15][15]

### Metrics 命名

- 一般建议：library_name_unit_suffix
- snake_case
- Suffix后缀
  - _total -> counter
  - _counter, _sum -> summary
  - _bucket -> histogram
- Unit
  - 无前缀基本单位
  - seconds, bytes, ratios
- Name&Library
  - 直接表意
- Name vs Label
  - appName, instanceId/Ip

### Cardinality(基数)

- Label的可能取值
- 新增一个Label值=新增一个时间序列
- 经验值：单实例Cardinality <= 10个
- 不适合做Label
  - Email地址
  - 用户名
  - IP地址
  - HTTP Path
- 关注10个最大的metrics
- 高Cardinality场景用Log系统

### 简单HA

![16][16]

## 微服务监控体系总结

四层轻量监控体系：

![17][17]

- 系统层监控：主要监控计算网络存储、硬件、操作系统基础设施，主要是运维团队负责；
- 应用层监控：主要监控中间件产品、框架需要埋点的，一般有平台团队或框架团队负责；
- 业务层监控：主要监控订单量、登录数、支付交易业务操作，一般由开发人员去埋点；
- 端用户体验监控：网站或APP，有些大公司有专门的用户体验团队负责；

参考架构：

![18][18]

## 扩展

### Promethes 扩展方案

- 高可用和长期存储方案 https://github.com/improbable-eng/thanos/
- 长期存储方案 https://github.com/m3db/m3/
- 配置管理 https://github.com/line/promgen/

### EFK & Prometheus & Skywalking + Kubernetes 集成架构

EFK + K8s：

![19][19]

K8s 推荐 Fluentd 做日志收集，Fluentd 是个 Agent，在每个 K8s 工作节点上部署一个 DeamonSet。应用程序可以直接把日志输出到控制台上，Fluentd 可以抓取这些日志，可以自己打到 ELK 集群，但是最好打到 MQ 上做个缓冲。Log Parser 可以自己用 Java 开发也可用 Logstash 做个处理过滤。然后用 kibana 查看。

Prometheus + K8s：

![20][20]

Prometheus 可以发现 K8s 中的服务，然后去拉去 Spring Boot Actuator。

Skywalking + K8s：

![21][21]

Skywalking 要在应用中安装 Agent 或者使用 Skywalking 提供的容器基础镜像（镜像里已经集成了 Agent）。

### 其它开源时序数据库产品

- OpenTSDB http://opentsdb.net/
- KairosDB https://kairosdb.github.io/
- InfluxDB https://www.influxdata.com/
- Graphite https://graphiteapp.org/

### 主流开源时序数据库比较

|                | OpenTSDB | KariosDB | Promethes | InfluxDB  |
| -------------- | ----------------- | ------------------- | ----------------- | ----------------- |
| 开源时间 | 2010 | 2013 | 2012 | 2013 |
| 类型 | 时序数据库 | 时序数据库 | 时序数据库 | 分析数据库 |
| 分布式 | 支持 | 支持 | Federation | 商业 |
| 存储 | Hbase | Cassandra | 定制 | 定制 |
| 采集模式 | Push | Push | Pull | Push |
| Grafana集成 | 支持 | 支持 | 支持 | 支持 |
| 计算函数 | 良好 | 一般 | 丰富 | 丰富 |
| 告警模块 | 无 | 无（ZMon）| 有 | 有 |
| 查询语言 | HTTP API | HTTP API | PromQA | InfluxQL |
| Web UI | 支持 | 支持 | 支持 | 支持 |
| 维度支持 | Tag | Tag | Label | Tag+Field |
| 预聚合 | Roll-up | Roll-up | Recording Rule | Continous Query |
| 实现语言 | Java | Java | Golang | Golang |
| 商业支持 | 无 | 无 | 无 | 有 |
| 适用 | 中大规模 | 中大规模 | 中小规模 | 中小规模 |

### 微服务应用监控 Spring Boot Admin 简介

SpringBoot 应用可以通过 Actuator 来暴露应用运行过程中的各项指标，Spring Boot Admin 通过这些指标来监控 SpringBoot 应用，然后通过图形化界面呈现出来。Spring Boot Admin 不仅可以监控单体应用，还可以和 Spring Cloud 的注册中心相结合来监控微服务应用。

Spring Boot Admin 可以提供应用的以下监控信息：

- 监控应用运行过程中的概览信息；
- 度量指标信息，比如JVM、Tomcat及进程信息；
- 环境变量信息，比如系统属性、系统环境变量以及应用配置信息；
- 查看所有创建的Bean信息；
- 查看应用中的所有配置信息；
- 查看应用运行日志信息；
- 查看JVM信息；
- 查看可以访问的Web端点；
- 查看HTTP跟踪信息；

具体使用看官网文档吧超级简单，生产应用需要注意 endpoints 安全问题，一般结合 security 使用：

- https://codecentric.github.io/spring-boot-admin/current/
- https://github.com/codecentric/spring-boot-admin/

### 开源分布式监控平台 ZMon 简介

Prometheus 比较适合中小规模的场景，理念是每个团队自己去搭一套监控系统。如果说有些公司规模比较大需要分布式监控平台，ZMon 可以考虑，ZMon 一开始就设计成分布式的，是平台级的监控系统。

- Zalando 开源
- 分布式监控告警系统
- 拉模式(Check)
- Python 定义 Check/Alert
- DevOps 团队自治监控
- 基于 KairosDB
- 官网：https://opensource.zalando.com/zmon/

### 统一异常监控平台 Sentry

日志是需要收集起来的，一般经常使用 ELK。除了 ELK 还有个工具叫 Sentry，Sentry 是异常监控(error tracking)和告警平台，和普通日志比起来，异常日志相对少。Sentry 可以独立部署，内部有各种优化(缓存/异步/限流/分组等)，保证高性能处理异常日志。它可以集中的把我们的异常信息收集起来，存储和监控，Sentry 也是个开源产品可以搭建自己的平台，它也提供云服务。

官网：https://sentry.io/

### BusDevOps和测量驱动开发MDD

问题：

- 运维人员只专注系统监控(日志，负载度量)，没有应用监控能力和上下文；
- 开发人员只管实现功能，没有DevOps和度量意识；
- 应用监控空白，对应用状态无感知，主要靠蒙；
- 业务对关键应用指标无感知，很多功能开发了也无人用；

Metrics Driven Development(MDD)：是一种实践，主张整个应用开发由度量指标驱动

MDD核心原理：

- 开发功能前先定义度量指标(Bus/Dev/Ops) Define metrics before development
- 开发人员自助埋点 Instrumentation-as-Code
- 真实性的唯一来源 Single Source of Truth
- 关键指标的共同视角 Shared view of key metrics
- 使用度量进行决策 Use metrics when making decisions
- 开发持续维护指标 Maintain and follow metrics

MDD好处：

![22][22]

## 参考

- https://www.cncf.io/projects/
- https://db-engines.com/en/ranking_trend/time+series+dbms
- https://prometheus.io/docs/introduction/overview/
- https://coreos.com/blog/prometheus-2.0-storage-layer-optimization/
- https://github.com/prometheus/
- https://github.com/grafana/grafana/
- https://github.com/codecentric/spring-boot-admin/
- https://github.com/zalando-zmon/
- https://opensource.zalando.com/zmon/
- https://github.com/getsentry/sentry/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/prometheus/1.jpg
[2]: /images/java/prometheus/2.jpg
[3]: /images/java/prometheus/3.jpg
[4]: /images/java/prometheus/4.jpg
[5]: /images/java/prometheus/5.jpg
[6]: /images/java/prometheus/6.jpg
[7]: /images/java/prometheus/7.jpg
[8]: /images/java/prometheus/8.png
[9]: /images/java/prometheus/9.jpg
[10]: /images/java/prometheus/10.jpg
[11]: /images/java/prometheus/11.jpg
[12]: /images/java/prometheus/12.jpg
[13]: /images/java/prometheus/13.jpg
[14]: /images/java/prometheus/14.jpg
[15]: /images/java/prometheus/15.jpg
[16]: /images/java/prometheus/16.jpg
[17]: /images/java/prometheus/17.jpg
[18]: /images/java/prometheus/18.jpg
[19]: /images/java/prometheus/19.jpg
[20]: /images/java/prometheus/20.jpg
[21]: /images/java/prometheus/21.jpg
[22]: /images/java/prometheus/22.jpg
