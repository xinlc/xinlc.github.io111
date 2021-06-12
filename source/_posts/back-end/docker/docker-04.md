---
title: 重学 Docker 之 容器进阶（一）
date: 2021-04-03 15:00:00
categories: Docker
tags:
  - docker
---

容器是什么、理解进程

<!--more-->

## 认识容器：容器的基本操作和实现原理

### 做个镜像

其实，镜像就是一个特殊的文件系统，它提供了容器中程序执行需要的所有文件。具体来说，就是应用程序想启动，需要三类文件：相关的程序可执行文件、库文件和配置文件，这三类文件都被容器打包做好了。

这样，在容器运行的时候就不再依赖宿主机上的文件操作系统类型和配置了，做到了想在哪个节点上运行，就可以在哪个节点上立刻运行。

Docker 为用户自己定义镜像提供了一个叫做 Dockerfile 的文件，在这个 Dockerfile 文件里，你可以设定自己镜像的创建步骤。

```dockerfile
FROM centos:8.1.1911
RUN yum install -y httpd
COPY file1 /var/www/html/
ADD  file2.tar.gz /var/www/html/
CMD ["/sbin/httpd", "-D", "FOREGROUND"]
```

我们看下它做了哪几件事：在一个 centos 的基准镜像上安装好 httpd 的包，然后在 httpd 提供文件服务的配置目录下，把需要对外提供的文件 file1 和 file2 拷贝过去，最后指定容器启动以后，需要自动启动的 httpd 服务。

有了这个镜像，我们希望容器启动后，就运行这个 httpd 服务，让用户可以下载 file1 还有 file2 这两个文件。

下面这个命令中 -f ./Dockerfile 指定 Dockerfile 文件，-t registry/httpd:v1 指定了生成出来的镜像名，它的格式是"name:tag"，这个镜像名也是后面启动容器需要用到的。

```bash
$ docker build -t registry/httpd:v1 -f ./Dockerfile . 
```

### 启动一个容器 (Container)

做完一个镜像之后，你就可以用这个镜像来启动一个容器了，我们刚才做的镜像名字是 registry/httpd:v1，那么还是用 docker run 这个命令来启动容器。

```bash
$ docker run -d registry/httpd:v1
```

容器启动完成后，我们可以用 `docker ps` 命令来查看这个已经启动的容器

在前面介绍 Dockerfile 的时候，我们说过做这个镜像是用来提供 HTTP 服务的，也就是让用户可以下载 file1、file2 这两个文件。

那怎样来验证我们建起来的容器是不是正常工作的呢？可以通过这两步来验证：

- 第一步，我们可以进入容器的运行空间，查看 httpd 服务是不是启动了，配置文件是不是正确的。
- 第二步，对于 HTTP 文件服务，如果我们能用 curl 命令下载文件，就可以证明这个容器提供了我们预期的 httpd 服务。

我们先来做第一步验证，我们可以运行 docker exec 这个命令进入容器的运行空间，至于什么是容器的运行空间，它的标准说法是容器的命名空间（Namespace），这个概念我们等会儿再做介绍。

进入容器运行空间之后，我们怎么确认 httpd 的服务进程已经在容器里启动了呢？

我们运行下面这个 docker exec 命令，也就是执行 `docker exec c5a9ff78d9c1 ps -ef` ，可以看到 httpd 的服务进程正在容器的空间中运行。

这里我解释一下，在这个 docker exec 后面紧跟着的 ID 表示容器的 ID，这个 ID 就是我们之前运行 docker ps 查看过那个容器，容器的 ID 值是 c5a9ff78d9c1 。在这个 ID 值的后面，就是我们要在容器空间里运行的 ps -ef 命令。

接下来我们再来确认一下，httpd 提供文件服务的目录中 file1 和 file2 文件是否存在。

我们同样可以用 docker exec 来查看一下容器的文件系统中，httpd 提供文件服务的目录 /var/www/html 是否有这两个文件。

很好，我们可以看到 file1、file2 这两个文件也都放在指定目录中了。

```bash
$ docker exec c5a9ff78d9c1 ls /var/www/html
file1
file2
```

到这里我们完成了第一步的验证，进入到容器的运行空间里，验证了 httpd 服务已经启动，配置文件也是正确的。

那下面我们要做第二步的验证，用 curl 命令来验证是否可以从容器的 httpd 服务里下载到文件。

如果要访问 httpd 服务，我们就需要知道这个容器的 IP 地址。容器的网络空间也是独立的，有一个它自己的 IP。我们还是可以用 docker exec 进入到容器的网络空间，查看一下这个容器的 IP。

运行下面的这条 `docker exec c5a9ff78d9c1 ip addr` 命令，我们可以看到容器里网络接口 eth0 上配置的 IP 是 172.17.0.2 。

这个 IP 目前只能在容器的宿主机上访问，在别的机器上目前是不能访问的。

我们在宿主机上运行 curl ，就可以下载这个文件了，操作如下。很好，文件下载成功了，这证明了我们这个提供 httpd 服务的容器正常运行了。

```bash
$ curl -L -O http://172.17.0.2/file2
```

上面的步骤完成之后，我们的第二步验证，用 curl 下载 httpd 服务提供的文件也成功了。

好了，我们刚才自己做了容器镜像，用这个镜像启动了容器，并且用 docker exec 命令检查了容器运行空间里的进程、文件和网络设置。

通过这上面的这些操作练习，估计你已经初步感知到，容器的文件系统是独立的，运行的进程环境是独立的，网络的设置也是独立的。但是它们和宿主机上的文件系统，进程环境以及网络感觉都已经分开了。

我想和你说，这个感觉没错，的确是这样。我们刚才启动的容器，已经从宿主机环境里被分隔出来了，就像下面这张图里的描述一样。

![1][1]

从用户使用的角度来看，容器和一台独立的机器或者虚拟机没有什么太大的区别，但是它和虚拟机相比，却没有各种复杂的硬件虚拟层，没有独立的 Linux 内核。

容器所有的进程调度，内存访问，文件的读写都直接跑在宿主机的内核之上，这是怎么做到的呢？

### 容器是什么

要回答这个问题，你可以先记住这两个术语 Namespace 和 Cgroups。如果有人问你 Linux 上的容器是什么，最简单直接的回答就是 Namesapce 和 Cgroups。Namespace 和 Cgroups 可以让程序在一个资源可控的独立（隔离）环境中运行，这个就是容器了。

我们现在已经发现：容器的进程、网络还有文件系统都是独立的。那问题来了，容器的独立运行环境到底是怎么创造的呢？这就要提到 Namespace 这个概念了。所以接下来，就先从我们已经有点感觉的 Namespace 开始分析。

### Namespace

接着前面的例子，我们正好有了一个正在运行的容器，那我们就拿这个运行的容器来看看 Namespace 到底是什么？

在前面我们运行 `docker exec c5a9ff78d9c1 ps -ef`，看到了 5 个 httpd 进程，而且也只有这 5 个进程。

```bash
$ docker exec c5a9ff78d9c1 ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 01:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
apache       6     1  0 01:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
apache       7     1  0 01:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
apache       8     1  0 01:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
apache       9     1  0 01:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
```

如果我们不用 docker exec，直接在宿主机上运行 ps -ef，就会看到很多进程。如果我们运行一下 grep httpd ，同样可以看到这 5 个 httpd 的进程：

```bash
$ ps -ef | grep httpd
UID        PID  PPID  C STIME TTY          TIME CMD
root     20731 20684  0 18:59 ?        00:00:01 /sbin/httpd -D FOREGROUND
48       20787 20731  0 18:59 ?        00:00:00 /sbin/httpd -D FOREGROUND
48       20788 20731  0 18:59 ?        00:00:06 /sbin/httpd -D FOREGROUND
48       20789 20731  0 18:59 ?        00:00:05 /sbin/httpd -D FOREGROUND
48       20791 20731  0 18:59 ?        00:00:05 /sbin/httpd -D FOREGROUN
```

这两组输出结果到底有什么差别呢，你可以仔细做个对比，最大的不同就是进程的 PID 不一样。那为什么 PID 会不同呢？或者说，运行 docker exec c5a9ff78d9c1 ps -ef 和 ps -ef 实质的区别在哪里呢？

如果理解了 PID 为何不同，我们就能搞清楚 Linux Namespace 的概念了，为了方便后文的讲解，我们先用下面这张图来梳理一下我们看到的 PID。

![2][2]

Linux 在创建容器的时候，就会建出一个 PID Namespace，PID 其实就是进程的编号。这个 PID Namespace，就是指每建立出一个 Namespace，就会单独对进程进行 PID 编号，每个 Namespace 的 PID 编号都从 1 开始。

同时在这个 PID Namespace 中也只能看到 Namespace 中的进程，而且看不到其他 Namespace 里的进程。

这也就是说，如果有另外一个容器，那么它也有自己的一个 PID Namespace，而这两个 PID Namespace 之间是不能看到对方的进程的，这里就体现出了 Namespace 的作用：**相互隔离**。

而在宿主机上的 Host PID Namespace，它是其他 Namespace 的父亲 Namespace，可以看到在这台机器上的所有进程，不过进程 PID 编号不是 Container PID Namespace 里的编号了，而是把所有在宿主机运行的进程放在一起，再进行编号。

讲了 PID Namespace 之后，我们了解到 **Namespace 其实就是一种隔离机制，主要目的是隔离运行在同一个宿主机上的容器，让这些容器之间不能访问彼此的资源。**

