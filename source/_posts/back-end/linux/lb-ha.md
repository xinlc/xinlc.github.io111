---
title: 负载均衡高可用 之 Keepalived
date: 2020-04-26 20:00:00
categories: Linux
tags:
  - Keepalived
---

Keepalived + HAProxy/Nginx 实现高可用负载均衡。

<!--more-->

## Keepalived 介绍

Keepalived 是一种高性能的服务器高可用或热备解决方案， Keepalived 可以用来防止服务器单点故障的发生，通过配合 HAProxy 或 Nginx 可以实现 web 前端服务的高可用。

Keepalived 以 VRRP 协议为实现基础，用 VRRP 协议来实现高可用性(HA)。 VRRP(Virtual RouterRedundancy Protocol)协议是用于实现路由器冗余的协议， VRRP 协议将两台或多台路由器设备虚拟成一个设备，对外提供虚拟路由器 IP(一个或多个)，而在路由器组内部，如果实际拥有这个对外 IP 的路由器如果工作正常的话就是 MASTER，或者是通过算法选举产生， MASTER 实现针对虚拟路由器 IP 的各种网络功能，如 ARP 请求， ICMP，以及数据的转发等；其他设备不拥有该虚拟 IP，状态是 BACKUP，除了接收 MASTER 的VRRP 状态通告信息外，不执行对外的网络功能。当主机失效时，BACKUP 将接管原先 MASTER 的网络功能。VRRP 协议使用多播数据来传输 VRRP 数据， VRRP 数据使用特殊的虚拟源 MAC 地址发送数据而不是自身网卡的 MAC 地址， VRRP 运行时只有 MASTER 路由器定时发送 VRRP 通告信息，表示 MASTER 工作正常以及虚拟路由器 IP(组)， BACKUP 只接收 VRRP 数据，不发送数据，如果一定时间内没有接收到 MASTER 的通告信息，各 BACKUP 将宣告自己成为 MASTER，发送通告信息，重新进行 MASTER 选举状态。

## LVS、Ngnix、HAProxy 负载均衡比较

负载均衡（Load Balance）是应用于互联网后台系统架构设计中的各层，它将请求均匀分摊到多个操作单元上执行。

目前，在线上环境中应用较多的负载均衡器硬件有F5 BIG-IP，但是硬件设备昂贵，不如软件适应互联网公司的快速发展。最常用的负载均衡软件有LVS、HAProxy和Nginx，结合高可用软件有Heartbeat、Keepalived，可以搭建出承载海量请求的成熟架构如LVS+Keepalived、HAProxy+keepalived等.

三种负载均衡软件LVS、HAProxy和Nginx的优缺点说明如下：

### LVS 负载均衡的特点

- 抗负载能力强。抗负载能力强、性能高，能达到F5硬件的60%；对内存和cpu资源消耗比较低
- 工作在网络4层，通过vrrp协议转发（仅作分发之用），具体的流量由linux内核处理，因此没有流量的产生。
- 稳定性、可靠性好，自身有完美的热备方案；（如:LVS+Keepalived）
- 应用范围比较广，可以对所有应用做负载均衡；
- 不支持正则处理，不能做动静分离。
- 支持负载均衡算法:rr（轮循）、wrr（带权轮循）、lc（最小连接）、wlc（权重最小连接）
- 配置 复杂，对网络依赖比较大，稳定性很高。

### HAProxy 负载均衡的特点

- 支持两种代理模式: TCP（四层）和HTTP（七层），支持虚拟主机；
- 能够补充Nginx的一些缺点比如Session的保持，Cookie的引导等工作
- 支持url检测后端的服务器出问题的检测会有很好的帮助。
- 更多负载均衡策略比如:动态加权轮循(Dynamic Round Robin)，加权源地址哈希(Weighted Source Hash)，加权URL哈希和加权参数哈希(Weighted Parameter Hash)已经实现
- 单纯从效率上来讲HAProxy更会比Nginx有更出色的负载均衡速度。
- HAProxy可以对Mysql进行负载均衡，对后端的DB节点进行检测和负载均衡。
- 支持负载均衡算法:Round-robin（轮循）、Weight-round-robin（带权轮循）、source（原地址保持）、RI（请求URL）、rdp-cookie（根据cookie）
- 不能做Web服务器即Cache。

### Ngnix 负载均衡的特点

