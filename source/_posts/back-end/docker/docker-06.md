---
title: 重学 Docker 之 容器进阶（三）
date: 2021-04-17 15:00:00
categories: Docker
tags:
  - docker
---

容器存储

<!--more-->

## 容器文件系统：我在容器中读写文件怎么变慢了？

这个问题具体是我们在宿主机上，把 Linux 从 ubuntu18.04 升级到 ubuntu20.04 之后发现的。

在我们做了宿主机的升级后，启动了一个容器，在容器里用 fio 这个磁盘性能测试工具，想看一下容器里文件的读写性能。结果我们很惊讶地发现，在 ubuntu 20.04 宿主机上的容器中文件读写的性能只有 ubuntu18.04 宿主机上的 1/8 左右了，那这是怎么回事呢？

### 问题再现

这里我提醒一下你，因为涉及到两个 Linux 的虚拟机，问题再现这里我为你列出了关键的结果输出截图，不方便操作的同学可以重点看其中的思路。

我们可以先启动一个 ubuntu18.04 的虚拟机，它的 Linux 内核版本是 4.15 的，然后在虚拟机上用命令 docker run -it ubuntu:18.04 bash 启动一个容器，接着在容器里运行 fio 这条命令，看一下在容器中读取文件的性能。

```bash
# fio -direct=1 -iodepth=64 -rw=read -ioengine=libaio -bs=4k -size=10G -numjobs=1  -name=./fio.test
```

这里我给你解释一下 fio 命令中的几个主要参数：

第一个参数是"-direct=1"，代表采用非 buffered I/O 文件读写的方式，避免文件读写过程中内存缓冲对性能的影响。

接着我们来看这"-iodepth=64"和"-ioengine=libaio"这两个参数，这里指文件读写采用异步 I/O（Async I/O）的方式，也就是进程可以发起多个 I/O 请求，并且不用阻塞地等待 I/O 的完成。稍后等 I/O 完成之后，进程会收到通知。

这种异步 I/O 很重要，因为它可以极大地提高文件读写的性能。在这里我们设置了同时发出 64 个 I/O 请求。

然后是"-rw=read，-bs=4k，-size=10G"，这几个参数指这个测试是个读文件测试，每次读 4KB 大小数块，总共读 10GB 的数据。

最后一个参数是"-numjobs=1"，指只有一个进程 / 线程在运行。

所以，这条 fio 命令表示我们通过异步方式读取了 10GB 的磁盘文件，用来计算文件的读取性能。

那我们看到在 ubuntu 18.04，内核 4.15 上的容器 I/O 性能是 584MB/s 的带宽，IOPS（I/O per second）是 150K 左右。

![1][1]

同样我们再启动一个 ubuntu 20.04，内核 5.4 的虚拟机，然后在它的上面也启动一个容器。

我们运行 docker run -it ubuntu:20.04 bash ，接着在容器中使用同样的 fio 命令，可以看到它的 I/O 性能是 70MB 带宽，IOPS 是 18K 左右。实践证明，这的确比老版本的 ubuntu 18.04 差了很多。

![2][2]

### 知识详解

### 如何理解容器文件系统？

刚才我们对比了升级前后的容器读写性能差异，那想要分析刚刚说的这个性能的差异，我们需要先理解容器的文件系统。

我们在容器里，运行  df 命令，你可以看到在容器中根目录 (/) 的文件系统类型是"overlay"，它不是我们在普通 Linux 节点上看到的 Ext4 或者 XFS 之类常见的文件系统。

那么看到这里你肯定想问，Overlay 是一个什么样的文件系统呢，容器为什么要用这种文件系统？别急，我会一步一步带你分析。

![3][3]

在说容器文件系统前，我们先来想象一下如果没有文件系统管理的话会怎样。假设有这么一个场景，在一个宿主机上需要运行 100 个容器。

在前面，我们就说过每个容器都需要一个镜像，这个镜像就把容器中程序需要运行的二进制文件，库文件，配置文件，其他的依赖文件等全部都打包成一个镜像文件。

如果没有特别的容器文件系统，只是普通的 Ext4 或者 XFS 文件系统，那么每次启动一个容器，就需要把一个镜像文件下载并且存储在宿主机上。

我举个例子帮你理解，比如说，假设一个镜像文件的大小是 500MB，那么 100 个容器的话，就需要下载 500MB*100= 50GB 的文件，并且占用 50GB 的磁盘空间。

如果你再分析一下这 50GB 里的内容，你会发现，在绝大部分的操作系统里，库文件都是差不多的。而且，在容器运行的时候，这类文件也不会被改动，基本上都是只读的。

特别是这样的情况：假如这 100 个容器镜像都是基于"ubuntu:18.04"的，每个容器镜像只是额外复制了 50MB 左右自己的应用程序到"ubuntu: 18.04"里，那么就是说在总共 50GB 的数据里，有 90% 的数据是冗余的。

讲到这里，你不难推测出理想的情况应该是什么样的？

没错，当然是在一个宿主机上只要下载并且存储存一份"ubuntu:18.04"，所有基于"ubuntu:18.04"镜像的容器都可以共享这一份通用的部分。这样设置的话，不同容器启动的时候，只需要下载自己独特的程序部分就可以。就像下面这张图展示的这样。

![4][4]

**正是为了有效地减少磁盘上冗余的镜像数据，同时减少冗余的镜像数据在网络上的传输，选择一种针对于容器的文件系统是很有必要的，而这类的文件系统被称为 UnionFS。**

UnionFS 这类文件系统实现的主要功能是把多个目录（处于不同的分区）一起挂载（mount）在一个目录下。这种多目录挂载的方式，正好可以解决我们刚才说的容器镜像的问题。

比如，我们可以把 ubuntu18.04 这个基础镜像的文件放在一个目录 ubuntu18.04/ 下，容器自己额外的程序文件 app_1_bin 放在 app_1/ 目录下。

然后，我们把这两个目录挂载到 container_1/ 这个目录下，作为容器 1 看到的文件系统；对于容器 2，就可以把 ubuntu18.04/ 和 app_2/ 两个目录一起挂载到 container_2 的目录下。

这样在节点上我们只要保留一份 ubuntu18.04 的文件就可以了。

![5][50]

### OverlayFS

UnionFS 类似的有很多种实现，包括在 Docker 里最早使用的 AUFS，还有目前我们使用的 OverlayFS。前面我们在运行df的时候，看到的文件系统类型"overlay"指的就是 OverlayFS。

在 Linux 内核 3.18 版本中，OverlayFS 代码正式合入 Linux 内核的主分支。在这之后，OverlayFS 也就逐渐成为各个主流 Linux 发行版本里缺省使用的容器文件系统了。

网上 Julia Evans 有个blog，里面有个的 OverlayFS 使用的例子，很简单，我们也拿这个例子来理解一下 OverlayFS 的一些基本概念。

你可以先执行一下这一组命令。

```bash
#!/bin/bash
umount ./merged
rm upper lower merged work -r
mkdir upper lower merged work
echo "I'm from lower!" > lower/in_lower.txt
echo "I'm from upper!" > upper/in_upper.txt
# `in_both` is in both directories
echo "I'm from lower!" > lower/in_both.txt
echo "I'm from upper!" > upper/in_both.txt
sudo mount -t overlay overlay \
 -o lowerdir=./lower,upperdir=./upper,workdir=./work \
 ./merged
```

我们可以看到，OverlayFS 的一个 mount 命令牵涉到四类目录，分别是 lower，upper，merged 和 work，那它们是什么关系呢？

我们看下面这张图，这和前面 UnionFS 的工作示意图很像，也不奇怪，OverlayFS 就是 UnionFS 的一种实现。接下来，我们从下往上依次看看每一层的功能。

