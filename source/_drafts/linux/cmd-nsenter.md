---
title: nsenter 命令简介
date: 2020-05-11 15:20:00
categories: Linux
tags:
  - cmd
---

`nsenter` 命令是一个可以在指定进程的命令空间下运行指定程序的命令。它位于util-linux包中。

<!--more-->

## 简介

一个最典型的用途就是进入容器的网络命令空间。相当多的容器为了轻量级，是不包含较为基础的命令的，比如说 `ip address`，`ping`，`telnet`，`ss`，`tcpdump` 等等命令，这就给调试容器网络带来相当大的困扰：只能通过`docker inspect ContainerID`命令获取到容器IP，以及无法测试和其他网络的连通性。这时就可以使用nsenter命令仅进入该容器的网络命名空间，使用宿主机的命令调试容器网络。

此外，`nsenter`也可以进入`mnt`, `uts`, `ipc`, `pid`, `user`命令空间，以及指定根目录和工作目录。

## 使用

首先看下nsenter命令的语法：

```bash
nsenter [options] [program [arguments]]

options:
-t, --target pid：指定被进入命名空间的目标进程的pid
-m, --mount[=file]：进入mount命令空间。如果指定了file，则进入file的命令空间
-u, --uts[=file]：进入uts命令空间。如果指定了file，则进入file的命令空间
-i, --ipc[=file]：进入ipc命令空间。如果指定了file，则进入file的命令空间
-n, --net[=file]：进入net命令空间。如果指定了file，则进入file的命令空间
-p, --pid[=file]：进入pid命令空间。如果指定了file，则进入file的命令空间
-U, --user[=file]：进入user命令空间。如果指定了file，则进入file的命令空间
-G, --setgid gid：设置运行程序的gid
-S, --setuid uid：设置运行程序的uid
-r, --root[=directory]：设置根目录
-w, --wd[=directory]：设置工作目录

# 如果没有给出program，则默认执行$SHELL。
```

示例：

运行一个nginx容器，查看该容器的pid：

```bash
[root@staight ~]# docker inspect -f {{.State.Pid}} nginx
5645
```

然后，使用nsenter命令进入该容器的网络命令空间：

```bash
[root@staight ~]# nsenter -n -t5645
[root@staight ~]# ip addr
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
18: eth0@if19: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff link-netnsid 0
    inet 172.17.0.2/16 brd 172.17.255.255 scope global eth0
       valid_lft forever preferred_lft forever
```

在Kubernetes中，在得到容器pid之前还需获取容器的ID，可以使用如下命令获取：

```bash
[root@node1 test]# kubectl get pod test -oyaml|grep containerID
  - containerID: docker://cf0873782d587dbca6aa32f49605229da3748600a9926e85b36916141597ec85
```

或者更为精确地获取containerID：

```bash
[root@node1 test]# kubectl get pod test -o template --template='{{range .status.containerStatuses}}{{.containerID}}{{end}}'
docker://cf0873782d587dbca6aa32f49605229da3748600a9926e85b36916141597ec85
```

## 原理

### namespace

namespace是Linux中一些进程的属性的作用域，使用命名空间，可以隔离不同的进程。

Linux在不断的添加命名空间，目前有：

- mount：挂载命名空间，使进程有一个独立的挂载文件系统，始于Linux 2.4.19
- ipc：ipc命名空间，使进程有一个独立的ipc，包括消息队列，共享内存和信号量，始于Linux 2.6.19
- uts：uts命名空间，使进程有一个独立的hostname和domainname，始于Linux 2.6.19
- net：network命令空间，使进程有一个独立的网络栈，始于Linux 2.6.24
- pid：pid命名空间，使进程有一个独立的pid空间，始于Linux 2.6.24
- user：user命名空间，是进程有一个独立的user空间，始于Linux 2.6.23，结束于Linux 3.8
- cgroup：cgroup命名空间，使进程有一个独立的cgroup控制组，始于Linux 4.6

Linux的每个进程都具有命名空间，可以在/proc/PID/ns目录中看到命名空间的文件描述符。

