---
title: Kubernetes 基本命令
date: 2020-02-05 11:02:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubectl 常用命令

<!--more-->

## Kubectl 常用命令

所有命令前都可以加上 watch 命令来观察状态的实时变化，如：`watch kubectl get pods --all-namespaces`

```bash

# 应用一个 yaml 配置，创建 Pod 或更新 Pod
kubectl apply -f <YAML>

# 查看组件状态
kubectl get cs

# 查看环境信息
kubectl cluster-info

# 查看 Node
kubectl get nodes -o wide

# 查看集群配置
kubectl -n kube-system get cm kubeadm-config -oyaml

# 运行容器
kubectl run nginx --image=nginx --replicas=2 --port=80

# 暴露服务
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# 查看命名空间
kubectl get namespace

# 查看容器
kubectl get pods -o wide
kubectl get deployment -o wide

# 查看服务
kubectl get service -o wide

# 查看详情
kubectl describe pod <Pod Name>
kubectl describe deployment <Deployment Name>
kubectl describe service <Service Name>

# 查看日志
kubectl logs -f <Pod Name>

# 删除容器和服务
kubectl delete deployment <Deployment Name>
kubectl delete service <Service Name>

# 配置方式运行
kubectl create -f <YAML>

# 配置方式删除
kubectl delete -f <YAML>

# 查看配置
kubeadm config view
kubectl config view

# 查看 Ingress
kubectl get ingress

# 查看持久卷
kubectl get pv

# 查看持久卷消费者
kubectl get pvc

# 查看 ConfigMap
kubectl get cm <ConfigMap Name>

# 修改 ConfigMap
kubectl edit cm <ConfigMap Name>

```

## 基本命令

```bash
kubectl --help
kubectl controls the Kubernetes cluster manager.

 Find more information at: https://kubernetes.io/docs/reference/kubectl/overview/

Basic Commands (Beginner):
  create         Create a resource from a file or from stdin.
  expose         使用 replication controller, service, deployment 或者 pod 并暴露它作为一个 新的
Kubernetes Service
  run            在集群中运行一个指定的镜像
  set            为 objects 设置一个指定的特征

Basic Commands (Intermediate):
  explain        查看资源的文档
  get            显示一个或更多 resources
  edit           在服务器上编辑一个资源
  delete         Delete resources by filenames, stdin, resources and names, or by resources and label selector

Deploy Commands:
  rollout        Manage the rollout of a resource
  scale          为 Deployment, ReplicaSet, Replication Controller 或者 Job 设置一个新的副本数量
  autoscale      自动调整一个 Deployment, ReplicaSet, 或者 ReplicationController 的副本数量

Cluster Management Commands:
  certificate    修改 certificate 资源.
  cluster-info   显示集群信息
  top            Display Resource (CPU/Memory/Storage) usage.
  cordon         标记 node 为 unschedulable
  uncordon       标记 node 为 schedulable
  drain          Drain node in preparation for maintenance
  taint          更新一个或者多个 node 上的 taints

Troubleshooting and Debugging Commands:
  describe       显示一个指定 resource 或者 group 的 resources 详情
  logs           输出容器在 pod 中的日志
  attach         Attach 到一个运行中的 container
  exec           在一个 container 中执行一个命令
  port-forward   Forward one or more local ports to a pod
  proxy          运行一个 proxy 到 Kubernetes API server
  cp             复制 files 和 directories 到 containers 和从容器中复制 files 和 directories.
  auth           Inspect authorization

Advanced Commands:
  diff           Diff live version against would-be applied version
  apply          通过文件名或标准输入流(stdin)对资源进行配置
  patch          使用 strategic merge patch 更新一个资源的 field(s)
  replace        通过 filename 或者 stdin替换一个资源
  wait           Experimental: Wait for a specific condition on one or many resources.
  convert        在不同的 API versions 转换配置文件
  kustomize      Build a kustomization target from a directory or a remote url.

Settings Commands:
  label          更新在这个资源上的 labels
  annotate       更新一个资源的注解
  completion     Output shell completion code for the specified shell (bash or zsh)

Other Commands:
  api-resources  Print the supported API resources on the server
  api-versions   Print the supported API versions on the server, in the form of "group/version"
  config         修改 kubeconfig 文件
  plugin         Provides utilities for interacting with plugins.
  version        输出 client 和 server 的版本信息

Usage:
  kubectl [flags] [options]

Use "kubectl <command> --help" for more information about a given command.
Use "kubectl options" for a list of global command-line options (applies to all commands).
```

## Kubectl 与 Docker 命令

Docker 命令和 Kubectl 命令有很多相似的地方，Docker 操作容器，Kubectl 操作 Pod（容器的集合）等。

### 运行容器

- docker：`docker run -d --restart=always -e DOMAIN=cluster --name nginx-app -p 80:80 nginx`
- kubectl：
  - `kubectl run --image=nginx nginx-app --port=80 --env="DOMAIN=cluster"`
  - `kubectl expose deployment nginx-app --port=80 --name=nginx-http`

> 注意： kubectl run 会创建一个 Deployment 并且默认会在后台运行，以上面的代码为例它的名称为 nginx-app。默认情况 Deployment 并不会将端口暴露出去，所以我们还需要使用 kubectl expose 暴露端口以供访问，此时还会创建一个同名的 Service。

### 查看已运行的容器

- docker：`docker ps`
- kubectl：
  - `kubectl get pods`
  - `kubectl get deployment`
  - `kubectl get service`

### 交互式进入容器

- docker：`docker exec -it <容器 ID/NAME> /bin/bash`
- kubectl：`kubectl exec -it <容器名> -- /bin/bash`

### 打印日志

- docker：`docker logs -f <容器 ID/NAME>`
- kubectl：`kubectl logs -f <容器名>`

### 停止和删除容器

- docker：
  - `docker stop <容器 ID/NAME>`
  - `docker rm <容器 ID/NAME>`
- kubectl：
  - `kubectl delete deployment <Deployment 名称>`
  - `kubectl delete service <Service 名称>`

> 注意： 不要直接删除 Pod，使用 kubectl 请删除拥有该 Pod 的 Deployment。如果直接删除 Pod，则 Deployment 将会重新创建该 Pod。

### 查看版本

- docker：`docker version`
- kubectl：`kubectl version`

### 查看环境信息

- docker：`docker info`
- kubectl：`kubectl cluster-info`

## 参考

- [kubernetes kubectl](https://kubernetes.io/zh/docs/reference/kubectl/)
