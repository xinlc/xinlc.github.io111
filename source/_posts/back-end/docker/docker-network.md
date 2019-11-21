---
title: Docker 之 网络配置
date: 2019-11-12 17:57:00
categories: Docker
tags:
  - docker
---

Docker 允许通过外部访问容器或容器互联的方式来提供网络服务。

<!--more-->

## 外部访问容器

容器中运行一些网络应用，要让外部也可以访问这些应用，可以通过 `-P` 或 `-p` 参数来指定端口映射。

当使用 `-P` 标记时，Docker 会随机映射一个 `49000~49900` 的端口到内部容器开放的网络端口。

使用 `docker container ls` 可以看到，本地主机的 `32768` 被映射到了容器的 `5000` 端口。访问本机的 `32768` 端口即可访问容器内 web 应用提供的界面。

```bash
$ docker run -d -P training/webapp python app.py

$ docker container ls -l
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS                     NAMES
2c9576031bc8        training/webapp     "python app.py"     29 seconds ago      Up 27 seconds       0.0.0.0:32768->5000/tcp   goofy_meitner

```

-p 则可以指定要映射的端口，并且，在一个指定端口上只可以绑定一个容器。支持的格式有 `ip:hostPort:containerPort | ip::containerPort | hostPort:containerPort`。

```bash
# 映射所有接口地址
# 使用 hostPort:containerPort 格式本地的 5000 端口映射到容器的 5000 端口，可以执行
$ docker run --rm -p 5000:5000 training/webapp python app.py

# 映射到指定地址的指定端口
# 使用 ip:hostPort:containerPort 格式指定映射使用一个特定地址，比如 localhost 地址 127.0.0.1
$ docker run --rm -p 127.0.0.1:5000:5000 training/webapp python app.py

# 映射到指定地址的任意端口
# 使用 ip::containerPort 绑定 localhost 的任意端口到容器的 5000 端口，本地主机会自动分配一个端口。
$ docker run --rm -p 127.0.0.1::5000 training/webapp python app.py

# 还可以使用 udp 标记来指定 udp 端口
$ docker run --rm -p 127.0.0.1:5000:5000/udp training/webapp python app.py

# 查看映射端口配置
# 使用 docker port 来查看当前映射的端口配置，也可以查看到绑定的地址
$ docker port goofy_meitner 5000
0.0.0.0:32768

# -p 标记可以多次使用来绑定多个端口
$ docker run --rm \
    -p 5000:5000 \
    -p 3000:80 \
    training/webapp \
    python app.py
```

## Docker 的网络模式

目前 Docker 支持以下网络模式。

