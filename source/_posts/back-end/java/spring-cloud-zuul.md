---
title: 微服务架构之API网关：Spring Cloud Zuul
date: 2020-02-22 15:32:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

Spring Cloud Zuul 是 Spring Cloud Netflix 子项目的核心组件之一，可以作为微服务架构中的 API 网关使用，支持动态路由与过滤功能。

为什么前面已经写了 Spring Cloud Gateway，还要在写 Zuul 呢？可能是周末闲的不能出去，反正已经学了，总得记下点什么不是…… 武汉加油！中国加油！

<!--more-->

## 再介绍API网关

为什么要再次介绍网关？因为它在服务中真的很重要！

### API网关是如何演化出来的？

![1][1]

以前我们都采用单体架构，在单体应用时代，我们一般会把一些功能抽取出来放在过滤器当中。比如安全认证功能，一般会用 Spring Security 或者 Apache Shiro，它们都是通过过滤器实现的，可以截获请求然后做一些安全过滤的工作。

那么到了微服务时代，我们之前的单体的业务逻辑被拆分成若干个小的微服务，这些小的微服务也有一些公共的跨横切面的功能逻辑，比如：安全、路由、日志等等。如果说让这些每个微服务都来处理这些功能话，这个微服务就会很复杂，开发人员不仅要去处理业务逻辑还要去处理这些公共逻辑，开发的负担就比较重。所有我们也会把这些公共的逻辑抽取出来，放在一个叫网关的这样一个独立组件（边界服务）上面，网关就是这样产生的。

还有重要的一点，在单体应用的时代我们的应用一般是浏览器，现在我们应用的形态变的更多了，除了有浏览器还有H5的应用，无线的应用，除此之外一般企业还有开放平台，把业务能力以 API 的形式暴露出来，让第三方来调用开发，接入到企业的内部平台上，那么如果没有网关，让这些不同形态的应用去对接微服务就会产生一个非常服务的网状结构，使用网关以后，外面的这些形态只需对接一个入口。

### API网关基本功能

网关是外面的客户端和内部各种微服务之间的中间环节（代理环节），它应该具备一些基本功能：

![2][2]

- 单点入口：有了网关以后，客户端只看到一个单点入口，比如：api.com；
- 路由转发：内部的微服务有很多，外面客户端只看到一个入口，那么外面请求来了以后到底对应的是哪个服务呢？网关就要负责做路由转发，根据请求的一些路径啊或者是 Header 转发到内部具体的微服务；
- 限流熔断：微服务架构后台的每个服务都有可能出错或者产生延迟，如果没有限流熔断机制很容易造成客户端阻塞或者严重的雪崩效应，网关要做限流熔断保护后台服务；
- 日志监控：所有的请求都经过网关，我们就可以对它进行日志收集和监控，整个系统健不健康，有没有人利用我们的服务做坏事情都可以通过网关做集中的监控；
- 安全认证：请求都经过网关进入企业内部服务，网关就像是一个大门，每个请求进来要检查它是不是安全的有没有经过认证；

## Netflix Zuul 网关简介

Netflix 于 2012 年初开源 Zuul 网关：

- https://github.com/Netflix/zuul
- Zuul is an edge service that provides dynamic routing, monitoring, resiliency, security, and more；
- Zuul 在英文中是怪兽的意思，寓意看门神兽；
- 2014 年被 Pivotal 集成入 Spring Cloud 体系中；
- 亮点：可动态发布的过滤器机制，可动态插拔。
- 缺点：性能一般，Zuul 1.0 使用阻塞API，不支持任何长连接，如 websocket。当然在 Zuul 2.0 中采用了 Netty实现异步非阻塞编程模型，性能已经提升很多（20%左右）。

Netflix 架构体系和 Zuul：

![3][3]

## 架构原理

![4][4]

Zuul 架构大概分是哪个模块，第一模块（绿色）网关过滤器管理模块，第二模块（粉红色）网关过滤器加载模块，第三模块（蓝色）核心运行时模块。

