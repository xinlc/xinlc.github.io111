---
title: 微服务架构之服务注册与发现：Spring Cloud Eureka
date: 2020-02-15 15:38:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

在微服务架构中往往会有一个注册中心，每个微服务都会向注册中心去注册自己的地址及端口信息，注册中心维护着服务名称与服务实例的对应关系。每个微服务都会定时从注册中心获取服务列表，同时汇报自己的运行情况，这样当有的服务需要调用其他服务时，就可以从自己获取到的服务列表中获取实例地址进行调用，Eureka 实现了这套服务注册与发现机制。

<!--more-->

## 为什么需要服务注册与发现？

![1][1]

从单体应用演化成微服务后，由于微服务的颗粒度较细，一个单体应用可以拆分出很多服务。企业内部可能存在上百个服务，那么他们如何发现并寻址？

微服务架构的根本问题：

![2][2]

解决办法就是使用代理，代理模式一般有三种模式。

![3][3]

### 传统集中式代理

![4][4]

### 服务注册中心+客户端嵌入式代理

![5][5]

### 主机独立式进程代理

![6][6]

### 三种模式比较

| 模式 | 优 | 不足 | 适用场景 | 公司案例 |
| :-------------- | :----------- |:----------- |:----------- |:----------- |
| 集中式理 | 运维简单、集中治理、语言栈无关 | 配置麻烦周期长、单点问题、多一跳有性能开销 | 中大小规模公司都适用，需一定运维能力 | 亿贝，携程，拍拍贷 |
| 客户端嵌入式代理 | 无单点，性能好 | 客户端复杂、多语言麻烦、治理松散 | 中大规模公司，语言栈较统一 | Twitter Finagle、阿里 Dubbo、Netflix Karyon,、新浪微博 Motan |
| 主机独立进程代理 | 折中方案 | 运维部署复杂 | 中大规模公司，运维能力强 | Airbnb SmartStack、唯品会、新浪微博 Motan、Istio ServiceMesh |

## Eureka 简介

Eureka 是一个基于 REST 的服务，主要用于 AWS 云中的定位服务，以实现中间层服务器的负载平衡和故障转移。在 Spring Cloud 微服务架构中通常用作注册中心，我们称这个服务为 Eureka Server，还有一个与之交互的客户端称之为 Eureka Client。

- 阿基米德发现浮力定律时发出的惊叹声，寓意微服务发现；
- 云服务发现组件，支持跨区域高可用（AP 原则：高可用，分区容错性）；
- 提供Java based client，提供 RESTful API 支持多语言对接；
- 主要解决云中服务实例动态启停、漂移问题；
- 2012年由 Netflix 开源
  - https://github.com/Netflix/eureka
  - https://github.com/Netflix/eureka/wiki/Eureka-at-a-glance

在 Netflix 中主要场景是中间层负载均衡：

![7][7]

## 架构原理

![8][8]

如上图所示，其中

- Application Server：表示服务提供方；
- Application Client：表示服务消费方；
- Make Remote Call：表示远程调用；

服务在 Eureka 上注册，然后每隔30秒发送心跳来更新它们的租约。如果客户端不能多次续订租约，那么它将在大约90秒内从服务器注册表中剔除。注册信息和更新被复制到集群中的所有 Eureka 节点。来自任何区域的客户端都可以查找注册表信息（每30秒发生一次）来定位它们的服务（可能在任何区域）并进行远程调用。

> PS：Eureka Client 需要每30秒给 Eureka Server 发一次心跳，同时更新 Server 上最新的注册信息到本地，如果Server 多次没有收到来自客户端的心跳，那么在90秒内会被 Server 上剔除。

两大组件：

- Eureka Server：提供注册服务；
- Eureka Client：JAVA客户端，负责发送心跳；

三大角色：

- Eureka Server：提供服务注册和发现；
- Service Provider：服务提供方，将自身服务注册到 Eureka，从而使服务消费方能够找到；
- Service Consumer：服务消费方，从 Eureka 获取注册服务列表，从而能够消费服务；

### Eureka 客户端与服务器之间的通信

服务发现有两种模式：一种是客户端发现模式，一种是服务端发现模式。Eureka 采用的是客户端发现模式。

#### Register（注册）

