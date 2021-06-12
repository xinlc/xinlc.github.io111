---
title: 重学 Docker 之 容器进阶（二）
date: 2021-04-10 10:00:00
categories: Docker
tags:
  - docker
---

容器CPU、容器内存

<!--more-->

## 容器CPU（1）：怎么限制容器的CPU使用？

容器在 Linux 系统中最核心的两个概念是 Namespace 和 Cgroups。我们可以通过 Cgroups 技术限制资源。这个资源可以分为很多类型，比如 CPU，Memory，Storage，Network 等等。而计算资源是最基本的一种资源，所有的容器都需要这种资源。

那么，今天我们就先聊一聊，怎么限制容器的 CPU 使用？

我们拿 Kubernetes 平台做例子，具体来看下面这个 pod/container 里的 spec 定义，在 CPU 资源相关的定义中有两项内容，分别是 **Request CPU** 和 **Limit CPU**。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
  - name: app
    image: images.my-company.example/app:v4
    env:
    resources:
      requests:
        memory: "64Mi"
        cpu: "1"
      limits:
        memory: "128Mi"
        cpu: "2"
…
```

很多刚刚使用 Kubernetes 的同学，可能一开始并不理解这两个参数有什么作用。

这里我先给你说结论，在 Pod Spec 里的"Request CPU"和"Limit CPU"的值，最后会通过 CPU Cgroup 的配置，来实现控制容器 CPU 资源的作用。

那接下来我会先从进程的 CPU 使用讲起，然后带你在 CPU Cgroup 子系统中建立几个控制组，用这个例子为你讲解 CPU Cgroup 中的三个最重要的参数"cpu.cfs_quota_us""cpu.cfs_period_us""cpu.shares"。

相信理解了这三个参数后，你就会明白我们要怎样限制容器 CPU 的使用了。

### 如何理解 CPU 使用和 CPU Cgroup？

既然我们需要理解 CPU  Cgroup，那么就有必要先来看一下 Linux 里的 CPU 使用的概念，这是因为 CPU Cgroup 最大的作用就是限制 CPU 使用。

#### CPU 使用的分类

如果你想查看 Linux 系统的 CPU 使用的话，会用什么方法呢？最常用的肯定是运行 Top 了。

我们对照下图的 Top 运行界面，在截图第三行，"%Cpu(s)"开头的这一行，你会看到一串数值，也就是"0.0 us, 0.0 sy, 0.0 ni, 99.9 id, 0.0 wa, 0.0 hi, 0.0 si, 0.0 st"，那么这里的每一项值都是什么含义呢？

![1][1]

下面这张图里最长的带箭头横轴，我们可以把它看成一个时间轴。同时，它的上半部分代表 Linux 用户态（User space），下半部分代表内核态（Kernel space）。这里为了方便你理解，我们先假设只有一个 CPU 吧。

![2][2]

我们可以用上面这张图，把这些值挨个解释一下。

假设一个用户程序开始运行了，那么就对应着第一个"us"框，"us"是"user"的缩写，代表 Linux 的用户态 CPU Usage。普通用户程序代码中，只要不是调用系统调用（System Call），这些代码的指令消耗的 CPU 就都属于"us"。

当这个用户程序代码中调用了系统调用，比如说 read() 去读取一个文件，这时候这个用户进程就会从用户态切换到内核态。

内核态 read() 系统调用在读到真正 disk 上的文件前，就会进行一些文件系统层的操作。那么这些代码指令的消耗就属于"sy"，这里就对应上面图里的第二个框。"sy"是 "system"的缩写，代表内核态 CPU 使用。

接下来，这个 read() 系统调用会向 Linux 的 Block Layer 发出一个 I/O Request，触发一个真正的磁盘读取操作。

这时候，这个进程一般会被置为 TASK_UNINTERRUPTIBLE。而 Linux 会把这段时间标示成"wa"，对应图中的第三个框。"wa"是"iowait"的缩写，代表等待 I/O 的时间，这里的 I/O 是指 Disk I/O。

紧接着，当磁盘返回数据时，进程在内核态拿到数据，这里仍旧是内核态的 CPU 使用中的"sy"，也就是图中的第四个框。

然后，进程再从内核态切换回用户态，在用户态得到文件数据，这里进程又回到用户态的 CPU 使用，"us"，对应图中第五个框。

好，这里我们假设一下，这个用户进程在读取数据之后，没事可做就休眠了。并且我们可以进一步假设，这时在这个 CPU 上也没有其他需要运行的进程了，那么系统就会进入"id"这个步骤，也就是第六个框。"id"是"idle"的缩写，代表系统处于空闲状态。

如果这时这台机器在网络收到一个网络数据包，网卡就会发出一个中断（interrupt）。相应地，CPU 会响应中断，然后进入中断服务程序。

这时，CPU 就会进入"hi"，也就是第七个框。"hi"是"hardware irq"的缩写，代表 CPU 处理硬中断的开销。由于我们的中断服务处理需要关闭中断，所以这个硬中断的时间不能太长。

但是，发生中断后的工作是必须要完成的，如果这些工作比较耗时那怎么办呢？Linux 中有一个软中断的概念（softirq），它可以完成这些耗时比较长的工作。

你可以这样理解这个软中断，从网卡收到数据包的大部分工作，都是通过软中断来处理的。那么，CPU 就会进入到第八个框，"si"。这里"si"是"softirq"的缩写，代表 CPU 处理软中断的开销。

这里你要注意，无论是"hi"还是"si"，它们的 CPU 时间都不会计入进程的 CPU 时间。**这是因为本身它们在处理的时候就不属于任何一个进程。**

好了，通过这个场景假设，我们介绍了大部分的 Linux CPU 使用。

不过，我们还剩两个类型的 CPU 使用没讲到，我想给你做个补充，一次性带你做个全面了解。这样以后你解决相关问题时，就不会再犹豫，这些值到底影不影响 CPU Cgroup 中的限制了。下面我给你具体讲一下。

一个是"ni"，是"nice"的缩写，这里表示如果进程的 nice 值是正值（1-19），代表优先级比较低的进程运行时所占用的 CPU。

另外一个是"st"，"st"是"steal"的缩写，是在虚拟机里用的一个 CPU 使用类型，表示有多少时间是被同一个宿主机上的其他虚拟机抢走的。

综合前面的内容，我再用表格为你总结一下：

![3][3]

### CPU Cgroup

在前面，我们提到过 Cgroups 是对指定进程做计算机资源限制的，CPU  Cgroup 是 Cgroups 其中的一个 Cgroups 子系统，它是用来限制进程的 CPU 使用的。

对于进程的 CPU 使用, 通过前面的 Linux CPU 使用分类的介绍，我们知道它只包含两部分: 一个是用户态，这里的用户态包含了 us 和 ni；还有一部分是内核态，也就是 sy。

至于 wa、hi、si，这些 I/O 或者中断相关的 CPU 使用，CPU Cgroup 不会去做限制，那么接下来我们就来看看 CPU  Cgoup 是怎么工作的？

每个 Cgroups 子系统都是通过一个虚拟文件系统挂载点的方式，挂到一个缺省的目录下，CPU  Cgroup 一般在 Linux 发行版里会放在 /sys/fs/cgroup/cpu 这个目录下。

在这个子系统的目录下，每个控制组（Control Group） 都是一个子目录，各个控制组之间的关系就是一个树状的层级关系（hierarchy）。

比如说，我们在子系统的最顶层开始建立两个控制组（也就是建立两个目录）group1 和 group2，然后再在 group2 的下面再建立两个控制组 group3 和 group4。

这样操作以后，我们就建立了一个树状的控制组层级，你可以参考下面的示意图。

![4][4]

那么我们的每个控制组里，都有哪些 CPU  Cgroup 相关的控制信息呢？这里我们需要看一下每个控制组目录中的内容：

```bash
 # pwd
/sys/fs/cgroup/cpu
# mkdir group1 group2
# cd group2
# mkdir group3 group4
# cd group3
# ls cpu.*
cpu.cfs_period_us  cpu.cfs_quota_us  cpu.rt_period_us  cpu.rt_runtime_us  cpu.shares  cpu.stat 
```

考虑到在云平台里呢，大部分程序都不是实时调度的进程，而是普通调度（SCHED_NORMAL）类型进程，那什么是普通调度类型呢？

因为普通调度的算法在 Linux 中目前是 CFS （Completely Fair Scheduler，即完全公平调度器）。为了方便你理解，我们就直接来看 CPU Cgroup 和 CFS 相关的参数，一共有三个。

第一个参数是 **cpu.cfs_period_us**，它是 CFS 算法的一个调度周期，一般它的值是 100000，以 microseconds 为单位，也就 100ms。

第二个参数是 **cpu.cfs_quota_us**，它“表示 CFS 算法中，在一个调度周期里这个控制组被允许的运行时间，比如这个值为 50000 时，就是 50ms。

如果用这个值去除以调度周期（也就是 cpu.cfs_period_us），50ms/100ms = 0.5，这样这个控制组被允许使用的 CPU 最大配额就是 0.5 个 CPU。

从这里能够看出，cpu.cfs_quota_us 是一个绝对值。如果这个值是 200000，也就是 200ms，那么它除以 period，也就是 200ms/100ms=2。

你看，结果超过了 1 个 CPU，这就意味着这时控制组需要 2 个 CPU 的资源配额。

我们再来看看第三个参数， **cpu.shares**。这个值是 CPU  Cgroup 对于控制组之间的 CPU 分配比例，它的缺省值是 1024。

假设我们前面创建的 group3 中的 cpu.shares 是 1024，而 group4 中的 cpu.shares 是 3072，那么 group3:group4=1:3。

这个比例是什么意思呢？我还是举个具体的例子来说明吧。

在一台 4 个 CPU 的机器上，当 group3 和 group4 都需要 4 个 CPU 的时候，它们实际分配到的 CPU 分别是这样的：group3 是 1 个，group4 是 3 个。

我们刚才讲了 CPU Cgroup 里的三个关键参数，接下来我们就通过几个例子来进一步理解一下。

第一个例子，我们启动一个消耗 2 个 CPU（200%）的程序 threads-cpu，然后把这个程序的 pid 加入到 group3 的控制组里：

Makefile

```Makefile
all: threads-cpu
threads-cpu: threads-cpu.c
	gcc -o threads-cpu threads-cpu.c -lpthread

clean:
	rm -f *.o threads-cpu
```

threads-cpu.c

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <pthread.h>
#include <string.h>

void *doSomeThing(void *arg)
{
	static unsigned long i = 0;
	pthread_t id = pthread_self();

	printf("Thread%d, %x\n", i++, id);
	while (1) {
		int sum;
		sum += 1;
	}

	return NULL;
}

int main(int argc, char *argv[])
{
	int i;
	int total;
	pthread_attr_t tattr;
	int err;
	int stack_size = (20 * 1024 * 1024);

	if (argc < 2) {
		total = 1;
	} else {
		total = atoi(argv[1]);
	}

	err = pthread_attr_init(&tattr);
	if (err != 0) {
		printf("pthread_attr_init err\n");
	}

	err = pthread_attr_setstacksize(&tattr, stack_size);
	if (err != 0) {
		printf("Set stack to %d\n", stack_size);
	}

	printf("To create %d threads\n", total);

	for (i = 0; i < total; i++) {
		pthread_t tid;
		err = pthread_create(&tid, &tattr, &doSomeThing, NULL);
		if (err != 0)
			printf("\ncan't create thread :[%s]", strerror(err));
		else
			printf("\nThread %d created successfully\n", i);

	}

	usleep(1000000);
	printf("All threads are created\n");
	usleep(1000000000);

	return EXIT_SUCCESS;
}
```

