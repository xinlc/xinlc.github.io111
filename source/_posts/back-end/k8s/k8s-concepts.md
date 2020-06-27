---
title: Kubernetes 简介和基本概念
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

为了理解Kubernetes的用处，我们先回顾一下历史。

![14][14]

大致来说，在部署应用程序的方式上，我们主要经历了三个时代：

* **传统部署时代**：早期，企业直接将应用程序部署在物理机上。由于物理机上不能为应用程序定义资源使用边界，我们也就很难合理地分配计算资源。例如：如果多个应用程序运行在同一台物理机上，可能发生这样的情况：其中的一个应用程序消耗了大多数的计算资源，导致其他应用程序不能正常运行。应对此问题的一种解决办法是，将每一个应用程序运行在不同的物理机上。然而，这种做法无法大规模实施，因为资源利用率很低，且企业维护更多物理机的成本昂贵。
* **虚拟化部署时代**：针对上述问题，虚拟化技术应运而生。用户可以在单台物理机的CPU上运行多个虚拟机（Virtual Machine）。
  * 虚拟化技术使得应用程序被虚拟机相互分隔开，限制了应用程序之间的非法访问，进而提供了一定程度的安全性。
  * 虚拟化技术提高了物理机的资源利用率，可以更容易地安装或更新应用程序，降低了硬件成本，因此可以更好地规模化实施。
  * 每一个虚拟机可以认为是被虚拟化的物理机之上的一台完整的机器，其中运行了一台机器的所有组件，包括虚拟机自身的操作系统。
* **容器化部署时代**：容器与虚拟机类似，但是降低了隔离层级，共享了操作系统。因此，容器可以认为是轻量级的。
  * 与虚拟机相似，每个容器拥有自己的文件系统、CPU、内存、进程空间等
  * 运行应用程序所需要的资源都被容器包装，并和底层基础架构解耦
  * 容器化的应用程序可以跨云服务商、跨Linux操作系统发行版进行部署

容器化越来越流行，主要原因是它带来的诸多好处：
* **敏捷地创建和部署应用程序**：相较于创建虚拟机镜像，创建容器镜像更加容易和快速
* 持续构建集成：可以更快更频繁地构建容器镜像、部署容器化的应用程序、并且轻松地回滚应用程序
* **分离开发和运维的关注点**：在开发构建阶段就完成容器镜像的构建，构建好的镜像可以部署到多种基础设施上。这种做法将开发阶段需要关注的内容包含在如何构建容器镜像的过程中，将部署阶段需要关注的内容聚焦在如何提供基础设施以及如何使用容器镜像的过程中。降低了开发和运维的耦合度
* **可监控性**：不仅可以查看操作系统级别的资源监控信息，还可以查看应用程序健康状态以及其他信号的监控信息
* **开发、测试、生产不同阶段的环境一致性**：开发阶段在笔记本上运行的容器与测试、生产环境中运行的容器一致
* **跨云服务商、跨操作系统发行版的可移植性**：容器可运行在 Ubuntu、RHEL、CoreOS、CentOS等不同的操作系统发行版上，可以运行在私有化部署、Google Kubernetes Engine、AWS、阿里云等不同的云供应商的环境中
* **以应用程序为中心的管理**：虚拟机时代的考虑的问题是在虚拟硬件上运行一个操作系统，而容器化时代，问题的焦点则是在操作系统的逻辑资源上运行一个应用程序
* **松耦合、分布式、弹性、无约束的微服务**：应用程序被切分成更小的、独立的微服务，并可以动态部署和管理，而不是一个部署在专属机器上的庞大的单片应用程序
* **资源隔离**：确保应用程序性能不受干扰
* **资源利用**：资源高效、高密度利用

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

## Kubernetes 组件介绍

### Master 组件

Master组件是集群的控制平台（control plane）：
* master 组件负责集群中的全局决策（例如，调度）
* master 组件探测并响应集群事件（例如，当 Deployment 的实际 Pod 副本数未达到 `replicas` 字段的规定时，启动一个新的 Pod）

Master组件可以运行于集群中的任何机器上。但是，为了简洁性，通常在同一台机器上运行所有的 master 组件，且不在此机器上运行用户的容器。

#### kube-apiserver

此 master 组件提供 Kubernetes API。这是Kubernetes控制平台的前端（front-end），可以水平扩展（通过部署更多的实例以达到性能要求）。kubectl / kubernetes dashboard 等Kubernetes管理工具就是通过 kubernetes API 实现对 Kubernetes 集群的管理。

#### etcd

