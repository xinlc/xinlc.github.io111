---
title: Docker 部署 RabbitMQ 集群
date: 2020-07-05 19:00:00
categories: Docker
tags:
  - RabbitMQ
---

RabbitMQ 是一种消息中间件，用于处理来自客户端的异步消息。服务端将要发送的消息放入到队列池中。接收端可以根据RabbitMQ配置的转发机制接收服务端发来的消息。RabbitMQ依据指定的转发规则进行消息的转发、缓冲和持久化操作，主要用在多服务器间或单服务器的子系统间进行通信，是分布式系统标准的配置。

<!--more-->

## RabbitMQ 使用场景

### 服务解耦

假设有这样一个场景, 服务A产生数据, 而服务B,C,D需要这些数据, 那么我们可以在A服务中直接调用B,C,D服务,把数据传递到下游服务即可

但是,随着我们的应用规模不断扩大,会有更多的服务需要A的数据,如果有几十甚至几百个下游服务,而且会不断变更,再加上还要考虑下游服务出错的情况,那么A服务中调用代码的维护会极为困难

这是由于服务之间耦合度过于紧密

![1][1]

再来考虑用RabbitMQ解耦的情况

A服务只需要向消息服务器发送消息,而不用考虑谁需要这些数据;下游服务如果需要数据,自行从消息服务器订阅消息,不再需要数据时则取消订阅即可

![2][2]

### 流量削峰

假设我们有一个应用,平时访问量是每秒300请求,我们用一台服务器即可轻松应对

![3][3]

而在高峰期,访问量瞬间翻了十倍,达到每秒3000次请求,那么单台服务器肯定无法应对,这时我们可以考虑增加到10台服务器,来分散访问压力

但如果这种瞬时高峰的情况每天只出现一次,每次只有半小时,那么我们10台服务器在多数时间都只分担每秒几十次请求,这样就有点浪费资源了

![4][4]

这种情况,我们就可以使用RabbitMQ来进行流量削峰,高峰情况下,瞬间出现的大量请求数据,先发送到消息队列服务器,排队等待被处理,而我们的应用,可以慢慢的从消息队列接收请求数据进行处理,这样把数据处理时间拉长,以减轻瞬时压力

这是消息队列服务器非常典型的应用场景

![5][5]

### 异步调用

考虑定外卖支付成功的情况

支付后要发送支付成功的通知,再寻找外卖小哥来进行配送,而寻找外卖小哥的过程非常耗时,尤其是高峰期,可能要等待几十秒甚至更长

这样就造成整条调用链路响应非常缓慢

![6][6]

而如果我们引入RabbitMQ消息队列,订单数据可以发送到消息队列服务器,那么调用链路也就可以到此结束,订单系统则可以立即得到响应,整条链路的响应时间只有200毫秒左右

寻找外卖小哥的应用可以以异步的方式从消息队列接收订单消息,再执行耗时的寻找操作

![7][7]

## RabbitMQ 基本概念

RabbitMQ是一种消息中间件，用于处理来自客户端的异步消息。服务端将要发送的消息放入到队列池中。接收端可以根据RabbitMQ配置的转发机制接收服务端发来的消息。RabbitMQ依据指定的转发规则进行消息的转发、缓冲和持久化操作，主要用在多服务器间或单服务器的子系统间进行通信，是分布式系统标准的配置。

![8][8]

### Exchange

接受生产者发送的消息，并根据Binding规则将消息路由给服务器中的队列。ExchangeType决定了Exchange路由消息的行为。在RabbitMQ中，ExchangeType常用的有direct、Fanout和Topic三种。

![9][9]

### Message Queue

消息队列。我们发送给RabbitMQ的消息最后都会到达各种queue，并且存储在其中(如果路由找不到相应的queue则数据会丢失)，等待消费者来取。

### Binding Key

它表示的是Exchange与Message Queue是通过binding key进行联系的，这个关系是固定。

### Routing Key

生产者在将消息发送给Exchange的时候，一般会指定一个routing key，来指定这个消息的路由规则。这个routing key需要与Exchange Type及binding key联合使用才能生，我们的生产者只需要通过指定routing key来决定消息流向哪里。

## 基础环境

**虚拟机**

- node1：192.168.174.10
- node2：192.168.174.11
- node3：192.168.174.12
- node4：192.168.174.13
- node5：192.168.174.14

其中，node1、node2、node3三台服务器安装RabbitMQ服务，node4和node5安装HA-proxy和Keepalived。

**集群**

docker swarm，node1 为 manager 节点，node2 / node3 为 worker 节点

**主要端口介绍**

- 4369 erlang发现口
- 5672 client端通信口
- 15672 管理界面ui端口
- 25672 server间内部通信口

## 单机部署