首先，最下面的"lower/"，也就是被 mount 两层目录中底下的这层（lowerdir）。

在 OverlayFS 中，最底下这一层里的文件是不会被修改的，你可以认为它是只读的。我还想提醒你一点，在这个例子里我们只有一个 lower/ 目录，不过 OverlayFS 是支持多个 lowerdir 的。

然后我们看"uppder/"，它是被 mount 两层目录中上面的这层 （upperdir）。在 OverlayFS 中，如果有文件的创建，修改，删除操作，那么都会在这一层反映出来，它是可读写的。

接着是最上面的"merged"  ，它是挂载点（mount point）目录，也是用户看到的目录，用户的实际文件操作在这里进行。

其实还有一个"work/"，这个目录没有在这个图里，它只是一个存放临时文件的目录，OverlayFS 中如果有文件修改，就会在中间过程中临时存放文件到这里。

![6][6]

从这个例子我们可以看到，OverlayFS 会 mount 两层目录，分别是 lower 层和 upper 层，这两层目录中的文件都会映射到挂载点上。

从挂载点的视角看，upper 层的文件会覆盖 lower 层的文件，比如"in_both.txt"这个文件，在 lower 层和 upper 层都有，但是挂载点 merged/ 里看到的只是 upper 层里的 in_both.txt.

如果我们在 merged/ 目录里做文件操作，具体包括这三种。

第一种，新建文件，这个文件会出现在 upper/ 目录中。

第二种是删除文件，如果我们删除"in_upper.txt"，那么这个文件会在 upper/ 目录中消失。如果删除"in_lower.txt", 在 lower/ 目录里的"in_lower.txt"文件不会有变化，只是在 upper/ 目录中增加了一个特殊文件来告诉 OverlayFS，"in_lower.txt'这个文件不能出现在 merged/ 里了，这就表示它已经被删除了。

![7][7]

还有一种操作是修改文件，类似如果修改"in_lower.txt"，那么就会在 upper/ 目录中新建一个"in_lower.txt"文件，包含更新的内容，而在 lower/ 中的原来的实际文件"in_lower.txt"不会改变。

通过这个例子，我们知道了 OverlayFS 是怎么工作了。那么我们可以再想一想，怎么把它运用到容器的镜像文件上？

其实也不难，从系统的 mounts 信息中，我们可以看到 Docker 是怎么用 OverlayFS 来挂载镜像文件的。容器镜像文件可以分成多个层（layer），每层可以对应 OverlayFS 里 lowerdir 的一个目录，lowerdir 支持多个目录，也就可以支持多层的镜像文件。

在容器启动后，对镜像文件中修改就会被保存在 upperdir 里了。

![8][8]

### 解决问题

在理解了容器使用的 OverlayFS 文件系统后，我们再回到开始的问题，为什么在宿主机升级之后，在容器里读写文件的性能降低了？现在我们至少应该知道，在容器中读写文件性能降低了，那么应该是 OverlayFS 的性能在新的 ubuntu20.04 中降低了。

要找到问题的根因，我们还需要进一步的 debug。对于性能问题，我们需要使用 Linux 下的 perf 工具来查看一下，具体怎么使用 perf 来解决问题，我们会在后面讲解。

这里你只要看一下结果就可以了，自下而上是函数的一个调用顺序。通过 perf 工具，我们可以比较在容器中运行 fio 的时候，ubuntu 18.04 和 ubuntu 20.04 在内核函数调用上的不同。

![ubuntu 18.04 (Linux内核4.15)环境下使用perf输出的函数调用结果][9]

![ubuntu 20.04 (Linux内核 5.4)环境下使用perf输出的函数调用结果][10]

我们从系统调用框架之后的函数 aio_read() 开始比较：Linux 内核 4.15 里 aio_read() 之后调用的是 xfs_file_read_iter()，而在 Linux 内核 5.4 里，aio_read() 之后调用的是 ovl_read_iter() 这个函数，之后再调用 xfs_file_read_iter()。

这样我们就可以去查看一下，在内核 4.15 之后新加入的这个函数 ovl_read_iter() 的代码。

查看代码后我们就能明白，Linux 为了完善 OverlayFS，增加了 OverlayFS 自己的 read/write 函数接口，从而不再直接调用 OverlayFS 后端文件系统（比如 XFS，Ext4）的读写接口。但是它只实现了同步 I/O（sync I/O），并没有实现异步 I/O。

而在 fio 做文件系统性能测试的时候使用的是异步 I/O，这样才可以得到文件系统的性能最大值。所以，在内核 5.4 上就无法对 OverlayFS 测出最高的性能指标了。

在 Linux 内核 5.6 版本中，这个问题已经通过下面的这个补丁给解决了，有兴趣的同学可以看一下。

```bash
commit 2406a307ac7ddfd7effeeaff6947149ec6a95b4e
Author: Jiufei Xue <jiufei.xue@linux.alibaba.com>
Date:   Wed Nov 20 17:45:26 2019 +0800
 
    ovl: implement async IO routines
 
    A performance regression was observed since linux v4.19 with aio test using
    fio with iodepth 128 on overlayfs.  The queue depth of the device was
    always 1 which is unexpected.
 
    After investigation, it was found that commit 16914e6fc7e1 ("ovl: add
    ovl_read_iter()") and commit 2a92e07edc5e ("ovl: add ovl_write_iter()")
    resulted in vfs_iter_{read,write} being called on underlying filesystem,
    which always results in syncronous IO.
 
    Implement async IO for stacked reading and writing.  This resolves the
    performance regresion.
 
    This is implemented by allocating a new kiocb for submitting the AIO
    request on the underlying filesystem.  When the request is completed, the
    new kiocb is freed and the completion callback is called on the original
    iocb.
 
    Signed-off-by: Jiufei Xue <jiufei.xue@linux.alibaba.com>
    Signed-off-by: Miklos Szeredi <mszeredi@redhat.com>
```

<!--

### 重点总结

这一讲，我们最主要的内容是理解容器文件系统。为什么要有容器自己的文件系统？很重要的一点是**减少相同镜像文件在同一个节点上的数据冗余，可以节省磁盘空间，也可以减少镜像文件下载占用的网络资源。**

作为容器文件系统，UnionFS 通过多个目录挂载的方式工作。OverlayFS 就是 UnionFS 的一种实现，是目前主流 Linux 发行版本中缺省使用的容器文件系统。

OverlayFS 也是把多个目录合并挂载，被挂载的目录分为两大类：lowerdir 和 upperdir。

lowerdir 允许有多个目录，在被挂载后，这些目录里的文件都是不会被修改或者删除的，也就是只读的；upperdir 只有一个，不过这个目录是可读写的，挂载点目录中的所有文件修改都会在 upperdir 中反映出来。

容器的镜像文件中各层正好作为 OverlayFS 的 lowerdir 的目录，然后加上一个空的 upperdir 一起挂载好后，就组成了容器的文件系统。

OverlayFS 在 Linux 内核中还在不断的完善，比如我们在这一讲看到的在 kenel 5.4 中对异步 I/O 操作的缺失，这也是我们在使用容器文件系统的时候需要注意的。

-->

## 容器文件Quota：容器为什么把宿主机的磁盘写满了？

我们学习了容器文件系统 OverlayFS，这个 OverlayFS 有两层，分别是 lowerdir 和 upperdir。lowerdir 里是容器镜像中的文件，对于容器来说是只读的；upperdir 存放的是容器对文件系统里的所有改动，它是可读写的。

从宿主机的角度看，upperdir 就是一个目录，如果容器不断往容器文件系统中写入数据，实际上就是往宿主机的磁盘上写数据，这些数据也就存在于宿主机的磁盘目录中。

