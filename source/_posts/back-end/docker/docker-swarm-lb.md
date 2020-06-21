---
title: Docker Swarm 之 服务发现和负载均衡原理
date: 2019-11-16 19:30:00
categories: Docker
tags:
  - docker
---

本文将介绍基于 DNS 的负载均衡、基于 VIP 的负载均衡和路由网格（Routing Mesh）。

<!--more-->

## 使用的技术

Docker 使用了 Linux 内核 iptables 和 IPVS 的功能来实现服务发现和负载均衡。

- iptables 是 Linux 内核中可用的包过滤技术，它可用于根据数据包的内容进行分类、修改和转发决策。
- IPVS 是 Linux 内核中可用的传输级负载均衡器。

## 准备工作

- 环境： Centos 7.4 * 2 ，Docker 版本 18.03.1-ce
- swarm 集群：【Manager】node1、【Worker】node2
- 客户端镜像： registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu
- 服务端镜像： registry.cn-hangzhou.aliyuncs.com/anoy/vote

![1][1]

如图所示，我们将在 swarm 集群中部署 “client” 服务 和 “vote” 服务，其中 “vote” 服务部署多个副本。客户端请求 “vote” 服务时，输出结果中包含服务端的容器 ID，这样就更方便演示网络请求。

使用如下命令，创建 overlay 网络：

```bash
docker network create --driver overlay overlay1
```

## 基于 DNS 的负载均衡

下图描述了基于 DNS 的负载均衡是如何工作的：

![2][2]

DNS server 内嵌于 Docker 引擎。Docker DNS 解析服务名 “vote” 并返回容器 ID 地址列表（随机排序）。客户端通常会挑第一个 IP 访问，因此负载均衡可能发生在服务器的不同实例之间。

使用如下命令创建 2 个基于 DNS 负载均衡的服务 “client” 、 “vote”：

```bash
docker service create --endpoint-mode dnsrr --replicas 1 --name client --network overlay1 registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu ping anoyi.com

docker service create --endpoint-mode dnsrr --name vote --network overlay1 --replicas 2 registry.cn-hangzhou.aliyuncs.com/anoy/vote
```

查看服务信息：

```bash
[root@node1 ~]# docker service ls
ID                  NAME                MODE                REPLICAS            IMAGE                                                  PORTS
2mrj3pqyioc3        client              replicated          1/1                 registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu:latest
826s79tsixuh        vote                replicated          2/2                 registry.cn-hangzhou.aliyuncs.com/anoy/vote:latest

[root@node1 ~]# docker service ps client
ID                  NAME                IMAGE                                                  NODE                DESIRED STATE       CURRENT STATE           ERROR               PORTS
f74i688vbh12        client.1            registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu:latest   node2               Running             Running 2 minutes ago

[root@node1 ~]# docker service ps vote
ID                  NAME                IMAGE                                                NODE                DESIRED STATE       CURRENT STATE                ERROR               PORTS
7iiuzl2a63hy        vote.1              registry.cn-hangzhou.aliyuncs.com/anoy/vote:latest   node1               Running             Running 47 seconds ago
uyhxxqfdima7        vote.2              registry.cn-hangzhou.aliyuncs.com/anoy/vote:latest   node2               Running             Running about a minute ago
```

可以看出 "client" 运行于 node2，在 node2 上进入 client 容器，使用 dig 来解析服务名 "vote"，如下所示，"vote" 解析到 10.0.0.6 和 10.0.0.5

```bash
[root@node2 ~]# docker ps
CONTAINER ID        IMAGE                                                  COMMAND                  CREATED              STATUS              PORTS               NAMES
1eed67d37cbb        registry.cn-hangzhou.aliyuncs.com/anoy/vote:latest     "gunicorn app:app -b…"   About a minute ago   Up About a minute   80/tcp              vote.2.uyhxxqfdima7smos5pki84wul
436702b21a1c        registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu:latest   "ping anoyi.com"         3 minutes ago        Up 3 minutes                            client.1.f74i688vbh12on8oniufht633

[root@node2 ~]# docker exec -it 436702b21a1c /bin/bash

root@436702b21a1c:/# dig vote

;; ANSWER SECTION:
vote.           600 IN  A   10.0.0.5
vote.           600 IN  A   10.0.0.6
```

使用 ping 解析 "vote" 服务，如下所示，交替解析到 10.0.0.6 和 10.0.0.5

```bash
root@436702b21a1c:/# ping -c1 vote
PING vote (10.0.0.6) 56(84) bytes of data.
64 bytes from vote.2.uyhxxqfdima7smos5pki84wul.overlay1 (10.0.0.6): icmp_seq=1 ttl=64 time=0.087 ms

root@436702b21a1c:/# ping -c1 vote
PING vote (10.0.0.5) 56(84) bytes of data.
64 bytes from vote.1.7iiuzl2a63hyj084qgufc175v.overlay1 (10.0.0.5): icmp_seq=1 ttl=64 time=0.767 ms
```

