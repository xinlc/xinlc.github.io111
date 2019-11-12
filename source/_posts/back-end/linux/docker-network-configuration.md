---
title: Docker 的网络配置
date: 2019-11-12 17:57:00
categories: Linux
tags:
  - docker
  - network
---

Docker 的网络配置。

<!--more-->

## Docker 网络模式

待完善。。。

## Docker容器网络互联

待完善。。。

## 问题

### docker 访问宿主机 ip 时

[NO ROUTE TO HOST network request from container to host-ip:port published from other container](https://forums.docker.com/t/no-route-to-host-network-request-from-container-to-host-ip-port-published-from-other-container/39063)

1. 报错：No route to host

`原因`：默认情况下，`firewalld`将阻止同一个`docker`主机上的`intercontainer`网络。要允许`docker`容器之间的通信，需要防火墙允许`docker0 ip` 或 自定义创建的`network ip`通过

```bash
# 获取到相关 IP。容器内用 docker0 IP访问
ifconfig
ip addr show docker0

# 第一种 开放要访问的端口
firewall-cmd --zone=public --add-port=8081/tcp --permanent

# 第二种
# 用 host 模式
# 注意：host 模式 就不能绑定端口了，所有容器端口都对应属主机端口

# 第三种
# 注意这里的 172.17.0.0/16 可以匹配 172.17.xx.xx IP 段的所有 IP.
firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source address=172.17.0.0/16 accept'

# 或
# /etc/firewalld/zones/public.xml 中添加防火墙规则
<rule family="ipv4">
  <source address="172.17.0.0/16" />
  <accept />
</rule>

firewall-cmd --reload
systemctl restart docker

# 如果还不好用检测检查
/etc/hosts.allow and hosts.deny

# 还不好用，再尝试清空防火墙规则，并重启docker服务来解决。因为docker是通过iptables来配置网络时间的隔离的，有时可能会配置出错误的条目，使得内部容器的访问出现问题。

iptables -F && iptables -X && iptables -Z && iptables -t nat -F
systemctl restart docker.service

# 还不好用……执行以下代码
nmcli connection modify docker0 connection.zone trusted
systemctl stop NetworkManager.service
firewall-cmd --permanent --zone=trusted --change-interface=docker0
systemctl start NetworkManager.service
nmcli connection modify docker0 connection.zone trusted
systemctl restart docker.service

```

2. Host is unreachable (Host unreachable)

```bash
# 获取网络 ip
docker network ls
docker inspect <network id>

"IPAM": {
  "Config": [
    {
      "Subnet": "192.168.48.0/20",
      "Gateway": "192.168.48.1"
    }
  ]
}

firewall-cmd --zone=trusted --add-source=172.17.0.1/16 --permanent
firewall-cmd --zone=trusted --add-source=192.168.48.1/20 --permanent

firewall-cmd --reload
```
