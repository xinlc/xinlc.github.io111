---
title: 重学 Docker 之 底层实现原理及关键技术
date: 2021-03-21 10:00:00
categories: Docker
tags:
  - docker
---

资源隔离（Namespace）、资源限制（Cgroups）、数据驱动（Overlay2）。

<!--more-->

## 资源隔离：为什么构建容器需要 Namespace ？

### 什么是 Namespace？

下面是 Namespace 的维基百科定义：

> Namespace 是 Linux 内核的一项功能，该功能对内核资源进行分区，以使一组进程看到一组资源，而另一组进程看到另一组资源。Namespace 的工作方式通过为一组资源和进程设置相同的 Namespace 而起作用，但是这些 Namespace 引用了不同的资源。资源可能存在于多个 Namespace 中。这些资源可以是进程 ID、主机名、用户 ID、文件名、与网络访问相关的名称和进程间通信。

简单来说，Namespace 是 Linux 内核的一个特性，该特性可以实现在同一主机系统中，对进程 ID、主机名、用户 ID、文件名、网络和进程间通信等资源的隔离。Docker 利用 Linux 内核的 Namespace 特性，实现了每个容器的资源相互隔离，从而保证容器内部只能访问到自己 Namespace 的资源。

最新的 Linux 5.6 内核中提供了 8 种类型的 Namespace：

| Namespace 名称                   | 作用                                      | 内核版本 |
| -------------------------------- | ----------------------------------------- | -------- |
| Mount（mnt）                     | 隔离挂载点                                | 2.4.19   |
| Process ID (pid)                 | 隔离进程 ID                               | 2.6.24   |
| Network (net)                    | 隔离网络设备，端口号等                    | 2.6.29   |
| Interprocess Communication (ipc) | 隔离 System V IPC 和 POSIX message queues | 2.6.19   |
| UTS Namespace(uts)               | 隔离主机名和域名                          | 2.6.19   |
| User Namespace (user)            | 隔离用户和用户组                          | 3.8      |
| Control group (cgroup) Namespace | 隔离 Cgroups 根目录                       | 4.6      |
| Time Namespace                   | 隔离系统时间                              | 5.6      |

虽然 Linux 内核提供了8种 Namespace，但是最新版本的 Docker 只使用了其中的前6 种，分别为Mount Namespace、PID Namespace、Net Namespace、IPC Namespace、UTS Namespace、User Namespace。

下面，我们详细了解下 Docker 使用的 6 种 Namespace的作用分别是什么。

### 各种 Namespace 的作用？

#### （1）Mount Namespace

Mount Namespace 是 Linux 内核实现的第一个 Namespace，从内核的 2.4.19 版本开始加入。它可以用来隔离不同的进程或进程组看到的挂载点。通俗地说，就是可以实现在不同的进程中看到不同的挂载目录。使用 Mount Namespace 可以实现容器内只能看到自己的挂载信息，在容器内的挂载操作不会影响主机的挂载目录。

下面我们通过一个实例来演示下 Mount Namespace。在演示之前，我们先来认识一个命令行工具 unshare。unshare 是 util-linux 工具包中的一个工具，CentOS 7 系统默认已经集成了该工具，**使用 unshare 命令可以实现创建并访问不同类型的 Namespace**。

首先我们使用以下命令创建一个 bash 进程并且新建一个 Mount Namespace：

```bash
$ sudo unshare --mount --fork /bin/bash
[root@centos7 centos]#
```

执行完上述命令后，这时我们已经在主机上创建了一个新的 Mount Namespace，并且当前命令行窗口加入了新创建的 Mount Namespace。下面我通过一个例子来验证下，在独立的 Mount Namespace 内创建挂载目录是不影响主机的挂载目录的。

首先在 /tmp 目录下创建一个目录。

```bash
[root@centos7 centos]# mkdir /tmp/tmpfs
```

创建好目录后使用 mount 命令挂载一个 tmpfs 类型的目录。命令如下：

```bash
[root@centos7 centos]# mount -t tmpfs -o size=20m tmpfs /tmp/tmpfs
```

然后使用 df 命令查看一下已经挂载的目录信息：

```bash
[root@centos7 centos]# df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1       500G  1.4G  499G   1% /
devtmpfs         16G     0   16G   0% /dev
tmpfs            16G     0   16G   0% /dev/shm
tmpfs            16G     0   16G   0% /sys/fs/cgroup
tmpfs            16G   57M   16G   1% /run
tmpfs           3.2G     0  3.2G   0% /run/user/1000
tmpfs            20M     0   20M   0% /tmp/tmpfs
```

可以看到 /tmp/tmpfs 目录已经被正确挂载。为了验证主机上并没有挂载此目录，我们新打开一个命令行窗口，同样执行 df 命令查看主机的挂载信息：

```bash
[centos@centos7 ~]$ df -h
Filesystem      Size  Used Avail Use% Mounted on
devtmpfs         16G     0   16G   0% /dev
tmpfs            16G     0   16G   0% /dev/shm
tmpfs            16G   57M   16G   1% /run
tmpfs            16G     0   16G   0% /sys/fs/cgroup
/dev/vda1       500G  1.4G  499G   1% /
tmpfs           3.2G     0  3.2G   0% /run/user/1000
```

通过上面输出可以看到主机上并没有挂载 /tmp/tmpfs，可见我们独立的 Mount Namespace 中执行 mount 操作并不会影响主机。

为了进一步验证我们的想法，我们继续在当前命令行窗口查看一下当前进程的 Namespace 信息，命令如下：

```bash
[root@centos7 centos]# ls -l /proc/self/ns/
total 0
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 ipc -> ipc:[4026531839]
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 mnt -> mnt:[4026532239]
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 net -> net:[4026531956]
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 pid -> pid:[4026531836]
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 user -> user:[4026531837]
lrwxrwxrwx. 1 root root 0 Sep  4 08:20 uts -> uts:[4026531838]
```

通过对比两次命令的输出结果，我们可以看到，除了 Mount Namespace 的 ID 值不一样外，其他Namespace 的 ID 值均一致。

通过以上结果我们可以得出结论，**使用 unshare 命令可以新建 Mount Namespace，并且在新建的 Mount Namespace 内 mount 是和外部完全隔离的。**

#### （2）PID Namespace

PID Namespace 的作用是用来隔离进程。在不同的 PID Namespace 中，进程可以拥有相同的 PID 号，利用 PID Namespace 可以实现每个容器的主进程为 1 号进程，而容器内的进程在主机上却拥有不同的PID。例如一个进程在主机上 PID 为 122，使用 PID Namespace 可以实现该进程在容器内看到的 PID 为 1。

下面我们通过一个实例来演示下 PID Namespace的作用。首先我们使用以下命令创建一个 bash 进程，并且新建一个 PID Namespace：

```bash
$ sudo unshare --pid --fork --mount-proc /bin/bash
[root@centos7 centos]#
```

执行完上述命令后，我们在主机上创建了一个新的 PID Namespace，并且当前命令行窗口加入了新创建的 PID Namespace。在当前的命令行窗口使用 ps aux 命令查看一下进程信息：

```bash
[root@centos7 centos]# ps aux
USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root         1  0.0  0.0 115544  2004 pts/0    S    10:57   0:00 bash
root        10  0.0  0.0 155444  1764 pts/0    R+   10:59   0:00 ps aux
```

通过上述命令输出结果可以看到当前 Namespace 下 bash 为 1 号进程，而且我们也看不到主机上的其他进程信息。

#### （3）UTS Namespace

UTS Namespace 主要是用来隔离主机名的，它允许每个 UTS Namespace 拥有一个独立的主机名。例如我们的主机名称为 docker，使用 UTS Namespace 可以实现在容器内的主机名称为 lagoudocker 或者其他任意自定义主机名。

同样我们通过一个实例来验证下 UTS Namespace 的作用，首先我们使用 unshare 命令来创建一个 UTS Namespace：

```bash
$ sudo unshare --uts --fork /bin/bash
[root@centos7 centos]#
```

创建好 UTS Namespace 后，当前命令行窗口已经处于一个独立的 UTS Namespace 中，下面我们使用 hostname 命令（hostname 可以用来查看主机名称）设置一下主机名：

```bash
root@centos7 centos]# hostname -b lagoudocker
```

然后再查看一下主机名：

```bash
[root@centos7 centos]# hostname
lagoudocker
```

通过上面命令的输出，我们可以看到当前UTS Namespace 内的主机名已经被修改为 lagoudocker。然后我们新打开一个命令行窗口，使用相同的命令查看一下主机的 hostname：

```bash
[centos@centos7 ~]$ hostname
centos7
```

可以看到主机的名称仍然为 centos7，并没有被修改。由此，可以验证 UTS Namespace 可以用来隔离主机名。

#### （4）IPC Namespace

IPC Namespace 主要是用来隔离进程间通信的。例如 PID Namespace 和 IPC Namespace 一起使用可以实现同一 IPC Namespace 内的进程彼此可以通信，不同 IPC Namespace 的进程却不能通信。

同样我们通过一个实例来验证下IPC Namespace的作用，首先我们使用 unshare 命令来创建一个 IPC Namespace：

```bash
$ sudo unshare --ipc --fork /bin/bash
[root@centos7 centos]#
```

下面我们需要借助两个命令来实现对 IPC Namespace 的验证。

- ipcs -q 命令：用来查看系统间通信队列列表。
- ipcmk -Q 命令：用来创建系统间通信队列。

我们首先使用 ipcs -q 命令查看一下当前 IPC Namespace 下的系统通信队列列表：

```bash
[centos@centos7 ~]$ ipcs -q

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
```

由上可以看到当前无任何系统通信队列，然后我们使用 ipcmk -Q 命令创建一个系统通信队列：

```bash
[root@centos7 centos]# ipcmk -Q
Message queue id: 0
```

再次使用 ipcs -q 命令查看当前 IPC Namespace 下的系统通信队列列表：

```bash
[root@centos7 centos]# ipcs -q

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
0x73682a32 0          root       644        0            0
```

可以看到我们已经成功创建了一个系统通信队列。然后我们新打开一个命令行窗口，使用ipcs -q 命令查看一下主机的系统通信队列：

```bash
[centos@centos7 ~]$ ipcs -q

------ Message Queues --------
key        msqid      owner      perms      used-bytes   messages
```

通过上面的实验，可以发现，在单独的 IPC Namespace 内创建的系统通信队列在主机上无法看到。即 IPC Namespace 实现了系统通信队列的隔离。

#### （5）User Namespace

User Namespace 主要是用来隔离用户和用户组的。一个比较典型的应用场景就是在主机上以非 root 用户运行的进程可以在一个单独的 User Namespace 中映射成 root 用户。使用 User Namespace 可以实现进程在容器内拥有 root 权限，而在主机上却只是普通用户。

User Namesapce 的创建是可以不使用 root 权限的。下面我们以普通用户的身份创建一个 User Namespace，命令如下：

```bash
[centos@centos7 ~]$ unshare --user -r /bin/bash
[root@centos7 ~]#
```

> CentOS7 默认允许创建的 User Namespace 为 0，如果执行上述命令失败（ unshare 命令返回的错误为 unshare: unshare failed: Invalid argument ），需要使用以下命令修改系统允许创建的 User Namespace 数量，命令为：echo 65535 > /proc/sys/user/max_user_namespaces，然后再次尝试创建 User Namespace。

然后执行 id 命令查看一下当前的用户信息：

```bash
[root@centos7 ~]# id
uid=0(root) gid=0(root) groups=0(root),65534(nfsnobody) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
```

通过上面的输出可以看到我们在新的 User Namespace 内已经是 root 用户了。下面我们使用只有主机 root 用户才可以执行的 reboot 命令来验证一下，在当前命令行窗口执行 reboot 命令：

```bash
[root@centos7 ~]# reboot
Failed to open /dev/initctl: Permission denied
Failed to talk to init daemon.
```

可以看到，我们在新创建的 User Namespace 内虽然是 root 用户，但是并没有权限执行 reboot 命令。这说明在隔离的 User Namespace 中，并不能获取到主机的 root 权限，也就是说 User Namespace 实现了用户和用户组的隔离。

#### （6）Net Namespace

Net Namespace 是用来隔离网络设备、IP 地址和端口等信息的。Net Namespace 可以让每个进程拥有自己独立的 IP 地址，端口和网卡信息。例如主机 IP 地址为 172.16.4.1 ，容器内可以设置独立的 IP 地址为 192.168.1.1。

同样用实例验证，我们首先使用 ip a 命令查看一下主机上的网络信息：

```bash
$ ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 02:11:b0:14:01:0c brd ff:ff:ff:ff:ff:ff
    inet 172.20.1.11/24 brd 172.20.1.255 scope global dynamic eth0
       valid_lft 86063337sec preferred_lft 86063337sec
    inet6 fe80::11:b0ff:fe14:10c/64 scope link
       valid_lft forever preferred_lft forever
3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN group default
    link/ether 02:42:82:8d:a0:df brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.1/16 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 fe80::42:82ff:fe8d:a0df/64 scope link
       valid_lft forever preferred_lft forever
```

然后我们使用以下命令创建一个 Net Namespace：

```bash
$ sudo unshare --net --fork /bin/bash
[root@centos7 centos]#
```

同样的我们使用 ip a 命令查看一下网络信息：

```bash
[root@centos7 centos]# ip a
1: lo: <LOOPBACK> mtu 65536 qdisc noop state DOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
```

可以看到，宿主机上有 lo、eth0、docker0 等网络设备，而我们新建的 Net Namespace 内则与主机上的网络设备不同。

### 为什么 Docker 需要 Namespace？

Linux 内核从 2002 年 2.4.19 版本开始加入了 Mount Namespace，而直到内核 3.8 版本加入了 User Namespace 才为容器提供了足够的支持功能。

当 Docker 新建一个容器时， 它会创建这六种 Namespace，然后将容器中的进程加入这些 Namespace 之中，使得 Docker 容器中的进程只能看到当前 Namespace 中的系统资源。

正是由于 Docker 使用了 Linux 的这些 Namespace 技术，才实现了 Docker 容器的隔离，可以说没有 Namespace，就没有 Docker 容器。

## 资源限制：如何通过 Cgroups 机制实现资源限制？