Eureka 客户端将关于运行实例的信息注册到 Eureka 服务器。注册发生在第一次心跳。

#### Renew（更新 / 续借）

Eureka 客户端需要更新最新注册信息（续借），通过每30秒发送一次心跳。更新通知是为了告诉 Eureka 服务器实例仍然存活。如果服务器在90秒内没有看到更新，它会将实例从注册表中删除。建议不要更改更新间隔，因为服务器使用该信息来确定客户机与服务器之间的通信是否存在广泛传播的问题。

#### Fetch Registry（抓取注册信息）

Eureka 客户端从服务器获取注册表信息并在本地缓存。之后，客户端使用这些信息来查找其他服务。通过在上一个获取周期和当前获取周期之间获取增量更新，这些信息会定期更新(每30秒更新一次)。获取的时候可能返回相同的实例。Eureka 客户端自动处理重复信息。

#### Cancel（取消）

Eureka 客户端在关机时向 Eureka 服务器发送一个取消请求。这将从服务器的实例注册表中删除实例，从而有效地将实例从流量中取出。

### Eureka 自我保护模式

如果 Eureka 服务器检测到超过预期数量的注册客户端以一种不优雅的方式终止了连接，并且同时正在等待被驱逐，那么它们将进入自我保护模式。这样做是为了确保灾难性网络事件不会擦除 Eureka 注册表数据，并将其向下传播到所有客户端。

任何客户端，如果连续3次心跳更新失败，那么它将被视为非正常终止，病句将被剔除。当超过当前注册实例15%的客户端都处于这种状态，那么自我保护将被开启。

当自我保护开启以后，Eureka 服务器将停止剔除所有实例，直到：它看到的心跳续借的数量回到了预期的阈值之上，或者自我保护被禁用。

默认情况下，自我保护是启用的，并且，默认的阈值是要大于当前注册数量的15%。

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR1

## 搭建 Eureka 注册中心

创建一个 eureka-server 模块，在 pom.xml 文件添加依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

在启动类上添加 @EnableEurekaServer 注解来启用 Euerka 注册中心功能：

```java
@EnableEurekaServer
@SpringBootApplication
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

在配置文件 application.yml 中添加 Eureka 注册中心的配置：

```yaml
server:
  port: 8001 #指定运行端口
spring:
  application:
    name: eureka-server #指定服务名称
eureka:
  instance:
    hostname: localhost #指定主机地址
  client:
    fetch-registry: false #指定是否要从注册中心获取服务（注册中心不需要开启）
    register-with-eureka: false #指定是否要注册到注册中心（注册中心不需要开启）
  server:
    enable-self-preservation: false #关闭保护模式
```

启动服务后访问地址 http://localhost:8001/ 可以看到 Eureka 注册中心的界面。

## 搭建 Eureka 客户端

新建一个 eureka-client 模块，并在 pom.xml 中添加如下依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

在启动类上添加 @EnableDiscoveryClient 注解表明是一个 Eureka 客户端：

```java
@EnableDiscoveryClient
@SpringBootApplication
public class EurekaClientApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaClientApplication.class, args);
    }
}
```

在配置文件 application.yml 中添加 Eureka 客户端的配置：

```yaml
server:
  port: 8101 #运行端口号
spring:
  application:
    name: eureka-client #服务名称
eureka:
  client:
    register-with-eureka: true #注册到Eureka的注册中心
    fetch-registry: true #获取注册实例列表
    service-url:
      defaultZone: http://localhost:8001/eureka/ #配置注册中心地址
```

运行后查看注册中心 http://localhost:8001/ 发现 Eureka 客户端已经成功注册。

## 搭建Eureka注册中心集群

由于所有服务都会注册到注册中心去，服务之间的调用都是通过从注册中心获取的服务列表来调用，注册中心一旦宕机，所有服务调用都会出现问题。所以我们需要多个注册中心组成集群来提供服务，下面将搭建一个双节点的注册中心集群。

给 eureka-sever 添加配置文件 application-replica1.yml 配置第一个注册中心：

```yaml
server:
  port: 8002
spring:
  application:
    name: eureka-server
eureka:
  instance:
    hostname: replica1
  client:
    serviceUrl:
      defaultZone: http://replica2:8003/eureka/ #注册到另一个Eureka注册中心
    fetch-registry: true
    register-with-eureka: true