如果使用 curl，如下所示，请求也能解析到不同的容器

```bash
root@436702b21a1c:/# curl vote  | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   7542      0 --:--:-- --:--:-- --:--:--  7546
          Processed by container ID 9b42319d4f13

root@436702b21a1c:/# curl vote  | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   452k      0 --:--:-- --:--:-- --:--:--  514k
          Processed by container ID 1eed67d37cbb
```

基于 DNS 负载均衡存在如下问题：

- 某些应用程序将 DNS 主机名缓存到 IP 地址映射，这会导致应用程序在映射更改时超时
- 具有非零 DNS ttl 值会导致 DNS 条目反映最新的详细信息时发生延迟

## 基于 VIP 的负载均衡

基于 VIP 的负载均衡克服了基于 DNS 负载均衡的一些问题。在这种方法中，每个服务都有一个 IP 地址，并且该 IP 地址映射到与该服务关联的多个容器的 IP 地址。在这种情况下，与服务关联的服务 IP 不会改变，即使与该服务关联的容器死亡并重新启动。

下图描述了基于 VIP 的负载均衡是如何工作的：

![3][3]

DNS server 会将服务名 "vote" 解析到 VIP，使用 iptables 和 ipvs，VIP 实现 2 个服务端 "vote" 容器的负载均衡。

使用如下命令创建 2 个 VIP 模式的服务 “client” 、 “vote”：

```bash
docker service create --replicas 1 --name client --network overlay1 registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu ping anoyi.com

docker service create --name vote --network overlay1 --replicas 2 registry.cn-hangzhou.aliyuncs.com/anoy/vote
```

查看这 2 个服务和它们的服务 IP：

```bash
[root@node1 ~]# docker service inspect --format {{.Endpoint.VirtualIPs}}  vote
[{tetug0isdx1gri62g7cfm889i 10.0.0.9/24}]

[root@node1 ~]# docker service inspect --format {{.Endpoint.VirtualIPs}}  client
[{tetug0isdx1gri62g7cfm889i 10.0.0.7/24}]
```

在 "client" 的容器中使用如下命令，可以看到服务名 "vote" 映射到 VIP "10.0.0.9"

```bash
[root@node2 ~]# docker exec -it f3d1c4ef53f8 /bin/bash

root@f3d1c4ef53f8:/# dig vote

;; ANSWER SECTION:
vote.           600 IN  A   10.0.0.9
```

Service IP "10.0.0.9" 使用 Linux 内核的 iptables 和 IPVS 负载均衡到 2 个容器。iptables 实现防火墙规则，IPVS 实现负载均衡。为了证明这一点，我们需要使用 nsenter 进入容器的网络空间 (namespace)。为此，我们需要找到网络的命名空间。

如下是 node2 上的网络命名空间：

```bash
[root@node2 ~]# cd /run/docker/netns/

[root@node2 netns]# ls
1-tetug0isdx  1-vyy22w04t6  be7330b99a27  d67fa9efb59e  ingress_sbox
```

前 2 个命名空间是用于 overlay 网络，后面的用于容器。下面的命令用于找到 "client" 容器的网络命名空间：

```bash
[root@node2 netns]# docker ps
CONTAINER ID        IMAGE                                                  COMMAND                  CREATED             STATUS              PORTS               NAMES
43a789312e70        registry.cn-hangzhou.aliyuncs.com/anoy/vote:latest     "gunicorn app:app -b…"   3 minutes ago       Up 3 minutes        80/tcp              vote.1.u46ms31e8zjdxtwrxvaec8zub
f3d1c4ef53f8        registry.cn-hangzhou.aliyuncs.com/anoy/ubuntu:latest   "ping anoyi.com"         4 minutes ago       Up 4 minutes                            client.1.ycox088aek5ajejezubwsjqf2

[root@node2 netns]# docker inspect f3d1c4ef53f8 | grep -i sandbox
            "SandboxID": "be7330b99a274a03a7f58e9e991346dc6f048836a1682c7244a6068acbfb664c",
            "SandboxKey": "/var/run/docker/netns/be7330b99a27",
```

SandboxID 即为 "client" 容器的网络命名空间。

使用如下命令，我们就能够进入到 "client" 容器的网络命令空间：

```bash
nsenter --net=f3d1c4ef53f8 sh
```

下面，我们可以看到 iptables 的转发规则和 IPVS 输出：

```bash
sh-4.2# iptables -nvL -t mangle

Chain OUTPUT (policy ACCEPT 606 packets, 50867 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 MARK       all  --  *      *       0.0.0.0/0            10.0.0.7             MARK set 0x102
    0     0 MARK       all  --  *      *       0.0.0.0/0            10.0.0.9             MARK set 0x103

sh-4.2# ipvsadm
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
FWM  258 rr
  -> node2:0                      Masq    1      0          0
FWM  259 rr
  -> 10.0.0.10:0                  Masq    1      0          0
  -> 10.0.0.11:0                  Masq    1      0          0
```