我们知道使用不同的 Namespace，可以实现容器中的进程看不到别的容器的资源，但是有一个问题你是否注意到？容器内的进程仍然可以任意地使用主机的 CPU 、内存等资源，如果某一个容器使用的主机资源过多，可能导致主机的资源竞争，进而影响业务。那如果我们想限制一个容器资源的使用（如 CPU、内存等）应该如何做呢？

这里就需要用到 Linux 内核的另一个核心技术cgroups。

### cgroups

cgroups（全称：control groups）是 Linux 内核的一个功能，它可以实现限制进程或者进程组的资源（如 CPU、内存、磁盘 IO 等）。

> 在 2006 年，Google 的工程师（ Rohit Seth 和 Paul Menage 为主要发起人） 发起了这个项目，起初项目名称并不是cgroups，而被称为进程容器（process containers）。在 2007 年cgroups代码计划合入Linux 内核，但是当时在 Linux 内核中，容器（container）这个词被广泛使用，并且拥有不同的含义。为了避免命名混乱和歧义，进程容器被重名为cgroups，并在 2008 年成功合入 Linux 2.6.24 版本中。cgroups目前已经成为 systemd、Docker、Linux Containers（LXC） 等技术的基础。

#### cgroups 功能及核心概念

cgroups 主要提供了如下功能。

- 资源限制： 限制资源的使用量，例如我们可以通过限制某个业务的内存上限，从而保护主机其他业务的安全运行。
- 优先级控制：不同的组可以有不同的资源（ CPU 、磁盘 IO 等）使用优先级。
- 审计：计算控制组的资源使用情况。
- 控制：控制进程的挂起或恢复。

了解了 cgroups 可以为我们提供什么功能，下面我来看下 cgroups 是如何实现这些功能的。

cgroups功能的实现依赖于三个核心概念：子系统、控制组、层级树。

- 子系统（subsystem）：是一个内核的组件，一个子系统代表一类资源调度控制器。例如内存子系统可以限制内存的使用量，CPU 子系统可以限制 CPU 的使用时间。
- 控制组（cgroup）：表示一组进程和一组带有参数的子系统的关联关系。例如，一个进程使用了 CPU 子系统来限制 CPU 的使用时间，则这个进程和 CPU 子系统的关联关系称为控制组。
- 层级树（hierarchy）：是由一系列的控制组按照树状结构排列组成的。这种排列方式可以使得控制组拥有父子关系，子控制组默认拥有父控制组的属性，也就是子控制组会继承于父控制组。比如，系统中定义了一个控制组 c1，限制了 CPU 可以使用 1 核，然后另外一个控制组 c2 想实现既限制 CPU 使用 1 核，同时限制内存使用 2G，那么 c2 就可以直接继承 c1，无须重复定义 CPU 限制。

cgroups 的三个核心概念中，子系统是最核心的概念，因为子系统是真正实现某类资源的限制的基础。

### cgroups 子系统实例

下面我通过一个实例演示一下在 Linux 上默认都启动了哪些子系统。

我们先通过 mount 命令查看一下当前系统已经挂载的cgroups信息：

```bash
$ sudo mount -t cgroup
cgroup on /sys/fs/cgroup/systemd type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,xattr,release_agent=/usr/lib/systemd/systemd-cgroups-agent,name=systemd)
cgroup on /sys/fs/cgroup/net_cls,net_prio type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,net_prio,net_cls)
cgroup on /sys/fs/cgroup/blkio type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,blkio)
cgroup on /sys/fs/cgroup/pids type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,pids)
cgroup on /sys/fs/cgroup/cpu,cpuacct type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,cpuacct,cpu)
cgroup on /sys/fs/cgroup/perf_event type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,perf_event)
cgroup on /sys/fs/cgroup/freezer type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,freezer)
cgroup on /sys/fs/cgroup/devices type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,devices)
cgroup on /sys/fs/cgroup/memory type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,memory)
cgroup on /sys/fs/cgroup/cpuset type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,cpuset)
cgroup on /sys/fs/cgroup/hugetlb type cgroup (rw,nosuid,nodev,noexec,relatime,seclabel,hugetlb)
```

> 操作系统版本为 CentOS7.8，内核为 3.10.0-1127.el7.x86_64 版本，不同内核版本cgroups子系统和使用方式可能略有差异。

通过输出，可以看到当前系统已经挂载了我们常用的cgroups子系统，例如 cpu、memory、pids 等我们常用的cgroups子系统。这些子系统中，cpu 和 memory 子系统是容器环境中使用最多的子系统，下面我对这两个子系统做详细介绍。

#### cpu 子系统

我首先以 cpu 子系统为例，演示一下cgroups如何限制进程的 cpu 使用时间。由于cgroups的操作很多需要用到 root 权限，我们在执行命令前要确保已经切换到了 root 用户，以下命令的执行默认都是使用 root 用户。

**第一步：在 cpu 子系统下创建 cgroup**

cgroups的创建很简单，只需要在相应的子系统下创建目录即可。下面我们到 cpu 子系统下创建测试文件夹：

```bash
# mkdir /sys/fs/cgroup/cpu/mydocker
```

执行完上述命令后，我们查看一下我们新创建的目录下发生了什么？

```bash
# ls -l /sys/fs/cgroup/cpu/mydocker
total 0
-rw-r--r--. 1 root root 0 Sep  5 09:19 cgroup.clone_children
--w--w--w-. 1 root root 0 Sep  5 09:19 cgroup.event_control
-rw-r--r--. 1 root root 0 Sep  5 09:19 cgroup.procs
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpu.cfs_period_us
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpu.cfs_quota_us
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpu.rt_period_us
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpu.rt_runtime_us
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpu.shares
-r--r--r--. 1 root root 0 Sep  5 09:19 cpu.stat
-r--r--r--. 1 root root 0 Sep  5 09:19 cpuacct.stat
-rw-r--r--. 1 root root 0 Sep  5 09:19 cpuacct.usage
-r--r--r--. 1 root root 0 Sep  5 09:19 cpuacct.usage_percpu
-rw-r--r--. 1 root root 0 Sep  5 09:19 notify_on_release
-rw-r--r--. 1 root root 0 Sep  5 09:19 tasks
```

由上可以看到我们新建的目录下被自动创建了很多文件，其中 cpu.cfs_quota_us 文件代表在某一个阶段限制的 CPU 时间总量，单位为微秒。例如，我们想限制某个进程最多使用 1 核 CPU，就在这个文件里写入 100000（100000 代表限制 1 个核） ，tasks 文件中写入进程的 ID 即可（如果要限制多个进程 ID，在 tasks 文件中用换行符分隔即可）。

此时，我们所需要的 cgroup 就创建好了。对，就是这么简单。

第二步：创建进程，加入 cgroup

这里为了方便演示，我先把当前运行的 shell 进程加入 cgroup，然后在当前 shell 运行 cpu 耗时任务（这里利用到了继承，子进程会继承父进程的 cgroup）。

使用以下命令将 shell 进程加入 cgroup 中：

```bash
# cd /sys/fs/cgroup/cpu/mydocker
# echo $$ > tasks  
```

查看一下 tasks 文件内容：

```bash
# cat tasks
3485
3543
```

其中第一个进程 ID 为当前 shell 的主进程，也就是说，当前 shell 主进程为 3485。

**第三步：执行 CPU 耗时任务，验证 cgroup 是否可以限制 cpu 使用时间**

下面，我们使用以下命令制造一个死循环，来提升 cpu 使用率：

```bash
# while true;do echo;done;
```

执行完上述命令后，我们新打开一个 shell 窗口，使用 top -p 命令查看当前 cpu 使用率，-p 参数后面跟进程 ID，我这里是 3485。

```bash
$ top -p 3485
top - 09:51:35 up 3 days, 22:00,  4 users,  load average: 1.59, 0.58, 0.27
Tasks:   1 total,   0 running,   1 sleeping,   0 stopped,   0 zombie
%Cpu(s):  9.7 us,  2.8 sy,  0.0 ni, 87.4 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem : 32779616 total, 31009780 free,   495988 used,  1273848 buff/cache
KiB Swap:        0 total,        0 free,        0 used. 31852336 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND
3485 root      20   0  116336   2852   1688 S  99.7  0.0   2:10.71 bash
```

通过上面输出可以看到 3485 这个进程被限制到了只能使用 100 % 的 cpu，也就是 1 个核。说明我们使用 cgroup 来限制 cpu 使用时间已经生效。此时，执行 while 循环的命令行窗口可以使用 Ctrl+c 退出循环。

为了进一步证实 cgroup 限制 cpu 的准确性，我们修改 cpu 限制时间为 0.5 核，命令如下：

```bash
# cd /sys/fs/cgroup/cpu/mydocker
# echo 50000 > cpu.cfs_quota_us
```

同样使用上面的命令来制造死循环：

```bash
# while true;do echo;done;
```

保持当前窗口，新打开一个 shell 窗口，使用 top -p 参数查看 cpu 使用率：

```bash
$ top -p 3485
top - 10:05:25 up 3 days, 22:14,  3 users,  load average: 1.02, 0.43, 0.40
Tasks:   1 total,   1 running,   0 sleeping,   0 stopped,   0 zombie
%Cpu(s):  5.0 us,  1.3 sy,  0.0 ni, 93.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem : 32779616 total, 31055676 free,   450224 used,  1273716 buff/cache
KiB Swap:        0 total,        0 free,        0 used. 31898216 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND
 3485 root      20   0  115544   2116   1664 R  50.0  0.0   0:23.39 bash
```

通过上面输出可以看到，此时 cpu 使用率已经被限制到了 50%，即 0.5 个核。

验证完 cgroup 限制 cpu，我们使用相似的方法来验证 cgroup 对内存的限制。

#### memroy 子系统

**第一步：在 memory 子系统下创建 cgroup**

```bash
# mkdir /sys/fs/cgroup/memory/mydocker
```

同样，我们查看一下新创建的目录下发生了什么？

```bash
total 0
-rw-r--r--. 1 root root 0 Sep  5 10:18 cgroup.clone_children
--w--w--w-. 1 root root 0 Sep  5 10:18 cgroup.event_control
-rw-r--r--. 1 root root 0 Sep  5 10:18 cgroup.procs
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.failcnt
--w-------. 1 root root 0 Sep  5 10:18 memory.force_empty
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.failcnt
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.limit_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.max_usage_in_bytes
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.slabinfo
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.tcp.failcnt
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.tcp.limit_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.tcp.max_usage_in_bytes
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.tcp.usage_in_bytes
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.kmem.usage_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.limit_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.max_usage_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.memsw.failcnt
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.memsw.limit_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.memsw.max_usage_in_bytes
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.memsw.usage_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.move_charge_at_immigrate
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.numa_stat
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.oom_control
----------. 1 root root 0 Sep  5 10:18 memory.pressure_level
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.soft_limit_in_bytes
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.stat
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.swappiness
-r--r--r--. 1 root root 0 Sep  5 10:18 memory.usage_in_bytes
-rw-r--r--. 1 root root 0 Sep  5 10:18 memory.use_hierarchy
-rw-r--r--. 1 root root 0 Sep  5 10:18 notify_on_release
-rw-r--r--. 1 root root 0 Sep  5 10:18 tasks
```

其中 memory.limit_in_bytes 文件代表内存使用总量，单位为 byte。

例如，这里我希望对内存使用限制为 1G，则向 memory.limit_in_bytes 文件写入 1073741824，命令如下：

```bash
# cd /sys/fs/cgroup/memory/mydocker
# echo 1073741824 > memory.limit_in_bytes
```

**第二步：创建进程，加入 cgroup**

同样把当前 shell 进程 ID 写入 tasks 文件内：

```bash
# cd /sys/fs/cgroup/memory/mydocker
# echo $$ > tasks 
```

**第三步，执行内存测试工具，申请内存**

这里我们需要借助一下工具 memtester Memtester 是一个内存压测工具，下面介绍一下如何安装它。

**第一步, 安装 gcc**

```bash
$ sudo yum install -y gcc
```

**第二步，下载安装包**

```bash
$ cd /tmp$ wget http://pyropus.ca/software/memtester/old-versions/memtester-4.2.2.tar.gz
```

**第三步，编译安装**

```bash
$ tar zxvf memtester-4.2.2.tar.gz$ cd memtester-4.2.2$ make && make install$ sudo cp memtester /bin/memtester
```

安装好 memtester 后，我们执行以下命令：

```bash
# memtester 1500M 1
memtester version 4.2.2 (64-bit)
Copyright (C) 2010 Charles Cazabon.
Licensed under the GNU General Public License version 2 (only).

pagesize is 4096
pagesizemask is 0xfffffffffffff000
want 1500MB (1572864000 bytes)
got  1500MB (1572864000 bytes), trying mlock ...Killed
```

该命令会申请 1500 M 内存，并且做内存测试。由于上面我们对当前 shell 进程内存限制为 1 G，当 memtester 使用的内存达到 1G 时，cgroup 便将 memtester 杀死。

上面最后一行的输出结果表示 memtester 想要 1500 M 内存，但是由于 cgroup 限制，达到了内存使用上限，被杀死了，与我们的预期一致。

我们可以使用以下命令，降低一下内存申请，将内存申请调整为 500M：

```bash
# memtester 500M 1
memtester version 4.2.2 (64-bit)
Copyright (C) 2010 Charles Cazabon.
Licensed under the GNU General Public License version 2 (only).

pagesize is 4096
pagesizemask is 0xfffffffffffff000
want 500MB (524288000 bytes)
got  500MB (524288000 bytes), trying mlock ...locked.
Loop 1/1:
  Stuck Address       : ok
  Random Value        : ok
  Compare XOR         : ok
  Compare SUB         : ok
  Compare MUL         : ok
  Compare DIV         : ok
  Compare OR          : ok
  Compare AND         : ok
  Sequential Increment: ok
  Solid Bits          : ok
  Block Sequential    : ok
  Checkerboard        : ok
  Bit Spread          : ok
  Bit Flip            : ok
  Walking Ones        : ok
  Walking Zeroes      : ok
  8-bit Writes        : ok
  16-bit Writes       : ok

Done.
```

这里可以看到，此时 memtester 已经成功申请到 500M 内存并且正常完成了内存测试。

到此，我们讲解了cgroups的 cpu 和 memroy 子系统，如果你想了解更多的cgroups的知识和使用，可以参考 [Red Hat 官网](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/resource_management_guide/chap-introduction_to_control_groups)。

