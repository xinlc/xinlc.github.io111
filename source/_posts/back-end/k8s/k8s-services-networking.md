---
title: Kubernetes 服务、负载均衡和网络
date: 2020-06-21 13:23:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubernetes 服务、负载均衡和网络

<!--more-->

## Service

### Service概述

参考文档：Kubernetes 官网文档：[Service](https://kubernetes.io/docs/concepts/services-networking/service/)

#### 为何需要 Service

Kubernetes 中 Pod 是随时可以消亡的（节点故障、容器内应用程序错误等原因）。如果使用 `Deployment` 运行您的应用程序，Deployment 将会在 Pod 消亡后再创建一个新的 Pod 以维持所需要的副本数。每一个 Pod 有自己的 IP 地址，然而，对于 Deployment 而言，对应 Pod 集合是动态变化的。

这个现象导致了如下问题：
* 如果某些 Pod（假设是 'backends'）为另外一些 Pod（假设是 'frontends'）提供接口，在 'backends' 中的 Pod 集合不断变化（IP 地址也跟着变化）的情况下，'frontends' 中的 Pod 如何才能知道应该将请求发送到哪个 IP 地址？

Service 存在的意义，就是为了解决这个问题。

#### Kubernetes Service

Kubernetes 中 Service 是一个 API 对象，通过 kubectl + YAML，定义一个 Service，可以将符合 Service 指定条件的 Pod 作为可通过网络访问的服务提供给服务调用者。

Service 是 Kubernetes 中的一种服务发现机制：
* Pod 有自己的 IP 地址
* Service 被赋予一个唯一的 dns name
* Service 通过 label selector 选定一组 Pod
* Service 实现负载均衡，可将请求均衡分发到选定这一组 Pod 中

例如，假设有一个无状态的图像处理后端程序运行了 3 个 Pod 副本。这些副本是相互可替代的（前端程序调用其中任何一个都可以）。在后端程序的副本集中的 Pod 经常变化（销毁、重建、扩容、缩容等）的情况下，前端程序不应该关注这些变化。

Kubernetes 通过引入 Service 的概念，将前端与后端解耦。

#### 在 Kuboard 中使用 Service

从 Kuboard 工作负载编辑器的视角来看，Service 与其他重要的 Kubernetes 对象之间的关系如下图所示：

![1][1]

图中，Service 先连线到 Controller，Controller 在连线到容器组，这种表示方式只是概念上的，期望用户在使用 Kubernetes 的时候总是通过 Controller 创建 Pod，然后再通过 Service 暴露为网络服务，通过 Ingress 对集群外提供互联网访问。

事实上，Service 与 Controller 并没有直接联系，Service 通过 label selector 选择符合条件的 Pod，并将选中的 Pod 作为网络服务的提供者。从这个意义上来讲，您可以有很多种方式去定义 Service 的 label selector，然而，最佳的实践是，在 Service 中使用与 Controller 中相同的 label selector。如上图所示。

### Service详细描述

#### 创建 Service

Kubernetes Servies 是一个 RESTFul 接口对象，可通过 yaml 文件创建。

例如，假设您有一组 Pod：
* 每个 Pod 都监听 9376 TCP 端口
* 每个 Pod 都有标签 app=MyApp

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: MyApp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
```

上述 YAML 文件可用来创建一个 Service：
* 名字为 `my-service`
* 目标端口为 TCP 9376
* 选取所有包含标签 app=MyApp 的 Pod

关于 Service，您还需要了解：

* Kubernetes 将为该 Service 分配一个 IP 地址（ClusterIP 或 集群内 IP），供 Service Proxy 使用（参考[虚拟 IP 和 Service proxy](#虚拟-ip-和-service-proxy)）
* Kubernetes 将不断扫描符合该 selector 的 Pod，并将最新的结果更新到与 Service 同名 `my-service` 的 Endpoint 对象中。
  ::: tip
  Service 从自己的 IP 地址和 `port` 端口接收请求，并将请求映射到符合条件的 Pod 的 `targetPort`。为了方便，默认 `targetPort` 的取值 与 `port` 字段相同
  :::
* Pod 的定义中，Port 可能被赋予了一个名字，您可以在 Service 的 `targetPort` 字段引用这些名字，而不是直接写端口号。这种做法可以使得您在将来修改后端程序监听的端口号，而无需影响到前端程序。
* Service 的默认传输协议是 TCP，您也可以使用其他 [支持的传输协议](#支持的传输协议)。
* Kubernetes Service 中，可以定义多个端口，不同的端口可以使用相同或不同的传输协议。

#### 创建 Service（无 label selector）

Service 通常用于提供对 Kubernetes Pod 的访问，但是您也可以将其用于任何其他形式的后端。例如：

* 您想要在生产环境中使用一个 Kubernetes 外部的数据库集群，在测试环境中使用 Kubernetes 内部的 数据库
* 您想要将 Service 指向另一个名称空间中的 Service，或者另一个 Kubernetes 集群中的 Service
* 您正在将您的程序迁移到 Kubernetes，但是根据您的迁移路径，您只将一部分后端程序运行在 Kubernetes 中

在上述这些情况下，您可以定义一个没有 Pod Selector 的 Service。例如：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
```

因为该 Service 没有 selector，相应的 Endpoint 对象就无法自动创建。您可以手动创建一个 Endpoint 对象，以便将该 Service 映射到后端服务真实的 IP 地址和端口：

``` yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
subsets:
  - addresses:
      - ip: 192.0.2.42
    ports:
      - port: 9376
```

::: tip
* Endpoint 中的 IP 地址不可以是 loopback（127.0.0.0/8 IPv4 或 ::1/128 IPv6），或 link-local（169.254.0.0/16 IPv4、224.0.0.0/24 IPv4 或 fe80::/64 IPv6）
* Endpoint 中的 IP 地址不可以是集群中其他 Service 的 ClusterIP
:::

对于 Service 的访问者来说，Service 是否有 label selector 都是一样的。在上述例子中，Service 将请求路由到 Endpoint 192.0.2.42:9376 (TCP)。

ExternalName Service 是一类特殊的没有 label selector 的 Service，该类 Service 使用 DNS 名字。参考 [ExternalName](#externalname)

#### 虚拟 IP 和服务代理

Kubernetes 集群中的每个节点都运行了一个 `kube-proxy`，负责为 Service（ExternalName 类型的除外）提供虚拟 IP 访问。

##### 为何不使用 round-robin DNS

许多用户都对 Kubernetes 为何使用服务代理将接收到的请求转发给后端服务，而不是使用其他途径，例如：是否可以为 Service 配置一个 DNS 记录，将其解析到多个 A value（如果是 IPv6 则是 AAAA value），并依赖 round-robin（循环）解析？

Kubernetes 使用在 Service 中使用 proxy 的原因大致有如下几个：
* 一直以来，DNS 软件都不确保严格检查 TTL（Time to live），并且在缓存的 dns 解析结果应该过期以后，仍然继续使用缓存中的记录
* 某些应用程序只做一次 DNS 解析，并一直使用缓存下来的解析结果
* 即使应用程序对 DNS 解析做了合适的处理，为 DNS 记录设置过短（或者 0）的 TTL 值，将给 DNS 服务器带来过大的负载

##### 版本兼容性

Kubernetes 支持三种 proxy mode（代理模式），他们的版本兼容性如下：

| 代理模式              | Kubernetes 版本 | 是否默认 |
| --------------------- | --------------- | -------- |
| User space proxy mode | v1.0 +          |          |
| Iptables proxy mode   | v1.1 +          | 默认     |
| Ipvs proxy mode       | v1.8 +          |          |

##### User space 代理模式

**在 user space proxy mode 下：**

* kube-proxy 监听 kubernetes master 以获得添加和移除 Service / Endpoint 的事件
* kube-proxy 在其所在的节点（每个节点都有 kube-proxy）上为每一个 Service 打开一个随机端口
* kube-proxy 安装 iptables 规则，将发送到该 Service 的 ClusterIP（虚拟 IP）/ Port 的请求重定向到该随机端口
* 任何发送到该随机端口的请求将被代理转发到该 Service 的后端 Pod 上（kube-proxy 从 Endpoint 信息中获得可用 Pod）
* kube-proxy 在决定将请求转发到后端哪一个 Pod 时，默认使用 round-robin（轮询）算法，并会考虑到 Service 中的 `SessionAffinity` 的设定

如下图所示：

<p>
  <img src="/images/k8s/k8s-services-networking/services-userspace-overview.svg" style="max-width: 420px;" alt="Kubernetes教程：Service user space"/>
</p>

##### Iptables 代理模式

**在 iptables proxy mode 下：**

* kube-proxy 监听 kubernetes master 以获得添加和移除 Service / Endpoint 的事件
* kube-proxy 在其所在的节点（每个节点都有 kube-proxy）上为每一个 Service 安装 iptable 规则
* iptables 将发送到 Service 的 ClusterIP / Port 的请求重定向到 Service 的后端 Pod 上
  * 对于 Service 中的每一个 Endpoint，kube-proxy 安装一个 iptable 规则
  * 默认情况下，kube-proxy 随机选择一个 Service 的后端 Pod

如下图所示：
<p>
  <img src="/images/k8s/k8s-services-networking/services-iptables-overview.svg" style="max-width: 420px;" alt="Kubernetes教程：Service iptables proxy"/>
</p>

**iptables proxy mode 的优点：**

* 更低的系统开销：在 linux netfilter 处理请求，无需在 userspace 和 kernel space 之间切换
* 更稳定

**与 user space mode 的差异：**

* 使用 iptables mode 时，如果第一个 Pod 没有响应，则创建连接失败
* 使用 user space mode 时，如果第一个 Pod 没有响应，kube-proxy 会自动尝试连接另外一个后端 Pod

您可以配置 Pod 就绪检查（readiness probe）确保后端 Pod 正常工作，此时，在 iptables 模式下 kube-proxy 将只使用健康的后端 Pod，从而避免了 kube-proxy 将请求转发到已经存在问题的 Pod 上。

##### IPVS 代理模式

**在 IPVS proxy mode 下：**

* kube-proxy 监听 kubernetes master 以获得添加和移除 Service / Endpoint 的事件
* kube-proxy 根据监听到的事件，调用 netlink 接口，创建 IPVS 规则；并且将 Service/Endpoint 的变化同步到 IPVS 规则中
* 当访问一个 Service 时，IPVS 将请求重定向到后端 Pod

<p>
  <img src="/images/k8s/k8s-services-networking/services-ipvs-overview.svg" style="max-width: 420px;" alt="Kubernetes教程：Service IPVS proxy"/>
</p>

**IPVS 模式的优点**

IPVS proxy mode 基于 netfilter 的 hook 功能，与 iptables 代理模式相似，但是 IPVS 代理模式使用 hash table 作为底层的数据结构，并在 kernel space 运作。这就意味着
* IPVS 代理模式可以比 iptables 代理模式有更低的网络延迟，在同步代理规则时，也有更高的效率
* 与 user space 代理模式 / iptables 代理模式相比，IPVS 模式可以支持更大的网络流量

**IPVS 提供更多的负载均衡选项：**
* rr: round-robin
* lc: least connection (最小打开的连接数)
* dh: destination hashing
* sh: source hashing
* sed: shortest expected delay
* nq: never queue

::: tip
* 如果要使用 IPVS 模式，您必须在启动 kube-proxy 前为节点的 linux 启用 IPVS
* kube-proxy 以 IPVS 模式启动时，如果发现节点的 linux 未启用 IPVS，则退回到 iptables 模式
:::

##### 代理模式总结

在所有的代理模式中，发送到 Service 的 IP:Port 的请求将被转发到一个合适的后端 Pod，而无需调用者知道任何关于 Kubernetes/Service/Pods 的细节。

Service 中额外字段的作用：
* `service.spec.sessionAffinity`
  * 默认值为 "None"
  * 如果设定为 "ClientIP"，则同一个客户端的连接将始终被转发到同一个 Pod
* `service.spec.sessionAffinityConfig.clientIP.timeoutSeconds`
  * 默认值为 10800 （3 小时）
  * 设定会话保持的持续时间

#### 多端口的Service

Kubernetes 中，您可以在一个 Service 对象中定义多个端口，此时，您必须为每个端口定义一个名字。如下所示：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: MyApp
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 9376
    - name: https
      protocol: TCP
      port: 443
      targetPort: 9377
```

::: tip
端口的名字必须符合 Kubernetes 的命名规则，且，端口的名字只能包含小写字母、数字、`-`，并且必须以数字或字母作为开头及结尾。

例如：

合法的 Port 名称：`123-abc`、`web`

非法的 Port 名称：`123_abc`、`-web`
:::

#### 使用自定义的 IP 地址

创建 Service 时，如果指定 `.spec.clusterIP` 字段，可以使用自定义的 Cluster IP 地址。该 IP 地址必须是 APIServer 中配置字段 `service-cluster-ip-range` CIDR 范围内的合法 IPv4 或 IPv6 地址，否则不能创建成功。

可能用到自定义 IP 地址的场景：
* 想要重用某个已经存在的 DNS 条目
* 遗留系统是通过 IP 地址寻址，且很难改造

#### 服务发现

Kubernetes 支持两种主要的服务发现模式：
* 环境变量
* DNS

##### 环境变量

kubelet 查找有效的 Service，并针对每一个 Service，向其所在节点上的 Pod 注入一组环境变量。支持的环境变量有：
* [Docker links 兼容](https://docs.docker.com/network/links/) 的环境变量
* {SVCNAME}_SERVICE_HOST 和 {SVCNAME}_SERVICE_PORT
  * Service name 被转换为大写
  * 小数点 `.` 被转换为下划线 `_`

例如，Service `redis-master` 暴露 TCP 端口 6379，其 Cluster IP 为 10.0.0.11，对应的环境变量如下所示：

```
REDIS_MASTER_SERVICE_HOST=10.0.0.11
REDIS_MASTER_SERVICE_PORT=6379
REDIS_MASTER_PORT=tcp://10.0.0.11:6379
REDIS_MASTER_PORT_6379_TCP=tcp://10.0.0.11:6379
REDIS_MASTER_PORT_6379_TCP_PROTO=tcp
REDIS_MASTER_PORT_6379_TCP_PORT=6379
REDIS_MASTER_PORT_6379_TCP_ADDR=10.0.0.11
```

::: tip
如果要在 Pod 中使用基于环境变量的服务发现方式，必须先创建 Service，再创建调用 Service 的 Pod。否则，Pod 中不会有该 Service 对应的环境变量。

如果使用基于 DNS 的服务发现，您无需担心这个创建顺序的问题
:::

##### DNS

[CoreDNS](https://coredns.io/)) 监听 Kubernetes API 上创建和删除 Service 的事件，并为每一个 Service 创建一条 DNS 记录。集群中所有的 Pod 都可以使用 DNS Name 解析到 Service 的 IP 地址。

例如，名称空间 `my-ns` 中的 Service `my-service`，将对应一条 DNS 记录 `my-service.my-ns`。 名称空间 `my-ns` 中的Pod可以直接 `nslookup my-service` （`my-service.my-ns` 也可以）。其他名称空间的 Pod 必须使用 `my-service.my-ns`。`my-service` 和 `my-service.my-ns` 都将被解析到 Service 的 Cluster IP。

Kubernetes 同样支持 DNS SRV（Service）记录，用于查找一个命名的端口。假设 `my-service.my-ns` Service 有一个 TCP 端口名为 `http`，则，您可以 `nslookup _http._tcp.my-service.my-ns` 以发现该Service 的 IP 地址及端口 `http`

对于 `ExternalName` 类型的 Service，只能通过 DNS 的方式进行服务发现。参考 [Service/Pod 的 DNS](#Service/Pod的DNS)

#### Headless Services

“Headless” Service 不提供负载均衡的特性，也没有自己的 IP 地址。创建 “headless” Service 时，只需要指定 `.spec.clusterIP` 为 "None"。

“Headless” Service 可以用于对接其他形式的服务发现机制，而无需与 Kubernetes 的实现绑定。

对于 “Headless” Service 而言：
* 没有 Cluster IP
* kube-proxy 不处理这类 Service
* Kubernetes不提供负载均衡或代理支持

DNS 的配置方式取决于该 Service 是否配置了 selector：

* 配置了 Selector
  
  Endpoints Controller 创建 `Endpoints` 记录，并修改 DNS 配置，使其直接返回指向 selector 选取的 Pod 的 IP 地址

* 没有配置 Selector

  Endpoints Controller 不创建 `Endpoints` 记录。DNS服务返回如下结果中的一种：
  * 对 ExternalName 类型的 Service，返回 CNAME 记录
  * 对于其他类型的 Service，返回与 Service 同名的 `Endpoints` 的 A 记录

#### 虚拟 IP 的实现

如果只是想要正确使用 Service，不急于理解 Service 的实现细节，您无需阅读本章节。

##### 避免冲突

Kubernetes 的一个设计哲学是：尽量避免非人为错误产生的可能性。就设计 Service 而言，Kubernetes 应该将您选择的端口号与其他人选择的端口号隔离开。为此，Kubernetes 为每一个 Service 分配一个该 Service 专属的 IP 地址。

为了确保每个 Service 都有一个唯一的 IP 地址，kubernetes 在创建 Service 之前，先更新 etcd 中的一个全局分配表，如果更新失败（例如 IP 地址已被其他 Service 占用），则 Service 不能成功创建。

Kubernetes 使用一个后台控制器检查该全局分配表中的 IP 地址的分配是否仍然有效，并且自动清理不再被 Service 使用的 IP 地址。

##### Service 的 IP 地址

Pod 的 IP 地址路由到一个确定的目标，然而 Service 的 IP 地址则不同，通常背后并不对应一个唯一的目标。 kube-proxy 使用 iptables （Linux 中的报文处理逻辑）来定义虚拟 IP 地址。当客户端连接到该虚拟 IP 地址时，它们的网络请求将自动发送到一个合适的 Endpoint。Service 对应的环境变量和 DNS 实际上反应的是 Service 的虚拟 IP 地址（和端口）。

###### Userspace

以上面提到的图像处理程序为例。当后端 Service 被创建时，Kubernetes master 为其分配一个虚拟 IP 地址（假设是 10.0.0.1），并假设 Service 的端口是 1234。集群中所有的 kube-proxy 都实时监听者 Service 的创建和删除。Service 创建后，kube-proxy 将打开一个新的随机端口，并设定 iptables 的转发规则（以便将该 Service 虚拟 IP 的网络请求全都转发到这个新的随机端口上），并且 kube-proxy 将开始接受该端口上的连接。

当一个客户端连接到该 Service 的虚拟 IP 地址时，iptables 的规则被触发，并且将网络报文重定向到 kube-proxy 自己的随机端口上。kube-proxy 接收到请求后，选择一个后端 Pod，再将请求以代理的形式转发到该后端 Pod。

这意味着 Service 可以选择任意端口号，而无需担心端口冲突。客户端可以直接连接到一个 IP:port，无需关心最终在使用哪个 Pod 提供服务。

###### iptables

仍然以上面提到的图像处理程序为例。当后端 Service 被创建时，Kubernetes master 为其分配一个虚拟 IP 地址（假设是 10.0.0.1），并假设 Service 的端口是 1234。集群中所有的 kube-proxy 都实时监听者 Service 的创建和删除。Service 创建后，kube-proxy 设定了一系列的 iptables 规则（这些规则可将虚拟 IP 地址映射到 per-Service 的规则）。per-Service 规则进一步链接到 per-Endpoint 规则，并最终将网络请求重定向（使用 destination-NAT）到后端 Pod。

当一个客户端连接到该 Service 的虚拟 IP 地址时，iptables 的规则被触发。一个后端 Pod 将被选中（基于 session affinity 或者随机选择），且网络报文被重定向到该后端 Pod。与 userspace proxy 不同，网络报文不再被复制到 userspace，kube-proxy 也无需处理这些报文，且报文被直接转发到后端 Pod。

在使用 node-port 或 load-balancer 类型的 Service 时，以上的代理处理过程是相同的。

###### IPVS

在一个大型集群中（例如，存在 10000 个 Service）iptables 的操作将显著变慢。IPVS 的设计是基于 in-kernel hash table 执行负载均衡。因此，使用 IPVS 的 kube-proxy 在 Service 数量较多的情况下仍然能够保持好的性能。同时，基于 IPVS 的 kube-proxy 可以使用更复杂的负载均衡算法（最少连接数、基于地址的、基于权重的等）

#### 支持的传输协议

##### TCP

默认值。任何类型的 Service 都支持 TCP 协议。

##### UDP

大多数 Service 都支持 UDP 协议。对于 LoadBalancer 类型的 Service，是否支持 UDP 取决于云供应商是否支持该特性。

##### HTTP

如果您的云服务商支持，您可以使用 LoadBalancer 类型的 Service 设定一个 Kubernetes 外部的 HTTP/HTTPS 反向代理，将请求转发到 Service 的 Endpoints。

> 使用 Ingress

##### Proxy Protocol

如果您的云服务上支持（例如 AWS），您可以使用 LoadBalancer 类型的 Service 设定一个 Kubernetes 外部的负载均衡器，并将连接已 PROXY 协议转发到 Service 的 Endpoints。

负载均衡器将先发送描述该 incoming 连接的字节串，如下所示：

```
PROXY TCP4 192.0.2.202 10.0.42.7 12345 7\r\n
```

然后在发送来自于客户端的数据

##### SCTP

尚处于 `alpha` 阶段，暂不推荐使用。如需了解，请参考 [SCTP](https://kubernetes.io/docs/concepts/services-networking/service/#sctp)

### 发布Service

Kubernetes Service 支持的不同访问方式。

#### Service 类型

Kubernetes 中可以通过不同方式发布 Service，通过 `ServiceType` 字段指定，该字段的默认值是 `ClusterIP`，可选值有：

* **ClusterIP**: 默认值。通过集群内部的一个 IP 地址暴露 Service，只在集群内部可以访问

* **NodePort**: 通过每一个节点上的的静态端口（NodePort）暴露 Service，同时自动创建 ClusterIP 类型的访问方式
  * 在集群内部通过 $(ClusterIP): $(Port) 访问
  * 在集群外部通过 $(NodeIP): $(NodePort) 访问

* **LoadBalancer**: 通过云服务供应商（AWS、Azure、GCE 等）的负载均衡器在集群外部暴露 Service，同时自动创建 NodePort 和 ClusterIP 类型的访问方式
  * 在集群内部通过 $(ClusterIP): $(Port) 访问
  * 在集群外部通过 $(NodeIP): $(NodePort) 访问
  * 在集群外部通过 $(LoadBalancerIP): $(Port) 访问

  ::: tip 替代方案
  * LoadBalancer 类型的 Service，可以自动调用云服务商在 IaaS 层面的接口，并自动创建 LoadBalancer，将其指向该 Service。
  * 如果是自建k8s，建议用户先创建 NodePort 类型的 Service，再手工创建 LoadBalancer，将其配置到各节点上对应的 Service 的 NodePort。此操作最终效果与 LoadBalancer 类型 Service 的效果相同
  :::

* **ExternalName**: 将 Service 映射到 `externalName` 指定的地址（例如：foo.bar.example.com），返回值是一个 CNAME 记录。不使用任何代理机制。

  > 如使用 ExternalName 类型的 Service，CoreDNS 版本不能低于 1.7

#### ClusterIP

ClusterIP 是 ServiceType 的默认值。在 [Iptables 代理模式](#iptables-代理模式) 中，详细讲述了 ClusterIP 类型 Service 的工作原理。

#### NodePort

对于 `NodePort` 类型的 Service，Kubernetes 为其分配一个节点端口（对于同一 Service，在每个节点上的节点端口都相同），该端口的范围在初始化 apiserver 时可通过参数 `--service-node-port-range` 指定（默认是：30000-32767，可以修改）。节点将该端口上的网络请求转发到对应的 Service 上。可通过 Service 的 `.spec.ports[*].nodePort` 字段查看该 Service 分配到的节点端口号。

在启动 kube-proxy 时使用参数 `--nodeport-address` 可指定阶段端口可以绑定的 IP 地址段。该参数接收以逗号分隔的 CIDR 作为参数值（例如：10.0.0.0/8,192.0.2.0/25），kube-proxy 将查找本机符合该 CIDR 的 IP 地址，并将节点端口绑定到符合的 IP 地址上。

例如，
* 如果启动 kube-proxy 时指定了参数 `--nodeport-address=127.0.0.0/8`，则 kube-proxy 只将阶段端口绑定到 loopback 地址上。
* `--nodeport-address` 的默认值是一个空列表。则 kube-proxy 将节点端口绑定到该节点所有的网络 IP 地址上。

您可以通过 `nodePort` 字段指定节点端口号（必须在 `--service-node-port-range` 指定的范围内）。Kubernetes 在创建 Service 时将使用该节点端口，如果该端口已被占用，则创建 Service 将不能成功。在这种情况下，您必须自己规划好端口使用，以避免端口冲突。

使用 NodePort，您可以：
* 根据自己的需要配置负载均衡器
* 配置 Kubernetes / 非 Kubernetes 的混合环境
* 直接暴露一到多个节点的 IP 地址，以便客户端可访问 Kubernetes 中的 Service

NodePort 类型的 Service 可通过如下方式访问：
* 在集群内部通过 $(ClusterIP): $(Port) 访问
* 在集群外部通过 $(NodeIP): $(NodePort) 访问

#### LoadBalancer

在支持外部负载均衡器的云环境中（例如 GCE、AWS、Azure 等），将 `.spec.type` 字段设置为 `LoadBalancer`，Kubernetes 将为该Service 自动创建一个负载均衡器。负载均衡器的创建操作异步完成，您可能要稍等片刻才能真正完成创建，负载均衡器的信息将被回写到 Service 的 `.status.loadBalancer` 字段。如下所示：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: MyApp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
  clusterIP: 10.0.171.239
  loadBalancerIP: 78.11.24.19
  type: LoadBalancer
status:
  loadBalancer:
    ingress:
      - ip: 146.148.47.155
```

发送到外部负载均衡器的网络请求就像被转发到 Kubernetes 中的后端 Pod 上。负载均衡的实现细节由各云服务上确定。

关于更多 LoadBalancer Service 相关的描述，请参考 [Type LoadBalancer](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer) 和您所使用的云供应商的文档

#### ExternalName

ExternalName 类型的 Service 映射到一个外部的 DNS name，而不是一个 pod label selector。可通过 `spec.externalName` 字段指定外部 DNS name。

下面的例子中，名称空间 `prod` 中的 Service `my-service` 将映射到 `my.database.example.com`：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: prod
spec:
  type: ExternalName
  externalName: my.database.example.com
```

执行 `nslookup my-service.prod.svc.cluster.local` 指令时，集群的 DNS 服务将返回一个 `CNAME` 记录，其对应的值为 `my.database.example.com`。访问 `my-service` 与访问其他类型的 Service 相比，网络请求的转发发生在 DNS level，而不是使用 proxy。如果您在后续想要将 `my.database.example.com` 对应的数据库迁移到集群内部来，您可以按如下步骤进行：
1. 在 Kubernetes 中部署数据库（并启动数据库的 Pod）
2. 为 Service 添加合适的 selector 和 endpoint
3. 修改 Service 的类型

::: tip 注意事项
* ExternalName 可以接受一个 IPv4 地址型的字符串作为 `.spec.externalName` 的值，但是这个字符串将被认为是一个由数字组成的 DNS name，而不是一个 IP 地址。
* 如果要 hardcode 一个 IP 地址，请考虑使用 [headless Service](#headless-services)
:::

#### External IP

如果有外部 IP 路由到 Kubernetes 集群的一个或多个节点，Kubernetes Service 可以通过这些 `externalIPs` 进行访问。`externalIP` 需要由集群管理员在 Kubernetes 之外配置。

在 Service 的定义中， `externalIPs` 可以和任何类型的 `.spec.type` 一通使用。在下面的例子中，客户端可通过 `80.11.12.10:80` （externalIP:port） 访问`my-service` 

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: MyApp
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 9376
  externalIPs:
    - 80.11.12.10
```

### Service/Pod的DNS

本文介绍了 Kubernetes 中的 DNS 分配方式

#### 概述

Kubernetes 集群中运行了一组 DNS Pod，配置了对应的 Service，并由 kubelete 将 DNS Service 的 IP 地址配置到节点上的容器中以便解析 DNS names。

集群中的每一个 Service（包括 DNS 服务本身）都将被分配一个 DNS name。默认情况下，客户端 Pod 的 DNS 搜索列表包括 Pod 所在的名称空间以及集群的默认域。例如：

假设名称空间 `bar` 中有一个 Service 名为 `foo`：
* 名称空间 `bar` 中的 Pod 可以通过 `nslookup foo` 查找到该 Service
* 名称空间 `quux` 中的 Pod 可以通过 `nslookup foo.bar` 查找到该 Service

本文后面的章节详细介绍了支持的 DNS 记录类型及格式。如果有任何其他类型的格式凑巧可以使用，这仅仅是实现上的细节，并且可能在将来的版本中失效。参考此文档可以查看最新的规范 [Kubernetes DNS-Based Service Discovery](https://github.com/kubernetes/dns/blob/master/docs/specification.md)

#### Services

##### A 记录

* Service（headless Service 除外）将被分配一个 DNS A 记录，格式为 `my-svc.my-namespace.svc.cluster-domain.example`。该 DNS 记录解析到 Service 的 ClusterIP。

* Headless Service（没有 ClusterIP）也将被分配一个 DNS A 记录，格式为 `my-svc.my-namespace.svc.cluster-domain.example`。该 DNS 记录解析到 Service 所选中的一组 Pod 的 IP 地址的集合。调用者应该使用该 IP 地址集合，或者按照轮询（round-robin）的方式从集合中选择一个 IP 地址使用。

##### SRV 记录

Service（含 headless Service）的命名端口（有 name 的端口）将被分配一个 SRV 记录，其格式为 `_my-port-name._my-port-protocol.my-svc.my-namespace.svc.cluster-domain.example`：
* 对于一个普通 Service（非 headless Service），该 SRV 记录解析到其端口号和域名 `my-svc.my-namespace.svc.cluster-domain.example`
* 对于一个 Headless Service，该 SRV 记录解析到多个结果：每一个结果都对应该 Service 的一个后端 Pod，包含其端口号和 Pod 的域名 `auto-generated-pod-name.my-svc.my-namespace.svc.cluster-domain.example`

#### Pods

##### Pod 的 hostname / subdomain

Kubernetes 在创建 Pod 时，将 Pod 定义中的 `metadata.name` 的值作为 Pod 实例的 hostname。

Pod 定义中有一个可选字段 `spec.hostname` 可用来直接指定 Pod 的 hostname。例如，某 Pod 的 `spec.hostname` 字段被设置为 `my-host`，则该 Pod 创建后 hostname 将被设为 `my-host`

Pod 定义中还有一个可选字段 `spec.subdomain` 可用来指定 Pod 的 subdomain。例如，名称空间 `my-namespace` 中，某 Pod 的 hostname 为 `foo`，并且 subdomain 为 `bar`，则该 Pod 的完整域名（FQDN）为 `foo.bar.my-namespace.svc.cluster-domain.example`。

例子：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: default-subdomain
spec:
  selector:
    name: busybox
  clusterIP: None
  ports:
  - name: foo # Actually, no port is needed.
    port: 1234
    targetPort: 1234
---
apiVersion: v1
kind: Pod
metadata:
  name: busybox1
  labels:
    name: busybox
spec:
  hostname: busybox-1
  subdomain: default-subdomain
  containers:
  - image: busybox:1.28
    command:
      - sleep
      - "3600"
    name: busybox
---
apiVersion: v1
kind: Pod
metadata:
  name: busybox2
  labels:
    name: busybox
spec:
  hostname: busybox-2
  subdomain: default-subdomain
  containers:
  - image: busybox:1.28
    command:
      - sleep
      - "3600"
    name: busybox
```

如果 Pod 所在名称空间中存在一个 headless Service，其名称与 Pod 的 subdomain 相同，则集群的 KubeDNS 服务器仍将为 Pod 的完整域名（FQDN）返回一个 A 记录。例如，假设一个 Pod 的 hostname 为 `busybox-1` 且其 subdomain 为 `default-subdomain`，同名称空间下有一个 headless Service 的名字为 `default-subdomain`，此时，该 Pod 的完整域名（FQDN）为 `busybox-1.default-subdomain.my-namespace.svc.cluster-domain.example`。DNS 服务将其解析到一个 A 记录，指向 Pod 的 IP 地址。上面 yaml 文件中的 Pod `busybox1` 和 `busybox2` 都将有各自的 A 记录

::: tip 备注
* A 记录不是根据 Pod name 创建的，而是根据 hostname 创建的。如果一个 Pod 没有 hostname 只有 subdomain，则 Kubernetes 将只为其 headless Service 创建一个 A 记录 `default-subdomain.my-namespace.svc.cluster-domain.example`，该记录指向 Pod 的 IP 地址。
* Pod 必须达到就绪状态才可以拥有 A 记录，除非 Service 的字段 `spec.publishNotReadyAddresses` 被设置为 `True`
:::

<!-- The Endpoints object can specify the hostname for any endpoint addresses, along with its IP. -->

##### Pod 的 DNS Policy

可以为每一个 Pod 设置其自己的 DNS Policy。Kubernetes 通过 Pod 定义中的 `spec.dnsPolicy` 字段设置 DNS Policy，可选的值有：

* **Default**： Pod 从其所在的节点继承域名解析配置。更多细节请参考 [Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/#inheriting-dns-from-the-node)

* **ClusterFirst**：任何与集群域名后缀（例如 `www.kubernetes.io`）不匹配的 DNS 查询，都将被转发到 Pod 所在节点的上游 DNS 服务。集群管理员可能配置了额外的 stub-domain 及上游 DNS 服务，更多细节请参考 [Customizing DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/#effects-on-pods)

* **ClusterFirstWithHostNet**： 对于运行在节点网络上的 Pod，其 dnsPolicy 必须指定为 `ClusterFirstWithHostNet`

* **None**： 允许 Pod 忽略 Kubernetes 环境中的 DNS 设置。此时，该 Pod 的 DNS 的所有设置必须通过 `spce.dnsConfig` 指定。 参考 [Pod 的 DNS 配置](#pod-的-dns-配置)

::: warning dnsPolicy的默认值
**“Default”** 并非是默认的 DNS Policy。如果 `spec.dnsPolicy` 字段未指定，则 **“ClusterFirst”** 将被默认使用
:::

下面的例子中的 Pod，其 DNS Policy 必须设置为 **“ClusterFirstWithHostNet”**，因为它的 `hostNetwork` 字段为 `true`

``` yaml {15,16}
apiVersion: v1
kind: Pod
metadata:
  name: busybox
  namespace: default
spec:
  containers:
  - image: busybox:1.28
    command:
      - sleep
      - "3600"
    imagePullPolicy: IfNotPresent
    name: busybox
  restartPolicy: Always
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
```

#### Pod 的 DNS 配置

在 Kubernetes 中，您可以直接配置 Pod 的 DNS 设置。

Pod 定义中的 `spec.dnsConfig` 是可选字段，且可以与任何类型的 `spec.dnsPolicy` 配合使用。如果 `spec.dnsPolicy` 被设置为 **“None”**，则 `spec.dnsConfig` 必须被指定。

`spec.dnsConfig` 中有如下字段可以配置：

* **nameservers**： Pod 的 DNS Server IP 地址列表。最多可以执行 3 个 IP 地址。当 `spec.dnsPolicy` 为 **“None”**，至少需要指定一个 IP 地址，其他情况下该字段是可选的。DNS Server 的 IP 地址列表将会与 DNS Policy 所产生的 DNS Server 地址列表合并（重复的条目被去除）。

* **searches**：Pod 中执行域名查询时搜索域的列表。该字段是可选的。如果指定了该字段，则指定的搜索域列表将与 DNS Policy 所产生的搜索域列表合并（重复的条目被去除）。合并后的列表最多不超过 6 个域。

* **options**：可选数组，其中每个元素由 **name** 字段（必填）和 **value** 字段（选填）组成。该列表中的内容将与 DNS Policy 所产生的 DNS 选项合并（重复的条目被去除）

``` yaml
apiVersion: v1
kind: Pod
metadata:
  namespace: default
  name: dns-example
spec:
  containers:
    - name: test
      image: nginx
  dnsPolicy: "None"
  dnsConfig:
    nameservers:
      - 1.2.3.4
    searches:
      - ns1.svc.cluster-domain.example
      - my.dns.search.suffix
    options:
      - name: ndots
        value: "2"
      - name: edns0
```

上述 Pod 创建后，容器 `test` 的 `etc/resolv.conf` 文件如下所示（从 `spec.dnsConfig` 的配置产生），执行命令 `kubectl exec -it dns-example -- cat /etc/resolv.conf` 可查看该文件内容：

```
nameserver 1.2.3.4
search ns1.svc.cluster-domain.example my.dns.search.suffix
options ndots:2 edns0
```

如果集群使用的是 IPv6，执行命令 `kubectl exec -it dns-example -- cat /etc/resolv.conf` 的输出结果如下所示：

```
nameserver fd00:79:30::a
search default.svc.cluster-domain.example svc.cluster-domain.example cluster-domain.example
options ndots:5
```

##### 版本兼容性

Pod 定义中的 `spec.dnsConfig` 和 `spec.dnsPolicy=None` 的兼容性如下：

| Kubernetes 版本号 | 支持情况         |
| ----------------- | ---------------- |
| 1.14              | Stable           |
| 1.10              | Beta（默认启用） |
| 1.9               | Alpha            |

### Example：Service连接应用程序

#### Kubernetes 的网络模型

通过前面教程的学习，我们已经可以将容器化的应用程序在 Kubernetes 中运行起来，并且发布到 Kubernetes 内/外的网络上。

通常，Docker 使用一种 `host-private` 的联网方式，在此情况下，只有两个容器都在同一个节点（主机）上时，一个容器才可以通过网络连接另一个容器。为了使 Docker 容器可以跨节点通信，必须在宿主节点（主机）的 IP 地址上分配端口，并将该端口接收到的网络请求转发（或代理）到容器中。这意味着，用户必须非常小心地为容器分配宿主节点（主机）的端口号，或者端口号可以自动分配。

在一个集群中，多个开发者之间协调分配端口号是非常困难的。Kubernetes 认为集群中的两个 Pod 应该能够互相通信，无论他们各自在哪个节点上。每一个 Pod 都被分配自己的 **“cluster-private-IP”**，因此，您无需在 Pod 间建立连接，或者将容器的端口映射到宿主机的端口。因此：
* Pod 中的任意容器可以使用 localhost 直连同 Pod 中另一个容器的端口
* 集群中的任意 Pod 可以使用另一的 Pod 的 **cluster-private-IP** 直连对方的端口，（无需 NAT 映射）

本文档的后续章节使用了一个 nginx server 的例子，详细阐述了如何使用这种网络模型发布 Service。

#### 在集群中部署 Pod

在前面的学习中，我们已经部署过 nginx 应用，此处，我们将该应用再部署一次，并将关注点放在网络连接方面（请留意该 Pod 指定了一个 containerPort）。

* 创建文件 `run-my-nginx.yaml`，文件内容如下

``` yaml {19}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-nginx
spec:
  selector:
    matchLabels:
      run: my-nginx
  replicas: 2
  template:
    metadata:
      labels:
        run: my-nginx
    spec:
      containers:
      - name: my-nginx
        image: nginx
        ports:
        - containerPort: 80
```

* 执行以下命令，部署 Pod 并检查运行情况：

```sh
kubectl apply -f ./run-my-nginx.yaml
kubectl get pods -l run=my-nginx -o wide
```

输出结果如下：

```
NAME                        READY     STATUS    RESTARTS   AGE       IP            NODE
my-nginx-3800858182-jr4a2   1/1       Running   0          13s       10.244.3.4    kubernetes-minion-905m
my-nginx-3800858182-kna2y   1/1       Running   0          13s       10.244.2.5    kubernetes-minion-ljyd
```

* 执行命令 `kubectl get pods -l run=my-nginx -o yaml | grep podIP`， 检查 Pod 的 IP 地址，输出结果如下：

```
  podIP: 10.244.3.4
  podIP: 10.244.2.5
```

在集群中的任意节点上，您可以执行 `curl 10.244.3.4` 或 `curl 10.244.2.5` 获得 nginx 的响应。此时：
* 容器并没有使用节点上的 80 端口
* 没有使用 NAT 规则对容器端口进行映射

这意味着，您可以
* 在同一节点上使用 80 端口运行多个 nginx Pod
* 在集群的任意节点/Pod 上使用 nginx Pod 的 clusterIP 访问 nginx 的 80 端口

同 Docker 一样，Kubernets 中，仍然可以将 Pod 的端口映射到宿主节点的网络地址上（使用 nodePort），但是使用 Kubernetes 的网络模型时，这类需求已经大大减少了。

如果对该网络模型的实现细节感兴趣，请参考 [Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)

#### 创建 Service

上面的步骤中，我们已经创建了 nginx Pod，运行在集群的 IP 地址空间。您可以直接通过 Pod 的地址访问其端口，但是如果某一个 Pod 终止了该怎么办？Pod 因为故障或其他原因终止后，Deployment Controller 将创建一个新的 Pod 以替代该 Pod，但是 IP 地址将发生变化。Kubernetes Service 解决了这样的问题。

Kubernetes Service：
* 定义了集群中一组 Pod 的逻辑集合，该集合中的 Pod 提供了相同的功能
* 被创建后，获得一个唯一的 IP 地址（ClusterIP）。直到该 Service 被删除，此地址不会发生改变
* Pod 可以直接连接 Service IP 地址上的端口，且发送到该 IP 地址的网络请求被自动负载均衡分发到 Service 所选取的 Pod 集合中

执行命令 `kubectl expose deployment/my-nginx` 可以为上面的两个 nginx Pod 创建 Service，输出结果如下所示：

```
service/my-nginx exposed
```

该命令等价于 `kubectl apply -f nginx-svc.yaml`，其中 nginx-svc.yaml 文件的内容如下所示：

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nginx
  labels:
    run: my-nginx
spec:
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
  selector:
    run: my-nginx
```

该 yaml 文件将创建一个 Service：
* 该 Service 通过 label selector 选取包含 `run: my-nginx` 标签的 Pod 作为后端 Pod
* 该 Service 暴露一个端口 80（`spec.ports[*].port`）
* 该 Service 将 80 端口上接收到的网络请求转发到后端 Pod 的 80 （`spec.ports[*].targetPort`）端口上，支持负载均衡

执行命令 `kubectl get svc my-nginx`，输出结果如下所示：

```
NAME       TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
my-nginx   ClusterIP   10.0.162.149   <none>        80/TCP    21s
```

Service 的后端 Pod 实际上通过 `Endpoints` 来暴露。Kubernetes 会持续检查 Service 的 label selector `spec.selector`，并将符合条件的 Pod 更新到与 Service 同名（my-nginx）的 Endpoints 对象。如果 Pod 终止了，该 Pod 将被自动从 Endpoints 中移除，新建的 Pod 将自动被添加到该 Endpoint。

执行命令 `kubectl describe svc my-nginx`，输出结果如下，请注意 Endpoints 中的 IP 地址与上面获得的 Pod 地址相同：

``` {9}
Name:                my-nginx
Namespace:           default
Labels:              run=my-nginx
Annotations:         <none>
Selector:            run=my-nginx
Type:                ClusterIP
IP:                  10.0.162.149
Port:                <unset> 80/TCP
Endpoints:           10.244.2.5:80,10.244.3.4:80
Session Affinity:    None
Events:              <none>
```

执行命令 `kubectl get ep my-nginx`，输出结果如下：

```
NAME       ENDPOINTS                     AGE
my-nginx   10.244.2.5:80,10.244.3.4:80   1m
```

此时，您可以在集群的任意节点上执行 `curl 10.0.162.149:80`，通过 Service 的 ClusterIP:Port 访问 nginx。

::: tip
Service 的 IP 地址是虚拟地址。请参考 [虚拟 IP 的实现](#虚拟-ip-的实现)
:::

#### 访问 Service

Kubernetes 支持两种方式发现服务：
* 环境变量 参考 [环境变量](环境变量)
* DNS  参考 [DNS](#dns)

::: tip
由于如下原因，您可能不想激活 Service 的环境变量发现机制：
* 可能与应用程序的环境变量冲突
* 太多的环境变量
* 只想使用 DNS 等

您可以在 Pod 的定义中，将 `enableServiceLinks` 标记设置为 `false`
:::

##### 环境变量

针对每一个有效的 Service，kubelet 在创建 Pod 时，向 Pod 添加一组环境变量。这种做法引发了一个 Pod 和 Service 的顺序问题。例如，
* 执行命令 `kubectl exec my-nginx-3800858182-jr4a2 -- printenv | grep SERVICE` （您的 Pod 名字可能不一样），输出结果如下：

  ```
  KUBERNETES_SERVICE_HOST=10.0.0.1
  KUBERNETES_SERVICE_PORT=443
  KUBERNETES_SERVICE_PORT_HTTPS=443
  ```
  请注意，此时环境变量中没有任何与您的 Service 相关的内容。因为在本教程的前面部分，我们先创建了 Pod 的副本，后创建了 Service。如果我们删除已有的两个 Pod，Deployment 将重新创建 Pod 以替代被删除的 Pod。此时，因为在创建 Pod 时，Service 已经存在，所以我们可以在新的 Pod 中查看到 Service 的环境变量被正确设置。

* 执行命令 `kubectl delete pods -l run=my-nginx`以删除 Pod
* 执行命令 `kubectl get pods -l run=my-nginx -o wide` 查看新建Pod，输出结果如下：
  ```
  NAME                        READY     STATUS    RESTARTS   AGE     IP            NODE
  my-nginx-3800858182-e9ihh   1/1       Running   0          5s      10.244.2.7    kubernetes-minion-ljyd
  my-nginx-3800858182-j4rm4   1/1       Running   0          5s      10.244.3.8    kubernetes-minion-905m
  ```
* 执行命令 `kubectl exec my-nginx-3800858182-e9ihh -- printenv | grep SERVICE` （Pod 重建后，名字将会发生变化。请使用您的 Pod 名），输出结果如下，Service 相关的环境变量已经被正确设置
  ```
  KUBERNETES_SERVICE_PORT=443
  MY_NGINX_SERVICE_HOST=10.0.162.149
  KUBERNETES_SERVICE_HOST=10.0.0.1
  MY_NGINX_SERVICE_PORT=80
  KUBERNETES_SERVICE_PORT_HTTPS=443
  ```

##### DNS

Kubernetes 提供了一个 DNS cluster addon，可自动为 Service 分配 DNS name。

执行命令 `kubectl get services kube-dns --namespace=kube-system` 查看该 addon 在您的集群上是否可用，输出结果如下所示：

```
NAME       TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
kube-dns   ClusterIP   10.0.0.10    <none>        53/UDP,53/TCP   8m
```

本章节假设：
* 您已经按照本文前面的章节创建了 Service（my-nginx）
* 您已经安装了 DNS Server（CoreDNS cluster addon）

此时，您可以从集群中任何 Pod 中按 Service 的名称访问该 Service。

* 执行命令 `kubectl run curl --image=radial/busyboxplus:curl -i --tty` 获得 busyboxplus 容器的命令行终端，该命令输出结果如下所示：

```
Waiting for pod default/curl-131556218-9fnch to be running, status is Pending, pod ready: false
Hit enter for command prompt
```

* 然后，单击回车键，并执行命令 `nslookup my-nginx`，输出结果如下所示：

  ```
  [ root@curl-131556218-9fnch:/ ]$ nslookup my-nginx
  Server:    10.0.0.10
  Address 1: 10.0.0.10

  Name:      my-nginx
  Address 1: 10.0.162.149
  ```

* 执行命令 `curl my-nginx:80`，可获得 Nginx 的响应。

* 执行命令 `exit` 可推出该容器的命令行

* 执行命令 `kubectl delete deployment curl` 可删除刚才创建的 `curl` 测试容器

#### 保护 Service 的安全

到目前为止，我们只是从集群内部访问了 nginx server。在将该 Service 公布到互联网时，您可能需要确保该通信渠道是安全的。为此，您必须：

* 准备 https 证书（购买，或者自签名）
* 将该 nginx 服务配置好，并使用该 https 证书
* 配置 Secret，以使得其他 Pod 可以使用该证书

您可按照如下步骤配置 nginx 使用自签名证书：

* 创建密钥对
  ``` sh
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /d/tmp/nginx.key -out /d/tmp/nginx.crt -subj "/CN=my-nginx/O=my-nginx"
  ```
* 将密钥对转换为 base64 编码
  ``` sh
  cat /d/tmp/nginx.crt | base64
  cat /d/tmp/nginx.key | base64
  ```
* 创建一个如下格式的 nginxsecrets.yaml 文件，使用前面命令输出的 base64 编码替换其中的内容（base64编码内容不能换行）(请使用前面两行命令生成的结果替换 nginx.crt 和 nginx.key 的内容，)
  ```yaml
  apiVersion: "v1"
  kind: "Secret"
  metadata:
    name: "nginxsecret"
    namespace: "default"
  data:
    nginx.crt: "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURIekNDQWdlZ0F3SUJBZ0lKQUp5M3lQK0pzMlpJTUEwR0NTcUdTSWIzRFFFQkJRVUFNQ1l4RVRBUEJnTlYKQkFNVENHNW5hVzU0YzNaak1SRXdEd1lEVlFRS0V3aHVaMmx1ZUhOMll6QWVGdzB4TnpFd01qWXdOekEzTVRKYQpGdzB4T0RFd01qWXdOekEzTVRKYU1DWXhFVEFQQmdOVkJBTVRDRzVuYVc1NGMzWmpNUkV3RHdZRFZRUUtFd2h1CloybHVlSE4yWXpDQ0FTSXdEUVlKS29aSWh2Y05BUUVCQlFBRGdnRVBBRENDQVFvQ2dnRUJBSjFxSU1SOVdWM0IKMlZIQlRMRmtobDRONXljMEJxYUhIQktMSnJMcy8vdzZhU3hRS29GbHlJSU94NGUrMlN5ajBFcndCLzlYTnBwbQppeW1CL3JkRldkOXg5UWhBQUxCZkVaTmNiV3NsTVFVcnhBZW50VWt1dk1vLzgvMHRpbGhjc3paenJEYVJ4NEo5Ci82UVRtVVI3a0ZTWUpOWTVQZkR3cGc3dlVvaDZmZ1Voam92VG42eHNVR0M2QURVODBpNXFlZWhNeVI1N2lmU2YKNHZpaXdIY3hnL3lZR1JBRS9mRTRqakxCdmdONjc2SU90S01rZXV3R0ljNDFhd05tNnNTSzRqYUNGeGpYSnZaZQp2by9kTlEybHhHWCtKT2l3SEhXbXNhdGp4WTRaNVk3R1ZoK0QrWnYvcW1mMFgvbVY0Rmo1NzV3ajFMWVBocWtsCmdhSXZYRyt4U1FVQ0F3RUFBYU5RTUU0d0hRWURWUjBPQkJZRUZPNG9OWkI3YXc1OUlsYkROMzhIYkduYnhFVjcKTUI4R0ExVWRJd1FZTUJhQUZPNG9OWkI3YXc1OUlsYkROMzhIYkduYnhFVjdNQXdHQTFVZEV3UUZNQU1CQWY4dwpEUVlKS29aSWh2Y05BUUVGQlFBRGdnRUJBRVhTMW9FU0lFaXdyMDhWcVA0K2NwTHI3TW5FMTducDBvMm14alFvCjRGb0RvRjdRZnZqeE04Tzd2TjB0clcxb2pGSW0vWDE4ZnZaL3k4ZzVaWG40Vm8zc3hKVmRBcStNZC9jTStzUGEKNmJjTkNUekZqeFpUV0UrKzE5NS9zb2dmOUZ3VDVDK3U2Q3B5N0M3MTZvUXRUakViV05VdEt4cXI0Nk1OZWNCMApwRFhWZmdWQTRadkR4NFo3S2RiZDY5eXM3OVFHYmg5ZW1PZ05NZFlsSUswSGt0ejF5WU4vbVpmK3FqTkJqbWZjCkNnMnlwbGQ0Wi8rUUNQZjl3SkoybFIrY2FnT0R4elBWcGxNSEcybzgvTHFDdnh6elZPUDUxeXdLZEtxaUMwSVEKQ0I5T2wwWW5scE9UNEh1b2hSUzBPOStlMm9KdFZsNUIyczRpbDlhZ3RTVXFxUlU9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K"
    nginx.key: "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRQ2RhaURFZlZsZHdkbFIKd1V5eFpJWmVEZWNuTkFhbWh4d1NpeWF5N1AvOE9ta3NVQ3FCWmNpQ0RzZUh2dGtzbzlCSzhBZi9WemFhWm9zcApnZjYzUlZuZmNmVUlRQUN3WHhHVFhHMXJKVEVGSzhRSHA3VkpMcnpLUC9QOUxZcFlYTE0yYzZ3MmtjZUNmZitrCkU1bEVlNUJVbUNUV09UM3c4S1lPNzFLSWVuNEZJWTZMMDUrc2JGQmd1Z0ExUE5JdWFubm9UTWtlZTRuMG4rTDQKb3NCM01ZUDhtQmtRQlAzeE9JNHl3YjREZXUraURyU2pKSHJzQmlIT05Xc0RadXJFaXVJMmdoY1kxeWIyWHI2UAozVFVOcGNSbC9pVG9zQngxcHJHclk4V09HZVdPeGxZZmcvbWIvNnBuOUYvNWxlQlkrZStjSTlTMkQ0YXBKWUdpCkwxeHZzVWtGQWdNQkFBRUNnZ0VBZFhCK0xkbk8ySElOTGo5bWRsb25IUGlHWWVzZ294RGQwci9hQ1Zkank4dlEKTjIwL3FQWkUxek1yall6Ry9kVGhTMmMwc0QxaTBXSjdwR1lGb0xtdXlWTjltY0FXUTM5SjM0VHZaU2FFSWZWNgo5TE1jUHhNTmFsNjRLMFRVbUFQZytGam9QSFlhUUxLOERLOUtnNXNrSE5pOWNzMlY5ckd6VWlVZWtBL0RBUlBTClI3L2ZjUFBacDRuRWVBZmI3WTk1R1llb1p5V21SU3VKdlNyblBESGtUdW1vVlVWdkxMRHRzaG9reUxiTWVtN3oKMmJzVmpwSW1GTHJqbGtmQXlpNHg0WjJrV3YyMFRrdWtsZU1jaVlMbjk4QWxiRi9DSmRLM3QraTRoMTVlR2ZQegpoTnh3bk9QdlVTaDR2Q0o3c2Q5TmtEUGJvS2JneVVHOXBYamZhRGR2UVFLQmdRRFFLM01nUkhkQ1pKNVFqZWFKClFGdXF4cHdnNzhZTjQyL1NwenlUYmtGcVFoQWtyczJxWGx1MDZBRzhrZzIzQkswaHkzaE9zSGgxcXRVK3NHZVAKOWRERHBsUWV0ODZsY2FlR3hoc0V0L1R6cEdtNGFKSm5oNzVVaTVGZk9QTDhPTm1FZ3MxMVRhUldhNzZxelRyMgphRlpjQ2pWV1g0YnRSTHVwSkgrMjZnY0FhUUtCZ1FEQmxVSUUzTnNVOFBBZEYvL25sQVB5VWs1T3lDdWc3dmVyClUycXlrdXFzYnBkSi9hODViT1JhM05IVmpVM25uRGpHVHBWaE9JeXg5TEFrc2RwZEFjVmxvcG9HODhXYk9lMTAKMUdqbnkySmdDK3JVWUZiRGtpUGx1K09IYnRnOXFYcGJMSHBzUVpsMGhucDBYSFNYVm9CMUliQndnMGEyOFVadApCbFBtWmc2d1BRS0JnRHVIUVV2SDZHYTNDVUsxNFdmOFhIcFFnMU16M2VvWTBPQm5iSDRvZUZKZmcraEppSXlnCm9RN3hqWldVR3BIc3AyblRtcHErQWlSNzdyRVhsdlhtOElVU2FsbkNiRGlKY01Pc29RdFBZNS9NczJMRm5LQTQKaENmL0pWb2FtZm1nZEN0ZGtFMXNINE9MR2lJVHdEbTRpb0dWZGIwMllnbzFyb2htNUpLMUI3MkpBb0dBUW01UQpHNDhXOTVhL0w1eSt5dCsyZ3YvUHM2VnBvMjZlTzRNQ3lJazJVem9ZWE9IYnNkODJkaC8xT2sybGdHZlI2K3VuCnc1YytZUXRSTHlhQmd3MUtpbGhFZDBKTWU3cGpUSVpnQWJ0LzVPbnlDak9OVXN2aDJjS2lrQ1Z2dTZsZlBjNkQKckliT2ZIaHhxV0RZK2Q1TGN1YSt2NzJ0RkxhenJsSlBsRzlOZHhrQ2dZRUF5elIzT3UyMDNRVVV6bUlCRkwzZAp4Wm5XZ0JLSEo3TnNxcGFWb2RjL0d5aGVycjFDZzE2MmJaSjJDV2RsZkI0VEdtUjZZdmxTZEFOOFRwUWhFbUtKCnFBLzVzdHdxNWd0WGVLOVJmMWxXK29xNThRNTBxMmk1NVdUTThoSDZhTjlaMTltZ0FGdE5VdGNqQUx2dFYxdEYKWSs4WFJkSHJaRnBIWll2NWkwVW1VbGc9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K"
  ```
* 使用该文件创建 Secrets
  ``` sh
  # 创建 Secrets
  kubectl apply -f nginxsecrets.yaml
  # 查看 Secrets
  kubectl get secrets
  ```
  输出结果为：
  ```
  NAME                  TYPE                                  DATA      AGE
  default-token-il9rc   kubernetes.io/service-account-token   1         1d
  nginxsecret           Opaque                                2         1m
  ```
* 修改 nginx 部署，使 nginx 使用 Secrets 中的 https 证书，修改 Service，使其暴露 80 端口和 443端口。nginx-secure-app.yaml 文件如下所示：

  ``` yaml {10,11,14,37,45,46}
  apiVersion: v1
  kind: Service
  metadata:
    name: my-nginx
    labels:
      run: my-nginx
  spec:
    type: NodePort
    ports:
    - port: 80
      targetPort: 80
      protocol: TCP
      name: http
    - port: 443
      protocol: TCP
      name: https
    selector:
      run: my-nginx
  ---
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: my-nginx
  spec:
    selector:
      matchLabels:
        run: my-nginx
    replicas: 1
    template:
      metadata:
        labels:
          run: my-nginx
      spec:
        volumes:
        - name: secret-volume
          secret:
            secretName: nginxsecret
        containers:
        - name: nginxhttps
          image: bprashanth/nginxhttps:1.0
          ports:
          - containerPort: 443
          - containerPort: 80
          volumeMounts:
          - mountPath: /etc/nginx/ssl
            name: secret-volume
  ```
  ::: tip 关于 nginx-secure-app.yaml
  * 该文件同时包含了 Deployment 和 Service 的定义
  * nginx server 监听 HTTP 80 端口和 HTTPS 443 端口的请求， nginx Service 同时暴露了这两个端口
  * nginx 容器可以通过 `/etc/nginx/ssl` 访问到 https 证书，https 证书存放在 Secrets 中，且必须在 Pod 创建之前配置好。
  :::

* 执行命令使该文件生效：
  ``` sh
  kubectl delete deployments,svc my-nginx
  kubectl create -f ./nginx-secure-app.yaml
  ```
* 此时，您可以从任何节点访问该 nginx server
  ``` sh
  kubectl get pods -o yaml | grep -i podip
      podIP: 10.244.3.5
  node $ curl -k https://10.244.3.5
  ...
  <h1>Welcome to nginx!</h1>
  ```
  ::: tip curl -k
  * 在 curl 命令中指定 —k 参数，是因为我们在生成 https 证书时，并不知道 Pod 的 IP 地址，因此，在执行 curl 命令时必须忽略 CName 不匹配的错误。
  * 通过创建 Service，我们将 https 证书的 CName 和 Service 的实际 DNS Name 联系起来，因此，我们可以尝试在另一个 Pod 中使用 https 证书的公钥访问 nginx Service。此时，curl 指令不在需要 -k 参数
  :::

* 创建 curlpod.yaml 文件，内容如下：

  ``` yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: curl-deployment
  spec:
    selector:
      matchLabels:
        app: curlpod
    replicas: 1
    template:
      metadata:
        labels:
          app: curlpod
      spec:
        volumes:
        - name: secret-volume
          secret:
            secretName: nginxsecret
        containers:
        - name: curlpod
          command:
          - sh
          - -c
          - while true; do sleep 1; done
          image: radial/busyboxplus:curl
          volumeMounts:
          - mountPath: /etc/nginx/ssl
            name: secret-volume
  ```

* 执行命令，完成 curlpod 的部署

  ``` sh
  kubectl apply -f ./curlpod.yaml
  kubectl get pods -l app=curlpod
  ```
  输出结果如下：
  ```
  NAME                               READY     STATUS    RESTARTS   AGE
  curl-deployment-1515033274-1410r   1/1       Running   0          1m
  ```
* 执行 curl，访问 nginx 的 https 端口（请使用您自己的 Pod 名称）
  ```sh
  kubectl exec curl-deployment-1515033274-1410r -- curl https://my-nginx --cacert /etc/nginx/ssl/nginx.crt
  ...
  <title>Welcome to nginx!</title>
  ...
  ```

#### 暴露 Service

在您的应用程序中，可能有一部分功能需要通过 Service 发布到一个外部的 IP 地址上。Kubernetes 支持如下两种方式：
* [NodePort](#nodeport)
* [LoadBalancer](#loadbalancer)
  * 需要云环境支持，本文不做过多阐述，如需了解，请参考 [Exposing the Service](https://kubernetes.io/docs/concepts/services-networking/connect-applications-service/#exposing-the-service)

在上一个章节 [保护 Service 的安全](#保护-service-的安全)  中创建的 Service 已经是 NodePort 类型的了，此时，如果您的节点有公网地址，则 nginx HTTPS 部署已经可以接受来自于互联网的请求了。

执行命令 `kubectl get svc my-nginx -o yaml | grep nodePort -C 5`，输出结果如下：
> 结果中的 `nodePort` 将被标记为红色字体
``` {5,10}
spec:
  clusterIP: 10.0.162.149
  ports:
  - name: http
    nodePort: 31704
    port: 8080
    protocol: TCP
    targetPort: 80
  - name: https
    nodePort: 32453
    port: 443
    protocol: TCP
    targetPort: 443
  selector:
    run: my-nginx
```

假设您的某一节点的公网 IP 地址为 23.251.152.56，则您可以使用任意一台可上网的机器执行命令 `curl https://23.251.152.56:32453 -k`。输出结果为：

```
...
<h1>Welcome to nginx!</h1>
```

::: tip Ingress
* 对于 HTTP、HTTPS 形式的访问推荐使用 Ingress 替代这种用法，参考 [Ingress通过互联网访问您的应用](#Ingress通过互联网访问您的应用)
* 对于 TCP、UDP 等形式的访问，您仍然应该使用 Service NodePort
:::

## Ingress通过互联网访问您的应用

参考文档：
* Kubernetes 官网 [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
* Kubernetes 官网 [Ingress Controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)
* Kubernetes Nginx Ingress Controller [Bare-metal considerations](https://kubernetes.github.io/ingress-nginx/deploy/baremetal/)
* nginxinc/kubernets-ingress [kubernetes-ingress](https://github.com/nginxinc/kubernetes-ingress)

### Ingress

Ingress 是 Kubernetes 的一种 API 对象，将集群内部的 Service 通过 HTTP/HTTPS 方式暴露到集群外部，并通过规则定义 HTTP/HTTPS 的路由。Ingress 具备如下特性：集群外部可访问的 URL、负载均衡、SSL Termination、按域名路由（name-based virtual hosting）。

Ingress Controller （通常需要负载均衡器配合）负责实现 Ingress API 对象所声明的能力。如下图所示：

1. Ingress Controller 监听所有 worker 节点上的 80/443 端口
2. Ingress Controller 将所有对域名为 a.kuboard.cn 的 HTTP/HTTPS 请求路由到 Service B 的 9080 端口
3. Service B 将请求进一步转发到其标签所选择的 Pod 容器组（通过 targetPort 指定容器组上的端口号）

该图中，**请求被转发的过程为：**

0. 假设您将 a.kuboard.cn 的 DNS 解析到了集群中的一个 worker 节点的 IP 地址 `192.168.2.69`。（如果您的 worker 节点有外网地址，请使用外网地址，这样您可以从外网访问您的服务）
1. 从客户端机器执行命令 `curl http://a.kuboard.cn/abc/`，该请求您将被转发到 `192.168.2.69` 这个地址的 80 端口，并被 Ingress Controller 接收
2. Ingress Controller 根据请求的域名 `a.kuboard.cn` 和路径 `abc` 匹配集群中所有的 Ingress 信息，并最终找到 `Ingress B` 中有这个配置，其对应的 Service 为 `Service B` 的 `9080` 端口
3. Ingress Controller 通过 kube-proxy 将请求转发到 `Service B` 对应的任意一个 Pod 上 与 `Service B` 的 `9080` 端口对应的容器端口上。（从 Ingress Controller 到 Pod 的负载均衡由 kube-proxy + Service 实现）

<p style="max-width: 720px;">
<img src="/images/k8s/k8s-services-networking/image-20190910222649193.png" alt="Kubernetes教程：Ingress及其Controller"></img>
</p>

### Ingress Controller

如上所述，您必须在 Kubernetes 集群中安装了 Ingress Controller，您配置的 Ingress 才能生效。

::: tip 划重点

Ingress 只是 Kubernetes 中的一种配置信息；Ingress Controller 才是监听 80/443 端口，并根据 Ingress 上配置的路由信息执行 HTTP 路由转发的组件。

:::

Ingress Controller 有多种实现可供选择，请参考 Kubernetes 官方文档 [Additional controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#additional-controllers)，比较常用的有 [Traefic](https://github.com/containous/traefik) 、 [Nginx Ingress Controller for Kubernetes](https://www.nginx.com/products/nginx/kubernetes-ingress-controller) 等。

如果您参考 https://kuboard.cn 网站上提供的文档安装了 Kubernetes，您应该已经完成了 [Nginx Ingress Controller for Kubernetes](https://www.nginx.com/products/nginx/kubernetes-ingress-controller) 在您 Kubernetes 集群中的安装。该 Ingress Controller 以 DaemonSet 的类型部署到 Kubernetes，且监听了 hostPort 80/443，YAML 片段如下所示：

``` yaml {2,23,26}
apiVersion: extensions/v1beta1
kind: DaemonSet
metadata:
  name: nginx-ingress
  namespace: nginx-ingress
	# ...
spec:
  selector:
    matchLabels:
      app: nginx-ingress
  template:
    metadata:
      labels:
        app: nginx-ingress
    spec:
      serviceAccountName: nginx-ingress
      containers:
      - image: nginx/nginx-ingress:1.5.5
        name: nginx-ingress
        ports:
        - name: http
          containerPort: 80
          hostPort: 80
        - name: https
          containerPort: 443
          hostPort: 443
```

::: tip

* Ingress Controller 并非只能监听 80/443 端口，您可以根据自己网络拓扑的需要，选择合适的端口
* 根据您安装 Ingress Controller 的方式不同，您的 Ingress Controller 并不一定监听了所有 worker 节点的 80/443 端口（本教程不涉及此主题）
* 您也可以在 Kubernetes 集群中安装多种 Ingress Controller，请参考 [Using multiple Ingress controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#using-multiple-ingress-controllers)

:::

### 融入到网络拓扑中

如前所述，Kubernetes Ingress 只能监听到节点的 80/443 端口，且 Ingress 可以完成 L7 路由的功能。由于 Kubernetes Ingress 配置更便捷，推荐使用 Kubernetes Ingress 替代常规的互联网应用架构中的 Nginx 反向代理。那么，如何使部署在内网的 Kubernetes 集群上的 Ingress Controller 的 80/443 端口可以在外网访问到呢？

本教程推荐如下两种做法，结合您自己对安全性、可靠性等因素的考量，您可以演化出适合自己的拓扑结构。

#### 暴露单worker节点

如下图所示，暴露单个 worker 节点的步骤如下：

* 为您 Kubernetes 集群中的某一个 worker 节点配置外网 IP 地址 Z.Z.Z.Z
* 将您在 Ingress 中使用到的域名（假设是`a.demo.kuboard.cn`）解析到该外网 IP 地址 Z.Z.Z.Z
* 设置合理的安全组规则（开放该外网 IP 地址 80/443 端口的入方向访问）

![Kubernetes教程：单IngressController节点](/images/k8s/k8s-installation/3.jpg)

#### 使用外部负载均衡器

如下图所示，使用外部负载均衡器的步骤如下：

* 创建一个集群外部的负载均衡器，该负载均衡器拥有一个外网 IP 地址 Z.Z.Z.Z，并监听 80/443 端口的 TCP 协议
* 将负载均衡器在 80/443 端口上监听到的 TCP 请求转发到 Kubernetes 集群中所有（或某些）worker 节点的 80/443 端口，可开启按源IP地址的会话保持
* 将您在 Ingress 中使用到的域名（假设是`a.demo.kuboard.cn`）解析到该负载均衡器的外网 IP 地址 Z.Z.Z.Z

![Kubernetes教程：LoadBalancer](/images/k8s/k8s-installation/4.jpg)

### 实战：通过 Ingress 使您的应用程序在互联网可用

**创建文件 nginx-deployment.yaml**
``` sh
vim nginx-deployment.yaml
```

**文件内容如下**

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
```

**创建文件 nginx-service.yaml**
``` sh
vim nginx-service.yaml
```

**文件内容如下**

``` yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
  labels:
    app: nginx
spec:
  selector:
    app: nginx
  ports:
  - name: nginx-port
    protocol: TCP
    port: 80
    nodePort: 32600
    targetPort: 80
  type: NodePort
```

**创建文件 nginx-ingress.yaml**
``` sh
vim nginx-ingress.yaml
```

**文件内容如下**

``` yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: my-ingress-for-nginx  # Ingress 的名字，仅用于标识
spec:
  rules:                      # Ingress 中定义 L7 路由规则
  - host: a.demo.kuboard.cn   # 根据 virtual hostname 进行路由（请使用您自己的域名）
    http:
      paths:                  # 按路径进行路由
      - path: /
        backend:
          serviceName: nginx-service  # 指定后端的 Service 为之前创建的 nginx-service
          servicePort: 80
```

**执行命令**

``` sh
kubectl apply -f nginx-deployment.yaml
kubectl apply -f nginx-service.yaml
kubectl apply -f nginx-ingress.yaml
```

**检查执行结果**

``` sh
kubectl get ingress -o wide
```

可查看到名称为 my-ingress-for-nginx 的 Ingress。

**从互联网访问**

``` sh
# 请使用您自己的域名
curl a.demo.kuboard.cn
```

## 配置Pod的 /etc/hosts

> 参考文档：[Adding entries to Pod /etc/hosts with HostAliases](https://kubernetes.io/docs/concepts/services-networking/add-entries-to-pod-etc-hosts-with-host-aliases/)

某些情况下，DNS 或者其他的域名解析方法可能不太适用，您需要配置 /etc/hosts 文件，在Linux下是比较容易做到的，在 Kubernetes 中，可以通过 Pod 定义中的 `hostAliases` 字段向 Pod 的 /etc/hosts 添加条目。

适用其他方法修改 Pod 的 /etc/hosts 文件是不被推荐的，因为 kubelet 可能在重新创建 Pod 时，就会覆盖这些修改。

### 默认hosts文件内容

通过创建一个 Nginx Pod，我们可以查看Pod创建后，/etc/hosts 文件的默认内容，执行命令：

``` sh
kubectl run nginx --image nginx --generator=run-pod/v1
```

执行命令查看 Pod 的IP：

``` sh
kubectl get pods -o wide
```
输出结果如下所示：
```
NAME     READY     STATUS    RESTARTS   AGE    IP           NODE
nginx    1/1       Running   0          13s    10.200.0.4   worker0
```

执行命令查看hosts文件的内容
``` sh
kubectl exec nginx -- cat /etc/hosts
```

输出结果如下所示：

```
# Kubernetes-managed hosts file.
127.0.0.1	localhost
::1	localhost ip6-localhost ip6-loopback
fe00::0	ip6-localnet
fe00::0	ip6-mcastprefix
fe00::1	ip6-allnodes
fe00::2	ip6-allrouters
10.200.0.4	nginx
```

默认情况下， `hosts` 文件只包含 IPv4 和 IPv6 的基本配置，例如 `localhost` 和该 Pod 自己的 hostname。

### 使用hostAliases添加额外的条目

通过 Pod 定义中的 `.spec.hostAliases` 字段，我们可以向 Pod 的 `/etc/hosts` 文件中添加额外的条目，用来解析 `foo.local`、`bar.local` 到 `127.0.0.1 和` `foo.remote`、`bar.remote` 到 `10.1.2.3`，如下所示：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hostaliases-pod
spec:
  restartPolicy: Never
  hostAliases:
  - ip: "127.0.0.1"
    hostnames:
    - "foo.local"
    - "bar.local"
  - ip: "10.1.2.3"
    hostnames:
    - "foo.remote"
    - "bar.remote"
  containers:
  - name: cat-hosts
    image: busybox
    command:
    - cat
    args:
    - "/etc/hosts"
```

执行一下命令可创建该 Pod：
``` sh
kubectl apply -f host-aliases-pod.yaml
```

执行命令查看 Pod 的 IP 和状态：
``` sh
kubectl get pod --output=wide
```

输出结果如下所示：

```
NAME                           READY     STATUS      RESTARTS   AGE       IP              NODE
hostaliases-pod                0/1       Completed   0          6s        10.200.0.5      worker0
```

执行命令查看 hosts 文件内容：

``` sh
kubectl logs hostaliases-pod
```

输出结果如下所示：

```
# Kubernetes-managed hosts file.
127.0.0.1	localhost
::1	localhost ip6-localhost ip6-loopback
fe00::0	ip6-localnet
fe00::0	ip6-mcastprefix
fe00::1	ip6-allnodes
fe00::2	ip6-allrouters
10.200.0.5	hostaliases-pod

# Entries added by HostAliases.
127.0.0.1	foo.local	bar.local
10.1.2.3	foo.remote	bar.remote
```

从结果中，我们可以看到，配置的条目被添加在 `/etc/hosts` 文件的末尾。

### 为什么kubelet要管理hosts文件

Kubelet [管理](https://github.com/kubernetes/kubernetes/issues/14633) `hosts` Pod 中每个容器的 hosts 文件，以便可以阻止 Docker 在容器启动以后 [修改](https://github.com/moby/moby/issues/17190) 该文件。

细节情况请参考两个 github issue：

[https://github.com/kubernetes/kubernetes/issues/14633](https://github.com/kubernetes/kubernetes/issues/14633)

[https://github.com/moby/moby/issues/17190](https://github.com/moby/moby/issues/17190)

由于该文件已经被 Kubelet 管理起来，任何对该文件手工修改的内容，都将在 Kubelet 重启容器或者 Pod 重新调度时被覆盖。因此，最好是通过 `hostAliases` 修改 Pod 的 /etc/hosts 文件，而不是手工修改。

## 如何选择网络插件

> 本文转载自： [kubernetes网络插件对比分析（flannel、calico、weave）](https://www.toutiao.com/a6708893686517727748/)
>
> 原文作者：残花花败柳柳

本文将在介绍技术原理和相应术语的基础上，再集中探索与详细对比目前最流行的CNI插件：

- Flannel
- Calico
- Weave

### 介绍

网络架构是Kubernetes中较为复杂、让很多用户头疼的方面之一。Kubernetes网络模型本身对某些特定的网络功能有一定要求，但在实现方面也具有一定的灵活性。因此，业界已有不少不同的网络方案，来满足特定的环境和要求。

CNI意为容器网络接口，它是一种标准的设计，为了让用户在容器创建或销毁时都能够更容易地配置容器网络。在本文中，我们将集中探索与对比目前最流行的CNI插件：Flannel、Calico、Weave和Canal（技术上是多个插件的组合）。这些插件既可以确保满足Kubernetes的网络要求，又能为Kubernetes集群管理员提供他们所需的某些特定的网络功能。

### 背景

容器网络是容器选择连接到其他容器、主机和外部网络（如Internet）的机制。容器的Runtime提供了各种网络模式，每种模式都会产生不同的体验。

例如，Docker默认情况下可以为容器配置以下网络：

- none：将容器添加到一个容器专门的网络堆栈中，没有对外连接。
- host：将容器添加到主机的网络堆栈中，没有隔离。
- default bridge：默认网络模式。每个容器可以通过IP地址相互连接。
- 自定义网桥：用户定义的网桥，具有更多的灵活性、隔离性和其他便利功能。

Docker还可以让用户通过其他驱动程序和插件，来配置更高级的网络（包括多主机覆盖网络）。

CNI的初衷是创建一个框架，用于在配置或销毁容器时动态配置适当的网络配置和资源。下面链接中的CNI规范概括了用于配制网络的插件接口，这个接口可以让容器运行时与插件进行协调：

[CND SPEC](https://github.com/containernetworking/cni/blob/master/SPEC.md)

插件负责为接口配置和管理IP地址，并且通常提供与IP管理、每个容器的IP分配、以及多主机连接相关的功能。容器运行时会调用网络插件，从而在容器启动时分配IP地址并配置网络，并在删除容器时再次调用它以清理这些资源。

运行时或协调器决定了容器应该加入哪个网络以及它需要调用哪个插件。然后，插件会将接口添加到容器网络命名空间中，作为一个veth对的一侧。接着，它会在主机上进行更改，包括将veth的其他部分连接到网桥。再之后，它会通过调用单独的IPAM（IP地址管理）插件来分配IP地址并设置路由。

在Kubernetes中，kubelet可以在适当的时间调用它找到的插件，来为通过kubelet启动的pod进行自动的网络配置。

### 术语

在对CNI插件们进行比较之前，我们可以先对网络中会见到的相关术语做一个整体的了解。不论是阅读本文，还是今后接触到其他和CNI有关的内容，了解一些常见术语总是非常有用的。

一些最常见的术语包括：

- **第2层网络**：OSI（Open Systems Interconnections，开放系统互连）网络模型的“数据链路”层。第2层网络会处理网络上两个相邻节点之间的帧传递。第2层网络的一个值得注意的示例是以太网，其中MAC表示为子层。
- **第3层网络**：OSI网络模型的“网络”层。第3层网络的主要关注点，是在第2层连接之上的主机之间路由数据包。IPv4、IPv6和ICMP是第3层网络协议的示例。
- **VXLAN**：代表“虚拟可扩展LAN”。首先，VXLAN用于通过在UDP数据报中封装第2层以太网帧来帮助实现大型云部署。VXLAN虚拟化与VLAN类似，但提供更大的灵活性和功能（VLAN仅限于4096个网络ID）。VXLAN是一种封装和覆盖协议，可在现有网络上运行。
- **Overlay网络**：Overlay网络是建立在现有网络之上的虚拟逻辑网络。Overlay网络通常用于在现有网络之上提供有用的抽象，并分离和保护不同的逻辑网络。
- **封装**：封装是指在附加层中封装网络数据包以提供其他上下文和信息的过程。在overlay网络中，封装被用于从虚拟网络转换到底层地址空间，从而能路由到不同的位置（数据包可以被解封装，并继续到其目的地）。
- **网状网络**：网状网络（Mesh network）是指每个节点连接到许多其他节点以协作路由、并实现更大连接的网络。网状网络允许通过多个路径进行路由，从而提供更可靠的网络。网状网格的缺点是每个附加节点都会增加大量开销。
- **BGP**：代表“边界网关协议”，用于管理边缘路由器之间数据包的路由方式。BGP通过考虑可用路径，路由规则和特定网络策略，帮助弄清楚如何将数据包从一个网络发送到另一个网络。BGP有时被用作CNI插件中的路由机制，而不是封装的覆盖网络。

了解了技术术语和支持各类插件的各种技术之后，下面我们可以开始探索一些最流行的CNI插件了。

### CNI比较

**Flannel**

![Kubernetes教程：kubernetes网络插件对比分析（flannel、calico、weave）](/images/k8s/k8s-services-networking/04c2db500e1b4b5dae3be817bfe6d673.jpeg)

[flannel github 仓库](https://github.com/coreos/flannel)

由CoreOS开发的项目Flannel，可能是最直接和最受欢迎的CNI插件。它是容器编排系统中最成熟的网络结构示例之一，旨在实现更好的容器间和主机间网络。随着CNI概念的兴起，Flannel CNI插件算是早期的入门。

与其他方案相比，Flannel相对容易安装和配置。它被打包为单个二进制文件FlannelD，许多常见的Kubernetes集群部署工具和许多Kubernetes发行版都可以默认安装Flannel。Flannel可以使用Kubernetes集群的现有etcd集群来使用API存储其状态信息，因此不需要专用的数据存储。

Flannel配置第3层IPv4 Overlay网络。它会创建一个大型内部网络，跨越集群中每个节点。在此Overlay网络中，每个节点都有一个子网，用于在内部分配IP地址。在配置Pod时，每个节点上的Docker桥接口都会为每个新容器分配一个地址。同一主机中的Pod可以使用Docker桥接进行通信，而不同主机上的pod会使用flanneld将其流量封装在UDP数据包中，以便路由到适当的目标。

Flannel有几种不同类型的后端可用于封装和路由。默认和推荐的方法是使用VXLAN，因为VXLAN性能更良好并且需要的手动干预更少。

总的来说，Flannel是大多数用户的不错选择。从管理角度来看，它提供了一个简单的网络模型，用户只需要一些基础知识，就可以设置适合大多数用例的环境。一般来说，在初期使用Flannel是一个稳妥安全的选择，直到你开始需要一些它无法提供的东西。

**Calico**

![Kubernetes教程：kubernetes网络插件对比分析（flannel、calico、weave）](/images/k8s/k8s-services-networking/79fa00ed4bcb4d9b94aee1d02b3c5c8c.jpeg)

[Calico github 仓库](https://github.com/projectcalico/cni-plugin)

Calico是Kubernetes生态系统中另一种流行的网络选择。虽然Flannel被公认为是最简单的选择，但Calico以其性能、灵活性而闻名。Calico的功能更为全面，不仅提供主机和pod之间的网络连接，还涉及网络安全和管理。Calico CNI插件在CNI框架内封装了Calico的功能。

在满足系统要求的新配置的Kubernetes集群上，用户可以通过应用单个manifest文件快速部署Calico。如果您对Calico的可选网络策略功能感兴趣，可以向集群应用其他manifest，来启用这些功能。

尽管部署Calico所需的操作看起来相当简单，但它创建的网络环境同时具有简单和复杂的属性。与Flannel不同，Calico不使用overlay网络。相反，Calico配置第3层网络，该网络使用BGP路由协议在主机之间路由数据包。这意味着在主机之间移动时，不需要将数据包包装在额外的封装层中。BGP路由机制可以本地引导数据包，而无需额外在流量层中打包流量。

除了性能优势之外，在出现网络问题时，用户还可以用更常规的方法进行故障排除。虽然使用VXLAN等技术进行封装也是一个不错的解决方案，但该过程处理数据包的方式同场难以追踪。使用Calico，标准调试工具可以访问与简单环境中相同的信息，从而使更多开发人员和管理员更容易理解行为。

除了网络连接外，Calico还以其先进的网络功能而闻名。 网络策略是其最受追捧的功能之一。此外，Calico还可以与服务网格Istio集成，以便在服务网格层和网络基础架构层中解释和实施集群内工作负载的策略。这意味着用户可以配置强大的规则，描述Pod应如何发送和接受流量，提高安全性并控制网络环境。

如果对你的环境而言，支持网络策略是非常重要的一点，而且你对其他性能和功能也有需求，那么Calico会是一个理想的选择。此外，如果您现在或未来有可能希望得到技术支持，那么Calico是提供商业支持的。一般来说，当您希望能够长期控制网络，而不是仅仅配置一次并忘记它时，Calico是一个很好的选择。

**Weave**

![Kubernetes教程：kubernetes网络插件对比分析（flannel、calico、weave）](/images/k8s/k8s-services-networking/67b4097c58df478cb348ad50ea752f12.jpeg)

[weave 官网](https://www.weave.works/oss/net/)

Weave是由Weaveworks提供的一种Kubernetes CNI网络选项，它提供的模式和我们目前为止讨论的所有网络方案都不同。Weave在集群中的每个节点之间创建网状Overlay网络，参与者之间可以灵活路由。这一特性再结合其他一些独特的功能，在某些可能导致问题的情况下，Weave可以智能地路由。

为了创建网络，Weave依赖于网络中每台主机上安装的路由组件。然后，这些路由器交换拓扑信息，以维护可用网络环境的最新视图。当需要将流量发送到位于不同节点上的Pod时，Weave路由组件会自动决定是通过“快速数据路径”发送，还是回退到“sleeve”分组转发的方法。

快速数据路径依靠内核的本机Open vSwitch数据路径模块，将数据包转发到适当的Pod，而无需多次移入和移出用户空间。Weave路由器会更新Open vSwitch配置，以确保内核层具有有关如何路由传入数据包的准确信息。相反，当网络拓扑不适合快速数据路径路由时，sleeve模式可用作备份。它是一种较慢的封装模式，在快速数据路径缺少必要的路由信息或连接的情况下，它可以来路由数据包。当流量通过路由器时，它们会了解哪些对等体与哪些MAC地址相关联，从而允许它们以更少的跳数、更智能地路由后续流量。当网络更改导致可用路由改变时，这一相同的机制可以帮助每个节点进行自行更正。

与Calico一样，Weave也为Kubernetes集群提供网络策略功能。设置Weave时，网络策略会自动安装和配置，因此除了添加网络规则之外，用户无需进行其他配置。一个其他网络方案都没有、Weave独有的功能，是对整个网络的简单加密。虽然这会增加相当多的网络开销，但Weave可以使用NaCl加密来为sleeve流量自动加密所有路由流量，而对于快速数据路径流量，因为它需要加密内核中的VXLAN流量，Weave会使用IPsec ESP来加密快速数据路径流量。

对于那些寻求功能丰富的网络、同时希望不要增加大量复杂性或管理难度的人来说，Weave是一个很好的选择。它设置起来相对容易，提供了许多内置和自动配置的功能，并且可以在其他解决方案可能出现故障的场景下提供智能路由。网状拓扑结构确实会限制可以合理容纳的网络的大小，不过对于大多数用户来说，这也不是一个大问题。此外，Weave也提供收费的技术支持，可以为企业用户提供故障排除等等技术服务。

### **结语**

Kubernetes采用的CNI标准，让Kubernetes生态系统中的网络解决方案百花齐放。更多样的选择，意味着大多数用户将能够找到适合其当前需求和部署环境的CNI插件，同时还可以在环境发生变化时也能找到新的解决方案。

不同企业之间的运营要求差异很大，因此拥有一系列具有不同复杂程度和功能丰富性的成熟解决方案，大大有助于Kubernetes在满足不同用户独特需求的前提下，仍然能够提供一致的用户体验。

## 网络策略

### Network Policies

> 参考文档： [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

Kubernetes 中，Network Policy（网络策略）定义了一组 Pod 是否允许相互通信，或者与网络中的其他端点 endpoint 通信。

`NetworkPolicy` 对象使用标签选择Pod，并定义规则指定选中的Pod可以执行什么样的网络通信

#### 前提条件

Network Policy 由网络插件实现，因此，您使用的网络插件必须能够支持 `NetworkPolicy` 才可以使用此特性。如果您仅仅是创建了一个 Network Policy 对象，但是您使用的网络插件并不支持此特性，您创建的 Network Policy 对象是不生效的。

#### Isolated/Non-isolated Pods

默认情况下，Pod 都是非隔离的（non-isolated），可以接受来自任何请求方的网络请求。

如果一个 NetworkPolicy 的标签选择器选中了某个 Pod，则该 Pod 将变成隔离的（isolated），并将拒绝任何不被 NetworkPolicy 许可的网络连接。（名称空间中其他未被 NetworkPolicy 选中的 Pod 将认可接受来自任何请求方的网络请求。）

Network Police 不会相互冲突，而是相互叠加的。如果多个 NetworkPolicy 选中了同一个 Pod，则该 Pod 可以接受这些 NetworkPolicy 当中任何一个 NetworkPolicy 定义的（入口/出口）规则，是所有NetworkPolicy规则的并集，因此，NetworkPolicy 的顺序并不重要，因为不会影响到最终的结果。

#### NetworkPolicy对象

参考 [NetworkPolicy](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#networkpolicy-v1-networking-k8s-io) 可了解 NetworkPolicy 对象的完整定义。

一个 NetworkPolicy 的 Example 如下所示：

``` yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: db
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - ipBlock:
        cidr: 172.17.0.0/16
        except:
        - 172.17.1.0/24
    - namespaceSelector:
        matchLabels:
          project: myproject
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 6379
  egress:
  - to:
    - ipBlock:
        cidr: 10.0.0.0/24
    ports:
    - protocol: TCP
      port: 5978
```

* **基本信息：** 同其他的 Kubernetes 对象一样，`NetworkPolicy` 需要 `apiVersion`、`kind`、`metadata` 字段
* **spec：** `NetworkPolicy` 的 `spec` 字段包含了定义网络策略的主要信息：
  * **podSelector：** 同名称空间中，符合此标签选择器 `.spec.podSelector` 的 Pod 都将应用这个 `NetworkPolicy`。上面的 Example中的 podSelector 选择了 `role=db` 的 Pod。如果该字段为空，则将对名称空间中所有的 Pod 应用这个 `NetworkPolicy`
  * **policyTypes：** `.spec.policyTypes` 是一个数组类型的字段，该数组中可以包含 `Ingress`、`Egress` 中的一个，也可能两个都包含。该字段标识了此 `NetworkPolicy` 是否应用到 入方向的网络流量、出方向的网络流量、或者两者都有。如果不指定 `policyTypes` 字段，该字段默认将始终包含 `Ingress`，当 `NetworkPolicy` 中包含出方向的规则时，`Egress` 也将被添加到默认值。
  * **ingress：** `ingress` 是一个数组，代表入方向的白名单规则。每一条规则都将允许与 `from` 和 `ports` 匹配的入方向的网络流量发生。例子中的 `ingress` 包含了一条规则，允许的入方向网络流量必须符合如下条件：
    * Pod 的监听端口为 `6379`
    * 请求方可以是如下三种来源当中的任意一种：
      * ipBlock 为 `172.17.0.0/16` 网段（请参考 [CIDR](#cidr)），但是不包括 `172.17.1.0/24` 网段
      * namespaceSelector 标签选择器，匹配标签为 `project=myproject`
      * podSelector 标签选择器，匹配标签为 `role=frontend`
  * **egress：** `egress` 是一个数组，代表出方向的白名单规则。每一条规则都将允许与 `to` 和 `ports` 匹配的出方向的网络流量发生。例子中的 `egress` 允许的出方向网络流量必须符合如下条件：
    * 目标端口为 `5978`
    * 目标 ipBlock 为 `10.0.0.0/24` 网段（请参考 [CIDR](#cidr)）

因此，例子中的 `NetworkPolicy` 对网络流量做了如下限制：
1. 隔离了 `default` 名称空间中带有 `role=db` 标签的所有 Pod 的入方向网络流量和出方向网络流量
2. Ingress规则（入方向白名单规则）：
   * 当请求方是如下三种来源当中的任意一种时，允许访问 `default` 名称空间中所有带 `role=db` 标签的 Pod 的 `6379` 端口：
     * ipBlock 为 `172.17.0.0/16` 网段（请参考 [CIDR](#cidr)），但是不包括 `172.17.1.0/24` 网段
     * namespaceSelector 标签选择器，匹配标签为 `project=myproject`
     * podSelector 标签选择器，匹配标签为 `role=frontend`
3. Egress rules（出方向白名单规则）：
   * 当如下条件满足时，允许出方向的网络流量：
     * 目标端口为 `5978`
     * 目标 ipBlock 为 `10.0.0.0/24` 网段（请参考 [CIDR](#cidr)）

#### to和from选择器的行为

NetworkPolicy 的 `.spec.ingress.from` 和 `.spec.egress.to` 字段中，可以指定 4 种类型的标签选择器：
* **podSelector** 选择与 `NetworkPolicy` 同名称空间中的 Pod 作为入方向访问控制规则的源或者出方向访问控制规则的目标
* **namespaceSelector** 选择某个名称空间（其中所有的Pod）作为入方向访问控制规则的源或者出方向访问控制规则的目标
* **namespaceSelector** 和 **podSelector** 在一个 `to` / `from` 条目中同时包含 `namespaceSelector` 和 `podSelector` 将选中指定名称空间中的指定 Pod。此时请特别留意 YAML 的写法，如下所示：
  ``` yaml {7}
    ...
    ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            user: alice
        podSelector:
          matchLabels:
            role: client
    ...
  ```
  该例子中，podSelector 前面没有 `-` 减号，namespaceSelector 和 podSelector 是同一个 from 元素的两个字段，将选中带 `user=alice` 标签的名称空间中所有带 `role=client` 标签的 Pod。但是，下面的这个 NetworkPolicy 含义是不一样的：
  ``` yaml {7}
    ...
    ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            user: alice
      - podSelector:
          matchLabels:
            role: client
    ...
  ```
  后者，podSelector 前面带 `-` 减号，说明 namespaceSelector 和 podSelector 是 from 数组中的两个元素，他们将选中 NetworkPolicy 同名称空间中带 `role=client` 标签的对象，以及带 `user=alice` 标签的名称空间的所有 Pod。

  当您对此不确信时，可以尝试使用 `kubectl describe` 命令查看 kubernetes 是如何解析您定义的 NetworkPolicy 的。

* **ipBlock** 可选择 IP [CIDR](#cidr) 范围作为入方向访问控制规则的源或者出方向访问控制规则的目标。这里应该指定的是集群外部的 IP，因为集群内部 Pod 的 IP 地址是临时分配的，且不可预测。

集群的入方向和出方向网络机制通常需要重写网络报文的 source 或者 destination IP。kubernetes 并未定义应该在处理 `NetworkPolicy` 之前还是之后再修改 source / destination IP，因此，在不同的云供应商、使用不同的网络插件时，最终的行为都可能不一样。这意味着：

  * 对于入方向的网络流量，某些情况下，你可以基于实际的源 IP 地址过滤流入的报文；在另外一些情况下，NetworkPolicy 所处理的 "source IP" 可能是 LoadBalancer 的 IP 地址，或者其他地址
  * 对于出方向的网络流量，基于 ipBlock 的策略可能有效，也可能无效

#### CIDR

CIDR（无类别域间路由，Classless Inter-Domain Routing）是一个在Internet上创建附加地址的方法，这些地址提供给服务提供商（ISP），再由ISP分配给客户。CIDR将路由集中起来，使一个IP地址代表主要骨干提供商服务的几千个IP地址，从而减轻Internet路由器的负担。

CIDR 地址中包含标准的32位IP地址和有关网络前缀位数的信息。以CIDR地址222.80.18.18/25为例，其中“/25”表示其前面地址中的前25位代表网络部分，其余位代表主机部分。

例如IP号段125.203.96.0 - 125.203.127.255转化为CIDR格式就是：

125.203.0110 0000.0000 0000到125.203.0111 1111.1111 1111，也可以写成125.203.96.0/19。

### Network Policies - Default

默认情况下，如果名称空间中没有配置 NetworkPolicy，则该名称空间中，所有Pod的所有入方向流量和所有出方向流量都是被允许的。本文列举了几个例子，可以用来改变名称空间中默认的网络策略

#### 默认拒绝所有的入方向流量

在名称空间中创建下面的 NetworkPolicy，该 NetworkPolicy：
* 选中所有的 Pod
* 不允许任何入方向的流量

``` yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

此 NetworkPolicy 将确保名称空间中所有的入方向流量都被限制，同时，不改变出方向的流量。

#### 默认允许所有的入方向流量

在名称空间中创建下面的 NetworkPolicy，该 NetworkPolicy 允许名称空间中所有 Pod 的所有入方向网络流量

``` yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all
spec:
  podSelector: {}
  ingress:
  - {}
  policyTypes:
  - Ingress
```

#### 默认拒绝所有出方向流量

在名称空间中创建下面的 NetworkPolicy，该 NetworkPolicy 禁止名称空间中所有 Pod 的所有出方向网络流量

``` yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-all
spec:
  podSelector: {}
  egress:
  - {}
  policyTypes:
  - Egress
```

#### 默认拒绝所有入方向和出方向的网络流量

在名称空间中创建下面的 NetworkPolicy，该 NetworkPolicy 禁止名称空间中所有 Pod 的所有入方向流量和所有出方向流量

``` yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

#### SCTP 支持

在 Kubernetes 中启用 `SCTPSupport` 特性，可以在 `NetworkPolicy` 的 `protocal` 字段中使用 SCTP 这个选项，该特性为 alpha 状态。向 apiserver 的启动参数中添加 `--feature-gates=SCTPSupport=true,...` 可以激活该特性。

使用此特性时，您所用的网络插件需要支持 SCTP，请查询网络插件相关的文档。

### Network Policies - Example

> 参考文档： [Declare Network Policy](https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/)

本文描述了如何在 Kubernetes 集群中通过创建 NetworkPolicy 的方式来声明网络策略，以管理 Pod 之间的网络通信流量。

#### 前提条件

请确保您使用的网络插件支持 Network Policy，如下的网络插件都是可以的：

* [Calico](https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/calico-network-policy/) 
* [Cilium](https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/cilium-network-policy/)
* [Kube-router](https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/kube-router-network-policy/)
* [Romana](https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/romana-network-policy/)
* [Weave Net](https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/weave-network-policy/)

> 按字母顺序排序，不代表推荐顺序。本文中的例子对上述所有网络插件都有效

#### 创建一个Deployment并配置Service

* 创建一个 `nginx` Deployment 用于演示 Kubernetes 的 NetworkPolicy：

  ``` sh
  kubectl create deployment nginx --image=nginx
  ```
  输出结果
  ```
  deployment.apps/nginx created
  ```

* 通过Service暴露该Deployment

  ``` sh
  kubectl expose deployment nginx --port=80
  ```
  输出结果
  ```
  service/nginx exposed
  ```

* 查询结果
  ``` sh
  kubectl get svc,pod
  ```
  输出结果
  ```
  NAME                        CLUSTER-IP    EXTERNAL-IP   PORT(S)    AGE
  service/kubernetes          10.100.0.1    <none>        443/TCP    46m
  service/nginx               10.100.0.16   <none>        80/TCP     33s

  NAME                        READY         STATUS        RESTARTS   AGE
  pod/nginx-701339712-e0qfq   1/1           Running       0          35s
  ```

#### 从另外一个pod访问Service

默认是可以从另外一个Pod访问 `nginx` Service 的。下面的方法可以执行此测试：

在 `default` 名称空间中创建 busybox 容器，并执行 `wget` 命令：

``` sh
kubectl run --generator=run-pod/v1 busybox --rm -ti --image=busybox -- /bin/sh
```

请按照下面的例子，在命令行中执行 `wget --spider --timeout=1 nginx`
```
Waiting for pod default/busybox-472357175-y0m47 to be running, status is Pending, pod ready: false

Hit enter for command prompt

/ # wget --spider --timeout=1 nginx
Connecting to nginx (10.100.0.16:80)
/ #
```

#### 限制对nginx的访问

下面的 `NetworkPolicy` 可以声明：只有带 `access=true` 标签的 Pod 可以访问 `nginx` 服务：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: access-nginx
spec:
  podSelector:
    matchLabels:
      app: nginx
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: "true"
```

* 执行命令以创建该 NetworkPolicy：
  ``` sh
  kubectl apply -f network-policy.yaml
  ```
  输出结果如下：
  ```
  networkpolicy.networking.k8s.io/access-nginx created
  ```

#### 从不带标签的Pod访问nginx服务

如果从不带标签的 Pod 访问该 nginx 服务，请求将超时：
``` sh
kubectl run --generator=run-pod/v1 busybox --rm -ti --image=busybox -- /bin/sh
```
请按照下面的例子在命令行中执行 `wget --spider --timeout=1 nginx`
```
Waiting for pod default/busybox-472357175-y0m47 to be running, status is Pending, pod ready: false

Hit enter for command prompt

/ # wget --spider --timeout=1 nginx
Connecting to nginx (10.100.0.16:80)
wget: download timed out
/ #
```

#### 从带有标签的Pod访问nginx服务

从带有 `access=true` 标签的 Pod 中访问 nginx 服务，将能够执行成功：
``` sh
kubectl run --generator=run-pod/v1 busybox --rm -ti --labels="access=true" --image=busybox -- /bin/sh
```
请按照下面的例子在命令行中执行 `wget --spider --timeout=1 nginx`
```
Waiting for pod default/busybox-472357175-y0m47 to be running, status is Pending, pod ready: false

Hit enter for command prompt

/ # wget --spider --timeout=1 nginx
Connecting to nginx (10.100.0.16:80)
/ #
```

## Kubernetes网络模型

> 参考文档： [A Guide to the Kubernetes Networking Model](https://sookocheff.com/post/kubernetes/understanding-kubernetes-networking-model/)

Kubernetes 用来在集群上运行分布式系统。分布式系统的本质使得网络组件在 Kubernetes 中是至关重要也不可或缺的。理解 Kubernetes 的网络模型可以帮助你更好的在 Kubernetes 上运行、监控、诊断你的应用程序。

网络是一个很宽泛的领域，其中有许多成熟的技术。对于不熟悉网络整体背景的人而言，要将各种新的概念、旧的概念放到一起来理解（例如，网络名称空间、虚拟网卡、IP forwarding、网络地址转换等），并融汇贯通，是一个非常困难的事情。本文将尝试揭开 Kubernetes 网络的面纱，并讨论 Kubernetes 相关的网络技术，以及这些技术是如何支持 Kubernetes 网络模型的。

文章有点长，分成主要的几个部分：
* 首先讨论一些 Kubernetes 基础的术语，确保大家对关键措辞的理解是一致的
* 然后讨论 Kubernetes 网络模型，及其设计和实现
* 主要的内容是：通过不同的 use case 深入探讨 Kubernetes 中网络流量是如何路由的

### Kubernetes基本概念

Kubernetes 基于少数几个核心概念，不断完善，提供了非常丰富和实用的功能。本章节罗列了这些核心概念，并简要的做了概述，以便更好地支持后面的讨论。熟悉 Kubernetes 的读者可跳过这个章节。

#### Kubernetes API Server

操作 Kubernetes 的方式，是调用 Kubernetes API Server（kube-apiserver）的 API 接口。kubectl、kubernetes dashboard、kuboard 都是通过调用 kube-apiserver 的接口实现对 kubernetes 的管理。API server 最终将集群状态的数据存储在`etcd`中。

#### 控制器Controller

控制器（Controller）是 Kubernetes 中最核心的抽象概念。在用户通过 kube-apiserver 声明了期望的状态以后，控制器通过不断监控 apiserver 中的当前状态，并对当前状态与期望状态之间的差异做出反应，以确保集群的当前状态不断地接近用户声明的期望状态。这个过程实现在一个循环中，参考如下伪代码：
``` go
while true:
  X = currentState()
  Y = desiredState()

  if X == Y:
    return  # Do nothing
  else:
    do(tasks to get to Y)
```
例如，当你通过 API Server 创建一个新的 Pod 对象时，Kubernetes调度器（是一个控制器）注意到此变化，并做出将该 Pod 运行在集群中哪个节点的决定。然后，通过 API Server 修改 Pod 对象的状态。此时，对应节点上的kubelet（是一个控制器）注意到此变化，并将在其所在节点运行该 Pod，设置需要的网络，使 Pod 在集群内可以访问。此处，两个控制器针对不同的状态变化做出反应，以使集群的当前状态与用户指定的期望状态匹配。

#### 容器组Pod

Pod 是 Kubernetes 中的最小可部署单元。一个 Pod 代表了集群中运行的一个工作负载，可以包括一个或多个 docker 容器、挂载需要的存储，并拥有唯一的 IP 地址。Pod 中的多个容器将始终在同一个节点上运行。

#### 节点Node

节点是Kubernetes集群中的一台机器，可以是物理机，也可以是虚拟机。

### Kubernetes网络模型

关于 Pod 如何接入网络这件事情，Kubernetes 做出了明确的选择。具体来说，Kubernetes 要求所有的网络插件实现必须满足如下要求：
* 所有的 Pod 可以与任何其他 Pod 直接通信，无需使用 NAT 映射（network address translation）
* 所有节点可以与所有 Pod 直接通信，无需使用 NAT 映射
* Pod 内部获取到的 IP 地址与其他 Pod 或节点与其通信时的 IP 地址是同一个

在这些限制条件下，需要解决如下四种完全不同的网络使用场景的问题：
1. Container-to-Container 的网络
2. Pod-to-Pod 的网络
3. Pod-to-Service 的网络
4. Internet-to-Service 的网络

### Container-to-Container的网络

通常，我们认为虚拟机中的网络通信是直接使用以太网设备进行的，如下图所示：

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/eth0.png" alt="K8S教程_Kubernetes网络模型_虚拟机的以太网设备"/>
</p>

实际情况比这个示意图更加复杂一些。Linux系统中，每一个进程都在一个 [network namespace](http://man7.org/linux/man-pages/man8/ip-netns.8.html) 中进行通信，network namespace 提供了一个逻辑上的网络堆栈（包含自己的路由、防火墙规则、网络设备）。换句话说，network namespace 为其中的所有进程提供了一个全新的网络堆栈。

Linux 用户可以使用 `ip` 命令创建 network namespace。例如，下面的命令创建了一个新的 network namespace 名称为 `ns1`：
```sh
$ ip netns add ns1
```

当创建 network namespace 时，同时将在 `/var/run/netns` 下创建一个挂载点（mount point）用于存储该 namespace 的信息。

执行 `ls /var/run/netns` 命令，或执行 `ip` 命令，可以查看所有的 network namespace：
``` sh
$ ls /var/run/netns
ns1
$ ip netns
ns1
```

默认情况下，Linux 将所有的进程都分配到 root network namespace，以使得进程可以访问外部网络，如下图所示：

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/root-namespace.png" alt="K8S教程_Kubernetes网络模型_root_network_namespace"/>
</p>

在 Kubernetes 中，Pod 是一组 docker 容器的集合，这一组 docker 容器将共享一个 network namespace。Pod 中所有的容器都：
* 使用该 network namespace 提供的同一个 IP 地址以及同一个端口空间
* 可以通过 localhost 直接与同一个 Pod 中的另一个容器通信

Kubernetes 为每一个 Pod 都创建了一个 network namespace。具体做法是，把一个 Docker 容器当做 “Pod Container” 用来获取 network namespace，在创建 Pod 中新的容器时，都使用 docker run 的 `--network:container` 功能来加入该 network namespace，参考 [docker run reference](https://docs.docker.com/engine/reference/run/#network-settings)。如下图所示，每一个 Pod 都包含了多个 docker 容器（`ctr*`），这些容器都在同一个共享的 network namespace 中：

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/pod-namespace.png" alt="K8S教程_Kubernetes网络模型_pod_network_namespace"/>
</p>

此外，Pod 中可以定义数据卷，Pod 中的容器都可以共享这些数据卷，并通过挂载点挂载到容器内部不同的路径。

### Pod-to-Pod的网络

在 Kubernetes 中，每一个 Pod 都有一个真实的 IP 地址，并且每一个 Pod 都可以使用此 IP 地址与 其他 Pod 通信。本章节可以帮助我们理解 Kubernetes 是如何在 Pod-to-Pod 通信中使用真实 IP 的，不管两个 Pod 是在同一个节点上，还是集群中的不同节点上。我们将首先讨论通信中的两个 Pod 在同一个节点上的情况，以避免引入跨节点网络的复杂性。

从 Pod 的视角来看，Pod 是在其自身所在的 network namespace 与同节点上另外一个 network namespace 进程通信。在Linux上，不同的 network namespace 可以通过 [Virtual Ethernet Device](http://man7.org/linux/man-pages/man4/veth.4.html) 或 ***veth pair*** (两块跨多个名称空间的虚拟网卡)进行通信。为连接 pod 的 network namespace，可以将 ***veth pair*** 的一段指定到 root network namespace，另一端指定到 Pod 的 network namespace。每一组 ***veth pair*** 类似于一条网线，连接两端，并可以使流量通过。节点上有多少个 Pod，就会设置多少组 ***veth pair***。下图展示了 veth pair 连接 Pod 到 root namespace 的情况：

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/pod-veth-pairs.png" alt="K8S教程_Kubernetes网络模型_veth_pair_per_pod"/>
</p>

此时，我们的 Pod 都有了自己的 network namespace，从 Pod 的角度来看，他们都有自己的以太网卡以及 IP 地址，并且都连接到了节点的 root network namespace。为了让 Pod 可以互相通过 root network namespace 通信，我们将使用 network bridge（网桥）。

Linux Ethernet bridge 是一个虚拟的 Layer 2 网络设备，可用来连接两个或多个网段（network segment）。网桥的工作原理是，在源于目标之间维护一个转发表（forwarding table），通过检查通过网桥的数据包的目标地址（destination）和该转发表来决定是否将数据包转发到与网桥相连的另一个网段。桥接代码通过网络中具备唯一性的网卡MAC地址来判断是否桥接或丢弃数据。

网桥实现了 [ARP](https://en.wikipedia.org/wiki/Address_Resolution_Protocol) 协议，以发现链路层与 IP 地址绑定的 MAC 地址。当网桥收到数据帧时，网桥将该数据帧广播到所有连接的设备上（除了发送者以外），对该数据帧做出相应的设备被记录到一个查找表中（lookup table）。后续网桥再收到发向同一个 IP 地址的流量时，将使用查找表（lookup table）来找到对应的 MAC 地址，并转发数据包。

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/pods-connected-by-bridge.png" alt="K8S教程_Kubernetes网络模型_network_bridge_网桥_虚拟网卡"/>
</p>

#### 数据包的传递：Pod-to-Pod，同节点

在 network namespace 将每一个 Pod 隔离到各自的网络堆栈的情况下，虚拟以太网设备（virtual Ethernet device）将每一个 namespace 连接到 root namespace，网桥将 namespace 又连接到一起，此时，Pod 可以向同一节点上的另一个 Pod 发送网络报文了。下图演示了同节点上，网络报文从一个Pod传递到另一个Pod的情况。

<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/pod-to-pod-same-node.gif" alt="K8S教程_Kubernetes网络模型_同节点上Pod之间发送数据包"/>
</p>

Pod1 发送一个数据包到其自己的默认以太网设备 `eth0`。
1. 对 Pod1 来说，`eth0` 通过虚拟以太网设备（veth0）连接到 root namespace
2. 网桥 `cbr0` 中为 `veth0` 配置了一个网段。一旦数据包到达网桥，网桥使用[ARP](https://en.wikipedia.org/wiki/Address_Resolution_Protocol) 协议解析出其正确的目标网段 `veth1`
3. 网桥 `cbr0` 将数据包发送到 `veth1`
4. 数据包到达 `veth1` 时，被直接转发到 Pod2 的 network namespace 中的 `eth0` 网络设备。

在整个数据包传递过程中，每一个 Pod 都只和 `localhost` 上的 `eth0` 通信，且数包被路由到正确的 Pod 上。与开发人员正常使用网络的习惯没有差异。

Kubernetes 的网络模型规定，在跨节点的情况下 Pod 也必须可以通过 IP 地址访问。也就是说，Pod 的 IP 地址必须始终对集群中其他 Pod 可见；且从 Pod 内部和从 Pod 外部来看，Pod 的IP地址都是相同的。接下来我们讨论跨节点情况下，网络数据包如何传递。

#### 数据包的传递：Pod-to-Pod，跨节点

在了解了如何在同节点上 Pod 之间传递数据包之后，我们接下来看看如何在跨节点的 Pod 之间传递数据包。Kubernetes 网络模型要求 Pod 的 IP 在整个网络中都可访问，但是并不指定如何实现这一点。实际上，这是所使用网络插件相关的，但是，仍然有一些模式已经被确立了。

通常，集群中每个节点都被分配了一个 CIDR 网段，指定了该节点上的 Pod 可用的 IP 地址段。一旦发送到该 CIDR 网段的流量到达节点，就由节点负责将流量继续转发给对应的 Pod。下图展示了两个节点之间的数据报文传递过程。


<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/pod-to-pod-different-nodes.gif" alt="K8S教程_Kubernetes网络模型_跨节点上Pod之间发送数据包"/>
</p>

图中，目标 Pod（以绿色高亮）与源 Pod（以蓝色高亮）在不同的节点上，数据包传递过程如下：
1. 数据包从 Pod1 的网络设备 `eth0`，该设备通过 `veth0` 连接到 root namespace
2. 数据包到达 root namespace 中的网桥 `cbr0`
3. 网桥上执行 ARP 将会失败，因为与网桥连接的所有设备中，没有与该数据包匹配的 MAC 地址。一旦 ARP 失败，网桥会将数据包发送到默认路由（root namespace 中的 `eth0` 设备）。此时，数据包离开节点进入网络
4. 假设网络可以根据各节点的CIDR网段，将数据包路由到正确的节点
5. 数据包进入目标节点的 root namespace（VM2 上的 `eth0`）后，通过网桥路由到正确的虚拟网络设备（`veth1`）
6. 最终，数据包通过 `veth1` 发送到对应 Pod 的 `eth0`，完成了数据包传递的过程

通常来说，每个节点知道如何将数据包分发到运行在该节点上的 Pod。一旦一个数据包到达目标节点，数据包的传递方式与同节点上不同Pod之间数据包传递的方式就是一样的了。

此处，我们直接跳过了如何配置网络，以使得数据包可以从一个节点路由到匹配的节点。这些是与具体的网络插件实现相关的，如果感兴趣，可以深入查看某一个网络插件的具体实现。例如，AWS上，亚马逊提供了一个 [Container Network Interface(CNI) plugin](https://github.com/aws/amazon-vpc-cni-k8s) 使得 Kubernetes 可以在 Amazon VPC 上执行节点到节点的网络通信。

Container Network Interface(CNI) plugin 提供了一组通用 API 用来连接容器与外部网络。具体到容器化应用开发者来说，只需要了解在整个集群中，可以通过 Pod 的 IP 地址直接访问 Pod；网络插件是如何做到跨节点的数据包传递这件事情对容器化应用来说是透明的。AWS 的 CNI 插件通过利用 AWS 已有的 VPC、IAM、Security Group 等功能提供了一个满足 Kubernetes 网络模型要求的，且安全可管理的网络环境。

> 在 EC2（AWS 的虚拟机服务） 中，每一个实例都绑定到一个 elastic network interface （ENI）并且 VPC 中所有的 ENI 都是可连通的。默认情况下，每一个 EC2 实例都有一个唯一的 ENI，但是可以随时为 EC2 实例创建多个 ENI。AWS 的 kubernetes CNI plugin 利用了这个特点，并为节点上的每一个 Pod 都创建了一个新的 ENI。由于在 AWS 的基础设施中， VPC 当中的 ENI 已经相互连接了，这就使得每一个 Pod 的 IP 地址天然就可在 VPC 内直接访问。当 CNI 插件安装到集群上是，每一个节点（EC2实例）创建多个 elastic network interface 并且为其申请到 IP 地址，在节点上形成一个 CIDR 网段。当 Pod 被部署时，kubernetes 集群上以 DaemonSet 形式部署的一段程序将接收到该节点上 kubelet 发出的添加 Pod 到 网络的请求。这段程序将从节点的可用 ENI 池中找出一个可用的 IP 地址，并将 ENI 及 IP 地址分配给 Pod，具体做法是按照 [数据包的传递：Pod-to-Pod，同节点](#数据包的传递：pod-to-pod，同节点) 中描述的方式在 Linux 内核中连接虚拟网络设备和网桥。此时，Pod 可以被集群内任意节点访问了。

### Pod-to-Service的网络

我们已经了解了如何在 Pod 的 IP 地址之间传递数据包。然而，Pod 的 IP 地址并非是固定不变的，随着 Pod 的重新调度（例如水平伸缩、应用程序崩溃、节点重启等），Pod 的 IP 地址将会出现又消失。此时，Pod 的客户端无法得知该访问哪一个 IP 地址。Kubernetes 中，Service 的概念用于解决此问题。

一个 Kubernetes Service 管理了一组 Pod 的状态，可以追踪一组 Pod 的 IP 地址的动态变化过程。一个 Service 拥有一个 IP 地址，并且充当了一组 Pod 的 IP 地址的“虚拟 IP 地址”。任何发送到 Service 的 IP 地址的数据包将被负载均衡到该 Service 对应的 Pod 上。在此情况下，Service 关联的 Pod 可以随时间动态变化，客户端只需要知道 Service 的 IP 地址即可（该地址不会发生变化）。

从效果上来说，Kubernetes 自动为 Service 创建和维护了集群内部的分布式负载均衡，可以将发送到 Service IP 地址的数据包分发到 Service 对应的健康的 Pod 上。接下来我们讨论一下这是怎么做到的。

#### netfilter and iptables

Kubernetes 利用 Linux 内建的网络框架 - `netfilter` 来实现负载均衡。Netfilter 是由 Linux 提供的一个框架，可以通过自定义 handler  的方式来实现多种网络相关的操作。Netfilter 提供了许多用于数据包过滤、网络地址转换、端口转换的功能，通过这些功能，自定义的 handler 可以在网络上转发数据包、禁止数据包发送到敏感的地址，等。

`iptables` 是一个 user-space 应用程序，可以提供基于决策表的规则系统，以使用 netfilter 操作或转换数据包。在 Kubernetes 中，kube-proxy 控制器监听 apiserver 中的变化，并配置 iptables 规则。当 Service 或 Pod 发生变化时（例如 Service 被分配了 IP 地址，或者新的 Pod 被关联到 Service），kube-proxy 控制器将更新 iptables 规则，以便将发送到 Service 的数据包正确地路由到其后端 Pod 上。iptables 规则将监听所有发向 Service 的虚拟 IP 的数据包，并将这些数据包转发到该Service 对应的一个随机的可用 Pod 的 IP 地址，同时 iptables 规则将修改数据包的目标 IP 地址（从 Service 的 IP 地址修改为选中的 Pod 的 IP 地址）。当 Pod 被创建或者被终止时，iptables 的规则也被对应的修改。换句话说，iptables 承担了从 Service IP 地址到实际 Pod IP 地址的负载均衡的工作。

在返回数据包的路径上，数据包从目标 Pod 发出，此时，iptables 规则又将数据包的 IP 头从 Pod 的 IP 地址替换为 Service 的 IP 地址。从请求的发起方来看，就好像始终只是在和 Service 的 IP 地址通信一样。

#### IPVS

Kubernetes v1.11 开始，提供了另一个选择用来实现集群内部的负载均衡：[IPVS](#ipvs-代理模式)。 IPVS（IP Virtual Server）也是基于 netfilter 构建的，在 Linux 内核中实现了传输层的负载均衡。IPVS 被合并到 LVS（Linux Virtual Server）当中，充当一组服务器的负载均衡器。IPVS 可以转发 TCP / UDP 请求到实际的服务器上，使得一组实际的服务器看起来像是只通过一个单一 IP 地址访问的服务一样。IPVS 的这个特点天然适合与用在 Kubernetes Service 的这个场景下。

当声明一个 Kubernetes Service 时，你可以指定是使用 iptables 还是 IPVS 来提供集群内的负载均衡工鞥呢。IPVS 是转为负载均衡设计的，并且使用更加有效率的数据结构（hash tables），相较于 iptables，可以支持更大数量的网络规模。当创建使用 IPVS 形式的 Service 时，Kubernetes 执行了如下三个操作：
* 在节点上创建一个 dummy IPVS interface
* 将 Service 的 IP 地址绑定到该 dummy IPVS interface
* 为每一个 Service IP 地址创建 IPVS 服务器

将来，IPVS 有可能成为 kubernetes 中默认的集群内负载均衡方式。这个改变将只影响到集群内的负载均衡，本文后续讨论将以 iptables 为例子，所有讨论对 IPVS 是同样适用的。

### 数据包的传递：Pod-to-Service

<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/pod-to-service.gif" alt="K8S教程_Kubernetes网络模型_数据包的传递_Pod-to-Service"/>
</p>

在 Pod 和 Service 之间路由数据包时，数据包的发起和以前一样：
1. 数据包首先通过 Pod 的 `eth0` 网卡发出
2. 数据包经过虚拟网卡 `veth0` 到达网桥 `cbr0`
3. 网桥上的 APR 协议查找不到该 Service，所以数据包被发送到 root namespace 中的默认路由 - `eth0`
4. 此时，在数据包被 `eth0` 接受之前，数据包将通过 iptables 过滤。iptables 使用其规则（由 kube-proxy 根据 Service、Pod 的变化在节点上创建的 iptables 规则）重写数据包的目标地址（从 Service 的 IP 地址修改为某一个具体 Pod 的 IP 地址）
5. 数据包现在的目标地址是 Pod 4，而不是 Service 的虚拟 IP 地址。iptables 使用 Linux 内核的 `conntrack` 工具包来记录具体选择了哪一个 Pod，以便可以将未来的数据包路由到同一个 Pod。简而言之，iptables 直接在节点上完成了集群内负载均衡的功能。数据包后续如何发送到 Pod 上，其路由方式与 [Pod-to-Pod的网络](#Pod-to-Pod的网络) 中的描述相同。

#### 数据包的传递：Service-to-Pod

<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/service-to-pod.gif" alt="K8S教程_Kubernetes网络模型_数据包的传递_service-to-pod"/>
</p>

1. 接收到此请求的 Pod 将会发送返回数据包，其中标记源 IP 为接收请求 Pod 自己的 IP，目标 IP 为最初发送对应请求的 Pod 的 IP
2. 当数据包进入节点后，数据包将经过 iptables 的过滤，此时记录在 `conntrack` 中的信息将被用来修改数据包的源地址（从接收请求的 Pod 的 IP 地址修改为 Service 的 IP 地址）
3. 然后，数据包将通过网桥、以及虚拟网卡 `veth0`
4. 最终到达 Pod 的网卡 `eth0`

#### 使用DNS

Kubernetes 也可以使用 DNS，以避免将 Service 的 cluster IP 地址硬编码到应用程序当中。Kubernetes DNS 是 Kubernetes 上运行的一个普通的 Service。每一个节点上的 `kubelet` 都使用该 DNS Service 来执行 DNS 名称的解析。集群中每一个 Service（包括 DNS Service 自己）都被分配了一个 DNS 名称。DNS 记录将 DNS 名称解析到 Service 的 ClusterIP 或者 Pod 的 IP 地址。[SRV 记录](srv-记录) 用来指定 Service 的已命名端口。

DNS Pod 由三个不同的容器组成：
* `kubedns`：观察 Kubernetes master 上 Service 和 Endpoints 的变化，并维护内存中的 DNS 查找表
* `dnsmasq`：添加 DNS 缓存，以提高性能
* `sidecar`：提供一个健康检查端点，可以检查 `dnsmasq` 和 `kubedns` 的健康状态

DNS Pod 被暴露为 Kubernetes 中的一个 Service，该 Service 及其 ClusterIP 在每一个容器启动时都被传递到容器中（环境变量及 /etc/resolves），因此，每一个容器都可以正确的解析 DNS。DNS 条目最终由 `kubedns` 解析，`kubedns` 将 DNS 的所有信息都维护在内存中。`etcd` 中存储了集群的所有状态，`kubedns` 在必要的时候将 `etcd` 中的 key-value 信息转化为 DNS 条目信息，以重建内存中的 DNS 查找表。

CoreDNS 的工作方式与 `kubedns` 类似，但是通过插件化的架构构建，因而灵活性更强。自 Kubernetes v1.11 开始，CoreDNS 是 Kubernetes 中默认的 DNS 实现。

### Internet-to-Service的网络

前面我们已经了解了 Kubernetes 集群内部的网络路由。下面，我们来探讨一下如何将 Service 暴露到集群外部：
* 从集群内部访问互联网
* 从互联网访问集群内部

#### 出方向 - 从集群内部访问互联网

将网络流量从集群内的一个节点路由到公共网络是与具体网络以及实际网络配置紧密相关的。为了更加具体地讨论此问题，本文将使用 AWS VPC 来讨论其中的具体问题。

在 AWS，Kubernetes 集群在 VPC 内运行，在此处，每一个节点都被分配了一个内网地址（private IP address）可以从 Kubernetes 集群内部访问。为了使访问外部网络，通常会在 VPC 中添加互联网网关（Internet Gateway），以实现如下两个目的：
* 作为 VPC 路由表中访问外网的目标地址
* 提供网络地址转换（NAT Network Address Translation），将节点的内网地址映射到一个外网地址，以使外网可以访问内网上的节点

在有互联网网关（Internet Gateway）的情况下，虚拟机可以任意访问互联网。但是，存在一个小问题：Pod 有自己的 IP 地址，且该 IP 地址与其所在节点的 IP 地址不一样，并且，互联网网关上的 NAT 地址映射只能够转换节点（虚拟机）的 IP 地址，因为网关不知道每个节点（虚拟机）上运行了哪些 Pod （互联网网关不知道 Pod 的存在）。接下来，我们了解一下 Kubernetes 是如何使用 iptables 解决此问题的。

##### 数据包的传递：Node-to-Internet

下图中：
1. 数据包从 Pod 的 network namespace 发出
2. 通过 `veth0` 到达虚拟机的 root network namespace
3. 由于网桥上找不到数据包目标地址对应的网段，数据包将被网桥转发到 root network namespace 的网卡 `eth0`。在数据包到达 `eth0` 之前，iptables 将过滤该数据包。
4. 在此处，数据包的源地址是一个 Pod，如果仍然使用此源地址，互联网网关将拒绝此数据包，因为其 NAT 只能识别与节点（虚拟机）相连的 IP 地址。因此，需要 iptables 执行源地址转换（source NAT），这样子，对互联网网关来说，该数据包就是从节点（虚拟机）发出的，而不是从 Pod 发出的
5. 数据包从节点（虚拟机）发送到互联网网关
6. 互联网网关再次执行源地址转换（source NAT），将数据包的源地址从节点（虚拟机）的内网地址修改为网关的外网地址，最终数据包被发送到互联网

在回路径上，数据包沿着相同的路径反向传递，源地址转换（source NAT）在对应的层级上被逆向执行。

<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/pod-to-internet.gif" alt="K8S教程_Kubernetes网络模型_数据包的传递_pod-to-internet"/>
</p>

#### 入方向 - 从互联网访问Kubernetes

入方向访问（从互联网访问Kubernetes集群）是一个非常棘手的问题。该问题同样跟具体的网络紧密相关，通常来说，入方向访问在不同的网络堆栈上有两个解决方案：
1. Service LoadBalancer
2. Ingress Controller

##### Layer 4：LoadBalancer

当创建 Kubernetes Service 时，可以指定其类型为 [LoadBalancer](#loadbalancer)。 LoadBalancer 的实现由 [cloud controller](https://kubernetes.io/docs/concepts/architecture/cloud-controller/) 提供，cloud controller 可以调用云供应商 IaaS 层的接口，为 Kubernetes Service 创建负载均衡器（如果您自建 Kubernetes 集群，可以使用 NodePort 类型的 Service，并手动创建负载均衡器）。用户可以将请求发送到负载均衡器来访问 Kubernetes 中的 Service。

在 AWS，负载均衡器可以将网络流量分发到其目标服务器组（即 Kubernetes 集群中的所有节点）。一旦数据包到达节点，Service 的 iptables 规则将确保其被转发到 Service 的一个后端 Pod。

##### 数据包的传递：LoadBalancer-to-Service

接下来了解一下 Layer 4 的入方向访问具体是如何做到的：
1. Loadbalancer 类型的 Service 创建后，cloud controller 将为其创建一个负载均衡器
2. 负载均衡器只能直接和节点（虚拟机沟通），不知道 Pod 的存在，当数据包从请求方（互联网）到达 LoadBalancer 之后，将被分发到集群的节点上
3. 节点上的 iptables 规则将数据包转发到合适的 Pod 上 （同 [数据包的传递：Service-to-Pod](#数据包的传递：service-to-pod)）

从 Pod 到请求方的相应数据包将包含 Pod 的 IP 地址，但是请求方需要的是负载均衡器的 IP 地址。iptables 和 `conntrack` 被用来重写返回路径上的正确的 IP 地址。

下图描述了一个负载均衡器和三个集群节点：
1. 请求数据包从互联网发送到负载均衡器
2. 负载均衡器将数据包随机分发到其中的一个节点（虚拟机），此处，我们假设数据包被分发到了一个没有对应 Pod 的节点（VM2）上
3. 在 VM2 节点上，kube-proxy 在节点上安装的 iptables 规则会将该数据包的目标地址判定到对应的 Pod 上（集群内负载均衡将生效）
4. iptables 完成 NAT 映射，并将数据包转发到目标 Pod

<p style="max-width: 480px">
  <img src="/images/k8s/k8s-services-networking/internet-to-service.gif" alt="K8S教程_Kubernetes网络模型_数据包的传递_internet-to-service"/>
</p>

##### Layer 7：Ingress控制器

::: tip 译者注
本章节讲述的 Ingress 控制器实现方式是特定于 AWS 的，与 [nginx ingress controller](#ingress) 的具体做法有所不同
:::

Layer 7 网络入方向访问在网络堆栈的 HTTP/HTTPS 协议层面工作，并且依赖于 KUbernetes Service。要实现 Layer 7 网络入方向访问，首先需要将 Service 指定为 `NodtePort` 类型，此时 Kubernetes master 将会为该 Service 分配一个 [节点端口](#nodeport)，每一个节点上的 iptables 都会将此端口上的请求转发到 Service 的后端 Pod 上。此时，Service-to-Pod 的路由与 [数据包的传递：Service-to-Pod](#数据包的传递：service-to-pod) 的描述相同。

接下来，创建一个 Kubernetes [Ingress](#ingress) 对象可以将该 Service 发布到互联网。Ingress 是一个高度抽象的 HTTP 负载均衡器，可以将 HTTP 请求映射到 Kubernetes Service。在不同的 Kubernetes 集群中，Ingress 的具体实现可能是不一样的。与 Layer 4 的网络负载均衡器相似，HTTP 负载均衡器只理解节点的 IP 地址（而不是 Pod 的 IP 地址），因此，也同样利用了集群内部通过 iptables 实现的负载均衡特性。

在 AWS 中，ALB Ingress 控制器使用 Amazon 的 Layer 7 Application Load Balancer实现了 Kubernetes Ingress 的功能。下图展示了 AWS 上 Ingress 控制器的细节，也展示了网络请求是如何从 ALB 路由到 Kubernetes 集群的。

![K8S教程_Kubernetes网络模型_Ingress_Controller_Design](/images/k8s/k8s-services-networking/ingress-controller-design.png)

1. ALB Ingress Controller 创建后，将监听 Kubernetes API 上关于 Ingress 的事件。当发现匹配的 Ingress 对象时，Ingress Controller 开始创建 AWS 资源
2. AWS 使用 Application Load Balancer（ALB）来满足 Ingress 对象的要求，并使用 Target Group 将请求路由到目标节点
3. ALB Ingress Controller 为 Kubernetes Ingress 对象中用到的每一个 Kubernetes Service 创建一个 AWS Target Group
4. Listener 是一个 ALB 进程，由 ALB Ingress Controller 根据 Ingress 的注解（annotations）创建，监听 ALB 上指定的协议和端口，并接收外部的请求
5. ALB Ingress Controller 还根据 Kubernetes Ingress 中的路径定义，创建了 Target Group Rule，确保指定路径上的请求被路由到合适的 Kubernetes Service

##### 数据包的传递：Ingress-to-Service

Ingress-to-Service 的数据包传递与 LoadBalancer-to-Service 的数据包传递非常相似。核心差别是：
* Ingress 能够解析 URL 路径（可基于路径进行路由）
* Ingress 连接到 Service 的 NodePort

下图展示了 Ingress-to-Service 的数据包传递过程。
1. 创建 Ingress 之后，cloud controller 将会为其创建一个新的 Ingress Load Balancer
2. 由于 Load Balancer 并不知道 Pod 的 IP 地址，当路由到达 Ingress Load Balancer 之后，会被转发到集群中的节点上（Service的节点端口）
3. 节点上的 iptables 规则将数据包转发到合适的 Pod
4. Pod 接收到数据包

从 Pod 返回的响应数据包将包含 Pod 的 IP 地址，但是请求客户端需要的是 Ingress Load Balancer 的 IP 地址。iptables 和 `conntrack` 被用来重写返回路径上的 IP 地址。

<p style="max-width: 600px">
  <img src="/images/k8s/k8s-services-networking/ingress-to-service.gif" alt="K8S教程_Kubernetes网络模型_数据包的传递_Ingress-to-Service"/>
</p>

## 参考

- https://kubernetes.io/docs/concepts/services-networking/
- https://kuboard.cn/

[1]: /images/k8s/k8s-services-networking/1.png