```bash
./threads-cpu/threads-cpu 2 &
echo $! > /sys/fs/cgroup/cpu/group2/group3/cgroup.procs 
```

在我们没有修改 cpu.cfs_quota_us 前，用 top 命令可以看到 threads-cpu 这个进程的 CPU  使用是 199%，近似 2 个 CPU。

![5][5]

然后，我们更新这个控制组里的 cpu.cfs_quota_us，把它设置为 150000（150ms）。把这个值除以 cpu.cfs_period_us，计算过程是 150ms/100ms=1.5, 也就是 1.5 个 CPU，同时我们也把 cpu.shares 设置为 1024。

```bash
echo 150000 > /sys/fs/cgroup/cpu/group2/group3/cpu.cfs_quota_us
echo 1024 > /sys/fs/cgroup/cpu/group2/group3/cpu.shares
```

这时候我们再运行 top，就会发现 threads-cpu 进程的 CPU 使用减小到了 150%。这是因为我们设置的 cpu.cfs_quota_us 起了作用，限制了进程 CPU 的绝对值。

但这时候 cpu.shares 的作用还没有发挥出来，因为 cpu.shares 是几个控制组之间的 CPU 分配比例，而且一定要到整个节点中所有的 CPU 都跑满的时候，它才能发挥作用。

![6][6]

好，下面我们再来运行第二个例子来理解 cpu.shares。我们先把第一个例子里的程序启动，同时按前面的内容，一步步设置好 group3 里 cpu.cfs_quota_us 和 cpu.shares。

设置完成后，我们再启动第二个程序，并且设置好 group4 里的 cpu.cfs_quota_us 和 cpu.shares。

group3：

```bash
./threads-cpu/threads-cpu 2 &  # 启动一个消耗2个CPU的程序
echo $! > /sys/fs/cgroup/cpu/group2/group3/cgroup.procs #把程序的pid加入到控制组
echo 150000 > /sys/fs/cgroup/cpu/group2/group3/cpu.cfs_quota_us #限制CPU为1.5CPU
echo 1024 > /sys/fs/cgroup/cpu/group2/group3/cpu.shares 
```

group4：

```bash
./threads-cpu/threads-cpu 4 &  # 启动一个消耗4个CPU的程序
echo $! > /sys/fs/cgroup/cpu/group2/group4/cgroup.procs #把程序的pid加入到控制组
echo 350000 > /sys/fs/cgroup/cpu/group2/group4/cpu.cfs_quota_us  #限制CPU为3.5CPU
echo 3072 > /sys/fs/cgroup/cpu/group2/group3/cpu.shares # shares 比例 group4: group3 = 3:1
```

好了，现在我们的节点上总共有 4 个 CPU，而 group3 的程序需要消耗 2 个 CPU，group4 里的程序要消耗 4 个 CPU。

即使 cpu.cfs_quota_us 已经限制了进程 CPU 使用的绝对值，group3 的限制是 1.5CPU，group4 是 3.5CPU，1.5+3.5=5，这个结果还是超过了节点上的 4 个 CPU。

好了，说到这里，我们发现在这种情况下，cpu.shares 终于开始起作用了。

在这里 shares 比例是 group4:group3=3:1，在总共 4 个 CPU 的节点上，按照比例，group4 里的进程应该分配到 3 个 CPU，而 group3 里的进程会分配到 1 个 CPU。

我们用 top 可以看一下，结果和我们预期的一样。

![7][7]

好了，我们对 CPU Cgroup 的参数做一个梳理。

第一点，cpu.cfs_quota_us 和 cpu.cfs_period_us 这两个值决定了**每个控制组中所有进程的可使用 CPU 资源的最大值。**

第二点，cpu.shares 这个值决定了 **CPU Cgroup 子系统下控制组可用 CPU 的相对比例**，不过只有当系统上 CPU 完全被占满的时候，这个比例才会在各个控制组间起作用。

### 现象解释

在解释了 Linux CPU Usage 和 CPU Cgroup 这两个基本概念之后，我们再回到我们最初的问题 “怎么限制容器的 CPU 使用”。有了基础知识的铺垫，这个问题就比较好解释了。

首先，Kubernetes 会为每个容器都在 CPUCgroup 的子系统中建立一个控制组，然后把容器中进程写入到这个控制组里。

这时候"Limit CPU"就需要为容器设置可用 CPU 的上限。结合前面我们讲的几个参数么，我们就能知道容器的 CPU 上限具体如何计算了。

容器 CPU 的上限由 cpu.cfs_quota_us 除以 cpu.cfs_period_us 得出的值来决定的。而且，在操作系统里，cpu.cfs_period_us 的值一般是个固定值，Kubernetes 不会去修改它，所以我们就是只修改 cpu.cfs_quota_us。

而"Request CPU"就是无论其他容器申请多少 CPU 资源，即使运行时整个节点的 CPU 都被占满的情况下，我的这个容器还是可以保证获得需要的 CPU 数目，那么这个设置具体要怎么实现呢？

显然我们需要设置 cpu.shares 这个参数：**在 CPU Cgroup 中 cpu.shares == 1024 表示 1 个 CPU 的比例，那么 Request CPU 的值就是 n，给 cpu.shares 的赋值对应就是 n\*1024。**

<!--

### 重点总结

这里你要注意的是**每个进程的 CPU Usage 只包含用户态（us 或 ni）和内核态（sy）两部分，其他的系统 CPU 开销并不包含在进程的 CPU 使用中，而 CPU Cgroup 只是对进程的 CPU 使用做了限制。**

其实这一讲我们开篇的问题“怎么限制容器的 CPU 使用”，这个问题背后隐藏了另一个问题，也就是容器是如何设置它的 CPU Cgroup 中参数值的？想解决这个问题，就要先知道 CPU Cgroup 都有哪些参数。

所以，我详细给你介绍了 CPU Cgroup 中的主要参数，包括这三个：**cpu.cfs_quota_us，cpu.cfs_period_us 还有 cpu.shares。**

其中，cpu.cfs_quota_us（一个调度周期里这个控制组被允许的运行时间）除以 cpu.cfs_period_us（用于设置调度周期）得到的这个值决定了 CPU  Cgroup 每个控制组中 CPU 使用的上限值。

你还需要掌握一个 cpu.shares 参数，正是这个值决定了 CPU  Cgroup 子系统下控制组可用 CPU 的相对比例，当系统上 CPU 完全被占满的时候，这个比例才会在各个控制组间起效。

最后，我们明白了 CPU Cgroup 关键参数是什么含义后，Kubernetes 中"Limit CPU"和 "Request CPU"也就很好解释了:

 **Limit CPU 就是容器所在 Cgroup 控制组中的 CPU 上限值，Request CPU 的值就是控制组中的 cpu.shares 的值。**

-->

## 容器CPU（2）：如何正确地拿到容器CPU的开销？

### 问题重现

实际上，你在使用容器的时候，如果运行 top 命令来查看当前容器总共使用了多少 CPU，你肯定马上就会失望了。

这是因为我们在容器中运行 top 命令，虽然可以看到容器中每个进程的 CPU 使用率，但是 top 中"%Cpu(s)"那一行中显示的数值，并不是这个容器的 CPU 整体使用率，而是容器宿主机的 CPU 使用率。

就像下面的这个例子，我们在一个 12 个 CPU 的宿主机上，启动一个容器，然后在容器里运行 top 命令。

这时我们可以看到，容器里有两个进程 threads-cpu，总共消耗了 200% 的 CPU（2 CPU  Usage），而"%Cpu(s)"那一行的"us cpu"是 58.5%。对于 12CPU 的系统来说，12 * 58.5%=7.02，也就是说这里显示总共消耗了 7 个 CPU，远远大于容器中 2 个 CPU 的消耗。

![8][8]

这个例子说明，top 这个工具虽然在物理机或者虚拟机上看得到系统 CPU 开销，但是如果是放在容器环境下，运行 top 就无法得到容器中总的 CPU 使用率。那么，我们还有什么其他的办法吗？

## 进程 CPU 使用率和系统 CPU 使用率

通过问题重现，我们发现 top 工具主要显示了宿主机系统整体的 CPU 使用率，以及单个进程的 CPU 使用率。既然没有现成的工具可以得到容器 CPU 开销，那我们需要自己开发一个工具来解决问题了。

其实我们自己推导，也没有那么难。我认为，最有效的思路还是从原理上去理解问题。

所以，在解决怎样得到单个容器整体的 CPU 使用率这个问题之前，我们先来学习一下，在 Linux 中到底是如何计算单个进程的 CPU 使用率，还有整个系统的 CPU 使用率的。

### 进程 CPU 使用率

Linux 中每个进程的 CPU 使用率，我们都可以用 top 命令查看。

对照我们前面的那张示意图，我们可以发现，每个进程在 top 命令输出中都有对应的一行，然后“%CPU”的那一列就是这个进程的实时 CPU 使用率了。

比如说，100% 就表示这个进程在这个瞬时使用了 1 个 CPU，200% 就是使用了 2 个 CPU。那么这个百分比的数值是怎么得到呢？

最直接的方法，就是从源头开始寻找答案。因为是 top 命令的输出，我们可以去看一下 top 命令的源代码。在代码中你会看到对于每个进程，top 都会从 proc 文件系统中每个进程对应的 stat 文件中读取 2 个数值。我们先来看这个文件，再来解读文件中具体的两个数值。

这个 stat 文件就是 /proc/[pid]/stat ， [pid] 就是替换成具体一个进程的 PID 值。比如 PID 值为 1 的进程，这个文件就是 /proc/1/stat ，那么这个 /proc/[pid]/stat 文件里有什么信息呢？

其实这个 stat 文件实时输出了进程的状态信息，比如进程的运行态（Running 还是 Sleeping）、父进程 PID、进程优先级、进程使用的内存等等总共 50 多项。

完整的 stat 文件内容和格式在 proc 文件系统的 Linux programmer’s manual 里定义了。在这里，我们只需要重点关注这两项数值，stat 文件中的第 14 项 utime 和第 15 项 stime。

![9][9]

那么这两项数值 utime 和 stime 是什么含义呢？utime 是表示进程的用户态部分在 Linux 调度中获得 CPU 的 ticks，stime 是表示进程的内核态部分在 Linux 调度中获得 CPU 的 ticks。

看到这个解释，你可能又冒出一个新问题，疑惑 ticks 是什么? 这个 ticks 就是 Linux 操作系统中的一个时间单位，你可以理解成类似秒，毫秒的概念。

在 Linux 中有个自己的时钟，它会周期性地产生中断。每次中断都会触发 Linux 内核去做一次进程调度，而这一次中断就是一个 tick。因为是周期性的中断，比如 1 秒钟 100 次中断，那么一个 tick 作为一个时间单位看的话，也就是 1/100 秒。

我给你举个例子说明，假如进程的 utime 是 130ticks，就相当于 130 * 1/100=1.3 秒，也就是进程从启动开始在用户态总共运行了 1.3 秒钟。

这里需要你注意，utime 和 stime 都是一个累计值，也就是说从进程启动开始，这两个值就是一直在累积增长的。

那么我们怎么计算，才能知道某一进程在用户态和内核态中，分别获得了多少 CPU 的 ticks 呢？

首先，我们可以假设这个瞬时是 1 秒钟，这 1 秒是 T1 时刻到 T2 时刻之间的，那么这样我们就能获得 T1 时刻的 utime_1 和 stime_1，同时获得 T2 时刻的 utime_2 和 stime_2。

在这 1 秒的瞬时，进程用户态获得的 CPU ticks 就是 (utime_2 – utime_1), 进程内核态获得的 CPU ticks 就是 (stime_2 – stime_1)。

那么我们可以推导出，进程 CPU 总的开销就是用户态加上内核态，也就是在 1 秒瞬时进程总的 CPU ticks 等于 (utime_2 – utime_1) + (stime_2 – stime_1)。