```yaml
version: "3"

services:
  rabbitmq:
    image: rabbitmq:3.8.5-management
    ports:
      - "15672:15672"
      - "5672:5672"
    networks:
      - rabbit_network
    env_file:
      - ./rabbit.env
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    deploy:
      mode: replicated
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: "1"
          memory: 1024M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

networks:
  rabbit_network:
    external: true

```

**rabbit.env**

```bash
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=123456
```

> 访问控制台 http://localhost:15672

## 集群模式 - mirror

这里采用镜像模式，保证 100% 数据不丢失。在实际工作中也是用得最多的，并且实现非常的简单，一般互联网大厂都会构建这种镜像集群模式。

mirror 镜像队列，目的是为了保证 rabbitMQ 数据的高可靠性解决方案，主要就是实现数据的同步，一般来讲是 2 - 3 个节点实现数据同步。对于 100% 数据可靠性解决方案，一般是采用 3 个节点。

![11][11]

如上图所示，用 KeepAlived 做了 HA-Proxy 的高可用，然后有 3 个节点的 MQ 服务，消息发送到主节点上，主节点通过 mirror 队列把数据同步到其他的 MQ 节点，这样来实现其高可靠。

## 集群部署方式一（ rabbitmqctl )

> https://www.rabbitmq.com/clustering.html#transcript

**创建 rabbitmq 持久化存储路径**

```bash
# 【所有节点】
mkdir -p ~/rabbitmq/data
```

**在 node1 上新建部署文件 ~/rabbitmq/stack.yml**

```yaml
version: '3.7'
services:
  rabbit1:
    # image: rabbitmq:3
    image: rabbitmq:3.8.5-management
    # ports:
    #   - "15672:15672"
    #   - "5672:5672"
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=123456
    hostname: rabbit1
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node1
  rabbit2:
    image: rabbitmq:3.8.5-management
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=123456
    hostname: rabbit2
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node2
  rabbit3:
    image: rabbitmq:3.8.5-management
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=123456
    hostname: rabbit3
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node3

networks:
  rabbit_network:
    driver: overlay
    attachable: true

```

**启动 rabbitmq 服务**

```bash
# 【node1】部署 stack
docker stack deploy -c ~/rabbitmq/stack.yml rabbitmq

# 【node1】查看服务状态
docker service ls
```

**构建 rabbitmq 集群**

> 将 rabbit@rabbit2 和 rabbit@rabbit3 加入集群：

```bash
#【node2】rabbit@rabbit2 加入集群
docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl stop_app

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl reset

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl join_cluster rabbit@rabbit1

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl start_app


#【node3】rabbit@rabbit3 加入集群
docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl stop_app

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl reset

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl join_cluster rabbit@rabbit1

docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl start_app
```

**查看集群状态**

```bash
# 【任意节点】
docker exec -it $(docker ps | grep "rabbit" | awk '{ print $1 }')  rabbitmqctl cluster_status
```

## 集群部署方式二（ Config File Peer Discovery Backend )

> https://www.rabbitmq.com/cluster-formation.html#configuring

**创建 rabbitmq 持久化存储路径**

```bash
# 【所有节点】
mkdir -p ~/rabbitmq/data
```

**在 node1 上创建 rabbitmq 配置文件 ~/rabbitmq/rabbitmq.conf**

```bash
loopback_users.guest = false
listeners.tcp.default = 5672
hipe_compile = false
default_user = admin
default_pass = 123456
cluster_formation.peer_discovery_backend = rabbit_peer_discovery_classic_config
cluster_formation.classic_config.nodes.1 = rabbit@rabbit1
cluster_formation.classic_config.nodes.2 = rabbit@rabbit2
cluster_formation.classic_config.nodes.3 = rabbit@rabbit3
```

**在 node1 上创建 docker config**

```bash
docker config create rabbitmq-config ~/rabbitmq/rabbitmq.conf
```

**在 node1 上新建部署文件 ~/rabbitmq/stack.yml**

```yaml
version: '3.7'
services:
  rabbit1:
    image: rabbitmq:3
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    configs:
      - source: rabbitmq-config
        target: /etc/rabbitmq/rabbitmq.conf
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
    hostname: rabbit1
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node1
  rabbit2:
    image: rabbitmq:3
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    configs:
      - source: rabbitmq-config
        target: /etc/rabbitmq/rabbitmq.conf
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
    hostname: rabbit2
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node2
  rabbit3:
    image: rabbitmq:3
    networks:
      - rabbit_network
    volumes:
      - ~/rabbitmq/data:/var/lib/rabbitmq
    configs:
      - source: rabbitmq-config
        target: /etc/rabbitmq/rabbitmq.conf
    environment:
      - RABBITMQ_ERLANG_COOKIE=admin_cluster_cookie
    hostname: rabbit3
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.hostname==node3

networks:
  rabbit_network:
    driver: overlay
    attachable: true

configs:
  rabbitmq-config:
    external: true

```