当然对于容器来说，如果有大量的写操作是不建议写入容器文件系统的，一般是需要给容器挂载一个 volume，用来满足大量的文件读写。

但是不能避免的是，用户在容器中运行的程序有错误，或者进行了错误的配置。

比如说，我们把 log 写在了容器文件系统上，并且没有做 log rotation，那么时间一久，就会导致宿主机上的磁盘被写满。这样影响的就不止是容器本身了，而是整个宿主机了。

那对于这样的问题，我们该怎么解决呢？

### 问题再现

我们可以自己先启动一个容器，一起试试不断地往容器文件系统中写入数据，看看是一个什么样的情况。

用 Docker 启动一个容器后，我们看到容器的根目录 (/) 也就是容器文件系统 OverlayFS，它的大小是 160G，已经使用了 100G。其实这个大小也是宿主机上的磁盘空间和使用情况。

![11][11]

这时候，我们可以回到宿主机上验证一下，就会发现宿主机的根目录 (/) 的大小也是 160G，同样是使用了 100G。

![12][12]

好，那现在我们再往容器的根目录里写入 10GB 的数据。

这里我们可以看到容器的根目录使用的大小增加了，从刚才的 100G 变成现在的 110G。而多写入的 10G 大小的数据，对应的是 test.log 这个文件。

![13][13]

接下来，我们再回到宿主机上，可以看到宿主机上的根目录 (/) 里使用的大小也是 110G 了。

![14][14]

我们还是继续看宿主机，看看 OverlayFS 里 upperdir 目录中有什么文件？

这里我们仍然可以通过 /proc/mounts 这个路径，找到容器 OverlayFS 对应的 lowerdir 和 upperdir。因为写入的数据都在 upperdir 里，我们就只要看 upperdir 对应的那个目录就行了。果然，里面存放着容器写入的文件 test.log，它的大小是 10GB。

![15][15]

通过这个例子，我们已经验证了在容器中对于 OverlayFS 中写入数据，**其实就是往宿主机的一个目录（upperdir）里写数据。**我们现在已经写了 10GB 的数据，如果继续在容器中写入数据，结果估计你也知道了，就是会写满宿主机的磁盘。

那遇到这种情况，我们该怎么办呢？

### 知识详解

容器写自己的 OverlayFS 根目录，结果把宿主机的磁盘写满了。发生这个问题，我们首先就会想到需要对容器做限制，限制它写入自己 OverlayFS 的数据量，比如只允许一个容器写 100MB 的数据。

不过我们实际查看 OverlayFS 文件系统的特性，就会发现没有直接限制文件写入量的特性。别担心，在没有现成工具的情况下，我们只要搞懂了原理，就能想出解决办法。

所以我们再来分析一下 OverlayFS，它是通过 lowerdir 和 upperdir 两层目录联合挂载来实现的，lowerdir 是只读的，数据只会写在 upperdir 中。

那我们是不是可以通过限制 upperdir 目录容量的方式，来限制一个容器 OverlayFS 根目录的写入数据量呢？

沿着这个思路继续往下想，因为 upperdir 在宿主机上也是一个普通的目录，这样就要看**宿主机上的文件系统是否可以支持对一个目录限制容量了。**

对于 Linux 上最常用的两个文件系统 XFS 和 ext4，它们有一个特性 Quota，那我们就以 XFS 文件系统为例，学习一下这个 Quota 概念，然后看看这个特性能不能限制一个目录的使用量。

### XFS Quota

在 Linux 系统里的 XFS 文件系统缺省都有 Quota 的特性，这个特性可以为 Linux 系统里的一个用户（user），一个用户组（group）或者一个项目（project）来限制它们使用文件系统的额度（quota），也就是限制它们可以写入文件系统的文件总量。

因为我们的目标是要限制一个目录中总体的写入文件数据量，那么显然给用户和用户组限制文件系统的写入数据量的模式，并不适合我们的这个需求。

因为同一个用户或者用户组可以操作多个目录，多个用户或者用户组也可以操作同一个目录，这样对一个用户或者用户组的限制，就很难用来限制一个目录。

那排除了限制用户或用户组的模式，我们再来看看 Project 模式。Project 模式是怎么工作的呢？

我举一个例子你会更好理解，对 Linux 熟悉的同学可以一边操作，一边体会一下它的工作方式。不熟悉的同学也没关系，可以重点关注我后面的讲解思路。

首先我们要使用 XFS Quota 特性，必须在文件系统挂载的时候加上对应的 Quota 选项，比如我们目前需要配置 Project Quota，那么这个挂载参数就是"pquota"。

对于根目录来说，**这个参数必须作为一个内核启动的参数"rootflags=pquota"，这样设置就可以保证根目录在启动挂载的时候，带上 XFS Quota 的特性并且支持 Project 模式。**

我们可以从 /proc/mounts 信息里，看看根目录是不是带"prjquota"字段。如果里面有这个字段，就可以确保文件系统已经带上了支持 project 模式的 XFS quota 特性。

![16][16]

下一步，我们还需要给一个指定的目录打上一个 Project ID。这个步骤我们可以使用 XFS 文件系统自带的工具 xfs_quota 来完成，然后执行下面的这个命令就可以了。

执行命令之前，我先对下面的命令和输出做两点解释，让你理解这个命令的含义。

第一点，新建的目录 /tmp/xfs_prjquota，我们想对它做 Quota 限制。所以在这里要对它打上一个 Project ID。

第二点，通过 xfs_quota 这条命令，我们给 /tmp/xfs_prjquota 打上 Project ID 值 101，这个 101 是我随便选的一个数字，就是个 ID 标识，你先有个印象。在后面针对 Project 进行 Quota 限制的时候，我们还会用到这个 ID。

```bash
# mkdir -p  /tmp/xfs_prjquota
# xfs_quota -x -c 'project -s -p /tmp/xfs_prjquota 101' /
Setting up project 101 (path /tmp/xfs_prjquota)...
Processed 1 (/etc/projects and cmdline) paths for project 101 with recursion depth infinite (-1).
```

最后，我们还是使用 xfs_quota 命令，对 101（我们刚才建立的这个 Project ID）做 Quota 限制。

你可以执行下面这条命令，里面的"-p bhard=10m 101"就代表限制 101 这个 project ID，限制它的数据块写入量不能超过 10MB。

```bash
# xfs_quota -x -c 'limit -p bhard=10m 101' /
```

做好限制之后，我们可以尝试往 /tmp/xfs_prjquota 写数据，看看是否可以超过 10MB。比如说，我们尝试写入 20MB 的数据到 /tmp/xfs_prjquota 里。

我们可以看到，执行 dd 写入命令，就会有个出错返回信息"No space left on device"。这表示已经不能再往这个目录下写入数据了，而最后写入数据的文件 test.file 大小也停留在了 10MB。

```bash
# dd if=/dev/zero of=/tmp/xfs_prjquota/test.file bs=1024 count=20000
dd: error writing '/tmp/xfs_prjquota/test.file': No space left on device
10241+0 records in
10240+0 records out
10485760 bytes (10 MB, 10 MiB) copied, 0.0357122 s, 294 MB/s
# ls -l /tmp/xfs_prjquota/test.file
-rw-r--r-- 1 root root 10485760 Oct 31 10:00 /tmp/xfs_prjquota/test.file
```

好了，做到这里，我们发现使用 XFS Quota 的 Project 模式，确实可以限制一个目录里的写入数据量，它实现的方式其实也不难，就是下面这两步。

第一步，给目标目录打上一个 Project ID，这个 ID 最终是写到目录对应的 inode 上。

这里我解释一下，inode 是文件系统中用来描述一个文件或者一个目录的元数据，里面包含文件大小，数据块的位置，文件所属用户 / 组，文件读写属性以及其他一些属性。