```bash
[root@staight ns]# pwd
/proc/1/ns
[root@staight ns]# ll
total 0
lrwxrwxrwx 1 root root 0 Sep 23 19:53 ipc -> ipc:[4026531839]
lrwxrwxrwx 1 root root 0 Sep 23 19:53 mnt -> mnt:[4026531840]
lrwxrwxrwx 1 root root 0 Sep 23 19:53 net -> net:[4026531956]
lrwxrwxrwx 1 root root 0 Sep 23 19:53 pid -> pid:[4026531836]
lrwxrwxrwx 1 root root 0 Sep 23 19:53 user -> user:[4026531837]
lrwxrwxrwx 1 root root 0 Sep 23 19:53 uts -> uts:[4026531838]
```

### clone

clone是Linux的系统调用函数，用于创建一个新的进程。

clone和fork比较类似，但更为精细化，比如说使用clone创建出的子进程可以共享父进程的虚拟地址空间，文件描述符表，信号处理表等等。不过这里要强调的是，clone函数还能为新进程指定命名空间。

clone的语法：

```bash
 #define _GNU_SOURCE
#include <sched.h>

int clone(int (*fn)(void *), void *child_stack,
        int flags, void *arg, ...
        /* pid_t *ptid, void *newtls, pid_t *ctid */ );

```

其中flags即可指定命名空间，包括：

- CLONE_NEWCGROUP：cgroup
- CLONE_NEWIPC：ipc
- CLONE_NEWNET：net
- CLONE_NEWNS：mount
- CLONE_NEWPID：pid
- CLONE_NEWUSER：user
- CLONE_NEWUTS：uts

使用示例：

```bash
pid = clone(childFunc, stackTop, CLONE_NEWUTS | SIGCHLD, argv[1]);
```

### setns

clone用于创建新的命令空间，而setns则用来让当前线程（单线程即进程）加入一个命名空间。

语法：

```bash
#define _GNU_SOURCE             /* See feature_test_macros(7) */
#include <sched.h>

int setns(int fd, int nstype);

fd参数是一个指向一个命名空间的文件描述符，位于/proc/PID/ns/目录。

nstype指定了允许进入的命名空间，一般可设置为0，表示允许进入所有命名空间。
```

因此，往往该函数的用法为：

1. 调用setns函数：指定该线程的命名空间。
2. 调用execvp函数：执行指定路径的程序，创建子进程并替换父进程。

这样，就可以指定命名空间运行新的程序了。

代码示例：

```c
#define _GNU_SOURCE
#include <fcntl.h>
#include <sched.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>

#define  errExit(msg)    do { perror(msg); exit(EXIT_FAILURE); \
                        } while (0)

int
main(int argc, char *argv[])
{
    int fd;

    if (argc < 3) {
        fprintf(stderr, "%s /proc/PID/ns/FILE cmd args...\n", argv[0]);
        exit(EXIT_FAILURE);
    }

    fd = open(argv[1], O_RDONLY); /* Get file descriptor for namespace */
    if (fd == -1)
        errExit("open");

    if (setns(fd, 0) == -1)       /* Join that namespace */
        errExit("setns");

    execvp(argv[2], &argv[2]);    /* Execute a command in namespace */
    errExit("execvp");
}
```

使用示例：

```bash
./ns_exec /proc/3550/ns/uts /bin/bash
```

### nsenter

那么，最后就是nsenter了，nsenter相当于在setns的示例程序之上做了一层封装，使我们无需指定命名空间的文件描述符，而是指定进程号即可。

指定进程号PID以及需要进入的命名空间后，nsenter会帮我们找到对应的命名空间文件描述符`/proc/PID/ns/FD`，然后使用该命名空间运行新的程序。

## 监控 ipvs 命令

```bash
watch -n 0.5 "sudo nsenter --net=/var/run/docker/netns/ingress_sbox cat /proc/net/ip_vs_conn | grep TIME_WAIT | wc -l"

nsenter --net=/var/run/docker/netns/ingress_sbox ipvsadm -l

nsenter --net=/var/run/docker/netns/ingress_sbox cat /proc/net/ip_vs_conn | head
```

## 参考

- 容器内抓包定位网络问题：https://tencentcloudcontainerteam.github.io/tke-handbook/skill/capture-packets-in-container.html
- man-page：nsenter：http://www.man7.org/linux/man-pages/man1/nsenter.1.html#top_of_page
- man-page：clone：http://www.man7.org/linux/man-pages/man2/clone.2.html
- man-page：setns：http://www.man7.org/linux/man-pages/man2/setns.2.html
