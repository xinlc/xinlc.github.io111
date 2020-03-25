---
title: 微服务架构之分布式缓存：Jetcache
date: 2020-03-25 20:48:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
---

缓存，是互联网分层架构中，非常重要的一个部分，通常用它来降低数据库压力，提升系统整体性能，缩短访问时间。缓存作为微服务化设计的一把利剑，解决了高并发、大数据场景下的数据预读能力，大大提高了服务的性能，可以说缓存无处不在。

<!--more-->

## 什么是缓存？

缓存，就是数据交换的缓冲区，针对服务对象的不同（本质就是不同的硬件）都可以构建缓存。

目的是，把读写速度慢的介质的数据保存在读写速度快的介质中，从而提高读写速度，减少时间消耗。 例如：

- CPU 高速缓存 ：高速缓存的读写速度远高于内存。
  - CPU 读数据时，如果在高速缓存中找到所需数据，就不需要读内存
  - CPU 写数据时，先写到高速缓存，再回写到内存。
- 磁盘缓存：磁盘缓存其实就把常用的磁盘数据保存在内存中，内存读写速度也是远高于磁盘的。
  - 读数据时，从内存读取。
  - 写数据时，可先写到内存，定时或定量回写到磁盘，或者是同步回写。

## 为什么需要缓存？

使用缓存的目的，就是提升读写性能。而实际业务场景下，更多的是为了提升读性能，带来更好的性能，更高的并发量。

日常业务中，我们使用比较多的数据库是 MySQL，缓存是 Redis 。Redis 比 MySQL 的读写性能好很多。那么，我们将 MySQL 的热点数据，缓存到 Redis 中，提升读取性能，也减小 MySQL 的读取压力。例如说：

- 论坛帖子的访问频率比较高，且要实时更新阅读量，使用 Redis 记录帖子的阅读量，可以提升性能和并发；
- 商品信息，数据更新的频率不高，但是读取的频率很高，特别是热门商品；

一致性问题是分布式常见的问题，分为最终一致性和强一致性。如果对数据有强一致性要求，不能放缓存，我们只能保证最终一致性。

## 缓存分类

从用户请求数据到数据返回，一般会经过浏览器、CDN、代理服务器、应用服务器以及数据库各个环节。每个环节都可以运用缓存技术。缓存的请求顺序是：用户请求 → HTTP 缓存 → CDN 缓存 → 代理服务器缓存 → 进程内缓存 → 分布式缓存 → 数据库。

### HTTP 缓存

当用户通过浏览器请求服务器的时候，会发起 HTTP 请求，如果对每次 HTTP 请求进行缓存，那么可以减少应用服务器的压力。当第一次请求的时候，浏览器本地缓存库没有缓存数据，会从服务器取数据，并且放到浏览器的缓存库中，下次再进行请求的时候会根据缓存的策略来读取本地或者服务的信息。

一般信息的传递通过 HTTP 请求头 Header 来传递。目前比较常见的缓存方式有两种，分别是：

#### 强制缓存

当浏览器本地缓存库保存了缓存信息，在缓存数据未失效的情况下，可以直接使用缓存数据。否则就需要重新获取数据。

这种缓存机制看上去比较直接，那么如何判断缓存数据是否失效呢？这里需要关注 HTTP Header 中的两个字段 Expires 和 Cache-Control。

Expires 为服务端返回的过期时间，客户端第一次请求服务器，服务器会返回资源的过期时间。如果客户端再次请求服务器，会把请求时间与过期时间做比较。如果请求时间小于过期时间，那么说明缓存没有过期，则可以直接使用本地缓存库的信息。反之，说明数据已经过期，必须从服务器重新获取信息，获取完毕又会更新最新的过期时间。

这种方式在 HTTP 1.0 用的比较多，到了 HTTP 1.1 会使用 Cache-Control 替代。Cache-Control 中有个 max-age 属性，单位是秒，用来表示缓存内容在客户端的过期时间。例如：max-age 是 60 秒，当前缓存没有数据，客户端第一次请求完后，将数据放入本地缓存。那么在 60 秒以内客户端再发送请求，都不会请求应用服务器，而是从本地缓存中直接返回数据。如果两次请求相隔时间超过了 60 秒，那么就需要通过服务器获取数据。