这种隔离有两个作用：**第一是可以充分地利用系统的资源，也就是说在同一台宿主机上可以运行多个用户的容器；第二是保证了安全性，因为不同用户之间不能访问对方的资源。**

除了 PID Namespace，还有其他常见的 Namespace 类型，比如我们之前运行了 docker exec c5a9ff78d9c1 ip addr 这个命令去查看容器内部的 IP 地址，这里其实就是在查看 Network Namespace。

在 Network Namespace 中都有一套独立的网络接口比如这里的 lo，eth0，还有独立的 TCP/IP 的协议栈配置。

```bash
$ docker exec c5a9ff78d9c1 ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
168: eth0@if169: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

我们还可以运行 docker exec c5a9ff78d9c1 ls/ 查看容器中的根文件系统（rootfs）。然后，你会发现，它和宿主机上的根文件系统也是不一样的。**容器中的根文件系统，其实就是我们做的镜像。**

那容器自己的根文件系统完全独立于宿主机上的根文件系统，这一点是怎么做到的呢？其实这里依靠的是 **Mount Namespace**，Mount Namespace 保证了每个容器都有自己独立的文件目录结构。

Namespace 的类型还有很多，我们查看"Linux Programmer’s Manual"，可以看到 Linux 中所有的 Namespace：cgroup/ipc/network/mount/pid/time/user/uts。

在这里呢，你需要记住的是 **Namespace 是 Linux 中实现容器的两大技术之一，它最重要的作用是保证资源的隔离。**在后面讲解到具体问题时，我会不断地提到 Namespace 这个概念。

![3][3]

我们刚才说了 Namespace，这些 Namespace 尽管类型不同，其实都是为了隔离容器资源：**PID Namespace 负责隔离不同容器的进程，Network Namespace 又负责管理网络环境的隔离，Mount Namespace 管理文件系统的隔离。**

正是通过这些 Namespace，我们才隔离出一个容器，这里你也可以把它看作是一台“计算机”。

既然是一台“计算机”，你肯定会问这个“计算机”有多少 CPU，有多少 Memory 啊？那么 Linux 如何为这些“计算机”来定义 CPU，定义 Memory 的容量呢？

### Cgroups

想要定义“计算机”各种容量大小，就涉及到支撑容器的第二个技术 **Cgroups （Control Groups）**了。Cgroups 可以对指定的进程做各种计算机资源的限制，比如限制 CPU 的使用率，内存使用量，IO 设备的流量等等。

Cgroups 究竟有什么好处呢？要知道，在 Cgroups 出现之前，任意一个进程都可以创建出成百上千个线程，可以轻易地消耗完一台计算机的所有 CPU 资源和内存资源。

但是有了 Cgroups 这个技术以后，我们就可以对一个进程或者一组进程的计算机资源的消耗进行限制了。

Cgroups 通过不同的子系统限制了不同的资源，每个子系统限制一种资源。每个子系统限制资源的方式都是类似的，就是把相关的一组进程分配到一个控制组里，然后通过**树结构**进行管理，每个控制组都设有自己的资源控制参数。

完整的 Cgroups 子系统的介绍，你可以查看[Linux Programmer’s Manual](https://man7.org/linux/man-pages/man7/cgroups.7.html) 中 Cgroups 的定义。

这里呢，我们只需要了解几种比较常用的 Cgroups 子系统：

- CPU 子系统，用来限制一个控制组（一组进程，你可以理解为一个容器里所有的进程）可使用的最大 CPU。
- memory 子系统，用来限制一个控制组最大的内存使用量。
- pids 子系统，用来限制一个控制组里最多可以运行多少个进程。
- cpuset 子系统， 这个子系统来限制一个控制组里的进程可以在哪几个物理 CPU 上运行。

因为 memory 子系统的限制参数最简单，所以下面我们就用 memory 子系统为例，一起看看 Cgroups 是怎么对一个容器做资源限制的。

对于启动的每个容器，都会在 Cgroups 子系统下建立一个目录，在 Cgroups 中这个目录也被称作控制组，比如下图里的"docker-<id1>""docker-<id2>"等。然后我们设置这个控制组的参数，通过这个方式，来限制这个容器的内存资源。

![4][4]

还记得，我们之前用 Docker 创建的那个容器吗？在每个 Cgroups 子系统下，对应这个容器就会有一个目录 docker-**c5a9ff78d9c1……**这个容器的 ID 号，容器中所有的进程都会储存在这个控制组中  cgroup.procs 这个参数里。

你看下面的这些进程号是不是很熟悉呢？没错，它们就是前面我们用 ps 看到的进程号。

我们实际看一下这个例子里的 memory Cgroups，它可以控制 Memory 的使用量。比如说，我们将这个控制组 Memory 的最大用量设置为 2GB。

具体操作是这样的，我们把（2* 1024 * 1024 * 1024 = 2147483648）这个值，写入 memory Cgroup 控制组中的 memory.limit_in_bytes 里，**这样设置后，cgroup.procs 里面所有进程 Memory 使用量之和，最大也不会超过 2GB。**

```bash
$ cd /sys/fs/cgroup/memory/system.slice/docker-c5a9ff78d9c1fedd52511e18fdbd26357250719fa0d128349547a50fad7c5de9.scope
$ cat cgroup.procs
20731
20787
20788
20789
20791
$ echo 2147483648 > memory.limit_in_bytes
$ cat memory.limit_in_bytes
2147483648
```

刚刚我们通过 memory Cgroups 定义了容器的 memory 可以使用的最大值。其他的子系统稍微复杂一些，但用法也和 memory 类似，我们在后面会结合具体的实例来详细解释其他的 Cgroups。

这里我们还要提一下 **Cgroups 有 v1 和 v2 两个版本**：

Cgroups v1 在 Linux 中很早就实现了，各种子系统比较独立，每个进程在各个 Cgroups 子系统中独立配置，可以属于不同的 group。

虽然这样比较灵活，但是也存在问题，会导致对**同一进程的资源协调比较困难**（比如 memory Cgroup 与 blkio Cgroup 之间就不能协作）。虽然 v1 有缺陷，但是在主流的生产环境中，大部分使用的还是 v1。

Cgroups v2 做了设计改进，**解决了 v1 的问题，使各个子系统可以协调统一地管理资源。**

不过 Cgroups v2 在生产环境的应用还很少，因为该版本很多子系统的实现需要较新版本的 Linux 内核，还有无论是主流的 Linux 发行版本还是容器云平台，比如 Kubernetes，对 v2 的支持也刚刚起步。

所以啊，我们在后面 Cgroups 的讲解里呢，主要还是用 **Cgroups v1 这个版本**，在磁盘 I/O 的这一章中，我们也会介绍一下 Cgroups v2。

好了，上面我们解读了 Namespace 和 Cgroups 两大技术，它们是 Linux 下实现容器的两个基石，后面中要讨论的容器相关问题，或多或少都和 Namespace 或者 Cgroups 相关，我们会结合具体问题做深入的分析。

目前呢，你只需要先记住这两个技术的作用，**Namespace 帮助容器来实现各种计算资源的隔离，Cgroups 主要限制的是容器能够使用的某种资源量。**

## 理解进程（1）：为什么我在容器中不能kill 1号进程？

接下来，我们用 kill 1 命令重启容器的问题。

我猜你肯定想问，为什么要在容器中执行 kill 1 或者 kill -9 1 的命令呢？其实这是我们团队里的一位同学提出的问题。

这位同学当时遇到的情况是这样的，他想修改容器镜像里的一个 bug，但因为网路配置的问题，这个同学又不想为了重建 pod 去改变 pod IP。

如果你用过 Kubernetes 的话，你也肯定知道，Kubernetes 上是没有 restart pod 这个命令的。这样看来，他似乎只能让 pod 做个原地重启了。**当时我首先想到的，就是在容器中使用 kill pid 1 的方式重启容器。**

为了模拟这个过程，我们可以进行下面的这段操作。 我们用 Docker 构建一个容器。

最后，我们在容器中运行 kill 1 和 kill -9 1 ，看看会发生什么。

**init.sh**

```bash
#!/bin/bash

while true
do
	sleep 100
done
```

**Dockerfile**

```dockerfile
FROM centos:8.1.1911

