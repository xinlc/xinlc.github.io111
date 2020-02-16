---
title: Kubernetes 基本概念
date: 2020-02-03 20:06:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubernetes，简称 K8s 是一个 Google 开源容器编排引擎，用于容器化应用的自动化部署、扩展和管理。该项目托管在 [CNCF](https://www.cncf.io/)。K8s 并不是一件全新的发明，它的前身是 Google 自己捣鼓了十多年的 Borg 系统。现在 K8s 已经是云原生（Cloud Native）的基石，支撑 Google 每个星期启动超过[20亿](https://cloud.google.com/containers/?hl=zh-cn)个容器。

> [云原生应用定义](https://www.slideshare.net/bibryam/designing-cloud-native-applications-with-kubernetes)：基于微服务原理而开发的应用，以容器方式打包。在运行时，容器由运行于云基础设施之上的平台进行调度。应用开发采用持续交付和 DevOps 实践。

<!--more-->

## Kubenetes 解决什么问题？

K8s 本质上是用来简化微服务开发和部署的公共关注点平台解决方案。提供资源调度、均衡容灾、服务注册、动态扩缩容等功能套件。K8s 提供应用部署、维护、 扩展机制等功能，利用 K8s 能方便地管理跨机器运行容器化的应用，其主要功能如下：

- `数据卷` Pod 中容器之间共享数据，可以使用数据卷；
- `应用程序健康检查` 容器内服务可能进程堵塞无法处理请求，可以设置监控检查策略保证应用健壮性；
- `复制应用程序实例` 控制器维护着 Pod 副本数量，保证一个 Pod 或一组同类的 Pod 数量始终可用；
- `弹性伸缩` 根据设定的指标（CPU利用率）自动缩放 Pod 副本数；
- `服务发现` 使用环境变量或 DNS 服务插件保证容器中程序发现 Pod 入口访问地址；
- `负载均衡` 一组 Pod 副本分配一个私有的集群 IP 地址，负载均衡转发请求到后端容器。在集群内部其他 Pod 可通过这个 ClusterIP 访问应用；
- `滚动更新` 更新服务不中断，一次更新一个 Pod ，而不是同时删除整个服务；
- `服务编排` 通过文件描述部署服务，使得应用程序部署变得更高效；
- `资源监控` Node 节点组件集成 cAdvisor 资源收集工具，可通过 Heapster 汇总整个集群节点资源数据，然后存储到 InfluxDB 时序数据库，再由 Grafana 展示；
- `提供认证和授权` 支持属性访问控制（ABAC）、角色访问控制（RBAC）认证授权策略；

![1][1]

## Kubenetes 架构

K8s 采用经典的 Master Slave 架构，Master 节点主要用如下组件组成：

- `etcd` K-V分布式存储机制，底层采用 raft 协议，K8s 的状态数据、配置、节点、Pod等信息都存储在 etcd 当中。etcd 集群一般单独部署；
- `API server` 是对外提供操作和获得 K8s 集群资源的API，是唯一操作 etcd 的组件；
- `Scheduler` 相当于 K8s 集群的大脑，做调度决策。比如发布项目，相应的 Pod 应该分布在那些 Worker 节点上；
- `Controller Manager` 相当于集群状态的协调者，观察目前集群的实际状态和 etcd 当中的预期状态，两者进行比对是否一致，不一致将对资源进行协调操作，让实际状态和预期状态达到最终一致。如果发生故障支持自愈。为保证高可用 Master 一般采用多节点部署，但是真正做调度决策的只有一个 Master 节点，所以会有一个选主的动作，如果一个节点挂了其他节点会再选出一个主 Master 上去；

Worker 节点主要组件如下：

- `Container Runtime` 它是下载镜像和运行容器的组件；
- `Pod` 是对容器的包装，是 K8s 中基本的调度单位。实际的容器是跑在 Pod 当中，一个节点上可以起一个或多个 Pod ，一个应用的Pods 可以分布在一个或多个节点上；
- `kubelet` 相当于 Worker 节点上的小脑一个 agent 角色，负责管理 Worker 节点上的组件，和 Master 节点上的 API server 进行交互。接收指令和操作，比如说启动 Pod 和关闭 Pod 或上报一些事件信息；
- `kube-proxy` 负责对 Pod 进行寻址和负载均衡的组件，是实现 service 和服务发现抽象的关键，底层操作 IPtables 规则；

Pod 之间的通信走的是 Overlay 网络。

![2][2]

## Kubenetes 基本概念

K8s 概念非常多，这里只记录一些重要的概念。

### 集群（Cluster）

集群有很多个节点组成，而且可以按需添加更多的节点，节点可以是物理机或虚拟机。每一个节点都有一定数量的 cpu 和内存，整合集群可以抽象看做是一个超大的计算机，它的 cpu 和容量是所有节点 cpu和内存容量总和。

![3][3]

### 容器（Container）

K8s 是容器调度平台，容器是非常重要的基本概念，容器是一种虚拟化技术，从宿主机视角看容器一个进程，但从容器内部视角看自己就是一个操作系统。

![4][4]

### Pod

K8s 并没有直接调度容器，而是在外面封装了一个叫 Pod 的概念。Pod 是 K8s 基本调度单位，一个 Pod 中可以跑一个或多个容器，它们共享 Pod 的文件系统和网络，每个 Pod 有独立的 IP，Pod 中的容器共享这个 IP 和端口空间，并且同一个 Pod 中的容器可以通过 localhost 相互访问。大部分场景下一个 Pod 只跑一个容器。

K8s 没有直接调度 docker 容器，而是通过 Pod 进行封装，这样做的一个原因是考虑辅助容器的场景，比如：Sidecar。另外一个原因是可以考虑替换使用不同的容器技术。

![5][5]

### 副本集（ReplicaSet）

一个应用发布的时候，一般不会只发一个 Pod 实例，而是会发多个 Pod 实例，这样才能实现 HA 高可用。ReplicaSet 就是和一组 Pod 对应的概念。它可以通过模板 yaml 或 json 来规范，某个应用的容器镜像、端口、副本数量、健康检查机制、环境变量和 Volume 挂载等。

运行时 ReplicaSet 会监控和维护 Pod 的数量，多了就会下线 Pod，少了就会启动 Pod。以前还有个 ReplicationController 概念，但是这个概念逐步废弃掉，被 ReplicaSet 替代。

![6][6]

### 服务（Service）

Pod 在 K8s 中是不固定的，有可能会随时挂掉或重启，这个重启包括预期的或者非预期的。重启后相应的 IP 会变，那么服务的消费者如何才能寻址呢？

K8s 通过引入 Service 的概念来解决这个问题。Service 屏蔽了应用的 IP 寻址和负载均衡这些细节，消费方可以直接通过服务名访问目标服务，Service 底层机制会做寻址和负载均衡，即使应用 Pod 的 IP 发生了变更，Service 也会屏蔽这种变更，让消费方无感知。

![7][7]

### 发布（Deploment）

ReplicaSet 可以认为是一种基本的发布机制，可以实现高级的发布功能，比如：金丝雀、蓝绿、滚蛋发布等。但是这个操作比较繁琐，为了简化这些高级的发布，在 ReplicaSet 基础上引入 Deploment 概念。简单讲 Deploment 是用来管理 ReplicaSet，实现蓝绿或滚动这些高级发布机制。

![8][8]

滚动发布 Rolling Update，Service 会屏蔽这期间的变更。Deploment 和 Service 这两个概念非常重要，我们在发布过程中经常使用到的两个概念。

![9][9]

### ConfigMap/Secret

微服务在上线的时候常常需要设置一些可变配置，这些配置针对不同环境对应的配置值可能不同。ConfigMap 是 K8s 平台支持的一种资源，开发人员将配置填写在 ConfigMap 当中，K8s 将配置以环境变量的形式注入到 Pod 当中，Pod 当中的应用可以以环境变量的形式访问。ConfigMap 也支持以持久卷 Volume 的形式 Mount 到 Pod 当中，这样 Pod 中的应用就可以以本地配置文件的形式访问配置。

有些配置会涉及敏感数据，比如说密码，安全证书等等。这时候就需要 Secret 机制来支持敏感数据的配置。

![10][10]

### DamonSet

微服务中有一种场景需要在每个节点上常驻一个守护进程，比如：监控、日志采集进程等。DamonSet 可以在每个 Worker 节点上部署一个守护 Pod，并且保证每个节点上有且只有一个这样的 Pod。

![11][11]

### Ingress

Kubernetes中的负载均衡我们主要用到了以下两种机制：

- `Service` 使用 Service 提供集群内部的负载均衡，Kube-proxy 负责将 service 请求负载均衡到后端的 Pod 中；
- `Ingress Controller` 使用 Ingress 提供集群外部的负载均衡；

Service 和 Pod 的 IP 仅可在集群内部访问。集群外部的请求需要通过负载均衡转发到 service 所在节点暴露的端口上，然后再由 kube-proxy 通过边缘路由器将其转发到相关的 Pod，Ingress 可以给 service 提供集群外部访问的 URL、负载均衡、HTTP 路由等，为了配置这些 Ingress 规则，集群管理员需要部署一个 Ingress Controller，它监听 Ingress 和 service 的变化，并根据规则配置负载均衡并提供访问入口。

常用的 `ingress controller`：

- nginx
- traefik
- Kong
- Openresty

### 其他概念

- `Volume`卷存储抽象，可以是节点本地文件存储，也可是远程存储。挂载 Mount 之后成为 Pod 的一部分。Pod 销毁 Volume 也销毁，但是 Volume 的存储还存在；
- `PersistenVolume` 持久卷，如果 Volume 只用文件的本地存储，那么下次 Pod 重启可能会换一个节点，PV 是高级的存储抽象，可以对接各种云存储。可以灵活插到集群中；
- `PersistenVolumeClaims` 这个是应用申请 PV 时需要填写的规范，包括磁盘大小，类型等。简称 PVC 应用通过 PVC 申请 PV 资源，然后以 Volume 的形式挂载到 Pod 当中。PV 和 PVC 的引入可以使 Volume 和具体的物理存储可以近一步解耦；
- `StatefulSet` 顾名思义支持有状态的应用发布，有唯一的网络标识符（IP），持久存储，有序的部署、扩展、删除和滚动更新。比如说你要发布 Mysql 数据库或 Redis 等。StatefuleSet 能够保证 Pod 的每个副本在整个生命周期中名称是不变的。而其他 Controller 不提供这个功能，当某个 Pod 发生故障需要删除并重新启动时，Pod 的名称会发生变化。同时 StatefuleSet 会保证副本按照固定的顺序启动、更新或者删除。和 ReplicaSet 相对应，ReplicaSet 是无状态应用发布；
- `Job` 支持跑一次的任务；
- `CronJob` 支持周性的任务；

![12][12]

### 概念补充

- `Label/Selector` 给 K8s 中的资源打标签，比如给 Pod 打标签，标记是前端还是后端，是测试环境还是生产环境。Selector 是通过标签查询资源的一种机制，比如可以通过 Selector 可以定位出生产环境前端 Pod；
- `Namespace` 是 K8s 中一种逻辑性隔离机制，Namespace 可以实现多租户、环境、项目、团队等这种逻辑隔离。创建环境没指定默认在缺省 Default Namespace中；
- `Readiness Probe（就绪探针）` 用于判断 Pod 是否可以接入流量，比如：通过应用的 health 健康检查端点判断是否就绪；
- `Liveness Probe（活跃探针）` 用于判断应用是否存活，比如：通过应用的 health 健康检查端点判断是否存活。和上一个配合使用；

![13][13]

## 基本概念总结

| 概念 | 作用 |
| :-------------- | :----------- |
| Cluster | 超大计算机抽象，由节点组成 |
| Container | 应用居住和运行在容器中 |
| Pod Kubernetes | 基本调度单位 |
| ReplicaSet | 创建和管理 Pod，支持无状态应用 |
| Service | 应用 Pods 的访问点，屏蔽 IP 寻址和负载均衡 |
| Deployment | 管理 ReplicaSet，支持滚动等高级发布机制 |
| ConfigMap/Secrets | 应用配置，secret 敏感数据配置 |
| DaemonSet | 保证每个节点有且仅有一个 Pod，常见于监控 |
| StatefulSet | 类似 ReplicaSet，但支持有状态应用 |
| Job | 运行一次就结束的任务 |
| CronJob | 周期性运行的任务 |
| Volume | 可装载磁盘文件存储 |
| PersisentVolume/PersistentVolumeClaims | 超大磁盘存储抽象和分配机制 |
| Label/Selector | 资源打标签和定位机制 |
| Namespace | 资源逻辑隔离机制 |
| Readiness Probe | 就绪探针，流量接入 Pod 判断依据 |
| Liveness Probe | 存活探针，是否 kill Pod 的判断依据 |

## 参考

- [kubernetes concepts](https://kubernetes.io/zh/docs/concepts/)
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/k8s/k8s-concepts/1.jpg
[2]: /images/k8s/k8s-concepts/2.jpg
[3]: /images/k8s/k8s-concepts/3.jpg
[4]: /images/k8s/k8s-concepts/4.jpg
[5]: /images/k8s/k8s-concepts/5.jpg
[6]: /images/k8s/k8s-concepts/6.jpg
[7]: /images/k8s/k8s-concepts/7.jpg
[8]: /images/k8s/k8s-concepts/8.jpg
[9]: /images/k8s/k8s-concepts/9.jpg
[10]: /images/k8s/k8s-concepts/10.jpg
[11]: /images/k8s/k8s-concepts/11.jpg
[12]: /images/k8s/k8s-concepts/12.jpg
[13]: /images/k8s/k8s-concepts/13.jpg
