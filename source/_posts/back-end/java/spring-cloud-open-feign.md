---
title: 微服务架构之声明式服务调用：Spring Cloud OpenFeign
date: 2020-02-18 20:07:00
categories: Java
tags:
  - MicroServices
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

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
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
// @EnableFeignClients(basePackages = {"com.leo.user"})
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
@FeignClient(value = "user-service", qualifier = "user-service")
// @FeignClient(name = "user-service", path = "/v1/userInfo", url = "${user.user-service-endpoint}")
// @Validated
public interface FeignUserService {
    @PostMapping("/user/create")
    CommonResult create(@RequestBody User user);

    @GetMapping("/user/{id}")
    CommonResult<User> getUser(@PathVariable("id") Long id);

    @GetMapping("/user/getByUsername")
    CommonResult<User> getByUsername(@RequestParam("username") String username);

    @PostMapping("/user/update")
    CommonResult update(@RequestBody User user);

    @PostMapping("/user/delete/{id}")
    CommonResult delete(@PathVariable("id") Long id);
}
```

添加 UserFeignController 调用 FeignUserService 实现服务调用：

```java
@RestController
@RequestMapping("/user")
public class UserFeignController {

		@Qualifier("user-service")
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

**FallbackFactory**

除了 fallback 模式，还可以调用 fallbackFactory，这种可以记录远程调用失败的具体明细异常。建议采用此方案设置后备模式：

FeignUserService.java

```java
@FeignClient(value = "user-service", fallbackFactory = UserServiceFallbackFactory.class)
public interface FeignUserService {
}
```

UserServiceFallbackFactory.java

```java
import feign.hystrix.FallbackFactory;
import org.springframework.stereotype.Component;
// 申明后备模式
@Component
public class UserServiceFallbackFactory implements FallbackFactory<FeignUserService> {
    @Override
    public FeignUserService create(Throwable throwable) {
        FeignUserServiceFallbackImpl feignUserServiceFallbackImpl = new FeignUserServiceFallbackImpl();
        feignUserServiceFallbackImpl.setCause(throwable);
        return feignUserServiceFallbackImpl;
    }
}
```

FeignUserServiceFallbackImpl.java

```java
import lombok.extern.slf4j.Slf4j;
import lombok.Setter;
@Slf4j
@Component
public class FeignUserServiceFallbackImpl implements FeignUserService {
    @Setter
    private Throwable cause;

    @Override
    public CommonResult create(User user) {
        log.error("调用失败", cause);
        User defaultUser = new User(-1L, "defaultUser", "123456");
        return new CommonResult<>(defaultUser);
    }
    // 其他省略……
}
```

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

### feign不过注册中心子系统联调的方法(开发环境常用)

团队开发中通常使用同一个注册中心，为了避免联调时调用其他成员机器实例，需要配置feign不通过注册中心获取实例地址，主要有以下两种方法：

1. 通过feign注解@FeignClient的url属性

```java
@FeignClient(name = "server-a", url = "http://localhost:8080", fallback = FeignApiFallbackComponent.class)
```

这种方式将两个子系统作为无关系统直接调用，只适合与开发环境上面做联调，联调结束之后需要删除url属性。

- 主要的缺点是如果没有删除直接上传，会导致代码结果被破坏，而且不利于调试定位。需要通过修改代码来实现
- 主要的优点是联调比较简单

2. 通过ribbon的相关配置

feign在子系统间调用时，主要是借助于ribbon进行负载均衡的，因此，我们可以通过配置ribbon属性，方便的进行联调。

feign的配置如下：

```java
@FeignClient(name = "server-a", fallback = FeignApiFallbackComponent.class)
```

在spring boot开发时，我们通常会针对开发环境配置`application-dev.yaml`文件作为开发环境的配置。因此，我们可以在该文件中增加如下的配置，直接进行联调

```yaml
ribbon:
  # eureka 注册中心
  eureka:
    enabled: false
  # nacos 注册中心, spring.cloud.nacos.discovery.enabled=false
  nacos:
    enabled: false
server-a:
  ribbon:
    listOfServers: localhost:8080
    ServerListRefreshInterval: 15000
```

程序启动的时候，需要加上如下的程序参数

```bash
--spring.profiles.active=dev
```

通过这种方式，就可以直接在开发环境中进行联调，主要是通过spring boot的配置文件进行的。这种方式的主要优缺点如下

- 主要的优点是，打包之后环境不同，不会相互影响，确保生产环境的正确性。在部署到生产环境之后，也可以通过该方式，测试子系统间的可用性
- 主要的缺点是，需要增加一个配置文件

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

### 向下传递 request 信息

可以通过 RequestContextHolder 很方便的获取 request，然后通过 Feign 拦截器自动设置 requestTemplate header。比如要实现自动向下传递用户ID，代码如下：

AuthContext.java 用于保存当前 userId 和 authz 信息的上下文容器类：

```java
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import javax.servlet.http.HttpServletRequest;

public class AuthContext {
    private static String getRequetHeader(String headerName) {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes) {
            HttpServletRequest request = ((ServletRequestAttributes)requestAttributes).getRequest();
            String value = request.getHeader(headerName);
            return value;
        }
        return null;
    }

    public static String getUserId() {
        return getRequetHeader("X-current-user-id");
    }

    public static String getAuthz() {
        return getRequetHeader("Authorization");
    }
}
```

FeignRequestHeaderInterceptor.java Feign 拦截器，用于将 auth 信息传递到后端：

```java
import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.util.StringUtils;

public class FeignRequestHeaderInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate requestTemplate) {
        String userId = AuthContext.getUserId();
        if (!StringUtils.isEmpty(userId)) {
            requestTemplate.header("X-current-user-id", userId);
        }

        /*
        // Feign 请求拦截器（设置请求头，传递请求参数）
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        Enumeration<String> headerNames = request.getHeaderNames();
        if (headerNames != null) {
            while (headerNames.hasMoreElements()) {
                String name = headerNames.nextElement();
                String values = request.getHeader(name);
                requestTemplate.header(name, values);
            }
        }

        // 设置 request 中的 attribute 到 header:主要是设置自行设置的 token、userId 等信息，以便转发到 Feign 调用的服务
        Enumeration<String> reqAttrbuteNames = request.getAttributeNames();
        if (reqAttrbuteNames != null) {
            while (reqAttrbuteNames.hasMoreElements()) {
                String attrName = reqAttrbuteNames.nextElement();
                String values = request.getAttribute(attrName).toString();
                requestTemplate.header(attrName, values);
            }
        }
        */
    }
}
```

FeignConfig.java 来配置 Feign：

```java
import feign.RequestInterceptor;
import feign.codec.Decoder;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.cloud.openfeign.support.SpringDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignConfig {
    /**
     * 自定义反序列化解析器
     *
     * @return
     */
    @Bean
    public Decoder feignDecoder() {
        ObjectFactory<HttpMessageConverters> messageConverters = () -> {
            HttpMessageConverters converters = new HttpMessageConverters();
            return converters;
        };
        return new SpringDecoder(messageConverters);
    }

    /**
     * Feign 拦截器
     *
     * @return
     */
    @Bean
    public RequestInterceptor feignRequestInterceptor() {
        return new FeignRequestHeaderInterceptor();
    }
}
```

这样就可以实现自动向下传递 request 信息了，下游服务通过 `AuthContext.getUserId()` 来获取用户Id。

### 强类型接口设计

API 控制器可能会返回正常的响应，也可能会返回异常响应。我们采用强类型接口如何能处理正常响应，又能处理异常返回呢？而且这个接口又能是统一的呢？

采用封装消息+捎带模式：

![2][2]

所有的响应都是继承自 BaseResponse 对象，异常返回 BaseResponse，正常响应返回继承自 BaseResponse 的对象，举例：

这里有个 ListUserResponse 继承自 BaseResponse，当客户端向 UserController 请求获取用户列表的时候，如果这个响应异常了，那么他就只返回对应 BaseResponse 异常的消息，这个异常消息可以被 Json 自动序列化自动绑定到 ListUserResponse 对象上，因为两者有继承关系。BaseResponse 是 ListUserResponse 的部分，只不过绑定的时候 ListUserResponse 对象自己扩展的字段为空。这个时候客户端根据错误 code 进行处理。

如果响应是正常的，客户端根据 code 成功响应码进行处理。通过这种简单的继承机制，强类型接口就可以同时处理正常异常两种情况。

改造模块依赖：

1. 抽出 FeignUserService 接口为 user-api 模块。
2. 请求和响应对象封装在 user-api 模块 dto 中。
3. user-service 依赖 user-api 使用 dto。
4. feign-service 依赖 user-api 使用 FeignUserService 和 dto。

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

虽然我们开发出的服务是弱类型 RESTful 的服务，但是有了 Feign 的支持，我们只要简单给出一个强类型的 Java API 接口，就可以获得一个强类型的客户端。这样我们同时获得强弱类型 API 的好处，包括：编译器自动类型检查、不需要手动编码解码、不需要开发代码生成工具、而且客户端和服务端不强耦合。

> 注意：这种继承关系（ListUserResponse 继承 BaseResponse ），除了这种继承关系之外 ListUserResponse 内部尽量不要再有继承关系，泛型也尽量不要采用（除了 Collection 这种泛型），否则可能会无法反序列化。因为 Java 在运行期泛型回被擦除，造成无法反序列化。
>
> 由于 Java 泛型的实现机制，使用了泛型的代码在运行期间相关的泛型参数的类型会被擦除，我们无法在运行期间获知泛型参数的具体类型（所有的泛型类型在运行时都是 Object 类型），但是在编译 Java 源代码成 class 文件中还是保存了泛型相关的信息，这些信息被保存在 class 字节码常量池中，使用了泛型的代码处会生成一个 signature 签名字段，通过签名 signature 字段指明这个常量池的地址。
>
> Java 引入泛型擦除的原因是避免因为引入泛型而导致运行时创建不必要的类。我们其实可以通过定义类的方式，在类信息中保留泛型信息，从而获得这些泛型信息。Java 的泛型擦除是有范围的，即类定义中的泛型是不会被擦除的。

### 整合 Resilience4j

- https://github.com/resilience4j/resilience4j

### 使用 [OkHttp3](https://github.com/square/okhttp)

在 Feign 中，Client 是一个非常重要的组件，Feign 最终发送 Request 请求以及接收 Response 响应都是由 Client 组件来完成的。Client 在 Feign 源码中是一个接口，在默认情况下，Client 的实现类是 Client.Default，是由 HttpURLConnection 来实现网络请求的。另外 Client 还支持以下常见客户端：

- LoadBalancerFeignClient：这是一个特殊的 feign.Client 客户端实现类。内部先使用 Ribbon 负载均衡算法计算 Server 服务器，然后使用包装的 Delegate 客户端实例，去完成 HTTP URL 请求处理；
- ApacheHttpClient：内部使用 Apache HttpClient 开源组件完成 HTTP URL 请求处理；
- WebClient：是 Spring 5 中最新引入的，可以将其理解为 Reactive 版的 RestTemplate，基于 Reactor 的 WebClient。
- OkHttpClient：内部使用 OkHttp3 开源组件完成 HTTP URL 请求处理；

引入 OkHttp3 的依赖：

```xml
 <dependency>
    <groupId>io.github.openfeign</groupId>
    <artifactId>feign-okhttp</artifactId>
    <version>10.7.4</version>
</dependency>
```

修改 application.yaml 配置：

```yaml
# 禁用 httpclient，使用 OkHttp
feign:
  httpclient:
    enabled: false
  okhttp:
    enabled: true
```

修改 FeignConfig 配置类：

```java
import feign.Client;
import feign.Feign;
import feign.codec.Decoder;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.cloud.openfeign.FeignAutoConfiguration;
import org.springframework.cloud.openfeign.support.SpringDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Configuration
@ConditionalOnClass(Feign.class)
/*
 这里网上大部分是 @AutoConfigureBefore，实际是行不通的，原因是 FeignAutoConfiguration 类里面加了 @ConditionalOnMissingBean({okhttp3.OkHttpClient.class})
 只有当容器中没有 OkHttpClient 的实例时才会运行，所以不能在 FeignAutoConfiguration 之前注入了我们自己定义的 OkHttpClient 实例。
*/
@AutoConfigureAfter(FeignAutoConfiguration.class)
// @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Slf4j
public class FeignOkHttpConfig {
    /**
     * 自定义反序列化解析器
     */
    @Bean
    public Decoder feignDecoder() {

        ObjectFactory<HttpMessageConverters> messageConverters = () -> {
            HttpMessageConverters converters = new HttpMessageConverters();
            return converters;
        };
        return new SpringDecoder(messageConverters);
    }


    /**
     * 解决中文乱码
     */
    // @Bean
    // public Encoder encoder() {
    //     return new FormEncoder();
    // }


    /**
     * 复制 FeignAutoConfiguration 类的配置。
     */
    @Bean
    @ConditionalOnMissingBean({Client.class})
    public Client feignClient(OkHttpClient client) {
        return new feign.okhttp.OkHttpClient(client);
    }

    /**
     * 配置 OkHttp3
     */
    @Bean
    public OkHttpClient okHttpClient() {
        return new OkHttpClient.Builder()
                // 设置读超时
                .readTimeout(60, TimeUnit.SECONDS)
                // 设置连接超时
                .connectTimeout(60, TimeUnit.SECONDS)
                // 设置写超时
                .writeTimeout(120, TimeUnit.SECONDS)
                // 错误重连
                .retryOnConnectionFailure(true)
                // 10个线程，保存5分钟长连接
                .connectionPool(new ConnectionPool(10, 5L, TimeUnit.MINUTES))
                // 自定义 OkHttpLogInterceptor 或 添加 header
                .addInterceptor(new Interceptor() {
                    @Override
                    public Response intercept(Chain chain) throws IOException {
                        Request request = chain.request().newBuilder()
                                .addHeader("X-Token", "1")
                                .build();

                        log.info("OkHttpUrl : " + chain.request().url());
                        return chain.proceed(request);
                    }
                })
                .build();
    }

    /**
     * 定义 Feign 拦截器，添加请求头
     *
     * @return
     */
    @Bean
    public RequestInterceptor feignRequestInterceptor() {
        return new FeignRequestHeaderInterceptor();
    }
}
```

### 使用 fastjson 作为默认序列化

pom.xml 添加依赖：

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>fastjson</artifactId>
    <version>1.2.68</version>
</dependency>
```

**注意：想要使 SerializerFeature 配置生效，Client 接口(FeignUserService)的返回值要是 Object 或者 JSONObject，返回 Bean 是不生效的。懒的抽离了，直接把我用到的 Feign 配置所有文件贴上。**

修改 FeignConfig 配置类：

```java
import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.serializer.SerializerFeature;
import com.alibaba.fastjson.support.config.FastJsonConfig;
import com.alibaba.fastjson.support.spring.FastJsonHttpMessageConverter;
import com.alibaba.fastjson.support.springfox.SwaggerJsonSerializer;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.netflix.hystrix.exception.HystrixBadRequestException;
import com.leo.common.interceptor.FeignRequestHeaderInterceptor;
import com.leo.common.interceptor.OkHttpLogInterceptor;
import com.leo.common.logger.OkHttpSlf4jLogger;
import com.leo.common.ssl.DisableValidationTrustManager;
import com.leo.common.ssl.TrustAllHostNames;
import com.leo.common.utils.Holder;
import feign.Client;
import feign.Feign;
import feign.Logger;
import feign.RequestInterceptor;
import feign.Response;
import feign.codec.Decoder;
import feign.codec.Encoder;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import okhttp3.ConnectionPool;
import okhttp3.OkHttpClient;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.cloud.openfeign.FeignAutoConfiguration;
import org.springframework.cloud.openfeign.support.ResponseEntityDecoder;
import org.springframework.cloud.openfeign.support.SpringDecoder;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 配置 Feign
 *
 * @author Leo
 * @date 2020.02.17
 */
@Configuration
@ConditionalOnClass(Feign.class)
@AutoConfigureAfter(FeignAutoConfiguration.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import(value = {OkHttpProps.class})
@Slf4j
public class FeignOkHttpConfig {

	@Autowired
	private OkHttpProps okHttpProps;

	/**
	 * 根据实际情况选择合适的日志 level
	 *
	 * @return
	 */
	@Bean
	Logger.Level feignLoggerLevel() {
		return Logger.Level.FULL;
	}

//	/**
//	 * 自定义反序列化解析器
//	 *
//	 * @return
//	 */
//	@Bean
//	public Decoder feignDecoder() {
//
//		ObjectFactory<HttpMessageConverters> messageConverters = () -> {
//			HttpMessageConverters converters = new HttpMessageConverters();
//			return converters;
//		};
//		return new SpringDecoder(messageConverters);
//	}
//
	@Bean
	public Encoder feignEncoder() {
		return new SpringEncoder(feignHttpMessageConverter());
	}

	@Bean
	public Decoder feignDecoder() {
		return new SpringDecoder(feignHttpMessageConverter());
	}

//	@Bean
//	public SpringEncoder feignEncoder() {
//		return new SpringEncoder(feignHttpMessageConverter());
//	}
//
//	@Bean
//	public ResponseEntityDecoder feignDecoder() {
//		return new ResponseEntityDecoder(new SpringDecoder(feignHttpMessageConverter()));
//	}

	/**
	 * 设置解码器为 fastjson
	 *
	 * @return
	 */
	private ObjectFactory<HttpMessageConverters> feignHttpMessageConverter() {
		final HttpMessageConverters httpMessageConverters = new HttpMessageConverters(this.getFastJsonConverter());
		return () -> httpMessageConverters;
	}

	private FastJsonHttpMessageConverter getFastJsonConverter() {
		// 创建fastJson消息转换器
		FastJsonHttpMessageConverter converter = new FastJsonHttpMessageConverter();

		List<MediaType> supportedMediaTypes = new ArrayList<>();
		supportedMediaTypes.add(MediaType.APPLICATION_JSON);
		supportedMediaTypes.add(MediaType.APPLICATION_JSON_UTF8);
//		supportedMediaTypes.add(MediaType.APPLICATION_ATOM_XML);
//		supportedMediaTypes.add(MediaType.APPLICATION_FORM_URLENCODED);
//		supportedMediaTypes.add(MediaType.APPLICATION_OCTET_STREAM);
//		supportedMediaTypes.add(MediaType.APPLICATION_PDF);
//		supportedMediaTypes.add(MediaType.APPLICATION_RSS_XML);
//		supportedMediaTypes.add(MediaType.APPLICATION_XHTML_XML);
//		supportedMediaTypes.add(MediaType.APPLICATION_XML);
//		supportedMediaTypes.add(MediaType.IMAGE_GIF);
//		supportedMediaTypes.add(MediaType.IMAGE_JPEG);
//		supportedMediaTypes.add(MediaType.IMAGE_PNG);
//		supportedMediaTypes.add(MediaType.TEXT_EVENT_STREAM);
//		supportedMediaTypes.add(MediaType.TEXT_HTML);
//		supportedMediaTypes.add(MediaType.TEXT_MARKDOWN);
//		supportedMediaTypes.add(MediaType.TEXT_PLAIN);
//		supportedMediaTypes.add(MediaType.TEXT_XML);
		converter.setSupportedMediaTypes(supportedMediaTypes);

		// 创建配置类
		FastJsonConfig fastJsonConfig = new FastJsonConfig();
		// 修改配置返回内容的过滤
		// WriteNullListAsEmpty：List 字段如果为 null, 输出为 [], 而非 null
		// WriteNullStringAsEmpty： 字符类型字段如果为 null, 输出为 "", 而非 null
		// DisableCircularReferenceDetect：消除对同一对象循环引用的问题，默认为 false（如果不配置有可能会进入死循环）
		// WriteNullBooleanAsFalse：Boolean 字段如果为 null, 输出为 false, 而非 null
		// WriteMapNullValue：是否输出值为 null 的字段,默认为 false
		// WriteDateUseDateFormat：时期格式格式化为 yyyy-MM-dd HH:mm:ss
		fastJsonConfig.getSerializeConfig().put(JSON.class, new SwaggerJsonSerializer());
		fastJsonConfig.setSerializerFeatures(
			  // 禁用循环引用
				SerializerFeature.DisableCircularReferenceDetect,
				SerializerFeature.WriteDateUseDateFormat,
				SerializerFeature.WriteMapNullValue,
				SerializerFeature.WriteNullNumberAsZero
		);

		converter.setFastJsonConfig(fastJsonConfig);
		return converter;
	}

	@Bean
	@ConditionalOnMissingBean({Client.class})
	public Client feignClient(OkHttpClient client) {
		return new feign.okhttp.OkHttpClient(client);
	}

	/**
	 * 日志拦截器
	 *
	 * @return
	 */
	public OkHttpLogInterceptor loggingInterceptor() {
		OkHttpLogInterceptor interceptor = new OkHttpLogInterceptor(new OkHttpSlf4jLogger());
		interceptor.setLevel(okHttpProps.getLevel());
		return interceptor;
	}

	/**
	 * 配置 OkHttp3
	 *
	 * @return
	 */
	@Bean
	public OkHttpClient okHttpClient() {
		int maxTotalConnections = okHttpProps.getMaxConnections();
		long timeToLive = okHttpProps.getTimeToLive();
		TimeUnit ttlUnit = okHttpProps.getTimeUnit();
		ConnectionPool connectionPool = new ConnectionPool(maxTotalConnections, timeToLive, ttlUnit);

		return createBuilder(okHttpProps.isDisableSslValidation())
				// 设置连接超时
				.connectTimeout(okHttpProps.getConnectionTimeout(), ttlUnit)
				// 设置读超时
				.readTimeout(okHttpProps.getReadTimeout(), ttlUnit)
				// 设置写超时
				.writeTimeout(okHttpProps.getWriteTimeout(), ttlUnit)
				// 是否支持重定向
				.followRedirects(okHttpProps.isFollowRedirects())
				// 错误重连
				.retryOnConnectionFailure(okHttpProps.isRetryOnConnectionFailure())
				// 连接池
				.connectionPool(connectionPool)
				// 拦截器
				.addInterceptor(loggingInterceptor())
				.build();
	}


	/**
	 * 构建 SSL
	 *
	 * @param disableSslValidation
	 * @return
	 */
	private OkHttpClient.Builder createBuilder(boolean disableSslValidation) {
		OkHttpClient.Builder builder = new OkHttpClient.Builder();
		if (disableSslValidation) {
			try {
				X509TrustManager disabledTrustManager = DisableValidationTrustManager.INSTANCE;
				TrustManager[] trustManagers = new TrustManager[]{disabledTrustManager};
				SSLContext sslContext = SSLContext.getInstance("SSL");
				sslContext.init(null, trustManagers, Holder.SECURE_RANDOM);
				SSLSocketFactory disabledSslSocketFactory = sslContext.getSocketFactory();
				builder.sslSocketFactory(disabledSslSocketFactory, disabledTrustManager);
				builder.hostnameVerifier(TrustAllHostNames.INSTANCE);
			} catch (NoSuchAlgorithmException | KeyManagementException e) {
				log.warn("Error setting SSLSocketFactory in OKHttpClient", e);
			}
		}
		return builder;
	}

	/**
	 * 定义 Feign 拦截器，添加请求头
	 *
	 * @return
	 */
	@Bean
	public RequestInterceptor feignRequestInterceptor() {
		return new FeignRequestHeaderInterceptor();
	}

		/**
	 * 自定义错误
	 */
//	@Bean
//	public ErrorDecoder errorDecoder() {
//		return new UserErrorDecoder();
//	}

	/**
	 * 自定义错误
	 */
//	public class UserErrorDecoder implements ErrorDecoder {
//		private Logger logger = LoggerFactory.getLogger(getClass());
//		@Override
//		public Exception decode(String methodKey, Response response) {
//			Exception exception = null;
//			try {
//				String json = Util.toString(response.body().asReader());
//				exception = new RuntimeException(json);
//				Result result = JsonMapper.nonEmptyMapper().fromJson(json, Result.class);
//				// 业务异常包装成 HystrixBadRequestException，不进入熔断逻辑
//				if (!result.isSuccess()) {
//					exception = new HystrixBadRequestException(result.getMessage());
//				}
//			} catch (IOException ex) {
//				logger.error(ex.getMessage(), ex);
//			}
//			return exception;
//		}
//	}
}
```

FeignRequestHeaderInterceptor.java：

```java
import com.alibaba.fastjson.JSON;
import com.leo.common.context.AuthContext;
import com.leo.common.bo.UserInfoBo;
import com.leo.common.constant.AuthConstant;
import com.leo.common.utils.OkHttpUtil;
import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.util.Enumeration;

/**
 * Feign 请求拦截器（设置请求头，传递请求参数）
 * <p>
 * 服务间进行 Feign 调用时，不会传递请求头信息。通过实现 RequestInterceptor 接口，完成对所有的 Feign 请求，传递请求头和请求参数。
 *
 * @author Leo
 * @date 2020.02.19
 */
public class FeignRequestHeaderInterceptor implements RequestInterceptor {

	@Override
	public void apply(RequestTemplate requestTemplate) {

		// Feign 请求拦截器（设置请求头，传递请求参数）
		ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
		if (null != attributes) {
			HttpServletRequest request = attributes.getRequest();
			Enumeration<String> headerNames = request.getHeaderNames();
			if (headerNames != null) {
				while (headerNames.hasMoreElements()) {
					String name = headerNames.nextElement();
					String values = request.getHeader(name);
					requestTemplate.header(name, values);
				}
			}
		}

		// 传递上下文中的用户信息
		UserInfoBo userInfoBo = AuthContext.getUser();
		if (null != userInfoBo) {
			requestTemplate.header(AuthConstant.CURRENT_USER_HEADER, OkHttpUtil.getValueEncoded(JSON.toJSONString(userInfoBo)));
		}
	}
}
```

OkHttpUtil.java：

```java
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;

/**
 * @author Leo
 * @date 2020.02.28
 */
public final class OkHttpUtil {

	/**
	 * 由于 OkHttp header 中的 value 不支持 null, \n 和 中文这样的特殊字符,所以这里
	 * 会首先替换 \n ,然后使用 OkHttp 的校验方式,校验不通过的话,就返回 encode 后的字符串
	 *
	 * @param value
	 * @return
	 */
	public static String getValueEncoded(String value) {
		if (value == null) return "null";
		String newValue = value.replace("\n", "");
		for (int i = 0, length = newValue.length(); i < length; i++) {
			char c = newValue.charAt(i);
			if (c <= '\u001f' || c >= '\u007f') {
				try {
					return URLEncoder.encode(newValue, "UTF-8");
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
		}
		return newValue;
	}

	/**
	 * 由于 OkHttp header 中的 value 不支持 null, \n 和 中文这样的特殊字符
	 * 上游传输时进行了编码，获取需要解码
	 *
	 * @param value
	 * @return
	 */
	public static String getValueDecode(String value) {
		if ("null".equals(value)) return null;
		try {
			return URLDecoder.decode(value, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			e.printStackTrace();
		}
		return null;
	}
}
```

OkHttpLogInterceptor.java：

```java
import com.leo.common.emum.OkHttpLogLevelEnum;
import okhttp3.*;
import okhttp3.internal.http.HttpHeaders;
import okio.Buffer;
import okio.BufferedSource;
import okio.GzipSource;

import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * OkHttp log
 *
 * @author Leo
 * @date 2020.02.28
 */
public final class OkHttpLogInterceptor implements Interceptor {
	private static final Charset UTF8 = StandardCharsets.UTF_8;
	private final Logger logger;
	private volatile OkHttpLogLevelEnum level = OkHttpLogLevelEnum.NONE;

	public interface Logger {
		/**
		 * log
		 *
		 * @param message message
		 */
		void log(String message);
	}

	public OkHttpLogInterceptor(Logger logger) {
		this.logger = logger;
	}

	/**
	 * Change the level at which this interceptor logs.
	 *
	 * @param level log Level
	 * @return HttpLoggingInterceptor
	 */
	public OkHttpLogInterceptor setLevel(OkHttpLogLevelEnum level) {
		Objects.requireNonNull(level, "level == null. Use Level.NONE instead.");
		this.level = level;
		return this;
	}

	public OkHttpLogLevelEnum getLevel() {
		return level;
	}

	@Override
	public Response intercept(Chain chain) throws IOException {
		OkHttpLogLevelEnum level = this.level;

		Request request = chain.request();
		if (level == OkHttpLogLevelEnum.NONE) {
			return chain.proceed(request);
		}

		boolean logBody = level == OkHttpLogLevelEnum.BODY;
		boolean logHeaders = logBody || level == OkHttpLogLevelEnum.HEADERS;

		RequestBody requestBody = request.body();
		boolean hasRequestBody = requestBody != null;

		Connection connection = chain.connection();
		String requestStartMessage = "--> "
				+ request.method()
				+ ' ' + request.url()
				+ (connection != null ? " " + connection.protocol() : "");
		if (!logHeaders && hasRequestBody) {
			requestStartMessage += " (" + requestBody.contentLength() + "-byte body)";
		}
		logger.log(requestStartMessage);

		if (logHeaders) {
			if (hasRequestBody) {
				// Request body headers are only present when installed as a network interceptor. Force
				// them to be included (when available) so there values are known.
				if (requestBody.contentType() != null) {
					logger.log("Content-Type: " + requestBody.contentType());
				}
				if (requestBody.contentLength() != -1) {
					logger.log("Content-Length: " + requestBody.contentLength());
				}
			}

			Headers headers = request.headers();
			for (int i = 0, count = headers.size(); i < count; i++) {
				String name = headers.name(i);
				// Skip headers from the request body as they are explicitly logged above.
				if (!"Content-Type".equalsIgnoreCase(name) && !"Content-Length".equalsIgnoreCase(name)) {
					logger.log(name + ": " + headers.value(i));
				}
			}

			if (!logBody || !hasRequestBody) {
				logger.log("--> END " + request.method());
			} else if (bodyHasUnknownEncoding(request.headers())) {
				logger.log("--> END " + request.method() + " (encoded body omitted)");
			} else {
				Buffer buffer = new Buffer();
				requestBody.writeTo(buffer);

				Charset charset = UTF8;
				MediaType contentType = requestBody.contentType();
				if (contentType != null) {
					charset = contentType.charset(UTF8);
				}

				logger.log("");
				if (isPlaintext(buffer)) {
					logger.log(buffer.readString(charset));
					logger.log("--> END " + request.method()
							+ " (" + requestBody.contentLength() + "-byte body)");
				} else {
					logger.log("--> END " + request.method() + " (binary "
							+ requestBody.contentLength() + "-byte body omitted)");
				}
			}
		}

		long startNs = System.nanoTime();
		Response response;
		try {
			response = chain.proceed(request);
		} catch (Exception e) {
			logger.log("<-- HTTP FAILED: " + e);
			throw e;
		}
		long tookMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNs);

		ResponseBody responseBody = response.body();
		long contentLength = responseBody.contentLength();
		String bodySize = contentLength != -1 ? contentLength + "-byte" : "unknown-length";
		logger.log("<-- "
				+ response.code()
				+ (response.message().isEmpty() ? "" : ' ' + response.message())
				+ ' ' + response.request().url()
				+ " (" + tookMs + "ms" + (!logHeaders ? ", " + bodySize + " body" : "") + ')');

		if (logHeaders) {
			Headers headers = response.headers();
			int count = headers.size();
			for (int i = 0; i < count; i++) {
				logger.log(headers.name(i) + ": " + headers.value(i));
			}

			if (!logBody || !HttpHeaders.hasBody(response)) {
				logger.log("<-- END HTTP");
			} else if (bodyHasUnknownEncoding(response.headers())) {
				logger.log("<-- END HTTP (encoded body omitted)");
			} else {
				BufferedSource source = responseBody.source();
				// Buffer the entire body.
				source.request(Long.MAX_VALUE);
				Buffer buffer = source.buffer();

				Long gzippedLength = null;
				if ("gzip".equalsIgnoreCase(headers.get("Content-Encoding"))) {
					gzippedLength = buffer.size();
					GzipSource gzippedResponseBody = null;
					try {
						gzippedResponseBody = new GzipSource(buffer.clone());
						buffer = new Buffer();
						buffer.writeAll(gzippedResponseBody);
					} finally {
						if (gzippedResponseBody != null) {
							gzippedResponseBody.close();
						}
					}
				}

				Charset charset = UTF8;
				MediaType contentType = responseBody.contentType();
				if (contentType != null) {
					charset = contentType.charset(UTF8);
				}

				if (!isPlaintext(buffer)) {
					logger.log("");
					logger.log("<-- END HTTP (binary " + buffer.size() + "-byte body omitted)");
					return response;
				}

				if (contentLength != 0) {
					logger.log("");
					logger.log(buffer.clone().readString(charset));
				}

				if (gzippedLength != null) {
					logger.log("<-- END HTTP (" + buffer.size() + "-byte, "
							+ gzippedLength + "-gzipped-byte body)");
				} else {
					logger.log("<-- END HTTP (" + buffer.size() + "-byte body)");
				}
			}
		}

		return response;
	}

	/**
	 * Returns true if the body in question probably contains human readable text. Uses a small sample
	 * of code points to detect unicode control characters commonly used in binary file signatures.
	 */
	private static boolean isPlaintext(Buffer buffer) {
		try {
			Buffer prefix = new Buffer();
			long byteCount = buffer.size() < 64 ? buffer.size() : 64;
			buffer.copyTo(prefix, 0, byteCount);
			for (int i = 0; i < 16; i++) {
				if (prefix.exhausted()) {
					break;
				}
				int codePoint = prefix.readUtf8CodePoint();
				if (Character.isISOControl(codePoint) && !Character.isWhitespace(codePoint)) {
					return false;
				}
			}
			return true;
		} catch (EOFException e) {
			// Truncated UTF-8 sequence.
			return false;
		}
	}

	private boolean bodyHasUnknownEncoding(Headers headers) {
		String contentEncoding = headers.get("Content-Encoding");
		return contentEncoding != null
				&& !"identity".equalsIgnoreCase(contentEncoding)
				&& !"gzip".equalsIgnoreCase(contentEncoding);
	}
}
```

OkHttpLogLevelEnum.java：

```java
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * OkHttp 请求日志级别
 *
 * @author Leo
 * @date 2020.02.28
 */
@Getter
@AllArgsConstructor
public enum OkHttpLogLevelEnum {
	/**
	 * No logs.
	 */
	NONE(0),

	/**
	 * Logs request and response lines.
	 *
	 * <p>Example:
	 * <pre>{@code
	 * --> POST /greeting http/1.1 (3-byte body)
	 *
	 * <-- 200 OK (22ms, 6-byte body)
	 * }</pre>
	 */
	BASIC(1),

	/**
	 * Logs request and response lines and their respective headers.
	 *
	 * <p>Example:
	 * <pre>{@code
	 * --> POST /greeting http/1.1
	 * Host: example.com
	 * Content-Type: plain/text
	 * Content-Length: 3
	 * --> END POST
	 *
	 * <-- 200 OK (22ms)
	 * Content-Type: plain/text
	 * Content-Length: 6
	 * <-- END HTTP
	 * }</pre>
	 */
	HEADERS(2),

	/**
	 * Logs request and response lines and their respective headers and bodies (if present).
	 *
	 * <p>Example:
	 * <pre>{@code
	 * --> POST /greeting http/1.1
	 * Host: example.com
	 * Content-Type: plain/text
	 * Content-Length: 3
	 *
	 * Hi?
	 * --> END POST
	 *
	 * <-- 200 OK (22ms)
	 * Content-Type: plain/text
	 * Content-Length: 6
	 *
	 * Hello!
	 * <-- END HTTP
	 * }</pre>
	 */
	BODY(3);

	/**
	 * 请求日志配置前缀
	 */
	public static final String REQ_LOG_PROPS_PREFIX = "okhttp.log.request";

	/**
	 * 控制台日志是否启用
	 */
	public static final String CONSOLE_LOG_ENABLED_PROP = "okhttp.log.console.enabled";

	/**
	 * 级别
	 */
	private int level;

	/**
	 * 当前版本 小于和等于 比较的版本
	 *
	 * @param level LogLevel
	 * @return 是否小于和等于
	 */
	public boolean lte(OkHttpLogLevelEnum level) {
		return this.level <= level.level;
	}
}
```

OkHttpSlf4jLogger.java：

```java
import com.leo.common.interceptor.OkHttpLogInterceptor;
import lombok.extern.slf4j.Slf4j;

/**
 * OkHttp Slf4j logger
 *
 * @author Leo
 * @date 2020.02.28
 */
@Slf4j
public class OkHttpSlf4jLogger implements OkHttpLogInterceptor.Logger {
	@Override
	public void log(String message) {
		log.info(message);
	}
}
```

DisableValidationTrustManager.java：

```java
import javax.net.ssl.X509TrustManager;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;

/**
 * 不进行证书校验
 *
 * @author Leo
 * @date 2020.02.28
 */
public class DisableValidationTrustManager implements X509TrustManager {

	public static final X509TrustManager INSTANCE = new DisableValidationTrustManager();

	@Override
	public void checkClientTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException {
	}

	@Override
	public void checkServerTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException {
	}

	@Override
	public X509Certificate[] getAcceptedIssuers() {
		return new X509Certificate[0];
	}
}
```

TrustAllHostNames.java：

```java
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLSession;

/**
 * 信任所有 host name
 *
 * @author Leo
 * @date 2020.02.28
 */
public class TrustAllHostNames implements HostnameVerifier {
	public static final TrustAllHostNames INSTANCE = new TrustAllHostNames();

	@Override
	public boolean verify(String s, SSLSession sslSession) {
		return true;
	}
}
```

Holder.java：

```java
import java.security.SecureRandom;
import java.util.Random;

/**
 * 一些常用的单例对象
 *
 * @author Leo
 * @date 2020.02.28
 */
public class Holder {

	/**
	 * RANDOM
	 */
	public final static Random RANDOM = new Random();

	/**
	 * SECURE_RANDOM
	 */
	public final static SecureRandom SECURE_RANDOM = new SecureRandom();
}
```

### 支持以form表单形式提交数据（application/x-www-form-urlencoded）

```java
import feign.Logger;
import feign.codec.Encoder;
import feign.form.FormEncoder;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.http.HttpMessageConverters;
import org.springframework.cloud.openfeign.FeignLoggerFactory;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.cloud.openfeign.support.SpringEncoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.web.bind.annotation.PostMapping;

@FeignClient(name = "service-a", configuration = TestFeignClient.FormSupportConfig.class)
public interface TestFeignClient {

	@PostMapping(value = "/test",
			consumes = {MediaType.APPLICATION_FORM_URLENCODED_VALUE},
			produces = {MediaType.APPLICATION_JSON_UTF8_VALUE}
	)
	void post(Map<String, ?> queryParam);

	class FormSupportConfig {
		@Autowired
		private ObjectFactory<HttpMessageConverters> messageConverters;

		@Bean
		Logger.Level feignLevel() {
			return Logger.Level.FULL;
		}

	//	@Bean
	//	FeignLoggerFactory infoFeignLoggerFactory() {
	//		return new InfoFeignLoggerFactory();
	//	}

		/**
		* new一个form编码器，实现支持form表单提交
		* 注意这里方法名称，也就是bean的名称是什么不重要，
		* 重要的是返回类型要是 Encoder 并且实现类必须是 FormEncoder 或者其子类
		*/
		@Bean
		@Scope("prototype")
		public Encoder feignFormEncoder() {
			return new FormEncoder(new SpringEncoder(this.messageConverters));
		}
	}
}
```

## 问题

### 与 Spring Cloud Gateway 整合问题

```log
feign.codec.DecodeException: No qualifying bean of type 'org.springframework.boot.autoconfigure.http.HttpMessageConverters' available: expected at least 1 bean which qualifies as autowire candidate. Dependency annotations: {@org.springframework.beans.factory.annotation.Autowired(required=true)}
```

解决：

```java
@Configuration
public class FeignResponseDecoderConfig {
    @Bean
    public Decoder feignDecoder() {

        ObjectFactory<HttpMessageConverters> messageConverters = () -> {
            HttpMessageConverters converters = new HttpMessageConverters();
            return converters;
        };
        return new SpringDecoder(messageConverters);
    }
}
```

> https://github.com/spring-cloud/spring-cloud-openfeign/issues/235

### @RequestParam 无法获取参数

Client 接口中用 @RequestParam 是无法绑定参数的，必须写 name，@RequestParam("paramName")。@RequestBody 可以正常获取。

### 启用 hystrix 后 RequestContextHolder.getRequestAttributes(); 返回 null

hystrix 默认使用多线程管理请求连接池，从主线程到发送基于hystrix的feign请求线程已不在同一个线程内，而RequestContextHolder是基于ThreadLocal实现的，这就使得线程之间数据断链，需要通过线程之间的数据传递使得ThreadLocal中存储的currentRequestAttributes接上。

**解决方案一：调整隔离策略**

将隔离策略设为SEMAPHORE即可：

```yaml
hystrix.command.default.execution.isolation.strategy: SEMAPHORE
```

这样配置后，Feign可以正常工作。但该方案不是特别好。原因是Hystrix官方强烈建议使用THREAD作为隔离策略！
>Thread or Semaphore
>
>The default, and the recommended setting, is to run HystrixCommands using thread isolation (THREAD) and HystrixObservableCommands using semaphore isolation (SEMAPHORE).
>
>Commands executed in threads have an extra layer of protection against latencies beyond what network timeouts can offer.
>
>Generally the only time you should use semaphore isolation for HystrixCommands is when the call is so high volume (hundreds per second, per instance) that the overhead of separate threads is too high; this typically only applies to non-network calls.

**解决方案二：自定义并发策略**

既然Hystrix不太建议使用SEMAPHORE作为隔离策略，那么是否有其他方案呢？答案是自定义并发策略，目前，Spring Cloud Sleuth以及Spring Security都通过该方式传递 ThreadLocal 对象。

下面我们来编写自定义的并发策略。

```java
@Component
public class RequestAttributeHystrixConcurrencyStrategy extends HystrixConcurrencyStrategy {
    private static final Log log = LogFactory.getLog(RequestHystrixConcurrencyStrategy.class);

    public RequestHystrixConcurrencyStrategy() {
        HystrixPlugins.reset();
        HystrixPlugins.getInstance().registerConcurrencyStrategy(this);
    }

    @Override
    public <T> Callable<T> wrapCallable(Callable<T> callable) {
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        return new WrappedCallable<>(callable, requestAttributes);
    }

    static class WrappedCallable<T> implements Callable<T> {

        private final Callable<T> target;
        private final RequestAttributes requestAttributes;

        public WrappedCallable(Callable<T> target, RequestAttributes requestAttributes) {
            this.target = target;
            this.requestAttributes = requestAttributes;
        }

        @Override
        public T call() throws Exception {
            try {
                RequestContextHolder.setRequestAttributes(requestAttributes);
                return target.call();
            } finally {
                RequestContextHolder.resetRequestAttributes();
            }
        }
    }
}
```

如代码所示，我们编写了一个RequestHystrixConcurrencyStrategy ，在其中：
- wrapCallable 方法拿到 `RequestContextHolder.getRequestAttributes()` ，也就是我们想传播的对象；
- 在 WrappedCallable 类中，我们将要传播的对象作为成员变量，并在其中的call方法中，为静态方法设值。
- 这样，在Hystrix包裹的方法中，就可以使用`RequestContextHolder.getRequestAttributes()` 获取到相关属性——也就是说，可以拿到RequestContextHolder 中的ThreadLocal 属性。

经过测试，代码能正常工作。

**新的问题**

至此，我们已经实现了ThreadLocal 属性的传递，然而Hystrix只允许有一个并发策略！这意味着——如果不做任何处理，Sleuth、Spring Security将无法正常拿到上下文！（上文说过，目前Sleuth、Spring Security都是通过自定义并发策略的方式来传递ThreadLocal对象的。）

如何解决这个问题呢？

我们知道，Spring Cloud中，Spring Cloud Security与Spring Cloud Sleuth是可以共存的！我们不妨参考下Sleuth以及Spring Security的实现：

- Sleuth:`org.springframework.cloud.sleuth.instrument.hystrix.SleuthHystrixConcurrencyStrategy`
- SpringSecurity:`org.springframework.cloud.netflix.hystrix.security.SecurityContextConcurrencyStrategy`

阅读完后，你将恍然大悟——于是，我们可以模仿它们的写法，改写上文编写的并发策略：

```java
import com.netflix.hystrix.HystrixThreadPoolKey;
import com.netflix.hystrix.HystrixThreadPoolProperties;
import com.netflix.hystrix.strategy.HystrixPlugins;
import com.netflix.hystrix.strategy.concurrency.HystrixConcurrencyStrategy;
import com.netflix.hystrix.strategy.concurrency.HystrixRequestVariable;
import com.netflix.hystrix.strategy.concurrency.HystrixRequestVariableLifecycle;
import com.netflix.hystrix.strategy.eventnotifier.HystrixEventNotifier;
import com.netflix.hystrix.strategy.executionhook.HystrixCommandExecutionHook;
import com.netflix.hystrix.strategy.metrics.HystrixMetricsPublisher;
import com.netflix.hystrix.strategy.properties.HystrixPropertiesStrategy;
import com.netflix.hystrix.strategy.properties.HystrixProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 自定义隔离策略 解决RequestContextHolder.getRequestAttributes()问题 为null
 **/
@Component
@Primary
@Slf4j
public class CustomFeignHystrixConcurrencyStrategy extends HystrixConcurrencyStrategy {

	private HystrixConcurrencyStrategy hystrixConcurrencyStrategy;

	public CustomFeignHystrixConcurrencyStrategy() {
		try {
			this.hystrixConcurrencyStrategy = HystrixPlugins.getInstance().getConcurrencyStrategy();
			if (this.hystrixConcurrencyStrategy instanceof CustomFeignHystrixConcurrencyStrategy) {
				// Welcome to singleton hell...
				return;
			}
			HystrixCommandExecutionHook commandExecutionHook =
					HystrixPlugins.getInstance().getCommandExecutionHook();
			HystrixEventNotifier eventNotifier = HystrixPlugins.getInstance().getEventNotifier();
			HystrixMetricsPublisher metricsPublisher = HystrixPlugins.getInstance().getMetricsPublisher();
			HystrixPropertiesStrategy propertiesStrategy =
					HystrixPlugins.getInstance().getPropertiesStrategy();
			this.logCurrentStateOfHystrixPlugins(eventNotifier, metricsPublisher, propertiesStrategy);
			HystrixPlugins.reset();
			HystrixPlugins.getInstance().registerConcurrencyStrategy(this);
			HystrixPlugins.getInstance().registerCommandExecutionHook(commandExecutionHook);
			HystrixPlugins.getInstance().registerEventNotifier(eventNotifier);
			HystrixPlugins.getInstance().registerMetricsPublisher(metricsPublisher);
			HystrixPlugins.getInstance().registerPropertiesStrategy(propertiesStrategy);
		} catch (Exception e) {
			log.error("Failed to register Sleuth Hystrix Concurrency Strategy", e);
		}
	}

	private void logCurrentStateOfHystrixPlugins(HystrixEventNotifier eventNotifier,
												 HystrixMetricsPublisher metricsPublisher, HystrixPropertiesStrategy propertiesStrategy) {
		if (log.isDebugEnabled()) {
			log.debug("Current Hystrix plugins configuration is [" + "concurrencyStrategy ["
					+ this.hystrixConcurrencyStrategy + "]," + "eventNotifier [" + eventNotifier + "]," + "metricPublisher ["
					+ metricsPublisher + "]," + "propertiesStrategy [" + propertiesStrategy + "]," + "]");
			log.debug("Registering Sleuth Hystrix Concurrency Strategy.");
		}
	}

	@Override
	public <T> Callable<T> wrapCallable(Callable<T> callable) {
		RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
		return new WrappedCallable<>(callable, requestAttributes);
	}

	@Override
	public ThreadPoolExecutor getThreadPool(HystrixThreadPoolKey threadPoolKey,
											HystrixProperty<Integer> corePoolSize, HystrixProperty<Integer> maximumPoolSize,
											HystrixProperty<Integer> keepAliveTime, TimeUnit unit, BlockingQueue<Runnable> workQueue) {
		return this.hystrixConcurrencyStrategy.getThreadPool(threadPoolKey, corePoolSize, maximumPoolSize, keepAliveTime,
				unit, workQueue);
	}

	@Override
	public ThreadPoolExecutor getThreadPool(HystrixThreadPoolKey threadPoolKey,
											HystrixThreadPoolProperties threadPoolProperties) {
		return this.hystrixConcurrencyStrategy.getThreadPool(threadPoolKey, threadPoolProperties);
	}

	@Override
	public BlockingQueue<Runnable> getBlockingQueue(int maxQueueSize) {
		return this.hystrixConcurrencyStrategy.getBlockingQueue(maxQueueSize);
	}

	@Override
	public <T> HystrixRequestVariable<T> getRequestVariable(HystrixRequestVariableLifecycle<T> rv) {
		return this.hystrixConcurrencyStrategy.getRequestVariable(rv);
	}

	static class WrappedCallable<T> implements Callable<T> {
		private final Callable<T> target;
		private final RequestAttributes requestAttributes;

		public WrappedCallable(Callable<T> target, RequestAttributes requestAttributes) {
			this.target = target;
			this.requestAttributes = requestAttributes;
		}

		@Override
		public T call() throws Exception {
			try {
				RequestContextHolder.setRequestAttributes(requestAttributes);
				return target.call();
			} finally {
				RequestContextHolder.resetRequestAttributes();
			}
		}
	}
}
```

简单讲解下：

- 将现有的并发策略作为新并发策略的成员变量
- 在新并发策略中，返回现有并发策略的线程池、Queue。

hystrix 配置：

```yaml
# hystrix配置
hystrix:
  shareSecurityContext: true
  command:
    default:
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 60000
```

## 参考

- https://github.com/OpenFeign/feign/
- https://cloud.spring.io/spring-cloud-openfeign/reference/html/
- https://juejin.im/post/5d9c85c3e51d45782c23fab6/
- http://www.itmuch.com/spring-cloud-sum/hystrix-threadlocal/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/spring-cloud-open-feign/1.jpg
[2]: /images/java/spring-cloud-open-feign/2.jpg
