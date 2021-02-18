---
title: 微服务架构之API网关：Spring Cloud Gateway
date: 2020-02-14 20:47:00
categories: Java
tags:
  - MicroServices
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
- 使用 Netty 进行网络通信建立，使用非阻塞 API，支持 Websockets；
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

## 工作原理

![3][3]

很像 SpringMVC 的请求处理过程，客户端向 Spring Cloud Gateway 发出请求。如果 Gateway Handler Mapping确定请求与路由匹配，则将其发送给 Gateway Web Handler。这个 Handler 运行通过特定于请求的过滤器链发送请求。过滤器可以在发送代理请求之前或之后执行逻辑。执行所有的“pre”过滤逻辑，然后发出代理请求，最后执行“post”过滤逻辑。

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
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

- Spring Cloud Gateway 包含许多内置的 Route Predicate Factories；
- 所有这些 predicates 用于匹配HTTP请求的不同属性；
- 多个 Route Predicate Factories 可以通过逻辑与（and）结合起来一起使用；

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

### RewritePath Route Predicate

重写路径，对于的请求路径/red/blue，在发出下游请求之前路径将会设置为/blue。由于YAML规范，$应将替换$\为。

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: rewritepath_route
        uri: https://example.org
        predicates:
        - Path=/foo/**
        filters:
        - RewritePath=/red(?<segment>/?.*), $\{segment}
```

### 自定义 Route Predicate 工厂

```java
public class MyRoutePredicateFactory extends AbstractRoutePredicateFactory<HeaderRoutePredicateFactory.Config> {

    public MyRoutePredicateFactory() {
        super(Config.class);
    }

    @Override
    public Predicate<ServerWebExchange> apply(Config config) {
        // grab configuration from Config object
        return exchange -> {
            //grab the request
            ServerHttpRequest request = exchange.getRequest();
            //take information from the request to see if it
            //matches configuration.
            return matches(config, request);
        };
    }

    public static class Config {
        //Put the configuration properties for your filter here
    }
}
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
    @Bean(value = "userKeyResolver")
    KeyResolver userKeyResolver() {
        return exchange -> Mono.just(exchange.getRequest().getQueryParams().getFirst("userId"));
    }

    @Bean("hostNameKeyResolver")
    public KeyResolver hostNameKeyResolver() {
        return exchange -> Mono.just(exchange.getRequest().getRemoteAddress().getHostName());
    }

    @Bean("ipKeyResolver")
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(exchange.getRequest().getRemoteAddress().getAddress().getHostAddress());
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
                redis-rate-limiter.replenishRate: 10 # 允许用户每秒处理多少个请求  (令牌桶每秒填充平均速率)
                redis-rate-limiter.burstCapacity: 20 # 允许在一秒钟内完成的最大请求数 (令牌桶总容量)
                key-resolver: "#{@ipKeyResolver}" # 限流策略，对应策略的Bean
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

@Bean
public GlobalFilter customGlobalFilter() {
    return (exchange, chain) -> exchange.getPrincipal()
        .map(Principal::getName)
        .defaultIfEmpty("Default User")
        .map(userName -> {
          //adds header to proxied request
          exchange.getRequest().mutate().header("CUSTOM-REQUEST-HEADER", userName).build();
          return exchange;
        })
        .flatMap(chain::filter);
}

@Bean
public GlobalFilter customGlobalPostFilter() {
    return (exchange, chain) -> chain.filter(exchange)
        .then(Mono.just(exchange))
        .map(serverWebExchange -> {
          //adds header to response
          serverWebExchange.getResponse().getHeaders().set("CUSTOM-RESPONSE-HEADER",
              HttpStatus.OK.equals(serverWebExchange.getResponse().getStatusCode()) ? "It worked": "It did not work");
          return serverWebExchange;
        })
        .then();
}
```

或者实现 GlobalFilter 接口：

```java
@Configuration
//@Order(0)
public class AccessGatewayFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
      ServerHttpRequest request = exchange.getRequest();
      String authentication = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
      String method = request.getMethodValue();
      String url = request.getPath().value();

      ServerHttpRequest.Builder builder = request.mutate();

      // 传递 header
      builder.header("X-Token", authentication);

      return chain.filter(exchange.mutate().request(builder.build()).build());
      // return chain.filter(exchange);
    }

   /**
    * 优先级
    *
    * @return int 数字越大优先级越低，可以是负数
    */
    @Override
    public int getOrder() {
      return 0;
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

### 自定义 GatewayFilter 工厂

自定义过滤器工厂相对来说这种方式更加灵活。

> 注意：当我们继承 AbstractGatewayFilterFactory 的时候，要把自定义的 Config 类传给父类，否者会报错。

前置过滤器工厂：

```java
public class PreGatewayFilterFactory extends AbstractGatewayFilterFactory<PreGatewayFilterFactory.Config> {

    public PreGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        // grab configuration from Config object
        return (exchange, chain) -> {
            //If you want to build a "pre" filter you need to manipulate the
            //request before calling chain.filter
            ServerHttpRequest.Builder builder = exchange.getRequest().mutate();
            //use builder to manipulate the request
            return chain.filter(exchange.mutate().request(request).build());
        };
    }

    public static class Config {
        //Put the configuration properties for your filter here
    }
}
```

后置过滤器工厂：

```java
public class PostGatewayFilterFactory extends AbstractGatewayFilterFactory<PostGatewayFilterFactory.Config> {

    public PostGatewayFilterFactory() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        // grab configuration from Config object
        return (exchange, chain) -> {
            return chain.filter(exchange).then(Mono.fromRunnable(() -> {
                ServerHttpResponse response = exchange.getResponse();
                //Manipulate the response in some way
            }));
        };
    }

    public static class Config {
        //Put the configuration properties for your filter here
    }

}
```

将工厂注入到 spring 容器当中：

```java
@Configuration
public class FilterFactory {
    @Bean
    public PreGatewayFilterFactory preGatewayFilterFactory() {
        return new PreGatewayFilterFactory();
    }

    @Bean
    public PostGatewayFilterFactory postGatewayFilterFactory() {
        return new PostGatewayFilterFactory();
    }
}
```

然后是 yaml 的配置，这里需要注意的是名称为前缀(Pre，Post)，SpringBoot 约定过滤器的前缀为配置的 name，而后面最好统一都是GatewayFilterFactory。

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: custom_gateway_filter_factories
          uri: https://example.org
          filters:
            - Pre
```

过滤器工厂的顶级的接口是 GatewayFilterFactory，我们可以直接继承它们的两个抽象类 AbstractGatewayFilterFactory 和 AbstractNameValueGatewayFilterFactory 来简化开发。区别在于 AbstractGatewayFilterFactory 是接受一个参数，AbstractNameValueGatewayFilterFactory 是接收两个参数，例如：- AddResponseHeader=X-Response-Default-Foo, Default-Bar

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

## 扩展

### Ant 风格路径表达式

在 Spring 中提供了 `UrlPathHelper` 和 `AntPathMatcher` 工具类对 URL 进行匹配以及处理。SpringMVC 的路径匹配规则是依照 Ant 的来的，实际上不只是 SpringMVC，整个 Spring 框架的路径解析都是按照 Ant 的风格来的；AntPathMatcher 不仅可以匹配 Spring 的`@RequestMapping` 路径，也可以用来匹配各种字符串，包括文件路径等。

#### 规则

- `?`：匹配一个字符（除过操作系统默认的文件分隔符）；
- `*`：匹配0个或多个字符；
- `**`：匹配0个或多个目录；
- `{spring:[a-z]+}` 将正则表达式[a-z]+匹配到的值,赋值给名为 spring 的路径变量；

#### 使用

```java
// AntPathMatcher matcher = new AntPathMatcher(File.separator)；
AntPathMatcher antPathMatcher = new AntPathMatcher();
// 缓存 pattern
antPathMatcher.setCachePatterns(true);
// 大小写敏感
antPathMatcher.setCaseSensitive(true);
// 去除空格
antPathMatcher.setTrimTokens(true);
// 分隔符
antPathMatcher.setPathSeparator("/");

// 匹配：com/test.jsp , com/tast.jsp , com/txst.jsp
Assert.assertTrue(antPathMatcher.match("com/t?st.jsp", "com/test.jsp"));
// 匹配：com文件夹下的全部.jsp文件
Assert.assertTrue(antPathMatcher.match("com/*.jsp", "com.a.jsp"));
// 匹配：com文件夹和子文件夹下的全部.jsp文件
Assert.assertTrue(antPathMatcher.match("com/**/test.jsp", "com/a/b/test.jsp"));
// 匹配：/test/下所有 api
Assert.assertTrue(antPathMatcher.match("/test/**", "/test/a/b"));
// 匹配：有值的路径
Assert.assertTrue(antPathMatcher.match("/test/{id}", "/test/1234"));
```

### gateway 异常处理

异常处理配置类, 覆盖默认的异常处理类：

```java
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfigureBefore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.web.ResourceProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.boot.autoconfigure.web.reactive.WebFluxAutoConfiguration;
import org.springframework.boot.autoconfigure.web.reactive.error.DefaultErrorWebExceptionHandler;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.reactive.error.ErrorAttributes;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ServerCodecConfigurer;
import org.springframework.web.reactive.config.WebFluxConfigurer;
import org.springframework.web.reactive.result.view.ViewResolver;

import java.util.Collections;
import java.util.List;

/**
 * 异常处理配置类, 覆盖默认的异常处理
 *
 * @author Richard
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@ConditionalOnClass(WebFluxConfigurer.class)
@AutoConfigureBefore(WebFluxAutoConfiguration.class)
@EnableConfigurationProperties({ServerProperties.class, ResourceProperties.class})
public class ErrorHandlerConfig {

	private ServerProperties serverProperties;

	private ApplicationContext applicationContext;

	private ResourceProperties resourceProperties;

	private List<ViewResolver> viewResolvers;

	private ServerCodecConfigurer serverCodecConfigurer;

	public ErrorHandlerConfig(ServerProperties serverProperties,
							  ResourceProperties resourceProperties,
							  ObjectProvider<List<ViewResolver>> viewResolversProvider,
							  ServerCodecConfigurer serverCodecConfigurer,
							  ApplicationContext applicationContext) {
		this.serverProperties = serverProperties;
		this.applicationContext = applicationContext;
		this.resourceProperties = resourceProperties;
		this.viewResolvers = viewResolversProvider.getIfAvailable(Collections::emptyList);
		this.serverCodecConfigurer = serverCodecConfigurer;
	}

	@Bean
	public ErrorWebExceptionHandler errorWebExceptionHandler(ErrorAttributes errorAttributes) {
		DefaultErrorWebExceptionHandler exceptionHandler = new CustomErrorWebExceptionHandler(
				errorAttributes, this.resourceProperties,
				this.serverProperties.getError(), this.applicationContext);
		exceptionHandler.setViewResolvers(this.viewResolvers);
		exceptionHandler.setMessageWriters(this.serverCodecConfigurer.getWriters());
		exceptionHandler.setMessageReaders(this.serverCodecConfigurer.getReaders());
		return exceptionHandler;
	}
}
```

自定义异常 Handler：

```java
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.ErrorProperties;
import org.springframework.boot.autoconfigure.web.ResourceProperties;
import org.springframework.boot.autoconfigure.web.reactive.error.DefaultErrorWebExceptionHandler;
import org.springframework.boot.web.reactive.error.ErrorAttributes;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.server.*;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * 自定义异常 Handler
 *
 * @author Richard
 */
@Slf4j
public class CustomErrorWebExceptionHandler extends DefaultErrorWebExceptionHandler {

	@Autowired
	private GateWayExceptionHandlerAdvice gateWayExceptionHandlerAdvice;

	/**
	 * Create a new {@code DefaultErrorWebExceptionHandler} instance.
	 *
	 * @param errorAttributes    the error attributes
	 * @param resourceProperties the resources configuration properties
	 * @param errorProperties    the error configuration properties
	 * @param applicationContext the current application context
	 */
	public CustomErrorWebExceptionHandler(ErrorAttributes errorAttributes, ResourceProperties resourceProperties,
										  ErrorProperties errorProperties, ApplicationContext applicationContext) {
		super(errorAttributes, resourceProperties, errorProperties, applicationContext);
	}

	@Override
	protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes errorAttributes) {
		return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
	}

	@Override
	protected Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
		Map<String, Object> error = getErrorAttributes(request, isIncludeStackTrace(request, MediaType.ALL));
		int errorStatus = getHttpStatus(error);
		Throwable throwable = getError(request);
		return ServerResponse.status(errorStatus)
				.contentType(MediaType.APPLICATION_JSON_UTF8)
				.body(BodyInserters.fromObject(gateWayExceptionHandlerAdvice.handle(throwable)));
		//.doOnNext((resp) -> logError(request, errorStatus));
	}
}
```

定义网关异常通知：

```java
import com.自定义.common.api.ApiResult;
import com.自定义.common.api.ApiResultType;
import com.自定义.common.exception.BusinessException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureException;
import io.netty.channel.ConnectTimeoutException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 网关异常通知
 *
 * @author Richard
 */