COPY ./init.sh /
```


```bash
$ docker stop sig-proc;docker rm sig-proc
$ docker run --name sig-proc -d registry/sig-proc:v1 /init.sh
$ docker exec -it sig-proc bash
[root@5cc69036b7b2 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 07:23 ?        00:00:00 /bin/bash /init.sh
root         8     1  0 07:25 ?        00:00:00 /usr/bin/coreutils --coreutils-prog-shebang=sleep /usr/bin/sleep 100
root         9     0  6 07:27 pts/0    00:00:00 bash
root        22     9  0 07:27 pts/0    00:00:00 ps -ef
[root@5cc69036b7b2 /]# kill 1
[root@5cc69036b7b2 /]# kill -9 1
[root@5cc69036b7b2 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 07:23 ?        00:00:00 /bin/bash /init.sh
root         9     0  0 07:27 pts/0    00:00:00 bash
root        23     1  0 07:27 ?        00:00:00 /usr/bin/coreutils --coreutils-prog-shebang=sleep /usr/bin/sleep 100
root        24     9  0 07:27 pts/0    00:00:00 ps -ef
```

当我们完成前面的操作，就会发现无论运行 kill 1 （对应 Linux 中的 SIGTERM 信号）还是 kill -9 1（对应 Linux 中的 SIGKILL 信号），都无法让进程终止。

那么问题来了，这两个常常用来终止进程的信号，都对容器中的 init 进程不起作用，这是怎么回事呢？

要解释这个问题，我们就要回到容器的两个最基本概念——init 进程和 Linux 信号中寻找答案。

### 如何理解 init 进程？

使用容器的理想境界是**一个容器只启动一个进程**，但这在现实应用中有时是做不到的。

比如说，在一个容器中除了主进程之外，我们可能还会启动辅助进程，做监控或者 rotate logs；再比如说，我们需要把原来运行在虚拟机（VM）的程序移到容器里，这些原来跑在虚拟机上的程序本身就是多进程的。

一旦我们启动了多个进程，那么容器里就会出现一个 pid 1，也就是我们常说的 1 号进程或者 init 进程，然后**由这个进程创建出其他的子进程。**

接下来，我带你梳理一下 init 进程是怎么来的。

一个 Linux 操作系统，在系统打开电源，执行 BIOS/boot-loader 之后，就会由 boot-loader 负责加载 Linux 内核。

Linux 内核执行文件一般会放在 /boot 目录下，文件名类似 vmlinuz*。在内核完成了操作系统的各种初始化之后，**这个程序需要执行的第一个用户态程就是 init 进程。**

内核代码启动 1 号进程的时候，在没有外面参数指定程序路径的情况下，一般会从几个缺省路径尝试执行 1 号进程的代码。这几个路径都是 Unix 常用的可执行代码路径。

系统启动的时候先是执行内核态的代码，然后在内核中调用 1 号进程的代码，从内核态切换到用户态。

目前主流的 Linux 发行版，无论是 RedHat 系的还是 Debian 系的，都会把 /sbin/init 作为符号链接指向 Systemd。Systemd 是目前最流行的 Linux init 进程，在它之前还有 SysVinit、UpStart 等 Linux init 进程。

**但无论是哪种 Linux init 进程，它最基本的功能都是创建出 Linux 系统中其他所有的进程，并且管理这些进程。**具体在 kernel 里的代码实现如下：

```c
init/main.c
        /*
         * We try each of these until one succeeds.
         *
         * The Bourne shell can be used instead of init if we are
         * trying to recover a really broken machine.
         */
        if (execute_command) {
                ret = run_init_process(execute_command);
                if (!ret)
                        return 0;
                panic("Requested init %s failed (error %d).",
                      execute_command, ret);
        }
        if (!try_to_run_init_process("/sbin/init") ||
            !try_to_run_init_process("/etc/init") ||
            !try_to_run_init_process("/bin/init") ||
            !try_to_run_init_process("/bin/sh"))
                return 0;
        panic("No working init found.  Try passing init= option to kernel. "
              "See Linux Documentation/admin-guide/init.rst for guidance.");
```

```bash
$ ls -l /sbin/init
lrwxrwxrwx 1 root root 20 Feb  5 01:07 /sbin/init -> /lib/systemd/systemd
```

在 Linux 上有了容器的概念之后，一旦容器建立了自己的 Pid Namespace（进程命名空间），这个 Namespace 里的进程号也是从 1 开始标记的。所以，容器的 init 进程也被称为 1 号进程。

怎么样，1 号进程是不是不难理解？关于这个知识点，你只需要记住： **1 号进程是第一个用户态的进程，由它直接或者间接创建了 Namespace 中的其他进程。**

### 如何理解 Linux 信号？

刚才我给你讲了什么是 1 号进程，要想解决“为什么我在容器中不能 kill 1 号进程”这个问题，我们还得看看 kill 命令起到的作用。

我们运行 kill 命令，其实在 Linux 里就是发送一个信号，那么信号到底是什么呢？这就涉及到 Linux 信号的概念了。

其实信号这个概念在很早期的 Unix 系统上就有了。它一般会从 1 开始编号，通常来说，信号编号是 1 到 31，这个编号在所有的 Unix 系统上都是一样的。

在 Linux 上我们可以用 kill -l 来看这些信号的编号和名字，具体的编号和名字我给你列在了下面，你可以看一看。

```bash
$ kill -l
 1) SIGHUP      2) SIGINT    3) SIGQUIT    4) SIGILL    5) SIGTRAP
 6) SIGABRT     7) SIGBUS    8) SIGFPE     9) SIGKILL  10) SIGUSR1