#### 删除 cgroups

上面创建的cgroups如果不想使用了，直接删除创建的文件夹即可。

例如我想删除内存下的 mydocker 目录，使用以下命令即可：

```bash
# rmdir /sys/fs/cgroup/memory/mydocker/
```

学习了cgroups的使用方式，下面我带你了解一下 Docker 是如何使用cgroups的。

#### Docker 是如何使用cgroups的？

首先，我们使用以下命令创建一个 nginx 容器：

```bash
docker run -it -m=1g nginx
```

上述命令创建并启动了一个 nginx 容器，并且限制内存为 1G。然后我们进入cgroups内存子系统的目录，使用 ls 命令查看一下该目录下的内容：

```bash
# ls -l /sys/fs/cgroup/memory
total 0
-rw-r--r--.  1 root root 0 Sep  1 11:50 cgroup.clone_children
--w--w--w-.  1 root root 0 Sep  1 11:50 cgroup.event_control
-rw-r--r--.  1 root root 0 Sep  1 11:50 cgroup.procs
-r--r--r--.  1 root root 0 Sep  1 11:50 cgroup.sane_behavior
drwxr-xr-x.  3 root root 0 Sep  5 10:50 docker
... 省略部分输出
```

通过上面输出可以看到，该目录下有一个 docker 目录，该目录正是 Docker 在内存子系统下创建的。我们进入到 docker 目录下查看一下相关内容：

```bash
# cd /sys/fs/cgroup/memory/docker
# ls -l
total 0
drwxr-xr-x. 2 root root 0 Sep  5 10:49 cb5c5391177b44ad87636bf3840ecdda83529e51b76a6406d6742f56a2535d5e
-rw-r--r--. 1 root root 0 Sep  4 10:40 cgroup.clone_children
--w--w--w-. 1 root root 0 Sep  4 10:40 cgroup.event_control
-rw-r--r--. 1 root root 0 Sep  4 10:40 cgroup.procs
... 省略部分输出
-rw-r--r--. 1 root root 0 Sep  4 10:40 tasks
```

可以看到 docker 的目录下有一个一串随机 ID 的目录，该目录即为我们上面创建的 nginx 容器的 ID。然后我们进入该目录，查看一下该容器的 memory.limit_in_bytes 文件的内容。

```bash
# cd cb5c5391177b44ad87636bf3840ecdda83529e51b76a6406d6742f56a2535d5e
# cat memory.limit_in_bytes
1073741824
```

可以看到内存限制值正好为 1G。

事实上，Docker 创建容器时，Docker 会根据启动容器的参数，在对应的 cgroups 子系统下创建以容器 ID 为名称的目录, 然后根据容器启动时设置的资源限制参数, 修改对应的 cgroups 子系统资源限制文件, 从而达到资源限制的效果。

## 组件组成：剖析 Docker 组件作用及其底层工作原理

### Docker 的组件构成

Docker 整体架构采用 C/S（客户端 / 服务器）模式，主要由客户端和服务端两大部分组成。客户端负责发送操作指令，服务端负责接收和处理指令。客户端和服务端通信有多种方式，即可以在同一台机器上通过`UNIX`套接字通信，也可以通过网络连接远程通信。

![Docker 整体架构图][1]

从整体架构可知，Docker 组件大体分为 Docker 相关组件，containerd 相关组件和容器运行时相关组件。

### Docker 组件剖析

Docker 到底有哪些组件呢？我们可以在 Docker 安装路径下执行 ls 命令，这样可以看到以下与 Docker 有关的组件。

```bash
-rwxr-xr-x 1 root root 27941976 Dec 12  2019 containerd
-rwxr-xr-x 1 root root  4964704 Dec 12  2019 containerd-shim
-rwxr-xr-x 1 root root 15678392 Dec 12  2019 ctr
-rwxr-xr-x 1 root root 50683148 Dec 12  2019 docker
-rwxr-xr-x 1 root root   764144 Dec 12  2019 docker-init
-rwxr-xr-x 1 root root  2837280 Dec 12  2019 docker-proxy
-rwxr-xr-x 1 root root 54320560 Dec 12  2019 dockerd
-rwxr-xr-x 1 root root  7522464 Dec 12  2019 runc
```

这些组件根据工作职责可以分为以下三大类。

- Docker 相关的组件：docker、dockerd、docker-init 和 docker-proxy
- containerd 相关的组件：containerd、containerd-shim 和 ctr
- 容器运行时相关的组件：runc

### Docker 相关的组件

**（1）docker**

docker 是 Docker 客户端的一个完整实现，它是一个二进制文件，对用户可见的操作形式为 docker 命令，通过 docker 命令可以完成所有的 Docker 客户端与服务端的通信（还可以通过 REST API、SDK 等多种形式与 Docker 服务端通信）。

Docker 客户端与服务端的交互过程是：docker 组件向服务端发送请求后，服务端根据请求执行具体的动作并将结果返回给 docker，docker 解析服务端的返回结果，并将结果通过命令行标准输出展示给用户。这样一次完整的客户端服务端请求就完成了。

**（2）dockerd**

dockerd 是 Docker 服务端的后台常驻进程，用来接收客户端发送的请求，执行具体的处理任务，处理完成后将结果返回给客户端。

Docker 客户端可以通过多种方式向 dockerd 发送请求，我们常用的 Docker 客户端与 dockerd 的交互方式有三种。

- 通过 UNIX 套接字与服务端通信：配置格式为unix://socket_path，默认 dockerd 生成的 socket 文件路径为 /var/run/docker.sock，该文件只有 root 用户或者 docker 用户组的用户才可以访问，这就是为什么 Docker 刚安装完成后只有 root 用户才能使用 docker 命令的原因。
- 通过 TCP 与服务端通信：配置格式为tcp://host:port，通过这种方式可以实现客户端远程连接服务端，但是在方便的同时也带有安全隐患，因此在生产环境中如果你要使用 TCP 的方式与 Docker 服务端通信，推荐使用 TLS 认证，可以通过设置 Docker 的 TLS 相关参数，来保证数据传输的安全。
- 通过文件描述符的方式与服务端通信：配置格式为：fd://这种格式一般用于 systemd 管理的系统中。

Docker 客户端和服务端的通信形式必须保持一致，否则将无法通信，只有当 dockerd 监听了 UNIX 套接字客户端才可以使用 UNIX 套接字的方式与服务端通信，UNIX 套接字也是 Docker 默认的通信方式，如果你想要通过远程的方式访问 dockerd，可以在 dockerd 启动的时候添加 -H 参数指定监听的 HOST 和 PORT。

**（3）docker-init**

如果你熟悉 Linux 系统，你应该知道在 Linux 系统中，1 号进程是 init 进程，是所有进程的父进程。主机上的进程出现问题时，init 进程可以帮我们回收这些问题进程。同样的，在容器内部，当我们自己的业务进程没有回收子进程的能力时，在执行 docker run 启动容器时可以添加 --init 参数，此时 Docker 会使用 docker-init 作为1号进程，帮你管理容器内子进程，例如回收僵尸进程等。

下面我们通过启动一个 busybox 容器来演示下：

```bash
$ docker run -it busybox sh
/ # ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 sh
    6 root      0:00 ps aux
/ #
```

可以看到容器启动时如果没有添加 --init 参数，1 号进程就是 sh 进程。

我们使用 Crtl + D 退出当前容器，重新启动一个新的容器并添加 --init 参数，然后看下进程：

```bash
$ docker run -it --init busybox sh
/ # ps aux
PID   USER     TIME  COMMAND
    1 root      0:00 /sbin/docker-init -- sh
    6 root      0:00 sh
    7 root      0:00 ps aux
```

可以看到此时容器内的 1 号进程已经变为 /sbin/docker-init，而不再是 sh 了。

**（4）docker-proxy**

docker-proxy 主要是用来做端口映射的。当我们使用 docker run 命令启动容器时，如果使用了 -p 参数，docker-proxy 组件就会把容器内相应的端口映射到主机上来，底层是依赖于 iptables 实现的。

下面我们通过一个实例演示下。

使用以下命令启动一个 nginx 容器并把容器的 80 端口映射到主机的 8080 端口。

```bash
$ docker run --name=nginx -d -p 8080:80 nginx
```

然后通过以下命令查看一下启动的容器 IP：

```bash
$ docker inspect --format '{{ .NetworkSettings.IPAddress }}' nginx
172.17.0.2
```

可以看到，我们启动的 nginx 容器 IP 为 172.17.0.2。

此时，我们使用 ps 命令查看一下主机上是否有 docker-proxy 进程：

```bash
$ sudo ps aux |grep docker-proxy
root      9100  0.0  0.0 290772  9160 ?        Sl   07:48   0:00 /usr/bin/docker-proxy -proto tcp -host-ip 0.0.0.0 -host-port 8080 -container-ip 172.17.0.2 -container-port 80
root      9192  0.0  0.0 112784   992 pts/0    S+   07:51   0:00 grep --color=auto docker-proxy
```

可以看到当我们启动一个容器时需要端口映射时， Docker 为我们创建了一个 docker-proxy 进程，并且通过参数把我们的容器 IP 和端口传递给 docker-proxy 进程，然后 docker-proxy 通过 iptables 实现了 nat 转发。

我们通过以下命令查看一下主机上 iptables nat 表的规则：

```bash
$  sudo iptables -L -nv -t nat
Chain PREROUTING (policy ACCEPT 35 packets, 2214 bytes)
 pkts bytes target     prot opt in     out     source               destination
  398 21882 DOCKER     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ADDRTYPE match dst-type LOCAL

Chain INPUT (policy ACCEPT 35 packets, 2214 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 1 packets, 76 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 DOCKER     all  --  *      *       0.0.0.0/0           !127.0.0.0/8          ADDRTYPE match dst-type LOCAL

Chain POSTROUTING (policy ACCEPT 1 packets, 76 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0
    0     0 MASQUERADE  tcp  --  *      *       172.17.0.2           172.17.0.2           tcp dpt:80

Chain DOCKER (2 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 RETURN     all  --  docker0 *       0.0.0.0/0            0.0.0.0/0
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 to:172.17.0.2:80
```

通过最后一行规则我们可以得知，当我们访问主机的 8080 端口时，iptables 会把流量转发到 172.17.0.2 的 80 端口，从而实现了我们从主机上可以直接访问到容器内的业务。

我们通过 curl 命令访问一下 nginx 容器：

```bash
$ curl http://localhost:8080
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

通过上面的输出可以得知我们已经成功访问到了 nginx 容器。

总体来说，docker 是官方实现的标准客户端，dockerd 是 Docker 服务端的入口，负责接收客户端发送的指令并返回相应结果，而 docker-init 在业务主进程没有进程回收功能时则十分有用，docker-proxy 组件则是实现 Docker 网络访问的重要组件。

了解完 docker 相关的组件，下面我来介绍下 containerd 相关的组件。

### containerd 相关的组件

**（1）containerd**

[containerd](https://github.com/containerd/containerd) 组件是从 Docker 1.11 版本正式从 dockerd 中剥离出来的，它的诞生完全遵循 OCI 标准，是容器标准化后的产物。containerd 完全遵循了 OCI 标准，并且是完全社区化运营的，因此被容器界广泛采用。

containerd 不仅负责容器生命周期的管理，同时还负责一些其他的功能：

- 镜像的管理，例如容器运行前从镜像仓库拉取镜像到本地；
- 接收 dockerd 的请求，通过适当的参数调用 runc 启动容器；
- 管理存储相关资源；
- 管理网络相关资源。

containerd 包含一个后台常驻进程，默认的 socket 路径为 /run/containerd/containerd.sock，dockerd 通过 UNIX 套接字向 containerd 发送请求，containerd 接收到请求后负责执行相关的动作并把执行结果返回给 dockerd。

如果你不想使用 dockerd，也可以直接使用 containerd 来管理容器，由于 containerd 更加简单和轻量，生产环境中越来越多的人开始直接使用 containerd 来管理容器。

**（2）containerd-shim**

containerd-shim 的意思是垫片，类似于拧螺丝时夹在螺丝和螺母之间的垫片。containerd-shim 的主要作用是将 containerd 和真正的容器进程解耦，使用 containerd-shim 作为容器进程的父进程，从而实现重启 containerd 不影响已经启动的容器进程。

**（3）ctr**

ctr 实际上是 containerd-ctr，它是 containerd 的客户端，主要用来开发和调试，在没有 dockerd 的环境中，ctr 可以充当 docker 客户端的部分角色，直接向 containerd 守护进程发送操作容器的请求。

了解完 containerd 相关的组件，我们来了解一下容器的真正运行时 runc。

### 容器运行时组件runc

runc 是一个标准的 OCI 容器运行时的实现，它是一个命令行工具，可以直接用来创建和运行容器。

下面我们通过一个实例来演示一下 runc 的神奇之处。

第一步，准备容器运行时文件：进入 /home/centos 目录下，创建 runc 文件夹，并导入 busybox 镜像文件。

```bash
 $ cd /home/centos
 ## 创建 runc 运行根目录
 $ mkdir runc
 ## 导入 rootfs 镜像文件
 $ mkdir rootfs && docker export $(docker create busybox) | tar -C rootfs -xvf -
