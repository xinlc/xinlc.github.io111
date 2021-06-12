---
title: 重学 Docker 之 容器进阶（四）
date: 2021-04-18 11:00:00
categories: Docker
tags:
  - docker
---

容器网络

<!--more-->

## 容器网络：我修改了/proc/sys/net下的参数，为什么在容器中不起效？

容器网络最明显的一个特征就是它有自己的 Network Namespace 了。之前我们就提到过 Network Namespace 负责管理网络环境的隔离。

今天呢，我们更深入地讨论一下和 Network Namespace 相关的一个问题——容器中的网络参数。

和之前的思路一样，我们先来看一个问题。然后在解决问题的过程中，更深入地理解容器的网络参数配置。

### 问题再现

在容器中运行的应用程序，如果需要用到 tcp/ip 协议栈的话，常常需要修改一些网络参数（内核中网络协议栈的参数）。

很大一部分网络参数都在 /proc 文件系统下的/proc/sys/net/目录里。

**修改这些参数主要有两种方法：一种方法是直接到 /proc 文件系统下的"/proc/sys/net/"目录里对参数做修改；还有一种方法是使用****sysctl****这个工具来修改。**

在启动容器之前呢，根据我们的需要我们在宿主机上已经修改过了几个参数，也就是说这些参数的值已经不是内核里原来的缺省值了.

比如我们改了下面的几个参数：

```bash
# # The default value:
# cat /proc/sys/net/ipv4/tcp_congestion_control
cubic
# cat /proc/sys/net/ipv4/tcp_keepalive_time
7200
# cat /proc/sys/net/ipv4/tcp_keepalive_intvl
75
# cat /proc/sys/net/ipv4/tcp_keepalive_probes
9
 
# # To update the value:
# echo bbr > /proc/sys/net/ipv4/tcp_congestion_control
# echo 600 > /proc/sys/net/ipv4/tcp_keepalive_time
# echo 10 > /proc/sys/net/ipv4/tcp_keepalive_intvl
# echo 6 > /proc/sys/net/ipv4/tcp_keepalive_probes
#
 
# # Double check the value after update:
# cat /proc/sys/net/ipv4/tcp_congestion_control
bbr
# cat /proc/sys/net/ipv4/tcp_keepalive_time
600
# cat /proc/sys/net/ipv4/tcp_keepalive_intvl
10
# cat /proc/sys/net/ipv4/tcp_keepalive_probes
6
```

然后我们启动一个容器， 再来查看一下容器里这些参数的值。

你可以先想想，容器里这些参数的值会是什么？我最初觉得容器里参数值应该会继承宿主机 Network Namesapce 里的值，实际上是不是这样呢？

我们还是先按下面的脚本，启动容器，然后运行 docker exec 命令一起看一下：

```bash
# docker run -d --name net_para centos:8.1.1911 sleep 3600
deec6082bac7b336fa28d0f87d20e1af21a784e4ef11addfc2b9146a9fa77e95
# docker exec -it net_para bash
[root@deec6082bac7 /]# cat /proc/sys/net/ipv4/tcp_congestion_control
bbr
[root@deec6082bac7 /]# cat /proc/sys/net/ipv4/tcp_keepalive_time
7200
[root@deec6082bac7 /]# cat /proc/sys/net/ipv4/tcp_keepalive_intvl
75
[root@deec6082bac7 /]# cat /proc/sys/net/ipv4/tcp_keepalive_probes
9
```

从这个结果我们看到，tcp_congestion_control 的值是 bbr，和宿主机 Network Namespace 里的值是一样的，而其他三个 tcp keepalive 相关的值，都不是宿主机 Network Namespace 里设置的值，而是原来系统里的缺省值了。

那为什么会这样呢？在分析这个问题之前，我们需要先来看看 Network Namespace 这个概念。

### 知识详解

### 如何理解 Network Namespace？

对于 Network Namespace，我们从字面上去理解的话，可以知道它是在一台 Linux 节点上对网络的隔离，不过它具体到底隔离了哪部分的网络资源呢？

我们还是先来看看操作手册，在Linux Programmer’s Manual里对 Network Namespace 有一个段简短的描述，在里面就列出了最主要的几部分资源，它们都是通过 Network Namespace 隔离的。

我把这些资源给你做了一个梳理：

第一种，网络设备，这里指的是 lo，eth0 等网络设备。你可以可以通过 ip link命令看到它们。

第二种是 IPv4 和 IPv6 协议栈。从这里我们可以知道，IP 层以及上面的 TCP 和 UPD 协议栈也是每个 Namespace 独立工作的。

所以 IP、TCP、PUD 的很多协议，它们的相关参数也是每个 Namespace 独立的，这些参数大多数都在 /proc/sys/net/ 目录下面，同时也包括了 TCP 和 UPD 的 port 资源。

第三种，IP 路由表，这个资源也是比较好理解的，你可以在不同的 Network Namespace 运行 ip route 命令，就能看到不同的路由表了。

第四种是防火墙规则，其实这里说的就是 iptables 规则了，每个 Namespace 里都可以独立配置 iptables 规则。

最后一种是网络的状态信息，这些信息你可以从 /proc/net 和 /sys/class/net 里得到，这里的状态基本上包括了前面 4 种资源的的状态信息。

### Namespace 的操作

那我们怎么建立一个新的 Network Namespace 呢？

**我们可以通过系统调用 clone() 或者 unshare() 这两个函数来建立新的 Network Namespace。**

下面我们会讲两个例子，带你体会一下这两个方法具体怎么用。

第一种方法呢，是在新的进程创建的时候，伴随新进程建立，同时也建立出新的 Network Namespace。这个方法，其实就是通过 clone() 系统调用带上 CLONE_NEWNET flag 来实现的。

Clone 建立出来一个新的进程，这个新的进程所在的 Network Namespace 也是新的。然后我们执行 ip link 命令查看 Namespace 里的网络设备，就可以确认一个新的 Network Namespace 已经建立好了。

具体操作你可以看一下这段代码。

```c
int new_netns(void *para)
{
            printf("New Namespace Devices:\n");
            system("ip link");
            printf("\n\n");
 
            sleep(100);
            return 0;
}
 
int main(void)
{
            pid_t pid;
 
            printf("Host Namespace Devices:\n");
            system("ip link");
            printf("\n\n");
 
            pid =
                clone(new_netns, stack + STACK_SIZE, CLONE_NEWNET | SIGCHLD, NULL);
            if (pid == -1)
                        errExit("clone");
 
            if (waitpid(pid, NULL, 0) == -1)
                        errExit("waitpid");
 
            return 0;
}
```

第二种方法呢，就是调用 unshare() 这个系统调用来直接改变当前进程的 Network Namespace，你可以看一下这段代码。

```c
int main(void)
{
            pid_t pid;
 
            printf("Host Namespace Devices:\n");
            system("ip link");
            printf("\n\n");
 
            if (unshare(CLONE_NEWNET) == -1)
                        errExit("unshare");
 
            printf("New Namespace Devices:\n");
            system("ip link");
            printf("\n\n");
 
            return 0;
}
```

其实呢，不仅是 Network Namespace，其它的 Namespace 也是通过 clone() 或者 unshare() 系统调用来建立的。

而创建容器的程序，比如runC也是用 unshare() 给新建的容器建立 Namespace 的。

这里我简单地说一下 runC 是什么，我们用 Docker 或者 containerd 去启动容器，最后都会调用 runC 在 Linux 中把容器启动起来。

除了在代码中用系统调用来建立 Network Namespace，我们也可以用命令行工具来建立 Network Namespace。比如用 ip netns 命令，在下一讲学习容器网络配置的时候呢，我们会用到 ip netns，这里你先有个印象就行。

在 Network Namespace 创建好了之后呢，我们可以在宿主机上运行 lsns -t net 这个命令来查看系统里已有的 Network Namespace。当然，lsns也可以用来查看其它 Namespace。

