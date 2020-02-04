---
title: Kubernetes 网络
date: 2020-02-04 13:32:00
categories: Kubernetes
tags:
  - Kubernetes
---

K8s 是一个强大的平台，但它的网络比较复杂，涉及很多概念，例如 Pod 网络，Service 网络，Cluster IPs，NodePort，LoadBalancer 和 Ingress 等等，为了理解，模仿 TCP/IP 协议栈，把 K8s 的网络分解为四个抽象层，从0到3，除了第0层，每一层都是构建于前一层之上，如下图所示：

<!--more-->

![1][1]

## 节点网络

第0层 Node 节点网络比较好理解，也就是保证 K8s 节点（物理或虚拟机）之间能够正常 IP 寻址和互通的网络，这个一般由底层（公有云或数据中心）网络基础设施支持。

## Pod 网络

Pod 的网络构建在节点（如下图 eth0 节点网络）网络之上，Pod 网络保证 Pod 之间能做正常的 IP 寻址。一个 Pod 可以驻一个或多个容器，这些容器共享 Pod 网络栈（共享一个虚拟网卡，如下图 veth0）。如果 Pod 内的容器要访问外部网络要走 Pod 网卡，容器之间可以通过 localhost 直接访问，同时端口空间也是共享的（容器不能用同一个端口）。

Pod 的网络栈是由 Pause 容器创建，Pause 存在的目的是为其他 Pod 内的容器创建共享网络栈。

K8s 会在每个节点网络上创建一个虚拟网桥（可以看做是虚拟交换机）用来做 Pod 之间寻址（如下图 cbr0）。其次 K8s 会在路由上修改路由器的规则，使得 Worker 节点之间上的 Pod 可以相互访问。这层网络通常被称作覆盖（Overlay）网络。

如 Pod A 里的应用想访问 Pod B 里的应用，寻址过程为：veth0 会把请求转发到 cbr0，cbr0 发现不在本节点会把请求向上转发到 eth0，eth0 发现也无法解析这个 IP 会继续向上转发到路由器，路由器通过检查路由表发现请求目标落在 10.0.2.0/24 这个范围内，会访问它的下一跳 10.100.0.3 然后会继续通过节点的 eth0 向下处理…… 最后访问到目标应用。

![2][2]

## Service 网络

K8s 的 Service 网络构建于 Pod 网络之上，它主要目的是解决服务发现（Service Discovery）和负载均衡（Load Balancing）问题。

Service 如何寻址？

![3][3]

Service 网络也是由 K8s 单独创建和管理，它是独立于 Pod 网络的单独网络，它有独立的 IP 地址空间。采用服务注册发现机制实现。

K8s 1.2 版本以前使用`用户空间代理`模式：

这里有两个阶段，一个是服务注册发现阶段，另一位一个阶段是服务调用阶段。假设 K8s 集群现在发布了一个服务叫 Service Test，K8s 为这个服务分配了一个集群IP（ClusterIP：`10.3.241.152`）这个 IP 隶属于 Service 网络，Service 网络地址空间是 `10.3.240.0/20`。相应的 ClusterIP、端口、Pod 地址列表信息都会记录在 `Api Server`上面（存储在 `etcd` 里面）。后面如果 Service Test 这些地址发生变更，K8s 会更新 `Api Server`。每个 Worker 节点 `Kube-Proxy` （服务发现和负载客户端类似 `Ribbon`）会监听 `Api Server` 信息，并告诉 `netfilter` 过滤这些请求，将请求包转发给自己（`Kube-Proxy`)。

服务调用阶段，当某个 `client process` 要访问 Service Test 会先通过本地的 DNS（DNS 背后也会监听 Api Server 变化） 查询服务目标 ClusterIP（`10.3.241.152`），查到 IP 后会将请求转发到本地 Pod 虚拟网卡（veth0：`10.0.2.3`），veth0 通过主机桥网络向主机网卡转发（host eth0），转发过程中会被 `netfilter` 截获。之前服务发现阶段 `Kube-Proxy` 告诉了 `netfilter` 将这些请求转发给自己（`10.100.0.2:10400`)。Kube-Proxy 收到请求后会以某种负载均衡策略选出一个 Pod 告诉 `host eth0`，之后走的就是 Pod 网络。

这种模式比较重，包会在用户空间内转发，有开销。

![4][4]

K8s 1.2 引入`iptables/ipvs` 模式：

这种模式比较轻量级，主流程跟用户空间代理模式差不多，不同的是在第2和3步骤。请求包在 `netfilter` 截获以后并没有交给 `Kube-Proxy`进行转发，而是通过修改 `iptables` 或修改 `ipvs` 规则直接进行转发。这样就省去了内核跟用户空间之间迁移的开销。这样就简化了很多，`Kube-Proxy` 只负责将信息同步给 `netfilter` 就可以了。