那么一旦目录打上这个 ID 之后，在这个目录下的新建的文件和目录也都会继承这个 ID。

第二步，在 XFS 文件系统中，我们需要给这个 project ID 设置一个写入数据块的限制。

有了 ID 和限制值之后，文件系统就可以统计所有带这个 ID 文件的数据块大小总和，并且与限制值进行比较。一旦所有文件大小的总和达到限制值，文件系统就不再允许更多的数据写入了。

用一句话概括，XFS Quota 就是通过前面这两步限制了一个目录里写入的数据量。

### 解决问题

我们理解了 XFS Quota 对目录限流的机制之后，再回到我们最开始的问题，如何确保容器不会写满宿主机上的磁盘。

你应该已经想到了，方法就是**对 OverlayFS 的 upperdir 目录做 XFS Quota 的限流**，没错，就是这个解决办法！

其实 Docker 也已经实现了限流功能，也就是用 XFS Quota 来限制容器的 OverlayFS 大小。

我们在用 docker run 启动容器的时候，加上一个参数 --storage-opt size= <SIZE> ，就能限制住容器 OverlayFS 文件系统可写入的最大数据量了。

我们可以一起试一下，这里我们限制的 size 是 10MB。

进入容器之后，先运行 df -h 命令，这时候你可以看到根目录 (/)overlayfs 文件系统的大小就 10MB，而不是我们之前看到的 160GB 的大小了。这样容器在它的根目录下，最多只能写 10MB 数据，就不会把宿主机的磁盘给写满了。

![17][17]

完成了上面这个小试验之后，我们可以再看一下 Docker 的代码，看看它的实现是不是和我们想的一样。

Docker 里SetQuota()函数就是用来实现 XFS Quota 限制的，我们可以看到它里面最重要的两步，分别是 setProjectID 和 setProjectQuota 。

其实，这两步做的就是我们在基本概念中提到的那两步：

第一步，给目标目录打上一个 Project ID；第二步，为这个 Project ID 在 XFS 文件系统中，设置一个写入数据块的限制。

```go
// SetQuota - assign a unique project id to directory and set the quota limits
// for that project id
func (q *Control) SetQuota(targetPath string, quota Quota) error {
        q.RLock()
        projectID, ok := q.quotas[targetPath]
        q.RUnlock()
        if !ok {
                q.Lock()
                projectID = q.nextProjectID
                //
                // assign project id to new container directory
                //
                err := setProjectID(targetPath, projectID)
                if err != nil {
                        q.Unlock()
                        return err
                }
                q.quotas[targetPath] = projectID
                q.nextProjectID++
                q.Unlock()
        }
 
        //
        // set the quota limit for the container's project id
        //
        logrus.Debugf("SetQuota(%s, %d): projectID=%d", targetPath, quota.Size, projectID)
        return setProjectQuota(q.backingFsBlockDev, projectID, quota)
}
```

那 setProjectID 和  setProjectQuota 是如何实现的呢？

你可以进入到这两个函数里看一下，**它们分别调用了 ioctl() 和 quotactl() 这两个系统调用来修改内核中 XFS 的数据结构，从而完成 project ID 的设置和 Quota 值的设置。**具体的细节，我不在这里展开了，如果你有兴趣，可以继续去查看内核中对应的代码。

好了，Docker 里 XFS Quota 操作的步骤完全和我们先前设想的一样，那么还有最后一个问题要解决，XFS Quota 限制的目录是哪一个？

这个我们可以根据 /proc/mounts 中容器的 OverlayFS Mount 信息，再结合 Docker 的代码，就可以知道限制的目录是"/var/lib/docker/overlay2/<docker_id>"。那这个目录下有什么呢？果然 upperdir 目录中有对应的"diff"目录，就在里面！

![18][18]

讲到这里，我想你已经清楚了对于使用 OverlayFS 的容器，我们应该如何去防止它把宿主机的磁盘给写满了吧？**方法就是对 OverlayFS 的 upperdir 目录做 XFS Quota 的限流。**

<!--

### 重点总结

我们这一讲的问题是，容器写了大量数据到 OverlayFS 文件系统的根目录，在这个情况下，就会把宿主机的磁盘写满。

由于 OverlayFS 自己没有专门的特性，可以限制文件数据写入量。这时我们通过实际试验找到了解决思路：依靠底层文件系统的 Quota 特性来限制 OverlayFS 的 upperdir 目录的大小，这样就能实现限制容器写磁盘的目的。

底层文件系统 XFS Quota 的 Project 模式，能够限制一个目录的文件写入量，这个功能具体是通过这两个步骤实现：

第一步，给目标目录打上一个 Project ID。

第二步，给这个 Project ID 在 XFS 文件系统中设置一个写入数据块的限制。

Docker 正是使用了这个方法，也就是**用 XFS Quota 来限制 OverlayFS 的 upperdir 目录**，通过这个方式控制容器 OverlayFS 的根目录大小。

当我们理解了这个方法后，对于不是用 Docker 启动的容器，比如直接由 containerd 启动起来的容器，也可以自己实现 XFS Quota 限制 upperdir 目录。这样就能有效控制容器对 OverlayFS 的写数据操作，避免宿主机的磁盘被写满。

-->

## 容器磁盘限速：我的容器里磁盘读写为什么不稳定?

前面，我们讲了如何通过 XFS Quota 来限制容器文件系统的大小，这是静态容量大小的一个限制。

你也许会马上想到，磁盘除了容量的划分，还有一个读写性能的问题。

具体来说，就是如果多个容器同时读写节点上的同一块磁盘，那么它们的磁盘读写相互之间影响吗？如果容器之间读写磁盘相互影响，我们有什么办法解决呢？

### 场景再现

我们先用这里的代码，运行一下 make image 来做一个带 fio 的容器镜像，fio 在我们之前提到过，它是用来测试磁盘文件系统读写性能的工具。

有了这个带 fio 的镜像，我们可以用它启动一个容器，在容器中运行 fio，就可以得到只有一个容器读写磁盘时的性能数据。

Makefile

```Makefile
all: image

image:
	docker build -t registry/fio:v1 .
clean:
	docker rmi registry/fio:v1
```

Dockerfile

```Dockerfile
FROM centos:8.1.1911

RUN yum install -y fio
```

```bash
mkdir -p /tmp/test1
docker stop fio_test1;docker rm fio_test1
docker run --name fio_test1 --volume /tmp/test1:/tmp  registery/fio:v1 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=1G -numjobs=1  -name=/tmp/fio_test1.log
```

上面的这个 Docker 命令，我给你简单地解释一下：在这里我们第一次用到了"--volume"这个参数。之前我们讲过容器文件系统，比如 OverlayFS。

不过容器文件系统并不适合频繁地读写。对于频繁读写的数据，容器需要把他们到放到"volume"中。这里的 volume 可以是一个本地的磁盘，也可以是一个网络磁盘。

在这个例子里我们就使用了宿主机本地磁盘，把磁盘上的 /tmp/test1 目录作为 volume 挂载到容器的 /tmp 目录下。

然后在启动容器之后，我们直接运行 fio 的命令，这里的参数和我们前面的例子差不多，只是这次我们运行的是 write，也就是写磁盘的操作，而写的目标盘就是挂载到 /tmp 目录的 volume。

可以看到，fio 的运行结果如下图所示，IOPS 是 18K，带宽 (BW) 是 70MB/s 左右。

![19][19]

好了，刚才我们模拟了一个容器写磁盘的性能。那么如果这时候有两个容器，都在往同一个磁盘上写数据又是什么情况呢？我们可以再用下面的这个脚本试一下：

