---
title: Spring Cloud Gateway
date: 2020-02-14 20:47:00
categories: Java
tags:
  - SpringCloud
---

API 网关是微服务架构重要组件之一，是服务唯一入口。API 网关封装内部系统架构，横向抽离通用功能，如：身份验证、监控、限流、熔断、负载均衡等。核心要点是，所有的客户端和消费端都通过统一的网关接入微服务，在网关层处理所有的非业务功能。

<!--more-->

## 反向代理 VS 网关

![1][1]

在 web 1.0，2.0 时代，主要由web网站形式呈现。大多数都采用前置反向代理，主要作用是反向路由和负载均衡。典型的产品有 Nginx 和 HAproxy。一般采用静态配置方式，由运维团队配置。

如今来到了 web 3.0 微服务的时代，出现了大量提供 API 的服务。这些服务升级频率很高，要求对安全和动态配置的能力很高，架构慢慢衍生出网关。反向代理有的功能网关都具备。以 Netflix Zuul 为代表。

网关主要给微服务/API用，偏向开发人员，反向代理主要面向传统静态 web 应用，偏向运维。未来趋势（云原生时代）是DevOps+网关和反向代理再次融合。

网关应当具备以下功能：

- 性能：API高可用，负载均衡，容错机制；
- 安全：权限身份认证、脱敏，流量清洗，后端签名（保证全链路可信调用），黑名单（非法调用的限制）；
- 日志：日志记录（spainid,traceid）一旦涉及分布式，全链路跟踪必不可少；
- 缓存：数据缓存；
- 监控：记录请求响应数据，API 耗时分析，性能监控；
- 限流：流量控制，错峰流控，可以定义多种限流规则；
- 灰度：线上灰度部署，可以减小风险；
- 路由：动态路由规则；

![2][2]

## 主流网关对比

| 网关 | 支持公司 | 实现语言 | 亮点 | 不足 |
| :-------------- | :----------- |:----------- |:----------- |:----------- |
| Nginx (2004) | Nginx Inc | C/Lua | 高性能，成熟稳定 | 门槛高，偏运维，可编程弱 |
| Kong (2014) | Kong Inc | OpenResty/Lua | 高性能，可编程API | 门槛较高 |
| Zuul1 (2012) | Netflix/Pivotal | Java | 成熟，简单门槛低 | 性能一般，可编程一般 |
| Spring Cloud Gateway (2016) | Pivotal | Java | 异步，配置灵活 | 早期产品（现已经比较成熟） |
| Envoy (2016) | Lyft | C++ | 高性能，可编程API/ ServiceMesh 集成 | 门槛较高 |
| Traefik (2015) | Containous | Golang | 云原生，可编程API/对接各种服务发现 | 生产案例不多 |

暂时选择 Spring Cloud Gateway，原因如下：

- Zuul1 是比较早期成熟的开源网关，但性能不佳（Zuul2 性能有所提升），且官网现在已经不维护；
- 像 Nginx 这类网关，性能肯定是没得说，它适合做那种门户网关，是作为整个全局的网关，是对外的，处于最外层的；而 Gateway 这种，更像是业务网关，主要用来对应不同的客户端提供服务的，用于聚合业务的。各个微服务独立部署，职责单一，对外提供服务的时候需要有一个东西把业务聚合起来；
- Nginx 这类网关，都是用不同的语言编写的，不易于扩展；而 Gateway 就不同，它是用 Java 写的，易于扩展和维护Gateway这类网关可以实现熔断、重试等功能，这是 Nginx 不具备的；

## Spring Cloud Gateway 简介

Spring Cloud Gateway 为 SpringBoot 应用提供了API网关支持，具有强大的智能路由与过滤器功能。Gateway 是在 Spring 生态系统之上构建的 API 网关服务，基于 Spring 5，Spring Boot 2和 Project Reactor等技术。

Spring Cloud Gateway 具有如下特性：

- 基于Spring Framework 5, Project Reactor 和 Spring Boot 2.0 进行构建；
- 动态路由：能够匹配任何请求属性；
- 可以对路由指定 Predicate（断言）和 Filter（过滤器）；
- 集成 Hystrix 的断路器功能；
- 集成 Spring Cloud 服务发现功能；
- 易于编写的 Predicate（断言）和 Filter（过滤器）；
- 请求限流功能；
- 支持路径重写；

## 相关概念