好了，现在我们得到了进程以 ticks 为单位的 CPU 开销，接下来还要做个转化。我们怎样才能把这个值转化成我们熟悉的百分比值呢？其实也不难，我们还是可以去 top 的源代码里得到这个百分比的计算公式。

简单总结一下，这个公式是这样的：

**进程的 CPU 使用率 =((utime_2 – utime_1) + (stime_2 – stime_1)) \* 100.0 / (HZ \* et \* 1 )**

接下来，我再给你讲一下，这个公式里每一个部分的含义。

首先， ((utime_2 – utime_1) + (stime_2 – stime_1)) 是瞬时进程总的 CPU ticks。这个我们已经在前面解释过了。

其次，我们来看 100.0，这里乘以 100.0 的目的是产生百分比数值。

最后，我再讲一下  **(HZ \* et \* 1)**。这是被除数这里的三个参数，我给你详细解释一下。

第一个 HZ 是什么意思呢？前面我们介绍 ticks 里说了，ticks 是按照固定频率发生的，在我们的 Linux 系统里 1 秒钟是 100 次，那么 HZ 就是 1 秒钟里 ticks 的次数，这里值是 100。

第二个参数 et 是我们刚才说的那个“瞬时”的时间，也就是得到 utime_1 和 utime_2 这两个值的时间间隔。

第三个“1”, 就更容易理解了，就是 1 个 CPU。那么这三个值相乘，你是不是也知道了它的意思呢？就是在这“瞬时”的时间（et）里，1 个 CPU 所包含的 ticks 数目。

解释了这些参数，我们可以把这个公式简化一下，就是下面这样：

进程的 CPU 使用率 =（进程的 ticks/ 单个 CPU 总 ticks）*100.0

知道了这个公式，就需要上手来验证一下这个方法对不对，怎么验证呢？我们可以启动一个消耗 CPU 的小程序，然后读取一下进程对应的 /proc/[pid]/stat 中的 utime 和 stime，然后用这个方法来计算一下进程使用率这个百分比值，并且和 top 的输出对比一下，看看是否一致。

先启动一个消耗 200% 的小程序，它的 PID 是 10021，CPU 使用率是 200%。

![10][10]

然后，我们查看这个进程对应的 stat 文件 /proc/10021/stat，间隔 1 秒钟输出第二次，因为 stat 文件内容很多，我们知道 utime 和 stime 第 14 和 15 项，所以我们这里只截取了前 15 项的输出。这里可以看到，utime_1 = 399，stime_1=0，utime_2=600，stime_2=0。

![11][11]

根据前面的公式，我们计算一下进程 threads-cpu 的 CPU 使用率。套用前面的公式，计算的过程是：

((600 – 399) + (0 – 0)) * 100.0 / (100 * 1 * 1) =201，也就是 201%。你会发现这个值和我们运行 top 里的值是一样的。同时，我们也就验证了这个公式是没问题的。

### 系统 CPU 使用率

前面我们介绍了 Linux 中如何获取单个进程的 CPU 使用率，下面我们再来看看 Linux 里是怎么计算系统的整体 CPU 使用率的。

其实知道了如何计算单个进程的 CPU 使用率之后，要理解系统整体的 CPU 使用率计算方法就简单多了。

同样，我们要计算 CPU 使用率，首先需要拿到数据，数据源也同样可以从 proc 文件系统里得到，对于整个系统的 CPU 使用率，这个文件就是 /proc/stat。

在 /proc/stat 文件的 cpu 这行有 10 列数据，同样我们可以在 proc 文件系统的 Linux programmer’s manual 里，找到每一列数据的定义，而前 8 列数据正好对应 top 输出中"%Cpu(s)"那一行里的 8 项数据，也就是在上一讲中，我们介绍过的 user/system/nice/idle/iowait/irq/softirq/steal 这 8 项。

![12][12]

而在 /proc/stat 里的每一项的数值，就是系统自启动开始的 ticks。那么要计算出“瞬时”的 CPU 使用率，首先就要算出这个“瞬时”的 ticks，比如 1 秒钟的“瞬时”，我们可以记录开始时刻 T1 的 ticks, 然后再记录 1 秒钟后 T2 时刻的 ticks，再把这两者相减，就可以得到这 1 秒钟的 ticks 了。

![13][13]

这里我们可以得到，在这 1 秒钟里每个 CPU 使用率的 ticks：

![14][14]

我们想要计算每一种 CPU 使用率的百分比，其实也很简单。我们只需要把所有在这 1 秒里的 ticks 相加得到一个总值，然后拿某一项的 ticks 值，除以这个总值。比如说计算 idle CPU 的使用率就是：

（1203 / 0 + 0 + 0 + 1203 + 0 + 0 + 0 + 0）=100%

好了，我们现在来整体梳理一下，我们通过 Linux 里的工具，要怎样计算进程的 CPU 使用率和系统的 CPU 使用率。

对于单个进程的 CPU 使用率计算，我们需要读取对应进程的 /proc/[pid]/stat 文件，将进程瞬时用户态和内核态的 ticks 数相加，就能得到进程的总 ticks。

然后我们运用公式“(进程的 ticks / 单个 CPU 总 ticks) * 100.0”计算出进程 CPU 使用率的百分比值。

对于系统的 CPU 使用率，需要读取 /proc/stat 文件，得到瞬时各项 CPU 使用率的 ticks 值，相加得到一个总值，单项值除以总值就是各项 CPU 的使用率。

### 解决问题

前面我们学习了在 Linux 中，top 工具是怎样计算每个进程的 CPU 使用率，以及系统总的 CPU 使用率。现在我们再来看最初的问题：为什么在容器中运行 top 命令不能得到容器中总的 CPU 使用率？

这就比较好解释了，对于系统总的 CPU 使用率，需要读取 /proc/stat 文件，但是这个文件中的各项 CPU ticks 是反映整个节点的，并且这个 /proc/stat 文件也不包含在任意一个 Namespace 里。

那么，**对于 top 命令来说，它只能显示整个节点中各项 CPU 的使用率，不能显示单个容器的各项 CPU 的使用率**。既然 top 命令不行，我们还有没有办法得到整个容器的 CPU 使用率呢？

我们之前已经学习过了 CPU Cgroup，每个容器都会有一个 CPU Cgroup 的控制组。在这个控制组目录下面有很多参数文件，有的参数可以决定这个控制组里最大的 CPU 可使用率外，除了它们之外，目录下面还有一个可读项 cpuacct.stat。

这里包含了两个统计值，这两个值分别是**这个控制组里所有进程的内核态 ticks 和用户态的 ticks**，那么我们就可以用前面讲过的公式，也就是计算进程 CPU 使用率的公式，去计算整个容器的 CPU 使用率：

CPU 使用率 =((utime_2 – utime_1) + (stime_2 – stime_1)) * 100.0 / (HZ * et * 1 )

我们还是以问题重现中的例子说明，也就是最开始启动容器里的那两个容器 threads-cpu 进程。

就像下图显示的这样，整个容器的 CPU 使用率的百分比就是 ( (174021 - 173820) + (4 – 4)) * 100.0 / (100 * 1 * 1) = 201, 也就是 201%。**所以，我们从每个容器的 CPU Cgroup 控制组里的 cpuacct.stat 的统计值中，**可以比较快地得到整个容器的 CPU 使用率。

![15][15]

<!--

## 重点总结

Linux 里获取 CPU 使用率的工具，比如 top，都是通过读取 proc 文件系统下的 stat 文件来得到 CPU 使用了多少 ticks。而这里的 ticks，是 Linux 操作系统里的一个时间单位，可以理解成类似秒，毫秒的概念。

对于每个进程来说，它的 stat 文件是 /proc/[pid]/stat，里面包含了进程用户态和内核态的 ticks 数目；对于整个节点，它的 stat 文件是 /proc/stat，里面包含了 user/system/nice/idle/iowait 等不同 CPU 开销类型的 ticks。

**由于 /proc/stat 文件是整个节点全局的状态文件，不属于任何一个 Namespace，因此在容器中无法通过读取 /proc/stat 文件来获取单个容器的 CPU 使用率。**

所以要得到单个容器的 CPU 使用率，我们可以从 CPU Cgroup 每个控制组里的统计文件 cpuacct.stat 中获取。**单个容器 CPU 使用率 =((utime_2 – utime_1) + (stime_2 – stime_1)) \* 100.0 / (HZ \* et \* 1 )。**

得到单个容器的 CPU 的使用率，那么当宿主机上负载变高的时候，就可以很快知道是哪个容器引起的问题。同时，用户在管理自己成百上千的容器的时候，也可以很快发现 CPU 使用率异常的容器，这样就能及早地介入去解决问题。

-->

## Load Average：加了CPU Cgroup限制，为什么我的容器还是很慢？

### 问题再现

在 Linux 的系统维护中，我们需要经常查看 CPU 使用情况，再根据这个情况分析系统整体的运行状态。有时候你可能会发现，明明容器里所有进程的 CPU 使用率都很低，甚至整个宿主机的 CPU 使用率都很低，而机器的 Load Average 里的值却很高，容器里进程运行得也很慢。

这么说有些抽象，我们一起动手再现一下这个情况，这样你就能更好地理解这个问题了。

比如说下面的 top 输出，第三行可以显示当前的 CPU 使用情况，我们可以看到整个机器的 CPU Usage 几乎为 0，因为"id"显示 99.9%，这说明 CPU 是处于空闲状态的。

但是请你注意，这里 1 分钟的"load average"的值却高达 9.09，这里的数值 9 几乎就意味着使用了 9 个 CPU 了，这样 CPU Usage 和 Load Average 的数值看上去就很矛盾了。

![16][16]

那问题来了，我们在看一个系统里 CPU 使用情况时，到底是看 CPU Usage 还是 Load Average 呢？

这里就涉及到今天要解决的两大问题：

1. Load Average 到底是什么，CPU Usage 和 Load Average 有什么差别？
2. 如果 Load Average 值升高，应用的性能下降了，这背后的原因是什么呢？

好了，这一讲我们就带着这两个问题，一起去揭开谜底。

### 什么是 Load Average?

要回答前面的问题，很显然我们要搞明白这个 Linux 里的"load average"这个值是什么意思，又是怎样计算的。

Load Average 这个概念，你可能在使用 Linux 的时候就已经注意到了，无论你是运行 uptime, 还是 top，都可以看到类似这个输出"load average：2.02, 1.83, 1.20"。那么这一串输出到底是什么意思呢？

最直接的办法当然是看手册了，如果我们用"Linux manual page"搜索 uptime 或者 top，就会看到对这个"load average"和后面三个数字的解释是"the system load averages for the past 1, 5, and 15 minutes"。

这个解释就是说，后面的三个数值分别代表过去 1 分钟，5 分钟，15 分钟在这个节点上的 Load Average，但是看了手册上的解释，我们还是不能理解什么是 Load Average。

这个时候，你如果再去网上找资料，就会发现 Load Average 是一个很古老的概念了。上个世纪 70 年代，早期的 Unix 系统上就已经有了这个 Load Average，IETF 还有一个RFC546定义了 Load Average，这里定义的 Load Average 是**一种 CPU 资源需求的度量。**

举个例子，对于一个单个 CPU 的系统，如果在 1 分钟的时间里，处理器上始终有一个进程在运行，同时操作系统的进程可运行队列中始终都有 9 个进程在等待获取 CPU 资源。那么对于这 1 分钟的时间来说，系统的"load average"就是 1+9=10，这个定义对绝大部分的 Unix 系统都适用。

对于 Linux 来说，如果只考虑 CPU 的资源，Load Averag 等于单位时间内正在运行的进程加上可运行队列的进程，这个定义也是成立的。通过这个定义和我自己的观察，我给你归纳了下面三点对 Load Average 的理解。

