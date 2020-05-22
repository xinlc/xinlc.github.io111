---
title: Kubernetes 多种安装方式
date: 2020-05-20 13:53:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

<!--more-->

## 多种安装方式简介

### K8s for Docker Desktop

Docker Desktop 自带 K8s，适用于学习。

### Minikube

Minikube是由Kubernetes社区维护的单机版的Kubernetes集群，支持macOS, Linux, and Windows等多种操作系统平台，使用最新的官方stable版本，并支持Kubernetes的大部分功能，从基础的容器编排管理，到高级特性如负载均衡、Ingress，权限控制等。非常适合作为Kubernetes入门，或开发测试环境使用。Minikube实际是跑在本地的虚拟机中的，所以，需要先安装一套Hypervisor。

### 二进制部署

二进制部署完全看喜好，推荐大家都尝试一遍，成功与不成功不要紧，最主要的是了解一下Kubernetes的组件。会为你调试其它方案有很好的帮助。 我本人不是专业运维，所以也没有封装比较完善的脚本。但是理论上，如果对Kubernetes足够了解，完全可以把他创建成与kops 或者 kubespray 一样的方案。 如果你是折腾党，推荐试一试，就是之后升级之类的可能麻烦一些。

### kubeadm

官方推荐方案，也在大力发展。小问题比较多，扩展还是需要配合其它方案一起做。高可用上面还是需要自己花一些精力 如果只是玩玩，还是非常推荐的，但是想要正式环境使用，我还是推荐大家三思。

由于kubeadm更像是一套完整的脚本封装，所以想要扩展它，还是需要配合其它的方案一起做。升级之类的，可以参考官方的升级指南，还是比较容易的。

目前支持的操作系统主要有：Ubuntu 16.04+ /Debian 9/ CentOS 7 / RHEL 7 / Fedora/HypriotOS/Container Linux 对于云平台的支持一般，还是推荐大家在安装完毕后，手动扩展吧。

### Kops

kops是非常早就存在的一个项目，也是目前最靠谱的部署方案，但是由于与各云平台整合度非常高，所以也不是很推荐。当然如果你在国外，使用GCE/DigitalOcean/AWS的话，还是非常推荐的。国内就算了。

### Rancher

如果说kuernetes类似于IaaS+，那么Rancher就是标准的PaaS，如果你愿意按照Rancher的项目结构思路走，如果你团队不大，还是比较推荐的。Rancher有分为v1和v2版本，都是提供容器调度与编排，不同之处在于在k8s盛行之前有许多人都搞过容器编排，所以rancher v1上会有几种不同的编排模式，例如cattle ,swarm,kubernetes。从这里可以看出Rahcner v1时代，它给自己的定位是各种编排工具的上层，也就是k8s的上层，然后你再通过它去管理k8s。

因为k8s后来发展得势不可挡，所以Rancher v2应运而生，移除了其他类型的编排工具，只剩下k8s。所以总结一下，两者的关系是Rancher对k8s进行了功能的拓展与实现了和k8s集群交互的一些便捷工具，包括执行命令行，管理多个 k8s集群，查看k8s集群节点的运行状态等等。

Rancher这种做法放在云厂商就是：阿里云的k8s服务，谷歌的k8s服务亚马逊的k8s服务，他们都以k8s为底层核心调度系统，然后开发一些方便企业开发运维的工具。所以企业内部测试环境一般可以直接使用rancher去管理k8s或者使用Rancher去初始化一个k8s集群。如果要自建私有云，也可以考虑使用Rancher 或 KubeSphere，当然云厂商也有私有云的容器集群解决方案，可自行选择。

### Kubespray

最推荐的方案，有kops的集成度（还差一些，但是该有的都有了），升级方便。只要对它不爽，随时可以fork一份，按照自己意愿进行修改。

kubespray是一个基于Ansible的部署方案，所以部署过程大家都能看得懂（如果你看不懂，请问你们公司还需要人吗？我这个小研发最近打算转运维）

操作系统支持绝大部分基于systemd的系统，什么Container Linux/Debian/Ubuntu/CentOS/RHEL/Fedora/CentOS Atomic/openSUSE 支持绝大部分的云平台（阿里云，腾讯云什么的，目前还不支持。），也支持OpenStack，vSphere等虚拟化方案。所以自建机房什么的也完全不用担心啦。