- Route（路由）：路由是构建网关的基本模块，它由ID，目标URI，一系列的断言和过滤器组成，如果断言为 true 则匹配该路由；
- Predicate（断言）：指的是 Java 8 的 Function Predicate。 输入类型是 Spring 框架中的ServerWebExchange。 这使开发人员可以匹配 HTTP 请求中的所有内容，例如请求头或请求参数。如果请求与断言相匹配，则进行路由；
- Filter（过滤器）：指的是 Spring 框架中 GatewayFilter 的实例，使用过滤器，可以在请求被路由前后对请求进行修改；

## 原理

![3][3]

很像 SpringMVC 的请求处理过程，客户端向 Spring Cloud Gateway 发出请求。如果 Gateway Handler Mapping确定请求与路由匹配，则将其发送给 Gateway Web Handler。这个 Handler 运行通过特定于请求的过滤器链发送请求。过滤器可以在发送代理请求之前或之后执行逻辑。执行所有的“pre”过滤逻辑，然后发出代理请求，最后执行“post”过滤逻辑。

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR1

## 集成 Gateway

创建 api-gateway 模块，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

### 两种不同的配置路由方式

Gateway 提供了两种不同的方式用于配置路由，一种是通过 yml 文件来配置，另一种是通过 Java Bean 来配置。

### 使用yml配置

在 application.yml 中进行配置：

```yaml
server:
  port: 9201
service-url:
  user-service: http://localhost:8201
spring:
  cloud:
    gateway:
      routes:
        - id: path_route #路由的ID
          uri: ${service-url.user-service}/user/{id} #匹配后路由地址
          predicates: # 断言，路径相匹配的进行路由
            - Path=/user/{id}
```

### 使用Java Bean配置

添加相关配置类，并配置一个 RouteLocator 对象：

```java
@Configuration
public class GatewayConfig {
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("path_route2", r -> r.path("/user/getByUsername")
                        .uri("http://localhost:8201/user/getByUsername"))
                .build();
    }
}
```

## Route Predicate 的使用

- Spring Cloud Gateway 包含许多内置的 Route Predicate Factories
- 所有这些 predicates 用于匹配HTTP请求的不同属性
- 多个 Route Predicate Factories 可以通过逻辑与（and）结合起来一起使用

Spring Cloud Gateway 将路由匹配作为 Spring WebFlux HandlerMapping 基础架构的一部分。 Spring Cloud Gateway 包括许多内置的 Route Predicate工厂。 所有这些 Predicate 都与 HTTP 请求的不同属性匹配。 多个 Route Predicate 工厂可以进行组合

> 注意：Predicate 中提到的配置都在 application-predicate.yml 文件中进行修改，并用该配置启动api-gateway 服务。

### After Route Predicate

在指定时间之后的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: after_route
          uri: ${service-url.user-service}
          predicates:
            - After=2020-02-14T20:30:00+08:00[Asia/Shanghai]
```

### Before Route Predicate

在指定时间之前的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: before_route
          uri: ${service-url.user-service}
          predicates:
            - Before=2020-02-14T20:30:00+08:00[Asia/Shanghai]
```

### Between Route Predicate

在指定时间区间内的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: between_route
          uri: ${service-url.user-service}
          predicates:
            - Between=2020-02-14T16:30:00+08:00[Asia/Shanghai], 2020-02-15T15:30:00+08:00[Asia/Shanghai]
```

### Cookie Route Predicate

带有指定Cookie的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: cookie_route
          uri: ${service-url.user-service}
          predicates:
            - Cookie=username,leo
```

> `curl http://localhost:9201/user/1 --cookie "username=leo"`

### Header Route Predicate

带有指定请求头的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: header_route
        uri: ${service-url.user-service}
        predicates:
        - Header=X-Request-Id, \d+
```

> `curl http://localhost:9201/user/1 -H "X-Request-Id:111"`

### Host Route Predicate

带有指定Host的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: host_route
          uri: ${service-url.user-service}
          predicates:
            - Host=**.xinlichao.cn
```

> `curl http://localhost:9201/user/1 -H "Host:www.xinlichao.cn"`

### Method Route Predicate

发送指定方法的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: method_route
        uri: ${service-url.user-service}
        predicates:
        - Method=GET
```

### Path Route Predicate

发送指定路径的请求会匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: path_route
          uri: ${service-url.user-service}/user/{id}
          predicates:
            - Path=/user/{id}

        - id: path_route2
          uri: https://example.org
          predicates:
            - Path=/foo/{segment},/bar/{segment}

        # 所有带auth-api都会路由
        - id: auth_service_api_route
          uri: http://localhost:8081/auth-api
          predicates:
            - Path=/auth-api/**
```