```bash
mkdir -p /tmp/test1
mkdir -p /tmp/test2
docker stop fio_test1;docker rm fio_test1
docker stop fio_test2;docker rm fio_test2
docker run --name fio_test1 --volume /tmp/test1:/tmp  registery/fio:v1 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=1G -numjobs=1  -name=/tmp/fio_test1.log &
docker run --name fio_test2 --volume /tmp/test2:/tmp  registery/fio:v1 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=1G -numjobs=1  -name=/tmp/fio_test2.log &
```

这时候，我们看到的结果，在容器 fio_test1 里，IOPS 是 15K 左右，带宽是 59MB/s 了，比之前单独运行的时候性能下降了不少。

![20][20]

显然从这个例子中，我们可以看到多个容器同时写一块磁盘的时候，它的性能受到了干扰。那么有什么办法可以保证每个容器的磁盘读写性能呢？

之前，我们讨论过用 Cgroups 来保证容器的 CPU 使用率，以及控制 Memroy 的可用大小。那么你肯定想到了，我们是不是也可以用 Cgroups 来保证每个容器的磁盘读写性能？

没错，在 Cgroup v1 中有 blkio 子系统，它可以来限制磁盘的 I/O。不过 blkio 子系统对于磁盘 I/O 的限制，并不像 CPU，Memory 那么直接，下面我会详细讲解。

### 知识详解

### Blkio Cgroup

在讲解 blkio Cgroup 前，我们先简单了解一下衡量磁盘性能的**两个常见的指标 IOPS 和吞吐量（Throughput）**是什么意思，后面讲 Blkio Cgroup 的参数配置时会用到。

IOPS 是 Input/Output Operations Per Second 的简称，也就是每秒钟磁盘读写的次数，这个数值越大，当然也就表示性能越好。

吞吐量（Throughput）是指每秒钟磁盘中数据的读取量，一般以 MB/s 为单位。这个读取量可以叫作吞吐量，有时候也被称为带宽（Bandwidth）。刚才我们用到的 fio 显示结果就体现了带宽。

IOPS 和吞吐量之间是有关联的，在 IOPS 固定的情况下，如果读写的每一个数据块越大，那么吞吐量也越大，它们的关系大概是这样的：吞吐量 = 数据块大小 *IOPS。

好，那么我们再回到 blkio Cgroup 这个概念上，blkio Cgroup 也是 Cgroups 里的一个子系统。 在 Cgroups v1 里，blkio Cgroup 的虚拟文件系统挂载点一般在"/sys/fs/cgroup/blkio/"。

和我之前讲过的 CPU，memory Cgroup 一样，我们在这个"/sys/fs/cgroup/blkio/"目录下创建子目录作为控制组，再把需要做 I/O 限制的进程 pid 写到控制组的 cgroup.procs 参数中就可以了。

在 blkio Cgroup 中，有四个最主要的参数，它们可以用来限制磁盘 I/O 性能，我列在了下面。

```bash
blkio.throttle.read_iops_device
blkio.throttle.read_bps_device
blkio.throttle.write_iops_device
blkio.throttle.write_bps_device
```

前面我们刚说了磁盘 I/O 的两个主要性能指标 IOPS 和吞吐量，在这里，根据这四个参数的名字，估计你已经大概猜到它们的意思了。

没错，它们分别表示：磁盘读取 IOPS 限制，磁盘读取吞吐量限制，磁盘写入 IOPS 限制，磁盘写入吞吐量限制。

对于每个参数写入值的格式，你可以参考内核blkio 的文档。为了让你更好地理解，在这里我给你举个例子。

如果我们要对一个控制组做限制，限制它对磁盘 /dev/vdb 的写入吞吐量不超过 10MB/s，那么我们对 blkio.throttle.write_bps_device 参数的配置就是下面这个命令。

```bash
echo "252:16 10485760" > $CGROUP_CONTAINER_PATH/blkio.throttle.write_bps_device
```

在这个命令中，"252:16"是 /dev/vdb 的主次设备号，你可以通过 ls -l /dev/vdb 看到这两个值，而后面的"10485760"就是 10MB 的每秒钟带宽限制。

```bash
# ls -l /dev/vdb -l
brw-rw---- 1 root disk 252, 16 Nov  2 08:02 /dev/vdb
```

了解了 blkio Cgroup 的参数配置，我们再运行下面的这个例子，限制一个容器 blkio 的读写磁盘吞吐量，然后在这个容器里运行一下 fio，看看结果是什么。

```bash
mkdir -p /tmp/test1
rm -f /tmp/test1/*
docker stop fio_test1;docker rm fio_test1
docker run -d --name fio_test1 --volume /tmp/test1:/tmp  registery/fio:v1 sleep 3600
sleep 2
CONTAINER_ID=$(sudo docker ps --format "{{.ID}}\t{{.Names}}" | grep -i fio_test1 | awk '{print $1}')
echo $CONTAINER_ID
CGROUP_CONTAINER_PATH=$(find /sys/fs/cgroup/blkio/ -name "*$CONTAINER_ID*")
echo $CGROUP_CONTAINER_PATH
# To get the device major and minor id from /dev for the device that /tmp/test1 is on.
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH/blkio.throttle.read_bps_device
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH/blkio.throttle.write_bps_device
docker exec fio_test1 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=100MB -numjobs=1  -name=/tmp/fio_test1.log
docker exec fio_test1 fio -direct=1 -rw=read -ioengine=libaio -bs=4k -size=100MB -numjobs=1  -name=/tmp/fio_test1.log
```

在这里，我的机器上 /tmp/test1 所在磁盘主次设备号是”253:0”，你在自己运行这组命令的时候，需要把主次设备号改成你自己磁盘的对应值。

还有一点我要提醒一下，不同数据块大小，在性能测试中可以适用于不同的测试目的。但因为这里不是我们要讲的重点，所以为了方便你理解概念，这里就用固定值。

在我们后面的例子里，fio 读写的数据块都固定在 4KB。所以对于磁盘的性能限制，我们在 blkio Cgroup 里就只设置吞吐量限制了。

在加了 blkio Cgroup 限制 10MB/s 后，从 fio 运行后的输出结果里，我们可以看到这个容器对磁盘无论是读还是写，它的最大值就不会再超过 10MB/s 了。

![21][21]

![22][22]

在给每个容器都加了 blkio Cgroup 限制，限制为 10MB/s 后，即使两个容器同时在一个磁盘上写入文件，那么每个容器的写入磁盘的最大吞吐量，也不会互相干扰了。

我们可以用下面的这个脚本来验证一下。

```bash
#!/bin/bash
mkdir -p /tmp/test1
rm -f /tmp/test1/*
docker stop fio_test1;docker rm fio_test1
mkdir -p /tmp/test2
rm -f /tmp/test2/*
docker stop fio_test2;docker rm fio_test2
docker run -d --name fio_test1 --volume /tmp/test1:/tmp  registery/fio:v1 sleep 3600
docker run -d --name fio_test2 --volume /tmp/test2:/tmp  registery/fio:v1 sleep 3600
sleep 2
CONTAINER_ID1=$(sudo docker ps --format "{{.ID}}\t{{.Names}}" | grep -i fio_test1 | awk '{print $1}')
echo $CONTAINER_ID1
CGROUP_CONTAINER_PATH1=$(find /sys/fs/cgroup/blkio/ -name "*$CONTAINER_ID1*")
echo $CGROUP_CONTAINER_PATH1
# To get the device major and minor id from /dev for the device that /tmp/test1 is on.
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH1/blkio.throttle.read_bps_device
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH1/blkio.throttle.write_bps_device
CONTAINER_ID2=$(sudo docker ps --format "{{.ID}}\t{{.Names}}" | grep -i fio_test2 | awk '{print $1}')
echo $CONTAINER_ID2
CGROUP_CONTAINER_PATH2=$(find /sys/fs/cgroup/blkio/ -name "*$CONTAINER_ID2*")
echo $CGROUP_CONTAINER_PATH2
# To get the device major and minor id from /dev for the device that /tmp/test1 is on.
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH2/blkio.throttle.read_bps_device
echo "253:0 10485760" > $CGROUP_CONTAINER_PATH2/blkio.throttle.write_bps_device
docker exec fio_test1 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=100MB -numjobs=1  -name=/tmp/fio_test1.log &
docker exec fio_test2 fio -direct=1 -rw=write -ioengine=libaio -bs=4k -size=100MB -numjobs=1  -name=/tmp/fio_test2.log &
```