第一，不论计算机 CPU 是空闲还是满负载，Load Average 都是 Linux 进程调度器中**可运行队列（Running Queue）里的一段时间的平均进程数目。**

第二，计算机上的 CPU 还有空闲的情况下，CPU Usage 可以直接反映到"load average"上，什么是 CPU 还有空闲呢？具体来说就是可运行队列中的进程数目小于 CPU 个数，这种情况下，单位时间进程 CPU Usage 相加的平均值应该就是"load average"的值。

第三，计算机上的 CPU 满负载的情况下，计算机上的 CPU 已经是满负载了，同时还有更多的进程在排队需要 CPU 资源。这时"load average"就不能和 CPU Usage 等同了。

比如对于单个 CPU 的系统，CPU Usage 最大只是有 100%，也就 1 个 CPU；而"load average"的值可以远远大于 1，因为"load average"看的是操作系统中可运行队列中进程的个数。

这样的解释可能太抽象了，为了方便你理解，我们一起动手验证一下。

怎么验证呢？我们可以执行个程序来模拟一下, 先准备好一个可以消耗任意 CPU Usage 的程序，在执行这个程序的时候，后面加个数字作为参数，

比如下面的设置，参数是 2，就是说这个进程会创建出两个线程，并且每个线程都跑满 100% 的 CPU，2 个线程就是 2 * 100% = 200% 的 CPU Usage，也就是消耗了整整两个 CPU 的资源。

```bash
# ./threads-cpu 2
```

准备好了这个 CPU Usage 的模拟程序，我们就可以用它来查看 CPU Usage 和 Load Average 之间的关系了。

接下来我们一起跑两个例子，第一个例子是执行 2 个满负载的线程，第二个例子执行 6 个满负载的线程，同样都是在一台 4 个 CPU 的节点上。

先来看第一个例子，我们在一台 4 个 CPU 的计算机节点上运行刚才这个模拟程序，还是设置参数为 2，也就是使用 2 个 CPU Usage。在这个程序运行了几分钟之后，我们运行 top 来查看一下 CPU Usage 和 Load Average。

我们可以看到两个 threads-cpu 各自都占了将近 100% 的 CPU，两个就是 200%，2 个 CPU，对于 4 个 CPU 的计算机来说，CPU Usage 占了 50%，空闲了一半，这个我们也可以从 idle （id）：49.9% 得到印证。

这时候，Load Average 里第一项（也就是前 1 分钟的数值）为 1.98，近似于 2。这个值和我们一直运行的 200%CPU  Usage 相对应，也验证了我们之前归纳的第二点——**CPU Usage 可以反映到 Load Average 上。**

因为运行的时间不够，前 5 分钟，前 15 分钟的 Load Average 还没有到 2，而且后面我们的例子程序一般都只会运行几分钟，所以这里我们只看前 1 分钟的 Load Average 值就行。

另外，Linux 内核中不使用浮点计算，这导致 Load Average 里的 1 分钟，5 分钟，15 分钟的时间值并不精确，但这不影响我们查看 Load Average 的数值，所以先不用管这个时间的准确性。

![17][17]

那我们再来跑第二个例子，同样在这个 4 个 CPU 的计算机节点上，如果我们执行 CPU Usage 模拟程 threads-cpu，设置参数为 6，让这个进程建出 6 个线程，这样每个线程都会尽量去抢占 CPU，但是计算机总共只有 4 个 CPU，所以这 6 个线程的 CPU Usage 加起来只是 400%。

显然这时候 4 个 CPU 都被占满了，我们可以看到整个节点的 idle（id）也已经是 0.0% 了。

但这个时候，我们看看前 1 分钟的 Load Average，数值不是 4 而是 5.93 接近 6，我们正好模拟了 6 个高 CPU 需求的线程。这也告诉我们，Load Average 表示的是一段时间里运行队列中需要被调度的进程 / 线程平均数目。

![18][18]

讲到这里，我们是不是就可以认定 Load Average 就代表一段时间里运行队列中需要被调度的进程或者线程平均数目了呢? 或许对其他的 Unix 系统来说，这个理解已经够了，但是对于 Linux 系统还不能这么认定。

为什么这么说呢？故事还要从 Linux 早期的历史说起，那时开发者 Matthias 有这么一个发现，比如把快速的磁盘换成了慢速的磁盘，运行同样的负载，系统的性能是下降的，但是 Load Average 却没有反映出来。

他发现这是因为 Load Average 只考虑运行态的进程数目，而没有考虑等待 I/O 的进程。所以，他认为 Load Average 如果只是考虑进程运行队列中需要被调度的进程或线程平均数目是不够的，因为对于处于 I/O 资源等待的进程都是处于 TASK_UNINTERRUPTIBLE 状态的。

那他是怎么处理这件事的呢？估计你也猜到了，他给内核加一个 patch（补丁），把处于 TASK_UNINTERRUPTIBLE 状态的进程数目也计入了 Load Average 中。

在这里我们又提到了 TASK_UNINTERRUPTIBLE 状态的进程，在前面的章节中我们介绍过，我再给你强调一下，**TASK_UNINTERRUPTIBLE 是 Linux 进程状态的一种，是进程为等待某个系统资源而进入了睡眠的状态，并且这种睡眠的状态是不能被信号打断的。**

下面就是 1993 年 Matthias 的 kernel patch，你有兴趣的话，可以读一下。

```c
From: Matthias Urlichs <urlichs@smurf.sub.org>
Subject: Load average broken ?
Date: Fri, 29 Oct 1993 11:37:23 +0200
The kernel only counts "runnable" processes when computing the load average.
I don't like that; the problem is that processes which are swapping or
waiting on "fast", i.e. noninterruptible, I/O, also consume resources.
It seems somewhat nonintuitive that the load average goes down when you
replace your fast swap disk with a slow swap disk...
Anyway, the following patch seems to make the load average much more
consistent WRT the subjective speed of the system. And, most important, the
load is still zero when nobody is doing anything. ;-)
--- kernel/sched.c.orig Fri Oct 29 10:31:11 1993
+++ kernel/sched.c Fri Oct 29 10:32:51 1993
@@ -414,7 +414,9 @@
unsigned long nr = 0;
    for(p = &LAST_TASK; p > &FIRST_TASK; --p)
-       if (*p && (*p)->state == TASK_RUNNING)
+       if (*p && ((*p)->state == TASK_RUNNING) ||
+                  (*p)->state == TASK_UNINTERRUPTIBLE) ||
+                  (*p)->state == TASK_SWAPPING))
            nr += FIXED_1;
    return nr;
 }
```

那么对于 Linux 的 Load Average 来说，除了可运行队列中的进程数目，等待队列中的 UNINTERRUPTIBLE 进程数目也会增加 Load Average。

为了验证这一点，我们可以模拟一下 UNINTERRUPTIBLE 的进程，来看看 Load Average 的变化。

这里我们做一个kernel module，通过一个 /proc 文件系统给用户程序提供一个读取的接口，只要用户进程读取了这个接口就会进入 UNINTERRUPTIBLE。这样我们就可以模拟两个处于 UNINTERRUPTIBLE 状态的进程，然后查看一下 Load Average 有没有增加。

我们发现程序跑了几分钟之后，前 1 分钟的 Load Average 差不多从 0 增加到了 2.16，节点上 CPU  Usage 几乎为 0，idle 为 99.8%。

可以看到，可运行队列（Running Queue）中的进程数目是 0，只有休眠队列（Sleeping Queue）中有两个进程，并且这两个进程显示为 D state 进程，这个 D state 进程也就是我们模拟出来的 TASK_UNINTERRUPTIBLE 状态的进程。

这个例子证明了 Linux 将 TASK_UNINTERRUPTIBLE 状态的进程数目计入了 Load Average 中，所以即使 CPU 上不做任何的计算，Load Average 仍然会升高。如果 TASK_UNINTERRUPTIBLE 状态的进程数目有几百几千个，那么 Load Average 的数值也可以达到几百几千。

proc-d-state.c

```c
#include <linux/module.h>
#include <linux/moduleparam.h>
#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/uaccess.h>
#include <linux/sched.h>
#include <linux/delay.h>
#include <linux/version.h>
#define BUFSIZE  100

MODULE_LICENSE("GPL");

static struct proc_dir_entry *ent;

static ssize_t mywrite(struct file *file, const char __user * ubuf,
		       size_t count, loff_t * ppos)
{
	printk(KERN_DEBUG "write handler\n");
	return 0;
}

static ssize_t myread(struct file *file, char __user * ubuf, size_t count,
		      loff_t * ppos)
{
	printk(KERN_DEBUG "read handler\n");
	/* The process is in UNINTERRUPTIBLE state */
	msleep(300000);
	printk(KERN_DEBUG "read exit\n");
	return 0;
}

#if LINUX_VERSION_CODE >= KERNEL_VERSION(5, 6, 0)
static struct proc_ops myops = {
        .proc_read     = myread,
        .proc_write    = mywrite,
};
#else
static struct file_operations myops = {
	.owner = THIS_MODULE,
	.read = myread,
	.write = mywrite,
};
#endif

static int simple_init(void)
{
	ent = proc_create("mydev", 0660, NULL, &myops);
	return 0;
}

static void simple_cleanup(void)
{
	proc_remove(ent);
}

module_init(simple_init);
module_exit(simple_cleanup);
```

Makefile

```Makefile
obj-m := proc-d-state.o

KDIR := /lib/modules/`uname -r`/build/
PWD := $(shell pwd)

default:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
```

![19][19]

好了，到这里我们就可以准确定义 Linux 系统里的 Load Average 了，其实也很简单，你只需要记住，平均负载统计了这两种情况的进程：

第一种是 Linux 进程调度器中可运行队列（Running Queue）一段时间（1 分钟，5 分钟，15 分钟）的进程平均数。

第二种是 Linux 进程调度器中休眠队列（Sleeping Queue）里的一段时间的 TASK_UNINTERRUPTIBLE 状态下的进程平均数。

所以，最后的公式就是：**Load Average= 可运行队列进程平均数 + 休眠队列中不可打断的进程平均数**

如果打个比方来说明 Load Average 的统计原理。你可以想象每个 CPU 就是一条道路，每个进程都是一辆车，怎么科学统计道路的平均负载呢？就是看单位时间通过的车辆，一条道上的车越多，那么这条道路的负载也就越高。

此外，Linux 计算系统负载的时候，还额外做了个补丁把 TASK_UNINTERRUPTIBLE 状态的进程也考虑了，这个就像道路中要把红绿灯情况也考虑进去。一旦有了红灯，汽车就要停下来排队，那么即使道路很空，但是红灯多了，汽车也要排队等待，也开不快。

### 现象解释：为什么 Load Average 会升高？

解释了 Load Average 这个概念，我们再回到这一讲最开始的问题，为什么对容器已经用 CPU  Cgroup 限制了它的 CPU  Usage，容器里的进程还是可以造成整个系统很高的 Load Average。

我们理解了 Load Average 这个概念之后，就能区分出 Load Averge 和 CPU 使用率的区别了。那么这个看似矛盾的问题也就很好回答了，因为 **Linux 下的 Load Averge 不仅仅计算了 CPU Usage 的部分，它还计算了系统中 TASK_UNINTERRUPTIBLE 状态的进程数目。**

讲到这里为止，我们找到了第一个问题的答案，那么现在我们再看第二个问题：如果 Load Average 值升高，应用的性能已经下降了，真正的原因是什么？问题就出在 TASK_UNINTERRUPTIBLE 状态的进程上了。