### Query Route Predicate

带指定查询参数的请求可以匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: query_route
        uri: ${service-url.user-service}/user/getByUsername
        predicates:
        - Query=username
```

### RemoteAddr Route Predicate

从指定远程地址发起的请求可以匹配该路由。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: remoteaddr_route
        uri: ${service-url.user-service}
        predicates:
        - RemoteAddr=192.168.1.1/24
```

### Weight Route Predicate

使用权重来路由相应请求，以下表示有80%的请求会被路由到 localhost:8201，20% 会被路由到 localhost:8202。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: weight_high
        uri: http://localhost:8201
        predicates:
        - Weight=group1, 8
      - id: weight_low
        uri: http://localhost:8202
        predicates:
        - Weight=group1, 2
```

## Route Filter 的使用

路由过滤器可用于修改进入的 HTTP 请求和返回的 HTTP 响应，路由过滤器只能指定路由进行使用。Spring Cloud Gateway 内置了多种路由过滤器，他们都由 GatewayFilter 的工厂类来产生。

### AddRequestParameter GatewayFilter

给请求添加参数的过滤器。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: add_request_parameter_route
          uri: http://localhost:8201
          filters:
            - AddRequestParameter=username, leo
          predicates:
            - Method=GET
```

```bash
curl http://localhost:9201/user/getByUsername

# 相当于发起该请求：
curl http://localhost:8201/user/getByUsername?username=leo
```

### AddRequestHeader GatewayFilter

给请求添加一个请求头 X-Request-Foo:Bar

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: add_request_head_route
          uri: http://localhost:8201
          filters:
            - AddRequestHeader=X-Request-Foo, Bar
```

### AddResponseHeader GatewayFilter

给请求添加一个响应头 X-Response-Foo:Bar

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: add_response_head_route
          uri: http://localhost:8201
          filters:
            - AddResponseHeader=X-Response-Foo, Bar
```

### StripPrefix GatewayFilter