- 过滤器管理模块：让开发人员或运维人员管理过滤器，主要是上传过滤器代码文件；
- 过滤器加载模块：定期扫描过滤器存储数据库，看是否有变更，如果有变更，加载模块会先把过滤器拉到本地过滤器目录中，然后加载到运行时；
- 网关过滤器运行时：本质是一个Http Servlet，当请求过来后，会先经过 servlet，然后到 filter runner 组件，整个请求过滤都是由 Runner 负责。请求会一次经过前置路由过滤器、路由过滤器、后置路由过滤器进行过滤；
- Request Context 组件：一个共享存储空间，请求在过滤器当中流转是，它们需要一些共享的信息，比如前置路由过滤器会设置一些信息给到路由过滤器去读取，那这个信息的交换是通过 Context 来完成，而且是线程安全的；
- 过滤器文件：过滤器文件是 Groovy 脚本，可以被动态编译。

### 请求处理生命周期

![5][5]

请求进来后会先走前置过滤器，然后路由过滤器，路由过滤器会去向后发起请求，resposne 会经过后置过滤器。这三个过滤器任何一个出错都会传给 错误过滤器。

### 过滤器关键概念

#### 类型 Type

定义在路由流程中，过滤器被应用的阶段：pre、routing、post、error。

标准过滤器类型：

![6][6]

#### 执行顺序 Execution Order

在同一个 Type 中，定义过滤器执行的顺序，每个阶段都可能有很多个过滤器，那么可以指定这些过滤器的执行顺序。

#### 条件 Criteria

过滤器被执行必须满足的条件。

#### 动作 Action

如果条件满足，过滤器中将被执行的动作。

### Zuul 1.0 VS Zuul 2.0

#### Zuul 1.0 阻塞多线程模式

![7][7]

Zuul 1.0 其实就是 Servlet，基于阻塞多线程模式，是比较常见的模式大部分 web 应用都是采用这种模式（如 Spring MVC）比较简单清晰。每个请求来个时候 Servlet 容器给它分配一个线程来处理这个请求，那这中间做 IO 操作的时候都会被阻塞这个线程。

#### Zuul 2.0 非阻塞异步模式

![8][8]

Zuul 2.0 最大的变化就是非阻塞异步模式，事件机制或者说队列机制，每个请求来的时候会先放到事件总线中或者队列中，它的处理线程是一个事件环，每个 Core 上只有一个线程，这个线程对订阅在总线上，也会监听后台返回的事件。很多人误以为这个模式会提高性能，正确的说法应该是提高吞吐量，能接收的请求比较多，连接数比较多。

#### 阻塞和非阻塞比较有劣

| 机制 | 优点 | 不足 | 适用 |
| :-------------- | :----------- |:----------- |:----------- |
| 阻塞模式 | 编程模型简单； 开发调试运维简单 | 线程上下文切换开销；连接数限制；延迟阻塞耗尽线程连接资源 |  计算密集型(CPU bound)场景 |
| 非阻塞模式 | 线程开销少；连接数易扩展 | 编程模型复杂；开发调试运维复杂；ThreadLocak不work |  IO密集型(IO bound)场景 |

