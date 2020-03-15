---
title: 微服务架构之配置中心：Apollo
date: 2020-03-15 13:53:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

在拆分为微服务架构前，曾经的单体应用只需要管理一套配置；而拆分为微服务后，每一个系统都有自己的配置，并且都各不相同，而且因为服务治理的需要，有些配置还需要能够动态改变，以达到动态降级、切流量、扩缩容等目的，这时候就要引入微服务架构中的集中化外部配置的支持。

<!--more-->

## 为什么需要配置中心？

### 配置基本概念

配置定义：

- 可独立于程序的可配变量;
- 同一份程序在不同配置下会有不同行为;
- 连接字符串，应用配置，业务配置;

配置形态：

- 程序内部 hardcode（反模式，不建议！）；
- 配置文件；
- 环境变量；
- 启动参数；
- 基于数据库；

配置治理：

- 权限控制和审计；
- 不同环境、集群配置管理；
- 框架类组件配置管理；
- 灰度发布；

### 传统应用配置问题

- 主要采用本地文件静态配置：本地静态配置导致在运行时无法动态修改；
- 配置散乱格式不标准：有的用 xml 格式，有的用 properties，yaml的，有的存DB；
- 易引发生产事故：发布的时候容易将非生产的配置带到生产上，引发事故；
- 配置修改麻烦：周期长，当部署的服务器很多时，修改配置费时费力；
- 配置信息缺少安全审计和版本控制功能：事后无法追溯，谁改的？改了什么？什么时候改的？当出现问题无法及时回滚；

### 针对以上传统的配置问题，配置中心解决办法

- 集中式配置，所有配置信息都存放配置中心；
- 配置中心统一管理格式，用户不必关注格式；
- 环境隔离，不同的环境对应不同的配置，互不干扰；配置错误，可以立即修改，即时生效；
- 配置集中一次修改，实时通，知到所有客户端；
- 所有修改有历史记录，方便查找谁和时间；可按需回退到历史版本；

### 现代交付需求

![1][1]

现代研发进入了一个新的时代，有个新的概念叫云原生（Cloud Native），云原生主要包含两个方面新的趋势，一个是微服务，另一个是容器化技术。

容器化有个特点叫不可变基础设施，就是说镜像打出来后就是一份，不管是部署到测试还是生产都是一份镜像，不像原来的打包方式为不同的环境打不同的包。这个时候现代的交付又提出了一些新的要求。

### 现代配置核心需求

- 交付件和配置分离：现代大部分都会采用容器的方式交付，容器是不可变的，不能为每个环境都制作一个容器镜像，那容器和配置就要分开；
- 抽象标准化：配置的格式用户不用关心，配置中心统一管理，配置的接口和客户端由配置中心统一提供，用户只需要对接就可以；
- 集中式：集中式的统一配置中心，不是每个业务团队都去搞一套；
- 高可用：配置中心要求高可用，不能随便挂掉，所以的微服务都依赖配置中心；
- 实时性：我们希望配置在修改后能够实时通知到客户端；
- 治理：配置需要治理，主要包括权限的审计，权限控制，谁在什么时间点修改了什么配置，支持回退，还要支持灰度发布的能力；

### 配置分类和场景

静态配置：

- 环境相关：数据库/中间件/其它服务的连接字符串；
- 安全配置：用户名，密码，令牌，许可证书等；

动态配置：

- 应用配置：请求超时，线程池，队列，缓存，数据库连接池的容量，日志级别，限流熔断阈值，黑白名单；
- 业务配置：促销规则，贷款额度，利率等业务参数，A/B测试；
- 功能开关：蓝绿发布，灰度开关，降级开关，HA高可用开关，DB迁移；

## Apollo 简介

随着程序功能的日益复杂，程序的配置日益增多：各种功能的开关、参数的配置、服务器的地址……

对程序配置的期望值也越来越高：配置修改后实时生效，灰度发布，分环境、分集群管理配置，完善的权限、审核机制……

在这样的大环境下，传统的通过配置文件、数据库等方式已经越来越无法满足开发人员对配置管理的需求。

Apollo 配置中心应运而生！

Apollo（阿波罗）是携程框架部门研发的开源配置管理中心，能够集中化管理应用不同环境、不同集群的配置，配置修改后能够实时推送到应用端，并且具备规范的权限、流程治理等特性。

Apollo支持4个维度管理Key-Value格式的配置：

1. application (应用)
2. environment (环境)
3. cluster (集群)
4. namespace (命名空间)