**启动 rabbitmq 集群**

```bash
# 【node1】部署集群
docker stack deploy -c ~/rabbitmq/stack.yml rabbitmq
```

## Keepalived + HAProxy

**安装 HAProxy**

```bash
# 安装
yum install haproxy -y

# 修改配置
vim /etc/haproxy/haproxy.cfg
```

```conf
#logging options
global
    log 127.0.0.1 local0 info
    maxconn 5120
    chroot /usr/local/haproxy
    uid 99
    gid 99
    daemon
    quiet
    nbproc 20
    pidfile /var/run/haproxy.pid

defaults
    log global
    # 使用四层代理模式,"mode http" 为7层代理模式
    mode tcp
    # if you set mode to tcp,then you must change tcplog into httplog
    option tcplog
    option dontlognull
    retries 3
    option redispatch
    maxconn 2000
    contimeout 5s
    # 客户端空闲超时时间为60秒，过了该时间，HA发起重连机制
    clitimeout 60s
    # 服务端连接超时时间为15秒，过了该时间，HA发起重连机制
    srvtimeout 15s

listen rabbitmq_cluster
    # 定义监听地址和端口，本机的5672端口
    bind 0.0.0.0:5672
    # 配置 tcp 模式
    mode tcp
    # balance url_param userid
    # balance url_param session_id check_post 64
    # 简单的轮询
    balance roundrobin
    #rabbitmq集群节点配置 #inter 每隔五秒对mq集群做健康检查，2次正确证明服务器可用，
    #2次失败证明服务器不可用，并且配置主备机制
    server node1 192.168.174.10:5672 check inter 5000 rise 2 fall 2
    server node2 192.168.174.11:5672 check inter 5000 rise 2 fall 2
    server node3 192.168.174.12:5672 check inter 5000 rise 2 fall 2

# 配置 haproxy web 监控，查看统计信息
listen stats
    bind *:8100
    mode http
    option httplog
    stats enable
    # 设置 haproxy 监控地址为：http://localhost:8100/rabbitmq-stats
    stats uri /rabbitmq-stats
    stats refresh 5s
```

**启动 haproxy**

```bash
haproxy -f /etc/haproxy/haproxy.cfg
systemctl restart haproxy
```

访问 http://192.168.174.13:8100/rabbitmq-stats 可以看到状态

> [Keepalived 安装参考](https://xinlichao.cn/back-end/linux/lb-ha/)

## 集群镜像模式配置

使用Rabbit镜像功能，需要基于rabbitmq策略来实现，策策是用来控制和修改群集范围的某个vhost队列行为和Exchange行为在cluster中任意节点启用策略，策略会自动同步到集群节点

```bash
# 这行命令在vhost名称为hrsystem创建了一个策略，策略名称为ha-allqueue,策略模式为 all 即复制到所有节点，包含新增节点， 策略正则表达式为 “^” 表示所有匹配所有队列名称。
# 例如 rabbitmqctl set_policy -p hrsystem ha-allqueue "^message" '{"ha-mode":"all"}'
# 注意："^message" 这个规则要根据自己修改，这个是指同步"message"开头的队列名称，我们配置时使用的应用于所有队列，所以表达式为"^"
rabbitmqctl set_policy -p hrsystem ha-allqueue"^" '{"ha-mode":"all"}'
```

set_policy 说明参见

```bash
set_policy [-p vhostpath] {name} {pattern} {definition} [priority]      # ha-mode:all、exactly、nodes
```

也可以通过rabbit控制台添加

![10][10]

创建队列时需要指定ha 参数，如果不指定x-ha-prolicy 的话将无法复制

客户端使用负载服务器发送消息，队列会被复制到所有节点，当然策略也可以配置制定某几个节点，这时任何节点故障 、或者重启将不会影响我们正常使用某个队列，到这里我们完成了高可用配置。

## Spring Boot 应用连接 RabbitMQ 集群配置

引入依赖

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```properties
spring.rabbitmq.addresses=node1:5672,node2:5672,node3:5672
spring.rabbitmq.username=admin
spring.rabbitmq.password=123456
```

> 注意，容器需要暴露端口 5672 供外部访问

[1]: /images/docker/docker-rabbitmq/1.png
[2]: /images/docker/docker-rabbitmq/2.png
[3]: /images/docker/docker-rabbitmq/3.png
[4]: /images/docker/docker-rabbitmq/4.png
[5]: /images/docker/docker-rabbitmq/5.png
[6]: /images/docker/docker-rabbitmq/6.png
[7]: /images/docker/docker-rabbitmq/7.png
[8]: /images/docker/docker-rabbitmq/8.png
[9]: /images/docker/docker-rabbitmq/9.png
[10]: /images/docker/docker-rabbitmq/10.jpg
[11]: /images/docker/docker-rabbitmq/11.png