- 工作在网络的7层之上，可以针对http应用做一些分流的策略，比如针对域名、目录结构；
- Nginx对网络的依赖比较小，理论上能ping通就就能进行负载功能；
- Nginx安装和配置比较简单，测试起来比较方便；
- 也可以承担高的负载压力且稳定，一般能支撑超过1万次的并发；
- 对后端服务器的健康检查，只支持通过端口来检测，不支持通过url来检测。
- Nginx对请求的异步处理可以帮助节点服务器减轻负载；
- Nginx仅能支持http、https和Email协议，这样就在适用范围较小。
- 不支持Session的直接保持，但能通过ip_hash来解决。、对Big request header的支持不是很好，
- 支持负载均衡算法:Round-robin（轮循）、Weight-round-robin（带权轮循）、Ip-hash（Ip哈希）
- Nginx还能做Web服务器即Cache功能。

### 适用业务场景

网站建设初期，可以选用Nigix/HAproxy作为反向代理负载均衡（或者流量不大都可以不选用负载均衡），因为其配置简单，性能也能满足一般的业务场景。如果考虑到负载均衡器是有单点问题，可以采用Nginx+Keepalived/HAproxy+Keepalived避免负载均衡器自身的单点问题。

网站并发达到一定程度之后，为了提高稳定性和转发效率，可以使用LVS、毕竟LVS比Nginx/HAproxy要更稳定，转发效率也更高。不过维护LVS对维护人员的要求也会更高，投入成本也更大。

Niginx与Haproxy比较: Niginx支持七层、用户量最大，稳定性比较可靠。Haproxy支持四层和七层，支持更多的负载均衡算法，支持session保存等。具体选型看使用场景，目前来说Haproxy由于弥补了一些Niginx的缺点致使其用户量也不断在提升。

**衡量负载均衡器好坏的几个重要因素**

- 会话率: 单位时间内的处理的请求数
- 会话并发能力: 并发处理能力
- 数据率: 处理数据能力

经过官方测试统计，haproxy 单位时间处理的最大请求数为20000个，可以同时维护40000-50000个并发连接，最大数据处理能力为10Gbps。综合上述，haproxy是性能优越的负载均衡、反向代理服务器。

简单地不负责任地说，性能上LVS>HA>Nginx，功能性和便利性上Nginx>HA>LVS。

对于一个大型后台系统来说，LVS、HAProxy和Nginx常常可以配合使用在不同的层级，LVS用在接入层的最前端，承担最大规模的流量分发；HAProxy负责按域名分流；而Nginx只需要作为Web服务器负责单机内多实例的负载均衡，或负责目录结构分流和静态资源缓存等需求。

### 四层和七层负载

所谓的四层与七层负载均衡，就是在对后台服务器进行负载均衡时，依据OSI四层的信息或七层的信息来决定怎么样转发流量。比如四层负载均衡通过报文中的目标IP地址和端口，七层负载均衡通过报文中的应用层信息(URL、HTTP头部等信息)，选择到达目的的内部服务器。四层负载均衡在解包上的消耗更少，可以达到更高的性能。而七层负载算法可以通过更多的应用层信息分发请求，功能性上更强大。

七层负载均衡软件可以通过URL、Cookie和HTTP head等信息，而不仅仅是IP端口分发流量，还可以修改客户端的请求和服务器的响应（例如HTTP请求中的Header的重写），极大提升了应用系统在网络层的灵活性。

在网络中常见的SYN Flood攻击中，黑客会对同一目标大量发送SYN报文，耗尽服务器上的相关资源，以达到Denial of Service(DoS)的目的。四层模式下这些SYN攻击都会被转发到后端的服务器上；而在七层模式下这些SYN攻击在负载均衡设备上就截止，不会影响后台服务器的正常运营。另外负载均衡设备可以在七层层面设定多种策略，过滤SQL Injection等应用层面的特定攻击手段，进一步提高系统整体安全。

## 安装 Keepalived

```bash
yum -y install epel-release
yum -y install keepalived

systemctl enable keepalived
```

## Keepalived + Nginx

我们的目标是“在一台工作的Nginx崩溃的情况下，系统能够检测到，并自动将请求切换到另外一台备份的Nginx服务器上”。所以，之前安装的两台Nginx，一台是Master服务器是主要的工作服务器，另一台是备份服务器，在Master服务器出现问题后，由后者接替其工作。如下图所示（外网的请求使用一个由keepalived控制的虚拟的浮动IP进行访问）：

![1][1]

**安装 Nginx**

```bash
yum -y install nginx
```

**keepalived 配置**

> Master 节点

```bash
vim /etc/keepalived/keepalived.conf
```