同时，Apollo基于开源模式开发，开源地址：https://github.com/ctripcorp/apollo

### Apollo 的特性

* **统一管理不同环境、不同集群的配置**
	* Apollo提供了一个统一界面集中式管理不同环境（environment）、不同集群（cluster）、不同命名空间（namespace）的配置。
	* 同一份代码部署在不同的集群，可以有不同的配置，比如zookeeper的地址等
	* 通过命名空间（namespace）可以很方便地支持多个不同应用共享同一份配置，同时还允许应用对共享的配置进行覆盖

* **配置修改实时生效（热发布）**
	* 用户在Apollo修改完配置并发布后，客户端能实时（1秒）接收到最新的配置，并通知到应用程序

* **版本发布管理**
	* 所有的配置发布都有版本概念，从而可以方便地支持配置的回滚

* **灰度发布**
	* 支持配置的灰度发布，比如点了发布后，只对部分应用实例生效，等观察一段时间没问题后再推给所有应用实例

* **权限管理、发布审核、操作审计**
	* 应用和配置的管理都有完善的权限管理机制，对配置的管理还分为了编辑和发布两个环节，从而减少人为的错误。
	* 所有的操作都有审计日志，可以方便地追踪问题

* **客户端配置信息监控**
	* 可以在界面上方便地看到配置在被哪些实例使用

* **提供Java和.Net原生客户端**
	* 提供了Java和.Net的原生客户端，方便应用集成
	* 支持Spring Placeholder, Annotation和Spring Boot的ConfigurationProperties，方便应用使用（需要Spring 3.1.1+）
	* 同时提供了Http接口，非Java和.Net应用也可以方便地使用

* **提供开放平台API**
	* Apollo自身提供了比较完善的统一配置管理界面，支持多环境、多数据中心配置管理、权限、流程治理等特性。不过Apollo出于通用性考虑，不会对配置的修改做过多限制，只要符合基本的格式就能保存，不会针对不同的配置值进行针对性的校验，如数据库用户名、密码，Redis服务地址等
	* 对于这类应用配置，Apollo支持应用方通过开放平台API在Apollo进行配置的修改和发布，并且具备完善的授权和权限控制

* **部署简单**
	* 配置中心作为基础服务，可用性要求非常高，这就要求Apollo对外部依赖尽可能地少
	* 目前唯一的外部依赖是MySQL，所以部署非常简单，只要安装好Java和MySQL就可以让Apollo跑起来
	* Apollo还提供了打包脚本，一键就可以生成所有需要的安装包，并且支持自定义运行时参数

### Apollo 的基础模型

![2][2]

1. 用户在配置中心对配置进行修改并发布；
2. 配置中心通知Apollo客户端有配置更新；
3. Apollo客户端从配置中心拉取最新的配置、更新本地配置并通知到应用；

### Apollo 的主界面概览

![3][3]

- 在页面左上方的环境列表模块展示了所有的环境和集群，用户可以随时切换;
- 页面中央展示了两个namespace(application和FX.apollo)的配置信息，默认按照表格模式展示、编辑。用户也可以切换到文本模式，以文件形式查看、编辑;
- 页面上可以方便地进行发布、回滚、灰度、授权、查看更改历史和发布历史等操作.

### Apollo 核心概念