```

给 eureka-sever 添加配置文件 application-replica2.yml 配置第二个注册中心：

```yaml
server:
  port: 8003
spring:
  application:
    name: eureka-server
eureka:
  instance:
    hostname: replica2
  client:
    serviceUrl:
      defaultZone: http://replica1:8002/eureka/ #注册到另一个Eureka注册中心
    fetch-registry: true
    register-with-eureka: true
```

这里我们通过两个注册中心互相注册，搭建了注册中心的双节点集群，由于 defaultZone 使用了域名，所以还需在本机的 host 文件中配置一下。

修改本地 host 文件：

```bash
127.0.0.1 replica1
127.0.0.1 replica2
```

启动第二个 eureka-server，可以在 idea 中再添加一个 Spring Boot 配置，并指定 Active profiles 为replica2。

访问其中一个注册中心 http://replica1:8002/ 发现另一个已经成为其备份。

修改 Eureka-client，让其连接到集群，添加 eureka-client 的配置文件 application-replica.yml，让其同时注册到两个注册中心：

```yaml
server:
  port: 8102
spring:
  application:
    name: eureka-client
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://replica1:8002/eureka/,http://replica2:8003/eureka/ #同时注册到两个注册中心
```

> 以该配置文件启动后访问任意一个注册中心节点都可以看到 eureka-client

## 给 Eureka 注册中心添加认证

创建一个 eureka-security-server 模块，在 pom.xml 中添加以下依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

添加 application.yml 配置文件：

```yaml
server:
  port: 8004
spring:
  application:
    name: eureka-security-server
  security: #配置SpringSecurity登录用户名和密码
    user:
      name: leo
      password: 123456
eureka:
  instance:
    hostname: localhost
  client:
    fetch-registry: false
    register-with-eureka: false
```

添加 Java 配置 WebSecurityConfig，默认情况下添加 SpringSecurity 依赖的应用每个请求都需要添加 CSRF token 才能访问，Eureka 客户端注册时并不会添加，所以需要配置 /eureka/** 路径不需要CSRF token。

```java
@EnableWebSecurity
public class WebSecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf().ignoringAntMatchers("/eureka/**");
        super.configure(http);
    }
}
```

运行 eureka-security-server，访问 http://localhost:8004 发现需要登录认证。

eureka-client 注册到有登录认证的注册中心，配置文件中需要修改注册中心地址格式：

```bash
http://${username}:${password}@${hostname}:${port}/eureka/
```

添加 application-security.yml 配置文件，按格式修改用户名和密码：

```yaml
server:
  port: 8103
spring:
  application:
    name: eureka-client
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://leo:123456@localhost:8004/eureka/
```

以 application-security.yml 配置运行 eureka-client，可以在注册中心界面看到 eureka-client 已经成功注册。

## Eureka 的常用配置

```yaml
eureka:
  client: #eureka客户端配置
    register-with-eureka: true #是否将自己注册到eureka服务端上去
    fetch-registry: true #是否获取eureka服务端上注册的服务列表
    service-url:
      defaultZone: http://localhost:8001/eureka/ # 指定注册中心地址
    enabled: true # 启用eureka客户端
    registry-fetch-interval-seconds: 30 #定义去eureka服务端获取服务列表的时间间隔
  instance: #eureka客户端实例配置
    lease-renewal-interval-in-seconds: 30 #定义服务多久去注册中心续约
    lease-expiration-duration-in-seconds: 90 #定义服务多久不去续约认为服务失效
    metadata-map:
      zone: beijing #所在区域
    hostname: localhost #服务主机名称
    prefer-ip-address: false #是否优先使用ip来作为主机名
  server: #eureka服务端配置
    enable-self-preservation: false #关闭eureka服务端的保护机制