```conf
! Configuration File for keepalived
global_defs {
  # 标识本节点ID，通常为 hostname
  router_id master01
}

# keepalived 会定时执行脚本并对脚本执行的结果进行分析，动态调整 vrrp_instance 的优先级。如果脚本执行结果为 0，并且 weight 配置的值大于 0，则优先级相应的增加。如果脚本执行结果非 0，并且 weight配置的值小于 0，则优先级相应的减少。其他情况，维持原本配置的优先级，即配置文件中 priority 对应的值。
# 检测 nginx 运行状态的脚本
vrrp_script chknginx {
  script "/etc/keepalived/nginx_check.sh" # 检测 nginx 状态的脚本路径
  interval 2 # 检测时间间隔
  weight -2 # 如果条件成立，权重-2, 有多少个keepalived节点，就填写多少数量，这样保证这个节点的优先级比其他节点都低

  # fall 表示多少次检查失败，就算节点失效。默认1
  #fall 1
}

# 定义虚拟路由， VI_1 为虚拟路由的标示符，自己定义名称
vrrp_instance VI_1 {
  # 节点角色,MASTER(一个) 和 BACKUP(多个),按角色选中填写
  state MASTER # 主节点为 MASTER， 对应的备份节点为 BACKUP
  interface eth0 # 绑定虚拟 IP 的网络接口，与本机 IP 地址所在的网络接口相同
  virtual_router_id 33 # 虚拟路由的 ID 号，两个节点设置必须一样，可选 IP 最后一段使用, 相同的 VRID 为一个组，他将决定多播的 MAC 地址
  mcast_src_ip 192.168.2.201 # 本机 IP 地址
  priority 100 # 节点优先级， 值范围 0-254， MASTER 要比 BACKUP 高，每个节点的优先级一定要不一样
  nopreempt # 优先级高的设置 nopreempt 解决异常恢复后再次抢占的问题
  advert_int 1 ## 组播信息发送间隔，两个节点设置必须一样， 默认 1s
  # 设置验证信息，两个节点必须一致
  authentication {
    auth_type PASS
    auth_pass 1111
  }

  # 将 track_script 块加入 instance 配置块
  track_script {
    chknginx # 执行 Nginx 监控的服务
  }

  # 虚拟 IP 池, 两个节点设置必须一样,对外提供,客户端访问此ip即为访问 keepalived 中MASTER 所在主机
  virtual_ipaddress {
    192.168.1.100
  }
}
```

**编写 Nginx 状态检测脚本**

下面的脚本代码为检测 nginx 服务器是否正常运行,如果没有运行则尝试启动 nginx,休眠2s后再次检测nginx运行状态,如果还没有运行,则退出此主机上的 keepalived,由其他 keepalived 接管.

/etc/keepalived/nginx_check.sh

```bash
#!/bin/sh
if [ $(ps -C nginx --no-header | wc -l) -eq 0 ]; then
    systecmctl start nginx
    # /usr/local/nginx/sbin/nginx
fi

sleep 2
if [ $(ps -C nginx --no-header | wc -l) -eq 0 ]; then
    systecmctl stop keepalived
fi
```

保存后，给脚本赋执行权限：

```bash
chmod +x /etc/keepalived/nginx_check.sh
```

启动 keepalived

```bash
systemctl start keepalived
```

> Slave 节点

```bash
vim /etc/keepalived/keepalived.conf
```

```conf
! Configuration File for keepalived
global_defs {
  # 标识本节点ID，通常为 hostname
  router_id slave01
}

vrrp_script chknginx {
  script "/etc/keepalived/nginx_check.sh"
  interval 2
  weight -20
}

vrrp_instance VI_1 {
  state BACKUP # 备份节点为 BACKUP
  virtual_router_id 33 # 虚拟路由的 ID 号，两个节点设置必须一样，可选 IP 最后一段使用, 相同的 VRID 为一个组，他将决定多播的 MAC 地址
  mcast_src_ip 192.168.2.202 # 本机 IP 地址
  priority 90 # 节点优先级， 值范围 0-254， MASTER 要比 BACKUP 高
  nopreempt
  advert_int 1
  authentication {
    auth_type PASS
    auth_pass 1111
  }

  track_script {
    chknginx
  }

  virtual_ipaddress {
    192.168.1.100
  }
}
```

**测试**

```bash
# 查看 服务器ip，vip 应该在 master01 上
ip a

# [master01] 模拟宕机
systemctl start keepalived

# [slave01] 此时查看 ip，vip 应该漂移到了 slave01 上
ip a
```

## Keepalived 非抢占模式

keepalived的切换可以是自动的，但是却做不到毫秒级别，他怎么都需要几秒钟的时间进行切换。这就有一个问题，虽然在主节点出现问题我们转向备份节点时，这个延时无可避免，但是在我们修复主节点后，实际上并没有必要再马上做一次切换，所以Keepalived提供了一种非抢占模式，来满足这个要求。

通过修改配置 `state` 都为 `BACKUP`，并在 `vrrp_instance` 添加 `nopreempt` 表示不抢夺VIP。

[1]: /images/linux/lb-ha/1.png