```

第二步，生成 runc config 文件。我们可以使用 runc spec 命令根据文件系统生成对应的 config.json 文件。命令如下：

```bash
$ runc spec
```

此时会在当前目录下生成 config.json 文件，我们可以使用 cat 命令查看一下 config.json 的内容：

```bash
$ cat config.json
{
	"ociVersion": "1.0.1-dev",
	"process": {
		"terminal": true,
		"user": {
			"uid": 0,
			"gid": 0
		},
		"args": [
			"sh"
		],
		"env": [
			"PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
			"TERM=xterm"
		],
		"cwd": "/",
		"capabilities": {
			"bounding": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"effective": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"inheritable": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"permitted": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			],
			"ambient": [
				"CAP_AUDIT_WRITE",
				"CAP_KILL",
				"CAP_NET_BIND_SERVICE"
			]
		},
		"rlimits": [
			{
				"type": "RLIMIT_NOFILE",
				"hard": 1024,
				"soft": 1024
			}
		],
		"noNewPrivileges": true
	},
	"root": {
		"path": "rootfs",
		"readonly": true
	},
	"hostname": "runc",
	"mounts": [
		{
			"destination": "/proc",
			"type": "proc",
			"source": "proc"
		},
		{
			"destination": "/dev",
			"type": "tmpfs",
			"source": "tmpfs",
			"options": [
				"nosuid",
				"strictatime",
				"mode=755",
				"size=65536k"
			]
		},
		{
			"destination": "/dev/pts",
			"type": "devpts",
			"source": "devpts",
			"options": [
				"nosuid",
				"noexec",
				"newinstance",
				"ptmxmode=0666",
				"mode=0620",
				"gid=5"
			]
		},
		{
			"destination": "/dev/shm",
			"type": "tmpfs",
			"source": "shm",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"mode=1777",
				"size=65536k"
			]
		},
		{
			"destination": "/dev/mqueue",
			"type": "mqueue",
			"source": "mqueue",
			"options": [
				"nosuid",
				"noexec",
				"nodev"
			]
		},
		{
			"destination": "/sys",
			"type": "sysfs",
			"source": "sysfs",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"ro"
			]
		},
		{
			"destination": "/sys/fs/cgroup",
			"type": "cgroup",
			"source": "cgroup",
			"options": [
				"nosuid",
				"noexec",
				"nodev",
				"relatime",
				"ro"
			]
		}
	],
	"linux": {
		"resources": {
			"devices": [
				{
					"allow": false,
					"access": "rwm"
				}
			]
		},
		"namespaces": [
			{
				"type": "pid"
			},
			{
				"type": "network"
			},
			{
				"type": "ipc"
			},
			{
				"type": "uts"
			},
			{
				"type": "mount"
			}
		],
		"maskedPaths": [
			"/proc/acpi",
			"/proc/asound",
			"/proc/kcore",
			"/proc/keys",
			"/proc/latency_stats",
			"/proc/timer_list",
			"/proc/timer_stats",
			"/proc/sched_debug",
			"/sys/firmware",
			"/proc/scsi"
		],
		"readonlyPaths": [
			"/proc/bus",
			"/proc/fs",
			"/proc/irq",
			"/proc/sys",
			"/proc/sysrq-trigger"
		]
	}
}
```

config.json 文件定义了 runc 启动容器时的一些配置，如根目录的路径，文件挂载路径等配置。

第三步，使用 runc 启动容器。我们可以使用 runc run 命令直接启动 busybox 容器。

```bash
$ runc run busybox
/ #
```

此时，我们已经创建并启动了一个 busybox 容器。

我们新打开一个命令行窗口，可以使用 run list 命令看到刚才启动的容器。

```bash
$ cd /home/centos/runc/
$ runc list
D          PID         STATUS      BUNDLE              CREATED                          OWNER
busybox     9778        running     /home/centos/runc   2020-09-06T09:25:32.441957273Z   root
```

通过上面的输出，我们可以看到，当前已经有一个 busybox 容器处于运行状态。

总体来说，Docker 的组件虽然很多，但每个组件都有自己清晰的工作职责，Docker 相关的组件负责发送和接受 Docker 请求，contianerd 相关的组件负责管理容器的生命周期，而 runc 负责真正意义上创建和启动容器。这些组件相互配合，才使得 Docker 顺利完成了容器的管理工作。

## 网络模型：剖析 Docker 网络实现及 Libnetwork 底层原理

### 容器网络发展史

提起 Docker 网络，我们不得不从容器战争说起。Docker 从 2013 年诞生，到后来逐渐成为了容器的代名词，然而 Docker 的野心也不止于此，它还想在更多的领域独占鳌头，比如制定容器的网络和存储标准。

于是 Docker 从 1.7 版本开始，便把网络和存储从 Docker 中正式以插件的形式剥离开来，并且分别为其定义了标准，Docker 定义的网络模型标准称之为 CNM (Container Network Model) 。

> Docker 推出 CNM 的同时，CoreOS 推出了 CNI（Container Network Interfac）。起初，以 Kubernetes 为代表的容器编排阵营考虑过使用 CNM 作为容器的网络标准，但是后来由于很多技术和非技术原因（如果你对详细原因感兴趣，可以参考[这篇博客](https://kubernetes.io/blog/2016/01/why-kubernetes-doesnt-use-libnetwork/)），Kubernetes 决定支持 CoreOS 推出的容器网络标准 CNI。

从此，容器的网络标准便分为两大阵营，一个是以 Docker 公司为代表的 CNM，另一个便是以 Google、Kubernetes、CoreOS 为代表的 CNI 网络标准。

### CNM

CNM (Container Network Model) 是 Docker 发布的容器网络标准，意在规范和指定容器网络发展标准，CNM 抽象了容器的网络接口 ，使得只要满足 CNM 接口的网络方案都可以接入到 Docker 容器网络，更好地满足了用户网络模型多样化的需求。

CNM 只是定义了网络标准，对于底层的具体实现并不太关心，这样便解耦了容器和网络，使得容器的网络模型更加灵活。

CNM 定义的网络标准包含三个重要元素。

- **沙箱（Sandbox）**：沙箱代表了一系列网络堆栈的配置，其中包含路由信息、网络接口等网络资源的管理，沙箱的实现通常是 Linux 的 Net Namespace，但也可以通过其他技术来实现，比如 [FreeBSD jail](https://zh.wikipedia.org/wiki/FreeBSD_jail) 等。
- **接入点（Endpoint）**：接入点将沙箱连接到网络中，代表容器的网络接口，接入点的实现通常是 Linux 的 veth 设备对。
- **网络（Network**）：网络是一组可以互相通信的接入点，它将多接入点组成一个子网，并且多个接入点之间可以相互通信。

CNM 的三个要素基本抽象了所有网络模型，使得网络模型的开发更加规范。

为了更好地构建容器网络标准，Docker 团队把网络功能从 Docker 中剥离出来，成为独立的项目 libnetwork，它通过插件的形式为 Docker 提供网络功能。Libnetwork 是开源的，使用 Golang 编写，它完全遵循 CNM 网络规范，是 CNM 的官方实现。Libnetwork 的工作流程也是完全围绕 CNM 的三个要素进行的，下面我们来详细了解一下 Libnetwork 是如何围绕 CNM 的三要素工作的。

### Libnetwork 的工作流程

Libnetwork 是 Docker 启动容器时，用来为 Docker 容器提供网络接入功能的插件，它可以让 Docker 容器顺利接入网络，实现主机和容器网络的互通。下面，我们来详细了解一下 Libnetwork 是如何为 Docker 容器提供网络的。

第一步：Docker 通过调用 libnetwork.New 函数来创建 NetworkController 实例。NetworkController 是一个接口类型，提供了各种接口，代码如下：

```bash
type NetworkController interface {
   // 创建一个新的网络。 options 参数用于指定特性类型的网络选项。
   NewNetwork(networkType, name string, id string, options ...NetworkOption) (Network, error)
   // ... 此次省略部分接口
}
```

第二步：通过调用 NewNetwork 函数创建指定名称和类型的 Network，其中 Network 也是接口类型，代码如下:

```bash
type Network interface {
   // 为该网络创建一个具有唯一指定名称的接入点（Endpoint）
   CreateEndpoint(name string, options ...EndpointOption) (Endpoint, error)

   // 删除网络
   Delete() error
// ... 此次省略部分接口
}
```

第三步：通过调用 CreateEndpoint 来创建接入点（Endpoint）。在 CreateEndpoint 函数中为容器分配了 IP 和网卡接口。其中 Endpoint 也是接口类型，代码如下：

```bash
// Endpoint 表示网络和沙箱之间的逻辑连接。
type Endpoint interface {
   // 将沙箱连接到接入点，并将为接入点分配的网络资源填充到沙箱中。
   // the network resources allocated for the endpoint.
   Join(sandbox Sandbox, options ...EndpointOption) error
   // 删除接入点
   Delete(force bool) error
   // ... 此次省略部分接口
}
```

第四步：调用 NewSandbox 来创建容器沙箱，主要是初始化 Namespace 相关的资源。

第五步：调用 Endpoint 的 Join 函数将沙箱和网络接入点关联起来，此时容器就加入了 Docker 网络并具备了网络访问能力。

Libnetwork 基于以上工作流程可以构建出多种网络模式，以满足我们的在不同场景下的需求，下面我们来详细了解一下 Libnetwork 提供的常见的四种网络模式。

### Libnetwork 常见网络模式

Libnetwork 比较典型的网络模式主要有四种，这四种网络模式基本满足了我们单机容器的所有场景。

1. null 空网络模式：可以帮助我们构建一个没有网络接入的容器环境，以保障数据安全。
2. bridge 桥接模式：可以打通容器与容器间网络通信的需求。
3. host 主机网络模式：可以让容器内的进程共享主机网络，从而监听或修改主机网络。
4. container 网络模式：可以将两个容器放在同一个网络命名空间内，让两个业务通过 localhost 即可实现访问。

下面我们对 libnetwork 的四种网络模式逐一讲解：

#### （1）null 空网络模式

有时候，我们需要处理一些保密数据，出于安全考虑，我们需要一个隔离的网络环境执行一些纯计算任务。这时候 null 网络模式就派上用场了，这时候我们的容器就像一个没有联网的电脑，处于一个相对较安全的环境，确保我们的数据不被他人从网络窃取。

使用 Docker 创建 null 空网络模式的容器时，容器拥有自己独立的 Net Namespace，但是此时的容器并没有任何网络配置。在这种模式下，Docker 除了为容器创建了 Net Namespace 外，没有创建任何网卡接口、IP 地址、路由等网络配置。我们可以一起来验证下。

我们使用 `docker run` 命令启动时，添加 --net=none 参数启动一个空网络模式的容器，命令如下：

```bash
$ docker run --net=none -it busybox
/ #
```

容器启动后，我们使用 ifconfig 命令查看一下容器内网络配置信息：

```bash
/ # ifconfig
lo        Link encap:Local Loopback
          inet addr:127.0.0.1  Mask:255.0.0.0
          UP LOOPBACK RUNNING  MTU:65536  Metric:1
          RX packets:0 errors:0 dropped:0 overruns:0 frame:0
          TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
          collisions:0 txqueuelen:1000
          RX bytes:0 (0.0 B)  TX bytes:0 (0.0 B)
```

可以看到容器内除了 Net Namespace 自带的 lo 网卡并没有创建任何虚拟网卡，然后我们再使用 `route -n` 命令查看一下容器内的路由信息:

```bash
/ # route -n
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
```

可以看到，容器内也并没有配置任何路由信息。

#### （2）bridge 桥接模式

Docker 的 bridge 网络是启动容器时默认的网络模式，使用 bridge 网络可以实现容器与容器的互通，可以从一个容器直接通过容器 IP 访问到另外一个容器。同时使用 bridge 网络可以实现主机与容器的互通，我们在容器内启动的业务，可以从主机直接请求。

在介绍 Docker 的 bridge 桥接模式前，我们需要先了解一下 Linux 的 veth 和 bridge 相关的技术，因为 Docker 的 bridge 模式正是由这两种技术实现的。

- Linux veth

veth 是 Linux 中的虚拟设备接口，veth 都是成对出现的，它在容器中，通常充当一个桥梁。veth 可以用来连接虚拟网络设备，例如 veth 可以用来连通两个 Net Namespace，从而使得两个 Net Namespace 之间可以互相访问。

- Linux bridge

Linux bridge 是一个虚拟设备，是用来连接网络的设备，相当于物理网络环境中的交换机。Linux bridge 可以用来转发两个 Net Namespace 内的流量。

- veth 与 bridge 的关系

![3][3]

通过上图，我们可以看到，bridge 就像一台交换机，而 veth 就像一根网线，通过交换机和网线可以把两个不同 Net Namespace 的容器连通，使得它们可以互相通信。

Docker 的 bridge 模式也是这种原理。Docker 启动时，libnetwork 会在主机上创建 docker0 网桥，docker0 网桥就相当于图中的交换机，而 Docker 创建出的 brige 模式的容器则都会连接 docker0 上，从而实现网络互通。

**bridge 桥接模式是 Docker 的默认网络模式，当我们创建容器时不指定任何网络模式，Docker 启动容器默认的网络模式为 bridge。**

#### （3）host 主机网络模式

容器内的网络并不是希望永远跟主机是隔离的，有些基础业务需要创建或更新主机的网络配置，我们的程序必须以主机网络模式运行才能够修改主机网络，这时候就需要用到 Docker 的 host 主机网络模式。

使用 host 主机网络模式时：

- libnetwork 不会为容器创建新的网络配置和 Net Namespace。
- Docker 容器中的进程直接共享主机的网络配置，可以直接使用主机的网络信息，此时，在容器内监听的端口，也将直接占用到主机的端口。
- 除了网络共享主机的网络外，其他的包括进程、文件系统、主机名等都是与主机隔离的。

host 主机网络模式通常适用于想要使用主机网络，但又不想把运行环境直接安装到主机上的场景中。例如我想在主机上运行一个 busybox 服务，但又不想直接把 busybox 安装到主机上污染主机环境，此时我可以使用以下命令启动一个主机网络模式的 busybox 镜像：

```bash
$ docker run -it --net=host busybox
/ #
```

然后我们使用ip a 命令查看一下容器内的网络环境：

```bash
/ # ip a
1: lo: <LOOPBACK,UP,LOWER\_UP> mtu 65536 qdisc noqueue qlen 1000
link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
inet 127.0.0.1/8 scope host lo
valid\_lft forever preferred\_lft forever
inet6 ::1/128 scope host
valid\_lft forever preferred\_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER\_UP> mtu 1500 qdisc pfifo\_fast qlen 1000
link/ether 02:11:b0:14:01:0c brd ff:ff:ff:ff:ff:ff
inet 172.20.1.11/24 brd 172.20.1.255 scope global dynamic eth0
valid\_lft 85785286sec preferred\_lft 85785286sec
inet6 fe80::11:b0ff:fe14:10c/64 scope link
valid\_lft forever preferred\_lft forever
3: docker0: \<NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue
link/ether 02:42:82:8d:a0:df brd ff:ff:ff:ff:ff:ff
inet 172.17.0.1/16 scope global docker0
valid\_lft forever preferred\_lft forever
inet6 fe80::42:82ff:fe8d:a0df/64 scope link
valid\_lft forever preferred\_lft forever
```

可以看到容器内的网络环境与主机完全一致。

#### （4）container 网络模式

container 网络模式允许一个容器共享另一个容器的网络命名空间。当两个容器需要共享网络，但其他资源仍然需要隔离时就可以使用 container 网络模式，例如我们开发了一个 http 服务，但又想使用 nginx 的一些特性，让 nginx 代理外部的请求然后转发给自己的业务，这时我们使用 container 网络模式将自己开发的服务和 nginx 服务部署到同一个网络命名空间中。

下面我举例说明。首先我们使用以下命令启动一个 busybox1 容器：

```bash
$ docker run -d --name=busybox1 busybox sleep 3600
```

然后我们使用 docker exec 命令进入到 centos 容器中查看一下网络配置：

```bash
$ docker exec -it busybox1 sh
/ # ifconfig
eth0 Link encap:Ethernet HWaddr 02:42:AC:11:00:02
inet addr:172.17.0.2 Bcast:172.17.255.255 Mask:255.255.0.0
UP BROADCAST RUNNING MULTICAST MTU:1500 Metric:1
RX packets:11 errors:0 dropped:0 overruns:0 frame:0
TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:0
RX bytes:906 (906.0 B) TX bytes:0 (0.0 B)