我们还是看看 fio 运行输出的结果，这时候，fio_test1 和 fio_test2 两个容器里执行的结果都是 10MB/s 了。

![23][23]

![24][24]

那么做到了这一步，我们是不是就可以认为，blkio Cgroup 可以完美地对磁盘 I/O 做限制了呢？

你先别急，我们可以再做个试验，把前面脚本里 fio 命令中的 “-direct=1” 给去掉，也就是不让 fio 运行在 Direct I/O 模式了，而是用 Buffered I/O 模式再运行一次，看看 fio 执行的输出。

同时我们也可以运行 iostat 命令，查看实际的磁盘写入速度。

这时候你会发现，即使我们设置了 blkio Cgroup，也根本不能限制磁盘的吞吐量了。

### Direct I/O 和 Buffered I/O

为什么会这样的呢？这就要提到 Linux 的两种文件 I/O 模式了：Direct I/O 和 Buffered I/O。

Direct I/O 模式，用户进程如果要写磁盘文件，就会通过 Linux 内核的文件系统层 (filesystem) -> 块设备层 (block layer) -> 磁盘驱动 -> 磁盘硬件，这样一路下去写入磁盘。

而如果是 Buffered I/O 模式，那么用户进程只是把文件数据写到内存中（Page Cache）就返回了，而 Linux 内核自己有线程会把内存中的数据再写入到磁盘中。**在 Linux 里，由于考虑到性能问题，绝大多数的应用都会使用 Buffered I/O 模式。**

![25][25]

我们通过前面的测试，发现 Direct I/O 可以通过 blkio Cgroup 来限制磁盘 I/O，但是 Buffered I/O 不能被限制。

那通过上面的两种 I/O 模式的解释，你是不是可以想到原因呢？是的，原因就是被 Cgroups v1 的架构限制了。

我们已经学习过了 v1 的 CPU Cgroup，memory Cgroup 和 blkio Cgroup，那么 Cgroup v1 的一个整体结构，你应该已经很熟悉了。它的每一个子系统都是独立的，资源的限制只能在子系统中发生。

就像下面图里的进程 pid_y，它可以分别属于 memory Cgroup 和 blkio Cgroup。但是在 blkio Cgroup 对进程 pid_y 做磁盘 I/O 做限制的时候，blkio 子系统是不会去关心 pid_y 用了哪些内存，哪些内存是不是属于 Page Cache，而这些 Page Cache 的页面在刷入磁盘的时候，产生的 I/O 也不会被计算到进程 pid_y 上面。

就是这个原因，导致了 blkio 在 Cgroups v1 里不能限制 Buffered I/O。

![26][26]

这个 Buffered I/O 限速的问题，在 Cgroup V2 里得到了解决，其实这个问题也是促使 Linux 开发者重新设计 Cgroup V2 的原因之一。

## Cgroup V2

Cgroup v2 相比 Cgroup v1 做的最大的变动就是一个进程属于一个控制组，而每个控制组里可以定义自己需要的多个子系统。

比如下面的 Cgroup V2 示意图里，进程 pid_y 属于控制组 group2，而在 group2 里同时打开了 io 和 memory 子系统 （Cgroup V2 里的 io 子系统就等同于 Cgroup v1 里的 blkio 子系统）。

那么，Cgroup 对进程 pid_y 的磁盘 I/O 做限制的时候，就可以考虑到进程 pid_y 写入到 Page Cache 内存的页面了，这样 buffered I/O 的磁盘限速就实现了。

![27][27]

下面我们在 Cgroup v2 里，尝试一下设置了 blkio Cgroup+Memory Cgroup 之后，是否可以对 Buffered I/O 进行磁盘限速。

我们要做的第一步，就是在 Linux 系统里打开 Cgroup v2 的功能。因为目前即使最新版本的 Ubuntu Linux 或者 Centos Linux，仍然在使用 Cgroup v1 作为缺省的 Cgroup。

打开方法就是配置一个 kernel 参数"cgroup_no_v1=blkio,memory"，这表示把 Cgroup v1 的 blkio 和 Memory 两个子系统给禁止，这样 Cgroup v2 的 io 和 Memory 这两个子系统就打开了。

我们可以把这个参数配置到 grub 中，然后我们重启 Linux 机器，这时 Cgroup v2 的 io 还有 Memory 这两个子系统，它们的功能就打开了。

系统重启后，我们会看到 Cgroup v2 的虚拟文件系统被挂载到了 /sys/fs/cgroup/unified 目录下。

然后，我们用下面的这个脚本做 Cgroup v2 io 的限速配置，并且运行 fio，看看 buffered I/O 是否可以被限速。

```bash
# Create a new control group
mkdir -p /sys/fs/cgroup/unified/iotest
# enable the io and memory controller subsystem
echo "+io +memory" > /sys/fs/cgroup/unified/cgroup.subtree_control
# Add current bash pid in iotest control group.
# Then all child processes of the bash will be in iotest group too,
# including the fio
echo $$ >/sys/fs/cgroup/unified/iotest/cgroup.procs
# 256:16 are device major and minor ids, /mnt is on the device.
echo "252:16 wbps=10485760" > /sys/fs/cgroup/unified/iotest/io.max
cd /mnt
#Run the fio in non direct I/O mode
fio -iodepth=1 -rw=write -ioengine=libaio -bs=4k -size=1G -numjobs=1  -name=./fio.test
```

在这个例子里，我们建立了一个名叫 iotest 的控制组，并且在这个控制组里加入了 io 和 Memory 两个控制子系统，对磁盘最大吞吐量的设置为 10MB。运行 fio 的时候不加"-direct=1"，也就是让 fio 运行在 buffered I/O 模式下。

运行 fio 写入 1GB 的数据后，你会发现 fio 马上就执行完了，因为系统上有足够的内存，fio 把数据写入内存就返回了，不过只要你再运行”iostat -xz 10” 这个命令，你就可以看到磁盘 vdb 上稳定的写入速率是 10240wkB/s，也就是我们在 io Cgroup 里限制的 10MB/s。

![28][28]

看到这个结果，我们证实了 Cgoupv2 io+Memory 两个子系统一起使用，就可以对 buffered I/O 控制磁盘写入速率。

<!--

### 重点总结

这一讲，我们主要想解决的问题是如何保证容器读写磁盘速率的稳定，特别是当多个容器同时读写同一个磁盘的时候，需要减少相互的干扰。

Cgroup V1 的 blkiio 控制子系统，可以用来限制容器中进程的读写的 IOPS 和吞吐量（Throughput），但是它只能对于 Direct I/O 的读写文件做磁盘限速，对 Buffered I/O 的文件读写，它无法进行磁盘限速。

**这是因为 Buffered I/O 会把数据先写入到内存 Page Cache 中，然后由内核线程把数据写入磁盘，而 Cgroup v1 blkio 的子系统独立于 memory 子系统，无法统计到由 Page Cache 刷入到磁盘的数据量。**

这个 Buffered I/O 无法被限速的问题，在 Cgroup v2 里被解决了。Cgroup v2 从架构上允许一个控制组里有多个子系统协同运行，这样在一个控制组里只要同时有 io 和 Memory 子系统，就可以对 Buffered I/O 作磁盘读写的限速。