用 lsns 查看已有的 Namespace 后，我们还可以用 nsenter 这个命令进入到某个 Network Namespace 里，具体去查看这个 Namespace 里的网络配置。

比如下面的这个例子，用我们之前的 clone() 的例子里的代码，编译出 clone-ns 这个程序，运行后，再使用 lsns 查看新建的 Network Namespace，并且用nsenter进入到这个 Namespace，查看里面的 lo device。

具体操作你可以参考下面的代码：

Makefile

```Makefile
all: clone-ns unshare-ns

clone-ns: clone-ns.c
	gcc -o clone-ns clone-ns.c

unshare-ns: unshare-ns.c
	gcc -o unshare-ns unshare-ns.c

clean:
	rm -f *.o clone-ns unshare-ns
```

clone-ns.c

```c
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif

#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

#define errExit(msg)    do { perror(msg); exit(EXIT_FAILURE); \
                               } while (0)

#define STACK_SIZE (1024 * 1024)
static char stack[STACK_SIZE];

int new_netns(void *para)
{
	printf("New Namespace Devices:\n");
	system("ip link");
	printf("\n\n");

	sleep(100);
	return 0;
}

int main(void)
{
	pid_t pid;

	printf("Host Namespace Devices:\n");
	system("ip link");
	printf("\n\n");

	pid =
	    clone(new_netns, stack + STACK_SIZE, CLONE_NEWNET | SIGCHLD, NULL);
	if (pid == -1)
		errExit("clone");

	if (waitpid(pid, NULL, 0) == -1)
		errExit("waitpid");

	return 0;
}

```

unshare-ns.c

```c
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif

#include <sched.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

#define errExit(msg)    do { perror(msg); exit(EXIT_FAILURE); \
                               } while (0)

int main(void)
{
	pid_t pid;

	printf("Host Namespace Devices:\n");
	system("ip link");
	printf("\n\n");

	if (unshare(CLONE_NEWNET) == -1)
		errExit("unshare");

	printf("New Namespace Devices:\n");
	system("ip link");
	printf("\n\n");

	return 0;
}
```

```bash
# ./clone-ns &
[1] 7732
# Host Namespace Devices:
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
    link/ether 74:db:d1:80:54:14 brd ff:ff:ff:ff:ff:ff
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN mode DEFAULT group default
    link/ether 02:42:0c:ff:2b:77 brd ff:ff:ff:ff:ff:ff
 
 
New Namespace Devices:
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN mode DEFAULT group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
 
# lsns -t net
        NS TYPE NPROCS   PID USER    NETNSID NSFS COMMAND
4026531992 net     283     1 root unassigned      /usr/lib/systemd/systemd --switched-root --system --deserialize 16
4026532241 net       1  7734 root unassigned      ./clone-ns
# nsenter -t 7734 -n ip addr
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00

```

### 解决问题

那理解了 Network Namespace 之后，我们再来看看这一讲最开始的问题，我们应该怎么来设置容器里的网络相关参数呢？

首先你要避免走入误区。从我们一开始的例子里，也可以看到，容器里 Network Namespace 的网络参数并不是完全从宿主机 Host Namespace 里继承的，也不是完全在新的 Network Namespace 建立的时候重新初始化的。

其实呢，这一点我们只要看一下内核代码中对协议栈的初始化函数，很快就可以知道为什么会有这样的情况。

在我们的例子里 tcp_congestion_control 的值是从 Host Namespace 里继承的，而 tcp_keepalive 相关的几个值会被重新初始化了。

在函数tcp_sk_init() 里，tcp_keepalive 的三个参数都是重新初始化的，而 tcp_congestion_control 的值是从 Host Namespace 里复制过来的。

```c
static int __net_init tcp_sk_init(struct net *net)
{
…
        net->ipv4.sysctl_tcp_keepalive_time = TCP_KEEPALIVE_TIME;
        net->ipv4.sysctl_tcp_keepalive_probes = TCP_KEEPALIVE_PROBES;
        net->ipv4.sysctl_tcp_keepalive_intvl = TCP_KEEPALIVE_INTVL;
 
…
        /* Reno is always built in */
        if (!net_eq(net, &init_net) &&
            try_module_get(init_net.ipv4.tcp_congestion_control->owner))
                net->ipv4.tcp_congestion_control = init_net.ipv4.tcp_congestion_control;
        else
                net->ipv4.tcp_congestion_control = &tcp_reno;
 
…
 
}
```

那么我们现在知道 Network Namespace 的网络参数是怎么初始化的了，你可能会问了，我在容器里也可以修改这些参数吗？

我们可以启动一个普通的容器，这里的“普通”呢，我指的不是"privileged"的那种容器，也就是在这个容器中，有很多操作都是不允许做的，比如 mount 一个文件系统。这个 privileged 容器概念，我们会在后面容器安全这一讲里详细展开，这里你有个印象。

那么在启动完一个普通容器后，我们尝试一下在容器里去修改"/proc/sys/net/"下的参数。

这时候你会看到，容器中"/proc/sys/"是只读 mount 的，那么在容器里是不能修改"/proc/sys/net/"下面的任何参数了。

```bash
# docker run -d --name net_para centos:8.1.1911 sleep 3600
977bf3f07da90422e9c1e89e56edf7a59fab5edff26317eeb253700c2fa657f7
# docker exec -it net_para bash
[root@977bf3f07da9 /]# echo 600 > /proc/sys/net/ipv4/tcp_keepalive_time
bash: /proc/sys/net/ipv4/tcp_keepalive_time: Read-only file system
[root@977bf3f07da9 /]# cat /proc/mounts | grep "proc/sys"
proc /proc/sys proc ro,relatime 0 0
```

为什么“/proc/sys/” 在容器里是只读 mount 呢？ 这是因为 runC 当初出于安全的考虑，把容器中所有 /proc 和 /sys 相关的目录缺省都做了 read-only mount 的处理。

那我们应该怎么来修改容器中 Network Namespace 的网络参数呢？

当然，如果你有宿主机上的 root 权限，最简单粗暴的方法就是用我们之前说的"nsenter"工具，用它修改容器里的网络参数的。不过这个方法在生产环境里显然是不会被允许的，因为我们不会允许用户拥有宿主机的登陆权限。

其次呢，一般来说在容器中的应用已经启动了之后，才会做这样的修改。也就是说，很多 tcp 链接已经建立好了，那么即使新改了参数，对已经建立好的链接也不会生效了。这就需要重启应用，我们都知道生产环境里通常要避免应用重启，那这样做显然也不合适。

通过刚刚的排除法，我们推理出了网络参数修改的“正确时机”：想修改 Network Namespace 里的网络参数，要选择容器刚刚启动，而容器中的应用程序还没启动之前进行。

其实，runC 也在对 /proc/sys 目录做 read-only mount 之前，预留出了修改接口，就是用来修改容器里 "/proc/sys"下参数的，同样也是 sysctl 的参数。

而 Docker 的–sysctl或者 Kubernetes 里的allowed-unsafe-sysctls特性也都利用了 runC 的 sysctl 参数修改接口，允许容器在启动时修改容器 Namespace 里的参数。

比如，我们可以试一下 docker –sysctl，这时候我们会发现，在容器的 Network Namespace 里，/proc/sys/net/ipv4/tcp_keepalive_time 这个网络参数终于被修改了！

```bash
# docker run -d --name net_para --sysctl net.ipv4.tcp_keepalive_time=600 centos:8.1.1911 sleep 3600
7efed88a44d64400ff5a6d38fdcc73f2a74a7bdc3dbc7161060f2f7d0be170d1
# docker exec net_para cat /proc/sys/net/ipv4/tcp_keepalive_time
600
```

<!--

### 重点总结

好了，今天的课我们讲完了，那么下面我来给你做个总结。