lo Link encap:Local Loopback
inet addr:127.0.0.1 Mask:255.0.0.0
UP LOOPBACK RUNNING MTU:65536 Metric:1
RX packets:0 errors:0 dropped:0 overruns:0 frame:0
TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:1000
RX bytes:0 (0.0 B) TX bytes:0 (0.0 B)
```

可以看到 busybox1 的 IP 地址为 172.17.0.2。

然后我们新打开一个命令行窗口，再启动一个 busybox2 容器，通过 container 网络模式连接到 busybox1 的网络，命令如下：

```bash
$ docker run -it --net=container:busybox1 --name=busybox2 busybox sh
/ #
```

在 busybox2 容器内同样使用 ifconfig 命令查看一下容器内的网络配置：

```bash
/ # ifconfig
eth0 Link encap:Ethernet HWaddr 02:42:AC:11:00:02
inet addr:172.17.0.2 Bcast:172.17.255.255 Mask:255.255.0.0
UP BROADCAST RUNNING MULTICAST MTU:1500 Metric:1
RX packets:14 errors:0 dropped:0 overruns:0 frame:0
TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:0
RX bytes:1116 (1.0 KiB) TX bytes:0 (0.0 B)

lo Link encap:Local Loopback
inet addr:127.0.0.1 Mask:255.0.0.0
UP LOOPBACK RUNNING MTU:65536 Metric:1
RX packets:0 errors:0 dropped:0 overruns:0 frame:0
TX packets:0 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:1000
RX bytes:0 (0.0 B) TX bytes:0 (0.0 B)
```

可以看到 busybox2 容器的网络 IP 也为 172.17.0.2，与 busybox1 的网络一致。

<!-- 
虽然最后k8s的CNI成为了容器网络标准，但是libnetwork的容器网络模式使得pod中容器共享网络环境成为可能
 -->

### 理解 Docker0

查看本地ip

```bash
$ ip addr
lo 127.0.0.1 # 本机回环地址 
eth0 172.17.90.138 # 阿里云的私有IP 
docker0 172.18.0.1 # docker网桥 
```

我们开发了很多微服务项目，那些微服务项目都要连接数据库，需要指定数据库的url地址，通过ip。但是我们用Docker管理的话，假设数据库出问题了，我们重新启动运行一个，这个时候数据库的地址就会发生变化，docker会给每个容器都分配一个ip，且容器和容器之间是可以互相访问的。

我们可以测试下容器之间能不能ping通过：

```bash
# 启动tomcat01 
$ docker run -d -P --name tomcat01 tomcat 

# 查看tomcat01的ip地址，docker会给每个容器都分配一个ip！ 
$ docker exec -it tomcat01 ip addr 

# 思考，我们的linux服务器是否可以ping通容器内的tomcat ？ 
$ ping 172.18.0.2 
```

**原理**

1、每一个安装了Docker的linux主机都有一个docker0的虚拟网卡。这是个桥接网卡，使用了veth-pair
技术！

2、每启动一个容器，linux主机就会多了一个虚拟网卡。

Docker使用Linux桥接，在宿主机虚拟一个Docker容器网桥(docker0)，Docker启动一个容器时会根据 Docker网桥的网段分配给容器一个IP地址，称为Container-IP，同时Docker网桥是每个容器的默认网关。因为在同一宿主机内的容器都接入同一个网桥，这样容器之间就能够通过容器的Container-IP直接通信。

![5][5]

Docker容器网络就很好的利用了Linux虚拟网络技术，在本地主机和容器内分别创建一个虚拟接口，并让他们彼此联通（这样一对接口叫veth pair）；

Docker中的网络接口默认都是虚拟的接口。虚拟接口的优势就是转发效率极高（因为Linux是在内核中进行数据的复制来实现虚拟接口之间的数据转发，无需通过外部的网络设备交换），对于本地系统和容器系统来说，虚拟接口跟一个正常的以太网卡相比并没有区别，只是他的速度快很多。

## 数据存储：剖析 Docker 卷与持久化数据存储的底层原理

### 为什么容器需要持久化存储

容器按照业务类型，总体可以分为两类：

- 无状态的（数据不需要被持久化）
- 有状态的（数据需要被持久化）

显然，容器更擅长无状态应用。因为未持久化数据的容器根目录的生命周期与容器的生命周期一样，容器文件系统的本质是在镜像层上面创建的读写层，运行中的容器对任何文件的修改都存在于该读写层，当容器被删除时，容器中的读写层也会随之消失。

虽然容器希望所有的业务都尽量保持无状态，这样容器就可以开箱即用，并且可以任意调度，但实际业务总是有各种需要数据持久化的场景，比如 MySQL、Kafka 等有状态的业务。因此为了解决有状态业务的需求，Docker 提出了卷（Volume）的概念。

什么是卷？卷的本质是文件或者目录，它可以绕过默认的联合文件系统，直接以文件或目录的形式存在于宿主机上。卷的概念不仅解决了数据持久化的问题，还解决了容器间共享数据的问题。使用卷可以将容器内的目录或文件持久化，当容器重启后保证数据不丢失，例如我们可以使用卷将 MySQL 的目录持久化，实现容器重启数据库数据不丢失。

Docker 提供了卷（Volume）的功能，使用`docker volume`命令可以实现对卷的创建、查看和删除等操作。下面我们来详细了解一下这些命令。

### Docker 卷的操作

#### 创建数据卷

使用`docker volume create`命令可以创建一个数据卷。

我们使用以下命令创建一个名为 myvolume 的数据卷：

```bash
$ docker volume create myvolume
```

在这里要说明下，默认情况下 ，Docker 创建的数据卷为 local 模式，仅能提供本主机的容器访问。如果想要实现远程访问，需要借助网络存储来实现。Docker 的 local 存储模式并未提供配额管理，因此在生产环境中需要手动维护磁盘存储空间。

除了使用docker volume create的方式创建卷，我们还可以在 Docker 启动时使用 -v 的方式指定容器内需要被持久化的路径，Docker 会自动为我们创建卷，并且绑定到容器中，使用命令如下：

```bash
$ docker run -d --name=nginx-volume -v /usr/share/nginx/html nginx
```

使用以上命令，我们启动了一个 nginx 容器，-v参数使得 Docker 自动生成一个卷并且绑定到容器的 /usr/share/nginx/html 目录中。

我们可以使用docker volume ls命令来查看下主机上的卷：

```bash
$ docker volume ls
DRIVER              VOLUME NAME
local               eaa8a223eb61a2091bf5cd5247c1b28ac287450a086d6eee9632d9d1b9f69171
```

可以看到，Docker 自动为我们创建了一个名称为随机 ID 的卷。

#### 查看数据卷

已经创建的数据卷可以使用 docker volume ls 命令查看。

```bash
$ docker volume ls
DRIVER              VOLUME NAME
local               myvolume
```

通过输出可以看到 myvolume 卷已经创建成功。

如果想要查看某个数据卷的详细信息，可以使用docker volume inspect命令。例如，我想查看 myvolume 的详细信息，命令如下：

```bash
$ docker volume inspect myvolume
[
    {
        "CreatedAt": "2020-09-08T09:10:50Z",
        "Driver": "local",
        "Labels": {},
        "Mountpoint": "/var/lib/docker/volumes/myvolume/_data",
        "Name": "myvolume",
        "Options": {},
        "Scope": "local"
    }
]
```

通过`docker volume inspect`命令可以看到卷的创建日期、命令、挂载路径信息。

#### 使用数据卷

使用docker volume创建的卷在容器启动时，添加 --mount 参数指定卷的名称即可使用。

这里我们使用上一步创建的卷来启动一个 nginx 容器，并将 /usr/share/nginx/html 目录与卷关联，命令如下：

```bash
$ docker run -d --name=nginx --mount source=myvolume,target=/usr/share/nginx/html nginx
```

使用 Docker 的卷可以实现指定目录的文件持久化，下面我们进入容器中并且修改 index.html 文件内容，命令如下：

```bash
$ docker exec -it  nginx bash
## 使用以下内容直接替换 /usr/share/nginx/html/index.html 文件 
root@719d3c32e211:/# cat <<EOF >/usr/share/nginx/html/index.html
<!DOCTYPE html>
<html>
<head>
<title>Hello, Docker Volume!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Hello, Docker Volume!</h1>
</body>
</html>
EOF
```

此时我们使用docker rm命令将运行中的 nginx 容器彻底删除。

```bash
$ docker rm -f nginx
```

旧的 nginx 容器删除后，我们再使用docker run命令启动一个新的容器，并且挂载 myvolume 卷，命令如下。

```bash
$ docker run -d --name=nginx --mount source=myvolume,target=/usr/share/nginx/html nginx
```

新容器启动后，我们进入容器查看一下 index.html 文件内容：

```bash
$ docker exec -it nginx bash
root@7ffac645f431:/# cat /usr/share/nginx/html/index.html
<!DOCTYPE html>
<html>
<head>
<title>Hello, Docker Volume!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Hello, Docker Volume!</h1>
</body>
</html>
```

可以看到，此时 index.html 文件内容依旧为我们之前写入的内容。可见，使用 Docker 卷后我们的数据并没有随着容器的删除而消失。

#### 删除数据卷

容器的删除并不会自动删除已经创建的数据卷，因此不再使用的数据卷需要我们手动删除，删除的命令为 docker volume rm 。例如，我们想要删除上面创建 myvolume 数据卷，可以使用以下命令：

```bash
$ docker volume rm myvolume
```

这里需要注意，正在被使用中的数据卷无法删除，如果你想要删除正在使用中的数据卷，需要先删除所有关联的容器。

有时候，两个容器之间会有共享数据的需求，很典型的一个场景就是容器内产生的日志需要一个专门的日志采集程序去采集日志内容，例如我需要使用 Filebeat (一种日志采集工具)采集 nginx 容器内的日志，我就需要使用卷来共享一个日志目录，从而使得 Filebeat 和 nginx 容器都可以访问到这个目录，这时就需要用到容器之间共享数据卷的方式。

#### 容器与容器之间数据共享

那如何实现容器与容器之间数据共享呢？下面我举例说明。

首先使用docker volume create命令创建一个共享日志的数据卷。

```bash
$ docker volume create log-vol
```

启动一个生产日志的容器（下面用 producer 窗口来表示）：

```bash
$ docker run --mount source=log-vol,target=/tmp/log --name=log-producer -it busybox
```

然后新打开一个命令行窗口，启动一个消费者容器（下面用 consumer 窗口来表示）：

```bash
docker run -it --name consumer --volumes-from log-producer  busybox
```

使用volumes-from参数可以在启动新的容器时来挂载已经存在的容器的卷，volumes-from参数后面跟已经启动的容器名称。

下面我们切换到 producer 窗口，使用以下命令创建一个 mylog.log 文件并写入 "Hello，My log." 的内容：

```bash
/ # cat <<EOF >/tmp/log/mylog.log
Hello, My log.
EOF
```

然后我们切换到 consumer 窗口，查看一下相关内容：

```bash
/ # cat /tmp/log/mylog.log
Hello, My log.
```

可以看到我们从 producer 容器写入的文件内容会自动出现在 consumer 容器中，证明我们成功实现了两个容器间的数据共享。

总结一下，我们首先使用 docker volume create 命令创建了 log-vol 卷来作为共享目录，log-producer 容器向该卷写入数据，consumer 容器从该卷读取数据。这就像主机上的两个进程，一个向主机目录写数据，一个从主机目录读数据，利用主机的目录，实现了容器之间的数据共享。

#### 主机与容器之间数据共享

Docker 卷的目录默认在 /var/lib/docker 下，当我们想把主机的其他目录映射到容器内时，就需要用到主机与容器之间数据共享的方式了，例如我想把 MySQL 容器中的 /var/lib/mysql 目录映射到主机的 /var/lib/mysql 目录中，我们就可以使用主机与容器之间数据共享的方式来实现。

要实现主机与容器之间数据共享，其实很简单，只需要我们在启动容器的时候添加-v参数即可, 使用格式为：`-v HOST_PATH:CONTIANAER_PATH`。

例如，我想挂载主机的 /data 目录到容器中的 /usr/local/data 中，可以使用以下命令来启动容器：

```bash
$ docker run -v /data:/usr/local/data -it busybox
```

容器启动后，便可以在容器内的 /usr/local/data 访问到主机 /data 目录的内容了，并且容器重启后，/data 目录下的数据也不会丢失。

### Docker 卷的实现原理

在了解 Docker 卷的原理之前，我们先来回顾一下镜像和容器的文件系统原理。

> **镜像和容器的文件系统原理：** 镜像是由多层文件系统组成的，当我们想要启动一个容器时，Docker 会在镜像上层创建一个可读写层，容器中的文件都工作在这个读写层中，当容器删除时，与容器相关的工作文件将全部丢失。

Docker 容器的文件系统不是一个真正的文件系统，而是通过联合文件系统实现的一个伪文件系统，而 Docker 卷则是直接利用主机的某个文件或者目录，它可以绕过联合文件系统，直接挂载主机上的文件或目录到容器中，这就是它的工作原理。

下面，我们通过一个实例来说明卷的工作原理。首先，我们创建一个名称为 volume-data 的卷：

```bash
$ docker volume create volume-data
```

我们使用 ls 命令查看一下 /var/lib/docker/volumes 目录下的内容：

```bash
$ sudo ls -l /var/lib/docker/volumes
drwxr-xr-x. 3 root root    19 Sep  8 10:59 volume-data
```

然后再看下 volume-data 目录下有什么内容：

```bash
$ sudo ls -l /var/lib/docker/volumes/volume-data
total 0
drwxr-xr-x. 2 root root 6 Sep  8 10:59 _data
```

可以看到我们创建的卷出现在了 /var/lib/docker/volumes 目录下，并且 volume-data 目录下还创建了一个 _data 目录。

实际上，在我们创建 Docker 卷时，Docker 会把卷的数据全部放在 /var/lib/docker/volumes 目录下，并且在每个对应的卷的目录下创建一个 _data 目录，然后把 _data 目录绑定到容器中。因此我们在容器中挂载卷的目录下操作文件，实际上是在操作主机上的 _data 目录。为了证实我的说法，我们来实际演示下。

首先，我们启动一个容器，并且绑定 volume-data 卷到容器内的 /data 目录下：

```bash
$  docker run -it --mount source=volume-data,target=/data busybox
/ #
```

我们进入到容器的 /data 目录，创建一个 data.log 文件:

```bash
/ # cd data/
/data # touch data.log
```

然后我们新打开一个命令行窗口，查看一下主机上的文件内容：

```bash
$  sudo ls -l /var/lib/docker/volumes/volume-data/_data
total 0
-rw-r--r--. 1 root root 0 Sep  8 11:15 data.log
```

可以看到主机上的 _data 目录下也出现了 data.log 文件。这说明，在容器内操作卷挂载的目录就是直接操作主机上的 _data 目录，符合我上面的说法。

综上，Docker 卷的实现原理是在主机的 /var/lib/docker/volumes 目录下，根据卷的名称创建相应的目录，然后在每个卷的目录下创建 _data 目录，在容器启动时如果使用 --mount 参数，Docker 会把主机上的目录直接映射到容器的指定目录下，实现数据持久化。

## 文件存储驱动：AUFS 文件系统原理及生产环境的最佳配置

### 什么是联合文件系统

联合文件系统（Union File System，Unionfs）是一种分层的轻量级文件系统，它可以把多个目录内容联合挂载到同一目录下，从而形成一个单一的文件系统，这种特性可以让使用者像是使用一个目录一样使用联合文件系统。

那联合文件系统对于 Docker 是一个怎样的存在呢？它可以说是 Docker 镜像和容器的基础，因为它可以使 Docker 可以把镜像做成分层的结构，从而使得镜像的每一层可以被共享。例如两个业务镜像都是基于 CentOS 7 镜像构建的，那么这两个业务镜像在物理机上只需要存储一次 CentOS 7 这个基础镜像即可，从而节省大量存储空间。

说到这儿，你有没有发现，联合文件系统只是一个概念，真正实现联合文件系统才是关键，那如何实现呢？其实实现方案有很多，Docker 中最常用的联合文件系统有三种：AUFS、Devicemapper 和 OverlayFS。

今天我主要讲解 Docker 中最常用的联合文件系统里的 AUFS，为什么呢？因为 AUFS 是 Docker 最早使用的文件系统驱动，多用于 Ubuntu 和 Debian 系统中。在 Docker 早期，OverlayFS 和 Devicemapper 相对不够成熟，AUFS 是最早也是最稳定的文件系统驱动。

接下来，我们就看看如何配置 Docker 的 AUFS 模式。

### 如何配置 Docker 的 AUFS 模式

AUFS 目前并未被合并到 Linux 内核主线，因此只有 Ubuntu 和 Debian 等少数操作系统支持 AUFS。你可以使用以下命令查看你的系统是否支持 AUFS：

```bash
$ grep aufs /proc/filesystems
nodev   aufs
```

执行以上命令后，如果输出结果包含aufs，则代表当前操作系统支持 AUFS。AUFS 推荐在 Ubuntu 或 Debian 操作系统下使用，如果你想要在 CentOS 等操作系统下使用 AUFS，需要单独安装 AUFS 模块（生产环境不推荐在 CentOS 下使用 AUFS，如果你想在 CentOS 下安装 AUFS 用于研究和测试，可以参考这个[链接](https://github.com/bnied/kernel-ml-aufs)），安装完成后使用上述命令输出结果中有aufs即可。

当确认完操作系统支持 AUFS 后，你就可以配置 Docker 的启动参数了。

先在 /etc/docker 下新建 daemon.json 文件，并写入以下内容：

```json
{
  "storage-driver": "aufs"
}
```

然后使用以下命令重启 Docker：

```bash
$ sudo systemctl restart docker
```

Docker 重启以后使用docker info命令即可查看配置是否生效：

```bash
$ sudo docker info
Client:
 Debug Mode: false