#### 对比缓存

需要对比前后两次的缓存标志来判断是否使用缓存。浏览器第一次请求时，服务器会将缓存标识与数据一起返回，浏览器将二者备份至本地缓存库中。浏览器再次请求时，将备份的缓存标识发送给服务器。

服务器根据缓存标识进行判断，如果判断数据没有发生变化，把判断成功的 304 状态码发给浏览器。这时浏览器就可以使用缓存的数据。服务器返回的就只是 Header，不包含 Body。下面介绍两种标识规则：

1. Last-Modified/If-Modified-Since 规则：

在客户端第一次请求的时候，服务器会返回资源最后的修改时间，记作 Last-Modified。客户端将这个字段连同资源缓存起来。Last-Modified 被保存以后，在下次请求时会以 Last-Modified-Since 字段被发送。当客户端再次请求服务器时，会把 Last-Modified 连同请求的资源一起发给服务器，这时 Last-Modified 会被命名为 If-Modified-Since，存放的内容都是一样的。

服务器收到请求，会把 If-Modified-Since 字段与服务器上保存的 Last-Modified 字段作比较：

- 若服务器上的 Last-Modified 最后修改时间大于请求的 If-Modified-Since，说明资源被改动过，就会把资源（包括 Header+Body）重新返回给浏览器，同时返回状态码 200；
- 若资源的最后修改时间小于或等于 If-Modified-Since，说明资源没有改动过，只会返回 Header，并且返回状态码 304。浏览器接受到这个消息就可以使用本地缓存库的数据；

> 注意：Last-Modified 和 If-Modified-Since 指的是同一个值，只是在客户端和服务器端的叫法不同。

2. ETag / If-None-Match 规则：

客户端第一次请求的时候，服务器会给每个资源生成一个 ETag 标记。这个 ETag 是根据每个资源生成的唯一 Hash 串，资源如果发生变化 ETag 随之更改，之后将这个 ETag 返回给客户端，客户端把请求的资源和 ETag 都缓存到本地。ETag 被保存以后，在下次请求时会当作 If-None-Match 字段被发送出去。在浏览器第二次请求服务器相同资源时，会把资源对应的 ETag 一并发送给服务器。在请求时 ETag 转化成 If-None-Match，但其内容不变。

服务器收到请求后，会把 If-None-Match 与服务器上资源的 ETag 进行比较：

- 如果不一致，说明资源被改动过，则返回资源（Header+Body），返回状态码 200；
- 如果一致，说明资源没有被改过，则返回 Header，返回状态码 304。浏览器接受到这个消息就可以使用本地缓存库的数据。

> 注意：ETag 和 If-None-Match 指的是同一个值，只是在客户端和服务器端的叫法不同。

### CDN 缓存

HTTP 缓存主要是对静态数据进行缓存，把从服务器拿到的数据缓存到客户端/浏览器。如果在客户端和服务器之间再加上一层 CDN，可以让 CDN 为应用服务器提供缓存，如果在 CDN 上缓存，就不用再请求应用服务器了。并且 HTTP 缓存提到的两种策略同样可以在 CDN 服务器执行。CDN 的全称是 Content Delivery Network，即内容分发网络。

![1][1]

它的工作流程如下：

- 客户端发送 URL 给 DNS 服务器；
- DNS 通过域名解析，把请求指向 CDN 网络中的 DNS 负载均衡器；
- DNS 负载均衡器将最近 CDN 节点的 IP 告诉 DNS，DNS 告之客户端最新 CDN 节点的 IP；
- 客户端请求最近的 CDN 节点；
- CDN 节点从应用服务器获取资源返回给客户端，同时将静态信息缓存。注意：客户端下次互动的对象就是 CDN 缓存了，CDN 可以和应用服务器同步缓存信息。

CDN 接受客户端的请求，它就是离客户端最近的服务器，它后面会链接多台服务器，起到了缓存和负载均衡的作用。

### 负载均衡缓存

虽说它的主要工作是对应用服务器进行负载均衡，但是它也可以作缓存。可以把一些修改频率不高的数据缓存在这里，例如：用户信息，配置信息。通过服务定期刷新这个缓存就行了。