怎么验证这个判断呢？这时候我们只要运行 ps aux | grep “ D ” ，就可以看到容器中有多少 TASK_UNINTERRUPTIBLE 状态（在 ps 命令中这个状态的进程标示为"D"状态）的进程，为了方便理解，后面我们简称为 D 状态进程。而正是这些 D 状态进程引起了 Load Average 的升高。

找到了 Load Average 升高的问题出在 D 状态进程了，我们想要真正解决问题，还有必要了解 D 状态进程产生的本质是什么？

在 Linux 内核中有数百处调用点，它们会把进程设置为 D 状态，主要集中在 disk I/O 的访问和信号量（Semaphore）锁的访问上，因此 D 状态的进程在 Linux 里是很常见的。

**无论是对 disk I/O 的访问还是对信号量的访问，都是对 Linux 系统里的资源的一种竞争。**当进程处于 D 状态时，就说明进程还没获得资源，这会在应用程序的最终性能上体现出来，也就是说用户会发觉应用的性能下降了。

那么 D 状态进程导致了性能下降，我们肯定是想方设法去做调试的。但目前 D 状态进程引起的容器中进程性能下降问题，Cgroups 还不能解决，这也就是为什么我们用 Cgroups 做了配置，即使保证了容器的 CPU 资源， 容器中的进程还是运行很慢的根本原因。

这里我们进一步做分析，为什么 CPU Cgroups 不能解决这个问题呢？就是因为 Cgroups 更多的是以进程为单位进行隔离，而 D 状态进程是内核中系统全局资源引入的，所以 Cgroups 影响不了它。

所以我们可以做的是，在生产环境中监控容器的宿主机节点里 D 状态的进程数量，然后对 D 状态进程数目异常的节点进行分析，比如磁盘硬件出现问题引起 D 状态进程数目增加，这时就需要更换硬盘。

<!-- 
### 重点总结

这一讲我们从 CPU  Usage 和 Load Average 差异这个现象讲起，最主要的目的是讲清楚 Linux 下的 Load Average 这个概念。

在其他 Unix 操作系统里 Load Average 只考虑 CPU 部分，Load Average 计算的是进程调度器中可运行队列（Running Queue）里的一段时间（1 分钟，5 分钟，15 分钟）的平均进程数目，而 Linux 在这个基础上，又加上了进程调度器中休眠队列（Sleeping Queue）里的一段时间的 TASK_UNINTERRUPTIBLE 状态的平均进程数目。

这里你需要重点掌握 Load Average 的计算公式，如下图。

![20][20]

因为 TASK_UNINTERRUPTIBLE 状态的进程同样也会竞争系统资源，所以它会影响到应用程序的性能。我们可以在容器宿主机的节点对 D 状态进程做监控，定向分析解决。

最后，我还想强调一下，这一讲中提到的对 D 状态进程进行监控也很重要，因为这是通用系统性能的监控方法。

-->

## 容器内存：我的容器为什么被杀了？

### 问题再现

容器在系统中被杀掉，其实只有一种情况，那就是容器中的进程使用了太多的内存。具体来说，就是容器里所有进程使用的内存量，超过了容器所在 Memory Cgroup 里的内存限制。这时 Linux 系统就会主动杀死容器中的一个进程，往往这会导致整个容器的退出。

我们可以做个简单的容器，模拟一下这种容器被杀死的场景。

接下来，我们用下面的这个脚本来启动容器，我们先把这个容器的 Cgroup 内存上限设置为 512MB（536870912 bytes）。

mem_alloc.c

```c
#include <stdio.h>
#include <malloc.h>
#include <string.h>
#include <unistd.h>
#include <stdlib.h>

#define BLOCK_SIZE (1024*1024)

int main(int argc, char **argv)
{

	int thr, i;
	char *p1;

	if (argc != 2) {
		printf("Usage: mem_alloc <num (MB)>\n");
		exit(0);
	}

	thr = atoi(argv[1]);

	printf("Allocating," "set to %d Mbytes\n", thr);
	sleep(30);
	for (i = 0; i < thr; i++) {
		p1 = malloc(BLOCK_SIZE);
		memset(p1, 0x00, BLOCK_SIZE);
	}

	sleep(600);

	return 0;
}
```

Makefile

```Makefile
all: image

mem_alloc: mem-alloc/mem_alloc.c
	gcc -o mem-alloc/mem_alloc mem-alloc/mem_alloc.c
image: mem_alloc
	docker build -t registry/mem_alloc:v1 .
clean:
	rm mem-alloc/mem_alloc -f
	docker stop mem_alloc;docker rm mem_alloc;docker rmi registry/mem_alloc:v1
```

Dockerfile

```Dockerfile
FROM centos:8.1.1911

COPY ./mem-alloc/mem_alloc /

CMD ["/mem_alloc", "2000"]
```

start_container.sh

```bash
#!/bin/bash
docker stop mem_alloc;docker rm mem_alloc

docker run -d --name mem_alloc registry/mem_alloc:v1

sleep 2
CONTAINER_ID=$(sudo docker ps --format "{{.ID}}\t{{.Names}}" | grep -i mem_alloc | awk '{print $1}')
echo $CONTAINER_ID

CGROUP_CONTAINER_PATH=$(find /sys/fs/cgroup/memory/ -name "*$CONTAINER_ID*")
echo $CGROUP_CONTAINER_PATH

echo 536870912 > $CGROUP_CONTAINER_PATH/memory.limit_in_bytes
cat $CGROUP_CONTAINER_PATH/memory.limit_in_bytes
```

好了，容器启动后，里面有一个小程序 mem_alloc 会不断地申请内存。当它申请的内存超过 512MB 的时候，你就会发现，我们启动的这个容器消失了。

![21][21]

这时候，如果我们运行docker inspect 命令查看容器退出的原因，就会看到容器处于"exited"状态，并且"OOMKilled"是 true。

![22][22]

那么问题来了，什么是 OOM Killed 呢？它和之前我们对容器 Memory Cgroup 做的设置有什么关系，又是怎么引起容器退出的？想搞清楚这些问题，我们就需要先理清楚基本概念。

### 如何理解 OOM Killer？

我们先来看一看 OOM Killer 是什么意思。

OOM 是 Out of Memory 的缩写，顾名思义就是内存不足的意思，而 Killer 在这里指需要杀死某个进程。那么 OOM Killer 就是**在 Linux 系统里如果内存不足时，就需要杀死一个正在运行的进程来释放一些内存。**

那么讲到这里，你可能会有个问题了，Linux 里的程序都是调用 malloc() 来申请内存，如果内存不足，直接 malloc() 返回失败就可以，为什么还要去杀死正在运行的进程呢？

其实，这个和 Linux 进程的内存申请策略有关，Linux 允许进程在申请内存的时候是 overcommit 的，这是什么意思呢？就是说允许进程申请超过实际物理内存上限的内存。

为了让你更好地理解，我给你举个例子说明。比如说，节点上的空闲物理内存只有 512MB 了，但是如果一个进程调用 malloc() 申请了 600MB，那么 malloc() 的这次申请还是被允许的。

这是因为 malloc() 申请的是内存的虚拟地址，系统只是给了程序一个地址范围，由于没有写入数据，所以程序并没有得到真正的物理内存。物理内存只有程序真的往这个地址写入数据的时候，才会分配给程序。

可以看得出来，这种 overcommit 的内存申请模式可以带来一个好处，它可以有效提高系统的内存利用率。不过这也带来了一个问题，也许你已经猜到了，就是物理内存真的不够了，又该怎么办呢？

为了方便你理解，我给你打个比方，这个有点像航空公司在卖飞机票。售卖飞机票的时候往往是超售的。比如说实际上有 100 个位子，航空公司会卖 105 张机票，在登机的时候如果实际登机的乘客超过了 100 个，那么就需要按照一定规则，不允许多出的几位乘客登机了。

同样的道理，遇到内存不够的这种情况，Linux 采取的措施就是杀死某个正在运行的进程。

那么你一定会问了，在发生 OOM 的时候，Linux 到底是根据什么标准来选择被杀的进程呢？这就要提到一个在 Linux 内核里有一个 **oom_badness() 函数**，就是它定义了选择进程的标准。其实这里的判断标准也很简单，函数中涉及两个条件：

第一，进程已经使用的物理内存页面数。

第二，每个进程的 OOM 校准值 oom_score_adj。在 /proc 文件系统中，每个进程都有一个 /proc//oom_score_adj 的接口文件。我们可以在这个文件中输入 -1000 到 1000 之间的任意一个数值，调整进程被 OOM Kill 的几率。

```c
 adj = (long)p->signal->oom_score_adj;
       points = get_mm_rss(p->mm) + get_mm_counter(p->mm, MM_SWAPENTS) +mm_pgtables_bytes(p->mm) / PAGE_SIZE;
       adj *= totalpages / 1000;
       points += adj;
```

结合前面说的两个条件，函数 oom_badness() 里的最终计算方法是这样的：

**用系统总的可用页面数，去乘以 OOM 校准值 oom_score_adj，再加上进程已经使用的物理页面数，计算出来的值越大，那么这个进程被 OOM Kill 的几率也就越大。**

### 如何理解 Memory Cgroup？

前面我们介绍了 OOM Killer，容器发生 OOM Kill 大多是因为 Memory Cgroup 的限制所导致的，所以在我们还需要理解 Memory Cgroup 的运行机制。

在前面我们讲过 Cgroups 是容器的两大支柱技术之一，在 CPU 的章节中，我们也讲到了 CPU Cgroups。那么按照同样的思路，我们想理解容器 Memory，自然要讨论一下 Memory Cgroup 了。

Memory Cgroup 也是 Linux Cgroups 子系统之一，它的作用是对一组进程的 Memory 使用做限制。Memory Cgroup 的虚拟文件系统的挂载点一般在"/sys/fs/cgroup/memory"这个目录下，这个和 CPU Cgroup 类似。我们可以在 Memory Cgroup 的挂载点目录下，创建一个子目录作为控制组。

每一个控制组下面有不少参数，在这一讲里，这里我们只讲跟 OOM 最相关的 3 个参数：**memory.limit_in_bytes，memory.oom_control 和 memory.usage_in_bytes**。其他参数如果你有兴趣了解，可以参考内核的文档说明。

首先我们来看第一个参数，叫作 memory.limit_in_bytes。请你注意，这个 memory.limit_in_bytes 是每个控制组里最重要的一个参数了。这是因为一个控制组里所有进程可使用内存的最大值，就是由这个参数的值来直接限制的。

那么一旦达到了最大值，在这个控制组里的进程会发生什么呢？

这就涉及到我要给你讲的第二个参数 memory.oom_control 了。这个 memory.oom_control 又是干啥的呢？当控制组中的进程内存使用达到上限值时，这个参数能够决定会不会触发 OOM Killer。

如果没有人为设置的话，memory.oom_control 的缺省值就会触发 OOM Killer。这是一个控制组内的 OOM Killer，和整个系统的 OOM Killer 的功能差不多，差别只是被杀进程的选择范围：控制组内的 OOM Killer 当然只能杀死控制组内的进程，而不能选节点上的其他进程。

如果我们要改变缺省值，也就是不希望触发 OOM Killer，只要执行 echo 1 > memory.oom_control  就行了，这时候即使控制组里所有进程使用的内存达到 memory.limit_in_bytes 设置的上限值，控制组也不会杀掉里面的进程。

但是，我想提醒你，这样操作以后，就会影响到控制组中正在申请物理内存页面的进程。这些进程会处于一个停止状态，不能往下运行了。

最后，我们再来学习一下第三个参数，也就是 memory.usage_in_bytes。这个参数是只读的，它里面的数值是当前控制组里所有进程实际使用的内存总和。

我们可以查看这个值，然后把它和 memory.limit_in_bytes 里的值做比较，根据接近程度来可以做个预判。这两个值越接近，OOM 的风险越高。通过这个方法，我们就可以得知，当前控制组内使用总的内存量有没有 OOM 的风险了。