Zuul 1.0 和 Zuul 2.0 [性能比较](https://github.com/strangeloop/StrangeLoop2017/blob/master/slides/ArthurGonigberg-ZuulsJourneyToNonBlocking.pdf)，其实并没有提高多少性能，官方的博文说大概提高20%，但是带来的却是高复杂度。Zuul 1.0 可以用 AsyncServlet 优化。

#### Zuul 2.0 架构

![9][9]

Zuul 2.0 架构的变化主要是前端，1.0 是 Servlet，2.0 是 Netty Server 是个异步 Server。对后端的调用 1.0 主要用 Apache HttpClient，2.0 改成了 Netty 的 Client 也是异步的。然后就是把三个过滤器名称改了。

#### Zuul 2.0 额外亮点

支持比较新的服务器协议：

- HTTP/2
- Mutual TLS

弹性：

- Adaptive Retries (自适应重试) ；
- Origin Concurrency Protection（源并发保护），最后台服务的并发保护；

运维：

- Request Passport，主要解决异步调试问题；
- Status Categories (状态码分类）增加，也是方便调试；
- Request Attempts 跟踪请求重试；

## Spring Cloud Zuul 简介

2014 年 Spring 母公司 Pivotal 把 Zuul 集成入 Spring Cloud 体系中，只是通过 Spring boot 做了个包装，使用更简单，但是没有实现动态过滤器加载。对开发友好，但是对生产不是很友好。

- Netflix Zuul内核 + Spring Boot；
- EnableZuulProxy 标注；
- 去掉了动态过滤器加载！

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR1

## 创建一个 zuul-proxy 模块

zuul-proxy 模块来演示 zuul 的常用功能，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-zuul</artifactId>
</dependency>
```

在 application.yml 中进行配置：

```yaml
server:
  port: 8801
spring:
  application:
    name: zuul-proxy
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
```

在启动类上添加 @EnableZuulProxy 注解来启用 Zuul 的 API 网关功能：

```java
@EnableZuulProxy
@EnableDiscoveryClient
@SpringBootApplication
public class ZuulProxyApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZuulProxyApplication.class, args);
    }
}
```

启动 eureka-server，两个 user-service，feign-service 和 zuul-proxy 来演示 Zuul 的常用功能。

## 常用功能

### 配置路由规则

通过修改 application.yml 中的配置来配置路由规则，将匹配 /userService/** 的请求路由到 user-service 服务上去，匹配 /feignService/** 的请求路由到 feign-service 上去。

```yaml
zuul:
  routes: #给服务配置路由
    user-service:
      path: /userService/**
    feign-service:
      path: /feignService/**
```

访问 http://localhost:8801/userService/user/1 可以发现请求路由到了 user-service 上了。

访问 http://localhost:8801/feignService/user/1 可以发现请求路由到了 feign-service上了。

### 默认路由规则

Zuul 和 Eureka 结合使用，可以实现路由的自动配置，自动配置的路由以服务名称为匹配路径，相当于如下配置：

```yaml
zuul:
  routes: #给服务配置路由
    user-service:
      path: /user-service/**
    feign-service:
      path: /feign-service/**
```

访问 http://localhost:8801/user-service/user/1 同样可以路由到了 user-service 上了。

访问 http://localhost:8801/feign-service/user/1 同样可以路由到了feign-service 上了。

如果不想使用默认的路由规则，可以添加以下配置来忽略默认路由配置：

```yaml
zuul:
  ignored-services: user-service,feign-service #关闭默认路由配置
```

### 负载均衡功能

多次调用 http://localhost:8801/user-service/user/1 进行测试，可以发现运行在 8201 和 8202 的 user-service 服务交替打印如下信息。

### 配置访问前缀

可以通过以下配置来给网关路径添加前缀，此处添加了 /proxy 前缀，这样需要访问 http://localhost:8801/proxy/user-service/user/1 才能访问到 user-service 中的接口：

```yaml
zuul:
  prefix: /proxy #给网关路由添加前缀
```

### Header 过滤及重定向添加 Host

Zuul 在请求路由时，默认会过滤掉一些敏感的头信息，以下配置可以防止路由时的 Cookie 及 Authorization 的丢失：

```yaml
zuul:
  sensitive-headers: Cookie,Set-Cookie,Authorization #配置过滤敏感的请求头信息，设置为空就不会过滤
```

Zuul 在请求路由时，不会设置最初的 host 头信息，以下配置可以解决：

```yaml
zuul:
  add-host-header: true #设置为true重定向是会添加host请求头
```

### 查看路由信息

通过 SpringBoot Actuator 来查看 Zuul 中的路由信息，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

修改 application.yaml 配置文件，开启查看路由的端点：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: 'routes'
```

通过访问 http://localhost:8801/actuator/routes 查看简单路由信息。

通过访问 http://localhost:8801/actuator/routes/details 查看详细路由信息。

## 过滤器

### 自定义过滤器

#### 添加 PreLogFilter 类继承 ZuulFilter

这是一个前置过滤器，用于在请求路由到目标服务前打印请求日志：

```java
@Component
public class PreLogFilter extends ZuulFilter {
    private Logger LOGGER = LoggerFactory.getLogger(this.getClass());

    /**
     * 过滤器类型，有pre、routing、post、error四种。
     */
    @Override
    public String filterType() {
        return "pre";
    }

    /**
     * 过滤器执行顺序，数值越小优先级越高。
     */
    @Override
    public int filterOrder() {
        return 1;
    }

    /**
     * 是否进行过滤，返回true会执行过滤。
     */
    @Override
    public boolean shouldFilter() {
        return true;
    }

    /**
     * 自定义的过滤器逻辑，当shouldFilter()返回true时会执行。
     */
    @Override
    public Object run() throws ZuulException {
        RequestContext requestContext = RequestContext.getCurrentContext();
        HttpServletRequest request = requestContext.getRequest();
        String host = request.getRemoteHost();
        String method = request.getMethod();
        String uri = request.getRequestURI();
        LOGGER.info("Remote host:{},method:{},uri:{}", host, method, uri);
        return null;
    }
}
```

### 核心过滤器

| 过滤器名称              | 过滤类型 | 优先级 | 过滤器的作用                                                 |
| :--------------------------- | :------- | :----- | :----------------------------------------------------------- |
| ServletDetectionFilter  | pre      | -3     | 检测当前请求是通过 DispatcherServlet 处理运行的还是ZuulServlet运行处理的。 |
| Servlet30WrapperFilter  | pre      | -2     | 对原始的 HttpServletRequest 进行包装。                         |
| FormBodyWrapperFilter   | pre      | -1     | 将 Content-Type 为 application/x-www-form-urlencoded 或 multipart/form-data 的请求包装成 FormBodyRequestWrapper 对象。 |
| DebugFilter             | route    | 1      | 根据 zuul.debug.request 的配置来决定是否打印 debug 日志。        |
| PreDecorationFilter     | route    | 5      | 对当前请求进行预处理以便执行后续操作。                       |
| RibbonRoutingFilter     | route    | 10     | 通过 Ribbon 和 Hystrix 来向服务实例发起请求，并将请求结果进行返回。 |
| SimpleHostRoutingFilter | route    | 100    | 只对请求上下文中有 routeHost 参数的进行处理，直接使用 HttpClient 向 routeHost 对应的物理地址进行转发。 |
| SendForwardFilter       | route    | 500    | 只对请求上下文中有 forward.to 参数的进行处理，进行本地跳转。   |
| SendErrorFilter         | post     | 0      | 当其他过滤器内部发生异常时的会由它来进行处理，产生错误响应。 |
| SendResponseFilter      | post     | 1000   | 利用请求上下文的响应信息来组织请求成功的响应内容。           |

### 禁用过滤器

可以对过滤器进行禁用的配置，配置格式如下：

```yaml
zuul:
  filterClassName:
    filter:
      disable: true
