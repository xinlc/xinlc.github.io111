---
title: Spring Cloud Hystrix
date: 2020-02-19 19:00:00
categories: Java
tags:
  - SpringCloud
---

在微服务架构中，服务与服务之间通过远程调用的方式进行通信，一旦某个被调用的服务发生了故障，其依赖服务也会发生故障，此时就会发生故障的蔓延，最终导致系统瘫痪。Hystrix 实现了断路器模式，当某个服务发生故障时，通过断路器的监控，给调用方返回一个错误响应，而不是长时间的等待，这样就不会使得调用方由于长时间得不到响应而占用线程，从而防止故障的蔓延。Hystrix 具备服务降级、服务熔断、线程隔离、请求缓存、请求合并及服务监控等强大功能。

<!--more-->

## 为什么需要服务容错保护？

先来思考一个问题，假定一个单块服务的可用性是99.99%，如果我们有大概30个微服务，每个的可用性都是99.99%，那么总体可用性是多少呢？

答案：它的总体可用性99.7% uptime！相当于每月2小时宕机时间，实际情况往往更糟糕。计算公式是 0.9999^30。

复杂分布式系统通常有很多依赖，如果一个应用不能对来自依赖故障进行隔离，那么应用本身就处在被拖垮的风险中。在一个高流量的网站中，某个单一后端一旦发生延迟，将会在数秒内导致所有应用资源被耗尽，严重情况会造成雪崩效应。很多情况是一个不起眼的小服务造成的。

服务依赖：

在微服务中，从前端发来的一个请求，这个请求我们一般叫它扇出（Fan-Out）。一个请求会依赖很多服务，如下图一个请求依赖的A、H、I、P四个服务（一般在中大型互联网公司一个请求会扇出平均6到8个微服务请求）。

![1][1]

单个服务延迟：

平常情况下每个服务都健康是 OK 的，问题就出在单个服务，某个捣蛋鬼比如服务 I 出现了延迟，刚开始延迟问还不大，到后来越来越严重。

![2][2]

高峰期致雪崩效应：

当 I 服务延迟越来越严重，这个时候就会出现所谓的高峰期。当流量很大的时候，然后某个服务出现延迟的时候它会堵住，所有的请求都 Hold 住在依赖 I 服务身上，如果说这个服务索性出错了或者挂了之间返回到还好，它的问题是它不挂它就是延迟很慢，延迟5秒甚至10秒更长的时间就会把所有的请求都 Hold 住在这里。严重的时候（高流量的时候）这个系统都不响应，客户体验非常糟糕。

![3][3]

## 容错限流原理

### 基本的容错模式

经过多年的业界实践，其实在容错相关的领域里面已经摸索出了一些常用的模式：

![4][4]

- 超时：最简单的，调用依赖的时候设好超时数，比如5秒，2秒，出问题主动超时；
- 限流：比如十一长假高速要限流，因为车子太多了，只能让这么多车通过；
- 熔断：当错误数达到阈值时，类似像保险丝一样熔断。分布系统中要有熔断的措施，在流量很大的时候暂时系统熔断拒绝后面的请求，来保护整个微服务后端系统；
- 隔离：凡是分布式系统的资源都是有限制的，如果你不隔离的话因为一个服务延迟，它会把所有的资源都给耗尽；
- 降级：比如双十一，外面流量冲进来很多，系统是承载不了的，这个时候要做一些降级，可能这个请求只能满足 VIP 用户，一般普通用户可能暂时要降级，先拒绝掉或者把他们导到一个临时页面去，来保护后台的系统；

### 断路器模式

断路器模式（Circuit Breaker），这个模式是从一个本书《Release It!》提出来的。就像家里的电路保护器，那你烧大功率的时候，它就会熔断掉保护家里。

断路器的原理其实就是一个状态机，刚开始系统处于绿色（Closed 状态）每次请求过来都是成功，当你后台出了问题它就会 Trip Breaker 触发断路，这个电路就会断开（Open 状态），打开状态的时候所有的请求进来都会被拒绝掉，直接 Falling Fast 直接弹回去，因为这个路不通。