支持一致性和高可用的名值对存储组件，Kubernetes集群的所有配置信息都存储在 etcd 中。请确保您 [备份](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#backing-up-an-etcd-cluster) 了 etcd 的数据。关于 etcd 的更多信息，可参考 [etcd 官方文档](https://etcd.io/docs/)

#### kube-scheduler

此 master 组件监控所有新创建尚未分配到节点上的 Pod，并且自动选择为 Pod 选择一个合适的节点去运行。

影响调度的因素有：
* 单个或多个 Pod 的资源需求
* 硬件、软件、策略的限制
* 亲和与反亲和（affinity and anti-affinity）的约定
* 数据本地化要求
* 工作负载间的相互作用

#### kube-controller-manager

此 master 组件运行了所有的控制器

逻辑上来说，每一个控制器是一个独立的进程，但是为了降低复杂度，这些控制器都被合并运行在一个进程里。

kube-controller-manager 中包含的控制器有：
* 节点控制器： 负责监听节点停机的事件并作出对应响应
* 副本控制器： 负责为集群中每一个 副本控制器对象（Replication Controller Object）维护期望的 Pod 副本数
* 端点（Endpoints）控制器：负责为端点对象（Endpoints Object，连接 Service 和 Pod）赋值
* Service Account & Token控制器： 负责为新的名称空间创建 default Service Account 以及 API Access Token

#### cloud-controller-manager

cloud-controller-manager 中运行了与具体云基础设施供应商互动的控制器。这是 Kubernetes 1.6 版本中引入的特性，尚处在 alpha 阶段。

cloud-controller-manager 使得云供应商的代码和 Kubernetes 的代码可以各自独立的演化。在此之前的版本中，Kubernetes的核心代码是依赖于云供应商的代码的。在后续的版本中，特定于云供应商的代码将由云供应商自行维护，并在运行Kubernetes时链接到 cloud-controller-manager。

以下控制器中包含与云供应商相关的依赖：
* 节点控制器：当某一个节点停止响应时，调用云供应商的接口，以检查该节点的虚拟机是否已经被云供应商删除
  > 私有化部署Kubernetes时，我们不知道节点的操作系统是否删除，所以在移除节点后，要自行通过 `kubectl delete node` 将节点对象从 Kubernetes 中删除
* 路由控制器：在云供应商的基础设施中设定网络路由
  > 私有化部署Kubernetes时，需要自行规划Kubernetes的拓扑结构，并做好路由配置。
* 服务（Service）控制器：创建、更新、删除云供应商提供的负载均衡器
  > 私有化部署Kubernetes时，不支持 LoadBalancer 类型的 Service，如需要此特性，需要创建 NodePort 类型的 Service，并自行配置负载均衡器
* 数据卷（Volume）控制器：创建、绑定、挂载数据卷，并协调云供应商编排数据卷
  > 私有化部署Kubernetes时，需要自行创建和管理存储资源，并通过Kubernetes的[存储类](https://kubernetes.io/docs/concepts/storage/storage-classes/)、[存储卷](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)、[数据卷](https://kubernetes.io/docs/concepts/storage/volumes/)等与之关联

> 通过 cloud-controller-manager，Kubernetes可以更好地与云供应商结合，例如，在阿里云的 Kubernetes 服务里，您可以在云控制台界面上轻松点击鼠标，即可完成 Kubernetes 集群的创建和管理。在私有化部署环境时，您必须自行处理更多的内容。幸运的是，通过合适的教程指引，这些任务的达成并不困难。

### Node 组件

Node 组件运行在每一个节点上（包括 master 节点和 worker 节点），负责维护运行中的 Pod 并提供 Kubernetes 运行时环境。

#### kubelet

此组件是运行在每一个集群节点上的代理程序。它确保 Pod 中的容器处于运行状态。Kubelet 通过多种途径获得 PodSpec 定义，并确保 PodSpec 定义中所描述的容器处于运行和健康的状态。Kubelet不管理不是通过 Kubernetes 创建的容器。

#### kube-proxy

[kube-proxy](https://kubernetes.io/docs/concepts/services-networking/service/) 是一个网络代理程序，运行在集群中的每一个节点上，是实现 Kubernetes Service 概念的重要部分。

kube-proxy 在节点上维护网络规则。这些网络规则使得您可以在集群内、集群外正确地与 Pod 进行网络通信。如果操作系统中存在 packet filtering layer，kube-proxy 将使用这一特性（[iptables代理模式](https://kubernetes.io/docs/concepts/services-networking/service/)），否则，kube-proxy将自行转发网络请求（[User space代理模式](https://kubernetes.io/docs/concepts/services-networking/service/)）

#### 容器引擎

容器引擎负责运行容器。Kubernetes支持多种容器引擎：[Docker](http://www.docker.com/)、[containerd](https://containerd.io/)、[cri-o](https://cri-o.io/)、[rktlet](https://github.com/kubernetes-incubator/rktlet) 以及任何实现了 [Kubernetes容器引擎接口](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md) 的容器引擎

### Addons

Addons 使用 Kubernetes 资源（DaemonSet、Deployment等）实现集群的功能特性。由于他们提供集群级别的功能特性，addons使用到的Kubernetes资源都放置在 `kube-system` 名称空间下。

下面描述了一些经常用到的 addons，参考 [Addons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) 查看更多列表。

#### DNS

除了 DNS Addon 以外，其他的 addon 都不是必须的，所有 Kubernetes 集群都应该有 [Cluster DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

Cluster DNS 是一个 DNS 服务器，是对您已有环境中其他 DNS 服务器的一个补充，存放了 Kubernetes Service 的 DNS 记录。

Kubernetes 启动容器时，自动将该 DNS 服务器加入到容器的 DNS 搜索列表中。

#### Web UI（Dashboard）

[Dashboard](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/) 是一个Kubernetes集群的 Web 管理界面。用户可以通过该界面管理集群。

#### ContainerResource Monitoring

[Container Resource Monitoring](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/) 将容器的度量指标（metrics）记录在时间序列数据库中，并提供了 UI 界面查看这些数据

#### Cluster-level Logging

[Cluster-level logging](https://kubernetes.io/docs/concepts/cluster-administration/logging/) 机制负责将容器的日志存储到一个统一存储中，并提供搜索浏览的界面

## Kubernetes的边界

Kubernetes不是一个传统意义的、保罗万象的 PaaS（Platform as a Service）系统。Kubernetes在容器层面工作，而不是硬件层面，它提供了与 PaaS 平台相似的通用特性，例如：部署、伸缩、负载均衡、日志、监控等。然而，Kubernetes并不是一个单一整体，这些特性都是可选、可插拔的。Kubernetes提供用于搭建开发平台的基础模块，同时为用户提供了不同模块的选择性和多样性。

Kubernetes：

* 不限制应用程序的类型。Kubernetes的目标是广泛支持不同类型的工作负载，包括：有状态、无状态、数据处理等类型的应用。只要应用可以在容器中运行，就能够非常好地在 Kubernetes 上运行
* 不部署源码、不编译或构建应用程序。持续集成、分发、部署（CI/CD）的工作流极大程度上取决于组织的文化、偏好以及技术要求。Kubernetes可以作为部署平台参与到 CI/CD 流程，但是不涉及镜像构建和分发的过程
  > 可选的有 `Jenkins / Gitlab Runner / docker registry / harbour` 等
* 不提供应用程序级别的服务，包括：中间件（例如，消息总线）、数据处理框架（例如，Spark）、数据库（例如，mysql）、缓存（例如，Redis），或者分布式存储（例如，Ceph）。此类组件可以在 Kubernetes 上运行，或者可以被运行在 Kubernetes 上的应用程序访问
* 不限定日志、监控、报警的解决方案。Kubernetes 提供一些样例展示如何与日志、监控、报警等组件集成，同时提供收集、导出监控度量（metrics）的一套机制。您可以根据自己的需要选择日志、监控、报警组件
  > 可选的有 `ELK / Prometheus / Graphana / Pinpoint / Skywalking / Metrics Server` 等
* 不提供或者限定配置语言（例如，jsonnet）。Kubernetes提供一组声明式的 API，您可以按照自己的方式定义部署信息。
  > 可选的有 `helm / kustomize / kubectl / kubernetes dashboard / kuboard / octant / k9s` 等
* 不提供或限定任何机器的配置、维护、管理或自愈的系统。
  > 在这个级别上，可选的组件有 `puppet、ansible、open stack` 等
* 此外，Kubernetes不是一个纯粹意义上的容器编排系统。事实上，Kubernetes 消除了容器编排的需求。容器编排的技术定义是`预定义流程的执行`（先做A、再做B、然后做C）。与此相对应，Kubernetes构建了一系列相互独立、可预排的控制过程，以持续不断地将系统从当前状态调整到声明的目标状态。如何从 A 达到 C，并不重要。集中化的控制也就不需要了。这个设计思想使得Kubernetes使用更简单、更强大、稳健、反脆弱和可扩展。

## 参考

- [kubernetes concepts](https://kubernetes.io/zh/docs/concepts/)
- [kubernetes components](https://kubernetes.io/docs/concepts/overview/components/)
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
[14]: /images/k8s/k8s-concepts/14.jpg
