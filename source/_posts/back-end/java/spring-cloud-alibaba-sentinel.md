---
title: 微服务架构之熔断降级与限流：Spring Cloud Alibaba Sentinel
date: 2020-03-14 15:56:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
  - Security
---

Spring Cloud Alibaba 致力于提供微服务开发的一站式解决方案，Sentinel：分布式系统的流量防卫兵，面向云原生微服务的流量控制、熔断降级组件。

<!--more-->

## Sentinel 简介

随着微服务的流行，服务和服务之间的稳定性变得越来越重要。Sentinel 以流量为切入点，从流量控制、熔断降级、系统负载保护等多个维度保护服务的稳定性。

Sentinel 具有以下特征：

- **丰富的应用场景**：Sentinel 承接了阿里巴巴近 10 年的双十一大促流量的核心场景，例如秒杀（即突发流量控制在系统容量可以承受的范围）、消息削峰填谷、集群流量控制、实时熔断下游不可用应用等；
- **完备的实时监控**：Sentinel 同时提供实时的监控功能。您可以在控制台中看到接入应用的单台机器秒级数据，甚至 500 台以下规模的集群的汇总运行情况；
- **广泛的开源生态**：Sentinel 提供开箱即用的与其它开源框架/库的整合模块，例如与 Spring Cloud、Dubbo、gRPC 的整合。您只需要引入相应的依赖并进行简单的配置即可快速地接入 Sentinel；
- **完善的 SPI 扩展点**：Sentinel 提供简单易用、完善的 SPI 扩展接口。您可以通过实现扩展接口来快速地定制逻辑。例如定制规则管理、适配动态数据源等；

Sentinel 分为两个部分：

- 核心库（Java 客户端）不依赖任何框架/库，能够运行于所有 Java 运行时环境，同时对 Dubbo / Spring Cloud 等框架也有较好的支持；
- 控制台（Dashboard）基于 Spring Boot 开发，打包后可以直接运行，不需要额外的 Tomcat 等应用容器；

### 常用限流降级组件对比

