第一模块，我们从 Docker 基础概念讲到 Docker 的基本操作。第二模块，我们详细剖析了 Docker 的三大关键技术（ Namespace、cgroups 和联合文件系统）的实现原理，并且讲解了 Docker 的网络模型等关键性技术。相信此时的你已经对 Docker 有了一个新的认识。

接下来的两课时，我就趁热打铁，带你动手使用 Golang 编写一个 Docker。学习这两节的内容需要你能够熟练使用 Golang 语言，如果你没有 Golang 编程基础，建议先学习一下 Golang 的基本语法。那么 Golang 究竟是什么呢? Golang 应该如何安装使用？下面我带你一一学习。

### Golang 是什么?

Golang 又称为 Go，是 Google 开源的一种静态编译型语言，Golang 自带内存管理机制，相比于 C 和 C++ 语言，我们不需要关心内存的分配和回收。

Golang 是新一代的互联网编程语言，在 Golang 诞生前，C 或 C++ 作为服务端高性能编程语言，使用 C 或 C++ 开发的业务具有非常高的执行效率，但是编译和开发效率却不尽人意，Java、.NET 等语言的诞生大大提高了软件开发速度，但是运行效率和资源占用却不如 C 和 C++。

这时 Golang 横空出世，由于 Golang 较高的开发效率和执行效率，很快便从众多编程语言中脱颖而出，成为众多互联网公司的新宠儿。滴滴、知乎、阿里等众多大型互联网公司都在大量使用 Golang。 同时，Docker 和 Kubernetes 等众多明星项目也都是使用 Golang 开发的。因此，熟练掌握 Golang 将会为你加分很多。

这么好的编程语言，你是不是已经迫不及待地想要安装体验一下了？别着急，下面我带你来安装一个 Golang 环境。

### Golang 安装

安装信息如下：

- CentOS 7系统
- Golang 版本 1.15.2

