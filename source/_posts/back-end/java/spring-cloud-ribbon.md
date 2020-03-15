---
title: 微服务架构之客户端负载均衡：Spring Cloud Ribbon
date: 2020-02-16 12:37:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

上篇写到微服务架构的根本问题是服务发现与负载均衡，本文将介绍 Spring Cloud Netflix 子项目的另一个核心组件 Ribbon。

在微服务架构中，很多服务都会部署多个，其他服务去调用该服务的时候，如何保证负载均衡？。负载均衡可以增加系统的可用性和扩展性，当我们使用 RestTemplate 来调用其他服务时，Ribbon 可以很方便的实现负载均衡功能。

<!--more-->

## 什么是负载均衡器？

假设有一个分布式系统，该系统由在不同计算机上运行的许多服务组成。但是，当用户数量很大时，通常会为服务创建多个副本。每个副本都在另一台计算机上运行。此时，出现 “Load Balancer（负载均衡器）”。它有助于在服务器之间平均分配传入流量。

### 服务器端负载均衡器

传统上，Load Balancers（例如Nginx、F5）是放置在服务器端的组件。当请求来自客户端时，它们将转到负载均衡器，负载均衡器将为请求指定服务器。负载均衡器使用的最简单的算法是随机指定。在这种情况下，大多数负载平衡器是用于控制负载平衡的硬件集成软件。

![1][1]

- 对客户端不透明，客户端不知道服务器端的服务列表，甚至不知道自己发送请求的目标地址存在负载均衡器；
- 服务器端维护负载均衡服务器，控制负载均衡策略和算法；

### 客户端负载均衡器

当负载均衡器位于客户端时，客户端得到可用的服务器列表然后按照特定的负载均衡策略，分发请求到不同的服务器。

![2][2]

- 对客户端透明，客户端需要知道服务器端的服务列表，需要自行决定请求要发送的目标地址；
- 客户端维护负载均衡服务器，控制负载均衡策略和算法；
- 目前单独提供的客户端实现比较少（Ribbon 是比较成熟的），很多公司都是在框架内部自行实现；

## Ribbon 简介

Ribbon 是 Netflix 公司开源的一个客户端负载均衡的项目，可以自动与 Eureka 进行交互。

- 蝴蝶结意思，寓意微服务联结；
- 客户端软负载组件，支持 Eureka 对接，支持多种可插拔 LB 策略；
- 以异步和反应式模型执行多协议 (HTTP, TCP, UDP)；
- 容错；
- Java based；
- 2013年初开源
  - https://github.com/Netflix/ribbon
  - https://medium.com/netflix-techblog/announcing-ribbon-tying-the-netflix-mid-tier-services-together-a89346910a62 

## 架构原理

![3][3]

Ribbon 中的关键组件：

- ServerList：可以响应客户端的特定服务的服务器列表；
- ServerListFilter：可以动态获得的具有所需特征的候选服务器列表的过滤器；
- ServerListUpdater：用于执行动态服务器列表更新；
- Rule：负载均衡策略，用于确定从服务器列表返回哪个服务器；
- Ping：客户端用于快速检查服务器当时是否处于活动状态；
- LoadBalancer：负载均衡器，负责负载均衡调度的管理；

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
- Spring Cloud：Hoxton.SR1

## RestTemplate 的使用

RestTemplate 是一个HTTP客户端，使用它我们可以方便的调用 HTTP 接口，支持 GET、POST、PUT、DELETE 等方法。

### GET 请求方法

```java
<T> T getForObject(String url, Class<T> responseType, Object... uriVariables);

<T> T getForObject(String url, Class<T> responseType, Map<String, ?> uriVariables);

<T> T getForObject(URI url, Class<T> responseType);

<T> ResponseEntity<T> getForEntity(String url, Class<T> responseType, Object... uriVariables);

<T> ResponseEntity<T> getForEntity(String url, Class<T> responseType, Map<String, ?> uriVariables);

<T> ResponseEntity<T> getForEntity(URI var1, Class<T> responseType);
```

#### getForObject 方法

返回对象为响应体中数据转化成的对象，举例如下：

```java
@GetMapping("/{id}")
public CommonResult getUser(@PathVariable Long id) {
    return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
}
```

#### getForEntity 方法

返回对象为 ResponseEntity 对象，包含了响应中的一些重要信息，比如响应头、响应状态码、响应体等，举例如下：

```java
@GetMapping("/getEntityByUsername")
public CommonResult getEntityByUsername(@RequestParam String username) {
    ResponseEntity<CommonResult> entity = restTemplate.getForEntity(userServiceUrl + "/user/getByUsername?username={1}", CommonResult.class, username);
    if (entity.getStatusCode().is2xxSuccessful()) {
        return entity.getBody();
    } else {
        return new CommonResult("操作失败", 500);
    }
}
```

### POST 请求方法