Service IP "10.0.0.9" 使用 iptables OUTPUT 链获得标记 0x103 (十六进制 -> 十进制：259)，然后 IPVS 使用此标记并将它负载均衡到 "10.0.0.10" 和 "10.0.0.11" 。

查看 vote 服务的 2 个容器的 IP 如下所示，即 VIP "10.0.0.9" 负载均衡到不同的容器实例：

```bash
[root@node2 netns]# docker inspect vote.1.u46ms31e8zjdxtwrxvaec8zub | grep IPv4
                        "IPv4Address": "10.0.0.10"

[root@node1 ~]# docker inspect vote.2.tutj19i4iwu1xn7arsaq815cu | grep IPv4
                        "IPv4Address": "10.0.0.11"
```

进入 client 服务的容器，使用 curl 请求 vote 服务，输出结果如下，即请求分发到不同的容器：

```bash
root@f3d1c4ef53f8:/# curl vote | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0  14409      0 --:--:-- --:--:-- --:--:-- 14438
          Processed by container ID c2af209c4e90

root@f3d1c4ef53f8:/# curl vote | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   165k      0 --:--:-- --:--:-- --:--:--  171k
          Processed by container ID 43a789312e70
```

## 路由网格 （Routing mesh）

使用路由网格，服务暴露的端口会暴露在 Swarm 集群中的所有工作节点。Docker 是通过创建 "ingress" overlay 网络来实现这一点的，所有节点默认使用内在的 sandbox 网络命名空间成为 "ingress" overlay 网络的一部分。

下图描述了 Routing mesh 如何实现负载均衡的：

![4][4]

首先，会将 Hostname 或 IP 映射到 Sandbox IP，Sandbox 中的 iptables 和 IPVS 负责将请求负载均衡到 2 个 vote 容器。Ingress sandbox 网络命名空间驻留在 swarm 集群中的所有工作节点，它通过将主机映射的端口负载均衡到后端容器来协助路由网格功能。

使用如下命令创建 vote 服务，使用路由网格暴露端口到所有节点：

```bash
docker service create --name vote --network overlay1 --replicas 2 -p 8080:80 registry.cn-hangzhou.aliyuncs.com/anoy/vote
```

下图显示了 Sandbox、容器和每个节点的网络之间的映射关系：

![5][5]

如图所示，Sandbox 和 vote 容器是 "ingress" 网络的一部分，它有助于路由网格。client 容器和 vote 容器是 "overlay1" 网络的一部分，它有助于内部负载均衡。所有容器都是默认 "docker_gwbridge" 网络的一部分。

遵循 iptables 中的 NAT 规则显示，端口 8080 上的主机流量发送到 node1 里的 Sandbox：

```bash
[root@node1 ~]# iptables -nvL -t nat

Chain DOCKER-INGRESS (2 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 DNAT       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 to:172.18.0.2:8080
  315 18876 RETURN     all  --  *      *       0.0.0.0/0            0.0.0.0/0
```

进入 node1 上的 Sandbox 网络命名空间 (ingress_sbox)，查看 iptables 的转发规则和 IPVS 输出：

```bash
[root@node1 netns]# nsenter --net=ingress_sbox sh

sh-4.2# iptables -nvL -t mangle
Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 MARK       tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 MARK set 0x105

sh-4.2# ipvsadm
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
FWM  261 rr
  -> 10.255.0.5:0                 Masq    1      0          0
  -> 10.255.0.6:0                 Masq    1      0          0
```

端口 8080 标记为 0x105 (十六进制 -> 十进制：261)，IPVS 使用此标记将它负载均衡到 "10.255.0.5" 和 "10.255.0.6" 。

查看 vote 服务的 2 个容器的 IP 如下所示，即主机端口 8080 的流量会负载均衡到不同的容器实例：

```bash
[root@node1 netns]# docker inspect 6173afd5fab8 | grep IPv4
                        "IPv4Address": "10.255.0.6"
                        "IPv4Address": "10.0.0.14"

[root@node2 ~]# docker inspect b07e95c5c681 | grep IPv4
                        "IPv4Address": "10.255.0.5"
                        "IPv4Address": "10.0.0.13"
```

验证负载均衡，在 node1 上通过 node2 的 IP 和 8080 端口请求 vote 服务：

```bash
[root@node1 netns]# curl node2:8080 | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   199k      0 --:--:-- --:--:-- --:--:--  192k
          Processed by container ID 6173afd5fab8

[root@node1 netns]# curl node2:8080 | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   7551      0 --:--:-- --:--:-- --:--:--  7546
          Processed by container ID b07e95c5c681
```

在 node2 上通过 node1 的 IP 和 8080 端口请求 vote 服务：

