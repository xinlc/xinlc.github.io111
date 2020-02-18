---
title: Spring Cloud OpenFeign
date: 2020-02-18 20:07:00
categories: Java
tags:
  - SpringCloud
---

上篇 Spring Cloud Ribbon 中写到用 RestTemplate 来调用其他微服务，本篇介绍更简单好用的声明式调用工具。

Spring Cloud OpenFeign 是声明式的服务调用工具（伪 Http 客户端），它整合了 Ribbon 和 Hystrix，拥有负载均衡和服务容错功能。只需创建一个接口并用注解的方式来配置它，就可以实现对某个服务接口的调用，简化了直接使用 RestTemplate 来调用服务接口的开发量。

Feign 具备可插拔的注解支持，同时支持 Feign 注解、JAX-RS 注解及 SpringMvc 注解。当使用 Feign 时，Spring Cloud 集成了 Ribbon 和 Eureka 以提供负载均衡的服务调用及基于 Hystrix 的服务容错保护功能。

<!--more-->

## 工作原理

Feign 是一个伪客户端，即它不做任何的请求处理。Feign 通过处理注解生成 request，从而实现简化 HTTP API 开发的目的，即开发人员可以使用注解的方式定制 request API 模板，在发送 http request 请求之前，Feign 通过处理注解的方式替换掉 request 模板中的参数，这种实现方式显得更为直接、可理解。

![1][1]

当客户端发起一个请求（Request Bean），这个请求首先会被动态代理截获，然后通过相应的编码器进行编码成为 Requst Json。

Requst Json 根据需要可以经过一些截获器做进一步处理，处理完以后传递给 Http Client，由 Http Client 发送 Requst Json 到服务端。服务端的响应回被解码器进行解码，这个 Json 消息的互转就是序列化和反序列化，另外一个叫法叫 Json 对象绑定。

虽然我们开发出的服务是弱类型 RESTful 的服务，但是有了 Feign 的支持，我们只要简单给出一个强类型的 Java API 接口，就可以获得一个强类型的客户端。这样我们同时获得强弱类型 API 的好处，包括：编译器自动类型检查、不需要手动编码解码、不需要开发代码生成工具、而且客户端和服务端不强耦合。

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR1

## 创建一个 feign-service 模块

feign-service 模块来演示 Feign 的常用功能，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

在 application.yml 中进行配置：

```yaml
server:
  port: 8701
spring:
  application:
    name: feign-service
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
```

在启动类上添加 @EnableFeignClients 注解来启用 Feign 的客户端功能：

```java
@EnableFeignClients
@EnableDiscoveryClient
@SpringBootApplication
public class FeignServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FeignServiceApplication.class, args);
    }
}
```

添加 FeignUserService 接口完成对 user-service 服务的接口绑定，通过 @FeignClient 注解实现了一个 Feign 客户端，其中的 value 为 user-service 表示这是对 user-service 服务的接口调用客户端，这里其实就是 user-service 中的 UserController，只是改成了接口：

```java
@FeignClient(value = "user-service")
public interface FeignUserService {
    @PostMapping("/user/create")
    CommonResult create(@RequestBody User user);

    @GetMapping("/user/{id}")
    CommonResult<User> getUser(@PathVariable Long id);

    @GetMapping("/user/getByUsername")
    CommonResult<User> getByUsername(@RequestParam String username);

    @PostMapping("/user/update")
    CommonResult update(@RequestBody User user);

    @PostMapping("/user/delete/{id}")
    CommonResult delete(@PathVariable Long id);
}
```

添加 UserFeignController 调用 FeignUserService 实现服务调用：

```java
@RestController
@RequestMapping("/user")
public class UserFeignController {
    @Autowired
    private FeignUserService userService;

    @GetMapping("/{id}")
    public CommonResult getUser(@PathVariable Long id) {
        return userService.getUser(id);
    }

    @GetMapping("/getByUsername")
    public CommonResult getByUsername(@RequestParam String username) {
        return userService.getByUsername(username);
    }

    @PostMapping("/create")
    public CommonResult create(@RequestBody User user) {
        return userService.create(user);
    }

    @PostMapping("/update")
    public CommonResult update(@RequestBody User user) {
        return userService.update(user);
    }

    @PostMapping("/delete/{id}")
    public CommonResult delete(@PathVariable Long id) {
        return userService.delete(id);
    }
}
```

启动 eureka-service，两个 user-service，feign-service 服务，访问 http://localhost:8701/user/1 进行测试。

## Feign 中的服务降级

Feign 中的服务降级使用起来非常方便，只需要为 Feign 客户端定义的接口添加一个服务降级处理的实现类即可。

添加服务降级实现类 UserFallbackService，实现 FeignUserService 接口，并且对接口中的每个实现方法进行服务降级逻辑的实现：

```java
@Component
public class UserFallbackService implements FeignUserService {
    @Override
    public CommonResult create(User user) {
        User defaultUser = new User(-1L, "defaultUser", "123456");
        return new CommonResult<>(defaultUser);
    }

    @Override
    public CommonResult<User> getUser(Long id) {
        User defaultUser = new User(-1L, "defaultUser", "123456");
        return new CommonResult<>(defaultUser);
    }

    @Override
    public CommonResult<User> getByUsername(String username) {
        User defaultUser = new User(-1L, "defaultUser", "123456");
        return new CommonResult<>(defaultUser);
    }

    @Override
    public CommonResult update(User user) {
        return new CommonResult("调用失败，服务被降级",500);
    }

    @Override
    public CommonResult delete(Long id) {
        return new CommonResult("调用失败，服务被降级",500);
    }
}
```

修改 FeignUserService 接口，设置服务降级处理类为 UserFallbackService：