控制组之间也同样是树状的层级结构，在这个结构中，父节点的控制组里的 memory.limit_in_bytes 值，就可以限制它的子节点中所有进程的内存使用。

我用一个具体例子来说明，比如像下面图里展示的那样，group1 里的 memory.limit_in_bytes 设置的值是 200MB，它的子控制组 group3 里 memory.limit_in_bytes 值是 500MB。那么，我们在 group3 里所有进程使用的内存总值就不能超过 200MB，而不是 500MB。

![23][23]

好了，我们这里介绍了 Memory Cgroup 最基本的概念，简单总结一下：

第一，Memory Cgroup 中每一个控制组可以为一组进程限制内存使用量，一旦所有进程使用内存的总量达到限制值，缺省情况下，就会触发 OOM Killer。这样一来，控制组里的“某个进程”就会被杀死。

第二，这里杀死“某个进程”的选择标准是，**控制组中总的可用页面乘以进程的 oom_score_adj，加上进程已经使用的物理内存页面，所得值最大的进程，就会被系统选中杀死。**

### 解决问题

我们解释了 Memory Cgroup 和 OOM Killer 后，你应该明白了为什么容器在运行过程中会突然消失了。

对于每个容器创建后，系统都会为它建立一个 Memory Cgroup 的控制组，容器的所有进程都在这个控制组里。

一般的容器云平台，比如 Kubernetes 都会为容器设置一个内存使用的上限。这个内存的上限值会被写入 Cgroup 里，具体来说就是容器对应的 Memory Cgroup 控制组里 memory.limit_in_bytes 这个参数中。

所以，一旦容器中进程使用的内存达到了上限值，OOM Killer 会杀死进程使容器退出。

**那么我们怎样才能快速确定容器发生了 OOM 呢？这个可以通过查看内核日志及时地发现。**

还是拿我们这一讲最开始发生 OOM 的容器作为例子。我们通过查看内核的日志，使用用 journal -k 命令，或者直接查看日志文件 /var/log/message，我们会发现当容器发生 OOM Kill 的时候，内核会输出下面的这段信息，大致包含下面这三部分的信息：

第一个部分就是**容器里每一个进程使用的内存页面数量。**在"rss"列里，"rss'是 Resident Set Size 的缩写，指的就是进程真正在使用的物理内存页面数量。

比如下面的日志里，我们看到 init 进程的"rss"是 1 个页面，mem_alloc 进程的"rss"是 130801 个页面，内存页面的大小一般是 4KB，我们可以做个估算，130801 * 4KB 大致等于 512MB。

![24][24]

第二部分我们来看上面图片的 **"oom-kill:"** 这行，这一行里列出了发生 OOM 的 Memroy Cgroup 的控制组，我们可以从控制组的信息中知道 OOM 是在哪个容器发生的。

第三部分是图中 **"Killed process 7445 (mem_alloc)" 这行，它显示了最终被 OOM Killer 杀死的进程。**

我们通过了解内核日志里的这些信息，可以很快地判断出容器是因为 OOM 而退出的，并且还可以知道是哪个进程消耗了最多的 Memory。

那么知道了哪个进程消耗了最大内存之后，我们就可以有针对性地对这个进程进行分析了，一般有这两种情况：

第一种情况是**这个进程本身的确需要很大的内存**，这说明我们给 memory.limit_in_bytes 里的内存上限值设置小了，那么就需要增大内存的上限值。

第二种情况是**进程的代码中有 Bug，会导致内存泄漏，进程内存使用到达了 Memory Cgroup 中的上限。**如果是这种情况，就需要我们具体去解决代码里的问题了。

<!--

### 重点总结

这一讲我们从容器在系统中被杀的问题，学习了 OOM Killer 和 Memory Cgroup 这两个概念。

OOM Killer 这个行为在 Linux 中很早就存在了，它其实是一种内存过载后的保护机制，通过牺牲个别的进程，来保证整个节点的内存不会被全部消耗掉。

在 Cgroup 的概念出现后，Memory Cgroup 中每一个控制组可以对一组进程限制内存使用量，一旦所有进程使用内存的总量达到限制值，在缺省情况下，就会触发 OOM Killer，控制组里的“某个进程”就会被杀死。

请注意，这里 Linux 系统肯定不能随心所欲地杀掉进程，那具体要用什么选择标准呢？

杀掉“某个进程”的选择标准，涉及到内核函数 oom_badness()。具体的计算方法是  ：**系统总的可用页面数乘以进程的 OOM 校准值 oom_score_adj，再加上进程已经使用的物理页面数，计算出来的值越大，那么这个进程被 OOM Kill 的几率也就越大。**

接下来，我给你讲解了 Memory Cgroup 里最基本的三个参数，分别是 **memory.limit_in_bytes， memory.oom_control 和 memory.usage_in_bytes。**我把这三个参数的作用，给你总结成了一张图。第一个和第三个参数，下一讲中我们还会用到，这里你可以先有个印象。

![25][25]

容器因为 OOM 被杀，要如何处理呢？我们可以通过内核日志做排查，查看容器里内存使用最多的进程，然后对它进行分析。根据我的经验，解决思路要么是提高容器的最大内存限制，要么需要我们具体去解决进程代码的 BUG。

-->

## Page Cache：为什么我的容器内存使用量总是在临界点?

### 问题再现

我们可以用这里的代码做个容器镜像，然后用下面的这个脚本启动容器，并且设置容器 Memory Cgroup 里的内存上限值是 100MB（104857600bytes）。

mem_alloc.c

```c
#include <stdio.h>
#include <malloc.h>
#include <string.h>
#include <unistd.h>
#include <stdlib.h>

#define BLOCK_SIZE (1024*1024)

int main(int argc, char **argv)
{

	int thr, i;
	char *p1;

	if (argc != 2) {
		printf("Usage: mem_alloc <num (MB)>\n");
		exit(0);
	}

	thr = atoi(argv[1]);

	printf("Allocating," "set to %d Mbytes\n", thr);
	for (i = 0; i < thr; i++) {
		p1 = malloc(BLOCK_SIZE);
		memset(p1, 0x00, BLOCK_SIZE);
	}

	sleep(600);

	return 0;
}
```

read_file.c

```c
#include <fcntl.h> 
#include <stdio.h> 
#include <string.h>
#include <unistd.h>
#include <stdlib.h> 

#define BUFFER_SIZE (1024 * 1024)
#define BLOCKS	800

char buf[BUFFER_SIZE];

int main(int argc, char *argv[])
{
	int fd;
	int i, ret = 0;
	char *p1;
	int blocks;

	if (argc != 3) {
		printf("Usage: read_file <filename> <blocks>");
		exit(0);
	}

	blocks = atoi(argv[2]);	

	fd = open(argv[1], O_RDONLY);
	while (1) {
		for (i = 0; i < blocks; i++) {
			ret = read(fd, buf, BUFFER_SIZE);
			if (ret < 0)
				printf("%d read error \n", i);
		}
		sleep(2);
		printf("Read again\n");
	}
	close(fd);
		
	return 0;
}
```

Dockerfile

```Dockerfile
FROM centos:8.1.1911

COPY ./mem-alloc/mem_alloc /
COPY ./read-file/read_file /

CMD ["/read_file", "/mnt/test.file", "100"]
```

Makefile

```Makefile
all: image

mem_alloc: mem-alloc/mem_alloc.c
	gcc -o mem-alloc/mem_alloc mem-alloc/mem_alloc.c
read_file: read-file/read_file.c
	gcc -o read-file/read_file read-file/read_file.c
image: mem_alloc read_file
	docker build -t registry/page_cache_test:v1 .
clean:
	rm mem-alloc/mem_alloc -f
	rm read-file/read_file -f
	docker rmi registry/page_cache_test:v1
```

start_container.sh

```bash
#!/bin/bash

docker stop page_cache;docker rm page_cache

if [ ! -f ./test.file ]
then
	dd if=/dev/zero of=./test.file bs=4096 count=30000
	echo "Please run start_container.sh again "
	exit 0
fi
echo 3 > /proc/sys/vm/drop_caches
sleep 10

docker run -d --init --name page_cache -v $(pwd):/mnt registry/page_cache_test:v1
CONTAINER_ID=$(sudo docker ps --format "{{.ID}}\t{{.Names}}" | grep -i page_cache | awk '{print $1}')

echo $CONTAINER_ID
CGROUP_CONTAINER_PATH=$(find /sys/fs/cgroup/memory/ -name "*$CONTAINER_ID*")
echo 104857600 > $CGROUP_CONTAINER_PATH/memory.limit_in_bytes
cat $CGROUP_CONTAINER_PATH/memory.limit_in_bytes
```

把容器启动起来后，我们查看一下容器的 Memory Cgroup 下的 memory.limit_in_bytes 和 memory.usage_in_bytes 这两个值。

如下图所示，我们可以看到容器内存的上限值设置为 104857600bytes（100MB），而这时整个容器的已使用内存显示为 104767488bytes，这个值已经非常接近上限值了。

我们把容器内存上限值和已使用的内存数值做个减法，104857600–104767488= 90112bytes，只差大概 90KB 左右的大小。

![26][26]

但是，如果这时候我们继续启动一个程序，让这个程序申请并使用 50MB 的物理内存，就会发现这个程序还是可以运行成功，这时候容器并没有发生 OOM 的情况。

这时我们再去查看参数 memory.usage_in_bytes，就会发现它的值变成了 103186432bytes，比之前还少了一些。那这是怎么回事呢？

![27][27]

### 知识详解：Linux 系统有那些内存类型？

要解释刚才我们看到的容器里内存分配的现象，就需要先理解 Linux 操作系统里有哪几种内存的类型。

因为我们只有知道了内存的类型，才能明白每一种类型的内存，容器分别使用了多少。而且，对于不同类型的内存，一旦总内存增高到容器里内存最高限制的数值，相应的处理方式也不同。

### Linux 内存类型

Linux 的各个模块都需要内存，比如内核需要分配内存给页表，内核栈，还有 slab，也就是内核各种数据结构的 Cache Pool；用户态进程里的堆内存和栈的内存，共享库的内存，还有文件读写的 Page Cache。

在这一讲里，我们讨论的 Memory Cgroup 里都不会对内核的内存做限制（比如页表，slab 等）。所以我们今天主要讨论**与用户态相关的两个内存类型，RSS 和 Page Cache。**

### RSS

先看什么是 RSS。RSS 是 Resident Set Size 的缩写，简单来说它就是指进程真正申请到物理页面的内存大小。这是什么意思呢？

应用程序在申请内存的时候，比如说，调用 malloc() 来申请 100MB 的内存大小，malloc() 返回成功了，这时候系统其实只是把 100MB 的虚拟地址空间分配给了进程，但是并没有把实际的物理内存页面分配给进程。

上一讲中，我给你讲过，当进程对这块内存地址开始做真正读写操作的时候，系统才会把实际需要的物理内存分配给进程。而这个过程中，进程真正得到的物理内存，就是这个 RSS 了。

比如下面的这段代码，我们先用 malloc 申请 100MB 的内存。

```c
    p = malloc(100 * MB);
            if (p == NULL)
                    return 0;
```

然后，我们运行 top 命令查看这个程序在运行了 malloc() 之后的内存，我们可以看到这个程序的虚拟地址空间（VIRT）已经有了 106728KB（～100MB)，但是实际的物理内存 RSS（top 命令里显示的是 RES，就是 Resident 的简写，和 RSS 是一个意思）在这里只有 688KB。

![28][28]

接着我们在程序里等待 30 秒之后，我们再对这块申请的空间里写入 20MB 的数据。

```c
sleep(30);
memset(p, 0x00, 20 * MB)
```