```bash
[root@node2 ~]# curl node1:8080 | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   7531      0 --:--:-- --:--:-- --:--:--  7546
          Processed by container ID 6173afd5fab8

[root@node2 ~]# curl node1:8080 | grep -i "container id"
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  3162  100  3162    0     0   169k      0 --:--:-- --:--:-- --:--:--  171k
          Processed by container ID b07e95c5c681
```

## 服务发现详解

Docker 提供了 overlay driver，使用户可以创建基于 VxLAN 的 overlay 网络。VxLAN 可将二层数据封装到 UDP 进行传输，VxLAN 提供与 VLAN 相同的以太网二层服务，但是拥有更强的扩展性和灵活性。linux下是使用了net namespace来隔离docker创建的overlay网络。

Docker 网络模型如下：

![6][6]

**Sandbox：**

一个Sandbox包含了一个容器网络栈的配置。其中包括了对容器的网卡，路由表以及对DNS设置的管理。通常，一个Sandbox的实现可以是一个Linux Network Namespace，一个FreeBSD Jail或者其他类似的东西。一个Sandbox可以包含多个处于不同Network的Endpoint。

**Endpoint：**

Endpoint将一个Sandbox加入一个Network。Endpoint的实现可以是一个veth对，一个Open vSwitch internal port或者其他类似的东西。一个Endpoint只能属于一个Network和一个Sandbox。

**Network：**

Network是一个能够互相通信的Endpoint的集合。Network的实现可以是一个Linux网桥，一个VLAN等等。

### Docker Swarm 中的服务发现

服务发现组件用来注册一个服务，并发布此服务的连接信息从而使其他服务知道如何连接到它。当应用转向微服务结构或者是面向服务的架构时，服务发现已经变成分布式系统必不可少的一部分，也增加了操作这些环境的复杂性。

DockerEE、DockerCS 引擎通过直接包含服务发现和负载均衡机制来提升使用它的组织执行devops的积极性，并且使开发能动态的发现其他服务的应用变得简单，通过操作引擎也使得应用扩容变得简单。

Docker利用service来发布应用。一个service包含了一组从同一个镜像创建的容器，每个service由执行在工作节点的任务和定义好的应用的状态两部分组成。当发布一个service，这个service的定义也包含在了service的创建中，在定义中包括组成service的容器，发布的端口，使用的网络，复制的个数等信息，所有的这些属性组成了service的预期状态。当一个节点的健康检查失败或者是一个service中某个特定的任务检查失败时，集群会自动维护service的一致状态，把失败的任务转发到其他健康的节点上。

docker利用内嵌的DNS服务为单个docker引擎中的容器以及swarm 模式下的task提供服务发现能力。

docker引擎有一个内部的DNS服务来为运行在该宿主机上的所有容器提供名称解析的功能，无论容器是运行在用户自定义的bridge, overlay, 和 MACVLAN 网络。每一个docker容器（或者是docker swarm中的一个任务，也是以容器运行）都有一个域名解析器，可以把域名查询请求转发到宿主机上的docker引擎上的域名服务，docker 引擎收到请求后就会在发出请求的容器所在的所有网络中检查域名对应的是不是一个容器或者是服务，如果是，docker引擎就会从存储的key-value建值对中查找这个容器名、任务名、或者服务名对应的IP地址，并把这个IP地址或者是服务的虚拟IP地址返回给发起请求的域名解析器。

由上可知，docker的服务发现的作用范围是网络级别，也就意味着只有在同一个网络上的容器或任务才能利用内嵌的DNS服务来相互发现，不在同一个网络里面的服务是不能解析名称的，另外，为了安全和性能只有当一个节点上有容器或任务在某个网络里面时，这个节点才会存储那个网络里面的DNS记录。

如果目的容器或服务和源容器不在同一个网络里面，Docker引擎会把这个DNS查询转发到配置的默认DNS服务。

![7][7]

在上图的例子中，总共有两个服务myservice和client，其中myservice有两个容器，这两个服务在同一个网里面。在client里针对docker.com和myservice各执行了一个curl操作，下面时执行的流程：

- 为了client解析docker.com和myservice，DNS查询进行初始化
- 容器内建的解析器在127.0.0.11:53拦截到这个DNS查询请求，并把请求转发到docker引擎的DNS服务
- myservice被解析成服务对应的虚拟IP，在接下来的内部负载均衡阶段再被解析成一个具体任务的IP地址。如果是容器名称这一步直接解析成容器对应的IP地址。
- docker.com在mynet网络上不能被解析成服务，所以这个请求被转发到配置好的默认DNS服务器上

**Docker swarm 中的LB分为两种情况：**

1. Ingress Load Balancing
2. Internal Load Balancing

**简要介绍测试环境下docker swarm中的网络分布情况：**

环境：

- swarm-a(manager node)：10.10.8.92
- swarm-b(work node)：10.10.8.93
- swarm-c(work node)：10.10.8.94