首先我们到[Golang 官网](https://golang.org/)（由于国内无法访问 Golang 官网，推荐到[Golang 中文网](https://studygolang.com/dl)下载安装包）下载一个对应操作系统的安装包。

复制代码

```
$ cd /tmp && wget https://studygolang.com/dl/golang/go1.15.2.linux-amd64.tar.gz
```

解压缩安装包：

复制代码

```
$ sudo tar -C /usr/local -xzf go1.15.2.linux-amd64.tar.gz
```

在 $HOME/.bashrc 文件末尾添加以下内容，将 Golang 可执行文件目录添加到系统 PATH 中：

复制代码

```
export PATH=$PATH:/usr/local/go/bin
```

将 go 的安装路径添加到系统 PATH 中后，就可以在命令行直接使用 go 命令了。配置好 go 命令后，我们还需要配置 GOPATH 才能正确存放和编译我们的 go 代码。

#### 配置 GOPATH

GOPATH 是 Golang 的源码和相关编译文件的存放路径，GOPATH 路径下有三个文件夹 src、pkg 和 bin，它们的用途分别是：

| **目录** | **用途**                       |
| -------- | ------------------------------ |
| src      | 源代码存放路径或者引用的外部库 |
| pkg      | 编译时生成的对象文件           |
| bin      | 编译后的可执行二进制           |

这里我们开始配置 GOPATH 路径为 /go。首先准备相关的目录：

复制代码

```
$ sudo mkdir /go

$ sudo mkdir /go/src

$ sudo mkdir /go/pkg

$ sudo mkdir /go/bin
```

然后将 GOPATH 添加到 $HOME/.bashrc 文件末尾，并且把 GOPATH 下的 bin 目录也添加到系统的 PATH 中，这样方便程序编译后直接使用。添加的内容如下：

复制代码

```
export GOPATH=/go

export PATH=$PATH:$GOPATH/bin

# 设置 Golang 的代理，方便我们顺利下载依赖包

export GOPROXY="https://goproxy.io,direct"
```

接下来，使用 source $HOME/.bashrc 命令生效一下我们的配置，然后我们再使用 go env 命令查看一下我们的配置结果：

复制代码

```
$ go env

GO111MODULE=""

GOARCH="amd64"

GOBIN=""

GOCACHE="/root/.cache/go-build"

GOENV="/root/.config/go/env"

GOEXE=""

GOFLAGS=""

GOHOSTARCH="amd64"

GOHOSTOS="linux"

GOINSECURE=""

GOMODCACHE="/go/pkg/mod"

GONOPROXY=""

GONOSUMDB=""

GOOS="linux"

GOPATH="/go"

GOPRIVATE=""

GOPROXY="https://goproxy.io,direct"

GOROOT="/usr/local/go"

GOSUMDB="sum.golang.org"

GOTMPDIR=""

GOTOOLDIR="/usr/local/go/pkg/tool/linux_amd64"

GCCGO="gccgo"

AR="ar"

CC="gcc"

CXX="g++"

CGO_ENABLED="1"

GOMOD=""

CGO_CFLAGS="-g -O2"

CGO_CPPFLAGS=""

CGO_CXXFLAGS="-g -O2"

CGO_FFLAGS="-g -O2"

CGO_LDFLAGS="-g -O2"

PKG_CONFIG="pkg-config"

GOGCCFLAGS="-fPIC -m64 -pthread -fmessage-length=0 -fdebug-prefix-map=/tmp/go-build352828668=/tmp/go-build -gno-record-gcc-switches"
```

从 GOPATH 和 GOPROXY 两个变量的结果，可以看到 GOPATH 和 GOPROXY 均已经生效。到此，我们的 Golang 已经安装完毕。下面，我们就开始真正的 Docker 编写之旅吧。

### 编写 Docker

在开始编写 Docker 之前，我先介绍几个基础知识，如果你对这些基础知识已经很熟悉了，可以直接跳过这块的基础知识。

#### Linux Proc 文件系统

Linux 系统中，/proc 目录是一种“文件系统”，这里我用了引号，其实 /proc 目录并不是一个真正的文件系统。**/proc 目录存放于内存中，是一个虚拟的文件系统，该目录存放了当前内核运行状态的一系列特殊的文件，你可以通过这些文件查看当前的进程信息。**

下面，我们通过 ls 命令查看一下 /proc 目录下的内容：

复制代码

```
$ sudo ls -l /proc

total 0

dr-xr-xr-x  9 root    root                  0 Sep 19 21:34 1

dr-xr-xr-x  9 root    root                  0 Sep 19 21:34 30097

...省略部分输出

dr-xr-xr-x  9 root    root                  0 Sep 19 21:34 8

dr-xr-xr-x  9 root    root                  0 Sep 19 21:34 9

dr-xr-xr-x  9 root    root                  0 Sep 19 21:34 97

dr-xr-xr-x  2 root    root                  0 Sep 19 22:27 acpi

-r--r--r--  1 root    root                  0 Sep 19 22:27 buddyinfo

dr-xr-xr-x  4 root    root                  0 Sep 19 22:27 bus

-r--r--r--  1 root    root                  0 Sep 19 22:27 cgroups

-r--r--r--  1 root    root                  0 Sep 19 22:27 cmdline

-r--r--r--  1 root    root                  0 Sep 19 22:27 consoles

-r--r--r--  1 root    root                  0 Sep 19 22:27 cpuinfo

-r--r--r--  1 root    root                  0 Sep 19 22:27 crypto

-r--r--r--  1 root    root                  0 Sep 19 22:27 devices

-r--r--r--  1 root    root                  0 Sep 19 21:34 diskstats

-r--r--r--  1 root    root                  0 Sep 19 22:27 dma

dr-xr-xr-x  2 root    root                  0 Sep 19 22:27 driver

-r--r--r--  1 root    root                  0 Sep 19 22:27 execdomains

-r--r--r--  1 root    root                  0 Sep 19 22:27 fb

-r--r--r--  1 root    root                  0 Sep 19 22:27 filesystems

dr-xr-xr-x  5 root    root                  0 Sep 19 22:27 fs

-r--r--r--  1 root    root                  0 Sep 19 22:27 interrupts

-r--r--r--  1 root    root                  0 Sep 19 22:27 iomem

-r--r--r--  1 root    root                  0 Sep 19 22:27 ioports

dr-xr-xr-x 27 root    root                  0 Sep 19 22:27 irq

-r--r--r--  1 root    root                  0 Sep 19 22:27 kallsyms

-r--------  1 root    root    140737486266368 Sep 19 22:27 kcore

-r--r--r--  1 root    root                  0 Sep 19 22:27 key-users

-r--r--r--  1 root    root                  0 Sep 19 22:27 keys

-r--------  1 root    root                  0 Sep 19 22:27 kmsg

-r--------  1 root    root                  0 Sep 19 22:27 kpagecount

-r--------  1 root    root                  0 Sep 19 22:27 kpageflags

-r--r--r--  1 root    root                  0 Sep 19 22:27 loadavg

-r--r--r--  1 root    root                  0 Sep 19 22:27 locks

-r--r--r--  1 root    root                  0 Sep 19 22:27 mdstat

-r--r--r--  1 root    root                  0 Sep 19 22:27 meminfo

-r--r--r--  1 root    root                  0 Sep 19 22:27 misc

-r--r--r--  1 root    root                  0 Sep 19 22:27 modules

lrwxrwxrwx  1 root    root                 11 Sep 19 22:27 mounts -> self/mounts

-rw-r--r--  1 root    root                  0 Sep 19 22:27 mtrr

lrwxrwxrwx  1 root    root                  8 Sep 19 22:27 net -> self/net

-r--r--r--  1 root    root                  0 Sep 19 22:27 pagetypeinfo

-r--r--r--  1 root    root                  0 Sep 19 22:27 partitions

-r--r--r--  1 root    root                  0 Sep 19 22:27 sched_debug

-r--r--r--  1 root    root                  0 Sep 19 22:27 schedstat

dr-xr-xr-x  2 root    root                  0 Sep 19 22:27 scsi

lrwxrwxrwx  1 root    root                  0 Sep 19 21:34 self -> 30097

-r--------  1 root    root                  0 Sep 19 22:27 slabinfo

-r--r--r--  1 root    root                  0 Sep 19 22:27 softirqs

-r--r--r--  1 root    root                  0 Sep 19 21:34 stat

-r--r--r--  1 root    root                  0 Sep 19 21:34 swaps

dr-xr-xr-x  1 root    root                  0 Sep 19 21:34 sys

--w-------  1 root    root                  0 Sep 19 22:27 sysrq-trigger

dr-xr-xr-x  2 root    root                  0 Sep 19 22:27 sysvipc

-r--r--r--  1 root    root                  0 Sep 19 22:27 timer_list

-rw-r--r--  1 root    root                  0 Sep 19 22:27 timer_stats

dr-xr-xr-x  4 root    root                  0 Sep 19 22:27 tty

-r--r--r--  1 root    root                  0 Sep 19 22:27 uptime

-r--r--r--  1 root    root                  0 Sep 19 22:27 version

-r--------  1 root    root                  0 Sep 19 22:27 vmallocinfo

-r--r--r--  1 root    root                  0 Sep 19 22:27 vmstat

-r--r--r--  1 root    root                  0 Sep 19 22:27 zoneinfo
```

可以看到，这个目录下有很多数字，这些数字目录实际上是以进程 ID 命名的。除了这些以进程 ID 命名的目录，还有一些特殊的目录，这里我讲解一下与我们编写 Docker 有关的文件和目录。

- **self 目录**：它是连接到当前正在运行的进程目录，比如我当前的进程 ID 为 30097，则 self 目录实际连接到 /proc/30097 这个目录。
- **/proc/{PID}/exe 文件**：exe 连接到进程执行的命令文件，例如 30097 这个进程的运行命令为 docker，则执行 /proc/30097/exe ps 等同于执行 docker ps。

好了，了解完这些基础知识后，我们就开始行动吧！因为我们的精简版 Docker 是使用 Golang 编写，这里就给我们编写的 Docker 命名为 gocker 吧。

#### 实现 gocker 的 run 命令

通过前面的章节，我们学习了要运行一个容器，必须先有镜像。这里我们首先准备一个 busybox 镜像，以便我们运行 gocker 容器。

复制代码

```
$ mkdir /tmp/busybox && cd /tmp/busybox

$ docker export $(docker create busybox) -o busybox.tar

$ tar -xf busybox.tar
```

以上是我们在 /tmp/busybox 目录，使用 docker export 命令导出的一个 busybox 镜像文件，然后对镜像文件包进行解压，解压后 /tmp/busybox 目录内容如下：

复制代码

```
$ ls -l /tmp/busybox/

total 1472

drwxr-xr-x 2 root      root        12288 Sep  9 02:09 bin

-rw------- 1 root      root      1455104 Sep 19 22:47 busybox.tar

drwxr-xr-x 4 root      root         4096 Sep 19 16:41 dev

drwxr-xr-x 3 root      root         4096 Sep 19 16:41 etc

drwxr-xr-x 2 nfsnobody nfsnobody    4096 Sep  9 02:09 home

drwxr-xr-x 2 root      root         4096 Sep 19 16:41 proc

drwx------ 2 root      root         4096 Sep 19 21:07 root

drwxr-xr-x 2 root      root         4096 Sep 19 16:41 sys

drwxrwxrwt 2 root      root         4096 Sep  9 02:09 tmp

drwxr-xr-x 3 root      root         4096 Sep  9 02:09 usr

drwxr-xr-x 4 root      root         4096 Sep  9 02:09 var
```

准备好镜像文件后，把我为你准备好的 gocker 代码下载下来吧，这里我使用手动下载源码的方式克隆代码：

复制代码

```
$ mkdir -p /go/src/github.com/wilhelmguo

$ cd /go/src/github.com/wilhelmguo && git clone https://github.com/wilhelmguo/gocker.git

$ cd gocker

$ git checkout lesson-17
```

代码下载完后，我们进入 gocker 的目录，查看下源码文件：

复制代码

```
$ tree .

.

|-- go.mod

|-- go.sum

|-- main.go

|-- README.md

|-- runc

|   `-- run.go

`-- vendor

... 省略 vendor 目录结构

15 directories, 59 files
```

> 本项目使用 go mod 管理包依赖，go mod 是在 golang 1.11 版本加入的新的特性，是用来管理包的依赖的，也是目前官方的包依赖管理工具。如果你想学习更多个 go mod 使用方法，可以参考[官网](https://golang.org/ref/mod)。

可以看到该源码下有两个主要文件：一个是 main.go 文件，这是 gocker 的主入口函数；另外一个是 run.go ，这个文件是 gocker run 命令的具体实现。

下面我们使用 go install 命令来编译一下我们的 gocker 项目：

复制代码

```
$ go install
```

执行完 go install 后， Golang 会自动帮助我们编译当前项目下的代码，编译后的二进制文件存放在 $GOPATH/bin 目录下。由于我们之前在 $HOME/.bashrc 文件下把 $GOPATH/bin 放入了系统 PATH 中，所以此时你可以直接使用 gocker 命令了。
接下来我们使用 gocker 来启动一个容器：

复制代码

```
# gocker run -it -rootfs=/tmp/busybox /bin/sh

2020/09/19 23:46:27 Current path is  /tmp/busybox

2020/09/19 23:46:27 CmdArray is  [/bin/sh]

/ #
```

> 如果出现 pivotRoot error pivot_root invalid argument 的报错，可以先执行 unshare -m 命令，然后使用 rm -rf /tmp/busybox/.pivot_root 命令删除临时文件，再次重试即可。

这里我们使用 it 参数指定以命令行交互的模式启动容器，rootfs 指定准备好的镜像目录。执行完上面的命令后 busybox 容器就成功启动了。
这时候，我们使用 ps 命令查看一下当前进程信息：

复制代码

```
/ # /bin/ps -ef

PID   USER     TIME  COMMAND

    1 root      0:00 /bin/sh

    5 root      0:00 /bin/ps -ef
```

此时，容器内的进程已经与主机完全隔离。
我们再查看一下当前目录下的内容：

复制代码

```
/ # pwd

/

/ # /bin/ls -l

total 1468

drwxr-xr-x    2 root     root         12288 Sep  8 18:09 bin

-rw-------    1 root     root       1455104 Sep 19 14:47 busybox.tar

drwxr-xr-x    4 root     root          4096 Sep 19 08:41 dev

drwxr-xr-x    3 root     root          4096 Sep 19 08:41 etc

drwxr-xr-x    2 nobody   nobody        4096 Sep  8 18:09 home

dr-xr-xr-x  122 root     root             0 Sep 19 15:46 proc

drwx------    2 root     root          4096 Sep 19 13:07 root

drwxr-xr-x    2 root     root          4096 Sep 19 08:41 sys

drwxrwxrwt    2 root     root          4096 Sep  8 18:09 tmp

drwxr-xr-x    3 root     root          4096 Sep  8 18:09 usr

drwxr-xr-x    4 root     root          4096 Sep  8 18:09 var
```

可以看到当前目录已经为根目录，并且根目录下的文件就是我们上面准备的 busybox 镜像文件。
到此，一个完全由我们自己编写的 gocker 已经可以启动容器了。

### 结语

本课时我们讲解了 Golang 是什么, 并且配置好了 Golang 环境，编译了 gocker，也了解了 Linux /proc 文件系统的一些重要功能，最后使用 gocker 成功启动了一个 busybox 容器。

那么你知道，为什么 Docker 会选择使用 Golang 来开发吗？思考后，把你的想法写在留言区。

下一课时我将为你全面剖析 gocker 的源码以及它的实现原理，让你能够自己动手把它写出来，到时见。



上一课时我们安装了 Golang，学习了一些容器必备的基础知识，并且自己动手编译了一个 gocker，实现了 Namespace 的隔离。今天我将带你深入剖析 gocker 的源码和实现原理，并且带你实现 cgroups 的资源限制。

### gocker 源码剖析

打开 gocker 的源码，我们可以看到 gocker 的实现主要有两个 go 文件：一个是 main.go，一个是 run.go。这两个文件起了什么作用呢？

我们首先来看下 main.go 文件：

复制代码

```
$ cat main.go

package main



import (

    "log"

    "os"



    "github.com/urfave/cli/v2"

    "github.com/wilhelmguo/gocker/runc"

)



func main() {

    app := cli.NewApp()

    app.Name = "gocker"

    app.Usage = "gocker 是 golang 编写的精简版 Docker，目的是学习 Docker 的运行原理。"



    app.Commands = []*cli.Command{

        runc.InitCommand,

        runc.RunCommand,

    }



    if err := app.Run(os.Args); err != nil {

        log.Fatal(err)

    }

}
```

main.go 文件中引用了一个第三方工具库 github.com/urfave/cli，该工具库提供了一个编写命令行的工具，可以帮助我们快速构建命令行应用程序，Docker 默认的容器运行时 runC 也引用了该工具库。
main 函数是 gocker 执行的入口文件，main 定义了 gocker 的名称和简单介绍，同时调用了 InitCommand 和 RunCommand 实现了`gocker init`和`gocker run`这两个命令的初始化。

下面我们查看一下 run.go 的文件内容，run.go 文件中定义了 InitCommand 和 RunCommand 的详细实现以及容器启动的过程，文件内容如下。

复制代码

```
$ cat runc/run.go

package runc



import (

    "errors"

    "fmt"

    "io/ioutil"

    "log"

    "os"

    "os/exec"

    "path/filepath"

    "strings"

    "syscall"



    "github.com/urfave/cli/v2"

)



var RunCommand = &cli.Command{

    Name: "run",

    Usage: `启动一个隔离的容器

            gocker run -it [command]`,

    Flags: []cli.Flag{

        &cli.BoolFlag{

            Name:  "it",

            Usage: "是否启用命令行交互模式",

        },

        &cli.StringFlag{

            Name:  "rootfs",

            Usage: "容器根目录",

        },

    },

    Action: func(context *cli.Context) error {

        if context.Args().Len() < 1 {

            return errors.New("参数不全，请检查！")

        }

        read, write, err := os.Pipe()

        if err != nil {

            return err

        }

        tty := context.Bool("it")

        rootfs := context.String("rootfs")

        

        cmd := exec.Command("/proc/self/exe", "init")

        cmd.SysProcAttr = &syscall.SysProcAttr{

            Cloneflags: syscall.CLONE_NEWNS |

                syscall.CLONE_NEWUTS |

                syscall.CLONE_NEWIPC |

                syscall.CLONE_NEWPID |

                syscall.CLONE_NEWNET,

        }

        if tty {

            cmd.Stdin = os.Stdin

            cmd.Stdout = os.Stdout

            cmd.Stderr = os.Stderr

        }

        cmd.ExtraFiles = []*os.File{read}

        cmd.Dir = rootfs

        if err := cmd.Start(); err != nil {

            log.Println("command start error", err)

            return err

        }

        write.WriteString(strings.Join(context.Args().Slice(), " "))

        write.Close()

        cmd.Wait()

        return nil

    },

}



var InitCommand = &cli.Command{

    Name:  "init",

    Usage: "初始化容器进程，请勿直接调用！",

    Action: func(context *cli.Context) error {

        pwd, err := os.Getwd()

        if err != nil {

            log.Printf("Get current path error %v", err)

            return err

        }

        log.Println("Current path is ", pwd)

        cmdArray := readCommandArray()

        if cmdArray == nil || len(cmdArray) == 0 {

            return fmt.Errorf("Command is empty")

        }

        log.Println("CmdArray is ", cmdArray)

        err = pivotRoot(pwd)

        if err != nil {

            log.Printf("pivotRoot error %v", err)

            return err

        }

        //mount proc

        defaultMountFlags := syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV

        syscall.Mount("proc", "/proc", "proc", uintptr(defaultMountFlags), "")



        // 配置hostname

        if err := syscall.Sethostname([]byte("lagoudocker")); err != nil {

            fmt.Printf("Error setting hostname - %s\n", err)

            return err

        }

        path, err := exec.LookPath(cmdArray[0])

        if err != nil {

            log.Printf("Exec loop path error %v", err)

            return err

        }

        // export PATH=$PATH:/bin

        if err := syscall.Exec(path, cmdArray[0:], os.Environ()); err != nil {

            log.Println(err.Error())

        }

        return nil

    },

}



func pivotRoot(root string) error {

    // 确保新 root 和老 root 不在同一目录

    // MS_BIND：执行bind挂载，使文件或者子目录树在文件系统内的另一个点上可视。

    // MS_REC： 创建递归绑定挂载，递归更改传播类型

    if err := syscall.Mount(root, root, "bind", syscall.MS_BIND|syscall.MS_REC, ""); err != nil {

        return fmt.Errorf("Mount rootfs to itself error: %v", err)

    }

    // 创建 .pivot_root 文件夹，用于存储 old_root

    pivotDir := filepath.Join(root, ".pivot_root")

    if err := os.Mkdir(pivotDir, 0777); err != nil {

        return err

    }

    // 调用 Golang 封装的 PivotRoot

    if err := syscall.PivotRoot(root, pivotDir); err != nil {

        return fmt.Errorf("pivot_root %v", err)

    }

    // 修改工作目录

    if err := syscall.Chdir("/"); err != nil {

        return fmt.Errorf("chdir / %v", err)

    }

    pivotDir = filepath.Join("/", ".pivot_root")

    // 卸载 .pivot_root

    if err := syscall.Unmount(pivotDir, syscall.MNT_DETACH); err != nil {

        return fmt.Errorf("unmount pivot_root dir %v", err)

    }

    // 删除临时文件夹 .pivot_root

    return os.Remove(pivotDir)

}

func readCommandArray() []string {

    pipe := os.NewFile(uintptr(3), "pipe")

    msg, err := ioutil.ReadAll(pipe)

    if err != nil {

        log.Printf("init read pipe error %v", err)

        return nil

    }

    msgStr := string(msg)

    return strings.Split(msgStr, " ")

}
```

看到这么多代码你是不是有点懵？别担心，我帮你一一解读。

上面文件中有两个比较重要的变量 InitCommand 和 RunCommand，它们的作用如下：

- RunCommand 是当我们执行 gocker run 命令时调用的函数，是实现 gocker run 的入口；
- InitCommand 是当我们执行 gocker run 时自动调用 gocker init 来初始化容器的一些环境。

#### RunCommand （容器启动的入口）

我们先从 RunCommand 来分析：

复制代码

```
var RunCommand = &cli.Command{

    // 定义一个启动命令，这里定义的是 run 命令，当执行 gocker run 时会调用该函数

    Name: "run",

    // 使用说明

    Usage: `启动一个隔离的容器

            gocker run -it [command]`,

    // 执行 gocker run 命令可以传递的参数

    Flags: []cli.Flag{

        &cli.BoolFlag{

            Name:  "it",

            Usage: "是否启用命令行交互模式",

        },

        &cli.StringFlag{

            Name:  "rootfs",

            Usage: "容器根目录",

        },

    },

    // gocker run 命令的执行函数

    Action: func(context *cli.Context) error {

        // 校验参数 

        if context.Args().Len() < 1 {

            return errors.New("参数不全，请检查！")

        }

        read, write, err := os.Pipe()

        if err != nil {

            return err

        }

        // 获取传入的参数的值

        tty := context.Bool("it")

        rootfs := context.String("rootfs")

        // 这里执行 /proc/self/exe init 相当于执行 gocker init

        cmd := exec.Command("/proc/self/exe", "init")

        // 定义新创建哪些命名空间

        cmd.SysProcAttr = &syscall.SysProcAttr{

            Cloneflags: syscall.CLONE_NEWNS |

                syscall.CLONE_NEWUTS |

                syscall.CLONE_NEWIPC |

                syscall.CLONE_NEWPID |

                syscall.CLONE_NEWNET,

        }

        // 把容器的标准输出重定向到主机的标准输出

        if tty {

            cmd.Stdin = os.Stdin

            cmd.Stdout = os.Stdout

            cmd.Stderr = os.Stderr

        }

        cmd.ExtraFiles = []*os.File{read}

        cmd.Dir = rootfs

        // 启动容器

        if err := cmd.Start(); err != nil {

            log.Println("command start error", err)

            return err

        }

        write.WriteString(strings.Join(context.Args().Slice(), " "))

        write.Close()

        // 等待容器退出

        cmd.Wait()

        return nil

        }
```

RunCommand 变量实际上是一个 Command 结构体，这个结构体包含了四个变量。

1. Name：定义一个启动命令，这里定义的是 run 命令，当执行 gocker run 时会调用该函数。
2. Usage：`gocker run`命令的使用说明。
3. Flags：执行`gocker run`命令可以传递的参数。
4. Action： 该变量是真正的 gocker run 命令的入口， 主要做了以下事情：
   - 校验 gocker run 传递的参数；
   - 构造一个 Pipe，把 gocker 的启动参数写入，方便在 init 进程中获取；
   - 定义 /proc/self/exe init 调用，相当于调用 gocker init ；
   - 创建五种命名空间用于资源隔离，分别为 Mount Namespace、UTS Namespace、IPC Namespace、PID Namespace 和 Net Namespace；
   - 调用 cmd.Start 函数，开始执行容器启动步骤，首先创建出来一个 namespace （上一步定义的五种namespace）隔离的进程，然后调用 /proc/self/exe，也就是调用 gocker init，执行 InitCommand 中定义的容器初始化步骤。

那么 InitCommand 究竟做了什么呢？

#### InitCommand（准备容器环境）

下面我们看下 InitCommand 中的内容：

复制代码

```
var InitCommand = &cli.Command{

    Name:  "init",

    Usage: "初始化容器进程，请勿直接调用！",

    Action: func(context *cli.Context) error {

        // 获取当前执行目录

        pwd, err := os.Getwd()

        if err != nil {

            log.Printf("Get current path error %v", err)

            return err

        }

        log.Println("Current path is ", pwd)

        // 获取用户传递的启动参数

        cmdArray := readCommandArray()

        if cmdArray == nil || len(cmdArray) == 0 {

            return fmt.Errorf("Command is empty")

        }

        log.Println("CmdArray is ", cmdArray)

        // pivotRoot 的作用类似于 chroot，可以把我们准备的镜像目录设置为容器的根目录。

        err = pivotRoot(pwd)

        if err != nil {

            log.Printf("pivotRoot error %v", err)

            return err

        }

        // 挂载容器自己的 proc 目录，实现 ps 只能看到容器自己的进程

        defaultMountFlags := syscall.MS_NOEXEC | syscall.MS_NOSUID | syscall.MS_NODEV

        syscall.Mount("proc", "/proc", "proc", uintptr(defaultMountFlags), "")

        // 配置主机名为 lagoudocker

        if err := syscall.Sethostname([]byte("lagoudocker")); err != nil {

            fmt.Printf("Error setting hostname - %s\n", err)

            return err

        }

        path, err := exec.LookPath(cmdArray[0])

        if err != nil {

            log.Printf("Exec loop path error %v", err)

            return err

        }

        // syscall.Exec 相当于 shell 中的 exec 实现，这里用 用户传递的主命令来替换 init 进程，从而实现容器的 1 号进程为用户传递的主进程

        if err := syscall.Exec(path, cmdArray[0:], os.Environ()); err != nil {

            log.Println(err.Error())

        }

        return nil

    },

}

      
```

通过代码你能看出 InitCommand 都做了哪些容器启动前的准备工作吗？

InitCommand 主要做了以下几件事情：

1. 获取当前运行目录；
2. 从 RunCommand 中获取用户传递的容器启动参数；
3. 修改当前进程运行的根目录为用户传递的 rootfs 目录；
4. 挂载容器自己的 proc 目录，使得容器中执行 ps 命令只能看到自己命名空间下的进程；
5. 设置容器的主机名称为 lagoudocker；
6. 执行 syscall.Exec 实现使用用户传递的启动命令替换当前 init 进程。

这里有两个比较关键的技术点 pivotRoot 和 syscall.Exec。

- pivotRoot：pivotRoot 是一个系统调用，主要功能是改变当前进程的根目录，它可以把当前进程的根目录移动到我们传递的 rootfs 目录下，从而使得我们不仅能够看到指定目录，还可以看到它的子目录信息。
- syscall.Exec：syscall.Exec 是一个系统调用，这个系统调用可以实现执行指定的命令，但是并不创建新的进程，而是在当前的进程空间执行，替换掉正在执行的进程，复用同一个进程号。通过这种机制，才实现了我们在容器中看到的 1 号进程是我们传递的命令，而不是 init 进程。

最后，总结下容器的完整创建流程:

1.使用以下命令创建容器

复制代码

```
gocker run -it -rootfs=/tmp/busybox /bin/sh
```

2.RunCommand 解析请求的参数（-it -rootfs=/tmp/busybox）和主进程启动命令（/bin/sh）；

3.创建 namespace 隔离的容器进程；

4.启动容器进程；

5.容器内的进程执行 /proc/self/exe 调用自己实现容器的初始化，修改当前进程运行的根目录，挂载 proc 文件系统，修改主机名，最后使用 sh 进程替换当前容器的进程，使得容器的主进程为 sh 进程。

目前我们的容器虽然实现了使用 Namespace 隔离各种资源，但是容器内的进程仍然可以任意地使用主机的 CPU 、内存等资源。而这可能导致主机的资源竞争，下面我们使用cgroups来实现对 CPU 和内存的限制。

### 为 gocker 添加 cgroups 限制

我们手动操作 cgroups 实现了对容器资源的限制，下面我把这部分手动操作转化为代码。

#### 编写资源限制源码

首先我们定义 cgroups 的挂载目录和我们要创建的目录，定义如下：

复制代码

```
const gockerCgroupPath = "gocker"

const cgroupsRoot = "/sys/fs/cgroup"
```

然后定义Cgroups结构体，分别定义 CPU 和 Memory 字段，用于存储用户端传递的 CPU 和 Memory 限制值：

复制代码

```
type Cgroups struct {

    // 单位 核

    CPU int

    // 单位 兆

    Memory int

}
```

接着定义 Cgroups 对象的一些操作方法，这样方便我们对当前容器的 cgroups 进程操作。方法定义如下。

- Apply：把容器的 pid 写入到对应子系统下的 tasks 文件中，使得 cgroups 限制对容器进程生效。
- Destroy：容器退出时删除对应的 cgroups 文件。
- SetCPULimit：将 CPU 限制值写入到 cpu.cfs_quota_us 文件中。
- SetMemoryLimit：将内存限制值写入 memory.limit_in_bytes 文件中。

复制代码

```
func (c *Cgroups) Apply(pid int) error {

    if c.CPU != 0 {

        cpuCgroupPath, err := getCgroupPath("cpu", true)

        if err != nil {

            return err

        }

        err = ioutil.WriteFile(path.Join(cpuCgroupPath, "tasks"), []byte(strconv.Itoa(pid)), 0644)

        if err != nil {

            return fmt.Errorf("set cgroup cpu fail %v", err)

        }

    }

    if c.Memory != 0 {

        memoryCgroupPath, err := getCgroupPath("memory", true)

        if err != nil {

            return err

        }

        err = ioutil.WriteFile(path.Join(memoryCgroupPath, "tasks"), []byte(strconv.Itoa(pid)), 0644)

        if err != nil {

            return fmt.Errorf("set cgroup memory fail %v", err)

        }

    }

    return nil

}



// 释放cgroup

func (c *Cgroups) Destroy() error {

    if c.CPU != 0 {

        cpuCgroupPath, err := getCgroupPath("cpu", false)

        if err != nil {

            return err

        }

        return os.RemoveAll(cpuCgroupPath)

    }

    if c.Memory != 0 {

        memoryCgroupPath, err := getCgroupPath("memory", false)

        if err != nil {

            return err

        }

        return os.RemoveAll(memoryCgroupPath)

    }

    return nil

}



func (c *Cgroups) SetCPULimit(cpu int) error {

    cpuCgroupPath, err := getCgroupPath("cpu", true)

    if err != nil {

        return err

    }

    if err := ioutil.WriteFile(path.Join(cpuCgroupPath, "cpu.cfs_quota_us"), []byte(strconv.Itoa(cpu*100000)), 0644); err != nil {

        return fmt.Errorf("set cpu limit fail %v", err)

    }

    return nil

}



func (c *Cgroups) SetMemoryLimit(memory int) error {

    memoryCgroupPath, err := getCgroupPath("memory", true)

    if err != nil {

        return err

    }

    if err := ioutil.WriteFile(path.Join(memoryCgroupPath, "memory.limit_in_bytes"), []byte(strconv.Itoa(memory*1024*1024)), 0644); err != nil {

        return fmt.Errorf("set memory limit fail %v", err)

    }

    return nil

}
```

最后在 run 命令的 Action 函数中，添加 cgroups 初始化逻辑，将 CPU 和内存的限制值写入到 cgroups 文件中，并且将当前进程的 pid 也写入到 cgroups 的 tasks 文件中，使得 CPU 和内存的限制对于当前容器进程生效。

复制代码

```
        cgroup := cgroups.NewCgroups()

        defer cgroup.Destroy()

        cpus := context.Int("cpus")

        if cpus != 0 {

            cgroup.SetCPULimit(cpus)

        }

        m := context.Int("m")

        if m != 0 {

            cgroup.SetMemoryLimit(m)

        }

        cgroup.Apply(cmd.Process.Pid)
```

到此，我们成功实现了一个带有资源限制的 gocker 容器。下面进入 gocker 的目录，并且编译一下 gocker：

复制代码

```
$ cd gocker

$ git checkout lesson-18

$ go install
```

执行完 go install 后， Golang 会自动帮助我们编译当前项目下的代码，编译后的二进制文件存放在 $GOPATH/bin 目录下，由于我们之前在 $HOME/.bashrc 文件下把 $GOPATH/bin 放入了系统 PATH 中，所以此时你可以直接使用 gocker 命令了。

#### 启动带有资源限制的容器

接下来我们使用 gocker 来启动一个带有 CPU 限制的容器：

复制代码

```
# gocker run -it -cpus=1 -rootfs=/tmp/busybox /bin/sh

2020/09/19 23:46:27 Current path is  /tmp/busybox

2020/09/19 23:46:27 CmdArray is  [/bin/sh]

/ #
```

然后我们新打开一个命令行窗口，查看一下 cgroups 相关的文件是否被创建：

复制代码

```
# cd /sys/fs/cgroup/cpu

# ls -l

总用量 0

-rw-r--r--  1 root root 0 9月  19 21:34 cgroup.clone_children

--w--w--w-  1 root root 0 9月  19 21:34 cgroup.event_control

-rw-r--r--  1 root root 0 9月  19 21:34 cgroup.procs

-r--r--r--  1 root root 0 9月  19 21:34 cgroup.sane_behavior

-r--r--r--  1 root root 0 9月  19 21:34 cpuacct.stat

-rw-r--r--  1 root root 0 9月  19 21:34 cpuacct.usage

-r--r--r--  1 root root 0 9月  19 21:34 cpuacct.usage_percpu

-rw-r--r--  1 root root 0 9月  19 21:34 cpu.cfs_period_us

-rw-r--r--  1 root root 0 9月  19 21:34 cpu.cfs_quota_us

-rw-r--r--  1 root root 0 9月  19 21:34 cpu.rt_period_us

-rw-r--r--  1 root root 0 9月  19 21:34 cpu.rt_runtime_us

-rw-r--r--  1 root root 0 9月  19 21:34 cpu.shares

-r--r--r--  1 root root 0 9月  19 21:34 cpu.stat

drwxr-xr-x  2 root root 0 9月  22 20:48 gocker

-rw-r--r--  1 root root 0 9月  19 21:34 notify_on_release

-rw-r--r--  1 root root 0 9月  19 21:34 release_agent

drwxr-xr-x 70 root root 0 9月  22 20:24 system.slice

-rw-r--r--  1 root root 0 9月  19 21:34 tasks

drwxr-xr-x  2 root root 0 9月  19 21:34 user.slice
```

可以看到我们启动容器后， gocker 在 cpu 子系统下，已经成功创建 gocker 目录。然后我们查看一下 gocker 目录下的内容：

复制代码

```
# ls -l gocker/

总用量 0

-rw-r--r-- 1 root root 0 9月  22 20:48 cgroup.clone_children

--w--w--w- 1 root root 0 9月  22 20:48 cgroup.event_control

-rw-r--r-- 1 root root 0 9月  22 20:48 cgroup.procs

-r--r--r-- 1 root root 0 9月  22 20:48 cpuacct.stat

-rw-r--r-- 1 root root 0 9月  22 20:48 cpuacct.usage

-r--r--r-- 1 root root 0 9月  22 20:48 cpuacct.usage_percpu

-rw-r--r-- 1 root root 0 9月  22 20:48 cpu.cfs_period_us

-rw-r--r-- 1 root root 0 9月  22 20:48 cpu.cfs_quota_us

-rw-r--r-- 1 root root 0 9月  22 20:48 cpu.rt_period_us

-rw-r--r-- 1 root root 0 9月  22 20:48 cpu.rt_runtime_us

-rw-r--r-- 1 root root 0 9月  22 20:48 cpu.shares

-r--r--r-- 1 root root 0 9月  22 20:48 cpu.stat

-rw-r--r-- 1 root root 0 9月  22 20:48 notify_on_release

-rw-r--r-- 1 root root 0 9月  22 20:48 tasks
```

可以看到 cgroups 已经帮我们初始化好了 cpu 子系统的文件，然后我们查看一下 cpu.cfs_quota_us 的内容：

复制代码

```
# cat gocker/cpu.cfs_quota_us

100000
```

可以看到我们容器的 CPU资源已经被限制为 1 核。下面我们来验证一下 CPU 限制是否生效。
首先我们在容器窗口使用以下命令制造一个死循环，来提升 cpu 使用率：

复制代码

```
# while true;do echo;done;
```

然后在主机的窗口使用 top 查看一下cpu 使用率：

复制代码

```
top - 20:57:50 up 2 days, 23:23,  2 users,  load average: 1.08, 0.27, 0.14

Tasks: 113 total,   4 running, 109 sleeping,   0 stopped,   0 zombie

%Cpu(s): 23.5 us, 26.9 sy,  0.0 ni, 49.2 id,  0.0 wa,  0.0 hi,  0.3 si,  0.0 st

KiB Mem :  3880512 total,  1573052 free,   408696 used,  1898764 buff/cache

KiB Swap:        0 total,        0 free,        0 used.  3141076 avail Mem



  PID USER      PR  NI    VIRT    RES    SHR S  %CPU %MEM     TIME+ COMMAND

30766 root      20   0    1312    260    212 R  99.3  0.0   0:30.90 sh
```

通过 top 的输出可以看到我们的容器 cpu 使用率被限制到了 100% 以内，即 1 个核。

到此，我们的容器不仅有了 Namespace 隔离，同时也有了 cgroups 的资源限制。

### 结语

上一课时和本课时，我们一起安装了 golang，并且使用 golang 实现了一个精简版的 Docker，它具有基本的 namespace 隔离，并且还使用 cgroups 对容器进行了资源限制。

这两个课时的关键技术我帮你总结如下。

1. Linux 的 /proc 目录是一种“文件系统”，它存放于内存中，是一个虚拟的文件系统，/proc 目录存放了当前内核运行状态的一系列特殊的文件，你可以通过这些文件查看当前的进程信息。
2. /proc/self/exe 是一个特殊的连接，执行该文件等同于执行当前程序的二进制文件
3. pivotRoot 是一个系统调用，主要功能是改变当前进程的根目录，它可以把当前进程的根目录移动到我们传递的 rootfs 目录下
4. syscall.Exec 是一个系统调用，这个系统调用可以实现新的进程直接替换正在执行的老的进程，并且复用老进程的 ID。

另外，容器的实现当然离不开 Linux 的 namespace 和 cgroups 这两项关键技术，有了 Linux 的这些关键技术才使得我们的容器可以顺利实现，可以说 Linux 是容器技术的基石。而容器的编写，我们不仅可以使用 Go 语言，也可以使用其他编程语言，甚至只使用 shell 命令也可以实现一个容器。