虽然 Cgroup v2 解决了 Buffered I/O 磁盘读写限速的问题，但是在现实的容器平台上也不是能够立刻使用的，还需要等待一段时间。目前从 runC、containerd 到 Kubernetes 都是刚刚开始支持 Cgroup v2，而对生产环境中原有运行 Cgroup v1 的节点要迁移转化成 Cgroup v2 需要一个过程。

-->

## 容器中的内存与I/O：容器写文件的延时为什么波动很大？

对于 Linux 的系统调用 write() 来说，Buffered I/O 是缺省模式，使用起来比较方便，而且从用户角度看，在大多数的应用场景下，用 Buffered I/O 的 write() 函数调用返回要快一些。所以，Buffered I/O 在程序中使用得更普遍一些。

当使用 Buffered I/O 的应用程序从虚拟机迁移到容器，这时我们就会发现多了 Memory Cgroup 的限制之后，write() 写相同大小的数据块花费的时间，延时波动会比较大。

### 问题再现

我们可以先动手写一个小程序，用来模拟刚刚说的现象。

这个小程序我们这样来设计：从一个文件中每次读取一个 64KB 大小的数据块，然后写到一个新文件中，它可以不断读写 10GB 大小的数据。同时我们在这个小程序中做个记录，记录写每个 64KB 的数据块需要花费的时间。

我们可以先在虚拟机里直接运行，虚拟机里内存大小是大于 10GB 的。接着，我们把这个程序放到容器中运行，因为这个程序本身并不需要很多的内存，我们给它做了一个 Memory Cgroup 的内存限制，设置为 1GB。

运行结束后，我们比较一下程序写数据块的时间。我把结果画了一张图，图里的纵轴是时间，单位 us；横轴是次数，在这里我们记录了 96 次。图中橘红色的线是在容器里运行的结果，蓝色的线是在虚拟机上运行的结果。

结果很明显，在容器中写入数据块的时间会时不时地增高到 200us；而在虚拟机里的写入数据块时间就比较平稳，一直在 30～50us 这个范围内。

![29][29]

通过这个小程序，我们再现了问题，那我们就来分析一下，为什么会产生这样的结果。

### 时间波动是因为 Dirty Pages 的影响么？

我们对文件的写入操作是 Buffered I/O。在前一讲中，我们其实已经知道了，对于 Buffer I/O，用户的数据是先写入到 Page Cache 里的。而这些写入了数据的内存页面，在它们没有被写入到磁盘文件之前，就被叫作 dirty pages。

Linux 内核会有专门的内核线程（每个磁盘设备对应的 kworker/flush 线程）把 dirty pages 写入到磁盘中。那我们自然会这样猜测，也许是 Linux 内核对 dirty pages 的操作影响了 Buffered I/O 的写操作？

想要验证这个想法，我们需要先来看看 dirty pages 是在什么时候被写入到磁盘的。这里就要用到 **/proc/sys/vm 里和 dirty page 相关的内核参数**了，我们需要知道所有相关参数的含义，才能判断出最后真正导致问题发生的原因。

现在我们挨个来看一下。为了方便后面的讲述，我们可以设定一个比值 A，**A 等于 dirty pages 的内存 / 节点可用内存 \*100%**。

第一个参数，dirty_background_ratio，这个参数里的数值是一个百分比值，缺省是 10%。如果比值 A 大于 dirty_background_ratio 的话，比如大于默认的 10%，内核 flush 线程就会把 dirty pages 刷到磁盘里。

第二个参数，是和 dirty_background_ratio 相对应一个参数，也就是 dirty_background_bytes，它和 dirty_background_ratio 作用相同。区别只是 dirty_background_bytes 是具体的字节数，它用来定义的是 dirty pages 内存的临界值，而不是比例值。

这里你还要注意，dirty_background_ratio 和 dirty_background_bytes 只有一个可以起作用，如果你给其中一个赋值之后，另外一个参数就归 0 了。

接下来我们看第三个参数，dirty_ratio，这个参数的数值也是一个百分比值，缺省是 20%。

如果比值 A，大于参数 dirty_ratio 的值，比如大于默认设置的 20%，这时候正在执行 Buffered I/O 写文件的进程就会被阻塞住，直到它写的数据页面都写到磁盘为止。

同样，第四个参数 dirty_bytes 与 dirty_ratio 相对应，它们的关系和 dirty_background_ratio 与 dirty_background_bytes 一样。我们给其中一个赋值后，另一个就会归零。

然后我们来看 dirty_writeback_centisecs，这个参数的值是个时间值，以百分之一秒为单位，缺省值是 500，也就是 5 秒钟。它表示每 5 秒钟会唤醒内核的 flush 线程来处理 dirty pages。

最后还有 dirty_expire_centisecs，这个参数的值也是一个时间值，以百分之一秒为单位，缺省值是 3000，也就是 30 秒钟。它定义了 dirty page 在内存中存放的最长时间，如果一个 dirty page 超过这里定义的时间，那么内核的 flush 线程也会把这个页面写入磁盘。

好了，从这些 dirty pages 相关的参数定义，你会想到些什么呢？

进程写操作上的时间波动，只有可能是因为 dirty pages 的数量很多，已经达到了第三个参数 dirty_ratio 的值。这时执行写文件功能的进程就会被暂停，直到写文件的操作将数据页面写入磁盘，写文件的进程才能继续运行，所以进程里一次写文件数据块的操作时间会增加。

刚刚说的是我们的推理，那情况真的会是这样吗？其实我们可以在容器中进程不断写入数据的时候，查看节点上 dirty pages 的实时数目。具体操作如下：

```bash
watch -n 1 "cat /proc/vmstat | grep dirty"
```

当我们的节点可用内存是 12GB 的时候，假设 dirty_ratio 是 20%，dirty_background_ratio 是 10%，那么我们在 1GB memory 容器中写 10GB 的数据，就会看到它实时的 dirty pages 数目，也就是 / proc/vmstat 里的 nr_dirty 的数值，这个数值对应的内存并不能达到 dirty_ratio 所占的内存值。

![30][30]

其实我们还可以再做个实验，就是在 dirty_bytes 和 dirty_background_bytes 里写入一个很小的值。

```bash
echo 8192 > /proc/sys/vm/dirty_bytes
echo 4096 > /proc/sys/vm/dirty_background_bytes
```

然后再记录一下容器程序里每写入 64KB 数据块的时间，这时候，我们就会看到，时不时一次写入的时间就会达到 9ms，这已经远远高于我们之前看到的 200us 了。

因此，我们知道了这个时间的波动，并不是强制把 dirty page 写入到磁盘引起的。

### 调试问题

那接下来，我们还能怎么分析这个问题呢？

我们可以用 perf 和 ftrace 这两个工具，对容器里写数据块的进程做个 profile，看看到底是调用哪个函数花费了比较长的时间。顺便说一下，我们在专题加餐里会专门介绍如何使用 perf、ftrace 等工具以及它们的工作原理，在这里你只要了解我们的调试思路就行。

怎么使用这两个工具去定位耗时高的函数呢？我大致思路是这样的：我们发现容器中的进程用到了 write() 这个函数调用，然后写 64KB 数据块的时间增加了，而 write() 是一个系统调用，那我们需要进行下面这两步操作。

**第一步，我们要找到内核中 write() 这个系统调用函数下，又调用了哪些子函数。**想找出主要的子函数我们可以查看代码，也可以用 perf 这个工具来得到。

然后是**第二步，得到了 write() 的主要子函数之后，我们可以用 ftrace 这个工具来 trace 这些函数的执行时间，这样就可以找到花费时间最长的函数了。**