Sentinel 和之前常用的熔断降级库有什么异同呢？官网有一个对比的文章，具体的对比可以点此 [链接](https://github.com/alibaba/Sentinel/wiki/Sentinel-%E4%B8%8E-Hystrix-%E7%9A%84%E5%AF%B9%E6%AF%94) 查看。

|                | Sentinel                                                   | Hystrix                 | resilience4j                     |
| -------------- | ---------------------------------------------------------- | ----------------------- | -------------------------------- |
| 隔离策略       | 信号量隔离（并发线程数限流）    | 线程池隔离/信号量隔离   | 信号量隔离                       |
| 熔断降级策略   | 基于响应时间、异常比率、异常数等      |   异常比率模式、超时熔断   | 基于异常比率、响应时间           |
| 实时统计实现   | 滑动窗口（LeapArray）   | 滑动窗口（基于 RxJava） | Ring Bit Buffer                  |
| 动态规则配置   | 支持[多种配置源](https://github.com/alibaba/Sentinel/wiki/动态规则扩展#datasource-扩展)             | 支持多种数据源          | 有限支持                         |
| 扩展性         | 丰富的 SPI 扩展接口          | 插件的形式              |  接口的形式                       |
| 基于注解的支持 | 支持                         | 支持                    | 支持                             |
| 限流           | 基于 QPS，支持基于调用关系的限流          | 有限的支持              | Rate Limiter                     |
| 集群流量控制   | 支持     | 不支持                  | 不支持         |
| 流量整形       | 支持预热模式、匀速排队模式等多种复杂场景     | 不支持                  | 简单的 Rate Limiter 模式         |
| 系统自适应保护 | 支持            | 不支持                  | 不支持                           |
| 控制台         | 提供开箱即用的控制台，可配置规则、查看秒级监控、机器发现等 | 简单的监控查看  | 不提供控制台，可对接其它监控系统 |
| 多语言支持 | Java / C++ | Java  | Java |
| 开源社区状态 | 活跃 | 停止维护  | 较活跃 |

### Sentinel 重要概念

Sentinel 中有很多比较重要的概念，要了解一个框架，首先要对框架中重要的概念实体进行分析。

#### Resource

Resource 是 Sentinel 中最重要的一个概念， Sentinel 通过资源来保护具体的业务代码或其他后方服务。 Sentinel 把复杂的逻辑给屏蔽掉，用户只需要为受保护的代码或服务定义一个资源，然后定义规则就可以了，剩下的通通交给 Sentinel 来处理了。并且资源和规则是解耦的，规则甚至可以在运行时动态修改。定义完资源后，就可以通过在程序中埋点来保护你自己的服务了，埋点的方式有两种：

- try-catch 方式（通过 `SphU.entry(...)`），当 catch 到BlockException时执行异常处理(或fallback)；
- if-else 方式（通过 `SphO.entry(...)`），当返回 false 时执行异常处理(或fallback)；

以上这两种方式都是通过硬编码的形式定义资源然后进行资源埋点的，对业务代码的侵入太大，从 `0.1.1` 版本开始， Sentinel 加入了注解的支持，可以通过注解来定义资源 `SentinelResource`。通过注解除了可以定义资源外，还可以指定 `blockHandler` 和 `fallback` 方法。

在 Sentinel 中具体表示资源的类是：`ResourceWrapper` ，他是一个抽象的包装类，包装了资源的 **Name** 和**EntryType**。他有两个实现类，分别是：`StringResourceWrapper` 和 `MethodResourceWrapper`。

顾名思义，`StringResourceWrapper` 是通过对一串字符串进行包装，是一个通用的资源包装类，`MethodResourceWrapper` 是对方法调用的包装。

#### Slot

Slot 是另一个 Sentinel 中非常重要的概念， Sentinel 的工作流程就是围绕着一个个插槽所组成的插槽链来展开的。需要注意的是每个插槽都有自己的职责，他们各司其职完好的配合，通过一定的编排顺序，来达到最终的限流降级的目的。默认的各个插槽之间的顺序是固定的，因为有的插槽需要依赖其他的插槽计算出来的结果才能进行工作。

但是这并不意味着我们只能按照框架的定义来，Sentinel 通过 `SlotChainBuilder` 作为 SPI 接口，使得 Slot Chain 具备了扩展的能力。可以通过实现 `SlotsChainBuilder` 接口加入自定义的 slot 并自定义编排各个 slot 之间的顺序，从而可以给 Sentinel 添加自定义的功能。

#### Context

Context 上下文是 Sentinel 中一个比较难懂的概念。源码中是这样描述 context 类的：

> This class holds metadata of current invocation

就是说在 context 中维护着当前调用链的元数据，那元数据有哪些呢，从 context 类的源码中可以看到有：

- entranceNode：当前调用链的入口节点；
- curEntry：当前调用链的当前 entry；
- node：与当前 entry 所对应的 curNode；
- origin：当前调用链的调用源；

每次调用 `SphU.entry()` 或 `SphO.entry()` 都需要在一个 context 中执行，如果没有当前执行时还没有 context，那么框架会使用默认的 context，默认的 context 是通过 `MyContextUtil.myEnter()` 创建的。

#### Entry

Entry 是 Sentinel 中用来表示是否通过限流的一个凭证，就像一个token一样。每次执行  `SphU.entry()` 或 `SphO.entry()` 都会返回一个 `Entry` 给调用者，意思就是告诉调用者，如果正确返回了 `Entry` 给你，那表示你可以正常访问被 Sentinel 保护的后方服务了，否则 Sentinel 会抛出一个BlockException(如果是 `SphO.entry()` 会返回false)，这就表示调用者想要访问的服务被保护了，也就是说调用者本身被限流了。

entry 中保存了本次执行 entry() 方法的一些基本信息，包括：

- createTime：当前Entry的创建时间，主要用来后期计算rt
- node：当前Entry所关联的node，该node主要是记录了当前context下该资源的统计信息
- origin：当前Entry的调用来源，通常是调用方的应用名称，在 `ClusterBuilderSlot.entry()` 方法中设置的
- resourceWrapper：当前Entry所关联的资源

当在一个上下文中多次调用了 `SphU.entry()` 方法时，就会创建一个调用树，这个树的节点之间是通过parent和child关系维持的。

#### Node

Node 中保存了资源的实时统计数据，例如：passQps，blockQps，rt 等实时数据。正是有了这些统计数据后， Sentinel 才能进行限流、降级等一系列的操作。

node 是一个接口，他有一个实现类：StatisticNode，但是 StatisticNode 本身也有两个子类，一个是DefaultNode，另一个是ClusterNode，DefaultNode又有一个子类叫EntranceNode。

#### Metric

Metric 是 Sentinel 中用来进行实时数据统计的度量接口，node就是通过metric来进行数据统计的。而metric本身也并没有统计的能力，他也是通过Window来进行统计的。

Metric有一个实现类：ArrayMetric，在ArrayMetric中主要是通过一个叫WindowLeapArray的对象进行窗口统计的。

## Sentinel 控制台

Sentinel控制台是一个轻量级的控制台应用，它可用于实时查看单机资源监控及集群资源汇总，并提供了一系列的规则管理功能，如流控规则、降级规则、热点规则等。

### 获取 Sentinel 控制台

可以从 [release 页面](https://github.com/alibaba/Sentinel/releases) 下载最新版本的控制台 jar 包。

> **注意**：启动 Sentinel 控制台需要 JDK 版本为 1.8 及以上版本。

使用如下命令启动控制台：

```bash
java -Dserver.port=8858 -Dcsp.sentinel.dashboard.server=localhost:8858 -Dproject.name=sentinel-dashboard -jar sentinel-dashboard.jar
```

启动成功后就可以登录了，账号密码均为 sentinel。

注意：官方并没有提供 docker 镜像，原因是生产环境使用 Sentinel Dashboard 还需要进行一定的改造，具体查看在 [生产环境中使用 Sentinel](https://github.com/alibaba/Sentinel/wiki/%E5%9C%A8%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E4%B8%AD%E4%BD%BF%E7%94%A8-Sentinel/)。

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
- Spring Cloud：Hoxton.SR1
- Spring Cloud Alibaba：2.2.0.RELEASE

## Spring Cloud Gateway 集成 Sentinel

大部分业务场景我们只需要在网关上做熔断限流就够了，从 1.6.0 版本开始，Sentinel 提供了 Spring Cloud Gateway 的适配模块，可以提供两种资源维度的限流：

- route 维度：即在 Spring 配置文件中配置的路由条目，资源名为对应的 routeId；
- 自定义 API 维度：用户可以利用 Sentinel 提供的 API 来自定义一些 API 分组；

在 parent pom.xml 引入 Spring Cloud Alibaba 依赖：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-alibaba-dependencies</artifactId>
            <version>2.2.0.RELEASE</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

在网关的 pom.xml 引入依赖：

```xml
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>

<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-alibaba-sentinel-gateway</artifactId>
</dependency>
```

> 同时将 spring.cloud.sentinel.filter.enabled 配置项置为 false（若在网关流控控制台上看到了 URL 资源，就是此配置项没有置为 false）。

在 application.yml 中添加相关配置：

```yaml
spring:
  cloud:
    sentinel:
      transport:
        # 指定客户端监控 API 的端口（默认是 8719）
        port: 8719
        # 配置 sentinel dashboard 地址
        dashboard: localhost:8858
```

> Sentinel Dashboard 是一个单独启动的控制台，应用若想上报监控信息给 Sentinel 控制台，需要引入 Sentinel 上报信息的 transport 模块。它们各自有自己的通信端口，其中控制台的端口可通过启动参数 -Dserver.port=xxxx 进行配置，而 Sentinel transport 模块的端口可以通过启动参数 -Dcsp.sentinel.api.port 进行配置（默认是 8719）。两者都启动之后，Sentinel 客户端在 首次访问资源时 会初始化并给控制台发送心跳，之后控制台会通过接入端提供的端口对 Sentinel 进行访问来拉取相关信息。

都启动后就可以用 Sentinel Dashboard 来添加流量规则了，具体[操作查看文档](https://github.com/alibaba/Sentinel/wiki/%E6%8E%A7%E5%88%B6%E5%8F%B0/)，写的已经很详细了。

> **注意**：控制台有可能没有显示接入的客户端，原因是 Sentinel 采用的是懒加载方式，需要访问几次网关，让网关产生流量，这是刷新控制台就可以了。还不行就查看 [FAQ](https://github.com/alibaba/Sentinel/wiki/FAQ/)

## 使用 Nacos 存储规则，实现动态数据源

默认情况下，当我们在 Sentinel 控制台中配置规则时，控制台推送规则方式是通过 API 将规则推送至客户端并直接更新到内存中。一旦我们重启应用，规则将消失。生产中规则信息都是保存数据库持久化或者配置中心里。

Sentinel 支持多种数据源，每种数据源都有两个共同的配置项：data-type、converter-class 以及 rule-type。rule-type 配置表示该数据源中的规则属于哪种类型的规则(flow，degrade，authority，system, param-flow, gw-flow, gw-api-group)。

```properties
spring.cloud.sentinel.datasource.ds1.file.file=classpath: degraderule.json
spring.cloud.sentinel.datasource.ds1.file.rule-type=flow

#spring.cloud.sentinel.datasource.ds1.file.file=classpath: flowrule.json
#spring.cloud.sentinel.datasource.ds1.file.data-type=custom
#spring.cloud.sentinel.datasource.ds1.file.converter-class=com.alibaba.cloud.examples.JsonFlowRuleListConverter
#spring.cloud.sentinel.datasource.ds1.file.rule-type=flow

spring.cloud.sentinel.datasource.ds2.nacos.server-addr=localhost:8848
spring.cloud.sentinel.datasource.ds2.nacos.data-id=sentinel
spring.cloud.sentinel.datasource.ds2.nacos.group-id=DEFAULT_GROUP
spring.cloud.sentinel.datasource.ds2.nacos.data-type=json
spring.cloud.sentinel.datasource.ds2.nacos.rule-type=degrade

spring.cloud.sentinel.datasource.ds3.zk.path = /Sentinel-Demo/SYSTEM-CODE-DEMO-FLOW
spring.cloud.sentinel.datasource.ds3.zk.server-addr = localhost:2181
spring.cloud.sentinel.datasource.ds3.zk.rule-type=authority

spring.cloud.sentinel.datasource.ds4.apollo.namespace-name = application
spring.cloud.sentinel.datasource.ds4.apollo.flow-rules-key = sentinel
spring.cloud.sentinel.datasource.ds4.apollo.default-flow-rule-value = test
spring.cloud.sentinel.datasource.ds4.apollo.rule-type=param-flow
```

这里我使用 Nacos 来存储规则并支持动态刷新。

### Nacos 简介

Nacos 致力于帮助您发现、配置和管理微服务。Nacos 提供了一组简单易用的特性集，帮助您快速实现动态服务发现、服务配置、服务元数据及流量管理。

Nacos 具有如下特性：

- 服务发现和服务健康监测：支持基于 DNS 和基于 RPC 的服务发现，支持对服务的实时的健康检查，阻止向不健康的主机或服务实例发送请求；
- 动态配置服务：动态配置服务可以让您以中心化、外部化和动态化的方式管理所有环境的应用配置和服务配置；
- 动态 DNS 服务：动态 DNS 服务支持权重路由，让您更容易地实现中间层负载均衡、更灵活的路由策略、流量控制以及数据中心内网的简单 DNS 解析服务；
- 服务及其元数据管理：支持从微服务平台建设的视角管理数据中心的所有服务及元数据。

### 动态规则原理示意图

![1][1]

- 首先我们直接在配置中心创建规则，配置中心将规则推送到客户端；
- Sentinel 控制台也从配置中心去获取配置信息；

### 安装 Nacos 配置中心

可以在 Nacos 的 [release notes](https://github.com/alibaba/nacos/releases/) 及[博客](https://nacos.io/zh-cn/blog/index.html) 中找到每个版本支持的功能的介绍，我下载的是 1.2.0。也可用官方提供的 [Docker 镜像](https://github.com/nacos-group/nacos-docker/)快速开始。

```bash
# unzip nacos-server-$version.zip 或者 tar -xvf nacos-server-$version.tar.gz
cd nacos/bin

# 我这里是 Mac 系统
# 启动命令(standalone代表着单机模式运行，非集群模式):
sh startup.sh -m standalone

# Windows启动命令：
# cmd startup.cmd
```

运行成功后，访问 http://localhost:8848/nacos 可以查看 Nacos 的主页，默认账号密码都是 nacos。

![2][2]

### 网关集成 Nacos 配置中心

在 pom.xml 中添加相关依赖：

```xml
<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>

<dependency>
  <groupId>com.alibaba.cloud</groupId>
  <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>

<dependency>
  <groupId>com.alibaba.csp</groupId>
  <artifactId>sentinel-datasource-nacos</artifactId>
</dependency>
```

添加配置文件 bootstrap.yml，主要是对 Nacos 的作为配置中心的功能进行配置：

```yaml
spring:
  application:
    name: gateway-service
  cloud:
    nacos:
      # 服务注册发现
      discovery:
        server-addr: localhost:8848 # Nacos地址
        namespace: aid-dev # 命名空间 ID
      # 配置中心
      config:
        enabled: true
        server-addr: localhost:8848 # Nacos地址
        namespace: aid-dev
        file-extension: yaml # 显示的使用文件扩展，dataid 要指定其扩展
        # 共享公共配置
        shared-configs:
          - dataId: common.yaml
            refresh: true
          - dataId: mysql.yaml
            refresh: false
          - dataId: redis.yaml
            refresh: false
```

Nacos 中的 dataid 的组成格式及与 SpringBoot 配置文件中的属性对应关系：

```yaml
${spring.application.name}-${spring.profiles.active}.${spring.cloud.nacos.config.file-extension}
```

比如说我们现在要获取应用名称为 gateway-service 的应用在 dev 环境下的 yaml 配置，dataid 为：gateway-service-dev.yaml

配置 sentinel 数据源相关信息：

```yaml
spring:
  cloud:
    sentinel:
      transport:
        port: 8719
        dashboard: localhost:8858
      datasource:
        # 限流
        flow.nacos:
          server-addr: localhost:8848
          data-id: ${spring.application.name}-flow
          data-type: json
          namespace: aid-dev
          rule-type: gw-flow
        # 熔断
        degrade.nacos:
          server-addr: localhost:8848
          data-id: ${spring.application.name}-degrade
          data-type: json
          namespace: aid-dev
          rule-type: degrade
      filter:
        enabled: false
      eager: false
      # 自定义阻断信息
      scg.fallback:
        mode: response
        response-status: 200
        response-body: "{\"code\":429,\"msg\":\"系统繁忙,请稍候再试\"}""
```

> **注意**：自定义网关的阻断信息一点要填写 `mode` 和 `response-body`，这里坑了我好久，具体逻辑可以查看 `com.alibaba.cloud.sentinel.gateway.scg.SentinelSCGAutoConfiguration.java:initFallback` 源码逻辑。

限流配置如下：

```json
[
    {
        "resource": "xxx_path_route",
        "grade": 1,
        "count": 1,
        "strategy": 0,
        "controlBehavior": 0,
        "paramItem": {
            "parseStrategy": 0
        }
    }
]
```

说明：

- resource：资源名称，可以是网关中的 route 名称或者用户自定义的 API 分组名称；
- resourceMode：规则是针对 API Gateway 的 route（`RESOURCE_MODE_ROUTE_ID`）还是用户在 Sentinel 中定义的 API 分组（`RESOURCE_MODE_CUSTOM_API_NAME`），默认是 route；
- grade：限流指标维度，同限流规则的 grade 字段。0表示线程数，1表示QPS；
- count：限流阈值；
- intervalSec：统计时间窗口，单位是秒，默认是 1 秒。
- strategy：流控模式，0表示直接(快速失败)，1表示关联，2表示链路；
- controlBehavior：流控效果，0表示快速失败，1表示Warm Up，2表示排队等待；
- clusterMode：是否集群;
- paramItem：参数限流配置。若不提供，则代表不针对参数进行限流，该网关规则将会被转换成普通流控规则；否则会转换成热点规则。其中的字段：
  - parseStrategy：从请求中提取参数的策略，目前支持提取来源 IP(`PARAM_PARSE_STRATEGY_CLIENT_IP`),Host(`PARAM_PARSE_STRATEGY_HOST`),任意 Header(`PARAM_PARSE_STRATEGY_HEADER`)和任意 URL 参数(`PARAM_PARSE_STRATEGY_URL_PARAM`)四种模式。
  - fieldName：若提取策略选择 Header 模式或 URL 参数模式，则需要指定对应的 header 名称或 URL 参数名称。
  - pattern：参数值的匹配模式，只有匹配该模式的请求属性值会纳入统计和流控；若为空则统计该请求属性的所有值。（1.6.2 版本开始支持）
  - matchStrategy：参数值的匹配策略，目前支持精确匹配(`PARAM_MATCH_STRATEGY_EXACT`),子串匹配(`PARAM_MATCH_STRATEGY_CONTAINS`)和正则匹配(`PARAM_MATCH_STRATEGY_REGEX`)。（1.6.2 版本开始支持）

> 详细查看 [网关限流](https://github.com/alibaba/Sentinel/wiki/%E7%BD%91%E5%85%B3%E9%99%90%E6%B5%81/)

熔断降级配置如下：

```json
[
    {
        "resource": "xxx_path_route",
        "grade": 0,
        "count": 10,
        "timeWindow": 5,
        "rtSlowRequestAmount": 1
    }
]
```

说明：

- resource：资源名，即限流规则的作用对象；
- count：阈值 ms；
- grade：熔断策略，支持秒级 RT/秒级异常比例/分钟级异常数；
- timeWindow：降级的时间，单位为 s；
- rtSlowRequestAmount：RT 模式下 1 秒内连续多少个请求的平均 RT 超出阈值方可触发熔断（1.7.0 引入）默认 5；
- minRequestAmount：异常熔断的触发最小请求数，请求数小于该值时即使异常比率超出阈值也不会熔断（1.7.0 引入）默认 5；

我的配置意思为：

当 1s 内持续进入 1 个请求，对应时刻的平均响应时间（秒级）均超过阈值 (count 10 ms)，那么在接下的时间窗口之内 （timeWindow 5s），对这个路由的调用都会自动地熔断（抛出 DegradeException）。注意 Sentinel 默认统计的 RT 上限是 4900 ms，超出此阈值的都会算作 4900 ms，若需要变更此上限可以通过启动配置项 -Dcsp.sentinel.statistic.max.rt=xxx 来配置。

运行后就登录 Sentinel Dashboard 查看规则，可以用 JMeter 来压测配置是否生效，降级或限流返回的 Response 为：

```json
{
  "code": 429,
  "msg": "系统繁忙,请稍候再试"
}
```

### 配置的优先级

Spring Cloud Alibaba Nacos Config 目前提供了三种配置能力从 Nacos 拉取相关的配置。

- A: 通过 spring.cloud.nacos.config.shared-configs[n].data-id 支持多个共享 Data Id 的配置；
- B: 通过 spring.cloud.nacos.config.extension-configs[n].data-id 的方式支持多个扩展 Data Id 的配置；
- C: 通过内部相关规则(应用名、应用名+ Profile )自动生成相关的 Data Id 配置；

当三种方式共同使用时，他们的一个优先级关系是:A < B < C；

可以在应用启动类中添加类似如下代码查看配置是否加载：

```java
@SpringBootApplication
public class ProviderApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext applicationContext = SpringApplication.run(ProviderApplication.class, args);
        while(true) {
            // 当动态配置刷新时，会更新到 Enviroment中，因此这里每隔一秒中从Enviroment中获取配置
            String userName = applicationContext.getEnvironment().getProperty("user.name");
            String userAge = applicationContext.getEnvironment().getProperty("user.age");
            System.err.println("user name :" + userName + "; age: " + userAge);
            TimeUnit.SECONDS.sleep(1);
        }
    }
}
```

或者查看 `~/logs/csp` 目录下的 sentinel 日志文件。

## 参考

- https://spring.io/projects/spring-cloud-alibaba/
- https://github.com/alibaba/spring-cloud-alibaba/wiki/Sentinel/
- https://spring.io/projects/spring-cloud-circuitbreaker/
- https://github.com/alibaba/spring-cloud-alibaba/wiki/Nacos-config/
- https://github.com/alibaba/nacos/
- https://nacos.io/zh-cn/index.html
- Sentinel 介绍 https://github.com/alibaba/Sentinel/wiki/%E4%BB%8B%E7%BB%8D/
- Sentinel 如何使用 https://github.com/alibaba/Sentinel/wiki/%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8
- Sentinel 网关限流 https://github.com/alibaba/Sentinel/wiki/%E7%BD%91%E5%85%B3%E9%99%90%E6%B5%81/

[1]: /images/java/spring-cloud-alibaba-sentinel/1.png
[2]: /images/java/spring-cloud-alibaba-sentinel/2.jpg