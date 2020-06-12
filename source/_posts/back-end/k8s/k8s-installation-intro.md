---
title: Kubernetes 多种安装方式介绍
date: 2020-05-20 13:53:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

<!--more-->

## 多种安装方式简介

## K8s for Docker Desktop

Docker Desktop 自带 K8s，适用于学习。

## Minikube

Minikube是由Kubernetes社区维护的单机版的Kubernetes集群，支持macOS, Linux, and Windows等多种操作系统平台，使用最新的官方stable版本，并支持Kubernetes的大部分功能，从基础的容器编排管理，到高级特性如负载均衡、Ingress，权限控制等。非常适合作为Kubernetes入门，或开发测试环境使用。Minikube实际是跑在本地的虚拟机中的，所以，需要先安装一套Hypervisor。

## 二进制部署

二进制部署完全看喜好，推荐大家都尝试一遍，成功与不成功不要紧，最主要的是了解一下Kubernetes的组件。会为你调试其它方案有很好的帮助。 我本人不是专业运维，所以也没有封装比较完善的脚本。但是理论上，如果对Kubernetes足够了解，完全可以把他创建成与kops 或者 kubespray 一样的方案。 如果你是折腾党，推荐试一试，就是之后升级之类的可能麻烦一些。

## kubeadm

官方推荐方案，也在大力发展。小问题比较多，扩展还是需要配合其它方案一起做。高可用上面还是需要自己花一些精力 如果只是玩玩，还是非常推荐的，但是想要正式环境使用，我还是推荐大家三思。

由于kubeadm更像是一套完整的脚本封装，所以想要扩展它，还是需要配合其它的方案一起做。升级之类的，可以参考官方的升级指南，还是比较容易的。

目前支持的操作系统主要有：Ubuntu 16.04+ /Debian 9/ CentOS 7 / RHEL 7 / Fedora/HypriotOS/Container Linux 对于云平台的支持一般，还是推荐大家在安装完毕后，手动扩展吧。

## Kops

kops是非常早就存在的一个项目，也是目前最靠谱的部署方案，但是由于与各云平台整合度非常高，所以也不是很推荐。当然如果你在国外，使用GCE/DigitalOcean/AWS的话，还是非常推荐的。国内就算了。

## Rancher

如果说kuernetes类似于IaaS+，那么Rancher就是标准的PaaS，如果你愿意按照Rancher的项目结构思路走，如果你团队不大，还是比较推荐的。Rancher有分为v1和v2版本，都是提供容器调度与编排，不同之处在于在k8s盛行之前有许多人都搞过容器编排，所以rancher v1上会有几种不同的编排模式，例如cattle ,swarm,kubernetes。从这里可以看出Rahcner v1时代，它给自己的定位是各种编排工具的上层，也就是k8s的上层，然后你再通过它去管理k8s。

因为k8s后来发展得势不可挡，所以Rancher v2应运而生，移除了其他类型的编排工具，只剩下k8s。所以总结一下，两者的关系是Rancher对k8s进行了功能的拓展与实现了和k8s集群交互的一些便捷工具，包括执行命令行，管理多个 k8s集群，查看k8s集群节点的运行状态等等。

Rancher这种做法放在云厂商就是：阿里云的k8s服务，谷歌的k8s服务亚马逊的k8s服务，他们都以k8s为底层核心调度系统，然后开发一些方便企业开发运维的工具。所以企业内部测试环境一般可以直接使用rancher去管理k8s或者使用Rancher去初始化一个k8s集群。如果要自建私有云，也可以考虑使用[Rancher](https://github.com/rancher/rancher) 或 [KubeSphere](https://github.com/kubesphere/kubesphere)，当然云厂商也有私有云的容器集群解决方案，可自行选择。

## Kubespray 方式部署

最推荐的方案，有kops的集成度（还差一些，但是该有的都有了），升级方便。只要对它不爽，随时可以fork一份，按照自己意愿进行修改。

kubespray是一个基于Ansible的部署方案，所以部署过程大家都能看得懂（如果你看不懂，请问你们公司还需要人吗？我这个小研发最近打算转运维）

操作系统支持绝大部分基于systemd的系统，什么Container Linux/Debian/Ubuntu/CentOS/RHEL/Fedora/CentOS Atomic/openSUSE 支持绝大部分的云平台（阿里云，腾讯云什么的，目前还不支持。），也支持OpenStack，vSphere等虚拟化方案。所以自建机房什么的也完全不用担心啦。

kubespray也为我们准备好了高可用方案，支持绝大部分网络插件，DNS也支持很多类型，你可以根据自己的需要选择。

文档上，目前也很完整。国内如果想要部署，仅仅需要写一下部署配置，声明一些镜像地址（替换从国外拉镜像的尴尬）。就可以愉快的一键执行了。

## sealos 方式部署

最近发现的一个开源工具，只能用丝滑一词形容的kubernetes高可用安装（kubernetes install）工具，一条命令，离线安装，包含所有依赖，内核负载不依赖haproxy keepalived,纯golang开发,99年证书,支持v1.16 v1.15 v1.17 v1.18! https://sealyun.com

- 99年证书
- 不依赖ansible haproxy keepalived, 一个二进制工具，0依赖
- 离线安装，不同kubernetes版本下载对应不同版本的资源包即可,离线包包含所有二进制文件配置文件和镜像
- 高可用通过ipvs实现的localLB，占用资源少，稳定可靠，类似kube-proxy的实现
- 几乎可兼容所有支持systemd的x86_64架构的环境
- 轻松实现集群节点的增加/删除
- 上千用户在线上环境使用sealos，稳定可靠
- 资源包放在阿里云oss上，再也不用担心网速
- dashboard ingress prometheus等APP 同样离线打包，一键安装