```java
@FeignClient(value = "user-service", fallback = UserFallbackService.class)
public interface FeignUserService {
}
```

修改 application.yml，开启 Hystrix 功能：

```yaml
feign:
  hystrix:
    enabled: true # 在 Feign 中开启 Hystrix
```

关闭两个 user-service 服务，重新启动 feign-service。调用 http://localhost:8701/user/1 进行测试，可以发现返回了服务降级信息。

## 日志打印功能

Feign 提供了日志打印功能，我们可以通过配置来调整日志级别，从而了解 Feign 中 Http 请求的细节。

日志级别：

- NONE：默认的，不显示任何日志；
- BASIC：仅记录请求方法、URL、响应状态码及执行时间；
- HEADERS：除了 BASIC 中定义的信息之外，还有请求和响应的头信息；
- FULL：除了 HEADERS 中定义的信息之外，还有请求和响应的正文及元数据；

通过配置开启更为详细的日志：

```java
@Configuration
public class FeignConfig {
    @Bean
    Logger.Level feignLoggerLevel() {
        return Logger.Level.FULL;
    }
}
```

在 application.yml 中配置需要开启日志的 Feign 客户端：

```yaml
logging:
  level:
    com.leo.demo.service.FeignUserService: debug # 配置 UserService 的日志级别为 debug。
```

## Feign 的常用配置

```yaml
feign:
  hystrix:
    enabled: true # 在 Feign 中开启 Hystrix
  compression:
    request:
      enabled: false # 是否对请求进行 GZIP 压缩
      mime-types: text/xml,application/xml,application/json # 指定压缩的请求数据类型
      min-request-size: 2048 # 超过该大小的请求会被压缩
    response:
      enabled: false # 是否对响应进行GZIP压缩
logging:
  level: # 修改日志级别
    com.leo.demo.service.FeignUserService: debug # 配置 UserService 的日志级别为 debug。
```

## 扩展

### Feign 源码执行流程

Feign 的源码实现的过程如下：

1. 首先通过 @EnableFeignCleints 注解开启 FeignCleint；
2. 根据 Feign 的规则实现接口，并加 @FeignCleint 注解；
3. 程序启动后，会进行包扫描，扫描所有的 @FeignCleint 的注解的类，并将这些信息注入到 ioc 容器中；
4. 当接口的方法被调用，通过 JDK 的代理，来生成具体的 RequesTemplate；
5. RequesTemplate 在生成 Request；
6. Request 交给 Client 去处理，其中 Client 可以是 HttpUrlConnection、HttpClient 也可以是 Okhttp；
7. 最后 Client 被封装到 LoadBalanceClient 类，这个类结合类 Ribbon 做到了负载均衡；

> 在使用 Feign 的时候，要注意使用 requestBody，应该使用 @PostMapping。

### Feign 和 Ribbon 比较优点

- Feign 本身里面就包含有了 ribbon，只是对于 ribbon 进行进一步封装；
- Feign 自身是一个声明式的伪 http 客户端，写起来更加思路清晰和方便；
- Fegin 是一个采用基于接口的注解的编程方式，更加简便；

### 强类型接口设计

API 控制器可能会返回正常的响应，也可能会返回异常响应。我们采用强类型接口如何能处理正常响应，又能处理异常返回呢？而且这个接口又能是统一的呢？

封装消息+捎带模式：

![2][2]

所有的响应都是继承自 BaseResponse 对象，异常返回 BaseResponse，正常响应返回继承自 BaseResponse 的对象，举例：

这里有个 ListUserResponse 继承自 BaseResponse，当客户端向 UserController 请求获取用户列表的时候，如果这个响应异常了，那么他就只返回对应 BaseResponse 异常的消息，这个异常消息可以被 Json 自动序列化自动绑定到 ListUserResponse 对象上，因为两者有继承关系。BaseResponse 是 ListUserResponse 的部分，只不过绑定的时候 ListUserResponse 对象自己扩展的字段为空。这个时候客户端根据错误 code 进行处理。

如果响应是正常的，客户端根据 code 成功响应码进行处理。

改造模块依赖：

1. 抽出 Feign 接口为 user-api 模块。
2. 请求和响应封装在 user-api 模块 dto 中。
3. user-service 依赖 user-api 使用 dto。
4. feign-service 依赖 user-api 使用 Feign 和 dto。

common-lib 模块下 BaseResponse.java：

```java
package com.leo.common.api;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BaseResponse {
    private String message;

    @Builder.Default
    private ResultCode code = ResultCode.SUCCESS;

    public boolean isSuccess() {
        return code == ResultCode.SUCCESS;
    }
}
```

user-api 模块下 ListUserResponse.java：

```java
package com.leo.user.dto;

import lombok.*;
import com.leo.common.api.BaseResponse;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class ListUserResponse extends BaseResponse {
    private UserList userList;
}
```

feign-service 模块：

```java
// ...

  // 通过 Feign 客户端调用 user-service 服务
  ListUserResponse listUserResponse = null;
  try {
      listUserResponse = this.userClient.getUserList();
  } catch (Exception ex) {
      String errMsg = "unable to get user";
      handleErrorAndThrowException(ex, errMsg);
  }
  if (!listUserResponse.isSuccess()) {
      handleErrorAndThrowException(listUserResponse.getMessage());
  }

// ...
```

### 整合 Resilience4j

- https://github.com/resilience4j/resilience4j

## 参考

- https://github.com/OpenFeign/feign/
- https://cloud.spring.io/spring-cloud-openfeign/reference/html/
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/java/spring-cloud-open-feign/1.jpg
[2]: /images/java/spring-cloud-open-feign/2.jpg