kubespray也为我们准备好了高可用方案，支持绝大部分网络插件，DNS也支持很多类型，你可以根据自己的需要选择。

文档上，目前也很完整。国内如果想要部署，仅仅需要写一下部署配置，声明一些镜像地址（替换从国外拉镜像的尴尬）。就可以愉快的一键执行了。

## K8s for Docker Desktop 安装

需要先安装[docker desktop](https://www.docker.com/products/docker-desktop) 或 [docker-ce-desktop-mac](https://hub.docker.com/editions/community/docker-ce-desktop-mac)

为 Docker daemon 配置镜像加速，参考[阿里云镜像服务](https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors) 或中科大镜像加速地址https://docker.mirrors.ustc.edu.cn

由于国内网络环境问题，这里使用阿里云提供的K8s所需镜像：

```bash
git clone https://github.com/AliyunContainerService/k8s-for-docker-desktop.git
cd k8s-for-docker-desktop
./load_images.sh

# 在Windows上，使用 PowerShell
# .\load_images.ps1
```

开启 Kubernetes，并等待 Kubernetes 开始运行，Preferences -> Kubernetes -> 勾选 Enable Kubernetes & Show system containers(advanced)

说明:

- 如果因为安全策略无法执行 PowerShell 脚本，请在 “以管理员身份运行” 的 PowerShell 中执行 `Set-ExecutionPolicy RemoteSigned` 命令。
- 如果需要，可以通过修改 `images.properties` 文件自行加载你自己需要的镜像

**TIPS**：

在Mac上:

如果在Kubernetes部署的过程中出现问题，可以通过docker desktop应用日志获得实时日志信息：

```bash
pred='process matches ".*(ocker|vpnkit).*"
  || (process in {"taskgated-helper", "launchservicesd", "kernel"} && eventMessage contains[c] "docker")'
/usr/bin/log stream --style syslog --level=debug --color=always --predicate "$pred"
```

在Windows上:

如果在Kubernetes部署的过程中出现问题，可以在 C:\ProgramData\DockerDesktop下的service.txt 查看Docker日志; 
如果看到 Kubernetes一直在启动状态，请参考 [Issue 3769(comment)](https://github.com/docker/for-win/issues/3769#issuecomment-486046718) 和 [Issue 1962(comment)](https://github.com/docker/for-win/issues/1962#issuecomment-431091114)

### 配置 Kubernetes

可选操作: 切换Kubernetes运行上下文至 docker-desktop (之前版本的 context 为 docker-for-desktop)

```shell
kubectl config use-context docker-desktop
```

验证 Kubernetes 集群状态

```shell
kubectl cluster-info
kubectl get nodes
```

### 配置 Kubernetes 控制台

#### 部署 Kubernetes dashboard

```shell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-rc5/aio/deploy/recommended.yaml
```

或

```shell
kubectl create -f kubernetes-dashboard.yaml
```

检查 kubernetes-dashboard 应用状态

```shell
kubectl get pod -n kubernetes-dashboard
```

开启 API Server 访问代理

```shell
kubectl proxy
```

通过如下 URL 访问 Kubernetes dashboard

[http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/)

#### 配置控制台访问令牌

对于Mac环境

```shell
TOKEN=$(kubectl -n kube-system describe secret default| awk '$1=="token:"{print $2}')
kubectl config set-credentials docker-for-desktop --token="${TOKEN}"
echo $TOKEN
```

对于Windows环境

```shell
$TOKEN=((kubectl -n kube-system describe secret default | Select-String "token:") -split " +")[1]
kubectl config set-credentials docker-for-desktop --token="${TOKEN}"
echo $TOKEN
```

#### 登录dashboard的时候

选择 **令牌**

输入上文控制台输出的内容

或者选择 **Kubeconfig** 文件,路径如下：

```
Mac: $HOME/.kube/config
Win: %UserProfile%\.kube\config
```

点击登陆，进入Kubernetes Dashboard

### 配置 Ingress

说明：如果测试 Istio，不需要安装 Ingress

#### 安装 Ingress

[源地址安装说明](https://github.com/kubernetes/ingress-nginx/blob/master/docs/deploy/index.md)

```
- 若安装脚本无法安装，可以跳转到该地址查看最新操作
```

安装

```shell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-0.32.0/deploy/static/provider/cloud/deploy.yaml
```

验证

```shell
kubectl get pods --all-namespaces -l app.kubernetes.io/name=ingress-nginx
```

#### 测试示例应用

部署测试应用，详情参见[社区文章](https://matthewpalmer.net/kubernetes-app-developer/articles/kubernetes-ingress-guide-nginx-example.html)

```shell
kubectl create -f sample/apple.yaml
kubectl create -f sample/banana.yaml
kubectl create -f sample/ingress.yaml
```

测试示例应用

```bash
$ curl -kL http://localhost/apple
apple
$ curl -kL http://localhost/banana
banana
```

删除示例应用

```shell
kubectl delete -f sample/apple.yaml
kubectl delete -f sample/banana.yaml
kubectl delete -f sample/ingress.yaml
```

#### 删除 Ingress

```shell
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-0.32.0/deploy/static/provider/cloud/deploy.yaml
```

### 安装 Helm

可以根据文档安装 helm v3 https://helm.sh/docs/intro/install/

#### 在 Mac OS 上安装

##### 通过 brew 安装

```shell
# Use homebrew on Mac
brew install helm

# Add helm repo
helm repo add stable http://mirror.azure.cn/kubernetes/charts/

# Update charts repo
helm repo update
```

#### 在Windows上安装

如果在后续使用 helm 安装组件的过程中出现版本兼容问题，可以参考 `通过二进制包安装` 思路安装匹配的版本

```shell
# Use Chocolatey on Windows
# 注：安装的时候需要保证网络能够访问googleapis这个域名
choco install kubernetes-helm

# Change helm repo
helm repo add stable http://mirror.azure.cn/kubernetes/charts/

# Update charts repo
helm repo update
```

#### 测试 Helm (可选)

安装 Wordpress

```shell
helm install wordpress stable/wordpress
```

查看 wordpress 发布状态

```shell
helm install wordpress stable/wordpress
```

卸载 wordpress 发布

```shell
helm uninstall wordpress
```

### 配置 Istio

说明：Istio Ingress Gateway和Ingress缺省的端口冲突，请移除Ingress并进行下面测试

可以根据文档安装 Istio https://istio.io/docs/setup/getting-started/

#### 下载 Istio 1.5.0

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.5.0 sh -
cd istio-1.5.0
export PATH=$PWD/bin:$PATH
```

在Windows上，您可以手工下载Istio安装包，或者把`getLatestIstio.ps1`拷贝到你希望下载 Istio 的目录，并执行 - 说明：根据社区提供的[安装脚本](https://gist.github.com/kameshsampath/796060a806da15b39aa9569c8f8e6bcf)修改而来

```powershell
.\getLatestIstio.ps1
```

#### 安装 Istio

```shell
istioctl manifest apply --set profile=demo
```

#### 检查 Istio 状态

```shell
kubectl get pods -n istio-system
```

#### 为 `default` 名空间开启自动 sidecar 注入

```shell
kubectl label namespace default istio-injection=enabled
kubectl get namespace -L istio-injection
```

#### 安装 Book Info 示例

请参考 https://istio.io/docs/examples/bookinfo/

```shell
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
```

查看示例应用资源

```shell
kubectl get svc,pod
```

确认示例应用在运行中

```shell
kubectl exec -it $(kubectl get pod -l app=ratings -o jsonpath='{.items[0].metadata.name}') -c ratings -- curl productpage:9080/productpage | grep -o "<title>.*</title>"
```

创建 Ingress Gateway

```shell
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

查看 Gateway 配置

```shell
kubectl get gateway
```

确认示例应用可以访问

```shell
export GATEWAY_URL=localhost:80
curl -s http://${GATEWAY_URL}/productpage | grep -o "<title>.*</title>"
```

可以通过浏览器访问

http://localhost/productpage

#### 删除实例应用

```shell
samples/bookinfo/platform/kube/cleanup.sh
```

### 卸载 Istio

```shell
istioctl manifest generate --set profile=demo | kubectl delete -f -
```

## Minikube 方式部署

[Minikube](https://minikube.sigs.k8s.io/) 是一个工具，它使我们能够很容易地在本地运行Kubernetes。Minikube在你的笔记本的虚拟机中运行一个单节点的Kubernetes集群。

## 参考

- https://github.com/AliyunContainerService/k8s-for-docker-desktop/
- https://minikube.sigs.k8s.io/
- https://github.com/AliyunContainerService/minikube/
- https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux/
