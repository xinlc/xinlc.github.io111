---
title: Minikube 部署 Kubernetes
date: 2020-05-22 20:42:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

Minikube是由Kubernetes社区维护的单机版的Kubernetes集群，支持macOS, Linux, and Windows等多种操作系统平台，使用最新的官方stable版本，并支持Kubernetes的大部分功能，从基础的容器编排管理，到高级特性如负载均衡、Ingress，权限控制等。非常适合作为Kubernetes入门，或开发测试环境使用。Minikube实际是跑在本地的虚拟机中的，所以，需要先安装一套Hypervisor

<!--more-->

## Minikube 方式部署

[Minikube](https://minikube.sigs.k8s.io/) 是一个工具，它使我们能够很容易地在本地运行Kubernetes。Minikube在你的笔记本的虚拟机中运行一个单节点的Kubernetes集群。Minikube实际是跑在本地的虚拟机中的，所以，需要先安装一套Hypervisor。这里以VirtualBox为例。

### MacOS 环境

```bash
# 安装
brew cask install minikube
# 或
curl -Lo minikube https://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/releases/v1.11.0/minikube-darwin-amd64 && chmod +x minikube && sudo mv minikube /usr/local/bin/

# 启动
minikube start
```

brew cask install 直接从官方下载了 minikube 程序，并加入环境变量。minikube start 虽然只是一条命令，但其实执行了很多步骤：

1. 创建了名为minikube的虚拟机，并在虚拟机中安装了Docker容器运行时。（实际就是Docker-machine）
2. 下载了Kubeadm与Kubelet工具
3. 通过Kubeadm部署Kubernetes集群
4. 进行各组件间访问授权、健康检查等工作
5. 在用户操作系统安装并配置kubectl

所以，minikube 实际上是基于 Kubeadm 工具来部署 Kubernetes 的，我们通过 `minikube ssh` 命令可以进入部署的虚拟机中, 运行：`docker ps | awk '{print $NF}'` 有木有看到很多熟悉的身影, 有Master节点的组件kube-apiserver、kube-scheduler、kube-controller、etcd 容器，以及Node节点的kube-proxy容器，还有些附加的组件比如Coredns等。没错，Kubeadm实际就是把Kubernetes各个组件都容器化了（除了kubelet），而minikube再用虚拟机把它们都跑在一起。

### Linux 环境

首先，检查Linux上是否支持虚拟化

```bash
grep -E --color 'vmx|svm' /proc/cpuinfo
```

其次，确保已经安装了kubectl

```bash
kubectl version
```

具体安装步骤参见 https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux 

安装完kubectl以后，接下来请确保已经安装了 Hypervisor 或者 VirtualBox 或者 KVM。注意，Minikube支持 --vm-driver=none选项，这样的话就会安装到主机上，而不是主机上虚拟处理的虚拟机上。

最后，安装Minikube

```bash
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
chmod +x minikube
# sudo mkdir -p /usr/local/bin/
sudo install minikube /usr/local/bin/
```

当你运行 `minikube start` 的时候，你就会发现从k8s.gcr.io拉取镜像失败，阿里云已经给出了解决方案

- https://github.com/AliyunContainerService/minikube
- https://yq.aliyun.com/articles/221687
- https://yq.aliyun.com/articles/672675

首先，如果minikube下载都下载不下来的话，可以改成以下地址

```bash
curl -Lo minikube https://github.com/kubernetes/minikube/releases/download/v1.11.0/minikube-linux-amd64
chmod +x minikube
sudo mv minikube /usr/local/bin/
```

在启动的时候指定了一些参数：

```bash
# 使用 docker 驱动
minikube start --image-mirror-country cn \
  --driver=docker \
  --cpus=4 \
  --memory=4096mb

# 使用 virtualbox 驱动
minikube start --image-mirror-country cn \
  --vm-driver=virtualbox \
  --cpus=4 \
  --memory=4096mb \
  --registry-mirror=https://xxxx.mirror.aliyuncs.com
```

为了访问海外的资源，阿里云提供了一系列基础设施，请按照如下参数进行配置。其中常见参数：

- `--driver=***` 从1.5.0版本开始，Minikube缺省使用本地最好的驱动来创建Kubernetes本地环境，测试过的版本 docker, kvm
- `--image-mirror-country cn` 将缺省利用 registry.cn-hangzhou.aliyuncs.com/google_containers 作为安装Kubernetes的容器镜像仓库 （阿里云版本可选）
- `--iso-url=***` 利用阿里云的镜像地址下载相应的 .iso 文件 （阿里云版本可选）
- `--registry-mirror=***`为了拉取Docker Hub镜像，需要为 Docker daemon 配置镜像加速，参考阿里云镜像服务
- `--cpus=2`: 为minikube虚拟机分配CPU核数
- `--memory=2048mb`: 为minikube虚拟机分配内存数
- `--kubernetes-version=***`: minikube 虚拟机将使用的 kubernetes 版本

## 部署服务

```bash
# 创建部署
kubectl create deployment hello-minikube --image=registry.cn-hangzhou.aliyuncs.com/google_containers/echoserver:1.10

# 将部署暴露为服务
kubectl expose deployment hello-minikube --type=NodePort --port=8080

# 查看服务
kubectl get pod

# 获取服务URL
minikube service hello-minikube --url

# 删除服务
kubectl delete services hello-minikube

# 删除部署
kubectl delete deployment hello-minikube

# 停止Minikube集群
minikube stop

# 删除Minikube集群
minikube delete

# 查看仪表盘
minikube dashboard
```

## 集群管理

containerd 是一个行业标准的容器运行时，它强调简单性、健壮性和可移植性。它可以作为Linux和Windows的守护进程，以管理其主机系统的完整容器生命周期。

```bash
# 指定Kubernetes版本
minikube start --kubernetes-version v1.11.0

# 指定VM驱动
minikube start --vm-driver=<driver_name>

# 为了用containerd作为容器运行时
minikube start --network-plugin=cni \
  --enable-default-cni \
  --container-runtime=containerd \
  --bootstrapper=kubeadm
```

## 配置集群

为了应用Minikube的一些特性，在minikube start命令的时候可以通过--extra-config选项来指定
格式为： component.key=value，其中component可以是下列之一的字符串

- kubelet
- apiserver
- proxy
- controller-manager
- etcd
- scheduler

例如：

```bash
--extra-config=kubelet.MaxPods=5
--extra-config=scheduler.LeaderElection.LeaderElect=true
--extra-config=apiserver.authorization-mode=RBAC
```

## 参考

- https://github.com/AliyunContainerService/k8s-for-docker-desktop/
- https://minikube.sigs.k8s.io/
- https://github.com/AliyunContainerService/minikube/
- https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux/