Server:
 Containers: 0
  Running: 0
  Paused: 0
  Stopped: 0
 Images: 1
 Server Version: 19.03.12
 Storage Driver: aufs
  Root Dir: /var/lib/docker/aufs
  Backing Filesystem: extfs
  Dirs: 1
  Dirperm1 Supported: true
```

可以看到 Storage Driver 已经变为 aufs，证明配置已经生效，配置生效后就可以使用 AUFS 为 Docker 提供联合文件系统了。

配置好 Docker 的 AUFS 联合文件系统后，你一定很好奇 AUFS 到底是如何工作的呢？下面我带你详细学习一下 AUFS 的工作原理。

### AUFS 工作原理

#### AUFS 是如何存储文件的？

AUFS 是联合文件系统，意味着它在主机上使用多层目录存储，每一个目录在 AUFS 中都叫作分支，而在 Docker 中则称之为层（layer），但最终呈现给用户的则是一个普通单层的文件系统，我们把多层以单一层的方式呈现出来的过程叫作联合挂载。

![7][7]

如图 所示，每一个镜像层和容器层都是 /var/lib/docker 下的一个子目录，镜像层和容器层都在 aufs/diff 目录下，每一层的目录名称是镜像或容器的 ID 值，联合挂载点在 aufs/mnt 目录下，mnt 目录是真正的容器工作目录。

下面我们针对 aufs 文件夹下的各目录结构，在创建容器前后的变化做详细讲述。

当一个镜像未生成容器时，AUFS 的存储结构如下。

- diff 文件夹：存储镜像内容，每一层都存储在以镜像层 ID 命名的子文件夹中。
- layers 文件夹：存储镜像层关系的元数据，在 diif 文件夹下的每个镜像层在这里都会有一个文件，文件的内容为该层镜像的父级镜像的 ID。
- mnt 文件夹：联合挂载点目录，未生成容器时，该目录为空。

当一个镜像已经生成容器时，AUFS 存储结构会发生如下变化。

- diff 文件夹：当容器运行时，会在 diff 目录下生成容器层。
- layers 文件夹：增加容器层相关的元数据。
- mnt 文件夹：容器的联合挂载点，这和容器中看到的文件内容一致。

以上便是 AUFS 的工作原理，那你知道容器的在工作过程中是如何使用 AUFS 的吗？

#### AUFS 是如何工作的？

AUFS 的工作过程中对文件的操作分为读取文件和修改文件。下面我们分别来看下 AUFS 对于不同的文件操作是如何工作的。

##### 1. 读取文件

当我们在容器中读取文件时，可能会有以下场景。

- 文件在容器层中存在时：当文件存在于容器层时，直接从容器层读取。
- 当文件在容器层中不存在时：当容器运行时需要读取某个文件，如果容器层中不存在时，则从镜像层查找该文件，然后读取文件内容。
- 文件既存在于镜像层，又存在于容器层：当我们读取的文件既存在于镜像层，又存在于容器层时，将会从容器层读取该文件。

##### 2. 修改文件或目录

AUFS 对文件的修改采用的是写时复制的工作机制，这种工作机制可以最大程度节省存储空间。

具体的文件操作机制如下。

- 第一次修改文件：当我们第一次在容器中修改某个文件时，AUFS 会触发写时复制操作，AUFS 首先从镜像层复制文件到容器层，然后再执行对应的修改操作。

> AUFS 写时复制的操作将会复制整个文件，如果文件过大，将会大大降低文件系统的性能，因此当我们有大量文件需要被修改时，AUFS 可能会出现明显的延迟。好在，写时复制操作只在第一次修改文件时触发，对日常使用没有太大影响。

- 删除文件或目录：当文件或目录被删除时，AUFS 并不会真正从镜像中删除它，因为镜像层是只读的，AUFS 会创建一个特殊的文件或文件夹，这种特殊的文件或文件夹会阻止容器的访问。

下面我们通过一个实例来演示一下 AUFS 。

### AUFS 演示

#### 准备演示目录和文件

首先我们在 /tmp 目录下创建 aufs 目录：

```bash
$ cd /tmp
/tmp$ mkdir aufs
```

准备挂载点目录：

```bash
/tmp$ cd aufs
/tmp/aufs$ mkdir mnt
```

接下来准备容器层内容：

```bash
## 创建镜像层目录
/tmp/aufs$ mkdir container1
## 在镜像层目录下准备一个文件
/tmp/aufs$ echo Hello, Container layer! > container1/container1.txt
```

最后准备镜像层内容：

```bash
## 创建两个镜像层目录
/tmp/aufs$ mkdir image1 && mkdir image2
## 分别写入数据
/tmp/aufs$ echo Hello, Image layer1! > image1/image1.txt
/tmp/aufs$ echo Hello, Image layer2! > image2/image2.txt
```

准备好的目录和文件结构如下：

```bash
/tmp/aufs$ tree .
.
|-- container1
|   `-- container1.txt
|-- image1
|   `-- image1.txt
|-- image2
|   `-- image2.txt
`-- mnt
4 directories, 3 files
```

### 创建 AUFS 联合文件系统

使用 mount 命令可以创建 AUFS 类型的文件系统，命令如下：

```bash
/tmp/aufs$ sudo mount -t aufs -o dirs=./container1:./image2:./image1  none ./mnt
```

mount 命令创建 AUFS 类型文件系统时，这里要注意，dirs 参数第一个冒号默认为读写权限，后面的目录均为只读权限，与 Docker 容器使用 AUFS 的模式一致。

执行完上述命令后，mnt 变成了 AUFS 的联合挂载目录，我们可以使用 mount 命令查看一下已经创建的 AUFS 文件系统：

```bash
/tmp/aufs$ mount -t aufs
none on /tmp/aufs/mnt type aufs (rw,relatime,si=4174b83d649ffb7c)
```

我们每创建一个 AUFS 文件系统，AUFS 都会为我们生成一个 ID，这个 ID 在 /sys/fs/aufs/ 会创建对应的目录，在这个 ID 的目录下可以查看文件挂载的权限。

```bash
tmp/aufs$ cat /sys/fs/aufs/si_4174b83d649ffb7c/*
/tmp/aufs/container1=rw
/tmp/aufs/image2=ro
/tmp/aufs/image1=ro
64
65
66
```

可以看到 container1 目录的权限为 rw（代表可读写），image1 和 image2 的权限为 ro（代表只读）。

为了验证 mnt 目录下可以看到 container1、image1 和 image2 目录下的所有内容，我们使用 ls 命令查看一下 mnt 目录：

```bash
/tmp/aufs$ ls -l mnt/
total 12
-rw-rw-r-- 1 ubuntu ubuntu 24 Sep  9 16:55 container1.txt
-rw-rw-r-- 1 ubuntu ubuntu 21 Sep  9 16:59 image1.txt
-rw-rw-r-- 1 ubuntu ubuntu 21 Sep  9 16:59 image2.txt
```

可以看到 mnt 目录下已经出现了我们准备的所有镜像层和容器层的文件。下面让我们来验证一下 AUFS 的写时复制。

### 验证 AUFS 的写时复制

AUFS 的写时复制是指在容器中，只有需要修改某个文件时，才会把文件从镜像层复制到容器层，下面我们通过修改联合挂载目录 mnt 下的内容来验证下这个过程。

我们使用以下命令修改 mnt 目录下的 image1.txt 文件：

```bash
/tmp/aufs$ echo Hello, Image layer1 changed! > mnt/image1.txt
```

然后我们查看下 image1/image1.txt 文件内容：

```bash
/tmp/aufs$ cat image1/image1.txt
Hello, Image layer1!
```

发现“镜像层”的 image1.txt 文件并未被修改。

然后我们查看一下"容器层"对应的 image1.txt 文件内容：

```bash
/tmp/aufs$ ls -l container1/
total 8
-rw-rw-r-- 1 ubuntu ubuntu 24 Sep  9 16:55 container1.txt
-rw-rw-r-- 1 ubuntu ubuntu 29 Sep  9 17:21 image1.txt
## 查看文件内容
/tmp/aufs$ cat container1/image1.txt
Hello, Image layer1 changed!
```

发现 AUFS 在“容器层”自动创建了 image1.txt 文件，并且内容为我们刚才写入的内容。

至此，我们完成了 AUFS 写时复制的验证。我们在第一次修改镜像内某个文件时，AUFS 会复制这个文件到容器层，然后在容器层对该文件进行修改操作，这就是 AUFS 最典型的特性写时复制。

## 文件存储驱动：Devicemapper 文件系统原理及生产环境的最佳配置

### 什么是 Devicemapper ？

Devicemapper 是 Linux 内核提供的框架，从 Linux 内核 2.6.9 版本开始引入，Devicemapper 与 AUFS 不同，AUFS 是一种文件系统，而**Devicemapper 是一种映射块设备的技术框架。**

Devicemapper 提供了一种将物理块设备映射到虚拟块设备的机制，目前 Linux 下比较流行的 LVM （Logical Volume Manager 是 Linux 下对磁盘分区进行管理的一种机制）和软件磁盘阵列（将多个较小的磁盘整合成为一个较大的磁盘设备用于扩大磁盘存储和提供数据可用性）都是基于 Devicemapper 机制实现的。

那么 Devicemapper 究竟是如何实现的呢？下面我们首先来了解一下它的关键技术。

### Devicemapper 的关键技术

Devicemapper 将主要的工作部分分为用户空间和内核空间。

- 用户空间负责配置具体的设备映射策略与相关的内核空间控制逻辑，例如逻辑设备 dm-a 如何与物理设备 sda 相关联，怎么建立逻辑设备和物理设备的映射关系等。
- 内核空间则负责用户空间配置的关联关系实现，例如当 IO 请求到达虚拟设备 dm-a 时，内核空间负责接管 IO 请求，然后处理和过滤这些 IO 请求并转发到具体的物理设备 sda 上。

这个架构类似于 C/S （客户端/服务区）架构的工作模式，客户端负责具体的规则定义和配置下发，服务端根据客户端配置的规则来执行具体的处理任务。

Devicemapper 的工作机制主要围绕三个核心概念。

- 映射设备（mapped device）：即对外提供的逻辑设备，它是由 Devicemapper 模拟的一个虚拟设备，并不是真正存在于宿主机上的物理设备。
- 目标设备（target device）：目标设备是映射设备对应的物理设备或者物理设备的某一个逻辑分段，是真正存在于物理机上的设备。
- 映射表（map table）：映射表记录了映射设备到目标设备的映射关系，它记录了映射设备在目标设备的起始地址、范围和目标设备的类型等变量。

![Devicemapper 核心概念关系图][8]

Devicemapper 三个核心概念之间的关系如图，**映射设备通过映射表关联到具体的物理目标设备。事实上，映射设备不仅可以通过映射表关联到物理目标设备，也可以关联到虚拟目标设备，然后虚拟目标设备再通过映射表关联到物理目标设备。**

Devicemapper 在内核中通过很多模块化的映射驱动（target driver）插件实现了对真正 IO 请求的拦截、过滤和转发工作，比如 Raid、软件加密、瘦供给（Thin Provisioning）等。其中瘦供给模块是 Docker 使用 Devicemapper 技术框架中非常重要的模块，下面我们来详细了解下瘦供给（Thin Provisioning）。

#### 瘦供给（Thin Provisioning）

瘦供给的意思是动态分配，这跟传统的固定分配不一样。传统的固定分配是无论我们用多少都一次性分配一个较大的空间，这样可能导致空间浪费。而瘦供给是我们需要多少磁盘空间，存储驱动就帮我们分配多少磁盘空间。

这种分配机制就好比我们一群人围着一个大锅吃饭，负责分配食物的人每次都给你一点分量，当你感觉食物不够时再去申请食物，而当你吃饱了就不需要再去申请食物了，从而避免了食物的浪费，节约的食物可以分配给更多需要的人。

那么，你知道 Docker 是如何使用瘦供给来做到像 AUFS 那样分层存储文件的吗？答案就是： Docker 使用了瘦供给的快照（snapshot）技术。

什么是快照（snapshot）技术？这是全球网络存储工业协会 SNIA（StorageNetworking Industry Association）对快照（Snapshot）的定义：

> 关于指定数据集合的一个完全可用拷贝，该拷贝包括相应数据在某个时间点（拷贝开始的时间点）的映像。快照可以是其所表示的数据的一个副本，也可以是数据的一个复制品。

简单来说，**快照是数据在某一个时间点的存储状态。快照的主要作用是对数据进行备份，当存储设备发生故障时，可以使用已经备份的快照将数据恢复到某一个时间点，而 Docker 中的数据分层存储也是基于快照实现的。**

以上便是实现 Devicemapper 的关键技术，那 Docker 究竟是如何使用 Devicemapper 实现存储数据和镜像分层共享的呢？

### Devicemapper 是如何数据存储的？

当 Docker 使用 Devicemapper 作为文件存储驱动时，**Docker 将镜像和容器的文件存储在瘦供给池（thinpool）中，并将这些内容挂载在 /var/lib/docker/devicemapper/ 目录下。**

这些目录储存 Docker 的容器和镜像相关数据，目录的数据内容和功能说明如下。

- devicemapper 目录（/var/lib/docker/devicemapper/devicemapper/）：存储镜像和容器实际内容，该目录由一个或多个块设备构成。
- metadata 目录（/var/lib/docker/devicemapper/metadata/）： 包含 Devicemapper 本身配置的元数据信息, 以 json 的形式配置，这些元数据记录了镜像层和容器层之间的关联信息。
- mnt 目录（ /var/lib/docker/devicemapper/mnt/）：是容器的联合挂载点目录，未生成容器时，该目录为空，而容器存在时，该目录下的内容跟容器中一致。

### Devicemapper 如何实现镜像分层与共享？

Devicemapper 使用专用的块设备实现镜像的存储，并且像 AUFS 一样使用了写时复制的技术来保障最大程度节省存储空间，所以 Devicemapper 的镜像分层也是依赖快照来是实现的。

Devicemapper 的每一镜像层都是其下一层的快照，最底层的镜像层是我们的瘦供给池，通过这种方式实现镜像分层有以下优点。

- 相同的镜像层，仅在磁盘上存储一次。例如，我有 10 个运行中的 busybox 容器，底层都使用了 busybox 镜像，那么 busybox 镜像只需要在磁盘上存储一次即可。
- 快照是写时复制策略的实现，也就是说，当我们需要对文件进行修改时，文件才会被复制到读写层。
- 相比对文件系统加锁的机制，Devicemapper 工作在块级别，因此可以实现同时修改和读写层中的多个块设备，比文件系统效率更高。

当我们需要读取数据时，如果数据存在底层快照中，则向底层快照查询数据并读取。当我们需要写数据时，则向瘦供给池动态申请存储空间生成读写层，然后把数据复制到读写层进行修改。Devicemapper 默认每次申请的大小是 64K 或者 64K 的倍数，因此每次新生成的读写层的大小都是 64K 或者 64K 的倍数。

以下是一个运行中的 Ubuntu 容器示意图。

![Devicemapper 存储模型][9]

这个 Ubuntu 镜像一共有四层，每一层镜像都是下一层的快照，镜像的最底层是基础设备的快照。当容器运行时，容器是基于镜像的快照。综上，Devicemapper 实现镜像分层的根本原理就是快照。

接下来，我们看下如何配置 Docker 的 Devicemapper 模式。

### 如何在 Docker 中配置 Devicemapper

Docker 的 Devicemapper 模式有两种：第一种是 loop-lvm 模式，该模式主要用来开发和测试使用；第二种是 direct-lvm 模式，该模式推荐在生产环境中使用。

下面我们逐一配置，首先来看下如何配置 loop-lvm 模式。

#### 配置 loop-lvm 模式

1. 使用以下命令停止已经运行的 Docker：

```bash
$ sudo systemctl stop docker
```

2. 编辑 /etc/docker/daemon.json 文件，如果该文件不存在，则创建该文件，并添加以下配置：

```json
{
  "storage-driver": "devicemapper"
}
```

3. 启动 Docker：

```bash
$ sudo systemctl start docker
```

4. 验证 Docker 的文件驱动模式：

```bash
$ docker info
Client:
 Debug Mode: false
Server:
 Containers: 1
  Running: 0
  Paused: 0
  Stopped: 1
 Images: 1
 Server Version: 19.03.12
 Storage Driver: devicemapper
  Pool Name: docker-253:1-423624832-pool
  Pool Blocksize: 65.54kB
  Base Device Size: 10.74GB
  Backing Filesystem: xfs
  Udev Sync Supported: true
  Data file: /dev/loop0
  Metadata file: /dev/loop1
  Data loop file: /var/lib/docker/devicemapper/devicemapper/data
  Metadata loop file: /var/lib/docker/devicemapper/devicemapper/metadata
  Data Space Used: 22.61MB
  Data Space Total: 107.4GB
  Data Space Available: 107.4GB
  Metadata Space Used: 17.37MB
  Metadata Space Total: 2.147GB
  Metadata Space Available: 2.13GB
  Thin Pool Minimum Free Space: 10.74GB
  Deferred Removal Enabled: true
  Deferred Deletion Enabled: true
  Deferred Deleted Device Count: 0
  Library Version: 1.02.164-RHEL7 (2019-08-27)
... 省略部分输出
```

可以看到 Storage Driver 为 devicemapper，这表示 Docker 已经被配置为 Devicemapper 模式。

但是这里输出的 Data file 为 /dev/loop0，这表示我们目前在使用的模式为 loop-lvm。但是由于 loop-lvm 性能比较差，因此不推荐在生产环境中使用 loop-lvm 模式。下面我们看下生产环境中应该如何配置 Devicemapper 的 direct-lvm 模式。

#### 配置 direct-lvm 模式

1. 使用以下命令停止已经运行的 Docker：

```bash
$ sudo systemctl stop docker
```

2. 编辑 /etc/docker/daemon.json 文件，如果该文件不存在，则创建该文件，并添加以下配置：

```json
{
  "storage-driver": "devicemapper",
  "storage-opts": [
    "dm.directlvm_device=/dev/xdf",
    "dm.thinp_percent=95",
    "dm.thinp_metapercent=1",
    "dm.thinp_autoextend_threshold=80",
    "dm.thinp_autoextend_percent=20",
    "dm.directlvm_device_force=false"
  ]
}
```

其中 directlvm_device 指定需要用作 Docker 存储的磁盘路径，Docker 会动态为我们创建对应的存储池。例如这里我想把 /dev/xdf 设备作为我的 Docker 存储盘，directlvm_device 则配置为 /dev/xdf。

3. 启动 Docker：

```bash
$ sudo systemctl start docker
```

4. 验证 Docker 的文件驱动模式：

```bash
$ docker info
Client:
 Debug Mode: false
Server:
 Containers: 1
  Running: 0
  Paused: 0
  Stopped: 1
 Images: 1
 Server Version: 19.03.12
 Storage Driver: devicemapper
  Pool Name: docker-thinpool
  Pool Blocksize: 65.54kB
  Base Device Size: 10.74GB
  Backing Filesystem: xfs
  Udev Sync Supported: true
  Data file:
  Metadata file:
  Data loop file: /var/lib/docker/devicemapper/devicemapper/data
  Metadata loop file: /var/lib/docker/devicemapper/devicemapper/metadata
  Data Space Used: 22.61MB
  Data Space Total: 107.4GB
  Data Space Available: 107.4GB
  Metadata Space Used: 17.37MB
  Metadata Space Total: 2.147GB
  Metadata Space Available: 2.13GB
  Thin Pool Minimum Free Space: 10.74GB
  Deferred Removal Enabled: true
  Deferred Deletion Enabled: true
  Deferred Deleted Device Count: 0
  Library Version: 1.02.164-RHEL7 (2019-08-27)
... 省略部分输出
```

当我们看到 Storage Driver 为 devicemapper，并且 Pool Name 为 docker-thinpool 时，这表示 Devicemapper 的 direct-lvm 模式已经配置成功。

> Devicemapper 使用块设备来存储文件，运行速度会比直接操作文件系统更快，因此很长一段时间内在 Red Hat 或 CentOS 系统中，Devicemapper 一直作为 Docker 默认的联合文件系统驱动，为 Docker 在 Red Hat 或 CentOS 稳定运行提供强有力的保障。

## 文件存储驱动：OverlayFS 文件系统原理及生产环境的最佳配置

OverlayFS 的发展分为两个阶段。2014 年，OverlayFS 第一个版本被合并到 Linux 内核 3.18 版本中，此时的 OverlayFS 在 Docker 中被称为`overlay`文件驱动。由于第一版的`overlay`文件系统存在很多弊端（例如运行一段时间后Docker 会报 "too many links problem" 的错误）， Linux 内核在 4.0 版本对`overlay`做了很多必要的改进，此时的 OverlayFS 被称之为`overlay2`。

因此，在 Docker 中 OverlayFS 文件驱动被分为了两种，一种是早期的`overlay`，不推荐在生产环境中使用，另一种是更新和更稳定的`overlay2`，推荐在生产环境中使用。下面的内容我们主要围绕`overlay2`展开。

### 使用 overlay2 的先决条件

`overlay2`虽然很好，但是它的使用是有一定条件限制的。

- 要想使用`overlay2`，Docker 版本必须高于 17.06.02。
- 如果你的操作系统是 RHEL 或 CentOS，Linux 内核版本必须使用 3.10.0-514 或者更高版本，其他 Linux 发行版的内核版本必须高于 4.0（例如 Ubuntu 或 Debian），你可以使用`uname -a`查看当前系统的内核版本。
- `overlay2`最好搭配 xfs 文件系统使用，并且使用 xfs 作为底层文件系统时，d_type必须开启，可以使用以下命令验证 d_type 是否开启：

```bash
$ xfs_info /var/lib/docker | grep ftype
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
```

当输出结果中有 ftype=1 时，表示 d_type 已经开启。如果你的输出结果为 ftype=0，则需要重新格式化磁盘目录，命令如下：

```bash
$ sudo mkfs.xfs -f -n ftype=1 /path/to/disk
```

另外，在生产环境中，推荐挂载 /var/lib/docker 目录到单独的磁盘或者磁盘分区，这样可以避免该目录写满影响主机的文件写入，并且把挂载信息写入到 /etc/fstab，防止机器重启后挂载信息丢失。

挂载配置中推荐开启 pquota，这样可以防止某个容器写文件溢出导致整个容器目录空间被占满。写入到 /etc/fstab 中的内容如下：

```bash
$UUID /var/lib/docker xfs defaults,pquota 0 0
```

其中 UUID 为 /var/lib/docker 所在磁盘或者分区的 UUID 或者磁盘路径。

如果你的操作系统无法满足上面的任何一个条件，那我推荐你使用 AUFS 或者 Devicemapper 作为你的 Docker 文件系统驱动。

> 通常情况下，overlay2 会比 AUFS 和 Devicemapper 性能更好，而且更加稳定，因为 overlay2 在 inode 优化上更加高效。因此在生产环境中推荐使用 overlay2 作为 Docker 的文件驱动。

下面我通过实例来教你如何初始化 /var/lib/docker 目录，为后面配置 Docker 的overlay2文件驱动做准备。

#### 准备 /var/lib/docker 目录

1. 使用 lsblk（Linux 查看磁盘和块设备信息命令）命令查看本机磁盘信息：

```bash
$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda    253:0    0  500G  0 disk
`-vda1 253:1    0  500G  0 part /
vdb    253:16   0  500G  0 disk
`-vdb1 253:17   0    8G  0 part
```

可以看到，我的机器有两块磁盘，一块是 vda，一块是 vdb。其中 vda 已经被用来挂载系统根目录，这里我想把 /var/lib/docker 挂载到 vdb1 分区上。

2. 使用 mkfs 命令格式化磁盘 vdb1：

```bash
$ sudo mkfs.xfs -f -n ftype=1 /dev/vdb1
```

3. 将挂载信息写入到 /etc/fstab，保证机器重启挂载目录不丢失：

```bash
$ sudo echo "/dev/vdb1 /var/lib/docker xfs defaults,pquota 0 0" >> /etc/fstab
```

4. 使用 mount 命令使得挂载目录生效：

```bash
$ sudo mount -a
```

5. 查看挂载信息：

```bash
$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
vda    253:0    0  500G  0 disk
`-vda1 253:1    0  500G  0 part /
vdb    253:16   0  500G  0 disk
`-vdb1 253:17   0    8G  0 part /var/lib/docker
```

可以看到此时 /var/lib/docker 目录已经被挂载到了 vdb1 这个磁盘分区上。我们使用 xfs_info 命令验证下 d_type 是否已经成功开启：

```bash
$ xfs_info /var/lib/docker | grep ftype
naming   =version 2              bsize=4096   ascii-ci=0 ftype=1
```

可以看到输出结果为 ftype=1，证明 d_type 已经被成功开启。

准备好 /var/lib/docker 目录后，我们就可以配置 Docker 的文件驱动为 overlay2，并且启动 Docker 了。

### 如何在 Docker 中配置 overlay2？

当你的系统满足上面的条件后，就可以配置你的 Docker 存储驱动为 overlay2 了，具体配置步骤如下。

1. 停止已经运行的 Docker：

```bash
$ sudo systemctl stop docker
```

2. 备份 /var/lib/docker 目录：

```bash
$ sudo cp -au /var/lib/docker /var/lib/docker.back
```

3. 在 /etc/docker 目录下创建 daemon.json 文件，如果该文件已经存在，则修改配置为以下内容：

```bash
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.size=20G",
    "overlay2.override_kernel_check=true"
  ]
}
```

其中 storage-driver 参数指定使用 overlay2 文件驱动，overlay2.size 参数表示限制每个容器根目录大小为 20G。限制每个容器的磁盘空间大小是通过 xfs 的 pquota 特性实现，overlay2.size 可以根据不同的生产环境来设置这个值的大小。我推荐你在生产环境中开启此参数，防止某个容器写入文件过大，导致整个 Docker 目录空间溢出。

4. 启动 Docker：

```bash
$ sudo systemctl start docker
```

5. 检查配置是否生效：

```bash
$ docker info
Client:
 Debug Mode: false
Server:
 Containers: 1
  Running: 0
  Paused: 0
  Stopped: 1
 Images: 1
 Server Version: 19.03.12
 Storage Driver: overlay2
  Backing Filesystem: xfs
  Supports d_type: true
  Native Overlay Diff: true
 Logging Driver: json-file
 Cgroup Driver: cgroupfs
 ... 省略部分无用输出
```

可以看到 Storage Driver 已经变为 overlay2，并且 d_type 也是 true。至此，你的 Docker 已经配置完成。下面我们看下 overlay2 是如何工作的。

### overlay2 工作原理

#### overlay2 是如何存储文件的？

overlay2 和 AUFS 类似，它将所有目录称之为层（layer），overlay2 的目录是镜像和容器分层的基础，而把这些层统一展现到同一的目录下的过程称为联合挂载（union mount）。overlay2 把目录的下一层叫作`lowerdir`，上一层叫作`upperdir`，联合挂载后的结果叫作`merged`。

> overlay2 文件系统最多支持 128 个层数叠加，也就是说你的 Dockerfile 最多只能写 128 行，不过这在日常使用中足够了。

下面我们通过拉取一个 Ubuntu 操作系统的镜像来看下 overlay2 是如何存放镜像文件的。

首先，我们通过以下命令拉取 Ubuntu 镜像：

```bash
$ docker pull ubuntu:16.04
16.04: Pulling from library/ubuntu
8e097b52bfb8: Pull complete
a613a9b4553c: Pull complete
acc000f01536: Pull complete
73eef93b7466: Pull complete
Digest: sha256:3dd44f7ca10f07f86add9d0dc611998a1641f501833692a2651c96defe8db940
Status: Downloaded newer image for ubuntu:16.04
docker.io/library/ubuntu:16.04
```

可以看到镜像一共被分为四层拉取，拉取完镜像后我们查看一下 overlay2 的目录：

```bash
$ sudo ls -l /var/lib/docker/overlay2/
total 0
drwx------. 3 root root      47 Sep 13 08:16 01946de89606800dac8530e3480b32be9d7c66b493a1cdf558df52d7a1476d4a
drwx------. 4 root root      55 Sep 13 08:16 0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb
drwx------. 4 root root      72 Sep 13 08:16 94222a2fa3b2405cb00459285dd0d0ba7e6936d9b693ed18fbb0d08b93dc272f
drwx------. 4 root root      72 Sep 13 08:16 9d392cf38f245d37699bdd7672daaaa76a7d702083694fa8be380087bda5e396
brw-------. 1 root root 253, 17 Sep 13 08:14 backingFsBlockDev
drwx------. 2 root root     142 Sep 13 08:16 l
```

可以看到 overlay2 目录下出现了四个镜像层目录和一个l目录，我们首先来查看一下l目录的内容：

```bash
$ sudo ls -l /var/lib/docker/overlay2/l
total 0
lrwxrwxrwx. 1 root root 72 Sep 13 08:16 FWGSYEA56RNMS53EUCKEQIKVLQ -> ../9d392cf38f245d37699bdd7672daaaa76a7d702083694fa8be380087bda5e396/diff
lrwxrwxrwx. 1 root root 72 Sep 13 08:16 RNN2FM3YISKADNAZFRONVNWTIS -> ../0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/diff
lrwxrwxrwx. 1 root root 72 Sep 13 08:16 SHAQ5GYA3UZLJJVEGXEZM34KEE -> ../01946de89606800dac8530e3480b32be9d7c66b493a1cdf558df52d7a1476d4a/diff
lrwxrwxrwx. 1 root root 72 Sep 13 08:16 VQSNH735KNX4YK2TCMBAJRFTGT -> ../94222a2fa3b2405cb00459285dd0d0ba7e6936d9b693ed18fbb0d08b93dc272f/diff
```

可以看到l目录是一堆软连接，把一些较短的随机串软连到镜像层的 diff 文件夹下，这样做是为了避免达到mount命令参数的长度限制。

下面我们查看任意一个镜像层下的文件内容：

```bash
$ sudo ls -l /var/lib/docker/overlay2/0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/
total 8
drwxr-xr-x. 3 root root 17 Sep 13 08:16 diff
-rw-r--r--. 1 root root 26 Sep 13 08:16 link
-rw-r--r--. 1 root root 86 Sep 13 08:16 lower
drwx------. 2 root root  6 Sep 13 08:16 work
```

镜像层的 link 文件内容为该镜像层的短 ID，diff 文件夹为该镜像层的改动内容，lower 文件为该层的所有父层镜像的短 ID。

我们可以通过docker image inspect命令来查看某个镜像的层级关系，例如我想查看刚刚下载的 Ubuntu 镜像之间的层级关系，可以使用以下命令：

```bash
$ docker image inspect ubuntu:16.04
...省略部分输出
"GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/9d392cf38f245d37699bdd7672daaaa76a7d702083694fa8be380087bda5e396/diff:/var/lib/docker/overlay2/94222a2fa3b2405cb00459285dd0d0ba7e6936d9b693ed18fbb0d08b93dc272f/diff:/var/lib/docker/overlay2/01946de89606800dac8530e3480b32be9d7c66b493a1cdf558df52d7a1476d4a/diff",
                "MergedDir": "/var/lib/docker/overlay2/0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/merged",
                "UpperDir": "/var/lib/docker/overlay2/0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/diff",
                "WorkDir": "/var/lib/docker/overlay2/0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/work"
            },
            "Name": "overlay2"
        },
...省略部分输出
```

其中 MergedDir 代表当前镜像层在 overlay2 存储下的目录，LowerDir 代表当前镜像的父层关系，使用冒号分隔，冒号最后代表该镜像的最底层。

下面我们将镜像运行起来成为容器：

```bash
$ docker run --name=ubuntu -d ubuntu:16.04 sleep 3600
```

我们使用docker inspect命令来查看一下容器的工作目录：

```bash
$ docker inspect ubuntu
...省略部分输出
 "GraphDriver": {
            "Data": {
                "LowerDir": "/var/lib/docker/overlay2/4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2-init/diff:/var/lib/docker/overlay2/0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb/diff:/var/lib/docker/overlay2/9d392cf38f245d37699bdd7672daaaa76a7d702083694fa8be380087bda5e396/diff:/var/lib/docker/overlay2/94222a2fa3b2405cb00459285dd0d0ba7e6936d9b693ed18fbb0d08b93dc272f/diff:/var/lib/docker/overlay2/01946de89606800dac8530e3480b32be9d7c66b493a1cdf558df52d7a1476d4a/diff",
                "MergedDir": "/var/lib/docker/overlay2/4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2/merged",
                "UpperDir": "/var/lib/docker/overlay2/4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2/diff",
                "WorkDir": "/var/lib/docker/overlay2/4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2/work"
            },
            "Name": "overlay2"
        },
...省略部分输出
```

MergedDir 后面的内容即为容器层的工作目录，LowerDir 为容器所依赖的镜像层目录。 然后我们查看下 overlay2 目录下的内容：

```bash
$ sudo ls -l /var/lib/docker/overlay2/
total 0
drwx------. 3 root root      47 Sep 13 08:16 01946de89606800dac8530e3480b32be9d7c66b493a1cdf558df52d7a1476d4a
drwx------. 4 root root      72 Sep 13 08:47 0849daa41598a333101f6a411755907d182a7fcef780c7f048f15d335b774deb
drwx------. 5 root root      69 Sep 13 08:47 4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2
drwx------. 4 root root      72 Sep 13 08:47 4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2-init
drwx------. 4 root root      72 Sep 13 08:16 94222a2fa3b2405cb00459285dd0d0ba7e6936d9b693ed18fbb0d08b93dc272f
drwx------. 4 root root      72 Sep 13 08:16 9d392cf38f245d37699bdd7672daaaa76a7d702083694fa8be380087bda5e396
brw-------. 1 root root 253, 17 Sep 13 08:14 backingFsBlockDev
drwx------. 2 root root     210 Sep 13 08:47 l
```

可以看到 overlay2 目录下增加了容器层相关的目录，我们再来查看一下容器层下的内容：

```bash
$ sudo ls -l /var/lib/docker/overlay2/4753c2aa5bdb20c97cddd6978ee3b1d07ef149e3cc2bbdbd4d11da60685fe9b2
total 8
drwxr-xr-x. 2 root root   6 Sep 13 08:47 diff
-rw-r--r--. 1 root root  26 Sep 13 08:47 link
-rw-r--r--. 1 root root 144 Sep 13 08:47 lower
drwxr-xr-x. 1 root root   6 Sep 13 08:47 merged
drwx------. 3 root root  18 Sep 13 08:47 work
```

link 和 lower 文件与镜像层的功能一致，link 文件内容为该容器层的短 ID，lower 文件为该层的所有父层镜像的短 ID 。diff 目录为容器的读写层，容器内修改的文件都会在 diff 中出现，merged 目录为分层文件联合挂载后的结果，也是容器内的工作目录。

总体来说，overlay2 是这样储存文件的：overlay2将镜像层和容器层都放在单独的目录，并且有唯一 ID，每一层仅存储发生变化的文件，最终使用联合挂载技术将容器层和镜像层的所有文件统一挂载到容器中，使得容器中看到完整的系统文件。

#### overlay2 如何读取、修改文件？

overlay2 的工作过程中对文件的操作分为读取文件和修改文件。

**读取文件**

容器内进程读取文件分为以下三种情况。

- 文件在容器层中存在：当文件存在于容器层并且不存在于镜像层时，直接从容器层读取文件；
- 当文件在容器层中不存在：当容器中的进程需要读取某个文件时，如果容器层中不存在该文件，则从镜像层查找该文件，然后读取文件内容；
- 文件既存在于镜像层，又存在于容器层：当我们读取的文件既存在于镜像层，又存在于容器层时，将会从容器层读取该文件。

**修改文件或目录**

overlay2 对文件的修改采用的是写时复制的工作机制，这种工作机制可以最大程度节省存储空间。具体的文件操作机制如下。

- 第一次修改文件：当我们第一次在容器中修改某个文件时，overlay2 会触发写时复制操作，overlay2 首先从镜像层复制文件到容器层，然后在容器层执行对应的文件修改操作。

> overlay2 写时复制的操作将会复制整个文件，如果文件过大，将会大大降低文件系统的性能，因此当我们有大量文件需要被修改时，overlay2 可能会出现明显的延迟。好在，写时复制操作只在第一次修改文件时触发，对日常使用没有太大影响。

- 删除文件或目录：当文件或目录被删除时，overlay2 并不会真正从镜像中删除它，因为镜像层是只读的，overlay2 会创建一个特殊的文件或目录，这种特殊的文件或目录会阻止容器的访问。

> overlay2 目前已经是 Docker 官方推荐的文件系统了，也是目前安装 Docker 时默认的文件系统，因为 overlay2 在生产环境中不仅有着较高的性能，它的稳定性也极其突出。但是 overlay2 的使用还是有一些限制条件的，例如要求 Docker 版本必须高于 17.06.02，内核版本必须高于 4.0 等。因此，在生产环境中，如果你的环境满足使用 overlay2 的条件，请尽量使用 overlay2 作为 Docker 的联合文件系统。

## 参考

- 《由浅入深吃透 Docker》
- 《狂神说Docker》
- http://www.docker.com
- https://www.docker-cn.com

[1]: /images/docker/docker-01/5.jpg
[2]: /images/docker/docker-02/2.png
[3]: /images/docker/docker-02/3.jpg
[4]: /images/docker/docker-02/4.png
[5]: /images/docker/docker-02/5.jpg
[6]: /images/docker/docker-02/6.png
[7]: /images/docker/docker-02/7.jpg
[8]: /images/docker/docker-02/8.jpg
[9]: /images/docker/docker-02/9.jpg