在docker swarm集群创建的开始，docker 会给每台host创建除了docker0以外的两个网络，分是bridge类型(docker_gwbridge网桥)和overlay类型(ingress)的网络，以及一个过度的命名空间ingress_sbox，我们可以使用如下命令自建overlay网络，结果如下：

docker network create --driver overlay mynet （后续会有用到）

![8][8]

ingress网络的IPAM( IP Address Management)分配如下：

![9][9]

mynet自建的overlay会使用docker自动分配的IPAM：

![10][10]

建完的overlay网络的同时会在host本地创建对应的Net Namespace如下：

![11][11]

注意1：要是想看到容器创建的两个Net Namespace需要执行

```bash
ln -s /var/run/docker/netns /var/run/netns
```

### Ingress Load Balancing

部署一个service使用默认的ingress网络：

```bash
docker service create --name web_ingress_lb --replicas=2 --publish 8090:80 httpd
```

部署的两个容器分别处在a和b节点上：

![12][12]

service：web_ingress_lb的网络连接结构图如下：

![13][13]

Swarm mode下，docker会创建一个默认的overlay网络—ingress network。Docker也会为每个worker节点创建一个特殊的net namespace（sandbox）-- ingress_sbox。ingress_sbox有两个endpoint，一个用于连接ingress network，另一个用于连接local bridge network docker_gwbridge。Ingress network的IP空间为10.255.0.0/16，所有router mesh的service都共用此空间。

**Ingress Load Balancing实现方式：**

![14][14]

1. 宿主机网络通过worker节点IP和service published port来访问服务。比如：上面服务定义-p 8090:80，可以通过workerIP:8090 访问服务
2. 每个节点iptables中NAT表定义规则，对于匹配published的宿主机端口（8090）的数据，将其dst IP转换成ingress_sbox中的ip：172.18.0.2。使数据包转发到ingress_sbox的ns中交给该ns处理做下一步的转发。

![15][15]

3. Ingress_sbox是swarm为每个节点默认创建的net namespace，用于连接ingress overlay network。此处会设置mangle表，将dst port为8090的数据做标记(fwmark)。同时做DNAT转换成vip地址使数据包能正常转发到ingress的ns中，该vip由ingress_sbox的ipvs做负载转发。

![16][16]

4. Ingress_sbox会设置kernel中的LVS模块，将标记fwmark的包LB到各个实际IP中，默认round-robin算法，forware为VS/NAT方式。容器底层间通过overlay网络互连通信。

![17][17]

- 数据包在这一步进入ingress的ns后怎么实现到后端真实容器上呢？我们猜想下ingress想要转发就需要有各个节点容器对应的ingress veth pair网卡的mac地址才能做转发是吧，好的那我们来看下ingress的ns空间中的fdb(linux bridge forward db)信息。

![18][18]

- 查看b节点上web_ingress_lb.1容器的mac地址信息

![19][19]

- 这样一来即使容器的副本没有落到host上我们仍可以通过这种转发方式来访问到服务。这应该就是routing mesh吧！

5. Service的各个容器会将dst port为8080的数据的dst port转换成80，从而访问到真实的服务。

![20][20]

可以看到一个请求到主机端口8090之后， 数据包的流向如下所示：

主机端口8090 => Ingress-sbox-VIP:8090 => 容器Ingress-sbox => IPVS分发到containers。

可以看到访问主机之后数据包流到了一个特殊的Sandbox容器里， 这个容器和我们的容器共享一个Ingress网络，通过Iptables和IPVS等重定向到了最终容器之上。 达到了服务在任何一台主机的8090端口都可达的目的。

### Internal Load Balancing

部署一个service使用我们自己创建的mynet网络：

```bash
docker service create --name web_mynet --replicas=2 --network=mynet --publish 8080:80 httpd
```

部署的两个容器分别处在a和c节点上：

![21][21]

**--publish #--在这里的用意是将容器内部的服务暴露到host上这样我们就可以访问这个services，一般情况下我们在swarm中部署service后容器中的网络只有一张网卡使用的是docker0网络，当我们将服务发布出去后，swarm会做如下操作：**

- 给容器添加三块网卡eth0和eth1，eth2，eth0连接overlay类型网络名为ingress用于在不同主机间通信，eth1连接bridge类网络名为docker_gwbridge，用于让容器能访问外网。eth2连接到我们自己创建的mynet网络
上，同样的作用也是用于容器之间的访问(区别于eth2网络存在dns解析即服务发现功能)。
- swarm各节点会利用ingress overlay网络负载均衡将服务发布到集群之外。

查看web_mynet.1容器和mynet网络命名空间的网卡情况：

![22][22]

