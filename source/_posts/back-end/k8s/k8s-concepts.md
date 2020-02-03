---
title: Kubernetes 基本概念
date: 2020-02-03 20:06:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubernetes，简称K8S 是一个 Google 开源容器编排引擎，用于容器化应用的自动化部署、扩展和管理。该项目托管在 [CNCF](https://www.cncf.io/)。K8S 并不是一件全新的发明，它的前身是 Google 自己捣鼓了十多年的 Borg 系统。现在k8s已经是云原生（Cloud Native）的基石，支撑 Google 每个星期启动超过[20亿](https://cloud.google.com/containers/?hl=zh-cn)个容器。

> [云原生应用定义](https://www.slideshare.net/bibryam/designing-cloud-native-applications-with-kubernetes)：基于微服务原理而开发的应用，以容器方式打包。在运行时，容器由运行于云基础设施之上的平台进行调度。应用开发采用持续交付和 DevOps 实践。

<!--more-->

## Kubenetes 解决什么问题？

K8S 本质上是用来简化微服务开发和部署的公共关注点平台解决方案。如下图中间蓝框部分：

![1][1]

## Kubenetes 架构

K8S 采用经典的 Master Slave 架构，Master 节点主要用如下组件组成：

- `etcd` K-V分布式存储机制，底层采用 raft 协议，k8s 的状态数据、配置、节点、pod等信息都存储在 etcd 当中。etcd 集群一般单独部署。
- `API server` 是对外提供操作和获得 k8s 集群资源的API，是唯一操作 etcd 的组件。
- `Scheduler` 相当于 k8s 集群的大脑，做调度决策。比如发布项目，相应的 pod 应该分布在那些 Worker 节点上。
- `Controller Manager` 相当于集群状态的协调者，观察目前集群的实际状态和 etcd 当中的预期状态，两者进行比对是否一致，不一致将对资源进行协调操作，让实际状态和预期状态达到最终一致。如果发生故障支持自愈。为保证高可用 Master 一般采用多节点部署，但是真正做调度决策的只有一个 Master 节点，所以会有一个选主的动作，如果一个节点挂了其他节点会再选出一个主 Master 上去。

Worker 节点主要组件如下：

- `Container Runtime` 它是下载镜像和运行容器的组件。
- `pod` 是对容器的包装，是 k8s 中基本的调度单位。实际的容器是跑在 pod 当中，一个节点上可以起一个或多个 pod ，一个应用的pods 可以分布在一个或多个节点上。
- `kubelet` 相当于 Worker 节点上的小脑一个 agent 角色，负责管理 Worker 节点上的组件，和 Master 节点上的 API server 进行交互。接收指令和操作，比如说启动 pod 和关闭 pod 或上报一些事件信息。
- `kube-proxy` 负责对 pod 进行寻址和负载均衡的组件，是实现 service 和服务发现抽象的关键，底层操作 iptables 规则。

pod 之前的通信走的是 Overlay 网络。

![2][2]

## Kubenetes 基本概念

K8S 概念非常多，这里只记录一些重要的概念。

### 集群（Cluster）

集群有很多个节点组成，而且可以按需添加更多的节点，节点可以是物理机或虚拟机。每一个节点都有一定数量的 cpu 和内存，整合集群可以抽象看做是一个超大的计算机，它的 cpu 和容量是所有节点 cpu和内存容量总和。

![3][3]

### 容器（Container）

K8S 是容器调度平台，容器是非常重要的基本概念，容器是一种虚拟化技术，从宿主机视角看容器一个进程，但从容器内部视角看自己就是一个操作系统。

![4][4]

### POD

K8S 并没有直接调度容器，而是在外面封装了一个叫 pod 的概念。pod 是 K8S 基本调度单位，一个 pod 中可以跑一个或多个容器，它们共享 pod 的文件系统和网络，每个 pod 有独立的 ip，pod 中的容器共享这个 ip 和端口空间，并且同一个 pod 中的容器可以通过 localhost 相互访问。大部分场景下一个 pod 只跑一个容器。

K8S 没有直接调度 docker 容器，而是通过 pod 进行封装，这样做的一个原因是考虑辅助容器的场景，比如：sidecar。另外一个原因是可以考虑替换使用不同的容器技术。

![5][5]

### 副本集（ReplicaSet）

一个应用发布的时候，一般不会只发一个 pod 实例，而是会发多个 pod 实例，这样才能实现 HA 高可用。ReplicaSet 就是和一组 pod 对应的概念。它可以通过模板 yaml 或 json 来规范，某个应用的容器镜像、端口、副本数量、健康检查机制、环境变量和 Volume 挂载等。

运行时 ReplicaSet 会监控和维护 pod 的数量，多了就会下线 pod，少了就会启动 pod。以前还有个 ReplicationController 概念，但是这个概念逐步废弃掉，被 ReplicaSet 替代。

![6][6]

### 服务（Service）

pod 在 K8S 中是不固定的，有可能会随时挂掉或重启，这个重启包括预期的或者非预期的。重启后相应的 ip 会变，那么服务的消费者如何才能寻址呢？

K8S 通过引入 Service 的概念来解决这个问题。Service 屏蔽了应用的 ip 寻址和负载均衡这些细节，消费方可以直接通过服务名访问目标服务，Service 底层机制会做寻址和负载均衡，即使应用 pod 的 ip 发生了变更，Service 也会屏蔽这种变更，让消费方无感知。

![7][7]

### 发布（Deploment）

ReplicaSet 可以认为是一种基本的发布机制，可以实现高级的发布功能，比如：金丝雀、蓝绿、滚蛋发布等。但是这个操作比较繁琐，为了简化这些高级的发布，在 ReplicaSet 基础上引入 Deploment 概念。简单讲 Deploment 是用来管理 ReplicaSet，实现蓝绿或滚动这些高级发布机制。

![8][8]

滚动发布 Rolling Update，Service 会屏蔽这期间的变更。Deploment 和 Service 这两个概念非常重要，我们在发布过程中经常使用到的两个概念。

![9][9]

### ConfigMap/Secret

微服务在上线的时候常常需要设置一些可变配置，这些配置针对不同环境对应的配置值可能不同。ConfigMap 是 K8S 平台支持的一种资源，开发人员将配置填写在 ConfigMap 当中，K8S 将配置以环境变量的形式注入到 pod 当中，pod 当中的应用可以以环境变量的形式访问。ConfigMap 也支持以持久卷 Volume 的形式 Mount 到 pod 当中，这样 pod 中的应用就可以以本地配置文件的形式访问配置。

有些配置会涉及敏感数据，比如说密码，安全证书等等。这时候就需要 Secret 机制来支持敏感数据的配置。

![10][10]

### DamonSet

微服务中有一种场景需要在每个节点上常驻一个守护进程，比如：监控、日志采集进程等。DamonSet 可以在每个 Worker 节点上部署一个守护 pod，并且保证每个节点上有且只有一个这样的 pod。

![11][11]

### 其他概念

- `Volume`卷存储抽象，可以是节点本地文件存储，也可是远程存储。挂载 Mount 之后成为 pod 的一部分。pod 销毁 Volume 也销毁，但是 Volume 的存储还存在。
- `PersistenVolume` 持久卷，如果 Volume 只用文件的本地存储，那么下次 pod 重启可能会换一个节点，PV 是高级的存储抽象，可以对接各种云存储。可以灵活插到集群中。
- `PersistenVolumeClaims` 这个是应用申请 PV 时需要填写的规范，包括磁盘大小，类型等。简称 PVC 应用通过 PVC 申请 PV 资源，然后以 Volume 的形式挂载到 pod 当中。PV 和 PVC 的引入可以使 Volume 和具体的物理存储可以近一步解耦。
- `StatefulSet` 顾名思义支持有状态的应用发布，比如说你要发布 Mysql 数据库或 Redis 等。和 ReplicaSet 相对应，ReplicaSet 是无状态应用发布。
- `Job` 支持跑一次的任务。
- `CronJob` 支持周性的任务。

![12][12]

### 概念补充

- `Label/Selector` 给 K8S 中的资源打标签，比如给 pod 打标签，标记是前端还是后端，是测试环境还是生产环境。Selector 是通过标签查询资源的一种机制，比如可以通过 Selector 可以定位出生产环境前端 pod。
- `Namespace` 是 K8S 中一种逻辑性隔离机制，Namespace 可以实现多租户、环境、项目、团队等这种逻辑隔离。创建环境没指定默认在缺省 Default Namespace中。
- `Readiness Probe（就绪探针）` 用于判断 pod 是否可以接入流量，比如：通过应用的 health 健康检查端点判断是否就绪。
- `Liveness Probe（活跃探针）` 用于判断应用是否存活，比如：通过应用的 health 健康检查端点判断是否存活。和上一个配合使用。

![13][13]

## 基本概念总结

|概念	| 作用 |
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