今天我们讨论问题是容器中网络参数的问题，因为是问题发生在容器里，又是网络的参数，那么自然就和 Network Namespace 有关，所以我们首先要理解 Network Namespace。

Network Namespace 可以隔离网络设备，ip 协议栈，ip 路由表，防火墙规则，以及可以显示独立的网络状态信息。

我们可以通过 clone() 或者 unshare() 系统调用来建立新的 Network Namespace。

此外，还有一些工具"ip""netns""unshare""lsns"和"nsenter"，也可以用来操作 Network Namespace。

这些工具的适用条件，我用表格的形式整理如下，你可以做个参考。

![1][1]

接着我们分析了如何修改普通容器（非 privileged）的网络参数。

由于安全的原因，普通容器的 /proc/sys 是 read-only mount 的，所以在容器启动以后，我们无法在容器内部修改 /proc/sys/net 下网络相关的参数。

这时可行的方法是**通过 runC sysctl 相关的接口，在容器启动的时候对容器内的网络参数做配置。**

这样一来，想要修改网络参数就可以这么做：如果是使用 Docker，我们可以加上"—sysctl"这个参数；而如果使用 Kubernetes 的话，就需要用到"allowed unsaft sysctl"这个特性了。

-->

## 容器网络配置（1）：容器网络不通了要怎么调试?

前面我们讲 Network Namespace 隔离了网络设备，IP 协议栈和路由表，以及防火墙规则，那容器 Network Namespace 里的参数怎么去配置，我们现在已经很清楚了。

其实对于网络配置的问题，我们还有一个最需要关心的内容，那就是容器和外面的容器或者节点是怎么通讯的，这就涉及到了容器网络接口配置的问题了。

所以这一讲呢，我们就来聊一聊，容器 Network Namespace 里如何配置网络接口，还有当容器网络不通的时候，我们应该怎么去做一个简单调试。

### 问题再现

在前面，我们一直是用 docker run 这个命令来启动容器的。容器启动了之后，我们也可以看到，在容器里面有一个"eth0"的网络接口，接口上也配置了一个 IP 地址。

不过呢，如果我们想从容器里访问外面的一个 IP 地址，比如说 39.106.233.176（这个是极客时间网址对应的 IP），结果就发现是不能 ping 通的。

这时我们可能会想到，到底是不是容器内出了问题，在容器里无法访问，会不会宿主机也一样不行呢？

所以我们需要验证一下，首先我们退出容器，然后在宿主机的 Network Namespace 下，再运行 ping 39.106.233.176，结果就会发现在宿主机上，却是可以连通这个地址的。

```bash

# docker run -d --name if-test centos:8.1.1911 sleep 36000
244d44f94dc2931626194c6fd3f99cec7b7c4bf61aafc6c702551e2c5ca2a371
# docker exec -it if-test bash
 
[root@244d44f94dc2 /]# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
808: eth0@if809: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
 
[root@244d44f94dc2 /]# ping 39.106.233.176       ### 容器中无法ping通
PING 39.106.233.176 (39.106.233.176) 56(84) bytes of data.
^C
--- 39.106.233.176 ping statistics ---
9 packets transmitted, 0 received, 100% packet loss, time 185ms
 
[root@244d44f94dc2 /]# exit             ###退出容器
exit
 
# ping 39.106.233.176                        ### 宿主机上可以ping通
PING 39.106.233.176 (39.106.233.176) 56(84) bytes of data.
64 bytes from 39.106.233.176: icmp_seq=1 ttl=78 time=296 ms
64 bytes from 39.106.233.176: icmp_seq=2 ttl=78 time=306 ms
64 bytes from 39.106.233.176: icmp_seq=3 ttl=78 time=303 ms
^C
--- 39.106.233.176 ping statistics ---
4 packets transmitted, 3 received, 25% packet loss, time 7ms
rtt min/avg/max/mdev = 296.059/301.449/305.580/4.037 ms
```

那么碰到这种容器内网络不通的问题，我们应该怎么分析调试呢？我们还是需要先来理解一下，容器 Network Namespace 里的网络接口是怎么配置的。

### 基本概念

在讲解容器的网络接口配置之前，我们需要先建立一个整体的认识，搞清楚容器网络接口在系统架构中处于哪个位置。

你可以看一下我给你画的这张图，图里展示的是容器有自己的 Network Namespace，eth0 是这个 Network Namespace 里的网络接口。而宿主机上也有自己的 eth0，宿主机上的 eth0 对应着真正的物理网卡，可以和外面通讯。

![2][2]

那你可以先想想，我们要让容器 Network Namespace 中的数据包最终发送到物理网卡上，需要完成哪些步骤呢？从图上看，我们大致可以知道应该包括这两步。

**第一步，就是要让数据包从容器的 Network Namespace 发送到 Host Network Namespace 上。**

**第二步，数据包发到了 Host Network Namespace 之后，还要解决数据包怎么从宿主机上的 eth0 发送出去的问题。**

好，整体的思路已经理清楚了，接下来我们做具体分析。我们先来看第一步，怎么让数据包从容器的 Network Namespace 发送到 Host Network Namespace 上面。