```

以下是禁用 PreLogFilter 的示例配置：

```yaml
zuul:
  PreLogFilter:
    pre:
      disable: true
```

## Ribbon 和 Hystrix 的支持

由于 Zuul 自动集成了 Ribbon 和 Hystrix，所以 Zuul 天生就有负载均衡和服务容错能力，可以通过 Ribbon 和 Hystrix 的配置来配置 Zuul 中的相应功能。

使用 Hystrix 的配置来设置路由转发时 HystrixCommand 的执行超时时间：

```yaml
hystrix:
  command: #用于控制HystrixCommand的行为
    default:
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 1000 #配置HystrixCommand执行的超时时间，执行超过该时间会进行服务降级处理
```

可以使用 Ribbon 的配置来设置路由转发时请求连接及处理的超时时间：

```yaml
ribbon: #全局配置
  ConnectTimeout: 1000 #服务请求连接超时时间（毫秒）
  ReadTimeout: 3000 #服务请求处理超时时间（毫秒）
```

## 常用配置

```yaml
zuul:
  routes: #给服务配置路由
    user-service:
      path: /userService/**
    feign-service:
      path: /feignService/**
  ignored-services: user-service,feign-service #关闭默认路由配置
  prefix: /proxy #给网关路由添加前缀
  sensitive-headers: Cookie,Set-Cookie,Authorization #配置过滤敏感的请求头信息，设置为空就不会过滤
  add-host-header: true #设置为true重定向是会添加host请求头
  retryable: true # 关闭重试机制
  PreLogFilter:
    pre:
      disable: false #控制是否启用过滤器
```

## 扩展

### Zuul 高级应用场景

#### 红绿部署

![10][10]

红绿部署就是蓝绿部署 Netflix 叫红绿部署，会有两个集群 v1 老集群和 v2 新集群，部署时红绿都会存在，通过网关来切流量，上线之前做金丝雀，切部分流量到v2集群，如果有问题切回 v1，没有问题就全部切到 v2。

#### 开发者测试分支

![11][11]

有些功能比较关键，开发人员需要做线上的测试，测试用的并不是生产流量。网关会把内部开发人员的请求转发到测试集群上，这样既可以测试应用在生产环境的功能又不会影响生产环境的数据。

#### 埋点测试

![12][12]

应用有埋点和不埋点的，比如：Metrics 埋点、Tracing 埋点等。埋点多了可能会有性能开销，但是埋点可以帮助我们了解应用的性能情况，那么就可以发布少量的详细埋点应用。也是在网关上进行切流量，如果是测试的流量就切到详细埋点的应用上或集群上。

#### 压力测试

![13][13]

在应用上线之前，会先部署到压力测试集群上，压力测试需要用到生产流量，但是这个流量是镜像 Copy 的，真实的生产流量还是会到生产集群当中，会复制一部分流量到压力测试集群上。因为这个流量是镜像的，那么 Response 后不会被反给客户端，会在网关上丢弃掉。

#### 调试路由

![14][14]

有些情况生产出现了问题，但是在测试环境不是很好调试或很难复现问题，那么开发人员就可以通过自己发送一些特殊的请求，比如加一些 Header，那网关就可以帮吧这些流量切到调试集群上，开发人员就可以做线上的调试。

#### 金丝雀测试

![15][15]

通过网关切少量的流量到金丝雀集群，如果没问题就全量切换到新版本，有问题就切换回来。

#### 粘性金丝雀

![16][16]

本质也是一种金丝雀，如果不带粘性，请求会随机分给 baseline 和 canary 集群，做了粘性后下次的请求还会到金丝雀集群，可以黏住这个 ip 或用户的请求。

#### 失败注入测试

![18][18]

有的时候我们会对生产上的一些集群做主动的一些错误，看看它在出错情况的表现。

#### 降级测试

![19][19]

注入错误当中，还利用网关做降级测试。

#### Netflix 持续交付流水线

![20][20]

整个流水线中的测试，都会用到网关来进行辅助完成。

#### 跨区域高可用

![21][21]

网关还可以实现跨区域的 HA，双活或多活。在某个区域如果API服务或中间层服务出现问题了，网关能感知到这种错误，然后把流量调到其他的区域，这样就实现了跨域去的 HA。

#### 防爬防攻击

![22][22]

在网关上做监控，经过后台的分析如果发现这个流量是恶意的爬虫或者攻击性的，那么后面就会拒绝请求，保护系统服务。

#### 健康检查和屏蔽坏节点

![23][23]

在网关上做健康检查，度量度量分析监控，如果某些微服务节点出错了或者不响应了，网关就可以把它摘除屏蔽掉。

### 网关生产级部署架构

![24][24]

### 基于网关的两层路由体系，内网 Zuul 动态配置做法

![25][25]

### 网关和BFF的演化

BFF，即 Backend For Frontend（服务于前端的后端）也就是服务器设计 API 时会考虑前端的使用，并在服务端直接进行业务逻辑的处理，又称为用户体验适配器。BFF和网关是紧密关联的，有的公司网关就是BFF，下面来介绍一下它是怎么来的。

#### MyShop SOA V1

![26][26]

我们先把时间回到2011左右，假设有个 MyShop 电商互联网公司，在这个时间节点上它已经完成了单体业务拆分，内部应用已经完成了 SOA 化，架构如上图。

#### MyShop SOA V2

![27][27]

时间转眼来到了2012年，国内无线应用开始起风了，MyShop 公司也近跟市场趋势，开发了自己的无线原生 APP。为了尽快上线架构师提出了上图 V2 架构，将内部的服务通过 Nginx 直接暴露出来。

经过架构评审发现这个架构是存在问题的：

- 首先无线应用和内部的服务是强耦合关系（接口耦合、域名耦合）任何一边的变化会对另外一边造成影响；
- 第二个问题：每个对外暴露的服务都需要一个域名；
- 第三个问题：内部服务暴露在公网上有潜在的安全问；
- 第四个问题：无线应用的 APP 端需要开发大量的聚合、裁剪和适配（可能需要支持协议转换，比如老的服务是  SOAP协议，前端是 JSON 的）的逻辑；

#### MyShop SOA V2.5

![28][28]

v2 版本问题太多，架构师决定在内部服务和外部设备之间引入新的角色：无线 BFF（为前端而开发的后端）。它主要由前端开发团队来开发，但是也属于后端的一个服务。BFF 可以认为是一种代理适配服务，它将后端的微服务进行适配（聚合、裁剪和适配），提供对设备友好统一的 API。

这个架构的好处是无线 APP 和内部的服务不强耦合，通过引入这个中间层使得两边都可以进行变换，当前端有什么变换很多情况前端同学可以在 BFF 层就可以解决，后端有变换可以通过 BFF 对前端进行屏蔽。

第二个好处是：无线 APP 只需要知道 BFF 的域名，不需要知道内部服务的域名和实现的细节。

第三个就是内部服务躲在 BFF 后面不会暴露在公网上面，比较安全。第四个好处：聚合、裁剪和适配逻辑可以在 BFF 上实现，无线 APP 端可以大大的瘦身。

> 计算机系统软件体系结构采用一种层的结构，有人说过一句名言：“计算机科学领域的任何问题都可以通过增加一个间接的中间层来解决” 。

这个架构比较成功，支撑了 MyShop 公司很长一段时间业务的快速发展，但是随着业务量进一步增长，也随着研发团队的不断扩大 V2.5 架构也逐渐暴露出下面的一些问题：

- 刚开始只有一个无线 BFF 集群，业务不断的增加，一方面 BFF 堆砌了大量的不同业务线的逻辑，变的非常的臃肿，升级维护变的越来越困难。另一方面根据“康威法则”单快的 BFF 和多团队之间就出现了不匹配的问题，团队直接沟通协调成本会比较高，交付效率会变低。
- 第二个问题：无线 BFF 里面不仅有各个业务聚合、裁剪、适配还有业务逻辑，还进入了很多跨横切面的逻辑，比如说安全认证、日志监控，限流熔断等，代码变得越来越复杂，技术债越堆越多，开发效率不断下降。
- 第三个问题：无线 BFF 集群是个失败单点，如果当中有代码缺陷或者来了个流量洪峰，会引发无线集群宕机，造成所有无线应用不可用。

#### MyShop SOA V3

![29][29]

V2.5 有诸多问题，架构师进一步的思考，决定对单快 BFF 进行解耦拆分，针对不同的业务线引入独立的 BFF 集群，另一方面在外部的设备和内部 BFF 之间在进入一个新的角色：API 网关。网关负责跨横切面的功能。

BFF 按照团队或者业务线的边界进行拆分，每个业务线团队可以并行开发和交付各自负责的 BFF 微服务。网关由独立的框架团队开发和运维，它专注跨横切面的功能。

#### MyShop SOA V4

![30][30]

业务不断的发展，技术架构也仍然需要不断的调整来应对需求的变化，近年 MyShop 公司迎来了新的业务和需求，主要包括：

- 第一个是开放内部的业务能力，建设 MyShop Open API 平台，借助第三方社区的力量在平台上进行创新进一步丰富 MyShop 应用和业务形态；
- 第二个是单页 H5 应用是互联网时代前端的新趋势它提供更好的用户体验，它支持前端团队自治快速的迭代，MyShop 需要支持前后分离架构，支持 H5 SPA 单页应用能够实现快速交付和创新；
- 第三个是原来架构中的反向代理 Nginx 这个技术比较偏运维对 DevOps 不太友好，严格它不能算是一种可编程网关而且 Nginx 和网关功能有部分重叠，所以考虑逐步废弃 Nginx，引入统一的可编程网关。一方面实现基于网关前后分离架构，另一方面基于可编程网关实现更灵活的微服务部署升级能力，比如提供金丝雀发布、灰度发布和蓝绿发布这些能力。

V4 和 V3 架构差不多，只是引入了开放平台 BFF 和开发平台网关，H5 BFF 和 H5 网关。去掉老的 Nginx 集群，由网关统一负责路由，负载均衡，由原来反向代理的活都交给网关。

#### BFF 框架

- https://graphql.org/
- https://github.com/graphql/graphql-js/

### 其它开源网关产品

- Kong(核心开源) https://github.com/Kong/kong
- Tyk(核心开源) https://github.com/TykTechnologies/tyk
- 悟空API网关(部分开源+商业支持) https://github.com/eolinker/GoKu-API-Gateway
- 小豹API网关(商业) http://www.xbgateway.com/

## 参考

- https://github.com/Netflix/zuul/
- https://cloud.spring.io/spring-cloud-netflix/reference/html/
- https://juejin.im/post/5d9f2dea6fb9a04e3e724067/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/java/spring-cloud-zuul/1.jpg
[2]: /images/java/spring-cloud-zuul/2.jpg
[3]: /images/java/spring-cloud-zuul/3.jpg
[4]: /images/java/spring-cloud-zuul/4.jpg
[5]: /images/java/spring-cloud-zuul/5.jpg
[6]: /images/java/spring-cloud-zuul/6.jpg
[7]: /images/java/spring-cloud-zuul/7.jpg
[8]: /images/java/spring-cloud-zuul/8.jpg
[9]: /images/java/spring-cloud-zuul/9.jpg
[10]: /images/java/spring-cloud-zuul/10.jpg
[11]: /images/java/spring-cloud-zuul/11.jpg
[12]: /images/java/spring-cloud-zuul/12.jpg
[13]: /images/java/spring-cloud-zuul/13.jpg
[14]: /images/java/spring-cloud-zuul/14.jpg
[15]: /images/java/spring-cloud-zuul/15.jpg
[16]: /images/java/spring-cloud-zuul/16.jpg
[18]: /images/java/spring-cloud-zuul/18.jpg
[19]: /images/java/spring-cloud-zuul/19.jpg
[20]: /images/java/spring-cloud-zuul/20.jpg
[21]: /images/java/spring-cloud-zuul/21.jpg
[22]: /images/java/spring-cloud-zuul/22.jpg
[23]: /images/java/spring-cloud-zuul/23.jpg
[24]: /images/java/spring-cloud-zuul/24.jpg
[25]: /images/java/spring-cloud-zuul/25.jpg
[26]: /images/java/spring-cloud-zuul/26.jpg
[27]: /images/java/spring-cloud-zuul/27.jpg
[28]: /images/java/spring-cloud-zuul/28.jpg
[29]: /images/java/spring-cloud-zuul/29.jpg
[30]: /images/java/spring-cloud-zuul/30.jpg