```java
<T> T postForObject(String url, @Nullable Object request, Class<T> responseType, Object... uriVariables);

<T> T postForObject(String url, @Nullable Object request, Class<T> responseType, Map<String, ?> uriVariables);

<T> T postForObject(URI url, @Nullable Object request, Class<T> responseType);

<T> ResponseEntity<T> postForEntity(String url, @Nullable Object request, Class<T> responseType, Object... uriVariables);

<T> ResponseEntity<T> postForEntity(String url, @Nullable Object request, Class<T> responseType, Map<String, ?> uriVariables);

<T> ResponseEntity<T> postForEntity(URI url, @Nullable Object request, Class<T> responseType);
```

#### postForObject 示例

```java
@PostMapping("/create")
public CommonResult create(@RequestBody User user) {
    return restTemplate.postForObject(userServiceUrl + "/user/create", user, CommonResult.class);
}
```

#### postForEntity 示例

```java
@PostMapping("/create")
public CommonResult create(@RequestBody User user) {
    return restTemplate.postForEntity(userServiceUrl + "/user/create", user, CommonResult.class).getBody();
}
```

### PUT 请求方法

```java
void put(String url, @Nullable Object request, Object... uriVariables);

void put(String url, @Nullable Object request, Map<String, ?> uriVariables);

void put(URI url, @Nullable Object request);
```

#### PUT 请求示例

```java
@PutMapping("/update")
public CommonResult update(@RequestBody User user) {
    restTemplate.put(userServiceUrl + "/user/update", user);
    return new CommonResult("操作成功",200);
}
```

### DELETE 请求方法

```java
void delete(String url, Object... uriVariables);

void delete(String url, Map<String, ?> uriVariables);

void delete(URI url);
```

#### DELETE 请求示例

```java
@DeleteMapping("/delete/{id}")
public CommonResult delete(@PathVariable Long id) {
   restTemplate.delete(userServiceUrl + "/user/delete/{1}", null, id);
   return new CommonResult("操作成功",200);
}
```

## 创建一个 user-service 模块

user-service，用于给 Ribbon 提供服务调用。在 pom.xml 中添加相关依赖：

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

在 application.yml 进行配置，主要是配置了端口和注册中心地址：

```yaml
server:
  port: 8201
spring:
  application:
    name: user-service
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
```

添加 UserController 用于提供调用接口。UserController 类定义了对 User 对象常见的 CRUD 接口：

```java
@RestController
@RequestMapping("/user")
public class UserController {

    private Logger LOGGER = LoggerFactory.getLogger(this.getClass());

    @Autowired
    private UserService userService;

    @PostMapping("/create")
    public CommonResult create(@RequestBody User user) {
        userService.create(user);
        return new CommonResult("操作成功", 200);
    }

    @GetMapping("/{id}")
    public CommonResult<User> getUser(@PathVariable Long id) {
        User user = userService.getUser(id);
        LOGGER.info("根据id获取用户信息，用户名称为：{}",user.getUsername());
        return new CommonResult<>(user);
    }

    @GetMapping("/getUserByIds")
    public CommonResult<List<User>> getUserByIds(@RequestParam List<Long> ids) {
        List<User> userList= userService.getUserByIds(ids);
        LOGGER.info("根据ids获取用户信息，用户列表为：{}",userList);
        return new CommonResult<>(userList);
    }

    @GetMapping("/getByUsername")
    public CommonResult<User> getByUsername(@RequestParam String username) {
        User user = userService.getByUsername(username);
        return new CommonResult<>(user);
    }

    @PostMapping("/update")
    public CommonResult update(@RequestBody User user) {
        userService.update(user);
        return new CommonResult("操作成功", 200);
    }

    @PostMapping("/delete/{id}")
    public CommonResult delete(@PathVariable Long id) {
        userService.delete(id);
        return new CommonResult("操作成功", 200);
    }
}
```

## 创建一个 ribbon-service 模块

ribbon-service 模块来调用 user-service 模块演示负载均衡的服务调用。在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-ribbon</artifactId>
</dependency>
```

在 application.yml 进行配置。主要是配置了端口、注册中心地址及 user-service 的调用路径：

```yaml
server:
  port: 8301
spring:
  application:
    name: ribbon-service
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
service-url:
  user-service: http://user-service
```

使用 @LoadBalanced 注解赋予 RestTemplate 负载均衡的能力：

```java
@Configuration
public class RibbonConfig {
    @Bean
    @LoadBalanced
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }
}
```

添加 UserRibbonController 类。注入 RestTemplate，使用其调用 user-service 中提供的相关接口，这里对 GET 和 POST 调用进行了演示，其他方法调用均可参考。

```java
@RestController
@RequestMapping("/user")
public class UserRibbonController {
    @Autowired
    private RestTemplate restTemplate;
    @Value("${service-url.user-service}")
    private String userServiceUrl;

    @GetMapping("/{id}")
    public CommonResult getUser(@PathVariable Long id) {
        return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
    }