```bash
$docker exec web_mynet.1.kammwchnoeend86w3e5pho88i ip add
上面的命令可以查看a节点上的容器的网络有四张网卡eth0和eth1，eth2和lo，eth2网卡可以看出其
对应的veth pair为mynet网络中的veth0，eth1的网卡比较容易找到在host上对应的veth pair

$ip netns exec 1-j6s2r8ahdh ip add
查看mynet网络命名空间下的网卡情况。

$ip netns exec 1-j6s2r8ahdh brctl show
查看mynet网络空间下网桥挂载情况可以看出veth0挂到了br0网桥上。
```

查看web_mynet.1容器和ingress\ingress_sbox网络命名空间的网卡对应情况：

![23][23]

获取mynet和ingress网络的vxlan-id：

```bash
## 执行如下命令查看mynet空间下vxlan0网卡所带的vlan-id：
$ip netns exec 1-j6s2r8ahdh ip -d l show vxlan0
```

可以看mynet网络下vlan-id 为4097，ingress网络空间同样操作可以得到vlan-id为4096

![24][24]

swarm-c节点上的情况也是差不多就不操作了，好了我们来画下网络连接的大致图：

![25][25]

可以看到这里ingress_sbox和创建容器的ns共用一个ingress网络空间。

**Internal Load Balancing实现方式：**

有两种实现方式dns rr和vip形式，在dns rr 的情况下可能会存在一定是的问题，当容器重启后dns的解析会存在一定时间的延迟。vip则是由vip+内核ipvs来实现。docker swarm默认使用的是vip，这里就以vip的形式来解析。

VIP形式下的流量路径：

![26][26]

1. 同处于网络mynet中的容器可以通过service域名或者VIP来访问service；通过域名访问时，容器会访问docker engine中内置的DNS服务，从而获取VIP。
2. CNM网络模型中一个容器对应一个sandbox，也即容器的net namespace。我们查web_mynet.1容器的sandbox中iptables的mangle表的配置情况：mangle表中OUTPUT链，将destIP==VIP的包标记fwmark。

操作流程如下：

通过busybox服务做dns解析，可以发现该服务后端挂载的容器和该服务对应的VIP地址。web_mynet服务对应的VIP为10.0.0.6。

![27][27]

- 进入web_mynet.1容器的ns:

```bash
$docker inspect container_id/container_name | grep -i sandbox
$nsenter --net=SandboxKey(/var/run/docker/netns/xxxx) sh
```

![28][28]

3. web_mynet.1的 Sandbox中会设置kernel中的LVS模块，将标记fwmark的包LB到各个实际IP中，默认round-robin算法，VS/NAT方式。容器底层间通过overlay网络互连通信。在web_mynet.1的ns中执行如下获取LB信息：`$ipvsadm -L`

![29][29]

- 简单的来说就是在web_mynet.1容器中定义好了web_mynet服务的vip数据包的标签和LB，然后数据包通过容器本地路由从eth2接口出去，进入到mynet的ns中：

![30][30]

- 带有具体目容器的MAC数据包进入mynet的ns后，由mynet网络中的fdb来进行转发：

![31][31]

![32][32]

**总结：**

在Internal Load Balancing也就是文中我们自建的mynet overlay网络中，我们会看到创建的service会同时应用到两个网络环境里面去，为何要这样呢？

原因是swarm自带ingress不具备有服务发现的功能，而容器的生命周期又是不固定的，service每次的消亡和启用都会改变容器内部的ip地址以及vip地址，那么集群中服务之间的通信势必会造成问题，这里有人会说，要使多个service之间能够互相通信可以将所有的service都publish出去，然后通过routing mesh 访问，这样是没错也能行得通，但是存在一个缺点，那就是不安全，我们仅仅只需要的是将最终提供服务的端口publish即可。那么不publish所有的service需要做到以下几点：

- 让service通过简单的方法访问其他service
- 当service副本的ip发生变化时，不会影响访问该service的其他service
- 当service的副本数发生变化时，不会影响访问该service的其他service这其实就是服务发现，docker swarm提供了这些功能将LB和服务发现集成在一起，通过服务发现service，使用者不需要知道service运行在哪里，ip是多少有多少个副本，就能实现集群内service与service的通信以及LB。

这里我理解的是ingress是单单提供LB实现routing mesh，而mynet是服务发现和LB的结合。

**所以上文中Internal Load Balancing中的数据流应该分成两种情景如下：**

1. 当一个外部请求到主机端口8080之后， 数据包的流向如下所示：
主机端口8080 => Ingress-sbox-VIP:8080 => 容器Ingress-sbox => IPVS分发到containers。

2. 处于 同mynet网络的service内部通信时：
处于 同mynet网络的test service(busybox容器)发起访问web_mynet域名的请求=>请求转发到docker engine内置的DNS解析web_mynet的vip=>web_mynet(容器)在其ns中将VIP数据包打上标签，并通过ipvs来负载到后端对应的容器=>数据包通过vip地址路由到 mynet的ns，由mynet中的fdb来做转发走tunnel出去。

## 负载均衡详解