对指定数量的路径前缀进行去除的过滤器。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: strip_prefix_route
        uri: http://localhost:8201
        predicates:
        - Path=/user-service/**
        filters:
        - StripPrefix=2
```

```bash
curl http://localhost:9201/user-service/a/user/1

# 相当于发起该请求：
curl http://localhost:8201/user/1
```

### PrefixPath GatewayFilter

与 StripPrefix 过滤器恰好相反，会对原有路径进行增加操作的过滤器。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: prefix_path_route
        uri: http://localhost:8201
        predicates:
        - Method=GET
        filters:
        - PrefixPath=/user
```

### Hystrix GatewayFilter

Hystrix 过滤器允许你将断路器功能添加到网关路由中，使你的服务免受级联故障的影响，并提供服务降级处理。

要开启断路器功能，我们需要在 pom.xml 中添加 Hystrix 的相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-hystrix</artifactId>
</dependency>
```

然后添加相关服务降级的处理类：

```java
@RestController
public class FallbackController {
    @GetMapping("/fallback")
    public Object fallback() {
        Map<String,Object> result = new HashMap<>();
        result.put("data", null);
        result.put("message", "Get request fallback!");
        result.put("code", 500);
        return result;
    }
}
```

在 application-filter.yml 中添加相关配置，当路由出错时会转发到服务降级处理的控制器上：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: hystrix_route
          uri: http://localhost:8201
          predicates:
            - Method=GET
          filters:
            - name: Hystrix
              args:
                name: fallbackcmd
                fallbackUri: forward:/fallback
            # - RewritePath=/consumingserviceendpoint, /backingserviceendpoint
```

或者指定一个 HystrixCommand 的名字：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: hystrix_route
          uri: http://localhost:8201
          predicates:
            - Method=GET
          filters:
            - Hystrix=myCommandName
```

### RequestRateLimiter GatewayFilter

RequestRateLimiter 过滤器可以用于限流，使用 RateLimiter 实现来确定是否允许当前请求继续进行，如果请求太大默认会返回 HTTP 429-太多请求状态。

在pom.xml中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
</dependency>
```

添加限流策略的配置类，这里有两种策略一种是根据请求参数中的 username 进行限流，另一种是根据访问 IP 进行限流：

```java
@Configuration
public class RedisRateLimiterConfig {
    @Bean
    KeyResolver userKeyResolver() {
        return exchange -> Mono.just(exchange.getRequest().getQueryParams().getFirst("username"));
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(exchange.getRequest().getRemoteAddress().getHostName());
    }
}
```

使用 Redis 来进行限流，所以需要添加 Redis 和 RequestRateLimiter 的配置，这里对所有的 GET 请求都进行了按 IP 来限流的操作：

```yaml
server:
  port: 9201
spring:
  redis:
    host: localhost
    password: 123456
    port: 6379
  cloud:
    gateway:
      routes:
        - id: requestratelimiter_route
          uri: http://localhost:8201
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 1 #每秒允许处理的请求数量
                redis-rate-limiter.burstCapacity: 2 #每秒最大处理的请求数量
                key-resolver: "#{@ipKeyResolver}" #限流策略，对应策略的Bean
          predicates:
            - Method=GET
logging:
  level:
    org.springframework.cloud.gateway: debug
```

### Retry GatewayFilter

对路由请求进行重试的过滤器，可以根据路由请求返回的 HTTP 状态码来确定是否进行重试。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: retry_route
        uri: http://localhost:8201
        predicates:
        - Method=GET
        filters:
        - name: Retry
          args:
            retries: 1 #需要进行重试的次数
            statuses: BAD_GATEWAY #返回哪个状态码需要进行重试，返回状态码为5XX进行重试
            backoff:
              firstBackoff: 10ms
              maxBackoff: 50ms
              factor: 2
              basedOnPreviousValue: false
```

### Default Filters

如果你想要添加一个过滤器并且把它应用于所有路由的话，你可以用 `spring.cloud.gateway.default-filters`。这个属性接受一个过滤器列表。

```yaml
spring:
  cloud:
    gateway:
      default-filters:
      - AddResponseHeader=X-Response-Default-Foo, Default-Bar
      - PrefixPath=/httpbin
```

### Global Filters

GlobalFilter 接口的方法签名和 GatewayFilter 相同。这些是有条件地应用于所有路由的特殊过滤器。

当一个请求过来的时候，将会添加所有的 GatewayFilter 实例和所有特定的 GatewayFilter 实例到过滤器链上。过滤器链按照 `org.springframework.core.Ordered` 接口对该链路上的过滤器进行排序。你可以通过实现接口中的`getOrder()` 方法或者使用 `@Order` 注解。

Spring Cloud Gateway 将过滤器执行逻辑分为“pre”和“post”阶段。优先级最高的过滤器将会是“pre”阶段中的第一个过滤器，同时它也将是“post”阶段中的最后一个过滤器。

```java
@Bean
@Order(-1)
public GlobalFilter a() {
    return (exchange, chain) -> {
        log.info("first pre filter");
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            log.info("third post filter");
        }));
    };
}

@Bean
@Order(0)
public GlobalFilter b() {
    return (exchange, chain) -> {
        log.info("second pre filter");
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            log.info("second post filter");
        }));
    };
}

@Bean
@Order(1)
public GlobalFilter c() {
    return (exchange, chain) -> {
        log.info("third pre filter");
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            log.info("first post filter");
        }));
    };
}
```

或者实现 GlobalFilter 接口：

```java
@Configuration
public class AccessGatewayFilter implements GlobalFilter {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
      return chain.filter(exchange);
    }
}
```

### LoadBalancerClient Filter

LoadBalancerClientFilter 查找 exchange 属性中查找 `ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR一个URI`。如果 url 符合 `lb schema`（例如：lb://myservice），那么它将使用`Spring Cloud LoadBalancerClient` 来解析这个名字到一个实际的主机和端口，并替换URI中相同的属性。原始url中未被修改的部分被附加到 `ServerWebExchangeUtils.GATEWAY_ORIGINAL_REQUEST_URL_ATTR` 属性列表中。

默认情况下，当一个服务实例在LoadBalancer中没有找到时，将返回503。你可以通过配置 `spring.cloud.gateway.loadbalancer.use404=true` 来让它返回404。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: myRoute
        uri: lb://service
        predicates:
        - Path=/service/**
```

## 详细配置使用

默认情况下，PropertiesRouteDefinitionLocator 通过 @ConfigurationProperties 机制加载属性

```java
public interface RouteDefinitionLocator {
   Flux<RouteDefinition> getRouteDefinitions();
}
```

> 实现 RouteDefinitionRepository 接口可以实现动态配置路由。

### 使用 yaml 配置

下面两段配置是等价的：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: setstatus_route
          uri: https://example.org
          filters:
            - name: SetStatus
              args:
              status: 401
        - id: setstatusshortcut_route
          uri: https://example.org
          filters:
            - SetStatus=401
```

### 使用 java 配置

```java
@Bean
public RouteLocator customRouteLocator(RouteLocatorBuilder builder, ThrottleGatewayFilterFactory throttle) {
    return builder.routes()
          .route(r -> r.host("**.abc.org").and().path("/image/png")
            .filters(f -> f.addResponseHeader("X-TestHeader", "foobar"))
            .uri("http://httpbin.org:80")
          )
          .route(r -> r.path("/image/webp")
            .filters(f -> f.addResponseHeader("X-AnotherHeader", "baz"))
            .uri("http://httpbin.org:80")
          )
          .route(r -> r.order(-1)
            .host("**.throttle.org").and().path("/get")
            .filters(f -> f.filter(throttle.apply(1,
                1,
                10,
                TimeUnit.SECONDS)))
            .uri("http://httpbin.org:80")
          )
        .build();
}

@Bean
public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
  return builder.routes()
    .route("path_route", r -> r.path("/get")
        .uri("http://httpbin.org"))
    .route("host_route", r -> r.host("*.myhost.org")
      .uri("http://httpbin.org"))
    .route("hystrix_route", r -> r.host("*.hystrix.org")
      .filters(f -> f.hystrix(c -> c.setName("slowcmd")))
      .uri("http://httpbin.org"))
    .route("hystrix_fallback_route", r -> r.host("*.hystrixfallback.org")
      .filters(f -> f.hystrix(c -> c.setName("slowcmd").setFallbackUri("forward:/hystrixfallback")))
      .uri("http://httpbin.org"))
    .route("limit_route", r -> r
      .host("*.limited.org").and().path("/anything/**")
      .filters(f -> f.requestRateLimiter(c -> c.setRateLimiter(redisRateLimiter())))
      .uri("http://httpbin.org"))
  .build();
}
```

## CORS配置

使用 yaml 配置：

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins: "https://docs.spring.io"
            allowedMethods:
              - GET
```

使用 java 配置：

```java
@Configuration
public class GlobalCorsConfig {
    @Bean
    public CorsWebFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedMethod("*");
        config.addAllowedOrigin("*");
        config.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(new PathPatternParser());
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
```

## 结合注册中心使用

默认情况下 Gateway 会根据注册中心注册的服务列表，以服务名为路径创建动态路由。

### 使用动态路由

在pom.xml中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

添加application-eureka.yml配置文件：

```yaml
server:
  port: 9201
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true #开启从注册中心动态创建路由的功能
          lower-case-service-id: true #使用小写服务名，默认是大写
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8001/eureka/

logging:
  level:
    org.springframework.cloud.gateway: debug

```

使用 application-eureka.yml 配置文件启动 api-gateway 服务，访问 http://localhost:9201/user-service/user/1 ，可以路由到 user-service的http://localhost:8201/user/1 处。

### 使用过滤器

在结合注册中心使用过滤器的时候，我们需要注意的是 uri 的协议为 lb，这样才能启用 Gateway 的负载均衡功能。

修改 application-eureka.yml 文件，使用了 PrefixPath 过滤器，会为所有 GET 请求路径添加 /user 路径并路由：

```yaml
server:
  port: 9201
spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      routes:
        - id: prefixpath_route
          uri: lb://user-service #此处需要使用lb协议
          predicates:
            - Method=GET
          filters:
            - PrefixPath=/user
      discovery:
        locator:
          enabled: true
eureka:
  client:
    service-url: 
      defaultZone: http://localhost:8001/eureka/

logging:
  level:
    org.springframework.cloud.gateway: debug
```

## 参考

- https://spring.io/projects/spring-cloud-gateway
- https://spring.io/guides/gs/gateway/
- https://cloud.spring.io/spring-cloud-gateway/reference/html/
- https://github.com/spring-cloud/spring-cloud-gateway/tree/master/spring-cloud-gateway-sample
- https://cloud.spring.io/spring-cloud-static/spring-cloud-netflix/2.1.2.RELEASE/single/spring-cloud-netflix.html
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/java/spring-cloud-gateway/reverse-proxy-vs-gateway.jpg
[2]: /images/java/spring-cloud-gateway/gateway-deploy.jpg
[3]: /images/java/spring-cloud-gateway/spring-cloud-gateway-diagram.png