@Slf4j
@Component
public class GateWayExceptionHandlerAdvice {

	@ExceptionHandler(value = {ResponseStatusException.class})
	public ApiResult<?> handle(ResponseStatusException ex) {
		log.error("response status exception:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.GATEWAY_ERROR.getCode());
	}

	@ExceptionHandler(value = {ConnectTimeoutException.class})
	public ApiResult<?> handle(ConnectTimeoutException ex) {
		log.error("connect timeout exception:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.GATEWAY_CONNECT_TIME_OUT.getCode());
	}

	@ExceptionHandler(value = {NotFoundException.class})
	@ResponseStatus(HttpStatus.NOT_FOUND)
	public ApiResult<?> handle(NotFoundException ex) {
		log.error("not found exception:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.GATEWAY_NOT_FOUND_SERVICE.getCode());
	}

	@ExceptionHandler(value = {ExpiredJwtException.class})
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public ApiResult<?> handle(ExpiredJwtException ex) {
		log.error("ExpiredJwtException:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.INVALID_TOKEN.getCode());
	}

	@ExceptionHandler(value = {SignatureException.class})
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public ApiResult<?> handle(SignatureException ex) {
		log.error("SignatureException:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.INVALID_TOKEN.getCode());
	}

	@ExceptionHandler(value = {MalformedJwtException.class})
	@ResponseStatus(HttpStatus.UNAUTHORIZED)
	public ApiResult<?> handle(MalformedJwtException ex) {
		log.error("MalformedJwtException:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.INVALID_TOKEN.getCode());
	}

	@ExceptionHandler(value = {BusinessException.class})
	@ResponseStatus(HttpStatus.OK)
	public ApiResult<?> handle(BusinessException ex) {
		log.error("BusinessException exception:{}", ApiResultType.getMsgByCode(ex.getCode()));
		return ApiResult.FAIL(ex.getCode());
	}

	@ExceptionHandler(value = {RuntimeException.class})
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	public ApiResult<?> handle(RuntimeException ex) {
		log.error("runtime exception:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.SYS_ERROR.getCode());
	}

	@ExceptionHandler(value = {Exception.class})
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	public ApiResult<?> handle(Exception ex) {
		log.error("exception:{}", ex.getMessage());
		return ApiResult.FAIL(ApiResultType.SYS_ERROR.getCode());
	}

	@ExceptionHandler(value = {Throwable.class})
	@ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
	public ApiResult<?> handle(Throwable throwable) {
		ApiResult<?> result = ApiResult.FAIL(ApiResultType.SYS_ERROR.getCode());
		if (throwable instanceof ResponseStatusException) {
			result = handle((ResponseStatusException) throwable);
		} else if (throwable instanceof ConnectTimeoutException) {
			result = handle((ConnectTimeoutException) throwable);
		} else if (throwable instanceof NotFoundException) {
			result = handle((NotFoundException) throwable);
		} else if (throwable instanceof BusinessException) {
			result = handle((BusinessException) throwable);
		} else if (throwable instanceof RuntimeException) {
			result = handle((RuntimeException) throwable);
		} else if (throwable instanceof Exception) {
			result = handle((Exception) throwable);
		}
		return result;
	}
}
```

### 网关聚合所有的 Swagger 微服务文档

这里使用 [knife4j](https://gitee.com/xiaoym/knife4j/)，knife4j 是为 Java MVC 框架集成 Swagger 生成 Api 文档的增强解决方案。

在 Spring Cloud 的微服务架构下,每个微服务其实并不需要引入前端的Ui资源,因此在每个微服务的Spring Boot项目下,引入knife4j提供的微服务starter

```xml
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-micro-spring-boot-starter</artifactId>
    <version>${knife4j.version}</version>
</dependency>
```

swagger 的相关配置：

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.ApiInfo;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2;

/**
 * Swagger 配置
 *
 * @author Richard
 */
@Configuration
@EnableSwagger2
public class SwaggerConfig {

	@Bean(value = "authApi")
  @Order(value = 1)
	public Docket createRestApi() {
		return new Docket(DocumentationType.SWAGGER_2)
				.apiInfo(groupApiInfo())
				.select()
				.apis(RequestHandlerSelectors.basePackage("com.leo.auth.controller"))
				.paths(PathSelectors.any())
				.build();
	}

	private ApiInfo groupApiInfo() {
		return new ApiInfoBuilder()
				.title("auth 服务")
				.description("<div style='font-size:14px;color:red;'>授权，认证服务</div>")
				.contact("Richard")
				.version("1.0")
				.build();
	}
}

```

在网关聚合文档服务下, 可以再把前端的ui资源引入：

```xml
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-spring-boot-starter</artifactId>
    <version>${knife4j.version}</version>
</dependency>
```

Swagger 资源配置：

```java
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.config.GatewayProperties;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.support.NameUtils;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import springfox.documentation.swagger.web.SwaggerResource;
import springfox.documentation.swagger.web.SwaggerResourcesProvider;

import java.util.ArrayList;
import java.util.List;

/**
 * Swagger 聚合配置
 *
 * @author Richard
 */
@Slf4j
@Component
@Primary
@AllArgsConstructor
public class SwaggerResourceConfig implements SwaggerResourcesProvider {

    private final RouteLocator routeLocator;
    private final GatewayProperties gatewayProperties;

    @Override
    public List<SwaggerResource> get() {
        List<SwaggerResource> resources = new ArrayList<>();
        List<String> routes = new ArrayList<>();
        routeLocator.getRoutes().subscribe(route -> routes.add(route.getId()));
        gatewayProperties.getRoutes().stream().filter(routeDefinition -> routes.contains(routeDefinition.getId())).forEach(route -> {
            route.getPredicates().stream()
                    .filter(predicateDefinition -> ("Path").equalsIgnoreCase(predicateDefinition.getName()))
                    .forEach(predicateDefinition -> resources.add(swaggerResource(route.getId(),
                            predicateDefinition.getArgs().get(NameUtils.GENERATED_NAME_PREFIX + "0")
                                    .replace("**", "v2/api-docs"))));
        });

        return resources;
    }

    private SwaggerResource swaggerResource(String name, String location) {
        log.info("name:{},location:{}",name,location);
        SwaggerResource swaggerResource = new SwaggerResource();
        swaggerResource.setName(name);
        swaggerResource.setLocation(location);
        swaggerResource.setSwaggerVersion("2.0");
        return swaggerResource;
    }
}
```

Swagger 过滤器：

```java
import org.apache.commons.lang3.StringUtils;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

/**
 * Swagger 过滤器添加 Header
 * <p>
 * 在 Swagger 中会根据 X-Forwarded-Prefix 这个 Header 来获取 BasePath，
 * 而 Gateway 在做转发的时候并没有这个 Header 添加进 Request，所以发生接口调试的 404 错误，
 *
 * @author Richard
 */
@Component
public class SwaggerHeaderFilter extends AbstractGatewayFilterFactory<SwaggerHeaderFilter.Config> {

	private static final String HEADER_NAME = "X-Forwarded-Prefix";

	private static final String URI = "/v2/api-docs";

	public SwaggerHeaderFilter() {
		super(Config.class);
	}

	@Override
	public GatewayFilter apply(Config config) {
		return (exchange, chain) -> {
			ServerHttpRequest request = exchange.getRequest();
			String path = request.getURI().getPath();
			if (!StringUtils.endsWithIgnoreCase(path, URI)) {
				return chain.filter(exchange);
			}
			String basePath = path.substring(0, path.lastIndexOf(URI));
			ServerHttpRequest newRequest = request.mutate().header(HEADER_NAME, basePath).build();
			ServerWebExchange newExchange = exchange.mutate().request(newRequest).build();
			return chain.filter(newExchange);
		};
	}

	public static class Config {
		// Put the configuration properties for your filter here
	}
}
```

配置的网关属性，路由规则等，application.yml 配置文件如下：

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth_path_route
          uri: http://localhost:8088/auth-api
          order: 100
          predicates:
            - Path=/auth-api/**
          filters:
            - SwaggerHeaderFilter

        - id: other_auth_path_route
          uri: http://localhost:8088/auth-api
          # uri: http://aid-auth-service/auth-api
          order: 200
          predicates:
            # - Path=/*/auth-api/**
            - Path=/user-api/auth-api/**,/pms-api/auth-api/**
          filters:
            - SwaggerHeaderFilter

        - id: user_path_route
          uri: http://localhost:8081/user-api
          order: 500
          predicates:
            - Path=/user-api/**
          filters:
            - SwaggerHeaderFilter
```

访问：http://网关ip:网关端口/doc.html

### 实现动态路由

Gateway 启动时，路由信息默认会加载内存中，路由信息被封装到 `RouteDefinition` 对象中，配置多个 `RouteDefinition` 组成 Gateway 的路由系统。

Gateway 提供了 Endpoint 端点，暴露路由信息，源码在 **org.springframework.cloud.gateway.actuate.GatewayControllerEndpoint** 中，想访问端点需引入 **spring-boot-starter-actuator** 依赖，并在配置文件中暴露端点 application.yml：

```yaml
# 暴露所有端点，生产环境不建议暴露
management:
  endpoints:
    web:
      exposure:
        include: '*'
  endpoint:
    health:
      show-details: always
```

访问端点查看路由信息：http://localhost:8000/actuator/gateway/routes

#### 定义路由模型

```java
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

/**
 * 路由模型
 *
 * @author Richard
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GatewayRouteDefinition {
	// 路由Id
	private String id;

	// 路由断言集合配置
	private List<GatewayPredicateDefinition> predicates = new ArrayList<>();

	// 路由过滤器集合配置
	private List<GatewayFilterDefinition> filters = new ArrayList<>();

	// 路由规则转发的目标 uri
	private String uri;

	// 路由执行的顺序
	private int order = 0;
}
```

```java
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 路由断言模型
 *
 * @author Richard
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GatewayPredicateDefinition {
	// 断言对应的Name
	private String name;

	// 配置的断言规则
	private Map<String, String> args = new LinkedHashMap<>();
}
```

```java
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 过滤器模型
 *
 * @author Richard
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class GatewayFilterDefinition {
	// 过滤器 Name
	private String name;

	// 对应的路由规则
	private Map<String, String> args = new LinkedHashMap<>();
}
```

#### 动态路由服务实现

编写动态路由实现类，需实现 ApplicationEventPublisherAware 接口：

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.event.RefreshRoutesEvent;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionWriter;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ApplicationEventPublisherAware;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

/**
 * 动态路由服务
 *
 * @author Richard
 */
@Service
public class DynamicRouteService implements ApplicationEventPublisherAware {

	@Autowired
	private RouteDefinitionWriter routeDefinitionWriter;

	private ApplicationEventPublisher publisher;

	@Override
	public void setApplicationEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
		this.publisher = applicationEventPublisher;
	}

	/**
	 * 增加路由
	 */
	public String add(RouteDefinition definition) {
		routeDefinitionWriter.save(Mono.just(definition)).subscribe();
		this.publisher.publishEvent(new RefreshRoutesEvent(this));
		return "success";
	}

	/**
	 * 更新路由
	 */
	public String update(RouteDefinition definition) {
		try {
			delete(definition.getId());
		} catch (Exception e) {
			return "update fail,not find route routeId: " + definition.getId();
		}
		try {
			routeDefinitionWriter.save(Mono.just(definition)).subscribe();
			this.publisher.publishEvent(new RefreshRoutesEvent(this));
			return "success";
		} catch (Exception e) {
			return "update route fail";
		}
	}

	/**
	 * 删除路由
	 */
	public Mono<ResponseEntity<Object>> delete(String id) {
		return this.routeDefinitionWriter.delete(Mono.just(id)).then(Mono.defer(() -> {
			return Mono.just(ResponseEntity.ok().build());
		})).onErrorResume((t) -> {
			return t instanceof NotFoundException;
		}, (t) -> {
			return Mono.just(ResponseEntity.notFound().build());
		});
	}
}
```

#### 编写 Rest 接口

```java
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.FilterDefinition;
import org.springframework.cloud.gateway.handler.predicate.PredicateDefinition;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.cloud.gateway.route.RouteDefinitionLocator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * 动态路由控制器
 *
 * @author Richard
 */
@RestController
@RequestMapping("/route")
public class DynamicRouteController {
	@Autowired
	private DynamicRouteService dynamicRouteService;

	@Autowired
	private RouteDefinitionLocator routeDefinitionLocator;

	/*
	 * 获取网关所有的路由信息
	 */
	@RequestMapping("/routes")
	public Flux<RouteDefinition> getRouteDefinitions() {
		return routeDefinitionLocator.getRouteDefinitions();
	}

	/**
	 * 增加路由
	 */
	@PostMapping("/add")
	public String add(@RequestBody GatewayRouteDefinition gwdefinition) {
		String flag = "fail";
		try {
			RouteDefinition definition = assembleRouteDefinition(gwdefinition);
			flag = this.dynamicRouteService.add(definition);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return flag;
	}

	/**
	 * 删除路由
	 */
	@DeleteMapping("/routes/{id}")
	public Mono<ResponseEntity<Object>> delete(@PathVariable String id) {
		try {
			return this.dynamicRouteService.delete(id);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return null;
	}

	/**
	 * 更新路由
	 */
	@PostMapping("/update")
	public String update(@RequestBody GatewayRouteDefinition gwdefinition) {
		RouteDefinition definition = assembleRouteDefinition(gwdefinition);
		return this.dynamicRouteService.update(definition);
	}

	/**
	 * 把传递进来的参数转换成路由对象
	 */
	private RouteDefinition assembleRouteDefinition(GatewayRouteDefinition gwdefinition) {
		RouteDefinition definition = new RouteDefinition();
		definition.setId(gwdefinition.getId());
		definition.setOrder(gwdefinition.getOrder());

		// 设置断言
		List<PredicateDefinition> pdList = new ArrayList<>();
		List<GatewayPredicateDefinition> gatewayPredicateDefinitionList = gwdefinition.getPredicates();
		for (GatewayPredicateDefinition gpDefinition : gatewayPredicateDefinitionList) {
			PredicateDefinition predicate = new PredicateDefinition();
			predicate.setArgs(gpDefinition.getArgs());
			predicate.setName(gpDefinition.getName());
			pdList.add(predicate);
		}
		definition.setPredicates(pdList);

		// 设置过滤器
		List<FilterDefinition> filters = new ArrayList();
		List<GatewayFilterDefinition> gatewayFilters = gwdefinition.getFilters();
		for (GatewayFilterDefinition filterDefinition : gatewayFilters) {
			FilterDefinition filter = new FilterDefinition();
			filter.setName(filterDefinition.getName());
			filter.setArgs(filterDefinition.getArgs());
			filters.add(filter);
		}
		definition.setFilters(filters);

		URI uri = null;
		if (gwdefinition.getUri().startsWith("http")) {
			uri = UriComponentsBuilder.fromHttpUrl(gwdefinition.getUri()).build().toUri();
		} else {
			// uri 为 lb://consumer-service 时使用下面的方法
			uri = URI.create(gwdefinition.getUri());
		}
		definition.setUri(uri);
		return definition;
	}
}
```

#### 定时更新路由

```java
import com.alibaba.fastjson.JSON;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.FilterDefinition;
import org.springframework.cloud.gateway.handler.predicate.PredicateDefinition;
import org.springframework.cloud.gateway.route.RouteDefinition;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import java.net.URI;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 定时任务，拉取路由信息
 *
 * @author Richard
 */
@Component
@Slf4j
public class DynamicRouteScheduling {

	@Autowired(required = false)
	private RestTemplate restTemplate;

	@Autowired
	private DynamicRouteService dynamicRouteService;

	private static final String dynamicRouteServerName = "dynamic-route-service";

	// 发布路由信息的版本号
	private static Long versionId = 0L;

	/**
	 * 每60秒中执行一次
	 * 如果版本号不相等则获取最新路由信息并更新网关路由
	 */
	@Scheduled(cron = "*/60 * * * * ?")
	public void getDynamicRouteInfo() {
		try {
			SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
			log.info("拉取时间: {}", dateFormat.format(new Date()));
			// 先拉取版本信息，如果版本号不想等则更新路由
			Long resultVersionId = restTemplate.getForObject("http://" + dynamicRouteServerName + "/version/lastVersion", Long.class);
			log.info("路由版本信息：本地版本号：{}，远程版本号：{}", versionId, resultVersionId);
			if (resultVersionId != null && !versionId.equals(resultVersionId)) {
				log.info("开始拉取路由信息......");
				String resultRoutes = restTemplate.getForObject("http://" + dynamicRouteServerName + "/gateway-routes/routes", String.class);
				log.info("路由信息为：{}", resultRoutes);
				if (!StringUtils.isEmpty(resultRoutes)) {
					List<GatewayRouteDefinition> list = JSON.parseArray(resultRoutes, GatewayRouteDefinition.class);
					for (GatewayRouteDefinition definition : list) {
						// 更新路由
						RouteDefinition routeDefinition = assembleRouteDefinition(definition);
						dynamicRouteService.update(routeDefinition);
					}
					versionId = resultVersionId;
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	/**
	 * 把前端传递的参数转换成路由对象
	 */
	private RouteDefinition assembleRouteDefinition(GatewayRouteDefinition gwdefinition) {
		RouteDefinition definition = new RouteDefinition();
		definition.setId(gwdefinition.getId());
		definition.setOrder(gwdefinition.getOrder());

		// 设置断言
		List<PredicateDefinition> pdList = new ArrayList<>();
		List<GatewayPredicateDefinition> gatewayPredicateDefinitionList = gwdefinition.getPredicates();
		for (GatewayPredicateDefinition gpDefinition : gatewayPredicateDefinitionList) {
			PredicateDefinition predicate = new PredicateDefinition();
			predicate.setArgs(gpDefinition.getArgs());
			predicate.setName(gpDefinition.getName());
			pdList.add(predicate);
		}
		definition.setPredicates(pdList);

		// 设置过滤器
		List<FilterDefinition> filters = new ArrayList();
		List<GatewayFilterDefinition> gatewayFilters = gwdefinition.getFilters();
		for (GatewayFilterDefinition filterDefinition : gatewayFilters) {
			FilterDefinition filter = new FilterDefinition();
			filter.setName(filterDefinition.getName());
			filter.setArgs(filterDefinition.getArgs());
			filters.add(filter);
		}
		definition.setFilters(filters);

		URI uri = null;
		if (gwdefinition.getUri().startsWith("http")) {
			uri = UriComponentsBuilder.fromHttpUrl(gwdefinition.getUri()).build().toUri();
		} else {
			uri = URI.create(gwdefinition.getUri());
		}
		definition.setUri(uri);
		return definition;
	}
}
```

## 问题

### 引入 spring-boot-starter-web 无法启动

由于 Spring Cloud Gateway 使用的是 WebFlux，默认使用 Netty，所以从依赖中排除 Tomcat，WebMvc 相关的依赖：

```xml
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
      <exclusion>
        <groupId>org.springframework</groupId>
        <artifactId>spring-webmvc</artifactId>
      </exclusion>
      <exclusion>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-tomcat</artifactId>
      </exclusion>
    </exclusions>
  </dependency>
```

### reactor.netty.http.client.PrematureCloseException: Connection has been closed BEFORE response, while sending request body

原因：请求没有发送完下游服务关闭了连接，下游服务 tomcat 默认2MB请求限制，导致请求体被截断，controller 对请求参数有校验，被截断的内容校验没通过抛出异常关闭了连接。

解决：修改下游服务请求限制大小即可。

```yaml
server:
  max-http-header-size: 4048576
  tomcat:
    max-http-post-size: 100MB  #请求参数长度
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 20MB  #单个文件的最大上限
      max-request-size: 100MB #单个请求的文件总大小上限
```

## 参考

- https://spring.io/projects/spring-cloud-gateway
- https://spring.io/guides/gs/gateway/
- https://cloud.spring.io/spring-cloud-gateway/reference/html/
- https://github.com/spring-cloud/spring-cloud-gateway/tree/master/spring-cloud-gateway-sample
- https://cloud.spring.io/spring-cloud-static/spring-cloud-netflix/2.1.2.RELEASE/single/spring-cloud-netflix.html
- https://juejin.im/post/5db6eed6518825644076d0b6/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/spring-cloud-gateway/reverse-proxy-vs-gateway.jpg
[2]: /images/java/spring-cloud-gateway/gateway-deploy.jpg
[3]: /images/java/spring-cloud-gateway/spring-cloud-gateway-diagram.png