- Swarm模式内置DNS组件，可以自动为集群中的每个服务分配DNS记录。
- Swarm manager使用内部负载均衡，根据服务的DNS名称在集群内的服务之间分发请求。
- Swarm manager使用 ingress load blancing暴露你想从外部访问集群提供的服务。
- Swarm manager自动为服务分配一个范围30000-32767端口的Published Port,也可以为该服务指定一个Published Port。

ingress network是一个特殊的overlay网络，便于服务的节点直接负载均衡。当任何swarm节点在已发布的端口上接收到请求时，它将该请求转发给调用的IPVS模块，IPVS跟踪参与该服务的所有容器IP地址，选择其中一个，并通过ingress network将请求路由给它。

![33][33]

### 内部负载均衡

当在docker swarm集群模式下创建一个服务时，会自动在服务所属的网络上给服务额外的分配一个虚拟IP，当解析服务名字时就会返回这个虚拟IP。对虚拟IP的请求会通过overlay网络自动的负载到这个服务所有的健康任务上。这个方式也避免了客户端的负载均衡，因为只有单独的一个虚拟IP会返回到客户端，docker会处理虚拟IP到具体任务的路由，并把请求平均的分配给所有的健康任务。

![35][35]

如果想观察一个服务对应的虚拟IP，执行`docker service inspect myservice` 命令，会看到类似于下面的结果

```bash
# 创建overlay网络：mynet  
$ docker network create -d overlay mynet  
a59umzkdj2r0ua7x8jxd84dhr  
  
# 利用mynet网络创建myservice服务，并复制两份  
$ docker service create --network mynet --name myservice --replicas 2 busybox ping localhost  
8t5r8cr0f0h6k2c3k7ih4l6f5  
  
# 通过下面的命令查看myservice对应的虚拟IP  
$ docker service inspect myservice  
...  
  
"VirtualIPs": [  
                {  
                    "NetworkID": "a59umzkdj2r0ua7x8jxd84dhr",  
                    "Addr": "10.0.0.3/24"  
                },  
]
```

> swarm中服务还有另外一种负载均衡技术可选DNS round robin (DNS RR) （在创建服务时通过--endpoint-mode配置项指定），在DNSRR模式下，docker不再为服务创建VIP，docker DNS服务直接利用轮询的策略把服务名称直接解析成一个容器的IP地址。

### 外部负载均衡

当创建或更新一个服务时，你可以利用--publish选项把一个服务暴露到外部，在docker swarm模式下发布一个端口意味着在集群中的所有节点都会监听这个端口，这时当访问一个监听了端口但是并没有对应服务运行在其上的节点会发生什么呢？

接下来就该我们的路由网（routing mesh）出场了，路由网时docker1.12引入的一个新特性，它结合了IPVS和iptables创建了一个强大的集群范围的L4层负载均衡，它使所有节点接收服务暴露端口的请求成为可能。当任意节点接收到针对某个服务暴露的TCP/UDP端口的请求时，这个节点会利用预先定义过的Ingress overlay网络，把请求转发给服务对应的虚拟IP。ingress网络和其他的overlay网络一样，只是它的目的是为了转换来自客户端到集群的请求，它也是利用我们前一小节介绍过的基于VIP的负载均衡技术。

当启动服务时，你可以为你的应用创建一个外部的DNS服务，并把它映射到你集群的任意节点或者是所有节点，你无需担心你的容器具体运行在那个节点上，因为有了路由网这个特性后，你的集群看起来就像是单独的一个节点一样。

```bash
#在集群中创建一个复制两份的服务，并暴露在8000端口  
$ docker service create --name app --replicas 2 --network appnet --publish 8000:80 nginx
```

![36][36]

上面这个图表明了路由网是怎么工作的：

- 服务（app）拥有两份复制，并把端口映射到外部端口的8000
- 路由网在集群中的所有节点上都暴露出8000
- 外部对服务app的请求可以是任意节点，在本例子中外部的负载均衡器将请求转发到了没有app服务的主机上
- docker swarm的IPVS利用ingress overlay网路将请求重新转发到运行着app服务的节点的容器中

### 负载均衡试验测试

管理节点：创建一个测试容器my_web

```bash
docker service create --replicas 3 --network my-network --name my_web nginx
```

管理节点：添加暴露端口

```bash
docker service update --publish-add 8080:80 my_web
```

管理节点：获取虚拟IP

```bash
docker service inspect -f '{{json .Endpoint.VirtualIPs}}' my_web
```

> 注：可用虚拟VIP或者服务名称去访问。

测试负载均衡：192.168.1.10:8080

```bash
curl http://192.168.1.10:8080
```

### 负载均衡模式选择

负载均衡有两种模式：VIP、DNSRR

- VIP：分配独立的虚拟IP，DNS记录解析到服务名中作为代理IP。（默认为该模式）
- dnsrr：DNS记录不解析VIP，而去解析每个容器内的IP。dnsrr模式不支持端口对外暴露。