但是断路器是有个弹性的，不是说一直打开了以后请永远进不来了，它会在一段时间以后会尝试进入一种叫办开闭状态（Half-Open）会允许一小部分流量进去试，如果说试了还有问题会继续回到 Open 状态，如果说有少量流量通过了，没问题了系统又好了就会 Reset Breaker 回到关闭状态。

![5][5]

### 舱壁隔离模式

舱壁隔离模式（Bulkhead）就是隔离的一种模式，跟船一样，每个船舱都是由隔板（钢板）隔开的。当一个两个船舱被损坏它进水了，不会影响其他船舱这个船还是可以行驶的（泰坦尼克号后来沉船了它也是有隔离的但是它的船舱损坏了太多）。对资源进行失败单元隔离，把单元变小，部分单元出问题不会影响这个系统。

![6][6]

### 容错理念

- 凡是依赖都可能会失败；
- 凡是资源都有限制：
  - CPU/Memory/Threads/Queue
- 网络并不可靠；
- 延迟是应用稳定性杀手；
- 弹性（Resilience）理念：
  - 在被弯曲，压缩或者拉伸之后，能够恢复原状的能力；
  - 从疾病，抑郁和困境等类似情况中恢复出来的能力；
  - 系统要有弹性，出了问题要能自我保护；

## Hystrix 简介