| 模式      | 是否支持跨主机 | 南北向通信机制                             |                      东西向通信机制 |
| :-------- | :------------: | :----------------------------------------- | ----------------------------------: |
| bridge    |       否       | 宿主机端口绑定                             |                   通过 Linux bridge |
| host      |       是       | 按宿主机网络通信                           |                    按宿主机网络通信 |
| container |       否       | 宿主机端口绑定                             |                      通过 link 通信 |
| overlay   |       是       | 基于 bridge 网络模型，使用 docker_gwbridge | 隧道传输，基于 vxlan 协议的网络实现 |
| macvlan   |       是       | 基于 linux kernel 模块                     |              基于 linux kernel 模块 |
| none      |       否       | 无法通信                                   | 需要手动为 Docker 容器添加网卡、配置 IP 等，如使用: [pipework](https://github.com/jpetazzo/pipework) 工具|

## bridge

bridge 模式，使用 `--network=bridge` 指定，默认设置。

这是 Dokcer 网络的默认设置，为容器创建独立的网络命名空间，容器具有独立的网卡等所有单独的网络栈，是最常用的使用方式。在 `docker run` 启动容器的时候，如果不加 `--network` 参数，就默认采用这种网络模式。

安装完 Docker，系统会自动添加一个供 Docker 使用的网桥 `docker0`，我们创建一个新的容器时，容器通过 `DHCP` 获取一个与 `docker0` 同网段的 IP 地址，并默认连接到 `docker0` 网桥，容器和 `docker0` 之间通过 `veth` 进行连接，`veth` 相当于一根虚拟网线，连接容器和虚拟交换机，以此实现容器与宿主机的网络互通。网络结构如下图：

![1][1]

### 使用 bridge

```bash
# 创建 bridge 自定义网络
docker network create -d bridge my-net

# 运行一个容器并连接到新建的 my-net 网络
docker run -it --rm --name busybox1 --network my-net busybox sh

# 打开新的终端，再运行一个容器并加入到 my-net 网络
docker run -it --rm --name busybox2 --network my-net busybox sh
```

再打开一个新的终端查看容器信息

```bash
$ docker container ls

CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
dc4761e5cbf0        busybox             "sh"                40 seconds ago      Up 39 seconds                           busybox2
3a1bcbabeb63        busybox             "sh"                47 seconds ago      Up 46 seconds                           busybox1
```

下面通过 ping 来证明 busybox1 容器和 busybox2 容器建立了互联关系。

在 busybox1 容器内 `ping busybox2`，查看是否可以连通。

```bash
/ # ping busybox2
PING busybox2 (172.18.0.3): 56 data bytes
64 bytes from 172.18.0.3: seq=0 ttl=64 time=0.176 ms
64 bytes from 172.18.0.3: seq=1 ttl=64 time=0.228 ms
```

容器的访问控制，主要通过 Linux 上的 iptables 防火墙来进行管理和实现。可以运行 `iptables -t nat -L -n` 查看。

## host

host 模式，使用 `--network=host` 指定。

Docker 使用了 Linux 的 `Namespaces` 技术来进行资源隔离，如 `PID Namespace` 隔离进程，`Mount Namespace` 隔离文件系统，`Network Namespace` 隔离网络等。一个 `Network Namespace` 提供了一份独立的网络环境，包括网卡、路由、Iptable 规则等都与其他的 `Network Namespace`隔离。

一个 Docker 容器一般会分配一个独立的 `Network Namespace`。但如果启动容器的时候使用 `host` 模式，那么这个容器将不会获得一个独立的 `Network Namespace`，而是和宿主机共用一个 `Network Namespace`。容器将不会虚拟出自己的网卡，配置自己的IP等，而是使用宿主机的IP和端口。就和直接跑在宿主机中一样。但是容器的文件系统、进程列表等还是和宿主机隔离的。

### 使用 host

host 模式只支持 Linux 宿主机，Mac 下是不好用的。

```bash
# 此时会 web 容器会占用主机 80 端口，可以访问 http://localhost/
$ docker run --rm --name web --network host nginx
```

## container link

> 注意：官方已不建议使用。

container 模式，使用 `--link=NAME_or_ID:alias` 指定。

这个模式指定新创建的容器和已经存在的一个容器共享一个 Network Namespace，而不是和宿主机共享。新创建的容器不会创建自己的网卡与配置 IP，而是和一个指定的容器共享 IP、端口范围等。同样，两个容器除了网络方面，其他方面仍然是隔离的。两个容器的进程可以通过 lo 网卡设备通信。

### 使用 link

```bash
# 运行一个容器
docker run -it --rm --name busybox1 busybox sh

# 打开新的终端，再运行一个容器并连接 busybox1
docker run -it --rm --name busybox2 --link busybox1:busybox1 busybox sh
```

`--link` Docker 通过更新容器内的环境变量和 `/etc/hosts` 实现。

## overlay

overlay 适用于 Docker 宿主机集群中的各个独立的容器实例之间通信。为集群中的 Docker 容器实例提供跨多个 Docker 引擎的网络连接。

它是 `docker swarm` 内置的跨主机通信方案，这是一个基于 VXLAN（VXLAN 可以封装 L2 L3，协议数据，是一种隧道协议） 协议的网络实现，其作用是虚拟出一个子网，让处于不同主机的容器能透明地使用这个子网。所以跨主机的容器通信就变成了在同一个子网下的容器通信，看上去就像是同一主机下的 bridge 网络通信。

分析 `docker swarm` 网络原理，这里省略创建 swarm 集群，改天另开一篇。

```bash
$ docker network ls
NETWORK ID          NAME                   DRIVER              SCOPE
sulgilqz97bb        backend_default        overlay             swarm
716ix1fud0xg        frontend_default       overlay             swarm
eaae518b7597        bridge                 bridge              local
6e97040883d2        docker_gwbridge        bridge              local
c4e4b65234d9        host                   host                local
04138ihk9hft        ingress                overlay             swarm
0fdddcabdca4        none                   null                local
```

其中 ingress 为 docker 默认的 overlay 网络。

查看 ingress 网络信息 `docker network inspect ingress`：

```bash
[
    {
        "Name": "ingress",
        "Id": "04138ihk9hfteejpile2owxl1",
        "Created": "2019-11-15T18:17:59.286511557+08:00",
        "Scope": "swarm",
        "Driver": "overlay",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": null,
            "Config": [
                {
                    "Subnet": "10.0.0.0/24",
                    "Gateway": "10.0.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": true,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "ingress-sbox": {
                "Name": "ingress-endpoint",
                "EndpointID": "4ee0d0dae472c42b9830d5e75439e27457fd49a529861d8d8c1327dc9bb5f1c9",
                "MacAddress": "02:42:0a:00:00:02",
                "IPv4Address": "10.0.0.2/24",
                "IPv6Address": ""
            }
        },
        "Options": {
            "com.docker.network.driver.overlay.vxlanid_list": "4096"
        },
        "Labels": {},
        "Peers": [
            {
                "Name": "085cc36f1096",
                "IP": "192.168.0.80"
            },
            {
                "Name": "8eef30a2b4f4",
                "IP": "192.168.0.79"
            },
            {
                "Name": "c3637240ae66",
                "IP": "192.168.0.78"
            }
        ]
    }
]
```

由于 orverlay 网络模型是基于 vxlan 协议的网络实现，所以根据上面的网络信息可知，它是要在三层网络中虚拟出二层网络，即跨网段建立虚拟子网，也就是把 docker 要发送的信息先发送到虚拟子网地址 `10.0.0.1`，再由虚拟子网包装为宿主机的真实网网址 `192.168.0.80`，这样做的好处就是不会公开暴露容器的端口，让这些事情交给 overlay 网络驱动去做就行了，而且在同一台服务器，不会引起端口冲突，最重要的一点是可以实现集群容器间的负载均衡。

![overlay xval][2]

正如它的名字一样，在所有容器的上面一层，覆盖了一层网络（所有 overlay 在每个 host 都会有一份），该网络可以使在集群中的容器像本地通信一样，所以 orverlay 网络模型也称之为覆盖网络。

docker 使用vxlan 封装的网络拓扑是怎么样的？

如下图，使用 `docker_gwbridge` 进行容器内部通信，以及外部通信， 使用ovnet 进行overlay 专有网段通信

![docker_gwbridge][3]

ovnet overlay network 结构是怎么样的？

![ovnet namespace][4]

如果有多个 overlay ，每个 overlay 使用不同的 `vxlan id` 来标识，每个单独的 overlay 链接到 ovnet 命名空间中不同的 bridge 设备。通过 bridge 设备转发数据到 vxlan 设备，vxlan 设备对数据进行封装（加vxlan header 等）后，转发（arp proxy）数据到主机中，主机网络将数据发出。

### 构建自定义 overlay 网络集群

```bash
# 新建网络
$ docker network create -d overlay my-overlay-net

# 创建 etcd 服务
$ docker service create \
              --name etcd \
              --replicas 2 \
              --publish published=8080,target=8080 \
              --network my-overlay-net \
              etcd:latest

# 创建mysql 服务
$ docker service create \
              --name mysql \
              --replicas 2 \
              --publish published=3306,target=3306 \
              --network my-overlay-net \
              mysql:5.7
```

## macvlan

macvlan 本身是 `Linxu kernel` 的模块，本质上是一种网卡虚拟化技术。其功能是允许在同一个物理网卡上虚拟出多个网卡，通过不同的MAC地址在数据链路层进行网络数据的转发，一块网卡上配置多个 MAC 地址（即多个 interface），每个 interface 可以配置自己的 IP，Docker 的 macvlan 网络实际上就是使用了 Linux 提供的 macvlan 驱动。

### 使用 macvaln

```bash
#!/usr/bin/env bash

#检查 是否支持 macvlan
modprobe macvlan
lsmod | grep macvlan

# 开启网卡混杂模式 promiscuity=1 on
ip -d link show eth1 | grep promisc
# ip link set [interface] promisc on
ip link set eth0 promisc on;
ifconfig eth0 promisc

ip netns add net1

# 查看eth0 网卡地址
ifconfig eth0

# 创建的格式为 ip link add link <PARENT> <NAME> type macvlan，
# 其中 <PARENT> 是 macvlan 接口的父 interface 名称，<NAME> 是新建的 macvlan 接口的名称，这个名字可以任意取。
# 使用 ip link 可以看到我们刚创建的 macvlan 接口，除了它自己的名字之外，后面还跟着父接口的名字
# 使用 bridge 模式，没加这个 默认net1，net2 没有ping 通
ip link add link eth0 mac1 type macvlan mode bridge

# 查看
ip -d link show mac1

ip link set mac1 netns net1
# 与 eth0 网段相同
ip netns exec net1 ip addr add 10.0.2.21/24 dev mac1

ip netns exec net1 ip link set mac1 up
ip netns exec net1 ip a

# 添加默认路由,与主机eth0 默认路由一致
ip netns exec net1 route add default gw 10.0.2.2

ip netns add net2
ip link add link eth0 mac2 type macvlan
ip link set mac2 netns net2
ip netns exec net2 ip addr add 10.0.2.22/24 dev mac2 mode bridge
ip netns exec net2 ip link set mac2 up
ip netns exec net2 route add default gw 10.0.2.2

ip netns exec net1 ping 10.0.2.22
ip netns exec net2 ping 10.0.2.21

# 修改 mode ,net1，net2 没有ping 通
ip netns exec net2 ip link set mac2 type macvlan mode private
ip netns exec net1 ping 10.0.2.22
ip netns exec net2 ping 10.0.2.21
```

macvlan 在 docker 中应用测试

```bash
# 1. 单机
docker network create -d macvlan --subnet=10.0.2.0/24 --gateway=10.0.2.2 -o parent=eth0 macvlan0

docker run --rm -dit --network macvlan0  --name c1 busybox sh
docker run --rm -dit --network macvlan0  --name c2 busybox sh
docker exec -it c1 ping c2
docker exec -it c2 ping c1

# baidu
docker exec -it c2 ping 180.97.33.108

# 2. macvlan 跨主机通信

# 一定需要对网卡开启混杂模式 ，特别是虚拟机的设置。
sudo ip link set eth1  promisc [on|off]

# host A
docker network create -d macvlan --subnet=192.168.99.0/24 --gateway=192.168.99.1 -o parent=eth1 macvlan1
docker run --rm -dit --network macvlan1  --name c3 --ip 192.168.99.201 busybox sh
# host B
docker network create -d macvlan --subnet=192.168.99.0/24 --gateway=192.168.99.1 -o parent=eth1 macvlan1
docker run --rm -dit --network macvlan1  --name c3 --ip 192.168.99.202 busybox sh

#Host a
docker exec -it c3 ping 192.168.99.202

# host b
docker exec -it c3 ping 192.168.99.201
```

## none

none 模式，使用 `--network=none` 指定。

在这种模式下，容器有独立的网络栈，但不包含任何网络配置，只具有 lo 这个 `loopback` 网卡用于进程通信。也就是说，none 模式为容器做了最少的网络设置，但是俗话说得好“少即是多”，在没有网络配置的情况下，通过第三方工具或者手工的方式，开发这任意定制容器的网络，提供了最高的灵活性。通常，这表明要使用其他的第三方网络驱动器或手动为 Docker 容器添加网卡、配置 IP 等，如使用: [pipework](https://github.com/jpetazzo/pipework) 工具。

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

## 参考

- [docker network](https://docs.docker.com/network/)
- [docker practice](https://yeasy.gitbooks.io/docker_practice/content/network/)

[1]: /images/docker/docker-network/1.jpg
[2]: /images/docker/docker-network/2.jpg
[3]: /images/docker/docker-network/3.jpg
[4]: /images/docker/docker-network/4.jpg