当我们用 memset() 函数对这块地址空间写入 20MB 的数据之后，我们再用 top 查看，这时候可以看到虚拟地址空间（VIRT）还是 106728，不过物理内存 RSS（RES）的值变成了 21432（大小约为 20MB）， 这里的单位都是 KB。

![29][29]

所以，通过刚才上面的小实验，我们可以验证 RSS 就是进程里真正获得的物理内存大小。

对于进程来说，RSS 内存包含了进程的代码段内存，栈内存，堆内存，共享库的内存, 这些内存是进程运行所必须的。刚才我们通过 malloc/memset 得到的内存，就是属于堆内存。

具体的每一部分的 RSS 内存的大小，你可以查看 /proc/[pid]/smaps 文件。

### Page Cache

每个进程除了各自独立分配到的 RSS 内存外，如果进程对磁盘上的文件做了读写操作，Linux 还会分配内存，把磁盘上读写到的页面存放在内存中，这部分的内存就是 Page Cache。

Page Cache 的主要作用是提高磁盘文件的读写性能，因为系统调用 read() 和 write() 的缺省行为都会把读过或者写过的页面存放在 Page Cache 里。

还是用我们这一讲最开始的的例子：代码程序去读取 100MB 的文件，在读取文件前，系统中 Page Cache 的大小是 388MB，读取后 Page Cache 的大小是 506MB，增长了大约 100MB 左右，多出来的这 100MB，正是我们读取文件的大小。

![30][30]

在 Linux 系统里只要有空闲的内存，系统就会自动地把读写过的磁盘文件页面放入到 Page Cache 里。那么这些内存都被 Page Cache 占用了，一旦进程需要用到更多的物理内存，执行 malloc() 调用做申请时，就会发现剩余的物理内存不够了，那该怎么办呢？

这就要提到 Linux 的内存管理机制了。 **Linux 的内存管理有一种内存页面回收机制（page frame reclaim），会根据系统里空闲物理内存是否低于某个阈值（wartermark），来决定是否启动内存的回收。**

内存回收的算法会根据不同类型的内存以及内存的最近最少用原则，就是 LRU（Least Recently Used）算法决定哪些内存页面先被释放。因为 Page Cache 的内存页面只是起到 Cache 作用，自然是会被优先释放的。

所以，Page Cache 是一种为了提高磁盘文件读写性能而利用空闲物理内存的机制。同时，内存管理中的页面回收机制，又能保证 Cache 所占用的页面可以及时释放，这样一来就不会影响程序对内存的真正需求了。

### RSS & Page Cache in Memory Cgroup

学习了 RSS 和 Page Cache 的基本概念之后，我们下面来看不同类型的内存，特别是 RSS 和 Page Cache 是如何影响 Memory Cgroup 的工作的。

我们先从 Linux 的内核代码看一下，从 mem_cgroup_charge_statistics() 这个函数里，我们可以看到 Memory Cgroup 也的确只是统计了 RSS 和 Page Cache 这两部分的内存。

RSS 的内存，就是在当前 Memory Cgroup 控制组里所有进程的 RSS 的总和；而 Page Cache 这部分内存是控制组里的进程读写磁盘文件后，被放入到 Page Cache 里的物理内存。

![31][31]

Memory Cgroup 控制组里 RSS 内存和 Page Cache 内存的和，正好是 memory.usage_in_bytes 的值。

当控制组里的进程需要申请新的物理内存，而且 memory.usage_in_bytes 里的值超过控制组里的内存上限值 memory.limit_in_bytes，这时我们前面说的 Linux 的内存回收（page frame reclaim）就会被调用起来。

那么在这个控制组里的 page cache 的内存会根据新申请的内存大小释放一部分，这样我们还是能成功申请到新的物理内存，整个控制组里总的物理内存开销 memory.usage_in_bytes 还是不会超过上限值 memory.limit_in_bytes。

### 解决问题

明白了 Memory Cgroup 中内存类型的统计方法，我们再回过头看这一讲开头的问题，为什么 memory.usage_in_bytes 与 memory.limit_in_bytes 的值只相差了 90KB，我们在容器中还是可以申请出 50MB 的物理内存？

我想你应该已经知道答案了，容器里肯定有大于 50MB 的内存是 Page Cache，因为作为 Page Cache 的内存在系统需要新申请物理内存的时候（作为 RSS）是可以被释放的。

知道了这个答案，那么我们怎么来验证呢？验证的方法也挺简单的，在 Memory Cgroup 中有一个参数 memory.stat，可以显示在当前控制组里各种内存类型的实际的开销。

那我们还是拿这一讲的容器例子，再跑一遍代码，这次要查看一下 memory.stat 里的数据。

第一步，我们还是用同样的脚本来启动容器，并且设置好容器的 Memory Cgroup 里的 memory.limit_in_bytes 值为 100MB。

启动容器后，这次我们不仅要看 memory.usage_in_bytes 的值，还要看一下 memory.stat。虽然 memory.stat 里的参数有不少，但我们目前只需要关注"cache"和"rss"这两个值。

我们可以看到，容器启动后，cache，也就是 Page Cache 占的内存是 99508224bytes，大概是 99MB，而 RSS 占的内存只有 1826816bytes，也就是 1MB 多一点。

这就意味着，在这个容器的 Memory Cgroup 里大部分的内存都被用作了 Page Cache，而这部分内存是可以被回收的。

![32][32]

那么我们再执行一下我们的mem_alloc 程序，申请 50MB 的物理内存。

我们可以再来查看一下 memory.stat，这时候 cache 的内存值降到了 46632960bytes，大概 46MB，而 rss 的内存值到了 54759424bytes，54MB 左右吧。总的 memory.usage_in_bytes 值和之前相比，没有太多的变化。

![33][33]

从这里我们发现，Page Cache 内存对我们判断容器实际内存使用率的影响，目前 Page Cache 完全就是 Linux 内核的一个自动的行为，只要读写磁盘文件，只要有空闲的内存，就会被用作 Page Cache。

所以，判断容器真实的内存使用量，我们不能用 Memory Cgroup 里的 memory.usage_in_bytes，而需要用 memory.stat 里的 rss 值。这个很像我们用 free 命令查看节点的可用内存，不能看"free"字段下的值，而要看除去 Page Cache 之后的"available"字段下的值。

<!--

### 重点总结

这一讲我想让你知道，每个容器的 Memory Cgroup 在统计每个控制组的内存使用时包含了两部分，RSS 和 Page Cache。

RSS 是每个进程实际占用的物理内存，它包括了进程的代码段内存，进程运行时需要的堆和栈的内存，这部分内存是进程运行所必须的。

Page Cache 是进程在运行中读写磁盘文件后，作为 Cache 而继续保留在内存中的，它的目的是**为了提高磁盘文件的读写性能。**

当节点的内存紧张或者 Memory Cgroup 控制组的内存达到上限的时候，Linux 会对内存做回收操作，这个时候 Page Cache 的内存页面会被释放，这样空出来的内存就可以分配给新的内存申请。

正是 Page Cache 内存的这种 Cache 的特性，对于那些有频繁磁盘访问容器，我们往往会看到它的内存使用率一直接近容器内存的限制值（memory.limit_in_bytes）。但是这时候，我们并不需要担心它内存的不够， 我们在判断一个容器的内存使用状况的时候，可以把 Page Cache 这部分内存使用量忽略，而更多的考虑容器中 RSS 的内存使用量。

-->

## Swap：容器可以使用Swap空间吗？

用过 Linux 的同学应该都很熟悉 Swap 空间了，简单来说它就是就是一块磁盘空间。

当内存写满的时候，就可以把内存中不常用的数据暂时写到这个 Swap 空间上。这样一来，内存空间就可以释放出来，用来满足新的内存申请的需求。

它的好处是可以应对一些瞬时突发的内存增大需求，不至于因为内存一时不够而触发 OOM Killer，导致进程被杀死。
那么对于一个容器，特别是容器被设置了 Memory Cgroup 之后，它还可以使用 Swap 空间吗？会不会出现什么问题呢？

### 问题再现

接下来，我们就结合一个小例子，一起来看看吧。

首先，我们在一个有 Swap 空间的节点上启动一个容器，设置好它的 Memory Cgroup 的限制，一起来看看接下来会发生什么。

如果你的节点上没有 Swap 分区，也没有关系，你可以用下面的这组命令来新建一个。

这个例子里，Swap 空间的大小是 20G，你可以根据自己磁盘空闲空间来决定这个 Swap 的大小。执行完这组命令之后，我们来运行 free 命令，就可以看到 Swap 空间有 20G。

create_swap.sh

```bash
#!/bin/bash
fallocate -l 20G ./swapfile
dd if=/dev/zero of=./swapfile bs=1024 count=20971520
chmod 600 ./swapfile
mkswap ./swapfile
swapon swapfile
```

输出的结果你可以参考下面的截图。

![34][34]

然后我们再启动一个容器，和 OOM 那一讲里的例子差不多，容器的 Memory Cgroup 限制为 512MB，容器中的 mem_alloc 程序去申请 2GB 内存。

你会发现，这次和上次 OOM 那一讲里的情况不一样了，并没有发生 OOM 导致容器退出的情况，容器运行得好好的。

从下面的图中，我们可以看到，mem_alloc 进程的 RSS 内存一直在 512MB（RES: 515596）左右。

![35][35]

那我们再看一下 Swap 空间，使用了 1.5GB (used 1542144KB)。输出的结果如下图，简单计算一下，1.5GB + 512MB，结果正好是 mem_alloc 这个程序申请的 2GB 内存。

![36][36]

通过刚刚的例子，你也许会这么想，因为有了 Swap 空间，本来会被 OOM Kill 的容器，可以好好地运行了。初看这样似乎也挺好的，不过你仔细想想，这样一来，Memory Cgroup 对内存的限制不就失去了作用么？

我们再进一步分析，如果一个容器中的程序发生了内存泄漏（Memory leak），那么本来 Memory Cgroup 可以及时杀死这个进程，让它不影响整个节点中的其他应用程序。结果现在这个内存泄漏的进程没被杀死，还会不断地读写 Swap 磁盘，反而影响了整个节点的性能。

你看，这样一分析，对于运行容器的节点，你是不是又觉得应该禁止使用 Swap 了呢?

我想提醒你，不能一刀切地下结论，我们总是说，具体情况要具体分析，我们落地到具体的场景里，就会发现情况又没有原先我们想得那么简单。

比如说，某一类程序就是需要 Swap 空间，才能防止因为偶尔的内存突然增加而被 OOM Killer 杀死。因为这类程序重新启动的初始化时间会很长，这样程序重启的代价就很大了，也就是说，打开 Swap 对这类程序是有意义的。

这一类程序一旦放到容器中运行，就意味着它会和“别的容器”在同一个宿主机上共同运行，那如果这个“别的容器” 如果不需要 Swap，而是希望 Memory Cgroup 的严格内存限制。

这样一来，在这一个宿主机上的两个容器就会有冲突了，我们应该怎么解决这个问题呢？要解决这个问题，我们先来看看 Linux 里的 Swappiness 这个概念，后面它可以帮到我们。

### 如何正确理解 swappiness 参数？

在普通 Linux 系统上，如果你使用过 Swap 空间，那么你可能配置过 proc 文件系统下的 swappiness 这个参数 (/proc/sys/vm/swappiness)。swappiness 的定义在Linux 内核文档中可以找到，就是下面这段话。

> swappiness
> This control is used to define how aggressive the kernel will swap memory pages.  Higher values will increase aggressiveness, lower values decrease the amount of swap.  A value of 0 instructs the kernel not to initiate swap until the amount of free and file-backed pages is less than the high water mark in a zone.
> The default value is 60.