管理节点：通过查看服务详细信息筛选当前模式负载均衡模式

```bash
docker service inspect my_web
[
            "EndpointSpec": {
                "Mode": "vip"
            }
        },
        "Endpoint": {
            "Spec": {
                "Mode": "vip",
                "Ports": [
                    {
                        "Protocol": "tcp",
                        "TargetPort": 80,
                        "PublishedPort": 8080,
                        "PublishMode": "ingress"
                    }
                ]
            },
]
```

> 注：当前模式为VIP模式。

管理节点：设置DNS轮询模式

```bash
# 创建服务
docker service create \
# 创建副本数
--replicas 3 \
# 服务名
--name my-web \
# 添加网络
--network my-network \
# 添加负载均衡模式
--endpoint-mode dnsrr \
# 镜像
nginx
```

管理节点：创建一个测试容器my_web2

```bash
docker service create --replicas 3 --network my-network --name my_web2 nginx
```

管理节点：添加dnsrr模式

```bash
docker service update --endpoint-mode dnsrr my_web2
```

工作节点：进入容器测试

```bash
docker exec -it 11b5a7ca675a sh

# 测试进入容器查看解析记录
/ # nslookup my_web2
Server: 127.0.0.11
Address: 127.0.0.11:53
Non-authoritative answer:
Name: my_web2
Address: 10.0.0.13
Name: my_web2
Address: 10.0.0.4
Name: my_web2
Address: 10.0.0.12

# 工作节点：测试进入容器多次ping服务名
/ # ping my_web2
PING my_web2 (10.0.0.4): 56 data bytes
64 bytes from 10.0.0.4: seq=0 ttl=64 time=0.116 ms
/ # ping my_web2
PING my_web2 (10.0.0.12): 56 data bytes
64 bytes from 10.0.0.12: seq=0 ttl=64 time=0.745 ms
/ # ping my_web2
PING my_web2 (10.0.0.13): 56 data bytes
64 bytes from 10.0.0.13: seq=0 ttl=64 time=0.546 ms
```

### 负载均衡模扩展知识

可在容器Swarm负载均衡之上在建立一层负载均衡。HAProxy可代理工作节点端暴露的端口进行再次代理，做到双层负载均衡的作用。保证高可用与大规模的应用。

![34][34]

## 参考

- https://docs.docker.com/engine/swarm/
- https://success.docker.com/article/ucp-service-discovery-swarm
- [Docker Swarm - 服务发现和负载均衡原理](https://www.jianshu.com/p/dba9342071d8)
- [Docker Swarm中的LB和服务发现详解](https://www.jianshu.com/p/c83a9173459f/)

[1]: /images/docker/docker-swarm-lb/1.jpg
[2]: /images/docker/docker-swarm-lb/2.jpg
[3]: /images/docker/docker-swarm-lb/3.jpg
[4]: /images/docker/docker-swarm-lb/4.jpg
[5]: /images/docker/docker-swarm-lb/5.jpg
[6]: /images/docker/docker-swarm-lb/6.png
[7]: /images/docker/docker-swarm-lb/7.png
[8]: /images/docker/docker-swarm-lb/8.png
[9]: /images/docker/docker-swarm-lb/9.png
[10]: /images/docker/docker-swarm-lb/10.png
[11]: /images/docker/docker-swarm-lb/11.png
[12]: /images/docker/docker-swarm-lb/12.png
[13]: /images/docker/docker-swarm-lb/13.png
[14]: /images/docker/docker-swarm-lb/14.jpg
[15]: /images/docker/docker-swarm-lb/15.png
[16]: /images/docker/docker-swarm-lb/16.png
[17]: /images/docker/docker-swarm-lb/17.png
[18]: /images/docker/docker-swarm-lb/18.png
[19]: /images/docker/docker-swarm-lb/19.png
[20]: /images/docker/docker-swarm-lb/20.png
[21]: /images/docker/docker-swarm-lb/21.png
[22]: /images/docker/docker-swarm-lb/22.png
[23]: /images/docker/docker-swarm-lb/23.png
[24]: /images/docker/docker-swarm-lb/24.png
[25]: /images/docker/docker-swarm-lb/25.png
[26]: /images/docker/docker-swarm-lb/26.jpg
[27]: /images/docker/docker-swarm-lb/27.png
[28]: /images/docker/docker-swarm-lb/28.png
[29]: /images/docker/docker-swarm-lb/29.png
[30]: /images/docker/docker-swarm-lb/30.png
[31]: /images/docker/docker-swarm-lb/31.png
[32]: /images/docker/docker-swarm-lb/32.png
[33]: /images/docker/docker-swarm-lb/33.png
[34]: /images/docker/docker-swarm-lb/34.png
[35]: /images/docker/docker-swarm-lb/35.png
[36]: /images/docker/docker-swarm-lb/36.png