11) SIGSEGV    12) SIGUSR2  13) SIGPIPE   14) SIGALRM  15) SIGTERM
16) SIGSTKFLT  17) SIGCHLD  18) SIGCONT   19) SIGSTOP  20) SIGTSTP
21) SIGTTIN    22) SIGTTOU  23) SIGURG    24) SIGXCPU  25) SIGXFSZ
26) SIGVTALRM  27) SIGPROF  28) SIGWINCH  29) SIGIO    30) SIGPWR
31) SIGSYS
```

用一句话来概括，**信号（Signal）其实就是 Linux 进程收到的一个通知。**这些通知产生的源头有很多种，通知的类型也有很多种。

比如下面这几个典型的场景，你可以看一下：

- 如果我们按下键盘“Ctrl+C”，当前运行的进程就会收到一个信号 SIGINT 而退出；
- 如果我们的代码写得有问题，导致内存访问出错了，当前的进程就会收到另一个信号 SIGSEGV；
- 我们也可以通过命令 kill <pid>，直接向一个进程发送一个信号，缺省情况下不指定信号的类型，那么这个信号就是 SIGTERM。也可以指定信号类型，比如命令 “kill -9 <pid>”, 这里的 9，就是编号为 9 的信号，SIGKILL 信号。

我们主要用到 **SIGTERM（15）和 SIGKILL（9）这两个信号**，所以这里你主要了解这两个信号就可以了，其他信号以后用到时再做介绍。

进程在收到信号后，就会去做相应的处理。怎么处理呢？对于每一个信号，进程对它的处理都有下面三个选择。

第一个选择是**忽略（Ignore）**，就是对这个信号不做任何处理，但是有两个信号例外，对于 SIGKILL 和 SIGSTOP 这个两个信号，进程是不能忽略的。这是因为它们的主要作用是为 Linux kernel 和超级用户提供删除任意进程的特权。

第二个选择，就是**捕获（Catch）**，这个是指让用户进程可以注册自己针对这个信号的 handler。具体怎么做我们目前暂时涉及不到，你先知道就行，我们在后面会进行详细介绍。

**对于捕获，SIGKILL 和 SIGSTOP 这两个信号也同样例外，这两个信号不能有用户自己的处理代码，只能执行系统的缺省行为。**

还有一个选择是**缺省行为（Default）**，Linux 为每个信号都定义了一个缺省的行为，你可以在 Linux 系统中运行 man 7 signal来查看每个信号的缺省行为。

对于大部分的信号而言，应用程序不需要注册自己的 handler，使用系统缺省定义行为就可以了。

![5][5]

我刚才说了，SIGTERM（15）和 SIGKILL（9）这两个信号是我们重点掌握的。现在我们已经讲解了信号的概念和处理方式，我就拿这两个信号为例，再带你具体分析一下。

首先我们来看 SIGTERM（15），这个信号是 Linux 命令 kill 缺省发出的。前面例子里的命令 kill 1 ，就是通过 kill 向 1 号进程发送一个信号，在没有别的参数时，这个信号类型就默认为 SIGTERM。

SIGTERM 这个信号是可以被捕获的，这里的“捕获”指的就是用户进程可以为这个信号注册自己的 handler，而这个 handler，我们后面会看到，它可以处理进程的 graceful-shutdown 问题。

我们再来了解一下 SIGKILL (9)，这个信号是 Linux 里两个**特权信号**之一。什么是特权信号呢？

前面我们已经提到过了，**特权信号就是 Linux 为 kernel 和超级用户去删除任意进程所保留的，不能被忽略也不能被捕获。**那么进程一旦收到 SIGKILL，就要退出。

在前面的例子里，我们运行的命令 kill -9 1 里的参数“-9”，其实就是指发送编号为 9 的这个 SIGKILL 信号给 1 号进程。

### 现象解释

现在，你应该理解 init 进程和 Linux 信号这两个概念了，让我们回到开头的问题上来：“为什么我在容器中不能 kill 1 号进程，甚至 SIGKILL 信号也不行？”

你还记得么，在最开始，我们已经尝试过用 bash 作为容器 1 号进程，这样是无法把 1 号进程杀掉的。那么我们再一起来看一看，用别的编程语言写的 1 号进程是否也杀不掉。

我们现在**用 C 程序作为 init 进程**，尝试一下杀掉 1 号进程。和 bash init 进程一样，无论 SIGTERM 信号还是 SIGKILL 信号，在容器里都不能杀死这个 1 号进程。

```bash
# cat c-init-nosig.c
#include <stdio.h>
#include <unistd.h>
int main(int argc, char *argv[])
{
       printf("Process is sleeping\n");
       while (1) {
              sleep(100);
       }
       return 0;
}
```

```bash
# docker stop sig-proc;docker rm sig-proc
# docker run --name sig-proc -d registry/sig-proc:v1 /c-init-nosig
# docker exec -it sig-proc bash
[root@5d3d42a031b1 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 07:48 ?        00:00:00 /c-init-nosig
root         6     0  5 07:48 pts/0    00:00:00 bash
root        19     6  0 07:48 pts/0    00:00:00 ps -ef
[root@5d3d42a031b1 /]# kill 1
[root@5d3d42a031b1 /]# kill -9 1
[root@5d3d42a031b1 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 07:48 ?        00:00:00 /c-init-nosig
root         6     0  0 07:48 pts/0    00:00:00 bash
root        20     6  0 07:49 pts/0    00:00:00 ps -ef
```

我们是不是这样就可以得出结论——“容器里的 1 号进程，完全忽略了 SIGTERM 和 SIGKILL 信号了”呢？你先别着急，我们再拿其他语言试试。

接下来，我们用 **Golang 程序作为 1 号进程**，我们再在容器中执行 kill -9 1 和 kill 1 。

这次，我们发现 kill -9 1 这个命令仍然不能杀死 1 号进程，也就是说，SIGKILL 信号和之前的两个测试一样不起作用。

**但是，我们执行** **kill 1** **以后，SIGTERM 这个信号把 init 进程给杀了，容器退出了。**

```bash
# cat go-init.go
package main
import (
       "fmt"
       "time"
)
func main() {
       fmt.Println("Start app\n")
       time.Sleep(time.Duration(100000) * time.Millisecond)
}
```

```bash
# docker stop sig-proc;docker rm sig-proc
# docker run --name sig-proc -d registry/sig-proc:v1 /go-init
# docker exec -it sig-proc bash
[root@234a23aa597b /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  1 08:04 ?        00:00:00 /go-init
root        10     0  9 08:04 pts/0    00:00:00 bash
root        23    10  0 08:04 pts/0    00:00:00 ps -ef
[root@234a23aa597b /]# kill -9 1
[root@234a23aa597b /]# kill 1
[root@234a23aa597b /]# [~]# docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```

对于这个测试结果，你是不是反而觉得更加困惑了？

为什么使用不同程序，结果就不一样呢？接下来我们就看看 kill 命令下达之后，Linux 里究竟发生了什么事，我给你系统地梳理一下整个过程。

在我们运行 kill 1 这个命令的时候，希望把 SIGTERM 这个信号发送给 1 号进程，就像下面图里的**带箭头虚线**。

在 Linux 实现里，kill 命令调用了 **kill() 的这个系统调用**（所谓系统调用就是内核的调用接口）而进入到了内核函数 sys_kill()， 也就是下图里的**实线箭头**。

而内核在决定把信号发送给 1 号进程的时候，会调用 sig_task_ignored() 这个函数来做个判断，这个判断有什么用呢？

它会决定内核在哪些情况下会把发送的这个信号给忽略掉。如果信号被忽略了，那么 init 进程就不能收到指令了。

所以，我们想要知道 init 进程为什么收到或者收不到信号，都要去看看 **sig_task_ignored() 的这个内核函数的实现。**

![sig_task_ignored()内核函数实现示意图][6]

在 sig_task_ignored() 这个函数中有三个 if{}判断，第一个和第三个 if{}判断和我们的问题没有关系，并且代码有注释，我们就不讨论了。

我们重点来看第二个 if{}。我来给你分析一下，在容器中执行 kill 1 或者 kill -9 1 的时候，这第二个 if{}里的三个子条件是否可以被满足呢？

我们来看下面这串代码，这里表示**一旦这三个子条件都被满足，那么这个信号就不会发送给进程。**

```c
kernel/signal.c
static bool sig_task_ignored(struct task_struct *t, int sig, bool force)
{
        void __user *handler;
        handler = sig_handler(t, sig);
        /* SIGKILL and SIGSTOP may not be sent to the global init */
        if (unlikely(is_global_init(t) && sig_kernel_only(sig)))
                return true;
        if (unlikely(t->signal->flags & SIGNAL_UNKILLABLE) &&
            handler == SIG_DFL && !(force && sig_kernel_only(sig)))
                return true;
        /* Only allow kernel generated signals to this kthread */
        if (unlikely((t->flags & PF_KTHREAD) &&
                     (handler == SIG_KTHREAD_KERNEL) && !force))
                return true;
        return sig_handler_ignored(handler, sig);
}
```

接下来，我们就逐一分析一下这三个子条件，我们来说说这个"!(force && sig_kernel_only(sig))" 。

第一个条件里 force 的值，对于同一个 Namespace 里发出的信号来说，调用值是 0，所以这个条件总是满足的。

我们再来看一下第二个条件 “handler == SIG_DFL”，第二个条件判断信号的 handler 是否是 SIG_DFL。

那么什么是 SIG_DFL 呢？**对于每个信号，用户进程如果不注册一个自己的 handler，就会有一个系统缺省的 handler，这个缺省的 handler 就叫作 SIG_DFL。**

对于 SIGKILL，我们前面介绍过它是特权信号，是不允许被捕获的，所以它的 handler 就一直是 SIG_DFL。这第二个条件对 SIGKILL 来说总是满足的。

对于 SIGTERM，它是可以被捕获的。也就是说如果用户不注册 handler，那么这个条件对 SIGTERM 也是满足的。

最后再来看一下第三个条件，“t->signal->flags & SIGNAL_UNKILLABLE”，这里的条件判断是这样的，进程必须是 SIGNAL_UNKILLABLE 的。

这个 SIGNAL_UNKILLABLE flag 是在哪里置位的呢？

可以参考我们下面的这段代码，在每个 Namespace 的 init 进程建立的时候，就会打上 **SIGNAL_UNKILLABLE** 这个标签，也就是说只要是 1 号进程，就会有这个 flag，这个条件也是满足的。

```c
kernel/fork.c
                       if (is_child_reaper(pid)) {
                                ns_of_pid(pid)->child_reaper = p;
                                p->signal->flags |= SIGNAL_UNKILLABLE;
                        }
/*
 * is_child_reaper returns true if the pid is the init process
 * of the current namespace. As this one could be checked before
 * pid_ns->child_reaper is assigned in copy_process, we check
 * with the pid number.
 */
static inline bool is_child_reaper(struct pid *pid)
{
        return pid->numbers[pid->level].nr == 1;
}
```

我们可以看出来，其实**最关键的一点就是** **handler == SIG_DFL** **。Linux 内核针对每个 Nnamespace 里的 init 进程，把只有 default handler 的信号都给忽略了。**

如果我们自己注册了信号的 handler（应用程序注册信号 handler 被称作"Catch the Signal"），那么这个信号 handler 就不再是 SIG_DFL 。即使是 init 进程在接收到 SIGTERM 之后也是可以退出的。

不过，由于 SIGKILL 是一个特例，因为 SIGKILL 是不允许被注册用户 handler 的（还有一个不允许注册用户 handler 的信号是 SIGSTOP），那么它只有 SIG_DFL handler。

所以 init 进程是永远不能被 SIGKILL 所杀，但是可以被 SIGTERM 杀死。

说到这里，我们该怎么证实这一点呢？我们可以做下面两件事来验证。

**第一件事，你可以查看 1 号进程状态中 SigCgt Bitmap。**

我们可以看到，在 Golang 程序里，很多信号都注册了自己的 handler，当然也包括了 SIGTERM(15)，也就是 bit 15。

而 C 程序里，缺省状态下，一个信号 handler 都没有注册；bash 程序里注册了两个 handler，bit 2 和 bit 17，也就是 SIGINT 和 SIGCHLD，但是没有注册 SIGTERM。

所以，C 程序和 bash 程序里 SIGTERM 的 handler 是 SIG_DFL（系统缺省行为），那么它们就不能被 SIGTERM 所杀。

具体我们可以看一下这段 /proc 系统的进程状态：

```bash
### golang init
# cat /proc/1/status | grep -i SigCgt
SigCgt:     fffffffe7fc1feff
### C init
# cat /proc/1/status | grep -i SigCgt
SigCgt:     0000000000000000
### bash init
# cat /proc/1/status | grep -i SigCgt
SigCgt:     0000000000010002
```

**第二件事，给 C 程序注册一下 SIGTERM handler，捕获 SIGTERM。**

我们调用 signal() 系统调用注册 SIGTERM 的 handler，在 handler 里主动退出，再看看容器中 kill 1 的结果。

这次我们就可以看到，**在进程状态的 SigCgt bitmap 里，bit 15 (SIGTERM) 已经置位了。同时，运行** **kill 1** **也可以把这个 C 程序的 init 进程给杀死了。**

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
void sig_handler(int signo)
{
    if (signo == SIGTERM) {
           printf("received SIGTERM\n");
           exit(0);
    }
}
int main(int argc, char *argv[])
{
    signal(SIGTERM, sig_handler);
    printf("Process is sleeping\n");
    while (1) {
           sleep(100);
    }
    return 0;
}
```

```bash
# docker stop sig-proc;docker rm sig-proc
# docker run --name sig-proc -d registry/sig-proc:v1 /c-init-sig
# docker exec -it sig-proc bash
[root@043f4f717cb5 /]# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 09:05 ?        00:00:00 /c-init-sig
root         6     0 18 09:06 pts/0    00:00:00 bash
root        19     6  0 09:06 pts/0    00:00:00 ps -ef
[root@043f4f717cb5 /]# cat /proc/1/status | grep SigCgt
SigCgt: 0000000000004000
[root@043f4f717cb5 /]# kill 1
# docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
```

好了，到这里我们可以确定这两点：

1. kill -9 1 在容器中是不工作的，内核阻止了 1 号进程对 SIGKILL 特权信号的响应。
2. kill 1 分两种情况，如果 1 号进程没有注册 SIGTERM 的 handler，那么对 SIGTERM 信号也不响应，如果注册了 handler，那么就可以响应 SIGTERM 信号。

<!--
**重点总结**

这一讲我们主要讲了 init 进程。围绕这个知识点，我提出了一个真实发生的问题：“为什么我在容器中不能 kill 1 号进程?”。

想要解决这个问题，我们需要掌握两个基本概念。

第一个概念是 Linux 1 号进程。**它是第一个用户态的进程。它直接或者间接创建了 Namespace 中的其他进程。**

第二个概念是 Linux 信号。Linux 有 31 个基本信号，进程在处理大部分信号时有三个选择：**忽略、捕获和缺省行为。其中两个特权信号 SIGKILL 和 SIGSTOP 不能被忽略或者捕获。**

只知道基本概念还不行，我们还要去解决问题。我带你尝试了用 bash, C 语言还有 Golang 程序作为容器 init 进程，发现它们对 kill 1 的反应是不同的。

因为信号的最终处理都是在 Linux 内核中进行的，因此，我们需要对 Linux 内核代码进行分析。

容器里 1 号进程对信号处理的两个要点，这也是这一讲里我想让你记住的两句话：

**在容器中，1 号进程永远不会响应 SIGKILL 和 SIGSTOP 这两个特权信号；**

**对于其他的信号，如果用户自己注册了 handler，1 号进程可以响应。**

很多介绍容器的文章可能都会强调容器是进程，不过它们讨论的背景应该是和虚拟机做比较之后这么说的，因为在容器之前虚拟机是云平台上最流行的技术。强调容器是进程的目的是区分容器与虚拟机的差别，但是我不认为这个是容器的本质。

其实无论是namespace (pid namespace)还是cgroups都是在管理进程， 容器中运行是进程，这个是个明显的特征了，但不是本质。

我们如果换一个角度去思考，如果容器流行先于虚拟机技术， 我们是否还会强调容器是进程了呢？
-->

## 理解进程（2）：为什么我的容器里有这么多僵尸进程？

**问题再现**

我们平时用容器的时候，有的同学会发现，自己的容器运行久了之后，运行 ps 命令会看到一些进程，进程名后面加了 <defunct> 标识。那么你自然会有这样的疑问，这些是什么进程呢？

你可以自己做个容器镜像来模拟一下，运行 make image 之后，再启动容器。

在容器里我们可以看到，1 号进程 fork 出 1000 个子进程。当这些子进程运行结束后，它们的进程名字后面都加了标识。

从它们的 Z stat（进程状态）中我们可以知道，这些都是僵尸进程（Zombie Process）。运行 top 命令，我们也可以看到输出的内容显示有 1000 zombie 进程。

**Makefile**

```Makefile
all: app-test image
app-test: app-test.c
	gcc -o app-test app-test.c

image: app-test
	docker build -t registry/zombie-proc:v1 .
clean: 
	rm -f *.o app-test
	docker rmi registry/zombie-proc:v1
```

**Dockerfile**

```Dockerfile
FROM centos:8.1.1911

COPY ./app-test /

CMD ["/app-test", "1000"]
```

**app-test-nowait.c**

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
	int i;
	int total;

	if (argc < 2) {
		total = 1;
	} else {
		total = atoi(argv[1]);
	}

	printf("To create %d processes\n", total);

	for (i = 0; i < total; i++) {
		pid_t pid = fork();

		if (pid == 0) {
			printf("Child => PPID: %d PID: %d\n", getppid(),
			       getpid());
			sleep(60);
			printf("Child process eixts\n");
			exit(EXIT_SUCCESS);
		} else if (pid > 0) {
			printf("Parent created child %d\n", i);
		} else {
			printf("Unable to create child process. %d\n", i);
			break;
		}
	}

	printf("Paraent is sleeping\n");
	while (1) {
		sleep(100);
	}

	return EXIT_SUCCESS;
}
```

**app-test-wait.c**

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
	int i;
	int total;

	if (argc < 2) {
		total = 1;
	} else {
		total = atoi(argv[1]);
	}

	printf("To create %d processes\n", total);

	for (i = 0; i < total; i++) {
		pid_t pid = fork();

		if (pid == 0) {
			printf("Child => PPID: %d PID: %d\n", getppid(),
			       getpid());
			sleep(60);
			printf("Child process eixts\n");
			exit(EXIT_SUCCESS);
		} else if (pid > 0) {
			printf("Parent created child %d\n", i);
		} else {
			printf("Unable to create child process. %d\n", i);
			break;
		}
	}

	for (i = 0; i < total; i++) {
		int status;
		wait(&status);
	}

	printf("Paraent is sleeping\n");
	while (1) {
		sleep(100);
	}

	return EXIT_SUCCESS;
}
```

**app-test.c**:

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
	int i;
	int total;

	if (argc < 2) {
		total = 1;
	} else {
		total = atoi(argv[1]);
	}

	printf("To create %d processes\n", total);

	for (i = 0; i < total; i++) {
		pid_t pid = fork();

		if (pid == 0) {
			printf("Child => PPID: %d PID: %d\n", getppid(),
			       getpid());
			sleep(60);
			printf("Child process eixts\n");
			exit(EXIT_SUCCESS);
		} else if (pid > 0) {
			printf("Parent created child %d\n", i);
		} else {
			printf("Unable to create child process. %d\n", i);
			break;
		}
	}

	printf("Paraent is sleeping\n");
	while (1) {
		sleep(100);
	}

	return EXIT_SUCCESS;
}
```

```bash

# docker run --name zombie-proc -d registry/zombie-proc:v1
02dec161a9e8b18922bd3599b922dbd087a2ad60c9b34afccde7c91a463bde8a
# docker exec -it zombie-proc bash
# ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0   4324  1436 ?        Ss   01:23   0:00 /app-test 1000
root         6  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root         7  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root         8  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root         9  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root        10  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
…
root       999  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1000  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1001  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1002  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1003  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1004  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1005  0.0  0.0      0     0 ?        Z    01:23   0:00 [app-test] <defunct>
root      1023  0.0  0.0  12020  3392 pts/0    Ss   01:39   0:00 bash
# top
top - 02:18:57 up 31 days, 15:17,  0 users,  load average: 0.00, 0.01, 0.00
Tasks: 1003 total,   1 running,   2 sleeping,   0 stopped, 1000 zombie
…
```

那么问题来了，什么是僵尸进程？它们是怎么产生的？僵尸进程太多会导致什么问题？想要回答这些问题，我们就要从进程状态的源头学习，看看僵尸进程到底处于进程整个生命周期里的哪一环。

### Linux 的进程状态

无论进程还是线程，在 Linux 内核里其实都是用 **task_struct{}这个结构**来表示的。它其实就是任务（task），也就是 Linux 里基本的调度单位。为了方便讲解，我们在这里暂且称它为进程。

那一个进程从创建（fork）到退出（exit），这个过程中的状态转化还是很简单的。

下面这个图是 《Linux Kernel Development》这本书里的 Linux 进程状态转化图。

我们从这张图中可以看出来，在进程“活着”的时候就只有两个状态：运行态（TASK_RUNNING）和睡眠态（TASK_INTERRUPTIBLE，TASK_UNINTERRUPTIBLE）。

![7][7]

那运行态和睡眠态这两种状态分别是什么意思呢？

运行态的意思是，无论进程是正在运行中（也就是获得了 CPU 资源），还是进程在 run queue 队列里随时可以运行，都处于这个状态。

我们想要查看进程是不是处于运行态，其实也很简单，比如使用 ps 命令，可以看到处于这个状态的进程显示的是 R stat。

睡眠态是指，进程需要等待某个资源而进入的状态，要等待的资源可以是一个信号量（Semaphore）, 或者是磁盘 I/O，这个状态的进程会被放入到 wait queue 队列里。

这个睡眠态具体还包括两个子状态：一个是可以被打断的（TASK_INTERRUPTIBLE），我们用 ps 查看到的进程，显示为 S stat。还有一个是不可被打断的（TASK_UNINTERRUPTIBLE），用 ps 查看进程，就显示为 D stat。

这两个子状态，我们在后面碰到新的问题时，会再做详细介绍，这里你只要知道这些就行了。

除了上面进程在活的时候的两个状态，进程在调用 do_exit() 退出的时候，还有两个状态。

一个是 EXIT_DEAD，也就是进程在真正结束退出的那一瞬间的状态；第二个是 **EXIT_ZOMBIE 状态，这是进程在 EXIT_DEAD 前的一个状态，而我们今天讨论的僵尸进程，也就是处于这个状态中。**

### 限制容器中进程数目

理解了 Linux 进程状态之后，我们还需要知道，在 Linux 系统中怎么限制进程数目。因为弄清楚这个问题，我们才能更深入地去理解僵尸进程的危害。

一台 Linux 机器上的进程总数目是有限制的。如果超过这个最大值，那么系统就无法创建出新的进程了，比如你想 SSH 登录到这台机器上就不行了。

这个最大值可以我们在 /proc/sys/kernel/pid_max 这个参数中看到。

Linux 内核在初始化系统的时候，会根据机器 CPU 的数目来设置 pid_max 的值。

比如说，如果机器中 CPU 数目小于等于 32，那么 pid_max 就会被设置为 32768（32K）；如果机器中的 CPU 数目大于 32，那么 pid_max 就被设置为 N*1204 （N 就是 CPU 数目）。

对于 Linux 系统而言，容器就是一组进程的集合。如果容器中的应用创建过多的进程或者出现 bug，就会产生类似 fork bomb 的行为。

这个 fork bomb 就是指在计算机中，通过不断建立新进程来消耗系统中的进程资源，它是一种黑客攻击方式。这样，容器中的进程数就会把整个节点的可用进程总数给消耗完。

这样，不但会使同一个节点上的其他容器无法工作，还会让宿主机本身也无法工作。所以对于每个容器来说，我们都需要限制它的最大进程数目，而这个功能由 pids Cgroup 这个子系统来完成。

而这个功能的实现方法是这样的：pids Cgroup 通过 Cgroup 文件系统的方式向用户提供操作接口，一般它的 Cgroup 文件系统挂载点在 /sys/fs/cgroup/pids。

在一个容器建立之后，创建容器的服务会在 /sys/fs/cgroup/pids 下建立一个子目录，就是一个控制组，控制组里**最关键的一个文件就是 pids.max**。我们可以向这个文件写入数值，而这个值就是这个容器中允许的最大进程数目。

我们对这个值做好限制，容器就不会因为创建出过多进程而影响到其他容器和宿主机了。思路讲完了，接下来我们就实际上手试一试。

下面是对一个 Docker 容器的 pids Cgroup 的操作，你可以跟着操作一下。

```bash
$ pwd
/sys/fs/cgroup/pids
$ df ./
Filesystem     1K-blocks  Used Available Use% Mounted on
cgroup                 0     0         0    - /sys/fs/cgroup/pids
$ docker ps
CONTAINER ID        IMAGE                      COMMAND                  CREATED             STATUS              PORTS               NAMES
7ecd3aa7fdc1        registry/zombie-proc:v1   "/app-test 1000"         37 hours ago        Up 37 hours                             frosty_yalow
$ pwd
/sys/fs/cgroup/pids/system.slice/docker-7ecd3aa7fdc15a1e183813b1899d5d939beafb11833ad6c8b0432536e5b9871c.scope
$ ls
cgroup.clone_children  cgroup.procs  notify_on_release  pids.current  pids.events  pids.max  tasks
$ echo 1002 > pids.max
$ cat pids.max
1002
```

### 解决问题

刚才我给你解释了两个基本概念，进程状态和进程数目限制，那我们现在就可以解决容器中的僵尸进程问题了。

在前面 Linux 进程状态的介绍里，我们知道了，僵尸进程是 Linux 进程退出状态的一种。

从内核进程的 do_exit() 函数我们也可以看到，这时候进程 task_struct 里的 mm/shm/sem/files 等文件资源都已经释放了，只留下了一个 stask_struct instance 空壳。

就像下面这段代码显示的一样，从进程对应的 /proc/<pid> 文件目录下，我们也可以看出来，对应的资源都已经没有了。

```bash
$ cat /proc/6/cmdline
$ cat /proc/6/smaps
$ cat /proc/6/maps
$ ls /proc/6/fd
```

并且，这个进程也已经不响应任何的信号了，无论 SIGTERM(15) 还是 SIGKILL(9)。例如上面 pid 6 的僵尸进程，这两个信号都已经被响应了。

```bash
$ kill -15 6
$ kill -9 6
$ ps -ef | grep 6
root         6     1  0 13:59 ?        00:00:00 [app-test] <defunct>
```

当多个容器运行在同一个宿主机上的时候，为了避免一个容器消耗完我们整个宿主机进程号资源，我们会配置 pids Cgroup 来限制每个容器的最大进程数目。也就是说，进程数目在每个容器中也是有限的，是一种很宝贵的资源。

既然进程号资源在宿主机上是有限的，显然残留的僵尸进程多了以后，给系统带来最大问题就是它占用了进程号。**这就意味着，残留的僵尸进程，在容器里仍然占据着进程号资源，很有可能会导致新的进程不能运转。**

这里我再次借用开头的那个例子，也就是一个产生了 1000 个僵尸进程的容器，带你理解一下这个例子中进程数的上限。我们可以看一下，1 个 init 进程 +1000 个僵尸进程 +1 个 bash 进程 ，总共就是 1002 个进程。

如果 pids Cgroup 也限制了这个容器的最大进程号的数量，限制为 1002 的话，我们在 pids Cgroup 里可以看到，pids.current == pids.max，也就是已经达到了容器进程号数的上限。

这时候，如果我们在容器里想再启动一个进程，例如运行一下 ls 命令，就会看到 Resource temporarily unavailable 的错误消息。已经退出的无用进程，却阻碍了有用进程的启动，显然这样是不合理的。

具体代码如下：

```bash
### On host
# docker ps
CONTAINER ID        IMAGE                      COMMAND             CREATED             STATUS              PORTS               NAMES
09e6e8e16346        registry/zombie-proc:v1   "/app-test 1000"    29 minutes ago      Up 29 minutes                           peaceful_ritchie
# pwd
/sys/fs/cgroup/pids/system.slice/docker-09e6e8e1634612580a03dd3496d2efed2cf2a510b9688160b414ce1d1ea3e4ae.scope
# cat pids.max
1002
# cat pids.current
1002
### On Container
[root@09e6e8e16346 /]# ls
bash: fork: retry: Resource temporarily unavailable
bash: fork: retry: Resource temporarily unavailable
```

所以，接下来我们还要看看这些僵尸进程到底是怎么产生的。因为只有理解它的产生机制，我们才能想明白怎么避免僵尸进程的出现。

我们先看一下刚才模拟僵尸进程的那段小程序。这段程序里，父进程在创建完子进程之后就不管了，这就是造成子进程变成僵尸进程的原因。

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
 
int main(int argc, char *argv[])
{
       int i;
       int total;
       if (argc < 2) {
              total = 1;
       } else {
              total = atoi(argv[1]);
       }
       printf("To create %d processes\n", total);
       for (i = 0; i < total; i++) {
              pid_t pid = fork();
 
              if (pid == 0) {
                      printf("Child => PPID: %d PID: %d\n", getppid(),
                             getpid());
                      sleep(60);
                      printf("Child process exits\n");
                      exit(EXIT_SUCCESS);
              } else if (pid > 0) {
                      printf("Parent created child %d\n", i);
              } else {
                      printf("Unable to create child process. %d\n", i);
                      break;
              }
       }
       printf("Paraent is sleeping\n");
       while (1) {
              sleep(100);
       }
       return EXIT_SUCCESS;
}
```

前面我们通过分析，发现子进程变成僵尸进程的原因在于父进程“不负责”，那找到原因后，我们再想想，如何来解决。

其实解决思路很好理解，就好像熊孩子犯了事儿，你要去找他家长来管教，那子进程在容器里“赖着不走”，我们就需要让父进程出面处理了。

所以，在 Linux 中的进程退出之后，如果进入僵尸状态，我们就需要父进程调用 wait() 这个系统调用，去回收僵尸进程的最后的那些系统资源，比如进程号资源。

那么，我们在刚才那段代码里，主进程进入 sleep(100) 之前，加上一段 wait() 函数调用，就不会出现僵尸进程的残留了。

```c
for (i = 0; i < total; i++) {
            int status;
            wait(&status);
      }
```

而容器中所有进程的最终父进程，就是我们所说的 init 进程，由它负责生成容器中的所有其他进程。因此，容器的 init 进程有责任回收容器中的所有僵尸进程。

前面我们知道了 wait() 系统调用可以回收僵尸进程，但是 wait() 系统调用有一个问题，需要你注意。

wait() 系统调用是一个阻塞的调用，也就是说，如果没有子进程是僵尸进程的话，这个调用就一直不会返回，那么整个进程就会被阻塞住，而不能去做别的事了。

不过这也没有关系，我们还有另一个方法处理。Linux 还提供了一个类似的系统调用 waitpid()，这个调用的参数更多。

其中就有一个参数 WNOHANG，它的含义就是，如果在调用的时候没有僵尸进程，那么函数就马上返回了，而不会像 wait() 调用那样一直等待在那里。

比如社区的一个容器 init 项目 tini。在这个例子中，它的主进程里，就是不断在调用带 WNOHANG 参数的 waitpid()，通过这个方式清理容器中所有的僵尸进程。

```c
int reap_zombies(const pid_t child_pid, int* const child_exitcode_ptr) {
        pid_t current_pid;
        int current_status;
        while (1) {
                current_pid = waitpid(-1, &current_status, WNOHANG);
                switch (current_pid) {
                        case -1:
                                if (errno == ECHILD) {
                                        PRINT_TRACE("No child to wait");
                                        break;
                                }
…
```

<!--
### 重点总结

今天我们讨论的问题是容器中的僵尸进程。

首先，我们先用代码来模拟了这个情况，还原了在一个容器中大量的僵尸进程是如何产生的。为了理解它的产生原理和危害，我们先要掌握两个知识点：

Linux 进程状态中，僵尸进程处于 EXIT_ZOMBIE 这个状态；

容器需要对最大进程数做限制。具体方法是这样的，我们可以向 Cgroup 中 **pids.max** 这个文件写入数值（这个值就是这个容器中允许的最大进程数目）。

掌握了基本概念之后，我们找到了僵尸进程的产生原因。父进程在创建完子进程之后就不管了。

所以，我们需要父进程调用 wait() 或者 waitpid() 系统调用来避免僵尸进程产生。

关于本节内容，你只要记住下面三个主要的知识点就可以了：

1. 每一个 Linux 进程在退出的时候都会进入一个僵尸状态（EXIT_ZOMBIE）；
2. 僵尸进程如果不清理，就会消耗系统中的进程数资源，最坏的情况是导致新的进程无法启动；
3. 僵尸进程一定需要父进程调用 wait() 或者 waitpid() 系统调用来清理，这也是容器中 init 进程必须具备的一个功能。

-->

## 理解进程（3）：为什么我在容器中的进程被强制杀死了？

我先给你说说，为什么进程管理中做到这点很重要。在实际生产环境中，我们有不少应用在退出的时候需要做一些清理工作，比如清理一些远端的链接，或者是清除一些本地的临时数据。

这样的清理工作，可以尽可能避免远端或者本地的错误发生，比如减少丢包等问题的出现。而这些退出清理的工作，通常是在 SIGTERM 这个信号用户注册的 handler 里进行的。

但是，如果我们的进程收到了 SIGKILL，那应用程序就没机会执行这些清理工作了。这就意味着，一旦进程不能 graceful shutdown，就会增加应用的出错率。

### 场景再现

在容器平台上，你想要停止一个容器，无论是在 Kubernetes 中去删除一个 pod，或者用 Docker 停止一个容器，最后都会用到 Containerd 这个服务。

而 Containerd 在停止容器的时候，就会向容器的 init 进程发送一个 SIGTERM 信号。

我们会发现，在 init 进程退出之后，容器内的其他进程也都立刻退出了。不过不同的是，init 进程收到的是 SIGTERM 信号，而其他进程收到的是 SIGKILL 信号。

在理解进程的第一讲中，我们提到过 SIGKILL 信号是不能被捕获的（catch）的，也就是用户不能注册自己的 handler，而 SIGTERM 信号却允许用户注册自己的 handler，这样的话差别就很大了。

那么，我们就一起来看看当容器退出的时候，如何才能让容器中的进程都收到 SIGTERM 信号，而不是 SIGKILL 信号。

延续前面课程中处理问题的思路，我们同样可以运行一个简单的容器，来重现这个问题，用这里的代码执行一下 make image ，然后用 Docker 启动这个容器镜像。

Dockerfile

```Dockerfile
FROM centos:8.1.1911

COPY ./c-init-sig /
```

c-init-sig.c

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

void sig_handler(int signo)
{
	if (signo == SIGTERM) {
		printf("received SIGTERM\n");
		exit(0);
	}
}

int main(int argc, char *argv[])
{
	int i;
	int total;

	if (argc < 2) {
		total = 1;
	} else {
		total = atoi(argv[1]);
	}

	signal(SIGTERM, sig_handler);

	printf("To create %d processes\n", total);

	for (i = 0; i < total; i++) {
		pid_t pid = fork();

		if (pid == 0) {
			pid_t m_pid, p_pid;
			m_pid = getpid();
			p_pid = getppid();
			printf("Child => PPID: %d PID: %d\n", p_pid, m_pid);
			while (1) {
				sleep(100);
			}
			printf("Child process eixts\n");
			exit(EXIT_SUCCESS);
		} else if (pid > 0) {
			printf("Parent created child %d\n", i);
		} else {
			printf("Unable to create child process. %d\n", i);
			break;
		}
	}

	printf("Paraent is sleeping\n");
	while (1) {
		sleep(100);
	}

	return EXIT_SUCCESS;
}
```

Makefile

```Makefile
all: c-init-sig image
c-init-sig: c-init-sig.c
	gcc -o c-init-sig c-init-sig.c

image: c-init-sig
	docker build -t registry/fwd_sig:v1 .
clean: 
	rm -f *.o c-init-sig
	docker rmi registry/fwd_sig:v1
```

```bash
docker run -d --name fwd_sig registry/fwd_sig:v1 /c-init-sig
```

你会发现，在我们用 docker stop 停止这个容器的时候，如果用 strace 工具来监控，就能看到容器里的 init 进程和另外一个进程收到的信号情况。

在下面的例子里，进程号为 15909 的就是容器里的 init 进程，而进程号为 15959 的是容器里另外一个进程。

在命令输出中我们可以看到，**init 进程（15909）收到的是 SIGTERM 信号，而另外一个进程（15959）收到的果然是 SIGKILL 信号。**

```bash
# ps -ef | grep c-init-sig
root     15857 14391  0 06:23 pts/0    00:00:00 docker run -it registry/fwd_sig:v1 /c-init-sig
root     15909 15879  0 06:23 pts/0    00:00:00 /c-init-sig
root     15959 15909  0 06:23 pts/0    00:00:00 /c-init-sig
root     16046 14607  0 06:23 pts/3    00:00:00 grep --color=auto c-init-sig
# strace -p 15909
strace: Process 15909 attached
restart_syscall(<... resuming interrupted read ...>) = ? ERESTART_RESTARTBLOCK (Interrupted by signal)
--- SIGTERM {si_signo=SIGTERM, si_code=SI_USER, si_pid=0, si_uid=0} ---
write(1, "received SIGTERM\n", 17)      = 17
exit_group(0)                           = ?
+++ exited with 0 +++
# strace -p 15959
strace: Process 15959 attached
restart_syscall(<... resuming interrupted read ...>) = ?
+++ killed by SIGKILL +++
```

### 知识详解：信号的两个系统调用

我们想要理解刚才的例子，就需要搞懂信号背后的两个系统调用，它们分别是 kill() 系统调用和 signal() 系统调用。

这里呢，我们可以结合前面讲过的信号来理解这两个系统调用。在容器 init 进程的第一讲里，我们介绍过信号的基本概念了，**信号就是 Linux 进程收到的一个通知。**

等你学完如何使用这两个系统调用之后，就会更清楚 Linux 信号是怎么一回事，遇到容器里信号相关的问题，你就能更好地理清思路了。

我还会再给你举个使用函数的例子，帮助你进一步理解进程是如何实现 graceful shutdown 的。

进程对信号的处理其实就包括两个问题，**一个是进程如何发送信号，另一个是进程收到信号后如何处理。**

我们在 Linux 中发送信号的系统调用是 kill()，之前很多例子里面我们用的命令 kill ，它内部的实现就是调用了 kill() 这个函数。

下面是 Linux Programmer’s Manual 里对 kill() 函数的定义。

这个函数有两个参数，一个是 sig，代表需要发送哪个信号，比如 sig 的值是 15 的话，就是指发送 SIGTERM；另一个参数是 pid，也就是指信号需要发送给哪个进程，比如值是 1 的话，就是指发送给进程号是 1 的进程。

```c
NAME
       kill - send signal to a process
SYNOPSIS
       #include <sys/types.h>
       #include <signal.h>
       int kill(pid_t pid, int sig);
```

我们知道了发送信号的系统调用之后，再来看另一个系统调用，也就是 signal() 系统调用这个函数，它可以给信号注册 handler。

下面是 signal() 在 Linux Programmer’s Manual 里的定义，参数 signum 也就是信号的编号，例如数值 15，就是信号 SIGTERM；参数 handler 是一个函数指针参数，用来注册用户的信号 handler。

```c
NAME
       signal - ANSI C signal handling
SYNOPSIS
       #include <signal.h>
       typedef void (*sighandler_t)(int);
       sighandler_t signal(int signum, sighandler_t handler);
```

在容器 init 进程的第一讲里，**我们学过进程对每种信号的处理，包括三个选择：调用系统缺省行为、捕获、忽略。**而这里的选择，其实就是程序中如何去调用 signal() 这个系统调用。

第一个选择就是缺省，如果我们在代码中对某个信号，比如 SIGTERM 信号，不做任何 signal() 相关的系统调用，那么在进程运行的时候，如果接收到信号 SIGTERM，进程就会执行内核中 SIGTERM 信号的缺省代码。

对于 SIGTERM 这个信号来说，它的缺省行为就是进程退出（terminate）。

内核中对不同的信号有不同的缺省行为，一般会采用退出（terminate），暂停（stop），忽略（ignore）这三种行为中的一种。

那第二个选择捕获又是什么意思呢?

捕获指的就是我们在代码中为某个信号，调用 signal() 注册自己的 handler。这样进程在运行的时候，一旦接收到信号，就不会再去执行内核中的缺省代码，而是会执行通过 signal() 注册的 handler。

比如下面这段代码，我们为 SIGTERM 这个信号注册了一个 handler，在 handler 里只是做了一个打印操作。

那么这个程序在运行的时候，如果收到 SIGTERM 信号，它就不会退出了，而是只在屏幕上显示出"received SIGTERM"。

```c
void sig_handler(int signo)
{
  if (signo == SIGTERM) {
          printf("received SIGTERM\n");
  }
}
int main(int argc, char *argv[])
{
...
  signal(SIGTERM, sig_handler);
...
}
```

我们再来看看第三个选择，如果要让进程“忽略”一个信号，我们就要通过 signal() 这个系统调用，为这个信号注册一个特殊的 handler，也就是 SIG_IGN 。

比如下面的这段代码，就是为 SIGTERM 这个信号注册SIG_IGN。

这样操作的效果，就是在程序运行的时候，如果收到 SIGTERM 信号，程序既不会退出，也不会在屏幕上输出 log，而是什么反应也没有，就像完全没有收到这个信号一样。

```c
int main(int argc, char *argv[])
{
...
  signal(SIGTERM, SIG_IGN);
...
}
```  

好了，我们通过讲解 signal() 这个系统调用，帮助你回顾了信号处理的三个选择：缺省行为、捕获和忽略。

这里我还想要提醒你一点， **SIGKILL 和 SIGSTOP 信号是两个特权信号，它们不可以被捕获和忽略，这个特点也反映在 signal() 调用上。**

我们可以运行下面的这段代码，如果我们用 signal() 为 SIGKILL 注册 handler，那么它就会返回 SIG_ERR，不允许我们做捕获操作。

Makefile

```Makefile
all: basic-sig reg-sigkill

basic-sig: basic-sig.c
	gcc -o basic-sig basic-sig.c

reg-sigkill: reg-sigkill.c
	gcc -o reg-sigkill reg-sigkill.c

clean:
	rm -f *.o basic-sig reg-sigkill
```

```bash
# cat reg_sigkill.c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <signal.h>
typedef void (*sighandler_t)(int);
void sig_handler(int signo)
{
            if (signo == SIGKILL) {
                        printf("received SIGKILL\n");
                        exit(0);
            }
}
 
int main(int argc, char *argv[])
{
            sighandler_t h_ret;
            h_ret = signal(SIGKILL, sig_handler);
            if (h_ret == SIG_ERR) {
                        perror("SIG_ERR");
            }
            return 0;
}
# ./reg_sigkill
SIG_ERR: Invalid argument
```

最后，我用下面这段代码来做个小结。

这段代码里，我们用 signal() 对 SIGTERM 这个信号做了忽略，捕获以及恢复它的缺省行为，并且每一次都用 kill() 系统调用向进程自己发送 SIGTERM 信号，这样做可以确认进程对 SIGTERM 信号的选择。

basic-sig.c

```c
#include <stdio.h>
#include <signal.h>
typedef void (*sighandler_t)(int);
void sig_handler(int signo)
{
        if (signo == SIGTERM) {
                printf("received SIGTERM\n\n");
                // Set SIGTERM handler to default
                signal(SIGTERM, SIG_DFL);
        }
}
int main(int argc, char *argv[])
{
        //Ignore SIGTERM, and send SIGTERM
        // to process itself.
        signal(SIGTERM, SIG_IGN);
        printf("Ignore SIGTERM\n\n");
        kill(0, SIGTERM);
        //Catch SIGERM, and send SIGTERM
        // to process itself.
        signal(SIGTERM, sig_handler);
        printf("Catch SIGTERM\n");
        kill(0, SIGTERM);
 
        //Default SIGTERM. In sig_handler, it sets
        //SIGTERM handler back to default one.
        printf("Default SIGTERM\n");
        kill(0, SIGTERM);
        return 0;
}
```

我们一起来总结一下刚才讲的两个系统调用：

先说说 kill() 这个系统调用，它其实很简单，输入两个参数：进程号和信号，就把特定的信号发送给指定的进程了。

再说说 signal() 这个调用，它决定了进程收到特定的信号如何来处理，SIG_DFL 参数把对应信号恢复为缺省 handler，也可以用自定义的函数作为 handler，或者用 SIG_IGN 参数让进程忽略信号。

对于 SIGKILL 信号，如果调用 signal() 函数，为它注册自定义的 handler，系统就会拒绝。

### 解决问题

我们在学习了 kill() 和 signal() 这个两个信号相关的系统调用之后，再回到这一讲最初的问题上，为什么在停止一个容器的时候，容器 init 进程收到的 SIGTERM 信号，而容器中其他进程却会收到 SIGKILL 信号呢？

当 Linux 进程收到 SIGTERM 信号并且使进程退出，这时 Linux 内核对处理进程退出的入口点就是 do_exit() 函数，do_exit() 函数中会释放进程的相关资源，比如内存，文件句柄，信号量等等。

Linux 内核对处理进程退出的入口点就是 do_exit() 函数，do_exit() 函数中会释放进程的相关资源，比如内存，文件句柄，信号量等等。

在做完这些工作之后，它会调用一个 exit_notify() 函数，用来通知和这个进程相关的父子进程等。

对于容器来说，还要考虑 Pid Namespace 里的其他进程。这里调用的就是 zap_pid_ns_processes() 这个函数，而在这个函数中，如果是处于退出状态的 init 进程，它会向 Namespace 中的其他进程都发送一个 SIGKILL 信号。

整个流程如下图所示。

![8][8]

你还可以看一下，内核代码是这样的。

```c
 /*
         * The last thread in the cgroup-init thread group is terminating.
         * Find remaining pid_ts in the namespace, signal and wait for them
         * to exit.
         *
         * Note:  This signals each threads in the namespace - even those that
         *        belong to the same thread group, To avoid this, we would have
         *        to walk the entire tasklist looking a processes in this
         *        namespace, but that could be unnecessarily expensive if the
         *        pid namespace has just a few processes. Or we need to
         *        maintain a tasklist for each pid namespace.
         *
         */
        rcu_read_lock();
        read_lock(&tasklist_lock);
        nr = 2;
        idr_for_each_entry_continue(&pid_ns->idr, pid, nr) {
                task = pid_task(pid, PIDTYPE_PID);
                if (task && !__fatal_signal_pending(task))
                        group_send_sig_info(SIGKILL, SEND_SIG_PRIV, task, PIDTYPE_MAX);
        }
```

说到这里，我们也就明白为什么容器 init 进程收到的 SIGTERM 信号，而容器中其他进程却会收到 SIGKILL 信号了。

前面我讲过，SIGKILL 是个特权信号（特权信号是 Linux 为 kernel 和超级用户去删除任意进程所保留的，不能被忽略也不能被捕获）。

所以进程收到这个信号后，就立刻退出了，没有机会调用一些释放资源的 handler 之后，再做退出动作。

而 SIGTERM 是可以被捕获的，用户是可以注册自己的 handler 的。因此，容器中的程序在 stop container 的时候，我们更希望进程收到 SIGTERM 信号而不是 SIGKILL 信号。

那在容器被停止的时候，我们该怎么做，才能让容器中的进程收到 SIGTERM 信号呢？

你可能已经想到了，就是让容器 init 进程来转发 SIGTERM 信号。的确是这样，比如 Docker Container 里使用的 tini 作为 init 进程，tini 的代码中就会调用 sigtimedwait() 这个函数来查看自己收到的信号，然后调用 kill() 把信号发给子进程。

我给你举个具体的例子说明，从下面的这段代码中，我们可以看到除了 SIGCHLD 这个信号外，tini 会把其他所有的信号都转发给它的子进程。

```c
int wait_and_forward_signal(sigset_t const* const parent_sigset_ptr, pid_t const child_pid) {
        siginfo_t sig;
        if (sigtimedwait(parent_sigset_ptr, &sig, &ts) == -1) {
                switch (errno) {
…
                }
        } else {
                /* There is a signal to handle here */
                switch (sig.si_signo) {
                        case SIGCHLD:
                                /* Special-cased, as we don't forward SIGCHLD. Instead, we'll
                                 * fallthrough to reaping processes.
                                 */
                                PRINT_DEBUG("Received SIGCHLD");
                                break;
                        default:
                                PRINT_DEBUG("Passing signal: '%s'", strsignal(sig.si_signo));
                                /* Forward anything else */
                                if (kill(kill_process_group ? -child_pid : child_pid, sig.si_signo)) {
                                        if (errno == ESRCH) {
                                                PRINT_WARNING("Child was dead when forwarding signal");
                                        } else {
                                                PRINT_FATAL("Unexpected error when forwarding signal: '%s'", strerror(errno));
                                                return 1;
                                        }
                                }
                                break;
                }
        }
        return 0;
}
```

那么我们在这里明确一下，怎么解决停止容器的时候，容器内应用程序被强制杀死的问题呢？

**解决的方法就是在容器的 init 进程中对收到的信号做个转发，发送到容器中的其他子进程，这样容器中的所有进程在停止时，都会收到 SIGTERM，而不是 SIGKILL 信号了。**

<!--

### 重点小结

这一讲我们要解决的问题是让容器中的进程，在容器停止的时候，有机会 graceful shutdown，而不是收到 SIGKILL 信号而被强制杀死。

首先我们通过对 kill() 和 signal() 这个两个系统调用的学习，进一步理解了进程是怎样处理 Linux 信号的，重点是信号在接收处理的三个选择：**忽略，捕获和缺省行为**。

通过代码例子，我们知道 SIGTERM 是可以被忽略和捕获的，但是 SIGKILL 是不可以被忽略和捕获的。

了解这一点以后，我们就找到了问题的解决方向，也就是我们需要在停止容器时，让容器中的应用收到 SIGTERM，而不是 SIGKILL。

具体怎么操作呢？我们可以在容器的 init 进程中对收到的信号做个转发，发送到容器中的其他子进程。这样一来，容器中的所有进程在停止容器时，都会收到 SIGTERM，而不是 SIGKILL 信号了。

我认为，解决 init 进程信号的这类问题其实并不难。

我们只需要先梳理一下和这个问题相关的几个知识点，再写个小程序，让它跑在容器里，稍微做几个试验。然后，我们再看一下内核和 Docker 的源代码，就可以很快得出结论了。

-->

## 参考

- 《由浅入深吃透 Docker》
- 《容器实战高手课》
- http://www.docker.com
- https://www.docker-cn.com
- https://docs.docker.com/compose/compose-file/compose-file-v3/
- https://docs.docker.com/compose/reference/

[1]: /images/docker/docker-04/1.jpg
[2]: /images/docker/docker-04/2.jpg
[3]: /images/docker/docker-04/3.jpg
[4]: /images/docker/docker-04/4.jpg
[5]: /images/docker/docker-04/5.jpg
[6]: /images/docker/docker-04/6.jpg
[7]: /images/docker/docker-04/7.jpg
[8]: /images/docker/docker-04/8.jpg