你可以查看一下[Docker 网络的文档](https://docs.docker.com/network/)或者[Kubernetes 网络的文档](https://kubernetes.io/docs/concepts/cluster-administration/networking/)，这些文档里面介绍了很多种容器网络配置的方式。

不过对于容器从自己的 Network Namespace 连接到 Host Network Namespace 的方法，一般来说就只有两类设备接口：一类是[veth](https://man7.org/linux/man-pages/man4/veth.4.html)，另外一类是 macvlan/ipvlan。

在这些方法中，我们使用最多的就是 veth 的方式，用 Docker 启动的容器缺省的网络接口用的也是这个 veth。既然它这么常见，所以我们就用 veth 作为例子来详细讲解。至于另外一类 macvlan/ipvlan 的方式，我们在下一讲里会讲到。

那什么是 veth 呢？为了方便你更好地理解，我们先来模拟一下 Docker 为容器建立 eth0 网络接口的过程，动手操作一下，这样呢，你就可以很快明白什么是 veth 了。

对于这个模拟操作呢，我们主要用到的是[ip netns](https://man7.org/linux/man-pages/man8/ip-netns.8.html) 这个命令，通过它来对 Network Namespace 做操作。

首先，我们先启动一个不带网络配置的容器，和我们之前的命令比较，主要是多加上了"--network none"参数。我们可以看到，这样在启动的容器中，Network Namespace 里就只有 loopback 一个网络设备，而没有了 eth0 网络设备了。

```bash
# docker run -d --name if-test --network none centos:8.1.1911 sleep 36000
cf3d3105b11512658a025f5b401a09c888ed3495205f31e0a0d78a2036729472
# docker exec -it if-test ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
```

完成刚才的设置以后，我们就在这个容器的 Network Namespace 里建立 veth，你可以执行一下后面的这个脚本。

```bash
pid=$(ps -ef | grep "sleep 36000" | grep -v grep | awk '{print $2}')
echo $pid
ln -s /proc/$pid/ns/net /var/run/netns/$pid
 
# Create a pair of veth interfaces
ip link add name veth_host type veth peer name veth_container
# Put one of them in the new net ns
ip link set veth_container netns $pid
 
# In the container, setup veth_container
ip netns exec $pid ip link set veth_container name eth0
ip netns exec $pid ip addr add 172.17.1.2/16 dev eth0
ip netns exec $pid ip link set eth0 up
ip netns exec $pid ip route add default via 172.17.0.1
 
# In the host, set veth_host up
ip link set veth_host up
```

我在这里解释一下，这个 veth 的建立过程是什么样的。

首先呢，我们先找到这个容器里运行的进程"sleep 36000"的 pid，通过 "/proc/$pid/ns/net"这个文件得到 Network Namespace 的 ID，这个 Network Namespace ID 既是这个进程的，也同时属于这个容器。

然后我们在"/var/run/netns/"的目录下建立一个符号链接，指向这个容器的 Network Namespace。完成这步操作之后，在后面的"ip netns"操作里，就可以用 pid 的值作为这个容器的 Network Namesapce 的标识了。

接下来呢，我们用 ip link 命令来建立一对 veth 的虚拟设备接口，分别是 veth_container 和 veth_host。从名字就可以看出来，veth_container 这个接口会被放在容器 Network Namespace 里，而 veth_host 会放在宿主机的 Host Network Namespace。

所以我们后面的命令也很好理解了，就是用 ip link set veth_container netns $pid 把 veth_container 这个接口放入到容器的 Network Namespace 中。

再然后我们要把 veth_container 重新命名为 eth0，因为这时候接口已经在容器的 Network Namesapce 里了，eth0 就不会和宿主机上的 eth0 冲突了。

最后对容器内的 eht0，我们还要做基本的网络 IP 和缺省路由配置。因为 veth_host 已经在宿主机的 Host Network Namespace 了，就不需要我们做什么了，这时我们只需要 up 一下这个接口就可以了。

那刚才这些操作完成以后，我们就建立了一对 veth 虚拟设备接口。我给你画了一张示意图，图里直观展示了这对接口在容器和宿主机上的位置。

![3][3]

现在，我们再来看看 veth 的定义了，其实它也很简单。veth 就是一个虚拟的网络设备，一般都是成对创建，而且这对设备是相互连接的。当每个设备在不同的 Network Namespaces 的时候，Namespace 之间就可以用这对 veth 设备来进行网络通讯了。

比如说，你可以执行下面的这段代码，试试在 veth_host 上加上一个 IP，172.17.1.1/16，然后从容器里就可以 ping 通这个 IP 了。这也证明了从容器到宿主机可以利用这对 veth 接口来通讯了。

```bash
# ip addr add 172.17.1.1/16 dev veth_host
# docker exec -it if-test ping 172.17.1.1
PING 172.17.1.1 (172.17.1.1) 56(84) bytes of data.
64 bytes from 172.17.1.1: icmp_seq=1 ttl=64 time=0.073 ms
64 bytes from 172.17.1.1: icmp_seq=2 ttl=64 time=0.092 ms
^C
--- 172.17.1.1 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 30ms
rtt min/avg/max/mdev = 0.073/0.082/0.092/0.013 ms
```

好了，这样我们完成了第一步，通过一对 veth 虚拟设备，可以让数据包从容器的 Network Namespace 发送到 Host Network Namespace 上。

那下面我们再来看第二步， 数据包到了 Host Network Namespace 之后呢，怎么把它从宿主机上的 eth0 发送出去?

其实这一步呢，就是一个普通 Linux 节点上数据包转发的问题了。这里我们解决问题的方法有很多种，比如说用 nat 来做个转发，或者建立 Overlay 网络发送，也可以通过配置 proxy arp 加路由的方法来实现。

因为考虑到网络环境的配置，同时 Docker 缺省使用的是 bridge + nat 的转发方式， 那我们就在刚才讲的第一步基础上，再手动实现一下 bridge+nat 的转发方式。对于其他的配置方法，你可以看一下 Docker 或者 Kubernetes 相关的文档。

Docker 程序在节点上安装完之后，就会自动建立了一个 docker0 的 bridge interface。所以我们只需要把第一步中建立的 veth_host 这个设备，接入到 docker0 这个 bridge 上。

这里我要提醒你注意一下，如果之前你在 veth_host 上设置了 IP 的，就需先运行一下"ip addr delete 172.17.1.1/16 dev veth_host"，把 IP 从 veth_host 上删除。

```bash
# ip addr delete 172.17.1.1/16 dev veth_host 
ip link set veth_host master docker0
```

这个命令执行完之后，容器和宿主机的网络配置就会发生变化，这种配置是什么样呢？你可以参考一下面这张图的描述。

![4][4]

从这张示意图中，我们可以看出来，容器和 docker0 组成了一个子网，docker0 上的 IP 就是这个子网的网关 IP。

如果我们要让子网通过宿主机上 eth0 去访问外网的话，那么加上 iptables 的规则就可以了，也就是下面这条规则。

```bash
iptables -P FORWARD ACCEPT
```

好了，进行到这里，我们通过 bridge+nat 的配置，似乎已经完成了第二步——让数据从宿主机的 eth0 发送出去。

那么我们这样配置，真的可以让容器里发送数据包到外网了吗？这需要我们做个测试，再重新尝试下这一讲开始的操作，从容器里 ping 外网的 IP，这时候，你会发现还是 ping 不通。

其实呢，做到这一步，我们通过自己的逐步操作呢，重现了这一讲了最开始的问题。

### 解决问题

既然现在我们清楚了，在这个节点上容器和宿主机上的网络配置是怎么一回事。那么要调试这个问题呢，也有了思路，关键就是找到数据包传到哪个环节时发生了中断。

那最直接的方法呢，就是在容器中继续 ping 外网的 IP 39.106.233.176，然后在容器的 eth0 (veth_container)，容器外的 veth_host，docker0，宿主机的 eth0 这一条数据包的路径上运行 tcpdump。

这样就可以查到，到底在哪个设备接口上没有收到 ping 的 icmp 包。我把 tcpdump 运行的结果我列到了下面。

容器的 eth0：

```bash
# ip netns exec $pid tcpdump -i eth0 host 39.106.233.176 -nn
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
00:47:29.934294 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 1, length 64
00:47:30.934766 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 2, length 64
00:47:31.958875 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 3, length 64
```

veth_host：

```bash
# tcpdump -i veth_host host 39.106.233.176 -nn
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on veth_host, link-type EN10MB (Ethernet), capture size 262144 bytes
00:48:01.654720 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 32, length 64
00:48:02.678752 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 33, length 64
00:48:03.702827 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 34, length 64
```

docker0：

```bash
# tcpdump -i docker0 host 39.106.233.176 -nn
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on docker0, link-type EN10MB (Ethernet), capture size 262144 bytes
00:48:20.086841 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 50, length 64
00:48:21.110765 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 51, length 64
00:48:22.134839 IP 172.17.1.2 > 39.106.233.176: ICMP echo request, id 71, seq 52, length 64
```

host eth0：

```bash
# tcpdump -i eth0 host 39.106.233.176 -nn
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
^C
0 packets captured
0 packets received by filter
0 packets dropped by kernel
```

通过上面的输出结果，我们发现 icmp 包到达了 docker0，但是没有到达宿主机上的 eth0。

因为我们已经配置了 iptables nat 的转发，这个也可以通过查看 iptables 的 nat 表确认一下，是没有问题的，具体的操作命令如下：

```bash
# iptables -L  -t nat
Chain PREROUTING (policy ACCEPT)
target     prot opt source               destination
DOCKER     all  --  anywhere             anywhere             ADDRTYPE match dst-type LOCAL
 
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
 
Chain POSTROUTING (policy ACCEPT)
target     prot opt source               destination
MASQUERADE  all  --  172.17.0.0/16        anywhere
 
Chain OUTPUT (policy ACCEPT)
target     prot opt source               destination
DOCKER     all  --  anywhere            !127.0.0.0/8          ADDRTYPE match dst-type LOCAL
 
Chain DOCKER (2 references)
target     prot opt source               destination
RETURN     all  --  anywhere             anywhere
```

那么会是什么问题呢？因为这里需要做两个网络设备接口之间的数据包转发，也就是从 docker0 把数据包转发到 eth0 上，你可能想到了 Linux 协议栈里的一个常用参数 ip_forward。

我们可以看一下，它的值是 0，当我们把它改成 1 之后，那么我们就可以从容器中 ping 通外网 39.106.233.176 这个 IP 了！

```bash
# cat /proc/sys/net/ipv4/ip_forward
0
# echo 1 > /proc/sys/net/ipv4/ip_forward
 
# docker exec -it if-test ping 39.106.233.176
PING 39.106.233.176 (39.106.233.176) 56(84) bytes of data.
64 bytes from 39.106.233.176: icmp_seq=1 ttl=77 time=359 ms
64 bytes from 39.106.233.176: icmp_seq=2 ttl=77 time=346 ms
^C
--- 39.106.233.176 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1ms
rtt min/avg/max/mdev = 345.889/352.482/359.075/6.593 ms
```

<!--

### 重点小结

这一讲，我们主要解决的问题是如何给容器配置网络接口，让容器可以和外面通讯；同时我们还学习了当容器网络不通的时候，我们应该怎么来做一个简单调试。

解决容器与外界通讯的问题呢，一共需要完成两步。第一步是，怎么让数据包从容器的 Network Namespace 发送到 Host Network Namespace 上；第二步，数据包到了 Host Network Namespace 之后，还需要让它可以从宿主机的 eth0 发送出去。

我们想让数据从容器 Netowrk Namespace 发送到 Host Network Namespace，可以用配置一对 veth 虚拟网络设备的方法实现。而让数据包从宿主机的 eth0 发送出去，就用可 bridge+nat 的方式完成。

这里我讲的是最基本的一种配置，但它也是很常用的一个网络配置。针对其他不同需要，容器网络还有很多种。那你学习完这一讲，了解了基本的概念和操作之后呢，还可以查看更多的网上资料，学习不同的网络配置。

遇到容器中网络不通的情况，我们先要理解自己的容器以及容器在宿主机上的配置，通过对主要设备上做 tcpdump 可以找到具体在哪一步数据包停止了转发。

然后我们结合内核网络配置参数，路由表信息，防火墙规则，一般都可以定位出根本原因，最终解决这种网络完全不通的问题。

但是如果是网络偶尔丢包的问题，这个就需要用到其他的一些工具来做分析了，这个我们会在之后做讲解。

-->

## 容器网络配置（2）：容器网络延时要比宿主机上的高吗?

在前面，我们学习了在容器中的网络接口配置，重点讲解的是 veth 的接口配置方式，这也是绝大部分容器用的缺省的网络配置方式。

不过呢，从 veth 的这种网络接口配置上看，一个数据包要从容器里发送到宿主机外，需要先从容器里的 eth0 (veth_container) 把包发送到宿主机上 veth_host，然后再在宿主机上通过 nat 或者路由的方式，经过宿主机上的 eth0 向外发送。

![5][5]

这种容器向外发送数据包的路径，相比宿主机上直接向外发送数据包的路径，很明显要多了一次接口层的发送和接收。尽管 veth 是虚拟网络接口，在软件上还是会增加一些开销。

如果我们的应用程序对网络性能有很高的要求，特别是之前运行在物理机器上，现在迁移到容器上的，如果网络配置采用 veth 方式，就会出现网络延时增加的现象。

那今天我们就来聊一聊，容器网络接口对于容器中应用程序网络延时有怎样的影响，还有这个问题应该怎么解决。

### 问题重现

对于这种 veth 接口配置导致网络延时增加的现象，我们可以通过运行[netperf](https://github.com/HewlettPackard/netperf)（Netperf 是一个衡量网络性能的工具，它可以提供单向吞吐量和端到端延迟的测试）来模拟一下。

这里我们需要两台虚拟机或者物理机，这两台机器需要同处于一个二层的网络中。

具体的配置示意图如下：

![6][6]

首先，我们需要在第一台机器上启动一个 veth 接口的容器，容器的启动和宿主机上的配置你可以参考一下这里的脚本。在第二台机器上，我们只要启动一个 netserver 就可以了。

然后呢，我们分别在容器里和宿主机上运行与 netserver 交互的 netperf，再比较一下它们延时的差异。

我们可以运行 netperf 的 TCP_RR 测试用例，TCP_RR 是 netperf 里专门用来测试网络延时的，缺省每次运行 10 秒钟。运行以后，我们还要计算平均每秒钟 TCP request/response 的次数，这个次数越高，就说明延时越小。

接下来，我们先在第一台机器的宿主机上直接运行 netperf 的 TCP_RR 测试用例 3 轮，得到的值分别是 2504.92，2410.14 和 2422.81，计算一下可以得到三轮 Transactions 平均值是 2446/s。

Dockerfile

```Dockerfile
FROM centos:8.1.1911

COPY netperf /
COPY netserver /
RUN yum install -y iperf3
```

Makefile

```Makefile
all: image

image:
	docker build -t registry/latency-test:v1 .
clean: 
	docker rmi registry/latency-test:v1
```

start_container.sh

```bash
#!/bin/bash
docker stop lat-test-1;docker rm lat-test-1

docker run --init --name lat-test-1 -d registry/latency-test:v1 /netserver -D

iptables -P FORWARD ACCEPT
echo 1 > /proc/sys/net/ipv4/ip_forward
```

```bash

# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2504.92
16384  131072
# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2410.14
16384  131072
 
# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2422.81
16384  131072
```

同样，我们再在容器中运行一下 netperf 的 TCP_RR，也一样运行三轮，计算一下这三次的平均值，得到的值是 2141。

那么我们拿这次容器环境中的平均值和宿主机上得到的值 2446 做比较，会发现 Transactions 下降了大概 12.5%，也就是网络的延时超过了 10%。

```bash

[root@4150e2a842b5 /]# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2104.68
16384  131072
 
[root@4150e2a842b5 /]# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2146.34
16384  131072
 
[root@4150e2a842b5 /]# ./netperf -H 192.168.0.194 -t TCP_RR
MIGRATED TCP REQUEST/RESPONSE TEST from 0.0.0.0 (0.0.0.0) port 0 AF_INET to 192.168.0.194 () port 0 AF_INET : first burst 0
Local /Remote
Socket Size   Request  Resp.   Elapsed  Trans.
Send   Recv   Size     Size    Time     Rate
bytes  Bytes  bytes    bytes   secs.    per sec
 
16384  131072 1        1       10.00    2173.79
16384  131072
```

### 分析问题

刚才我们已经得到了测试的数值，我们发现 veth 方式的确带来了很高的网络延时。那现在我们先来分析一下，为什么 veth 会带来这么大的网络延时，然后再看看有什么方法可以降低容器里的网络延时。

我们先回顾一下容器里 veth 接口的配置，还是拿我们上一讲里容器 veth 的图作为例子。

![3][3]

veth 的虚拟网络接口一般都是成对出现，就像上面图里的 veth_container 和 veth_host 一样。

在每次网络传输的过程中，数据包都需要通过 veth_container 这个接口向外发送，而且必须保证 veth_host 先接收到这个数据包。

虽然 veth 是一个虚拟的网络接口，但是在接收数据包的操作上，这个虚拟接口和真实的网路接口并没有太大的区别。这里除了没有硬件中断的处理，其他操作都差不多，特别是软中断（softirq）的处理部分其实就和真实的网络接口是一样的。

我们可以通过阅读 Linux 内核里的 [veth 的驱动代码（drivers/net/veth.c）](https://github.com/torvalds/linux/blob/v5.4/drivers/net/veth.c)确认一下。

veth 发送数据的函数是 veth_xmit()，它里面的主要操作就是找到 veth peer 设备，然后触发 peer 设备去接收数据包。

比如 veth_container 这个接口调用了 veth_xmit() 来发送数据包，最后就是触发了它的 peer 设备 veth_host 去调用 netif_rx() 来接收数据包。主要的代码我列在下面了：

```c

static netdev_tx_t veth_xmit(struct sk_buff *skb, struct net_device *dev)
{
…
       /* 拿到veth peer设备的net_device */
       rcv = rcu_dereference(priv->peer);
…
       /* 将数据送到veth peer设备 */ 
       if (likely(veth_forward_skb(rcv, skb, rq, rcv_xdp) == NET_RX_SUCCESS)) {
 
 
…
}
 
static int veth_forward_skb(struct net_device *dev, struct sk_buff *skb,
                            struct veth_rq *rq, bool xdp)
{
        /* 这里最后调用了 netif_rx() */
        return __dev_forward_skb(dev, skb) ?: xdp ?
                veth_xdp_rx(rq, skb) :
                netif_rx(skb);
}
```

而 netif_rx() 是一个网络设备驱动里面标准的接收数据包的函数，netif_rx() 里面会为这个数据包 raise 一个 softirq。

```c
__raise_softirq_irqoff(NET_RX_SOFTIRQ);
```

其实 softirq 这个概念，我们之前在CPU 的模块中也提到过。在处理网络数据的时候，一些运行时间较长而且不能在硬中断中处理的工作，就会通过 softirq 来处理。

一般在硬件中断处理结束之后，网络 softirq 的函数才会再去执行没有完成的包的处理工作。即使这里 softirq 的执行速度很快，还是会带来额外的开销。

**所以，根据 veth 这个虚拟网络设备的实现方式，我们可以看到它必然会带来额外的开销，这样就会增加数据包的网络延时。**

### 解决问题

那么我们有什么方法可以减少容器的网络延时呢？你可能会想到，我们可不可以不使用 veth 这个方式配置网络接口，而是换成别的方式呢？

的确是这样，其实除了 veth 之外，容器还可以选择其他的网络配置方式。在 Docker 的文档中提到了 macvlan 的配置方式，和 macvlan 很类似的方式还有 ipvlan。

那我们先来简单看一下 macvlan 和 ipvlan 的异同点。

我们先来看这两个方式的相同之处，无论是 macvlan 还是 ipvlan，它们都是在一个物理的网络接口上再配置几个虚拟的网络接口。在这些虚拟的网络接口上，都可以配置独立的 IP，并且这些 IP 可以属于不同的 Namespace。

然后我再说说它们的不同点。**对于 macvlan，每个虚拟网络接口都有自己独立的 mac 地址；而 ipvlan 的虚拟网络接口是和物理网络接口共享同一个 mac 地址**。而且它们都有自己的 L2/L3 的配置方式，不过我们主要是拿 macvlan/ipvlan 来和 veth 做比较，这里可以先忽略 macvlan/ipvlan 这些详细的特性。

我们就以 ipvlan 为例，运行下面的这个脚本，为容器手动配置上 ipvlan 的网络接口。

```bash
docker run --init --name lat-test-1 --network none -d registry/latency-test:v1 sleep 36000
 
pid1=$(docker inspect lat-test-1 | grep -i Pid | head -n 1 | awk '{print $2}' | awk -F "," '{print $1}')
echo $pid1
ln -s /proc/$pid1/ns/net /var/run/netns/$pid1
 
ip link add link eth0 ipvt1 type ipvlan mode l2
ip link set dev ipvt1 netns $pid1
 
ip netns exec $pid1 ip link set ipvt1 name eth0
ip netns exec $pid1 ip addr add 172.17.3.2/16 dev eth0
ip netns exec $pid1 ip link set eth0 up
```

在这个脚本里，我们先启动一个容器，这里我们用"—network none"的方式来启动，也就是在容器中没有配置任何的网络接口。

接着我们在宿主机 eth0 的接口上增加一个 ipvlan 虚拟网络接口 ipvt1，再把它加入到容器的 Network Namespace 里面，重命名为容器内的 eth0，并且配置上 IP。这样我们就配置好了第一个用 ipvlan 网络接口的容器。

我们可以用同样的方式配置第二个容器，这样两个容器可以相互 ping 一下 IP，看看网络是否配置成功了。

create_ipvlan.sh

```bash
#!/bin/bash

docker stop lat-test-1;docker rm lat-test-1
docker stop lat-test-2;docker rm lat-test-2

docker run --init --name lat-test-1 --network none -d registry/latency-test:v1 sleep 36000

pid1=$(docker inspect lat-test-1 | grep -i Pid | head -n 1 | awk '{print $2}' | awk -F "," '{print $1}')
echo $pid1
ln -s /proc/$pid1/ns/net /var/run/netns/$pid1

ip link add link eth0 ipvt1 type ipvlan mode l2
ip link set dev ipvt1 netns $pid1

ip netns exec $pid1 ip link set ipvt1 name eth0
ip netns exec $pid1 ip addr add 172.17.3.2/16 dev eth0
ip netns exec $pid1 ip link set eth0 up

docker run --init --name lat-test-2 --network none -d registry/latency-test:v1 sleep 36000

pid2=$(docker inspect lat-test-2 | grep -i Pid | head -n 1 | awk '{print $2}' | awk -F "," '{print $1}')
echo $pid2
ln -s /proc/$pid2/ns/net /var/run/netns/$pid2

ip link add link eth0 ipvt2 type ipvlan mode l2
ip link set dev ipvt2 netns $pid2

ip netns exec $pid2 ip link set ipvt2 name eth0
ip netns exec $pid2 ip addr add 172.17.3.3/16 dev eth0
ip netns exec $pid2 ip link set eth0 up
```

两个容器配置好之后，就像下面图中描述的一样了。从这张图里，你很容易就能看出 macvlan/ipvlan 与 veth 网络配置有什么不一样。容器的虚拟网络接口，直接连接在了宿主机的物理网络接口上了，形成了一个网络二层的连接。

![7][7]

如果从容器里向宿主机外发送数据，看上去通过的接口要比 veth 少了，那么实际情况是不是这样呢？我们先来看一下 ipvlan 接口发送数据的代码。

从下面的 ipvlan 接口的发送代码中，我们可以看到，如果是往宿主机外发送数据，发送函数会直接找到 ipvlan 虚拟接口对应的物理网络接口。

比如在我们的例子中，这个物理接口就是宿主机上的 eth0，然后直接调用 dev_queue_xmit()，通过物理接口把数据直接发送出去。

```c
static int ipvlan_xmit_mode_l2(struct sk_buff *skb, struct net_device *dev)
{
…
        if (!ipvlan_is_vepa(ipvlan->port) &&
            ether_addr_equal(eth->h_dest, eth->h_source)) {
…
        } else if (is_multicast_ether_addr(eth->h_dest)) {
…
        }
        /* 
         * 对于普通的对外发送数据，上面的if 和 else if中的条件都不成立，
         * 所以会执行到这一步，拿到ipvlan对应的物理网路接口设备，
         * 然后直接从这个设备发送数据。
         */ 
        skb->dev = ipvlan->phy_dev;
        return dev_queue_xmit(skb);
}
```

和 veth 接口相比，我们用 ipvlan 发送对外数据就要简单得多，因为这种方式没有内部额外的 softirq 处理开销。

现在我们还可以看一下，在实际生产环境中，一个应用程序跑在使用 veth 接口的容器中，跟这个应用程序跑在使用 ipvlan 接口的容器中，两者的网络延时差异是怎样的。

下面这张图是网络延时的监控图，图里蓝色的线表示程序运行在 veth 容器中，黄色线表示程序运行在 ipvlan 的容器里，绿色的线代表程序直接运行在物理机上。

从这张延时（Latency）图里，我们可以看到，在 veth 容器里程序的网络延时要明显高一些，而程序在 ipvlan 容器里的网络延时已经比较接近物理机上的网络延时了。

![8][8]

所以对于网络延时敏感的应用程序，我们可以考虑使用 ipvlan/macvlan 的容器网络配置方式来替换缺省的 veth 网络配置。

<!--

### 重点小结

好了，今天的内容讲完了，我们来做个总结。今天我们主要讨论了容器网络接口对容器中应用程序网络延时的影响。

容器通常缺省使用 veth 虚拟网络接口，不过 veth 接口会有比较大的网络延时。我们可以使用 netperf 这个工具来比较网络延时，相比物理机上的网络延时，使用 veth 接口容器的网络延时会增加超过 10%。

我们通过对 veth 实现的代码做分析，可以看到由于 veth 接口是成对工作，在对外发送数据的时候，peer veth 接口都会 raise softirq 来完成一次收包操作，这样就会带来数据包处理的额外开销。

如果要减小容器网络延时，就可以给容器配置 ipvlan/macvlan 的网络接口来替代 veth 网络接口。Ipvlan/macvlan 直接在物理网络接口上虚拟出接口，在发送对外数据包的时候可以直接通过物理接口完成，没有节点内部类似 veth 的那种 softirq 的开销。容器使用 ipvlan/maclan 的网络接口，它的网络延时可以非常接近物理网络接口的延时。

对于延时敏感的应用程序，我们可以考虑使用 ipvlan/macvlan 网络接口的容器。不过，由于 ipvlan/macvlan 网络接口直接挂载在物理网络接口上，对于需要使用 iptables 规则的容器，比如 Kubernetes 里使用 service 的容器，就不能工作了。这就需要你结合实际应用的需求做个判断，再选择合适的方案。

-->

## 容器网络配置（3）：容器中的网络乱序包怎么这么高？

我们来聊一下容器中发包乱序的问题。这个问题也同样来自于工作实践，我们的用户把他们的应用程序从物理机迁移到容器之后，从网络监控中发现，容器中数据包的重传的数量要比在物理机里高了不少。

在前面，我们已经知道了容器网络缺省的接口是 veth，veth 接口都是成对使用的。容器通过 veth 接口向外发送数据，首先需要从 veth 的一个接口发送给跟它成对的另一个接口。

那么这种接口会不会引起更多的网络重传呢？如果会引起重传，原因是什么，我们又要如何解决呢？接下来我们就带着这三个问题开始今天的学习。

### 问题重现

我们可以在容器里运行一下 iperf3 命令，向容器外部发送一下数据，从 iperf3 的输出"Retr"列里，我们可以看到有多少重传的数据包。

比如下面的例子里，我们可以看到有 162 个重传的数据包。

```bash
# iperf3 -c 192.168.147.51
Connecting to host 192.168.147.51, port 5201
[  5] local 192.168.225.12 port 51700 connected to 192.168.147.51 port 5201
[ ID] Interval           Transfer     Bitrate                        Retr    Cwnd
[  5]   0.00-1.00   sec  1001 MBytes  8.40 Gbits/sec  162    192 KBytes
…
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec  9.85 GBytes  8.46 Gbits/sec  162             sender
[  5]   0.00-10.04  sec  9.85 GBytes  8.42 Gbits/sec                  receiver
 
iperf Done.
```

**网络中发生了数据包的重传，有可能是数据包在网络中丢了，也有可能是数据包乱序导致的**。那么，我们怎么来判断到底是哪一种情况引起的重传呢？

最直接的方法就是用 tcpdump 去抓包，不过对于大流量的网络，用 tcpdump 抓包瞬间就会有几个 GB 的数据。可是这样做的话，带来的额外系统开销比较大，特别是在生产环境中这个方法也不太好用。

所以这里我们有一个简单的方法，那就是运行 netstat 命令来查看协议栈中的丢包和重传的情况。比如说，在运行上面的 iperf3 命令前后，我们都在容器的 Network Namespace 里运行一下 netstat 看看重传的情况。

我们会发现，一共发生了 162 次（604-442）快速重传（fast retransmits），这个数值和 iperf3 中的 Retr 列里的数值是一样的。

```bash
-bash-4.2# nsenter -t 51598 -n netstat -s | grep retran
    454 segments retransmited
    442 fast retransmits
-bash-4.2# nsenter -t 51598 -n netstat -s | grep retran
    616 segments retransmited
    604 fast retransmits
```

### 问题分析

### 快速重传（fast retransmit）

在刚才的问题重现里，我们运行 netstat 命令后，统计了快速重传的次数。那什么是快速重传（fast retransmit）呢？这里我给你解释一下。

我们都知道 TCP 协议里，发送端（sender）向接受端（receiver）发送一个数据包，接受端（receiver）都回应 ACK。如果超过一个协议栈规定的时间（RTO），发送端没有收到 ACK 包，那么发送端就会重传（Retransmit）数据包，就像下面的示意图一样。

![9][9]

不过呢，这样等待一个超时之后再重传数据，对于实际应用来说太慢了，所以 TCP 协议又定义了快速重传 （fast retransmit）的概念。它的基本定义是这样的：**如果发送端收到 3 个重复的 ACK，那么发送端就可以立刻重新发送 ACK 对应的下一个数据包**。

就像下面示意图里描述的那样，接受端没有收到 Seq 2 这个包，但是收到了 Seq 3–5 的数据包，那么接收端在回应 Ack 的时候，Ack 的数值只能是 2。这是因为按顺序来说收到 Seq 1 的包之后，后面 Seq 2 一直没有到，所以接收端就只能一直发送 Ack 2。

那么当发送端收到 3 个重复的 Ack 2 后，就可以马上重新发送 Seq 2 这个数据包了，而不用再等到重传超时之后了。

![10][10]

虽然 TCP 快速重传的标准定义是需要收到 3 个重复的 Ack，不过你会发现在 Linux 中常常收到一个 Dup Ack（重复的 Ack）后，就马上重传数据了。这是什么原因呢？

这里先需要提到 **SACK** 这个概念，SACK 也就是选择性确认（Selective Acknowledgement）。其实跟普通的 ACK 相比呢，SACK 会把接收端收到的所有包的序列信息，都反馈给发送端。

你看看下面这张图，就能明白这是什么意思了。

![11][11]

那有了 SACK，对于发送端来说，在收到 SACK 之后就已经知道接收端收到了哪些数据，没有收到哪些数据。

在 Linux 内核中会有个判断（你可以看看下面的这个函数），大概意思是这样的：如果在接收端收到的数据和还没有收到的数据之间，两者数据量差得太大的话（超过了 reordering*mss_cache），也可以马上重传数据。

这里你需要注意一下，**这里的数据量差是根据 bytes 来计算的，而不是按照包的数目来计算的，所以你会看到即使只收到一个 SACK，Linux 也可以重发数据包**。

```c
static bool tcp_force_fast_retransmit(struct sock *sk)
{
        struct tcp_sock *tp = tcp_sk(sk);
 
        return after(tcp_highest_sack_seq(tp),
                     tp->snd_una + tp->reordering * tp->mss_cache);
}
```

好了，了解了快速重传的概念之后，我们再来看看，如果 netstat 中有大量的"fast retransmits"意味着什么？

如果你再用 netstat 查看"reordering"，就可以看到大量的 SACK 发现的乱序包。

```bash
-bash-4.2# nsenter -t 51598 -n netstat -s  | grep reordering
    Detected reordering 501067 times using SACK
```

**其实在云平台的这种网络环境里，网络包乱序 +SACK 之后，产生的数据包重传的量要远远高于网络丢包引起的重传**。

比如说像下面这张图里展示的这样，Seq 2 与 Seq 3 这两个包如果乱序的话，那么就会引起 Seq 2 的立刻重传。

![12][12]

### Veth 接口的数据包的发送

现在我们知道了网络包乱序会造成数据包的重传，接着我们再来看看容器的 veth 接口配置有没有可能会引起数据包的乱序。

在上一讲里，我们讲过通过 veth 接口从容器向外发送数据包，会触发 peer veth 设备去接收数据包，这个接收的过程就是一个网络的 softirq 的处理过程。

在触发 softirq 之前，veth 接口会模拟硬件接收数据的过程，通过 enqueue_to_backlog() 函数把数据包放到某个 CPU 对应的数据包队列里（softnet_data）。

```c
static int netif_rx_internal(struct sk_buff *skb)
{
        int ret;
 
        net_timestamp_check(netdev_tstamp_prequeue, skb);
 
        trace_netif_rx(skb);
 
#ifdef CONFIG_RPS
        if (static_branch_unlikely(&rps_needed)) {
                struct rps_dev_flow voidflow, *rflow = &voidflow;
                int cpu;
 
                preempt_disable();
                rcu_read_lock();
 
                cpu = get_rps_cpu(skb->dev, skb, &rflow);
                if (cpu < 0)
                        cpu = smp_processor_id();
 
                ret = enqueue_to_backlog(skb, cpu, &rflow->last_qtail);
 
                rcu_read_unlock();
                preempt_enable();
        } else
#endif
        {
                unsigned int qtail;
 
                ret = enqueue_to_backlog(skb, get_cpu(), &qtail);
                put_cpu();
        }
        return ret;
}
```

从上面的代码，我们可以看到，在缺省的状况下（也就是没有 RPS 的情况下），enqueue_to_backlog() 把数据包放到了“当前运行的 CPU”（get_cpu()）对应的数据队列中。如果是从容器里通过 veth 对外发送数据包，那么这个“当前运行的 CPU”就是容器中发送数据的进程所在的 CPU。

对于多核的系统，这个发送数据的进程可以在多个 CPU 上切换运行。进程在不同的 CPU 上把数据放入队列并且 raise softirq 之后，因为每个 CPU 上处理 softirq 是个异步操作，所以两个 CPU network softirq handler 处理这个进程的数据包时，处理的先后顺序并不能保证。

所以，veth 对的这种发送数据方式增加了容器向外发送数据出现乱序的几率。

![12][12]

### RSS 和 RPS

那么对于 veth 接口的这种发包方式，有办法减少一下乱序的几率吗？

其实，我们在上面 netif_rx_internal() 那段代码中，有一段在"#ifdef CONFIG_RPS"中的代码。

我们看到这段代码中在调用 enqueue_to_backlog() 的时候，传入的 CPU 并不是当前运行的 CPU，而是通过 get_rps_cpu() 得到的 CPU，那么这会有什么不同呢？这里的 RPS 又是什么意思呢？

要解释 RPS 呢，需要先看一下 RSS，这个 RSS 不是我们之前说的内存 RSS，而是和网卡硬件相关的一个感念，它是 Receive Side Scaling 的缩写。

现在的网卡性能越来越强劲了，从原来一条 RX 队列扩展到了 N 条 RX 队列，而网卡的硬件中断也从一个硬件中断，变成了每条 RX 队列都会有一个硬件中断。

每个硬件中断可以由一个 CPU 来处理，那么对于多核的系统，多个 CPU 可以并行的接收网络包，这样就大大地提高了系统的网络数据的处理能力.

同时，在网卡硬件中，可以根据数据包的 4 元组或者 5 元组信息来保证同一个数据流，比如一个 TCP 流的数据始终在一个 RX 队列中，这样也能保证同一流不会出现乱序的情况。

下面这张图，大致描述了一下 RSS 是怎么工作的。

![14][14]

RSS 的实现在网卡硬件和驱动里面，而 RPS（Receive Packet Steering）其实就是在软件层面实现类似的功能。它主要实现的代码框架就在上面的 netif_rx_internal() 代码里，原理也不难。

就像下面的这张示意图里描述的这样：在硬件中断后，CPU2 收到了数据包，再一次对数据包计算一次四元组的 hash 值，得到这个数据包与 CPU1 的映射关系。接着会把这个数据包放到 CPU1 对应的 softnet_data 数据队列中，同时向 CPU1 发送一个 IPI 的中断信号。

这样一来，后面 CPU1 就会继续按照 Netowrk softirq 的方式来处理这个数据包了。

![15][15]

RSS 和 RPS 的目的都是把数据包分散到更多的 CPU 上进行处理，使得系统有更强的网络包处理能力。在把数据包分散到各个 CPU 时，保证了同一个数据流在一个 CPU 上，这样就可以减少包的乱序。

明白了 RPS 的概念之后，我们再回头来看 veth 对外发送数据时候，在 enqueue_to_backlog() 的时候选择 CPU 的问题。显然，如果对应的 veth 接口上打开了 RPS 的配置以后，那么对于同一个数据流，就可以始终选择同一个 CPU 了。

其实我们打开 RPS 的方法挺简单的，只要去 /sys 目录下，在网络接口设备接收队列中修改队列里的 rps_cpus 的值，这样就可以了。rps_cpus 是一个 16 进制的数，每个 bit 代表一个 CPU。

比如说，我们在一个12CPU的节点上，想让 host 上的 veth 接口在所有的 12个CPU上，都可以通过 RPS 重新分配数据包。那么就可以执行下面这段命令：

```bash
# cat /sys/devices/virtual/net/veth57703b6/queues/rx-0/rps_cpus
000
# echo fff > /sys/devices/virtual/net/veth57703b6/queues/rx-0/rps_cpus
# cat /sys/devices/virtual/net/veth57703b6/queues/rx-0/rps_cpus
fff
```

<!--

### 重点小结

由于在容器平台中看到大部分的重传是快速重传（fast retransmits），我们先梳理了什么是快速重传。快速重传的基本定义是：如果发送端收到 3 个重复的 ACK，那么发送端就可以立刻重新发送 ACK 对应的下一个数据包，而不用等待发送超时。

不过我们在 Linux 系统上还会看到发送端收到一个重复的 ACK 就快速重传的，这是因为 Linux 下对 SACK 做了一个特别的判断之后，就可以立刻重传数据包。

我们再对容器云平台中的快速重传做分析，就会发现这些重传大部分是由包的乱序触发的。

通过对容器 veth 网络接口进一步研究，我们知道它可能会增加数据包乱序的几率。同时在这个分析过程中，我们也看到了 Linux 网络 RPS 的特性。

**RPS 和 RSS 的作用类似，都是把数据包分散到更多的 CPU 上进行处理，使得系统有更强的网络包处理能力。它们的区别是 RSS 工作在网卡的硬件层，而 RPS 工作在 Linux 内核的软件层。**

在把数据包分散到各个 CPU 时，RPS 保证了同一个数据流是在一个 CPU 上的，这样就可以有效减少包的乱序。那么我们可以把 RPS 的这个特性配置到 veth 网络接口上，来减少数据包乱序的几率。

不过，我这里还要说明的是，RPS 的配置还是会带来额外的系统开销，在某些网络环境中会引起 softirq CPU 使用率的增大。那接口要不要打开 RPS 呢？这个问题你需要根据实际情况来做个权衡。

同时你还要注意，TCP 的乱序包，并不一定都会产生数据包的重传。想要减少网络数据包的重传，我们还可以考虑协议栈中其他参数的设置，比如 /proc/sys/net/ipv4/tcp_reordering。

-->

## 参考

- 《由浅入深吃透 Docker》
- 《容器实战高手课》
- http://www.docker.com
- https://www.docker-cn.com
- https://docs.docker.com/compose/compose-file/compose-file-v3/
- https://docs.docker.com/compose/reference/

[1]: /images/docker/docker-07/1.jpg
[2]: /images/docker/docker-07/2.jpg
[3]: /images/docker/docker-07/3.jpg
[4]: /images/docker/docker-07/4.jpg
[5]: /images/docker/docker-07/5.jpg
[6]: /images/docker/docker-07/6.jpg
[7]: /images/docker/docker-07/7.jpg
[8]: /images/docker/docker-07/8.jpg
[9]: /images/docker/docker-07/9.jpg
[10]: /images/docker/docker-07/10.jpg
[11]: /images/docker/docker-07/11.jpg
[12]: /images/docker/docker-07/12.jpg
[13]: /images/docker/docker-07/13.jpg
[14]: /images/docker/docker-07/14.jpg
[15]: /images/docker/docker-07/15.jpg
