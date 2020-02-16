---
title: 阿里云专有网络 VPC 自建 NAT 网关
date: 2019-10-06 15:20:00
categories: Linux
tags:
  - linux
  - nat
---


`NAT`（Network Address Translation，网络地址转换），分为 `DNAT`（Destination）和 `SNAT`（Source）。

`DNAT`，使用 `PREROUTING`，用于外网访问内网里的主机服务器，透明转发或端口映射。

`SNAT`，使用 `POSTROUTING` ，用于内网里的主机，访问外网，即分享公网IP。

<!--more-->

## SLB、EIP、NAT网关之间区别

[请看云栖社区](https://yq.aliyun.com/articles/391631) 评论中有一段解释非常有趣哈哈哈……

如果按照现实中（婚恋）的理解：

1. 早期的弹性ip（结婚）：只是用来一对男女之间互相获取婚恋关系，比如结婚。
2. 现在的弹性IP（结婚）：是除了婚恋关系（结婚），还会共享爱情（SLB）、各自的亲朋好友（NAT）、以及共享财产等。
3. SLB负载均衡（婚恋网）：就类似现在的婚恋网，只有用户有需求（美女），婚恋网就会将用户的大量需求（身高、职业、长相等）去和后端的信息匹配（美女），从而找到合适的对象。
4. NAT网关（处对象）：很多男女之间、各自都有自己的想要的婚姻，可以后很多单身男追很多单身女。都保持自己的路径。

## 阿里云专有网络 VPC 自建 NAT 网关

这部分来源 [阿里云专有网络VPC自建NAT网关](https://amos-x.com/index.php/amos/archives/centos7-aliyun-nat/)

### 前言

在阿里云中购买服务器，可以免费自建专有网络VPC，就可以将购买的服务器放在一个网段中，成为互通的内网，加快内网中服务器的访问速度。但是专有网络中不是每一台服务器都有公网IP和带宽的，在访问服务器时，我们可以通过nginx，负载均衡等来实现对内网服务器的访问。但反过来，内网服务器要访问外网，就需要有NAT网关，但是阿里云的NAT网关是需要额外花钱购买共享带宽的，也就是专有网络中的服务器可以用购买的共享带宽来上网。但是，这要钱啊！

在我们已经购买了公网IP和带宽的情况下，就可以利用现有的公网ip和带宽，在专有网络内，自建NAT网关，实现专有网络内所有服务器的上网。

注意：在阿里云的传统网络中，是不支持自建NAT网关的。只有在专有网络VPC中，才可以，但是VPC是免费创建的！免费！ 很好，都不要钱。

下面我们就记录介绍一下如何在阿里云的的VPC中，自建NAT网关，实现上网。另外，别的云服务，方法类似，可以借鉴参考。

### 正文

首先，你需要有如下条件：

- 一台带公网IP和带宽的阿里云ECS
- 一个VPC专有网络，并上面有IP和带宽的ECS放入专有网络内

好了，下面进行自建NAT的步骤。

### 1. 添加路由条目

进入专有网络VPC中，进入路由表，进入路由表管理界面，选择添加路由条目

![1][1]
![2][2]

按如下配置新添加的路由条目，选择有公网IP和带宽的ECS实例作为下一跳。

![3][3]

OK，阿里云控制台上只做这一个设置即可。

### 2. 配置服务器

下面进入你刚才作为下一跳的ECS实例，按照如下进行操作配置

```bash
# 开启firewalld防火墙，默认是关闭的。
$ systemctl enable firewalld
$ systemctl start firewalld

# 网卡默认是在public的zone内，也是默认zone。永久添加源地址转换功能
$ firewall-cmd --add-masquerade --permanent
$ firewall-cmd --reload

# 添加网卡的ip转发功能，添加如下配置到文件最后
$ vim /etc/sysctl.conf
----------------------------------------------------------------
net.ipv4.ip_forward=1
----------------------------------------------------------------
  
# 重载网络配置生效
$ sysctl -p
```

OK，到此，自建NAT网关成功，实现了内网主机通过这台机进行上网，而反向的访问，就可以使用nginx的反向代理进行实现。

## 参考

- [阿里云专有网络VPC自建NAT网关](https://amos-x.com/index.php/amos/archives/centos7-aliyun-nat/)
- [iptables学习笔记：端口转发之“外网访问内网”](https://blog.csdn.net/subfate/article/details/52659446)
- [详解SLB、EIP、NAT网关之间区别， 合理选择云上公网入口](https://yq.aliyun.com/articles/391631)

[1]: /images/linux/aliyun-nat/1.png
[2]: /images/linux/aliyun-nat/2.png
[3]: /images/linux/aliyun-nat/3.png