![5][5]

K8s 通过一个 `ServiceName + ClusterIP` 统一屏蔽服务发现和负载均衡，底层技术是在 `DNS + Service Registry` 基础上发展演进出来。`ClusterIP` 也是虚拟的IP所以也会变，只有服务名一般是不变的，所以引入 DNS 服务屏蔽服务名和 ClusterIP 之间的关系，客户端只需要访问服务名就可以了。

K8s 的服务发现和负载均衡是在客户端通过 `Kube-Proxy + iptables` 转发实现，它对应用无侵入，且不穿透 `Proxy`，没有额外性能损耗。

有了 Service 抽象，K8s 中部署的应用都可以通过一个抽象的 ClusterIP 进行寻址访问，并且消费方不需要关心这个 ClusterIP 后面究竟有多少个 Pod 实例，它们的 PodIP 是什么，会不会变化，如何以负载均衡方式去访问等问题。

## 外部流量访问集群内部网络

K8s 的 Service 网络只是一个集群内部网络，集群外部是无法直接访问的。而我们发布的应用，有些是需要暴露出去，要让外网甚至公网能够访问的，这样才能对外输出业务价值。

K8s 接入外部流量的时候，会有 NodePort，LoadBalancer 和 Ingress 等概念，这些概念都是和 K8s 外部流量接入相关的，它们既是不同概念，同时又有关联性。

外部网络如何对 Service 寻址？

![6][6]

外部访问到节点（eth0：10.100.0.3）网络，从而访问 Service 网络，由 `Kube-Proxy` 和 `netfilter` 配合实现。底层原理由 `Kube-Proxy` 在节点上暴露监听转发服务（端口：32213），这个端口一般限制在 `30000-32767` 这个范围之内。当节点网络上有请求到达这个端口，`Kube-Proxy` 就会将请求转发到对应的服务上。后面转发流程和 Service 一样。

### NodePort

将 K8s 服务暴露在节点网络的机制术语叫 NodePort，是一种特殊的 Service。底层的原理是 K8s 会在每个 Worker 节点上都暴露一个相同端口，这个端口背后就是 `Kube-Proxy` 转发服务，通过这个服务就可以让节点网络可以访问内部的 Service。

![7][7]

### Load Balancer

通过 NodePort 虽然可以把 K8s 内部的 Service 暴露在节点网络上面，如果要让集群外部或公网访问到这个节点网络，一般还需要引入负载均衡（Load Balancer)，LB 一般有公网 IP。 通过 LB 一方面能将外部流量转发路由到节点网络上面，另一方面还能实现对节点网络实现负载均衡。

![8][8]

### Ingress

通过 `LB + IP` 虽然可以把 K8s 集群内部服务暴露在公网上面，但是 LB, IP 一般都是付费资源，如果需要暴露在公网上的服务比较多，那么每个服务都要申请一个 `LB + IP` 相应的成本比较高，管理维护比较麻烦。

因此 K8s 引入 Ingress 概念，它是一种特殊的资源。Ingress 的作用基本上等价于反向代理或者网关，它的主要作用是反向路由。通过 Ingress 可以将多个内部服务同时暴露出事，但是只需要一个前置的 `LB + IP`。Ingress 还可以做更复杂事情，比如：动态路由更新、安全认证、日志监控等等。

![9][9]

## 总结

| 概念 |作用 | 实现 |
| :--------- | :-------------- | :----------- |
| 节点网络 | Master/Worker | 节点之间网络互通 路由器，交换机，网卡 |
| Pod 网络 | Pod 之间互通 | 虚拟网卡，虚拟网桥，路由器 |
| Service 网络 | 屏蔽 Pod 地址变化+负载均衡 | Kube-proxy, Netfilter, Api-Server，DNS |
| NodePort | 将 Service 暴露在节点网络上 | Kube-proxy + Netfliter |
| LoadBalancer | 将 Service 暴露在公网上+负载均衡 | 公有云 LB + NodePort |
| Ingress | 反向路由，安全，日志监控(类似反向代理 or 网关) | Nginx/Envoy/Traefik/Faraday |

## 参考

- [kubernetes concepts](https://kubernetes.io/zh/docs/concepts/)
- 《Spring Boot & Kubernetes 云原生微服务实践》

[1]: /images/k8s/k8s-network/1.jpg
[2]: /images/k8s/k8s-network/2.jpg
[3]: /images/k8s/k8s-network/3.jpg
[4]: /images/k8s/k8s-network/4.jpg
[5]: /images/k8s/k8s-network/5.jpg
[6]: /images/k8s/k8s-network/6.jpg
[7]: /images/k8s/k8s-network/7.jpg
[8]: /images/k8s/k8s-network/8.jpg
[9]: /images/k8s/k8s-network/9.jpg