    @GetMapping("/getByUsername")
    public CommonResult getByUsername(@RequestParam String username) {
        return restTemplate.getForObject(userServiceUrl + "/user/getByUsername?username={1}", CommonResult.class, username);
    }

    @GetMapping("/getEntityByUsername")
    public CommonResult getEntityByUsername(@RequestParam String username) {
        ResponseEntity<CommonResult> entity = restTemplate.getForEntity(userServiceUrl + "/user/getByUsername?username={1}", CommonResult.class, username);
        if (entity.getStatusCode().is2xxSuccessful()) {
            return entity.getBody();
        } else {
            return new CommonResult("操作失败", 500);
        }
    }

    @PostMapping("/create")
    public CommonResult create(@RequestBody User user) {
        return restTemplate.postForObject(userServiceUrl + "/user/create", user, CommonResult.class);
    }

    @PostMapping("/update")
    public CommonResult update(@RequestBody User user) {
        return restTemplate.postForObject(userServiceUrl + "/user/update", user, CommonResult.class);
    }

    @PostMapping("/delete/{id}")
    public CommonResult delete(@PathVariable Long id) {
        return restTemplate.postForObject(userServiceUrl + "/user/delete/{1}", null, CommonResult.class, id);
    }
}
```

- 启动 eureka-server 于8001端口；
- 启动 user-service 于8201端口；
- 启动另一个 user-service 于8202端口，可以通过修改IDEA中的 SpringBoot 的启动配置实现；
- 多次调用 http://localhost:8301/user/1 接口，可以发现两个服务的控制台交替打印访问日志，实现了负载。

## Ribbon 的常用配置

### 全局配置

```yaml
ribbon:
  ConnectTimeout: 1000 #服务请求连接超时时间（毫秒）
  ReadTimeout: 3000 #服务请求处理超时时间（毫秒）
  OkToRetryOnAllOperations: true #对超时请求启用重试机制
  MaxAutoRetriesNextServer: 1 #切换重试实例的最大个数
  MaxAutoRetries: 1 # 切换实例后重试最大次数
  NFLoadBalancerRuleClassName: com.netflix.loadbalancer.RandomRule #修改负载均衡算法
```

### 指定服务进行配置

与全局配置的区别就是 ribbon 节点挂在服务名称下面，如下是对 ribbon-service 调用 user-service 时的单独配置。

```yaml
user-service:
  ribbon:
    ConnectTimeout: 1000 #服务请求连接超时时间（毫秒）
    ReadTimeout: 3000 #服务请求处理超时时间（毫秒）
    OkToRetryOnAllOperations: true #对超时请求启用重试机制
    MaxAutoRetriesNextServer: 1 #切换重试实例的最大个数
    MaxAutoRetries: 1 # 切换实例后重试最大次数
    NFLoadBalancerRuleClassName: com.netflix.loadbalancer.RandomRule #修改负载均衡算法
```

### Ribbon 的负载均衡策略

所谓的负载均衡策略，就是当A服务调用B服务时，此时B服务有多个实例，这时A服务以何种方式来选择调用的B实例， Ribbon 可以选择以下几种负载均衡策略。

- com.netflix.loadbalancer.RandomRule：从提供服务的实例中以随机的方式；
- com.netflix.loadbalancer.RoundRobinRule：以线性轮询的方式，就是维护一个计数器，从提供服务的实例中按顺序选取，第一次选第一个，第二次选第二个，以此类推，到最后一个以后再从头来过；
- com.netflix.loadbalancer.RetryRule：在 RoundRobinRule 的基础上添加重试机制，即在指定的重试时间内，反复使用线性轮询策略来选择可用实例；
- com.netflix.loadbalancer.WeightedResponseTimeRule：对 RoundRobinRule 的扩展，响应速度越快的实例选择权重越大，越容易被选择；
- com.netflix.loadbalancer.BestAvailableRule：选择并发较小的实例；
- com.netflix.loadbalancer.AvailabilityFilteringRule：先过滤掉故障实例，再选择并发较小的实例；
- com.netflix.loadbalancer.ZoneAwareLoadBalancer：采用双重过滤，同时过滤不是同一区域的实例和故障实例，选择并发较小的实例。

## 扩展

### 网关/注册中心/负载均衡集成架构图

![4][4]

## 参考

- https://cloud.spring.io/spring-cloud-netflix/reference/html/
- https://github.com/Netflix/ribbon/wiki/
- https://medium.com/netflix-techblog/announcing-ribbon-tying-the-netflix-mid-tier-services-together-a89346910a62 
- [深入理解Ribbon之源码解析](https://blog.csdn.net/forezp/article/details/74820899/)
- https://juejin.im/post/5d7f9006f265da03951a260c/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/spring-cloud-ribbon/1.gif
[2]: /images/java/spring-cloud-ribbon/2.gif
[3]: /images/java/spring-cloud-ribbon/3.jpg
[4]: /images/java/spring-cloud-ribbon/4.jpg