前面两句话大致翻译过来，意思就是 **swappiness 可以决定系统将会有多频繁地使用交换分区。**

一个较高的值会使得内核更频繁地使用交换分区，而一个较低的取值，则代表着内核会尽量避免使用交换分区。swappiness 的取值范围是 0–100，缺省值 60。

我第一次读到这个定义，再知道了这个取值范围后，我觉得这是一个百分比值，也就是定义了使用 Swap 空间的频率。

当这个值是 100 的时候，哪怕还有空闲内存，也会去做内存交换，尽量把内存数据写入到 Swap 空间里；值是 0 的时候，基本上就不做内存交换了，也就不写 Swap 空间了。

后来再回顾的时候，我发现这个想法不能说是完全错的，但是想得简单了些。那这段 swappiness 的定义，应该怎么正确地理解呢？

你还记得，我们在上一讲里说过的两种内存类型 Page Cache 和 RSS 么?

在有磁盘文件访问的时候，Linux 会尽量把系统的空闲内存用作 Page Cache 来提高文件的读写性能。在没有打开 Swap 空间的情况下，一旦内存不够，这种情况下就只能把 Page Cache 释放了，而 RSS 内存是不能释放的。

在 RSS 里的内存，大部分都是没有对应磁盘文件的内存，比如用 malloc() 申请得到的内存，这种内存也被称为**匿名内存（Anonymous memory）**。那么当 Swap 空间打开后，可以写入 Swap 空间的，就是这些匿名内存。

所以在 Swap 空间打开的时候，问题也就来了，在内存紧张的时候，Linux 系统怎么决定是先释放 Page Cache，还是先把匿名内存释放并写入到 Swap 空间里呢？

我们一起来分析分析，都可能发生怎样的情况。最可能发生的是下面两种情况：

第一种情况是，如果系统先把 Page Cache 都释放了，那么一旦节点里有频繁的文件读写操作，系统的性能就会下降。

还有另一种情况，如果 Linux 系统先把匿名内存都释放并写入到 Swap，那么一旦这些被释放的匿名内存马上需要使用，又需要从 Swap 空间读回到内存中，这样又会让 Swap（其实也是磁盘）的读写频繁，导致系统性能下降。

显然，我们在释放内存的时候，需要平衡 Page Cache 的释放和匿名内存的释放，而 swappiness，就是用来定义这个平衡的参数。

那么 swappiness 具体是怎么来控制这个平衡的？我们看一下在 Linux 内核代码里是怎么用这个 swappiness 参数。

我们前面说了 swappiness 的这个值的范围是 0 到 100，但是请你一定要注意，**它不是一个百分比，更像是一个权重**。它是用来定义 Page Cache 内存和匿名内存的释放的一个比例。

我结合下面的这段代码具体给你讲一讲。

我们可以看到，这个比例是 anon_prio: file_prio，这里 anon_prio 的值就等于 swappiness。下面我们分三个情况做讨论：

第一种情况，当 swappiness 的值是 100 的时候，匿名内存和 Page Cache 内存的释放比例就是 100: 100，也就是等比例释放了。

第二种情况，就是 swappiness 缺省值是 60 的时候，匿名内存和 Page Cache 内存的释放比例就是 60 : 140，Page Cache 内存的释放要优先于匿名内存。

```c
   /*
         * With swappiness at 100, anonymous and file have the same priority.
         * This scanning priority is essentially the inverse of IO cost.
         */
        anon_prio = swappiness;
        file_prio = 200 - anon_prio;
```

还有一种情况， 当 swappiness 的值是 0 的时候，会发生什么呢？这种情况下，Linux 系统是不允许匿名内存写入 Swap 空间了吗？

我们可以回到前面，再看一下那段 swappiness 的英文定义，里面特别强调了 swappiness 为 0 的情况。

当空闲内存少于内存一个 zone 的"high water mark"中的值的时候，Linux 还是会做内存交换，也就是把匿名内存写入到 Swap 空间后释放内存。

在这里 zone 是 Linux 划分物理内存的一个区域，里面有 3 个水位线（water mark），水位线可以用来警示空闲内存的紧张程度。

这里我们可以再做个试验来验证一下，先运行 echo 0 > /proc/sys/vm/swappiness 命令把 swappiness 设置为 0， 然后用我们之前例子里的 mem_alloc 程序来申请内存。

比如我们的这个节点上内存有 12GB，同时有 2GB 的 Swap，用 mem_alloc 申请 12GB 的内存，我们可以看到 Swap 空间在 mem_alloc 调用之前，used=0，输出结果如下图所示。

![37][37]

接下来，调用 mem_alloc 之后，Swap 空间就被使用了。

![38][38]

因为 mem_alloc 申请 12GB 内存已经和节点最大内存差不多了，我们如果查看 cat /proc/zoneinfo ，也可以看到 normal zone 里 high （water mark）的值和 free 的值差不多，这样在 `free<high` 的时候，系统就会回收匿名内存页面并写入 Swap 空间。

![39][39]

好了，在这里我们介绍了 Linux 系统里 swappiness 的概念，它是用来决定在内存紧张时候，回收匿名内存和 Page Cache 内存的比例。

**swappiness 的取值范围在 0 到 100，值为 100 的时候系统平等回收匿名内存和 Page Cache 内存；一般缺省值为 60，就是优先回收 Page Cache；即使 swappiness 为 0，也不能完全禁止 Swap 分区的使用，就是说在内存紧张的时候，也会使用 Swap 来回收匿名内存。**

### 解决问题

那么运行了容器，使用了 Memory Cgroup 之后，swappiness 怎么工作呢？

如果你查看一下 Memory Cgroup 控制组下面的参数，你会看到有一个 memory.swappiness 参数。这个参数是干啥的呢？

memory.swappiness 可以控制这个 Memroy Cgroup 控制组下面匿名内存和 page cache 的回收，取值的范围和工作方式和全局的 swappiness 差不多。这里有一个优先顺序，在 Memory Cgorup 的控制组里，如果你设置了 memory.swappiness 参数，它就会覆盖全局的 swappiness，让全局的 swappiness 在这个控制组里不起作用。

不过，这里有一点不同，需要你留意：**当 memory.swappiness = 0 的时候，对匿名页的回收是始终禁止的，也就是始终都不会使用 Swap 空间。**

这时 Linux 系统不会再去比较 free 内存和 zone 里的 high water mark 的值，再决定一个 Memory Cgroup 中的匿名内存要不要回收了。

请你注意，当我们设置了"memory.swappiness=0 时，在 Memory Cgroup 中的进程，就不会再使用 Swap 空间，知道这一点很重要。

我们可以跑个容器试一试，还是在一个有 Swap 空间的节点上运行，运行和这一讲开始一样的容器，唯一不同的是把容器对应 Memory Cgroup 里的 memory.swappiness 设置为 0。

![40][40]

这次我们在容器中申请内存之后，Swap 空间就没有被使用了，而当容器申请的内存超过 memory.limit_in_bytes 之后，就发生了 OOM Kill。

好了，有了"memory.swappiness = 0"的配置和功能，就可以解决我们在这一讲里最开始提出的问题了。

在同一个宿主机上，假设同时存在容器 A 和其他容器，容器 A 上运行着需要使用 Swap 空间的应用，而别的容器不需要使用 Swap 空间。

那么，我们还是可以在宿主机节点上打开 Swap 空间，同时在其他容器对应的 Memory Cgroups 控制组里，把 memory.swappiness 这个参数设置为 0。这样一来，我们不但满足了容器 A 的需求，而且别的容器也不会受到影响，仍然可以严格按照 Memory Cgroups 里的 memory.limit_in_bytes 来限制内存的使用。

总之，memory.swappiness 这个参数很有用，通过它可以让需要使用 Swap 空间的容器和不需要 Swap 的容器，同时运行在同一个宿主机上。

<!--

### 重点总结

这一讲，我们主要讨论的问题是在容器中是否可以使用 Swap？

这个问题没有看起来那么简单。当然了，只要在宿主机节点上打开 Swap 空间，在容器中就是可以用到 Swap 的。但出现的问题是在同一个宿主机上，对于不需要使用 swap 的容器， 它的 Memory Cgroups 的限制也失去了作用。

针对这个问题，我们学习了 Linux 中的 swappiness 这个参数。swappiness 参数值的作用是，在系统里有 Swap 空间之后，当系统需要回收内存的时候，是优先释放 Page Cache 中的内存，还是优先释放匿名内存（也就是写入 Swap）。

swappiness 的取值范围在 0 到 100 之间，我们可以记住下面三个值：

- 值为 100 的时候， 释放 Page Cache 和匿名内存是同等优先级的。
- 值为 60，这是大多数 Linux 系统的缺省值，这时候 Page Cache 的释放优先级高于匿名内存的释放。
- 值为 0 的时候，当系统中空闲内存低于一个临界值的时候，仍然会释放匿名内存并把页面写入 Swap 空间。

![41][41]

swappiness 参数除了在 proc 文件系统下有个全局的值外，在每个 Memory Cgroup 控制组里也有一个 memory.swappiness，那它们有什么不同呢？

不同就是每个 Memory Cgroup 控制组里的 swappiness 参数值为 0 的时候，就可以让控制组里的内存停止写入 Swap。这样一来，有了 memory.swappiness 这个参数后，需要使用 Swap 和不需要 Swap 的容器就可以在同一个宿主机上同时运行了，这样对于硬件资源的利用率也就更高了。

-->

## 参考

- 《由浅入深吃透 Docker》
- 《容器实战高手课》
- http://www.docker.com
- https://www.docker-cn.com
- https://docs.docker.com/compose/compose-file/compose-file-v3/
- https://docs.docker.com/compose/reference/

[1]: /images/docker/docker-05/1.jpg
[2]: /images/docker/docker-05/2.jpg
[3]: /images/docker/docker-05/3.jpg
[4]: /images/docker/docker-05/4.jpg
[5]: /images/docker/docker-05/5.jpg
[6]: /images/docker/docker-06/5.jpg
[7]: /images/docker/docker-05/7.jpg
[8]: /images/docker/docker-05/8.jpg
[9]: /images/docker/docker-05/9.jpg
[10]: /images/docker/docker-05/10.jpg
[11]: /images/docker/docker-05/11.jpg
[12]: /images/docker/docker-05/12.jpg
[13]: /images/docker/docker-05/13.jpg
[14]: /images/docker/docker-05/14.jpg
[15]: /images/docker/docker-05/15.jpg
[16]: /images/docker/docker-05/16.jpg
[17]: /images/docker/docker-05/17.jpg
[18]: /images/docker/docker-05/18.jpg
[19]: /images/docker/docker-05/19.jpg
[20]: /images/docker/docker-05/20.jpg
[21]: /images/docker/docker-05/21.jpg
[22]: /images/docker/docker-05/22.jpg
[23]: /images/docker/docker-05/23.jpg
[24]: /images/docker/docker-05/24.jpg
[25]: /images/docker/docker-05/25.jpg
[26]: /images/docker/docker-05/26.jpg
[27]: /images/docker/docker-05/27.jpg
[28]: /images/docker/docker-05/28.jpg
[29]: /images/docker/docker-05/29.jpg
[30]: /images/docker/docker-05/30.jpg
[31]: /images/docker/docker-05/31.jpg
[32]: /images/docker/docker-05/32.jpg
[33]: /images/docker/docker-05/33.jpg
[34]: /images/docker/docker-05/34.jpg
[35]: /images/docker/docker-05/35.jpg
[36]: /images/docker/docker-05/36.jpg
[37]: /images/docker/docker-05/37.jpg
[38]: /images/docker/docker-05/38.jpg
[39]: /images/docker/docker-05/39.jpg
[40]: /images/docker/docker-05/40.jpg
[41]: /images/docker/docker-05/41.jpg