Hystrix 源于 Netflix API 团队在 2011 年启动的弹性工程项目，2013 它在 Netflix 每天处理数百亿的线程隔离以及数千亿的信号量隔离调用 [netflix-hystrix-fault-tolerance](http://www.infoq.com/cn/news/2013/01/netflix-hystrix-fault-tolerance/)。

Hystrix 是基于 Apache License 2.0 协议的开源库，目前托管在 [github上](https://github.com/Netflix/Hystrix/)。

Netflix 云端开源工具 Hystrix 曾助奥巴马[竞选](http://it.sohu.com/20121129/n358943361.shtml)。

这里有个段子，在竞选的时候奥巴马的系统比较稳定，他的竞争对手的系统就不是很稳定…… 当然这只是个段子。

![7][7]

Hystrix 主要作者 [Ben Christensen](https://www.linkedin.com/in/benjchristensen)，他也是大名鼎鼎 [RxJava](https://github.com/ReactiveX/RxJava) 响应式 Java 库的作者。Ben 的这两个作品都很牛X，他做事情非常专注，给我一个启示，作为工程师也好架构师也好，在一个公司里面做事情还是需要专注（专注出精品啊），不需要做特别多的东西。

## Hystrix 设计原理

Hystrix 工作流程(自适应反馈机)，下面这个图是老版本：

![8][8]

1. 依赖的调用用了 Hystrix 以后 会被封装到 Hystrix Command 的类里面。
2. 然后就会执行，执行分两种同步和异步（放到队列中），最新版本还执行响应式执行。
3. 然后判断电路是否打开，如果是打开状态就是短路了 走 8。
4. 如果用了线程隔离，线程也是一个线程池（前面也有可能是队列），线程有可能满队列也有可能满，如果满了走 8。
5. 运行环节，远程调用或者被封装的调用就可以执行了，执行的过程中有可能超时，如果超时了 5a -> 8。
6. 没有超时，看执行情况，失败了走 6b，成功了 6a 会报告 Metrics 7。
7. 就是会把执行的情况做个记录。在这里会进行统计，判断下一次请求是否要关闭或打开电路。
8. 判断是否指定了降级函数。8a 没有指定直接返回，有降级函数 8b 成功执行降级，降级函数也有可能出错，走 8c 降级失败。

新版本支持响应式处理：

![9][9]

## 断路器内核原理

![10][10]

当 Hystrix Command 进来的时候，首先判断允不允许这次请求通过，通过 isOpen 判断电路是不是打开，如果是闭合的就可以通过，如果电路是打开的，它会判断有没有过一个睡眠周期（时间窗口）。如果睡眠周期没过就不允许通过，如果睡眠周期过了，会放一个请求进来试，如果试成功了电路关闭，否则继续打开。主要通过 isOpen 判断，失败数/(成功数+失败数)，看这个百分比是否大于阈值。

断路器内核，内部主要是基于滚动式统计这种方式的，它每一秒钟会生产一个桶，内存当中就是一个数据结构，每个桶里面会记录这些相关的 Metrics 成功、失败、超时的拒绝等。一秒钟产生一个桶，默认是十秒钟窗口期，那么就有十个桶。每过一秒这个桶就会往后推，会产生一个新的桶最老的那个桶机会丢弃。isOpen 就是根据这些数据基于十秒钟的这十个桶进行计算的。

## Hystrix 主要概念

### Hystrix Command

![11][11]

Hystrix Command 其实是 Hystrix 组件提供的一个基类，它实现了一个命令模式。要封装调用的话就继承 Hystrix Command 实现里面的 Run 方法，把逻辑放到 Run 方法即可，这个逻辑就实现了容错限流的保护。

### Fail Fast

![12][12]

快速失败，跟 Hystrix 降级相关。所谓的快速失败，直接在 run 方法里抛出异常，这个是最直接的。大部分场景我们并不一点要搞很复杂的 Fallback，我们就直接抛一个异常。

### Fail Silent

![13][13]

安静失败，其实就是 run 的时候有个降级函数，这个降级函数里面会返回一个 null 或者是空列表之类的。

### Static Fallback

![14][14]

静态的降级函数，这个函数里面返回一个缺省值。缺省值是 true 或者是一个对象。

### Fallback via Network

![15][15]

通过网络进行降级，在调用一个主服务的时候，在 run 的时候主服务出错了，那降级函数里面我就去调用一个辅助的服务。这个辅助的服务也是要通过网络的，可能是一个缓存或者什么。这个降级函数呢也要封装在一个 Hystrix Command 里面。

### Primary + Secondary with Fallback

![16][16]

主次 Fallback，这个用的比较少。有这样一个场景，可能上线一个新功能，老功能比如叫 Primary，那有一个新功能来了，我担心这个新功能可能会有点问题。这个新功能在 Secondary 开关后面。上线的时候走的是老功能，我要尝试新功能是否 OK，把开关打开切换到到 Secondary。

### 请求合并

![17][17]

这个功能用的也比较少，有这样一个场景，有非常高频的请求，对后台某些服务压力非常大。比如说 Netflix 网站流量非常大。很多小的请求过来的时候，它会做一个 Batch 合并，它会启动一个时钟，有一个时间窗口比如说 10毫秒，这期间发生的请求都会 Batch 起来。它并不一个个的发向后台服务，而是会放到队列里面，进行 Batch 打包一起发到后台服务。响应回来时在进行拆解返回调用端。这样可以减少对后端的压力，把大量的小请求合成一个 10ms 一个窗口。

### 请求缓存

![18][18]

这个用的也不是特别多，其实就是缓存，它会把请求以某一个 key 缓存到 ThreadLocal 中，如何后面的请求 key 相同就不请求后端的服务了，直接走缓存直接返回。

### 线程和信号量隔离

![19][19]

线程隔离：当客户端请求过来的时候，去调用依赖服务，如果依赖两个服务会为每个依赖的服务单独去创建一个线程池进行隔离。每次调用发生在对应的线程里面，线程池可以知道线程数，如果线程池用光了后面的请求就会拒绝。

信号量（Semaphore）隔离：简单理解就是一个计数器，如果说信号量是 10 个信号量，那么计数器就设置成 10，每个请求进来计数器就减 1，如果说 10 个都减完了后面的请求就不能再进来了。当然某个请求结束信号量会还回来，计数器进行加 1。

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR1

## 创建一个 hystrix-service 模块

hystrix-service 模块来演示 Hystrix 的常用功能，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-hystrix</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

在 application.yml 进行配置：

```yaml
server:
  port: 8401
spring:
  application:
    name: hystrix-service
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
service-url:
  user-service: http://user-service
```

在启动类上添加 @EnableCircuitBreaker 来开启 Hystrix 的断路器功能：

```java
@EnableCircuitBreaker
@EnableDiscoveryClient
@SpringBootApplication
public class HystrixServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(HystrixServiceApplication.class, args);
    }
}
```

创建 UserHystrixController 接口用于调用 user-service 服务：

在 UserHystrixController 中添加用于测试服务降级的接口：

```java
@GetMapping("/testFallback/{id}")
public CommonResult testFallback(@PathVariable Long id) {
    return userService.getUser(id);
}
```

在 UserService 中添加调用方法与服务降级方法，方法上需要添加 @HystrixCommand 注解：

```java
@HystrixCommand(fallbackMethod = "getDefaultUser")
public CommonResult getUser(Long id) {
    return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
}

public CommonResult getDefaultUser(@PathVariable Long id) {
    User defaultUser = new User(-1L, "defaultUser", "123456");
    return new CommonResult<>(defaultUser);
}
```

启动 eureka-server、user-service、hystrix-service 服务；

调用接口进行测试：http://localhost:8401/user/testFallback/1

关闭 user-service 服务重新测试该接口，发现已经发生了服务降级;

## @HystrixCommand 详解

### @HystrixCommand 中的常用参数

- fallbackMethod：指定服务降级处理方法；
- ignoreExceptions：忽略某些异常，不发生服务降级；
- commandKey：命令名称，用于区分不同的命令；
- groupKey：分组名称，Hystrix 会根据不同的分组来统计命令的告警及仪表盘信息；
- threadPoolKey：线程池名称，用于划分线程池；

### 设置命令、分组及线程池名称

在 UserHystrixController 中添加测试接口：

```java
@GetMapping("/testCommand/{id}")
public CommonResult testCommand(@PathVariable Long id) {
    return userService.getUserCommand(id);
}
```

在 UserService 中添加方式实现功能：

```java
@HystrixCommand(fallbackMethod = "getDefaultUser",
    commandKey = "getUserCommand",
    groupKey = "getUserGroup",
    threadPoolKey = "getUserThreadPool")
public CommonResult getUserCommand(@PathVariable Long id) {
    return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
}
```

### 使用 ignoreExceptions 忽略某些异常降级

在 UserHystrixController 中添加测试接口：

```java
@GetMapping("/testException/{id}")
public CommonResult testException(@PathVariable Long id) {
    return userService.getUserException(id);
}
```

在 UserService 中添加实现方法，这里忽略了 NullPointerException，当 id 为 1 时抛出IndexOutOfBoundsException，id 为 2 时抛出 NullPointerException：

```java
@HystrixCommand(fallbackMethod = "getDefaultUser2", ignoreExceptions = {NullPointerException.class})
public CommonResult getUserException(Long id) {
    if (id == 1) {
        throw new IndexOutOfBoundsException();
    } else if (id == 2) {
        throw new NullPointerException();
    }
    return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
}

public CommonResult getDefaultUser2(@PathVariable Long id, Throwable e) {
    LOGGER.error("getDefaultUser2 id:{},throwable class:{}", id, e.getClass());
    User defaultUser = new User(-2L, "defaultUser2", "123456");
    return new CommonResult<>(defaultUser);
}
```

调用接口进行测试：http://localhost:8401/user/testException/1

## Hystrix 的请求缓存

当系统并发量越来越大时，我们需要使用缓存来优化系统，达到减轻并发请求线程数，提供响应速度的效果。

### 相关注解

- @CacheResult：开启缓存，默认所有参数作为缓存的 key，cacheKeyMethod 可以通过返回 String 类型的方法指定key；
- @CacheKey：指定缓存的 key，可以指定参数或指定参数中的属性值为缓存 key，cacheKeyMethod 还可以通过返回String 类型的方法指定；
- @CacheRemove：移除缓存，需要指定 commandKey。

### 测试使用缓存

在 UserHystrixController 中添加使用缓存的测试接口，直接调用三次 getUserCache 方法：

```java
@GetMapping("/testCache/{id}")
public CommonResult testCache(@PathVariable Long id) {
    userService.getUserCache(id);
    userService.getUserCache(id);
    userService.getUserCache(id);
    return new CommonResult("操作成功", 200);
}
```

在 UserService 中添加具有缓存功能的 getUserCache 方法：

```java
@CacheResult(cacheKeyMethod = "getCacheKey")
@HystrixCommand(fallbackMethod = "getDefaultUser", commandKey = "getUserCache")
    public CommonResult getUserCache(Long id) {
    LOGGER.info("getUserCache id:{}", id);
    return restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
}

/**
 * 为缓存生成key的方法
 */
public String getCacheKey(Long id) {
    return String.valueOf(id);
}
```

调用接口测试 http://localhost:8401/user/testCache/1, 这个接口中调用了三次 getUserCache 方法，但是只打印了一次日志，说明有两次走的是缓存。

### 测试移除缓存

在 UserHystrixController 中添加移除缓存的测试接口，调用一次 removeCache 方法：

```java
@GetMapping("/testRemoveCache/{id}")
public CommonResult testRemoveCache(@PathVariable Long id) {
    userService.getUserCache(id);
    userService.removeCache(id);
    userService.getUserCache(id);
    return new CommonResult("操作成功", 200);
}
```

在 UserService 中添加具有移除缓存功能的 removeCache 方法：

```java
@CacheRemove(commandKey = "getUserCache", cacheKeyMethod = "getCacheKey")
@HystrixCommand
public CommonResult removeCache(Long id) {
    LOGGER.info("removeCache id:{}", id);
    return restTemplate.postForObject(userServiceUrl + "/user/delete/{1}", null, CommonResult.class, id);
}
```

调用接口测试 http://localhost:8401/user/testRemoveCache/1，可以发现有两次查询都走的是接口。

## Hystrix 请求合并

微服务系统中的服务间通信，需要通过远程调用来实现，随着调用次数越来越多，占用线程资源也会越来越多。Hystrix 中提供了 @HystrixCollapser 用于合并请求，从而达到减少通信消耗及线程数量的效果。

### @HystrixCollapser 的常用属性

- batchMethod：用于设置请求合并的方法；
- collapserProperties：请求合并属性，用于控制实例属性，有很多；
- timerDelayInMilliseconds：collapserProperties 中的属性，用于控制每隔多少时间合并一次请求；

### 功能演示

在 UserHystrixController 中添加 testCollapser 方法，这里我们先进行两次服务调用，再间隔 200ms 以后进行第三次服务调用：

```java
@GetMapping("/testCollapser")
public CommonResult testCollapser() throws ExecutionException, InterruptedException {
    Future<User> future1 = userService.getUserFuture(1L);
    Future<User> future2 = userService.getUserFuture(2L);
    future1.get();
    future2.get();
    ThreadUtil.safeSleep(200);
    Future<User> future3 = userService.getUserFuture(3L);
    future3.get();
    return new CommonResult("操作成功", 200);
}
```

使用 @HystrixCollapser 实现请求合并，所有对 getUserFuture 的的多次调用都会转化为对 getUserByIds 的单次调用：

```java
@HystrixCollapser(batchMethod = "getUserByIds",collapserProperties = {
    @HystrixProperty(name = "timerDelayInMilliseconds", value = "100")
})
public Future<User> getUserFuture(Long id) {
    return new AsyncResult<User>(){
    @Override
    public User invoke() {
        CommonResult commonResult = restTemplate.getForObject(userServiceUrl + "/user/{1}", CommonResult.class, id);
        Map data = (Map) commonResult.getData();
        User user = BeanUtil.mapToBean(data,User.class,true);
        LOGGER.info("getUserById username:{}", user.getUsername());
        return user;
        }
    };
}

@HystrixCommand
public List<User> getUserByIds(List<Long> ids) {
    LOGGER.info("getUserByIds:{}", ids);
    CommonResult commonResult = restTemplate.getForObject(userServiceUrl + "/user/getUserByIds?ids={1}", CommonResult.class, CollUtil.join(ids,","));
    return (List<User>) commonResult.getData();
}
```

访问接口测试 http://localhost:8401/user/testCollapser，由于我们设置了 100 毫秒进行一次请求合并，前两次被合并，最后一次自己单独合并了。

## Hystrix 的常用配置

### 全局配置

```yaml
hystrix:
  command: # 用于控制 HystrixCommand 的行为
    default:
      execution:
        isolation:
          strategy: THREAD # 控制 HystrixCommand 的隔离策略，THREAD->线程池隔离策略(默认)，SEMAPHORE->信号量隔离策略
          thread:
            timeoutInMilliseconds: 1000 # 配置 HystrixCommand 执行的超时时间，执行超过该时间会进行服务降级处理
            interruptOnTimeout: true # 配置 HystrixCommand 执行超时的时候是否要中断
            interruptOnCancel: true # 配置HystrixCommand 执行被取消的时候是否要中断
          timeout:
            enabled: true # 配置 HystrixCommand 的执行是否启用超时时间
          semaphore:
            maxConcurrentRequests: 10 # 当使用信号量隔离策略时，用来控制并发量的大小，超过该并发量的请求会被拒绝
      fallback:
        enabled: true # 用于控制是否启用服务降级
      circuitBreaker: # 用于控制 HystrixCircuitBreaker 的行为
        enabled: true # 用于控制断路器是否跟踪健康状况以及熔断请求
        requestVolumeThreshold: 20 # 超过该请求数的请求会被拒绝
        forceOpen: false # 强制打开断路器，拒绝所有请求
        forceClosed: false # 强制关闭断路器，接收所有请求
      requestCache:
        enabled: true # 用于控制是否开启请求缓存
  collapser: # 用于控制 HystrixCollapser 的执行行为
    default:
      maxRequestsInBatch: 100 # 控制一次合并请求合并的最大请求数
      timerDelayinMilliseconds: 10 # 控制多少毫秒内的请求会被合并成一个
      requestCache:
        enabled: true # 控制合并请求是否开启缓存
  threadpool: # 用于控制 HystrixCommand 执行所在线程池的行为
    default:
      coreSize: 10 # 线程池的核心线程数
      maximumSize: 10 # 线程池的最大线程数，超过该线程数的请求会被拒绝
      maxQueueSize: -1 # 用于设置线程池的最大队列大小，-1采用 SynchronousQueue，其他正数采用LinkedBlockingQueue
      queueSizeRejectionThreshold: 5 # 用于设置线程池队列的拒绝阀值，由于 LinkedBlockingQueue 不能动态改版大小，使用时需要用该参数来控制线程数
```

### 实例配置

实例配置只需要将全局配置中的 default 换成与之对应的 key 即可：

```yaml
hystrix:
  command:
    HystrixComandKey: # 将 default 换成 HystrixComrnandKey
      execution:
        isolation:
          strategy: THREAD
  collapser:
    HystrixCollapserKey: # 将 default 换成 HystrixCollapserKey
      maxRequestsInBatch: 100
  threadpool:
    HystrixThreadPoolKey: # 将 default 换成 HystrixThreadPoolKey
      coreSize: 10
```

#### 配置文件中相关 key 的说明

- HystrixComandKey 对应 @HystrixCommand 中的 commandKey 属性；
- HystrixCollapserKey 对应 @HystrixCollapser 注解中的 collapserKey 属性；
- HystrixThreadPoolKey 对应 @HystrixCommand 中的 threadPoolKey 属性；

## Hystrix Dashboard

Hystrix 提供了 Hystrix Dashboard 来实时监控 HystrixCommand 方法的执行情况。 Hystrix Dashboard 可以有效地反映出每个 Hystrix 实例的运行情况，帮助我们快速发现系统中的问题，从而采取对应措施。

### Hystrix 单个实例监控

创建一个 hystrix-dashboard 模块，用来监控 hystrix 实例的执行情况，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-hystrix-dashboard</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

在 application.yml 进行配置：

```yaml
server:
  port: 8501
spring:
  application:
    name: hystrix-dashboard
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
```

在启动类上添加 @EnableHystrixDashboard 来启用监控功能：

```java
@EnableHystrixDashboard
@EnableDiscoveryClient
@SpringBootApplication
public class HystrixDashboardApplication {
    public static void main(String[] args) {
        SpringApplication.run(HystrixDashboardApplication.class, args);
    }
}

```

需要启动如下服务：eureka-server、user-service、hystrix-service、hystrix-dashboard。

访问 Hystrix Dashboard：http://localhost:8501/hystrix

填写好信息后点击监控按钮，这里我们需要注意的是，由于我们本地不支持 https，所以我们的地址需要填入的是 http，否则会无法获取监控信息；

还有一点值得注意的是，被监控的 hystrix-service 服务需要开启 Actuator 的 hystrix.stream 端点，配置信息如下：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: 'hystrix.stream' # 暴露 hystrix 监控端点
```

调用几次 hystrix-service 的接口：http://localhost:8401/user/testCommand/1

### Hystrix Dashboard 图表解读

![20][20]

<!-- ![21][21] -->

### Hystrix 集群实例监控

使用 Turbine 来聚合 hystrix-service 服务的监控信息，然后我们的 hystrix-dashboard 服务就可以从 Turbine 获取聚合好的监控信息展示给我们了。

### Turbine 原理

![22][22]

Turbine 主要是用来做集群 Hystrix Stream 聚合，有些数据要汇总比如错误数、平均数等。

### 创建一个 turbine-service 模块

用来聚合 hystrix-service 的监控信息，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-turbine</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

在 application.yml 进行配置，主要是添加了 Turbine 相关配置：

```yaml
server:
  port: 8601
spring:
  application:
    name: turbine-service
eureka:
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://localhost:8001/eureka/
turbine:
  app-config: hystrix-service # 指定需要收集信息的服务名称
  cluster-name-expression: new String('default') # 指定服务所属集群
  combine-host-port: true # 以主机名和端口号来区分服务
```

在启动类上添加 @EnableTurbine 来启用 Turbine 相关功能：

```java
@EnableTurbine
@EnableDiscoveryClient
@SpringBootApplication
public class TurbineServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(TurbineServiceApplication.class, args);
    }
}
```

使用 application-replica1.yml 配置再启动一个 hystrix-service 服务，启动 turbine-service 服务。

访问Hystrix Dashboard：http://localhost:8501/hystrix

添加集群监控地址，需要注意的是我们需要添加的是 turbine-service 的监控端点地址。

调用几次 hystrix-service 的接口：http://localhost:8401/user/testCommand/1 以及 http://localhost:8402/user/testCommand/1

## 最佳实践

- 网关集中埋点，覆盖大部分场景；
- 尽量框架集中埋点，客户端为主；
- 配置对接 Apollo，根据实际使用调整阀值；
- 信号量vs线程池场景：
  - 信号量：网关，缓存；
  - 线程池场景：服务间调用客户端，数据库访问，第三方访问；
- 线程池大小经验值：
  - 30 rps x 0.2 sec = 6 + breathing room = 10 threads；
  - Thread-pool Queue size : 5 ~ 10；
- 部署：
  - Hystrix Dashboard大盘（无线/H5/第三方网关）；
  - 共享Hystrix Dashboard/Turbine服务器；
  - 熔断告警；

## 扩展

### 引入 Hystrix 架构

主要在网关上进入：

![23][23]

### 网关和 Hystrix 参考部署

![24][24]

### Hystrix 和 Turbine 对接 Eureka 架构

![25][25]

一般 Turbine 只部署一个就够。

### 线程隔离案例

![26][26]

> [防雪崩利器：熔断器 Hystrix 的原理与使用](https://segmentfault.com/a/1190000005988895)

### 线程 vs 信号量隔离

| 机制 | 优点 | 不足 | 通用 |
| :-------------- | :----------- |:----------- |:----------- |
| 信号量隔离 | 轻量，无额外开销 | 不支持任务排队和主动超时；不支持异步调用 | 受信客户；高扇出(网关)； 高频高速调用(cache) |
| 线程池隔离 | 支持排队和超时；支持异步调用 | 线程调用会产生额外的开销 | 不受信客户；有限扇出 |

### 断路器机制

![27][27]

### 其它开源容错限流产品

- Alibaba Sentinel（Java）https://github.com/alibaba/Sentinel/
- Resilience4j（Java）https://github.com/resilience4j/resilience4j/
- Failsafe（Java）https://github.com/jhalterman/failsafe/
- Hystrix-go（golang）https://github.com/afex/hystrix-go/
- Polly（C#）https://github.com/App-vNext/Polly/

## 问题

### 缓存使用过程中的问题

在缓存使用过程中，我们需要在每次使用缓存的请求前后对 HystrixRequestContext 进行初始化和关闭，否则会出现如下异常：

```java
java.lang.IllegalStateException: Request caching is not available. Maybe you need to initialize the HystrixRequestContext?
	at com.netflix.hystrix.HystrixRequestCache.get(HystrixRequestCache.java:104) ~[hystrix-core-1.5.18.jar:1.5.18]
	at com.netflix.hystrix.AbstractCommand$7.call(AbstractCommand.java:478) ~[hystrix-core-1.5.18.jar:1.5.18]
	at com.netflix.hystrix.AbstractCommand$7.call(AbstractCommand.java:454) ~[hystrix-core-1.5.18.jar:1.5.18]
```

这里我们通过使用过滤器，在每个请求前后初始化和关闭 HystrixRequestContext 来解决该问题：

```java
@Component
@WebFilter(urlPatterns = "/*",asyncSupported = true)
public class HystrixRequestContextFilter implements Filter {
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HystrixRequestContext context = HystrixRequestContext.initializeContext();
        try {
            filterChain.doFilter(servletRequest, servletResponse);
        } finally {
            context.close();
        }
    }
}
```

## 参考

- https://github.com/Netflix/Hystrix/wiki/
- https://cloud.spring.io/spring-cloud-netflix/reference/html/
- [防雪崩利器：熔断器 Hystrix 的原理与使用](https://segmentfault.com/a/1190000005988895)
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/java/spring-cloud-hystrix/1.jpg
[2]: /images/java/spring-cloud-hystrix/2.jpg
[3]: /images/java/spring-cloud-hystrix/3.jpg
[4]: /images/java/spring-cloud-hystrix/4.jpg
[5]: /images/java/spring-cloud-hystrix/5.jpg
[6]: /images/java/spring-cloud-hystrix/6.jpg
[7]: /images/java/spring-cloud-hystrix/7.jpg
[8]: /images/java/spring-cloud-hystrix/8.jpg
[9]: /images/java/spring-cloud-hystrix/9.png
[10]: /images/java/spring-cloud-hystrix/10.jpg
[11]: /images/java/spring-cloud-hystrix/11.jpg
[12]: /images/java/spring-cloud-hystrix/12.jpg
[13]: /images/java/spring-cloud-hystrix/13.jpg
[14]: /images/java/spring-cloud-hystrix/14.jpg
[15]: /images/java/spring-cloud-hystrix/15.jpg
[16]: /images/java/spring-cloud-hystrix/16.jpg
[17]: /images/java/spring-cloud-hystrix/17.jpg
[18]: /images/java/spring-cloud-hystrix/18.jpg
[19]: /images/java/spring-cloud-hystrix/19.jpg
[20]: /images/java/spring-cloud-hystrix/20.jpg
[21]: /images/java/spring-cloud-hystrix/21.jpg
[22]: /images/java/spring-cloud-hystrix/22.jpg
[23]: /images/java/spring-cloud-hystrix/23.jpg
[24]: /images/java/spring-cloud-hystrix/24.jpg
[25]: /images/java/spring-cloud-hystrix/25.jpg
[26]: /images/java/spring-cloud-hystrix/26.jpg
[27]: /images/java/spring-cloud-hystrix/27.jpg