![2][2]

以 Nginx 为例，它的工作流程如下：

- 用户请求在达到应用服务器之前，会先访问 Nginx 负载均衡器，如果发现有缓存信息，直接返回给用户；
- 如果没有发现缓存信息，Nginx 回源到应用服务器获取信息；
- 另外，有一个缓存更新服务，定期把应用服务器中相对稳定的信息更新到 Nginx 本地缓存中。

### 进程内缓存

进程内缓存又叫托管堆缓存，以 Java 为例，这部分缓存放在 JVM 的托管堆上面，同时会受到托管堆回收算法的影响。由于其运行在内存中，对数据的响应速度很快，通常我们会把热点数据放在这里。

在进程内缓存没有命中的时候，我们会去搜索进程外的缓存或者分布式缓存。这种缓存的好处是没有序列化和反序列化，是最快的缓存。缺点是缓存的空间不能太大，对垃圾回收器的性能有影响。目前比较流行的实现有 Ehcache、GuavaCache、Caffeine。这些架构可以很方便的把一些热点数据放到进程内的缓存中。

### 分布式缓存

与进程内缓存不同，进程外缓存在应用运行的进程之外，它拥有更大的缓存容量，并且可以部署到不同的物理节点，通常会用分布式缓存的方式实现。分布式缓存是与应用分离的缓存服务，最大的特点是，自身是一个独立的应用/服务，与本地应用隔离，多个应用可直接共享一个或者多个缓存应用/服务。