1. **application (应用)**
	* 这个很好理解，就是实际使用配置的应用，Apollo客户端在运行时需要知道当前应用是谁，从而可以去获取对应的配置
	* 每个应用都需要有唯一的身份标识 -- appId，我们认为应用身份是跟着代码走的，所以需要在代码中配置，具体信息请参见[Java客户端使用指南](https://github.com/ctripcorp/apollo/wiki/Java%E5%AE%A2%E6%88%B7%E7%AB%AF%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97)。
  * Java: classpath:/META-INF/app.properties -> appid

2. **environment (环境)**
	* 配置对应的环境，Apollo客户端在运行时需要知道当前应用处于哪个环境，从而可以去获取应用的配置
	* 我们认为环境和代码无关，同一份代码部署在不同的环境就应该能够获取到不同环境的配置
	* 所以环境默认是通过读取机器上的配置（server.properties中的env属性）指定的，不过为了开发方便，我们也支持运行时通过System Property等指定，具体信息请参见[Java客户端使用指南](https://github.com/ctripcorp/apollo/wiki/Java%E5%AE%A2%E6%88%B7%E7%AB%AF%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97)。
  * 配置对应的环境 DEV, FAT, UAT, PRO
  * server.properties -> env
  * C:\opt\settings\server.properties或/opt/settings/server.properties

3. **cluster (集群)**
	* 一个应用下不同实例的分组，比如典型的可以按照数据中心分，把上海机房的应用实例分为一个集群，把北京机房的应用实例分为另一个集群。
	* 对不同的cluster，同一个配置可以有不一样的值，如zookeeper地址。
	* 集群默认是通过读取机器上的配置（server.properties中的idc属性）指定的，不过也支持运行时通过System Property指定，具体信息请参见[Java客户端使用指南](https://github.com/ctripcorp/apollo/wiki/Java%E5%AE%A2%E6%88%B7%E7%AB%AF%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97)。
  * 默认数据中心作为cluster
  * server.properties -> idc
  * C:\opt\settings\server.properties或/opt/settings/server.properties

4. **namespace (命名空间)**
	* 一个应用下不同配置的分组，可以简单地把namespace类比为文件，不同类型的配置存放在不同的文件中，如数据库配置文件，RPC配置文件，应用自身的配置文件等
	* 应用可以直接读取到公共组件的配置namespace，如DAL，RPC等
	* 应用也可以通过继承公共组件的配置namespace来对公共组件的配置做调整，如DAL的初始数据库连接数

5. **item (配置项)**
  * 表示可配置项
    * 支持properties/json/xml格式
  * 定位方式：
    * 私有配置env+app+cluster+namespace+item_key
    * 公有配置env+cluster+namespace+item_key

6. **权限**
  * 系统管理员拥有所有的权限；
  * 创建者可以代为创建项目，责任人是默认的项目管理员，一般创建者=责任人；
  * 项目管理员可以创建Namespace，集群，管理项目和Namespace权限；
  * 编辑权限只能编辑不能发布；
  * 发布权限只能发布不能编辑；
  * 查看，普通用户可以搜索查看所有项目配置，但不能做相关操作；

### 名字空间类型

- 私有(Private)类型：
  - 只能被所属应用获取；
- 公有(Public)类型：
  - 公有场景
    - 部门级别共享配置
    - 小组级别共享配置
    - 中间件客户端的配置
  - 必须全局唯一
- 关联类型(继承类型)：
  - 私有继承公有并覆盖
  - 定制公共组件配置场景

## Apollo 架构设计之服务器端

![4][4]

上图简要描述了Apollo的总体设计，我们可以从下往上看：

- Config Service提供配置的读取、推送等功能，服务对象是Apollo客户端；
- Admin Service提供配置的修改、发布等功能，服务对象是Apollo Portal（管理界面）；
- Config Service和Admin Service都是多实例、无状态部署，所以需要将自己注册到Eureka中并保持心跳；
- 在Eureka之上我们架了一层Meta Server用于封装Eureka的服务发现接口；
- Client通过域名访问Meta Server获取Config Service服务列表（IP+Port），而后直接通过IP+Port访问服务，同时在Client侧会做load balance、错误重试；
- Portal通过域名访问Meta Server获取Admin Service服务列表（IP+Port），而后直接通过IP+Port访问服务，同时在Portal侧会做load balance、错误重试；
- 为了简化部署，我们实际上会把Config Service、Eureka和Meta Server三个逻辑角色部署在同一个JVM进程中；

## Apollo 架构设计之客户端

![7][7]

上图简要描述了Apollo客户端的实现原理：

1. 客户端和服务端保持了一个长连接，从而能第一时间获得配置更新的推送。
2. 客户端还会定时从Apollo配置中心服务端拉取应用的最新配置。
    * 这是一个fallback机制，为了防止推送机制失效导致配置不更新
    * 客户端定时拉取会上报本地版本，所以一般情况下，对于定时拉取的操作，服务端都会返回304 - Not Modified
    * 定时频率默认为每5分钟拉取一次，客户端也可以通过在运行时指定System Property: `apollo.refreshInterval`来覆盖，单位为分钟。
3. 客户端从Apollo配置中心服务端获取到应用的最新配置后，会保存在内存中
4. 客户端会把从服务端获取到的配置在本地文件系统缓存一份
    * 在遇到服务不可用，或网络不通的时候，依然能从本地恢复配置
5. 应用程序从Apollo客户端获取最新的配置、订阅配置更新通知

配置更新推送实现：

前面提到了Apollo客户端和服务端保持了一个长连接，从而能第一时间获得配置更新的推送。

长连接实际上我们是通过Http Long Polling实现的，具体而言：

* 客户端发起一个Http请求到服务端
* 服务端会保持住这个连接60秒
    * 如果在60秒内有客户端关心的配置变化，被保持住的客户端请求会立即返回，并告知客户端有配置变化的namespace信息，客户端会据此拉取对应namespace的最新配置
    * 如果在60秒内没有客户端关心的配置变化，那么会返回Http状态码304给客户端
* 客户端在收到服务端请求后会立即重新发起连接，回到第一步

考虑到会有数万客户端向服务端发起长连，在服务端我们使用了async servlet(Spring DeferredResult)来服务Http Long Polling请求

客户端实现总结：

- 推拉结合
  - 保持一个长连接，配置实时推送
  - 定期拉配置(fallback)
- 配置缓存在内存：本地再缓存一份
- 应用程序
  - 通过Apollo客户端获取最新配置
  - 订阅配置更新通知

## [Apollo Quick Start](https://github.com/ctripcorp/apollo/wiki/Quick-Start/)

## Spring Boot集成方式（推荐）

详情见 [Spring Boot集成方式（推荐）](https://github.com/ctripcorp/apollo/wiki/Java%E5%AE%A2%E6%88%B7%E7%AB%AF%E4%BD%BF%E7%94%A8%E6%8C%87%E5%8D%97#3213-spring-boot%E9%9B%86%E6%88%90%E6%96%B9%E5%BC%8F%E6%8E%A8%E8%8D%90/)

使用方式很简单，只需要在application.properties/bootstrap.properties中按照如下样例配置即可。

1. 注入默认`application` namespace的配置示例
```properties
     # will inject 'application' namespace in bootstrap phase
     apollo.bootstrap.enabled = true
```
   
2. 注入非默认`application` namespace或多个namespace的配置示例
```properties
     apollo.bootstrap.enabled = true
     # will inject 'application', 'FX.apollo' and 'application.yml' namespaces in bootstrap phase
     apollo.bootstrap.namespaces = application,FX.apollo,application.yml
```

3. 将Apollo配置加载提到初始化日志系统之前(1.2.0+)

从1.2.0版本开始，如果希望把日志相关的配置（如`logging.level.root=info`或`logback-spring.xml`中的参数）也放在Apollo管理，那么可以额外配置`apollo.bootstrap.eagerLoad.enabled=true`来使Apollo的加载顺序放到日志系统加载之前，不过这会导致Apollo的启动过程无法通过日志的方式输出(因为执行Apollo加载的时候，日志系统压根没有准备好呢！所以在Apollo代码中使用Slf4j的日志输出便没有任何内容)，更多信息可以参考[PR 1614](https://github.com/ctripcorp/apollo/pull/1614)。参考配置示例如下：

```properties
     # will inject 'application' namespace in bootstrap phase
     apollo.bootstrap.enabled = true
     # put apollo initialization before logging system initialization
     apollo.bootstrap.eagerLoad.enabled=true
```

## 扩展

### Why Eureka

为什么我们采用Eureka作为服务注册中心，而不是使用传统的zk、etcd呢？我大致总结了一下，有以下几方面的原因：

* 它提供了完整的Service Registry和Service Discovery实现
	* 首先是提供了完整的实现，并且也经受住了Netflix自己的生产环境考验，相对使用起来会比较省心。
* 和Spring Cloud无缝集成
	* 我们的项目本身就使用了Spring Cloud和Spring Boot，同时Spring Cloud还有一套非常完善的开源代码来整合Eureka，所以使用起来非常方便。
	* 另外，Eureka还支持在我们应用自身的容器中启动，也就是说我们的应用启动完之后，既充当了Eureka的角色，同时也是服务的提供者。这样就极大的提高了服务的可用性。
	* **这一点是我们选择Eureka而不是zk、etcd等的主要原因，为了提高配置中心的可用性和降低部署复杂度，我们需要尽可能地减少外部依赖。**
* Open Source
	* 最后一点是开源，由于代码是开源的，所以非常便于我们了解它的实现原理和排查问题。

### Apollo HA高可用设计

配置中心作为基础服务，可用性要求非常高，下面的表格描述了不同场景下Apollo的可用性：

| 场景                   | 影响                                 | 降级                                  | 原因                                                                                    |
|------------------------|--------------------------------------|---------------------------------------|-----------------------------------------------------------------------------------------|
| 某台config service下线 | 无影响                               |                                       | Config service无状态，客户端重连其它config service                                      |
| 所有config service下线 | 客户端无法读取最新配置，Portal无影响 | 客户端重启时,可以读取本地缓存配置文件 |                                                                                         |
| 某台admin service下线  | 无影响                               |                                       | Admin service无状态，Portal重连其它admin service                                        |
| 所有admin service下线  | 客户端无影响，portal无法更新配置     |                                       |                                                                                         |
| 某台portal下线         | 无影响                               |                                       | Portal域名通过slb绑定多台服务器，重试后指向可用的服务器                                 |
| 全部portal下线         | 客户端无影响，portal无法更新配置     |                                       |                                                                                         |
| 某个数据中心下线       | 无影响                               |                                       | 多数据中心部署，数据完全同步，Meta Server/Portal域名通过slb自动切换到其它存活的数据中心 |

### HA架构视图和部署图例

![5][5]

### 实时推送设计

![6][6]

### Spring Cloud Config 简介

Spring Cloud Config 分为服务端和客户端两个部分。服务端被称为分布式配置中心，它是个独立的应用，可以从配置仓库获取配置信息并提供给客户端使用。客户端可以通过配置中心来获取配置信息，在启动时加载配置。Spring Cloud Config 的配置中心默认采用Git来存储配置信息，所以天然就支持配置信息的版本管理，并且可以使用Git客户端来方便地管理和访问配置信息。

基于3个维度的配置管理：

- 应用 (application)；
- 环境 (profile) dev/test/prod；
- 版本 (label)；

优势：

- 配置存储支持Git；
- 和Spring无缝集成；
- 设计简单轻量；

不足：

- 动态配置能力弱；
- 治理能力弱；
- 不算严格企业级；

### 简化架构

![8][8]

Config Client实现细节：

![9][9]

### 动态配置实现

![10][10]

### 何谓动态配置更新

这里大部分人会有一个误解，Apollo 支持动态配置更新是不是就能自动帮我动态调节更新比如数据库连接池。这是不能的，Apollo 只负责把配置更新动态交付到应用配置客户端，应用拿到这个更新后要去重启数据库的 driver，这个动作 Apollo 是不管的。Apollo 只管交付，调整配置的动作是应用自己要去实现的，有些第三方的库是支持动态调整更新的比如：Logback、Sentinel 等。

### Apollo vs Spring Cloud Config vs K8s ConfigMap

|                | Apollo                                                   | Spring Cloud Config                 | K8s ConfigMaps                     |
| -------------- | ---------------------------------------------------------- | ----------------------- | -------------------------------- |
| 配置界面 | 统一界面管理不同环境和集群配置 | 无，通过git操作 | Cli或Dashboard |
| 配置存储 | DB | Git | Etcd |
| 配置生效时间 | 实时推送+应用配合 | 近实时+应用配合 | 近实时+应用配合 |
| 动态配置 | 支持，实时推送 | 复杂+Mq | 支持发布更新 |
| 版本管理 | UI支持发布历史和回滚 | 无，通过git操作 | 无，需自己管理 |
| 灰度发布 | 支持 | 不支持 | 支持灰度发布 |
| 授权/审计/审核 | UI操作，修改和发布权限分离 | 需通过git仓库设置 | K8s平台部分支持 |
| 实例配置监控 | 可见哪些客户端配置生效 | 不支持 | 可查询容器环境变量 |
| 客户端支持 | 原生Java/.Net，提供API，支 持Spring标注 | Spring应用+标注支持 | 语言无关 |

> 为什么没有对比 Nacos？，Nacos 还在早期，大规模案例未见，不过可以持续关注它(keep an eye on it)。企业级集中配置中心建议考虑 Apollo。如果企业也同时采用 k8s 平台，那么可以 apollo 为主，configmap 作为补充。技术选型的一个原则：选成熟的，已经有大规模成功落地案例的产品。

### 其它开源配置中心产品

- Alibaba Nacos https://github.com/alibaba/nacos/
- HashiCorp Consul https://github.com/hashicorp/consul/
- 百度 Disconf https://github.com/knightliao/disconf/
- Qihoo360 QConf https://github.com/Qihoo360/QConf/
- Netflix Archaius（客户端，可以扩展对接Apollo）https://github.com/Netflix/archaius/
- SaaS 服务 https://launchdarkly.com/
- SaaS 服务 https://featureflags.io/

### 开关驱动开发

开关驱动开发(Feature Flag Driven Development)是配置中心的高级应用，可结合A/B测试，也是 DevOps 最佳实践，原理如下：

![11][11]

首要要有一个开关配置中心，开发应用的新功能和老功能同时存在，但是会增加一个逻辑判断，看这个开关（flag）是否打开，如果开关打开就走新功能逻辑，没打开就走老功能逻辑，这个开关的值就是从配置中心拿取。

这个理念国外应用的比较多，国内只有一些一线互联网公司有些落地。

#### 基于开关的持续交付

![12][12]

> https://blog.launchdarkly.com/feature-flag-driven-development/

#### 长生命期分支的问题

![13][13]

开关驱动开发还解决了长生命周期分支的问题，现代开发我们一般会采用 git flow 方式，会开很多分支（团队分支、功能分支），会有很多问题比如说：Merge hell（合并冲突）、开销大效率低，特别是微服务中会有很多的分支，一个微服务或一个小团队就会有一个分支，那么最后合并的时候是非常痛苦的。

#### 基于主干开发

![14][14]

多分支带来很多问题，这时候有提出了 Trunk based Development(TBD) 开发模式，这种方式提倡尽量不要开分支，尽量在主干上开发，它提出了一些做法：

- 每天至少向主干 Trunk 提交一次；
- Trunk 始终在可发布状态；
- 将新功能代码(或者未完成代码)影藏在功能开关后面；
- 使用 branch by abstraction 进行重构；
- 可以开分支 branch，但是一般不超过2天；

#### Branch by Abstraction 重构

有些时候我们需要进行重构，重构就要开分支，但是 TBD 由不提倡开分支，这个时候就要用到功能开关。

![15][15]

Branch by Abstraction 的意思大概是如果我们要对一个老的行为进行重构，先做一个所谓的抽象，把接口先提取出来让老功能躲在接口后面，访问的时候通过接口先去访问老功能。要重构的新功能也躲在接口后面但是刚开始的时候开关指向的是老功能，过了一段时间新能完全重构好了，在把开关指向到新功能。

#### Re-planning

![16][16]

我们在产品研发过程当中，有的时候业务方会反悔，我们花了半个月去交付了一个新功能，产品突然说这个功能我们不要了，我们要撤掉。

如果说没有用 TBD 或开关驱动开发的模式，好不容易做到 A+B+C 版本都上线了，要去做回退就要去做很多个 Unmerger，还要测试很费力气还没有生产力。

如果说用了开关这种模式，A+B+C 功能在后面增加新功能 E+D或者E+F，都是躲在开关后面的，如果产品反悔了，他拍脑袋说这D+E+F 我们不做了，都要退回去回到 C，我们只要去调一下开关，跑一下 CI 修复一下失败的测试就可以了。

#### TBD 优劣权衡

优：

- 新功能和代码发布分离，减轻发布风险；
- 迭代速度快，快速创新实验；
- 可定制高级A/B测试；
- 相比复杂发布系统，投入成本相对低；
- 没有分支开发(Feature Branch)的合并冲突问题；

劣：

- 代码侵入，技术债，需要定期清理；
- 需要开关配置中心配合；
- 需要DevOps文化和流程配合；

## 参考

- https://github.com/ctripcorp/apollo/
- https://github.com/ctripcorp/apollo/wiki/
- https://github.com/nobodyiam/apollo-build-scripts/
- https://github.com/ctripcorp/apollo-use-cases/
- https://spring.io/projects/spring-cloud-config/
- https://spring.io/projects/spring-cloud-bus/
- http://www.iocoder.cn/categories/Apollo/
- http://p.primeton.com/articles/59f2c45e4be8e639a5002b84/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/apollo/1.jpg
[2]: /images/java/apollo/2.png
[3]: /images/java/apollo/3.png
[4]: /images/java/apollo/4.png
[5]: /images/java/apollo/5.jpg
[6]: /images/java/apollo/6.jpg
[7]: /images/java/apollo/7.png
[8]: /images/java/apollo/8.jpg
[9]: /images/java/apollo/9.jpg
[10]: /images/java/apollo/10.jpg
[11]: /images/java/apollo/11.jpg
[12]: /images/java/apollo/12.jpg
[13]: /images/java/apollo/13.jpg
[14]: /images/java/apollo/14.jpg
[15]: /images/java/apollo/15.jpg
[16]: /images/java/apollo/16.jpg