```

## 扩展

### Eureka VS Zookeeper

#### Eureka 保证 AP

Eureka 服务器节点之间是对等的，只要有一个节点在，就可以正常提供服务。

Eureka 客户端的所有操作可能需要一段时间才能在 Eureka 服务器中反映出来，随后在其他 Eureka 客户端中反映出来。也就是说，客户端获取到的注册信息可能不是最新的，它并不保证强一致性

#### Zookeeper 保证 CP

Zookeeper 集群中有一个 Leader，多个 Follower。Leader 负责写，Follower 负责读，ZK 客户端连接到任何一个节点都是一样的，写操作完成以后要同步给所有 Follower 以后才会返回。如果 Leader 挂了，那么重新选出新的Leader，在此期间服务不可用。

#### 为什么用 Eureka

分布式系统大都可以归结为两个问题：数据一致性和防止单点故障。而作为注册中心的话，即使在一段时间内不一致，也不会有太大影响，所以在A和C之间选择A是比较适合该场景的。

### 其他服务注册发现产品

- Hashicorp Consul https://www.consul.io/
- Etcd https://github.com/etcd-io/etcd/
- Apache Zookeeper http://zookeeper.apache.org/
- Alibaba Nacos https://github.com/alibaba/nacos/

### 常用服务发现组件比较

| 功能 | Eureka | Consul | Zookeeper | Etcd |
| :-------------- | :----------- |:----------- |:----------- |:----------- |
|服务健康检查 | 客户主动报心跳 | 服务状态，内存，磁盘等 | (弱)长连接，keepalive | 连接心跳 |
| 多数据中心支持 | 支持 | 支持 | 不支持 | 不支持 |
| Kv存储支持 | 不支持 | 支持 | 支持 | 支持 |
| 一致性协议 | 定制P2P | Raft | Paxos | Raft |
| CAP | AP | CP | CP | CP |
| 客户端接口 | Java/http http/dns | 客户端 | http/grpc |
| watch支持 | 定期pull/大部分增量 | 全量/支持long pulling | 支持 | 支持long pulling |
| 自身监控 | Metrics | Metrics | NA | Metrics |
| 安全 | NA | ACL/https | ACL | https支持(弱) |
| Spring cloud 集成 | 已支持 | 已支持 | 已支持 | 已支持 |
| 社区流行度（服务注册发现场景）| 流行 | 流行 | 一般 | 一般 |

### ServiceMesh 和 Istio 简介

ServiceMesh 的本质就是代理模式三，这种模式也被称为边车 SideCar 模式。

![9][9]

在每个主机部署一个 SideCar，就像部署一个模式三的 Proxy。业务逻辑都在业务服务代码当中，SideCar 负责做跨横切面的事情。

基于这个模式提出了一个新的概念叫服务网格：

![10][10]

在每个主机上部署一个 SideCar，绿色是业务代码，蓝色是 SideCar。把蓝色抽取处理就像网格一样。

Control Plane 是控制 SideCar 之间的流量调度。怎么发现对方，怎么调度，负载均衡等。

Istio 是一个 Google 发起的组织，其实就是把 ServiceMesh 给产品化了，它提出一个架构：

![11][11]

它在每个容器上驻一个 Proxy（Envoy），本地发起一个服务会先路由到 Proxy，由 Proxy 找到另个 Proxy 在路由到服务。控制面板就是发送一些调度指令的，Istio-Manager 是管理配置的（服务发现的配置、负载的配置等）。Mixer 是做收集 Metrics，做监控用的。Istio-Auth 这个模块是用来下发一些安全认证相关的。

### 持续交付架构

![12][12]

## 参考

- https://github.com/Netflix/eureka/wiki/Eureka-at-a-glance/
- https://cloud.spring.io/spring-cloud-netflix/reference/html/
- [深度剖析服务发现组件~Netflix Eureka](https://zhuanlan.zhihu.com/p/24829766/)
- https://juejin.im/post/5d78cd53f265da03d55e8351/
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/java/spring-cloud-eureka/1.jpg
[2]: /images/java/spring-cloud-eureka/2.jpg
[3]: /images/java/spring-cloud-eureka/3.jpg
[4]: /images/java/spring-cloud-eureka/4.jpg
[5]: /images/java/spring-cloud-eureka/5.jpg
[6]: /images/java/spring-cloud-eureka/6.jpg
[7]: /images/java/spring-cloud-eureka/7.jpg
[8]: /images/java/spring-cloud-eureka/8.jpg
[9]: /images/java/spring-cloud-eureka/9.jpg
[10]: /images/java/spring-cloud-eureka/10.jpg
[11]: /images/java/spring-cloud-eureka/11.jpg
[12]: /images/java/spring-cloud-eureka/12.jpg