好，下面我们就按照刚才梳理的思路来做一下。首先是第一步，我们在容器启动写磁盘的进程后，在宿主机上得到这个进程的 pid，然后运行下面的 perf 命令。

```bash
perf record -a -g -p <pid>
```

等写磁盘的进程退出之后，这个 perf record 也就停止了。

这时我们再执行 perf report 查看结果。把 vfs_write() 函数展开之后，我们就可以看到，write() 这个系统调用下面的调用到了哪些主要的子函数，到这里第一步就完成了。

![31][31]

下面再来做第二步，我们把主要的函数写入到 ftrace 的 set_ftrace_filter 里, 然后把 ftrace 的 tracer 设置为 function_graph，并且打开 tracing_on 开启追踪。

```bash
# cd /sys/kernel/debug/tracing
# echo vfs_write >> set_ftrace_filter
# echo xfs_file_write_iter >> set_ftrace_filter
# echo xfs_file_buffered_aio_write >> set_ftrace_filter
# echo iomap_file_buffered_write
# echo iomap_file_buffered_write >> set_ftrace_filter
# echo pagecache_get_page >> set_ftrace_filter
# echo try_to_free_mem_cgroup_pages >> set_ftrace_filter
# echo try_charge >> set_ftrace_filter
# echo mem_cgroup_try_charge >> set_ftrace_filter
# echo function_graph > current_tracer
# echo 1 > tracing_on
```

这些设置完成之后，我们再运行一下容器中的写磁盘程序，同时从 ftrace 的 trace_pipe 中读取出追踪到的这些函数。

这时我们可以看到，当需要申请 Page Cache 页面的时候，write() 系统调用会反复地调用 mem_cgroup_try_charge()，并且在释放页面的时候，函数 do_try_to_free_pages() 花费的时间特别长，有 50+us（时间单位，micro-seconds）这么多。

```bash
 1)               |  vfs_write() {
  1)               |    xfs_file_write_iter [xfs]() {
  1)               |      xfs_file_buffered_aio_write [xfs]() {
  1)               |        iomap_file_buffered_write() {
  1)               |          pagecache_get_page() {
  1)               |            mem_cgroup_try_charge() {
  1)   0.338 us    |              try_charge();
  1)   0.791 us    |            }
  1)   4.127 us    |          }
…
  1)               |          pagecache_get_page() {
  1)               |            mem_cgroup_try_charge() {
  1)               |              try_charge() {
  1)               |                try_to_free_mem_cgroup_pages() {
  1) + 52.798 us   |                  do_try_to_free_pages();
  1) + 53.958 us   |                }
  1) + 54.751 us   |              }
  1) + 55.188 us   |            }
  1) + 56.742 us   |          }
…
  1) ! 109.925 us  |        }
  1) ! 110.558 us  |      }
  1) ! 110.984 us  |    }
  1) ! 111.515 us  |  }
```

看到这个 ftrace 的结果，你是不是会想到，我们在容器内存中提到的 Page Cahe 呢？

是的，这个问题的确和 Page Cache 有关，Linux 会把所有的空闲内存利用起来，一旦有 Buffered I/O，这些内存都会被用作 Page Cache。

当容器加了 Memory Cgroup 限制了内存之后，对于容器里的 Buffered I/O，就只能使用容器中允许使用的最大内存来做 Page Cache。

**那么如果容器在做内存限制的时候，Cgroup 中 memory.limit_in_bytes 设置得比较小，而容器中的进程又有很大量的 I/O，这样申请新的 Page Cache 内存的时候，又会不断释放老的内存页面，这些操作就会带来额外的系统开销了。**

<!--

### 重点总结

我们今天讨论的问题是在容器中用 Buffered I/O 方式写文件的时候，会出现写入时间波动的问题。

由于这是 Buffered I/O 方式，对于写入文件会先写到内存里，这样就产生了 dirty pages，所以我们先研究了一下 Linux 对 dirty pages 的回收机制是否会影响到容器中写入数据的波动。

在这里我们最主要的是理解这两个参数，**dirty_background_ratio 和 dirty_ratio**，这两个值都是相对于节点可用内存的百分比值。

**当 dirty pages 数量超过 dirty_background_ratio 对应的内存量的时候，内核 flush 线程就会开始把 dirty pages 写入磁盘 ; 当 dirty pages 数量超过 dirty_ratio 对应的内存量，这时候程序写文件的函数调用 write() 就会被阻塞住，直到这次调用的 dirty pages 全部写入到磁盘。**

在节点是大内存容量，并且 dirty_ratio 为系统缺省值 20%，dirty_background_ratio 是系统缺省值 10% 的情况下，我们通过观察 /proc/vmstat 中的 nr_dirty 数值可以发现，dirty pages 不会阻塞进程的 Buffered I/O 写文件操作。

所以我们做了另一种尝试，使用 perf 和 ftrace 工具对容器中的写文件进程进行 profile。我们用 perf 得到了系统调用 write() 在内核中的一系列子函数调用，再用 ftrace 来查看这些子函数的调用时间。

**根据 ftrace 的结果，我们发现写数据到 Page Cache 的时候，需要不断地去释放原有的页面，这个时间开销是最大的。造成容器中 Buffered I/O write() 不稳定的原因，正是容器在限制内存之后，Page Cache 的数量较小并且不断申请释放。**

其实这个问题也提醒了我们：在对容器做 Memory Cgroup 限制内存大小的时候，不仅要考虑容器中进程实际使用的内存量，还要考虑容器中程序 I/O 的量，合理预留足够的内存作为 Buffered I/O 的 Page Cache。

比如，如果知道需要反复读写文件的大小，并且在内存足够的情况下，那么 Memory Cgroup 的内存限制可以超过这个文件的大小。

还有一个解决思路是，我们在程序中自己管理文件的 cache 并且调用 Direct I/O 来读写文件，这样才会对应用程序的性能有一个更好的预期。

-->

## 参考

- 《由浅入深吃透 Docker》
- 《容器实战高手课》
- http://www.docker.com
- https://www.docker-cn.com
- https://docs.docker.com/compose/compose-file/compose-file-v3/
- https://docs.docker.com/compose/reference/

[1]: /images/docker/docker-06/1.jpg
[2]: /images/docker/docker-06/2.jpg
[3]: /images/docker/docker-06/3.jpg
[4]: /images/docker/docker-06/4.jpg
[5]: /images/docker/docker-06/5.jpg
[6]: /images/docker/docker-06/6.jpg
[7]: /images/docker/docker-06/7.jpg
[8]: /images/docker/docker-06/8.jpg
[9]: /images/docker/docker-06/9.jpg
[10]: /images/docker/docker-06/10.jpg
[11]: /images/docker/docker-06/11.jpg
[12]: /images/docker/docker-06/12.jpg
[13]: /images/docker/docker-06/13.jpg
[14]: /images/docker/docker-06/14.jpg
[15]: /images/docker/docker-06/15.jpg
[16]: /images/docker/docker-06/16.jpg
[17]: /images/docker/docker-06/17.jpg
[18]: /images/docker/docker-06/18.jpg
[19]: /images/docker/docker-06/19.jpg
[20]: /images/docker/docker-06/20.jpg
[21]: /images/docker/docker-06/21.jpg
[22]: /images/docker/docker-06/22.jpg
[23]: /images/docker/docker-06/23.jpg
[24]: /images/docker/docker-06/24.jpg
[25]: /images/docker/docker-06/25.jpg
[26]: /images/docker/docker-06/26.jpg
[27]: /images/docker/docker-06/27.jpg
[28]: /images/docker/docker-06/28.jpg
[29]: /images/docker/docker-06/29.jpg
[30]: /images/docker/docker-06/30.jpg
[31]: /images/docker/docker-06/31.jpg