既然是分布式缓存，缓存的数据会分布到不同的缓存节点上，每个缓存节点缓存的数据大小通常也是有限制的。数据被缓存到不同的节点，为了能方便的访问这些节点，需要引入缓存代理，类似 [Twemproxy](https://github.com/twitter/twemproxy)。他会帮助请求找到对应的缓存节点。同时如果缓存节点增加了，这个代理也会只能识别并且把新的缓存数据分片到新的节点，做横向的扩展。

为了提高缓存的可用性，会在原有的缓存节点上加入 Master/Slave 的设计。当缓存数据写入 Master 节点的时候，会同时同步一份到 Slave 节点。一旦 Master 节点失效，可以通过代理直接切换到 Slave 节点，这时 Slave 节点就变成了 Master 节点，保证缓存的正常工作。每个缓存节点还会提供缓存过期的机制，并且会把缓存内容定期以快照的方式保存到文件上，方便缓存崩溃之后启动预热加载。

## JetCache 简介

JetCache 是一个基于 Java 的缓存系统封装，提供统一的 API 和注解来简化缓存的使用。 JetCache 提供了比 SpringCache 更加强大的注解，可以原生的支持 TTL、两级缓存、分布式自动刷新，还提供了 Cache 接口用于手工缓存操作。 当前有四个实现，RedisCache、TairCache（此部分未在github开源）、CaffeineCache(in memory)和一个简易的 LinkedHashMapCache(in memory)，要添加新的实现也是非常简单的。

全部特性:

- 通过统一的 API 访问 Cache 系统；
- 通过注解实现声明式的方法缓存，支持TTL和两级缓存；
- 通过注解创建并配置 Cache 实例；
- 针对所有 Cache 实例和方法缓存的自动统计；
- Key的生成策略和Value的序列化策略是可以配置的；
- 分布式缓存自动刷新，分布式锁 (2.2+)；
- 异步Cache API (2.2+，使用Redis的lettuce客户端时)；
- Spring Boot 支持；

## 环境

- JDK：1.8
- Spring Boot：2.2.4.RELEASE
- JetCache：2.5.16
- Jedis：2.9.3

## 集成 JetCache

在 pom.xml 中添加相关依赖：

```xml
<dependency>
  <groupId>com.alicp.jetcache</groupId>
  <artifactId>jetcache-starter-redis</artifactId>
</dependency>
<!-- springboot 2.2.0以上的版本 jetcache 使用redis问题 -->
<!-- Caused by: java.lang.NoClassDefFoundError: redis/clients/util/Pool -->
<!-- https://github.com/alibaba/jetcache/issues/426 -->
<!-- 这个是因为jedis做了不兼容的修改导致的，如果你不用spring cache，把jedis的版本改为2.9.3就可以了。如果你要用spring cache，用最新的master自己编译一个包可以支持新版jedis。 -->
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
</dependency>
```

然后创建一个 App 类放在业务包的根下，EnableMethodCache，EnableCreateCacheAnnotation 这两个注解分别激活 Cached 和 CreateCache 注解，其他和标准的 Spring Boot 程序是一样的。这个类可以直接 main 方法运行：

```java
import com.alicp.jetcache.anno.config.EnableCreateCacheAnnotation;
import com.alicp.jetcache.anno.config.EnableMethodCache;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableMethodCache(basePackages = "com.company.service")
@EnableCreateCacheAnnotation
public class MySpringBootApp {
    public static void main(String[] args) {
        SpringApplication.run(MySpringBootApp.class);
    }
}
```

在 application.yml 中进行配置：

```yaml
# 缓存配置
jetcache:
  # 缓存开关，开发模式建议关闭缓存方便调试
  enableMethodCache: false
  # 统计间隔，已分钟为单位，0表示不统计
  # statIntervalMinutes: 15
  statIntervalMinutes: 0
  # areaName是否作为缓存key前缀，默认true
  areaInCacheName: false
  # 本地缓存 一级
  local:
    default:
      # 已支持可选：linkedhashmap、caffeine
      type: linkedhashmap
      # key转换器的全局配置，当前只有：fastjson, @see com.alicp.jetcache.support.FastjsonKeyConvertor
      keyConvertor: fastjson
      # 每个缓存实例的最大元素的全局配置，仅local类型的缓存需要指定
      limit: 100
      # 以毫秒为单位指定超时时间的全局配置
      expireAfterWriteInMillis: 5000
      # 以毫秒为单位，指定多长时间没有访问，就让缓存失效，当前只有本地缓存支持。0表示不使用这个功能
      expireAfterAccessInMillis: 1000
  # 远程缓存 二级
  remote:
    default:
      type: redis
      database: 1
      host: localhost
      port: 6379
      password: 123456
      keyConvertor: fastjson
      # 序列化器的全局配置。仅remote类型的缓存需要指定，可选java和kryo
      valueEncoder: java
      valueDecoder: java
      # 以毫秒为单位指定超时时间的全局配置, 默认 无穷大
      expireAfterWriteInMillis: 60000
      poolConfig:
        minIdle: 5
        maxIdle: 20
        maxTotal: 50
```

> 更多配置：https://github.com/alibaba/jetcache/wiki/Config_CN

### 创建缓存实例

```java
@CreateCache(expire = 100)
private Cache<Long, UserDO> userCache;

// 用起来就像map一样
UserDO user = userCache.get(123L);
userCache.put(123L, user);
userCache.remove(123L);

// 创建一个两级（内存+远程）的缓存，内存中的元素个数限制在50个。
// name属性不是必须的，但是起个名字是个好习惯，展示统计数据的使用，会使用这个名字。如果同一个area两个@CreateCache的name配置一样，它们生成的Cache将指向同一个实例。
@CreateCache(name = "UserService.userCache", expire = 100, cacheType = CacheType.BOTH, localLimit = 50)
private Cache<Long, UserDO> userCache;
```

### 创建方法缓存

使用 @Cached 方法可以为一个方法添加上缓存。JetCache 通过 Spring AOP 生成代理，来支持缓存功能。注解可以加在接口方法上也可以加在类方法上，但需要保证是个 Spring bean。

key 使用 Spring 的 [SpEL](https://docs.spring.io/spring/docs/4.2.x/spring-framework-reference/html/expressions.html) 脚本来指定。如果要使用参数名（比如这里的key="#userId"），项目编译设置target必须为1.8格式，并且指定 javac 的 -parameters 参数，否则就要使用key="args[0]"这样按下标访问的形式。更多用法 [参考官方文档](https://github.com/alibaba/jetcache/wiki/MethodCache_CN)

```java
public interface UserService {
    // 缓存到远程
    @Cached(name="UserService.getUserById.", key = "#userId", expire = 3600)
    User getUserById(long userId);

    // 两级（内存+远程)
    @Cached(name = "UserService.getUserById2.", key = "#userId", expire = 60, cacheType = CacheType.BOTH)
    User getUserById2(long userId);

    // 参数使用对象
    @Cached(name = "UserService.getUserById3.", key = "#userVo.userId", expire = 30, cacheType = CacheType.BOTH)
    User getUserById3(UserVo userVo);

    // 只缓存到本地
    @Cached(name = "UserService.getUserById4.", key = "#userVo.userId", cacheType = CacheType.LOCAL, expire = 60, localLimit = 1000)
    User getUserById4(UserVo userVo);

    // 多个参数拼接key
    @Cached(name = "UserService.getUserById5.", key = "#param1+'-'+#param2+'-'+#param3",
      cacheType = CacheType.LOCAL, expire = 60, timeUnit = TimeUnit.SECONDS, localLimit = 10000)
    User getUserById5(String param1, String param2, String param3);

    // 自动刷新缓存，每隔15秒刷新一次，如果30秒没有访问就停止刷新，可解决缓存雪崩问题
    @Cached(name="userCache.", key = "#userId", expire = 3600)
    @CacheRefresh(refresh = 15, stopRefreshAfterLastAccess = 30)
    @CachePenetrationProtect // 当缓存访问未命中的情况下，对并发进行的加载行为进行保护。当前版本实现的是单JVM内的保护，即同一个JVM中同一个key只有一个线程去加载，其它线程等待结果。
    User getUserById(long userId);

    // 更新缓存
    @CacheUpdate(name="userCache.", key="#user.userId", value="#user")
    void updateUser(User user);

    // 删除缓存
    @CacheInvalidate(name="userCache.", key="#userId")
    void deleteUser(long userId);
}
```

> **注意**：缓存的对象要实现 Serializable 接口。

### 支持同一个类内部不同方法调用时也走缓存

在使用 Spring AOP 的时候，我们从 IOC 容器中获取的 Bean 对象其实都是代理对象，而不是那些 Bean 对象本身，而当在自己的 Service 类中使用 this 关键字嵌套调用同类中的其他方法时，由于 this 关键字引用的并不是该 Service Bean 对象的代理对象，而是其本身，故 Spring AOP 是不能拦截到这些被嵌套调用的方法的。

解决方法：类自我注入，使用 @lazy 和 @Autowired 注解实现自我注入，然后使用时用注解的实例代替this调用方法。

```java
@Service
public class UserServiceImpl implements UserService {
  @Lazy
  @Autowired
  private UserService userService;

  @Override
  User getUserById(long userId) {
    // ...
  }

  @Override
  User getUser(long userId) {
    return userService.getUserById(userId);
  }
  // 其他实现省略

```

## 缓存的更新模式

### Cache Aside 模式

![3][3]

1. 读取失效：cache 数据没有命中，查询DB，成功后把数据写入缓存。
2. 读取命中：读取cache数据。
3. 更新：把数据更新到DB，失效缓存。

### Read/Write Through 模式

![4][4]

缓存代理了DB读取、写入的逻辑，可以把缓存看成唯一的存储。

### Write Behind Caching(Write Back) 模式

![5][5]

这种模式下所有的操作都走缓存，缓存里的数据再通过异步的方式同步到数据库里面。所以系统的写性能能够大大提升了。

## 缓存失效策略

一般而言，缓存系统中都会对缓存的对象设置一个超时时间，避免浪费相对比较稀缺的缓存资源。对于缓存时间的处理有两种，分别是主动失效和被动失效。

### 主动失效

主动失效是指系统有一个主动检查缓存是否失效的机制，比如通过定时任务或者单独的线程不断的去检查缓存队列中的对象是否失效，如果失效就把他们清除掉，避免浪费。主动失效的好处是能够避免内存的浪费，但是会占用额外的CPU时间。

### 被动失效

被动失效是通过访问缓存对象的时候才去检查缓存对象是否失效，这样的好处是系统占用的CPU时间更少，但是风险是长期不被访问的缓存对象不会被系统清除。

## 缓存淘汰策略

缓存淘汰，又称为缓存逐出(cache replacement algorithms或者cache replacement policies)，是指在存储空间不足的情况下，缓存系统主动释放一些缓存对象获取更多的存储空间。

对于大部分内存型的分布式缓存（非持久化），淘汰策略优先于失效策略，一旦空间不足，缓存对象即使没有过期也会被释放。一般 LRU 用的比较多。

### FIFO

先进先出（First In First Out）是一种简单的淘汰策略，缓存对象以队列的形式存在，如果空间不足，就释放队列头部的（先缓存）对象。一般用链表实现。

### LRU

最近最久未使用（Least Recently Used），这种策略是根据访问的时间先后来进行淘汰的，如果空间不足，会释放最久没有访问的对象（上次访问时间最早的对象）。比较常见的是通过优先队列来实现。

### LFU

最近最少使用（Least Frequently Used），这种策略根据最近访问的频率来进行淘汰，如果空间不足，会释放最近访问频率最低的对象。这个算法也是用优先队列实现的比较常见。

## 分布式缓存的常见问题

根据事物的两面性，在分布式缓存带来高性能的同时，我们也需要重视它的可用性。那么哪些潜在的风险是我们需要防范的呢？

### 缓存与数据库双写不一致

一般来说，如果允许缓存可以稍微的跟数据库偶尔有不一致的情况，也就是说如果你的系统不是严格要求 “缓存+数据库” 必须保持一致性的话，最好不要做这个方案，即：读请求和写请求串行化，串到一个内存队列里去。串行化可以保证一定不会出现不一致的情况，但是它也会导致系统的吞吐量大幅度降低，用比正常情况下多几倍的机器去支撑线上的一个请求。

最经典的就是缓存+数据库读写的模式(Cache Aside Pattern)。

- 读的时候，先读缓存，缓存没有的话，再读数据库，然后取出数据后放入缓存，同时返回响应。
- 更新的时候，先更新数据库，然后再删除缓存。

### 一级缓存跟二级缓存不一致问题

Jetcache 作者的建议是给本地缓存设置一个较短的超时时间，采用消息通知会引来一定复杂度，[具体看社区讨论](https://github.com/alibaba/jetcache/issues/39)。

这里推荐一个 Java 两级缓存框架 [J2Cache](https://gitee.com/ld/J2Cache/)，感觉很有意思改天可以尝试一下。

#### 消息队列修改方案

![8][8]

应用在修改完自身缓存数据和数据库数据之后，给消息队列发送数据变化通知，其他应用订阅了消息通知，在收到通知的时候修改缓存数据。

#### Timer 修改方案

![9][9]

为了避免耦合，降低复杂性，对“实时一致性”不敏感的情况下，每个应用都会启动一个 Timer，定时从数据库拉取最新的数据，更新缓存。

不过在有的应用更新数据库后，其他节点通过 Timer 获取数据之间，会读到脏数据。这里需要控制好 Timer 的频率，以及应用与对实时性要求不高的场景。

### 缓存穿透

指查询一个一定不存在的数据，由于缓存是不命中时被动写，即从 DB 查询到数据，则更新到缓存中，并且出于容错考虑，如果从 DB 查不到数据则不写入缓存，这将导致这个不存在的数据每次请求都要去 DB 查询，失去了缓存的意义。在流量大时，DB 可能就挂掉了。

![6][6]

举个栗子。系统A，每秒 5000 个请求，结果其中 4000 个请求是黑客发出的恶意攻击。数据库 id 是从 1 开始的，而黑客发过来的请求 id 全部都是负数。这样的话，缓存中不会有，请求每次都“视缓存于无物”，直接查询数据库。这种恶意攻击场景的缓存穿透就会直接把数据库给打死。

解决方案：

- 方案一： 缓存空对象，当从 DB 查询数据为空，我们仍然将这个空结果进行缓存，具体的值需要使用特殊的标识， 能和真正缓存的数据区分开，另外将其过期时间设为较短时间。
- 方案二： 使用布隆过滤器，在缓存的基础上，构建布隆过滤器数据结构，在布隆过滤器中存储对应的 key，如果存在，则说明 key 对应的值为空。这样整个业务逻辑如下：
  - 根据 key 查询缓存，如果存在对应的值，直接返回；如果不存在则继续执行。
  - 根据 key 查询缓存在布隆过滤器的值，如果存在值，则说明该 key 不存在对应的值，直接返回空，如果不存在值，继续向下执行。
  - 查询 DB 对应的值，如果存在，则更新到缓存，并返回该值，如果不存在值，则更新缓存到布隆过滤器中，并返回空。

### 缓存雪崩

缓存由于某些原因无法提供服务，所有请求全部达到 DB 中，导致 DB 负荷大增，最终挂掉的情况。

![7][7]

比如，对于系统 A，假设每天高峰期每秒 5000 个请求，本来缓存在高峰期可以扛住每秒 4000 个请求，但是缓存机器意外发生了全盘宕机。缓存挂了，此时 1 秒 5000 个请求全部落数据库，数据库必然扛不住，它会报一下警，然后就挂了。此时，如果没有采用什么特别的方案来处理这个故障，DBA 很着急，重启数据库，但是数据库立马又被新的流量给打死了。

解决方案：

- 缓存高可用：使用 Redis Sentinel 等搭建缓存的高可用，避免缓存挂掉无法提供服务的情况，从而降低出现缓存雪崩的情况。
- 使用本地缓存：如果使用本地缓存，即使分布式缓存挂了，也可以将 DB 查询的结果缓存到本地，避免后续请 求全部达到 DB 中。当然引入本地缓存也会有相应的问题，比如本地缓存实时性如何保证。对于这个问题，可以使用消息队列，在数据更新时，发布数据更新的消息，而进程中有相应的消费者消费该消息，从而更新本地缓存；简单点可以通过设置较短的过期时间，请求时从 DB 重新拉取。
- 请求限流和服务降级：通过限制 DB 的每秒请求数，避免数据库挂掉。对于被限流的请求，采用服务降级处理，比如提供默认的值，或者空白值。

### 缓存击穿

某个 key 非常热点，访问非常频繁，处于集中式高并发访问的情况，当这个 key 在失效的瞬间，大量的请求就击穿了缓存，直接请求数据库，就像是在一道屏障上凿开了一个洞。

解决方案：

- 使用互斥锁 (mutex key)：感知到缓存失效，去查询 DB 时，使用分布式锁，使得只有一个线程去数据库加载数据，加锁失败的线程，等待即可。
  - 获取分布式锁，直到成功或超时。如果超时，则抛出异常，返回。如果成功，继续向下执行。
  - 再去缓存中。如果存在值，则直接返回；如果不存在，则继续往下执行。因为，获得到锁，可能已经被“那个”线程去查询过 DB ，并更新到缓存中了。
  - 查询 DB ，并更新到缓存中，返回值。
- 手动过期：redis 上从不设置过期时间，功能上将过期时间存在 key 对应的 value 里，如果发现要过期，通过一个后台的异步线程进行缓存的构建，也就是“手动”过期。

### 缓存并发竞争

某个时刻，多个系统实例都去更新某个 key。可以基于 redis 或 zookeeper 实现分布式锁。每个系统通过 redis 获取分布式锁，确保同一时间，只能有一个系统实例在操作某个 key，别人都不允许读和写。

要写入缓存的数据都是从 mysql 里查出来的，都得写入 mysql 中，写入 mysql 中的时候必须保存一个时间戳，从 mysql 查出来的时候，时间戳也要查出来。

每次要写之前，先判断一下当前这个 value 的时间戳是否比缓存里的 value 的时间戳要新。如果是的话，那么可以写，否则，就不能用旧的数据覆盖新的数据。

## 参考

- https://github.com/alibaba/jetcache/
- https://github.com/alibaba/jetcache/wiki/
- https://gitee.com/ld/J2Cache/
- https://spring.io/guides/gs/caching/

[1]: /images/java/jetcache/1.jpg
[2]: /images/java/jetcache/2.jpg
[3]: /images/java/jetcache/3.jpg
[4]: /images/java/jetcache/4.jpg
[5]: /images/java/jetcache/5.jpg
[6]: /images/java/jetcache/6.jpg
[7]: /images/java/jetcache/7.jpg
[8]: /images/java/jetcache/8.jpg
[9]: /images/java/jetcache/9.jpg
