---
title: 重学 Docker 之 容器编排三剑客
date: 2021-03-27 14:00:00
categories: Docker
tags:
  - docker
---

Docker Compose 、Docker Swarm 、Kubernetes。

<!--more-->

## 如何使用 Docker Compose 解决开发环境的依赖？

### Docker Compose 的前世今生

Docker Compose 的前身是 Orchard 公司开发的 Fig，2014 年 Docker 收购了 Orchard 公司，然后将 Fig 重命名为 Docker Compose。现阶段 Docker Compose 是 Docker 官方的单机多容器管理系统，它本质是一个 Python 脚本，它通过解析用户编写的 yaml 文件，调用 Docker API 实现动态的创建和管理多个容器。

要想使用 Docker Compose，需要我们先安装一个 Docker Compose。

### 安装 Docker Compose

Docker Compose 可以安装在 macOS、 Windows 和 Linux 系统中，其中在 macOS 和 Windows 系统下 ，Docker Compose 都是随着 Docker 的安装一起安装好的，这里就不再详细介绍。 下面我重点介绍下如何在 Linux 系统下安装 Docker Compose。

#### Linux 系统下安装 Docker Compose

在安装 Docker Compose 之前，请确保你的机器已经正确运行了 Docker，如果你的机器还没有安装 Docker，请参考[官方网站](https://docs.docker.com/engine/install/)安装 Docker。

要在 Linux 平台上安装 Docker Compose，我们需要到 Compose 的 Github 页面下载对应版本的安装包。这里我以 1.27.3 版本为例，带你安装一个 Docker Compose。

（1）使用 curl 命令（一种发送 http 请求的命令行工具）下载 Docker Compose 的安装包：

```bash
$ sudo curl -L "https://github.com/docker/compose/releases/download/1.27.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

> 如果你想要安装其他版本的 Docker Compose，将 1.27.3 替换为你想要安装的版本即可。

（2）修改 Docker Compose 执行权限：

```bash
$ sudo chmod +x /usr/local/bin/docker-compose
```

（3）检查 Docker Compose 是否安装成功：

```bash
$ docker-compose --version
docker-compose version 1.27.3, build 1110ad01
```

当我们执行完上述命令后，如果 Docker Compose 输出了当前版本号，就表示我们的 Docker Compose 已经安装成功。 Docker Compose 安装成功后，我们就可以很方便地使用它了。

在使用 Docker Compose 之前，我们首先需要先编写 Docker Compose 模板文件，因为 Docker Compose 运行的时候是根据 Docker Compose 模板文件中的定义来运行的。

下面我们首先来学习一下如何编写一个 Docker Compose 模板文件。

### 编写 Docker Compose 模板文件

在使用 Docker Compose 启动容器时， Docker Compose 会默认使用 docker-compose.yml 文件， docker-compose.yml 文件的格式为 yaml（类似于 json，一种标记语言）。

Docker Compose 模板文件一共有三个版本： v1、v2 和 v3。目前最新的版本为 v3，也是功能最全面的一个版本，下面我主要围绕 v3 版本介绍一下如何编写 Docker Compose 文件。

Docker Compose 文件主要分为三部分： services（服务）、networks（网络） 和 volumes（数据卷）。

- services（服务）：服务定义了容器启动的各项配置，就像我们执行`docker run`命令时传递的容器启动的参数一样，指定了容器应该如何启动，例如容器的启动参数，容器的镜像和环境变量等。
- networks（网络）：网络定义了容器的网络配置，就像我们执行`docker network create`命令创建网络配置一样。
- volumes（数据卷）：数据卷定义了容器的卷配置，就像我们执行`docker volume create`命令创建数据卷一样。

一个典型的 Docker Compose 文件结构如下：

```yaml
version: "3"
services:
  nginx:
    ## ... 省略部分配置
networks:
  frontend:
  backend:
volumes:
  db-data:
```

下面我们首先来学习一下如何编写 services 部分的配置。

#### 编写 Service 配置

services 下，首先需要定义服务名称，例如你这个服务是 nginx 服务，你可以定义 service 名称为 nginx，格式如下：

```yaml
version: "3.8"
services:
  nginx: 
```

服务名称定义完毕后，我们需要在服务名称的下一级定义当前服务的各项配置，使得我们的服务可以按照配置正常启动。常用的 16 种 service 配置如下。如果你比较了解，可以直接跳过看 Volume 配置和后续实操即可。

build： 用于构建 Docker 镜像，类似于docker build命令，build 可以指定 Dockerfile 文件路径，然后根据 Dockerfile 命令来构建文件。使用方法如下：

```yaml
build:
  ## 构建执行的上下文目录
  context: .
  ## Dockerfile 名称
  dockerfile: Dockerfile-name
```

cap_add、cap_drop： 指定容器可以使用到哪些内核能力（capabilities）。使用格式如下：

```yaml
cap_add:
  - NET_ADMIN
cap_drop:
  - SYS_ADMIN
```

command： 用于覆盖容器默认的启动命令，它和 Dockerfile 中的 CMD 用法类似，也有两种使用方式：

```yaml
command: sleep 3000
```

```yaml
command: ["sleep", "3000"]
```

container_name： 用于指定容器启动时容器的名称。使用格式如下：

```yaml
container_name: nginx
```

depends_on： 用于指定服务间的依赖关系，这样可以先启动被依赖的服务。例如，我们的服务依赖数据库服务 db，可以指定 depends_on 为 db。使用格式如下：

```yaml
version: "3.8"
services:
  my-web:
    build: .
    depends_on:
      - db
  db:
    image: mysql
```

devices： 挂载主机的设备到容器中。使用格式如下：

```yaml
devices:
  - "/dev/sba:/dev/sda"
```

dns： 自定义容器中的 dns 配置。

```yaml
dns:
  - 8.8.8.8
  - 114.114.114.114
```

dns_search： 配置 dns 的搜索域。

```yaml
dns_search:
  - svc.cluster.com
  - svc1.cluster.com
```

entrypoint： 覆盖容器的 entrypoint 命令。

```yaml
entrypoint: sleep 3000
```

或

```yaml
entrypoint: ["sleep", "3000"]
```

env_file： 指定容器的环境变量文件，启动时会把该文件中的环境变量值注入容器中。

```yaml
env_file:
  - ./dbs.env
```

env 文件的内容格式如下：

```yaml
KEY_ENV=values
```

environment： 指定容器启动时的环境变量。

```yaml
environment:
  - KEY_ENV=values
```

image： 指定容器镜像的地址。

```yaml
image: busybox:latest
```

pid： 共享主机的进程命名空间，像在主机上直接启动进程一样，可以看到主机的进程信息。

```yaml
pid: "host"
```

ports： 暴露端口信息，使用格式为 HOST:CONTAINER，前面填写要映射到主机上的端口，后面填写对应的容器内的端口。

```yaml
ports:
  - "1000"
  - "1000-1005"
  - "8080:8080"
  - "8888-8890:8888-8890"
  - "2222:22"
  - "127.0.0.1:9999:9999"
  - "127.0.0.1:3000-3005:3000-3005"
  - "6789:6789/udp"
```

networks： 这是服务要使用的网络名称，对应顶级的 networks 中的配置。

```yaml
services:
  my-service:
    networks:
     - hello-network
     - hello1-network
```

volumes： 不仅可以挂载主机数据卷到容器中，也可以直接挂载主机的目录到容器中，使用方式类似于使用docker run启动容器时添加 -v 参数。

```yaml
version: "3"
services:
  db:
    image: mysql:5.6
    volumes:
      - type: volume
        source: /var/lib/mysql
        target: /var/lib/mysql
```

#### 编写 Volume 配置

如果你想在多个容器间共享数据卷，则需要在外部声明数据卷，然后在容器里声明使用数据卷。例如我想在两个服务间共享日志目录，则使用以下配置：

```yaml
version: "3"
services:
  my-service1:
    image: service:v1
    volumes:
      - type: volume
        source: logdata
        target: /var/log/mylog
  my-service2:
    image: service:v2
    volumes:
      - type: volume
        source: logdata
        target: /var/log/mylog
volumes:
  logdata:
```

#### 编写 Network 配置

Docker Compose 文件顶级声明的 networks 允许你创建自定义的网络，类似于`docker network create`命令。

例如你想声明一个自定义 bridge 网络配置，并且在服务中使用它，使用格式如下：

```yaml
version: "3"
services:
  web:
    networks:
      mybridge: 
        ipv4_address: 172.16.1.11
networks:
  mybridge:
    driver: bridge
    ipam: 
      driver: default
      config:
        subnet: 172.16.1.0/24
```

编写完 Docker Compose 模板文件后，需要使用 docker-compose 命令来运行这些文件。下面我们来学习下 docker-compose 都有哪些操作命令。

### Docker Compose 操作命令

我们可以使用`docker-compose -h`命令来查看 docker-compose 的用法，docker-compose 的基本使用格式如下：

```bash
docker-compose [-f <arg>...] [options] [--] [COMMAND] [ARGS...]
```

其中 options 是 docker-compose 的参数，支持的参数和功能说明如下：

```bash
  -f, --file FILE             指定 docker-compose 文件，默认为 docker-compose.yml
  -p, --project-name NAME     指定项目名称，默认使用当前目录名称作为项目名称
  --verbose                   输出调试信息
  --log-level LEVEL           日志级别 (DEBUG, INFO, WARNING, ERROR, CRITICAL)
  -v, --version               输出当前版本并退出
  -H, --host HOST             指定要连接的 Docker 地址
  --tls                       启用 TLS 认证
  --tlscacert CA_PATH         TLS CA 证书路径
  --tlscert CLIENT_CERT_PATH  TLS 公钥证书问价
  --tlskey TLS_KEY_PATH       TLS 私钥证书文件
  --tlsverify                 使用 TLS 校验对端
  --skip-hostname-check       不校验主机名
  --project-directory PATH    指定工作目录，默认是 Compose 文件所在路径。
```

COMMAND 为 docker-compose 支持的命令。支持的命令如下：

```bash
  build              构建服务
  config             校验和查看 Compose 文件
  create             创建服务
  down               停止服务，并且删除相关资源
  events             实时监控容器的时间信息
  exec               在一个运行的容器中运行指定命令
  help               获取帮助
  images             列出镜像
  kill               杀死容器
  logs               查看容器输出
  pause              暂停容器
  port               打印容器端口所映射出的公共端口
  ps                 列出项目中的容器列表
  pull               拉取服务中的所有镜像
  push               推送服务中的所有镜像
  restart            重启服务
  rm                 删除项目中已经停止的容器
  run                在指定服务上运行一个命令
  scale              设置服务运行的容器个数
  start              启动服务
  stop               停止服务
  top                限制服务中正在运行中的进程信息
  unpause            恢复暂停的容器
  up                 创建并且启动服务
  version            打印版本信息并退出
```

好了，学习完 Docker Compose 模板的编写和 docker-compose 命令的使用方法，下面我们编写一个 Docker Compose 模板文件，实现一键启动 WordPress 服务（一种博客系统），来搭建一个属于我们自己的博客系统。

### 使用 Docker Compose 管理 WordPress

#### 启动 WordPress

第一步，创建项目目录。首先我们在 /tmp 目录下创建一个 WordPress 的目录，这个目录将作为我们的工作目录。

```bash
$ mkdir /tmp/wordpress
```

第二步，进入工作目录。

```bash
$ cd /tmp/wordpress
```

第三步，创建 docker-compose.yml 文件。

```bash
$ touch docker-compose.yml
```

然后写入以下内容：

```yaml
version: '3'
services:
   mysql:
     image: mysql:5.7
     volumes:
       - mysql_data:/var/lib/mysql
     restart: always
     environment:
       MYSQL_ROOT_PASSWORD: root
       MYSQL_DATABASE: mywordpress
       MYSQL_USER: mywordpress
       MYSQL_PASSWORD: mywordpress
   wordpress:
     depends_on:
       - mysql
     image: wordpress:php7.4
     ports:
       - "8080:80"
     restart: always
     environment:
       WORDPRESS_DB_HOST: mysql:3306
       WORDPRESS_DB_USER: mywordpress
       WORDPRESS_DB_PASSWORD: mywordpress
       WORDPRESS_DB_NAME: mywordpress
volumes:
    mysql_data: {}
```

第四步，启动 MySQL 数据库和 WordPress 服务。

```bash
$ docker-compose up -d
Starting wordpress_mysql_1 ... done
Starting wordpress_wordpress_1 ... done
```

执行完以上命令后，Docker Compose 首先会为我们启动一个 MySQL 数据库，按照 MySQL 服务中声明的环境变量来设置 MySQL 数据库的用户名和密码。然后等待 MySQL 数据库启动后，再启动 WordPress 服务。WordPress 服务启动后，我们就可以通过 http://localhost:8080 访问它了，访问成功后，我们就可以看到以下界面，然后按照提示一步一步设置就可以拥有属于自己的专属博客系统了。

#### 停止 WordPress

如果你不再需要 WordPress 服务了，可以使用`docker-compose stop`命令来停止已启动的服务。

> Docker Compose 是一个用来定义复杂应用的单机编排工具，通常用于服务依赖关系复杂的开发和测试环境，如果你还在为配置复杂的开发环境而烦恼，Docker Compose 可以轻松帮你搞定复杂的开发环境。你只需要把复杂的开发环境使用 Docker Compose 模板文件描述出来，之后无论你在哪里可以轻松的一键启动开发和测试环境，极大地提高了我们的开发效率，同时也避免了污染我们开发机器的配置。

## 如何在生产环境中使用 Docker Swarm 调度容器？

Docker 的单节点引擎工具 Docker Compose，它能够在单一节点上管理和编排多个容器，当我们的服务和容器数量较小时可以使用 Docker Compose 来管理容器。

然而随着我们的业务规模越来越大，我们的容器规模也逐渐增大时，数量庞大的容器管理将给我们带来许多挑战。Docker 官方为了解决多容器管理的问题推出了 Docker Swarm ，我们可以用它来管理规模更大的容器集群。

### Swarm 的前生今世

2014 年 Docker 在容器界越来越火，这时容器的编排工具 Mesos 和 Kubernetes 也开始崭露头角。此时，Docker 公司也开始筹划容器的编排和集群管理工具，推出了自己的通信协议项目 Beam。后来，通过改进 Beam，Beam 成为一个允许使用 Docker API 来控制的一种分布式系统，之后项目被重命名为 libswarm。然而在 2014 年 11 月，Docker 公司又对 libswarm 进行了重新设计，支持了远程调用 API，并且被重新命名为 Swarm。到此我们称之为 Swarm V1。

在 2016 年，为了解决中央服务可扩展性的问题，Docker 团队重新设计了 Swarm，并称之为 Swarm V2。此时的 Docker Swarm 已经可以支持超过 1000 多个节点的集群规模，并且 Docker 团队在发布 Docker 1.12 版本时，将 Docker Swarm 默认集成到了 Docker 引擎中。

由于 Swarm 是 Docker 官方推出的容器集群管理工具，因此 Swarm 最大的优势之一就是原生支持 Docker API，给用户带来了极大的便利，原来的 Docker 用户可以很方便地将服务迁移到 Swarm 中来。

与此同时，Swarm 还内置了对 Docker 网络插件的支持，因此用户可以很方便地部署需要跨主机通信的容器集群。其实 Swarm 的优点远远不止这些，还有很多，例如以下优点。

- **分布式：** Swarm 使用[Raft](https://raft.github.io/)（一种分布式一致性协议）协议来做集群间数据一致性保障，使用多个容器节点组成管理集群，从而避免单点故障。
- **安全：** Swarm 使用 TLS 双向认证来确保节点之间通信的安全，它可以利用双向 TLS 进行节点之间的身份认证，角色授权和加密传输，并且可以自动执行证书的颁发和更换。
- **简单：** Swarm 的操作非常简单，并且除 Docker 外基本无其他外部依赖，而且从 Docker 1.12 版本后， Swarm 直接被内置到了 Docker 中，可以说真正做到了开箱即用。

Swarm 的这些优点得益于它优美的架构设计，下面我们来了解一下 Swarm 的架构。

### Swarm 的架构

Swarm 的架构整体分为**管理节点**（Manager Nodes）和**工作节点**（Worker Nodes），整体架构如下图：

![Swarm 架构图][1]

**管理节点：** 管理节点负责接受用户的请求，用户的请求中包含用户定义的容器运行状态描述，然后 Swarm 负责调度和管理容器，并且努力达到用户所期望的状态。

**工作节点：** 工作节点运行执行器（Executor）负责执行具体的容器管理任务（Task），例如容器的启动、停止、删除等操作。

> 管理节点和工作节点的角色并不是一成不变的，你可以手动将工作节点转换为管理节点，也可以将管理节点转换为工作节点。

### Swarm 核心概念

在真正使用 Swarm 之前，我们需要了解几个 Swarm 的核心概念，这些核心概念可以帮助我们更好地学习和理解 Swarm 的设计理念。

#### Swarm 集群

Swarm 集群是一组被 Swarm 统一管理和调度的节点，被 Swarm纳管的节点可以是物理机或者虚拟机。其中一部分节点作为管理节点，负责集群状态的管理和协调，另一部分作为工作节点，负责执行具体的任务来管理容器，实现用户服务的启停等功能。

#### 节点

Swarm 集群中的每一台物理机或者虚拟机称为节点。节点按照工作职责分为**管理节点**和**工作节点**，管理节点由于需要使用 Raft 协议来协商节点状态，生产环境中通常建议将管理节点的数量设置为奇数个，一般为 3 个、5 个或 7 个。

#### 服务

服务是为了支持容器编排所提出的概念，它是一系列复杂容器环境互相协作的统称。一个服务的声明通常包含容器的启动方式、启动的副本数、环境变量、存储、配置、网络等一系列配置，用户通过声明一个服务，将它交给 Swarm，Swarm 负责将用户声明的服务实现。

服务分为全局服务（global services）和副本服务（replicated services）。

- 全局服务：每个工作节点上都会运行一个任务，类似于 Kubernetes 中的 [Daemonset](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)。
- 副本服务：按照指定的副本数在整个集群中调度运行。

#### 任务

任务是集群中的最小调度单位，它包含一个真正运行中的 Docker 容器。当管理节点根据服务中声明的副本数将任务调度到节点时，任务则开始在该节点启动和运行，当节点出现异常时，任务会运行失败。此时调度器会把失败的任务重新调度到其他正常的节点上正常运行，以确保运行中的容器副本数满足用户所期望的副本数。

#### 服务外部访问

由于容器的 IP 只能在集群内部访问到，而且容器又是用后马上销毁，这样容器的 IP 也会动态变化，因此容器集群内部的服务想要被集群外部的用户访问到，服务必须要映射到主机上的固定端口。Swarm 使用入口负载均衡（ingress load balancing）的模式将服务暴露在主机上，该模式下，每一个服务会被分配一个公开端口（PublishedPort），你可以指定使用某个未被占用的公开端口，也可以让 Swarm 自动分配一个。

Swarm 集群的公开端口可以从集群内的任意节点上访问到，当请求达到集群中的一个节点时，如果该节点没有要请求的服务，则会将请求转发到实际运行该服务的节点上，从而响应用户的请求。公有云的云负载均衡器（cloud load balancers）可以利用这一特性将流量导入到集群中的一个或多个节点，从而实现利用公有云的云负载均衡器将流量导入到集群中的服务。

### 搭建 Swarm 集群

要想使用 Swarm 集群有如下一些要求：

- Docker 版本大于 1.12，推荐使用最新稳定版 Docker；
- 主机需要开放一些端口（TCP：2377 UDP:4789 TCP 和 UDP:7946）。

下面我通过四台机器来搭建一个 Swarm 集群，演示的节点规划如下：

|   节点名词    |     节点IP     |  角色   |
| :-----------: | :------------: | :-----: |
| swarm-manager | 192.168.31.100 | manager |
|  swarm-node1  | 192.168.31.101 |  node   |
|  swarm-node2  | 192.168.31.102 |  node   |
|  swarm-node3  | 192.168.31.103 |  node   |

> 生产环境中推荐使用至少三个 manager 作为管理节点。

- 第一步：初始化集群

Docker 1.12 版本后， Swarm 已经默认集成到了 Docker 中，因此我们可以直接使用 Docker 命令来初始化 Swarm，集群初始化的命令格式如下：

```bash
docker swarm init --advertise-addr <YOUR-IP>
```

> advertise-addr 一般用于主机有多块网卡的情况，如果你的主机只有一块网卡，可以忽略此参数。

在管理节点上，通过以下命令初始化集群：

```bash
$ docker swarm init
Swarm initialized: current node (1ehtnlcf3emncktgjzpoux5ga) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-1kal5b1iozbfmnnhx3kjfd3y6yqcjjjpcftrlg69pm2g8hw5vx-8j4l0t2is9ok9jwwc3tovtxbp 192.168.31.100:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

集群初始化后， Swarm 会提示我们当前节点已经作为一个管理节点了，并且提示了如何把一台主机加入集群成为工作节点。

- 第二步：加入工作节点

按照第一步集群初始化后输出的提示，只需要复制其中的命令即可，然后在剩余的三台工作节点上分别执行如下命令：

```bash
$ docker swarm join --token SWMTKN-1-1kal5b1iozbfmnnhx3kjfd3y6yqcjjjpcftrlg69pm2g8hw5vx-8j4l0t2is9ok9jwwc3tovtxbp 192.168.31.100:2377
This node joined a swarm as a worker.
```

默认加入的节点为工作节点，如果是生产环境，我们可以使用docker swarm join-token manager命令来查看如何加入管理节点：

```bash
$ docker swarm join-to ken manager
To add a manager to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-1kal5b1iozbfmnnhx3kjfd3y6yqcjjjpcftrlg69pm2g8hw5vx-8fq89jxo2axwggryvom5a337t 192.168.31.100:2377
```

复制 Swarm 输出的结果即可加入管理节点到集群中。

> 注意：管理节点的数量必须为奇数，生产环境推荐使用3个、5个或7个管理节点来管理 Swarm 集群。

- 第三步：节点查看

节点添加完成后，我们使用以下命令可以查看当前节点的状态：

```bash
$ ]# docker node ls
ID                            HOSTNAME            STATUS              AVAILABILITY        MANAGER STATUS      ENGINE VERSION
1ehtnlcf3emncktgjzpoux5ga *   swarm-manager       Ready               Active              Leader              19.03.12
pn7gdm847sfzydqhcv3vma97y *   swarm-node1         Ready               Active                                        19.03.12
4dtc9pw5quyjs5yf25ccgr8uh *   swarm-node2         Ready               Active                                        19.03.12
est7ww3gngna4u7td22g9m2k5 *   swarm-node3         Ready               Active                                        19.03.12
```

到此，一个包含 1 个管理节点，3 个工作节点的 Swarm 集群已经搭建完成。

### 使用 Swarm

集群搭建完成后，我们就可以在 Swarm 集群中创建服务了，Swarm 集群中常用的服务部署方式有以下两种。

#### （1）通过 docker service 命令创建服务

使用`docker service create`命令可以创建服务，创建服务的命令如下：

```bash
$ docker service create --replicas 1 --name hello-world nginx
24f9ng83m9sq4ml3e92k4g5by
overall progress: 1 out of 1 tasks
1/1: running   [==================================================>]
verify: Service converged
```

此时我们已经创建好了一个服务，使用docker service ls命令可以查看已经启动的服务：

```bash
$ docker service ls
ID                  NAME                  MODE                REPLICAS            IMAGE               PORTS
24f9ng83m9sq        hello-world           replicated          1/1                 nginx:latest
```

当我们不再需要这个服务了，可以使用docker service rm命令来删除服务：

```bash
$ docker service rm hello-world
hello-world
```

此时 hello-world 这个服务已经成功地从集群中删除。

想要了解更多的`docker service`命令的相关操作，可以参考[这里](https://docs.docker.com/engine/swarm/swarm-tutorial/deploy-service/)。

生产环境中，我们推荐使用 docker-compose 模板文件来部署服务，这样服务的管理会更加方便并且可追踪，而且可以同时创建和管理多个服务，更加适合生产环境中依赖关系较复杂的部署模式。

#### （2）通过 docker stack 命令创建服务

我们在创建了 docker-compose 的模板文件，成功的使用该模板文件创建并启动了 MySQL 服务和 WordPress 两个服务。这里我们将 docker-compose 模板文件略微改造一下：

```yaml
version: '3'

services:
   mysql:
     image: mysql:5.7
     volumes:
       - mysql_data:/var/lib/mysql
     restart: always
     environment:
       MYSQL_ROOT_PASSWORD: root
       MYSQL_DATABASE: mywordpress
       MYSQL_USER: mywordpress
       MYSQL_PASSWORD: mywordpress

   wordpress:
     depends_on:
       - mysql
     image: wordpress:php7.4
     deploy:
       mode: replicated
       replicas: 2
     ports:
       - "8080:80"
     restart: always
     environment:
       WORDPRESS_DB_HOST: mysql:3306
       WORDPRESS_DB_USER: mywordpress
       WORDPRESS_DB_PASSWORD: mywordpress
       WORDPRESS_DB_NAME: mywordpress
volumes:
    mysql_data: {}
```

我在服务模板文件中添加了 deploy 指令，并且指定使用副本服务（replicated）的方式启动两个 WordPress 实例。

准备好启动 WordPress 服务的配置后，我们在 /tmp 目下新建 docker-compose.yml 文件，并且写入以上的内容，然后我们使用以下命令启动服务：

```bash
$ docker stack deploy -c docker-compose.yml wordpress
Ignoring unsupported options: restart

Creating network wordpress_default
Creating service wordpress_mysql
Creating service wordpress_wordpress
```

执行完以上命令后，我们成功启动了两个服务：

- MySQL 服务，默认启动了一个副本。
- WordPress 服务，根据我们 docker-compose 模板的定义启动了两个副本。

下面我们用docker service ls命令查看一下当前启动的服务。

```bash
$ docker service ls
ID                  NAME                  MODE                REPLICAS            IMAGE               PORTS
v8i0pzb4e3tc        wordpress_mysql       replicated          1/1                 mysql:5.7
96m8xfyeqzr5        wordpress_wordpress   replicated          2/2                 wordpress:php7.4    *:8080->80/tcp
```

可以看到，Swarm 已经为我们成功启动了一个 MySQL 服务，并且启动了两个 WordPress 实例。WordPress 实例通过 8080 端口暴露在了主机上，我们通过访问集群中的任意节点的 IP 加 8080 端口即可访问到 WordPress 服务。例如，我们访问http://192.168.31.101:8080即可成功访问到我们搭建的 WordPress 服务。

> Docker Swarm 是一个用来定义复杂应用的集群编排工具，可以帮我们把多台主机组成一个 Swarm 集群，并且帮助我们管理和调度复杂的容器服务。由于 Swarm 已经被内置于 Docker 中，因此 Swarm 的安装和使用也变得非常简单，只要你有 Docker 的使用经验，就可以很快地将你的应用迁移到 Swarm 集群中。

## 如何使 Docker 和 Kubernetes 结合发挥容器的最大价值？

Docker 虽然在容器领域有着不可撼动的地位，然而在容器的编排领域，却有着另外一个事实标准，那就是 Kubernetes。

### Kubernetes 的前生今世

说起 Kubernetes，这一切还得从云计算这个词说起，云计算这个概念是 2006 年由 Google 提起的，近些年被提及的频率也越来越高。云计算从起初的概念演变为现在的 AWS、阿里云等实实在在的云产品（主要是虚拟机和相关的网络、存储服务），可见已经变得非常成熟和稳定。

正当大家以为云计算领域已经变成了以虚拟机为代表的云平台时，Docker 在 2013 年横空出世，Docker 提出了镜像、仓库等核心概念，规范了服务的交付标准，使得复杂服务的落地变得更加简单，之后 Docker 又定义了 OCI 标准，可以说在容器领域 Docker 已经成了事实的标准。

然而 Docker 诞生只是帮助我们定义了开发和交付标准，如果想要在生产环境中大批量的使用容器，还离不开的容器的编排技术。于是，在 2014 年 6 月 7 日，Kubernetes（Kubernetes 简称为 K8S，8 代表 ubernete 8个字母） 的第一个 commit（提交）拉开了容器编排标准定义的序幕。

Kubernetes 是舵手的意思，我们把 Docker 比喻成一个个集装箱，而 Kubernetes 正是运输这些集装箱的舵手。早期的 Kubernetes 主要参考 Google 内部的 Borg 系统，Kubernetes 刚刚诞生时，提出了 Pod、Sidecar 等概念，这些都是 Google 内部多年实战和沉淀所积累的精华。经过将近一年的沉淀和积累，Kubernetes 于 2015 年 7 月 21 日对外发布了第一个正式版本 v1.0，正式走入了大众的视线。

很荣幸，我也是在 2015 年下半年正式开始了 Kubernetes 和 Docker 的研发之路。时至今日，Kubernetes 经过 6 年的沉淀，已经成为了事实的编排技术标准。

接下来，我们就看来看看，究竟是什么样的架构使得 Kubernetes 在容器编排领域成为了王者？

### Kubernetes 架构

Kubernetes 采用声明式 API 来工作，所有组件的运行过程都是异步的，整个工作过程大致为用户声明想要的状态，然后 Kubernetes 各个组件相互配合并且努力达到用户想要的状态。

Kubernetes 采用典型的主从架构，分为 Master 和 Node 两个角色。

- Mater 是 Kubernetes 集群的控制节点，负责整个集群的管理和控制功能。
- Node 为工作节点，负责业务容器的生命周期管理。

整体架构如下图：

![Kubernetes 架构图][2]

#### Master 节点

Master 节点负责对集群中所有容器的调度，各种资源对象的控制，以及响应集群的所有请求。Master 节点包含三个重要的组件： kube-apiserver、kube-scheduler、kube-controller-manager。下面我对这三个组件逐一介绍。

- **kube-apiserver**

kube-apiserver 主要负责提供 Kubernetes 的 API 服务，所有的组件都需要与 kube-apiserver 交互获取或者更新资源信息，它是 Kubernetes Master 中最前端组件。

kube-apiserver 的所有数据都存储在 [etcd](https://etcd.io/) 中，etcd 是一种采用 Go 语言编写的高可用 Key-Value 数据库，由 CoreOS 开发。etcd 虽然不是 Kubernetes 的组件，但是它在 Kubernetes 中却扮演着至关重要的角色，它是 Kubernetes 的数据大脑。可以说 etcd 的稳定性直接关系着 Kubernetes 集群的稳定性，因此生产环境中 etcd 一定要部署多个实例以确保集群的高可用。

- **kube-scheduler**

kube-scheduler 用于监听未被调度的 Pod，然后根据一定调度策略将 Pod 调度到合适的 Node 节点上运行。

- **kube-controller-manager**

kube-controller-manager 负责维护整个集群的状态和资源的管理。例如多个副本数量的保证，Pod 的滚动更新等。每种资源的控制器都是一个独立协程。kube-controller-manager 实际上是一系列资源控制器的总称。

> 为了保证 Kubernetes 集群的高可用，Master 组件需要部署在多个节点上，由于 Kubernetes 所有数据都存在于 etcd 中，Etcd 是基于 Raft 协议实现，因此生产环境中 Master 通常建议至少三个节点（如果你想要更高的可用性，可以使用 5 个或者 7 个节点）。

#### Node 节点

Node 节点是 Kubernetes 的工作节点，负责运行业务容器。Node 节点主要包含两个组件 ：kubelet 和 kube-proxy。

- **kubelet**

Kubelet 是在每个工作节点运行的代理，它负责管理容器的生命周期。Kubelet 通过监听分配到自己运行的主机上的 Pod 对象，确保这些 Pod 处于运行状态，并且负责定期检查 Pod 的运行状态，将 Pod 的运行状态更新到 Pod 对象中。

- **kube-proxy**

Kube-proxy 是在每个工作节点的网络插件，它实现了 Kubernetes 的 [Service](https://kubernetes.io/docs/concepts/services-networking/service/) 的概念。Kube-proxy 通过维护集群上的网络规则，实现集群内部可以通过负载均衡的方式访问到后端的容器。

Kubernetes 的成功不仅得益于其优秀的架构设计，更加重要的是 Kubernetes 提出了很多核心的概念，这些核心概念构成了容器编排的主要模型。

### Kubernetes 核心概念

Kubernetes 这些概念是 Google 多年的技术沉淀和积累，理解 Kubernetes 的核心概念有助于我们更好的理解 Kubernetes 的设计理念。

#### （1）集群

集群是一组被 Kubernetes 统一管理和调度的节点，被 Kubernetes 纳管的节点可以是物理机或者虚拟机。集群其中一部分节点作为 Master 节点，负责集群状态的管理和协调，另一部分作为 Node 节点，负责执行具体的任务，实现用户服务的启停等功能。

#### （2）标签（Label）

Label 是一组键值对，每一个资源对象都会拥有此字段。Kubernetes 中使用 Label 对资源进行标记，然后根据 Label 对资源进行分类和筛选。

#### （3）命名空间（Namespace）

Kubernetes 中通过命名空间来实现资源的虚拟化隔离，将一组相关联的资源放到同一个命名空间内，避免不同租户的资源发生命名冲突，从逻辑上实现了多租户的资源隔离。

#### （4）容器组（Pod）

Pod 是 Kubernetes 中的最小调度单位，它由一个或多个容器组成，一个 Pod 内的容器共享相同的网络命名空间和存储卷。Pod 是真正的业务进程的载体，在 Pod 运行前，Kubernetes 会先启动一个 Pause 容器开辟一个网络命名空间，完成网络和存储相关资源的初始化，然后再运行业务容器。

#### （5）部署（Deployment）

Deployment 是一组 Pod 的抽象，通过 Deployment 控制器保障用户指定数量的容器副本正常运行，并且实现了滚动更新等高级功能，当我们需要更新业务版本时，Deployment 会按照我们指定策略自动的杀死旧版本的 Pod 并且启动新版本的 Pod。

#### （6）状态副本集（StatefulSet）

StatefulSet 和 Deployment 类似，也是一组 Pod 的抽象，但是 StatefulSet 主要用于有状态应用的管理，StatefulSet 生成的 Pod 名称是固定且有序的，确保每个 Pod 独一无二的身份标识。

#### （7）守护进程集（DaemonSet）

DaemonSet 确保每个 Node 节点上运行一个 Pod，当我们集群有新加入的 Node 节点时，Kubernetes 会自动帮助我们在新的节点上运行一个 Pod。一般用于日志采集，节点监控等场景。

#### （8）任务（Job）

Job 可以帮助我们创建一个 Pod 并且保证 Pod 的正常退出，如果 Pod 运行过程中出现了错误，Job 控制器可以帮助我们创建新的 Pod，直到 Pod 执行成功或者达到指定重试次数。

#### （9）服务（Service）

Service 是一组 Pod 访问配置的抽象。由于 Pod 的地址是动态变化的，我们不能直接通过 Pod 的 IP 去访问某个服务，Service 通过在主机上配置一定的网络规则，帮助我们实现通过一个固定的地址访问一组 Pod。

#### （10）配置集（ConfigMap）

ConfigMap 用于存放我们业务的配置信息，使用 Key-Value 的方式存放于 Kubernetes 中，使用 ConfigMap 可以帮助我们将配置数据和应用程序代码分开。

#### （11）加密字典（Secret）

Secret 用于存放我们业务的敏感配置信息，类似于 ConfigMap，使用 Key-Value 的方式存在于 Kubernetes 中，主要用于存放密码和证书等敏感信息。

了解完 Kubernetes 的架构和核心概念，你是不是已经迫不及待地想要体验下了。下面就让我们动手安装一个 Kubernetes 集群，来体验下 Kubernetes 的强大之处吧。

### 安装 Kubernetes

Kubernetes 目前已经支持在多种环境下安装，我们可以在公有云，私有云，甚至裸金属中安装 Kubernetes。下面，我们通过 minikube 来演示一下如何快速安装和启动一个 Kubernetes 集群，minikube 是官方提供的一个快速搭建本地 Kubernetes 集群的工具，主要用于本地开发和调试。

下面，我以 Linux 平台为例，演示一下如何使用 minikube 安装一个 Kubernetes 集群。

> 如果你想要在其他平台使用 minikube 安装 Kubernetes，请参考官网[安装教程](https://minikube.sigs.k8s.io/docs/start/)。
> 在使用 minikube 安装 Kubernetes 之前，请确保我们的机器已经正确安装并且启动 Docker。

第一步，安装 minikube 和 kubectl。首先执行以下命令安装 minikube。

```bash
$ curl -LO https://github.com/kubernetes/minikube/releases/download/v1.13.1/minikube-linux-amd64
$ sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

Kubectl 是 Kubernetes 官方的命令行工具，可以实现对 Kubernetes 集群的管理和控制。

我们使用以下命令来安装 kubectl：

```bash
$ curl -LO https://dl.k8s.io/v1.19.2/kubernetes-client-linux-amd64.tar.gz
$ tar -xvf kubernetes-client-linux-amd64.tar.gz
kubernetes/
kubernetes/client/
kubernetes/client/bin/
kubernetes/client/bin/kubectl
$ sudo install kubernetes/client/bin/kubectl /usr/local/bin/kubectl
```

第二步，安装 Kubernetes 集群。

执行以下命令使用 minikube 安装 Kubernetes 集群：

```bash
$ minikube start
```

执行完上述命令后，minikube 会自动帮助我们创建并启动一个 Kubernetes 集群。当命令行输出 Done 时，代表集群已经部署完成。

第三步，检查集群状态。集群安装成功后，我们可以使用以下命令检查 Kubernetes 集群是否成功启动。

```bash
$ kubectl cluster-info
Kubernetes master is running at https://172.17.0.3:8443
KubeDNS is running at https://172.17.0.3:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

执行kubectl cluster-info命令后，输出 "Kubernetes master is running" 表示我们的集群已经成功运行。

> 172.17.0.3 为演示环境机器的 IP 地址，这个 IP 会根据你的实际 IP 地址而变化。

### 创建第一个应用

集群搭建好后，下面我们来试着使用 Kubernetes 来创建我们的第一个应用。

这里我们使用 Deployment 来定义应用的部署信息，使用 Service 暴露我们的应用到集群外部，从而使得我们的应用可以从外部访问到。

第一步，创建 deployment.yaml 文件，并且定义启动的副本数（replicas）为 3。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
      - name: hello-world
        image: wilhelmguo/nginx-hello:v1
        ports:
        - containerPort: 80
```

第二步，发布部署文件到 Kubernetes 集群中。

```bash
$ kubectl create -f deployment.yaml
```

部署发布完成后，我们可以使用 kubectl 来查看一下 Pod 是否被成功启动。

```bash
$ kubectl get pod -o wide
NAME                           READY   STATUS    RESTARTS   AGE     IP           NODE       NOMINATED NODE   READINESS GATES
hello-world-57968f9979-xbmzt   1/1     Running   0          3m19s   172.18.0.7   minikube   <none>           <none>
hello-world-57968f9979-xq5w4   1/1     Running   0          3m18s   172.18.0.5   minikube   <none>           <none>
hello-world-57968f9979-zwvgg   1/1     Running   0          4m14s   172.18.0.6   minikube   <none>           <none>
```

这里可以看到 Kubernetes 帮助我们创建了 3 个 Pod 实例。

第三步，创建 service.yaml 文件，帮助我们将服务暴露出去，内容如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-world
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: hello-world
```

然后执行如下命令在 Kubernetes 中创建 Service：

```bash
kubectl create -f service.yaml
```

服务创建完成后，Kubernetes 会随机帮助我们分配一个外部访问端口，可以通过以下命令查看服务信息：

```bash
$ kubectl  get service -o wide
NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE   SELECTOR
hello-world   NodePort    10.101.83.18   <none>        80:32391/TCP   12s   app=hello-world
kubernetes    ClusterIP   10.96.0.1      <none>        443/TCP        40m   <none>
```

由于我们的集群使用 minikube 安装，要想集群中的服务可以通过外部访问，还需要执行以下命令：

```bash
$ minikube service hello-world
```

可以看到 minikube 将我们的服务暴露在了 32391 端口上，我们通过 http://{YOUR-IP}:32391 可以访问到我们启动的服务。

总结下，我们首先使用 Deployment 创建了三个 nginx-hello 的实例，然后使用 Service 的方式随机负载到后端的三个实例，并将服务通过 NodePort 的方式暴露在主机上，使得我们可以直接使用主机的端口访问到容器中的服务。

> Kubernetes 从诞生到现在已经经历了 6 个年头，起初由于它的超前理念被世人误认为设计过度复杂，使得 Kubernetes 的入门门槛非常高。然而 6 年后的今天， Kubernetes 已经拥有了非常完善的社区和工具集，它可以帮助我们一键搭建 Kubernetes 集群，并且围绕 Kubernetes 构建的各种应用也是越来越丰富。

> Kubernetes 的目标一直很明确，那就是对标 Borg，可以支撑数亿容器的运行。目前来看，要达到这个目标，Kubernetes 还有很长的路要走，但是当我们谈及云原生，谈及容器云时都必然会提到 Kubernetes，显然它已经成为容器编排的标准和标杆，目前大多数公有云也有支持 Kubernetes。容器的未来一定是美好的，而使用 Kubernetes 来调度容器则更是未来云计算的一个重要风向标。

## 多阶段构建：Docker 下如何实现镜像多阶级构建？

我们知道 Docker 镜像是分层的，并且每一层镜像都会额外占用存储空间，一个 Docker 镜像层数越多，这个镜像占用的存储空间则会越多。镜像构建最重要的一个原则就是要保持镜像体积尽可能小，要实现这个目标通常可以从两个方面入手：

- 基础镜像体积应该尽量小；
- 尽量减少 Dockerfile 的行数，因为 Dockerfile 的每一条指令都会生成一个镜像层。

在 Docker 的早期版本中，对于编译型语言（例如 C、Java、Go）的镜像构建，我们只能将应用的编译和运行环境的准备，全部都放到一个 Dockerfile 中，这就导致我们构建出来的镜像体积很大，从而增加了镜像的存储和分发成本，这显然与我们的镜像构建原则不符。

为了减小镜像体积，我们需要借助一个额外的脚本，将镜像的编译过程和运行过程分开。

- 编译阶段：负责将我们的代码编译成可执行对象。
- 运行时构建阶段：准备应用程序运行的依赖环境，然后将编译后的可执行对象拷贝到镜像中。

我以 Go 语言开发的一个 HTTP 服务为例，代码如下：

```go
package main
import (
   "fmt"
   "net/http"
)
func hello(w http.ResponseWriter, req *http.Request) {
   fmt.Fprintf(w, "hello world!\n")
}
func main() {
   http.HandleFunc("/", hello)
   http.ListenAndServe(":8080", nil)
}
```

我将这个 Go 服务构建成镜像分为两个阶段：代码的编译阶段和镜像构建阶段。

我们构建镜像时，镜像中需要包含 Go 语言编译环境，应用的编译阶段我们可以使用 Dockerfile.build 文件来构建镜像。Dockerfile.build 的内容如下：

```dockerfile
FROM golang:1.13
WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .
```

Dockerfile.build 可以帮助我们把代码编译成可以执行的二进制文件，我们使用以下 Dockerfile 构建一个运行环境：

```dockerfile
FROM alpine:latest  
WORKDIR /root/
COPY http-server .
CMD ["./http-server"] 
```

然后，我们将应用的编译和运行环境的准备步骤，都放到一个 build.sh 脚本文件中，内容如下：

```bash
#!/bin/sh
echo Building http-server:build
docker build -t http-server:build . -f Dockerfile.build
docker create --name builder http-server:build  
docker cp builder:/go/src/github.com/wilhelmguo/multi-stage-demo/http-server ./http-server  
docker rm -f builder
echo Building http-server:latest
docker build -t http-server:latest .
rm ./http-server
```

下面，我带你来逐步分析下这个脚本。

第一步，声明 shell 文件，然后输出开始构建信息。

```bash
#!/bin/sh
echo Building http-server:build
```

第二步，使用 Dockerfile.build 文件来构建一个临时镜像 http-server:build。

```bash
docker build -t http-server:build . -f Dockerfile.build
```

第三步，使用 http-server:build 镜像创建一个名称为 builder 的容器，该容器包含编译后的 http-server 二进制文件。

```bash
docker create --name builder http-server:build  
```

第四步，使用docker cp命令从 builder 容器中拷贝 http-server 文件到当前构建目录下，并且删除名称为 builder 的临时容器。

```bash
docker cp builder:/go/src/github.com/wilhelmguo/multi-stage-demo/http-server ./http-server  
docker rm -f builder
```

第五步，输出开始构建镜像信息。

```bash
echo Building http-server:latest
```

第六步，构建运行时镜像，然后删除临时文件 http-server。

```bash
docker build -t http-server:latest .
rm ./http-server
```

这里总结一下，我们是使用 Dockerfile.build 文件来编译应用程序，使用 Dockerfile 文件来构建应用的运行环境。然后我们通过创建一个临时容器，把编译后的 http-server 文件拷贝到当前构建目录中，然后再把这个文件拷贝到运行环境的镜像中，最后指定容器的启动命令为 http-server。

使用这种方式虽然可以实现分离镜像的编译和运行环境，但是我们需要额外引入一个 build.sh 脚本文件，而且构建过程中，还需要创建临时容器 builder 拷贝编译后的 http-server 文件，这使得整个构建过程比较复杂，并且整个构建过程也不够透明。

为了解决这种问题， Docker 在 17.05 推出了多阶段构建（multistage-build）的解决方案。

### 使用多阶段构建

Docker 允许我们在 Dockerfile 中使用多个 FROM 语句，而每个 FROM 语句都可以使用不同基础镜像。最终生成的镜像，是以最后一条 FROM 为准，所以我们可以在一个 Dockerfile 中声明多个 FROM，然后选择性地将一个阶段生成的文件拷贝到另外一个阶段中，从而实现最终的镜像只保留我们需要的环境和文件。多阶段构建的主要使用场景是**分离编译环境和运行环境。**

接下来，我们使用多阶段构建的特性，将上述未使用多阶段构建的过程精简成如下 Dockerfile：

```dockerfile
FROM golang:1.13
WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .
FROM alpine:latest  
WORKDIR /root/
COPY --from=0 /go/src/github.com/wilhelmguo/multi-stage-demo/http-server .
CMD ["./http-server"] 
```

然后，我们将这个 Dockerfile 拆解成两步进行分析。

第一步，编译代码。

```dockerfile
FROM golang:1.13
WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .
```

将代码拷贝到 golang:1.13 镜像（已经安装好了 go）中，并且使用go build命令编译代码生成 http-server 文件。

第二步，构建运行时镜像。

```dockerfile
FROM alpine:latest  
WORKDIR /root/
COPY --from=0 /go/src/github.com/wilhelmguo/multi-stage-demo/http-server .
CMD ["./http-server"]
```

使用第二个 FROM 命令表示镜像构建的第二阶段，使用 COPY 指令拷贝编译后的文件到 alpine 镜像中，--from=0 表示从第一阶段构建结果中拷贝文件到当前构建阶段。

最后，我们只需要使用以下命令，即可实现整个镜像的构建：

```bash
docker build -t http-server:latest .
```

构建出来的镜像与未使用多阶段构建之前构建的镜像大小一致，为了验证这一结论，我们分别使用这两种方式来构建镜像，最后对比一下镜像构建的结果。

### 镜像构建对比

使用多阶段构建前后的代码我都已经放在了[Github](https://github.com/wilhelmguo/multi-stage-demo)，你只需要克隆代码到本地即可。

```bash
$ mkdir /go/src/github.com/wilhelmguo
$ cd /go/src/github.com/wilhelmguo
$ git clone https://github.com/wilhelmguo/multi-stage-demo.git
```

代码克隆完成后，我们首先切换到without-multi-stage分支：

```bash
$ cd without-multi-stage
$ git checkout without-multi-stage
```

这个分支是未使用多阶段构建技术构建镜像的代码，我们可以通过执行 build.sh 文件构建镜像：

```bash
$  chmod +x build.sh && ./build.sh
Building http-server:build
Sending build context to Docker daemon  96.26kB
Step 1/4 : FROM golang:1.13
1.13: Pulling from library/golang
d6ff36c9ec48: Pull complete 
c958d65b3090: Pull complete 
edaf0a6b092f: Pull complete 
80931cf68816: Pull complete 
813643441356: Pull complete 
799f41bb59c9: Pull complete 
16b5038bccc8: Pull complete 
Digest: sha256:8ebb6d5a48deef738381b56b1d4cd33d99a5d608e0d03c5fe8dfa3f68d41a1f8
Status: Downloaded newer image for golang:1.13
 ---> d6f3656320fe
Step 2/4 : WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
 ---> Running in fa3da5ffb0c0
Removing intermediate container fa3da5ffb0c0
 ---> 97245cbb773f
Step 3/4 : COPY main.go .
 ---> a021d2f2a5bb
Step 4/4 : RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .
 ---> Running in b5c36bb67b9c
Removing intermediate container b5c36bb67b9c
 ---> 76c0c88a5cf7
Successfully built 76c0c88a5cf7
Successfully tagged http-server:build
4b0387b270bc4a4da570e1667fe6f9baac765f6b80c68f32007494c6255d9e5b
builder
Building http-server:latest
Sending build context to Docker daemon  7.496MB
Step 1/4 : FROM alpine:latest
latest: Pulling from library/alpine
df20fa9351a1: Already exists 
Digest: sha256:185518070891758909c9f839cf4ca393ee977ac378609f700f60a771a2dfe321
Status: Downloaded newer image for alpine:latest
 ---> a24bb4013296
Step 2/4 : WORKDIR /root/
 ---> Running in 0b25ffe603b8
Removing intermediate container 0b25ffe603b8
 ---> 80da40d3a0b4
Step 3/4 : COPY http-server .
 ---> 3f2300210b7b
Step 4/4 : CMD ["./http-server"]
 ---> Running in 045cea651dde
Removing intermediate container 045cea651dde
 ---> 5c73883177e7
Successfully built 5c73883177e7
Successfully tagged http-server:latest
```

经过一段时间的等待，我们的镜像就构建完成了。

镜像构建完成后，我们使用docker image ls命令查看一下刚才构建的镜像大小：

可以看到，http-server:latest 镜像只有 13M，而我们的编译镜像 http-server:build 则为 819M，虽然我们编写了很复杂的脚本 build.sh，但是这个脚本确实帮助我们将镜像体积减小了很多。

下面，我们将代码切换到多阶段构建分支：

```bash
$ git checkout with-multi-stage
Switched to branch 'with-multi-stage'
```

为了避免镜像名称重复，我们将多阶段构建的镜像命名为 http-server-with-multi-stage:latest ，并且禁用缓存，避免缓存干扰构建结果，构建命令如下：

```bash
$ docker build --no-cache -t http-server-with-multi-stage:latest .
Sending build context to Docker daemon  96.77kB
Step 1/8 : FROM golang:1.13
 ---> d6f3656320fe
Step 2/8 : WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
 ---> Running in 640da7a92a62
Removing intermediate container 640da7a92a62
 ---> 9c27b4606da0
Step 3/8 : COPY main.go .
 ---> bd9ce4af24cb
Step 4/8 : RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .
 ---> Running in 6b441b4cc6b7
Removing intermediate container 6b441b4cc6b7
 ---> 759acbf6c9a6
Step 5/8 : FROM alpine:latest
 ---> a24bb4013296
Step 6/8 : WORKDIR /root/
 ---> Running in c2aa2168acd8
Removing intermediate container c2aa2168acd8
 ---> f026884acda6
Step 7/8 : COPY --from=0 /go/src/github.com/wilhelmguo/multi-stage-demo/http-server .
 ---> 667503e6bc14
Step 8/8 : CMD ["./http-server"]
 ---> Running in 15c4cc359144
Removing intermediate container 15c4cc359144
 ---> b73cc4d99088
Successfully built b73cc4d99088
Successfully tagged http-server-with-multi-stage:latest
```

镜像构建完成后，我们同样使用docker image ls命令查看一下镜像构建结果：

```bash
$ docker image ls http-server-with-multi-stage:latest
REPOSITORY                     TAG                 IMAGE ID            CREATED             SIZE
http-server-with-multi-stage   latest              b73cc4d99088        2 minutes ago       13MB
```

可以看到，使用多阶段构建的镜像大小与上一步构建的镜像大小一致，都为 13M。但是使用多阶段构建后，却大大减少了我们的构建步骤，使得构建过程更加清晰可读。

### 多阶段构建的其他使用方式

多阶段构建除了我们上面讲解的使用方式，还有更多其他的使用方式，这些使用方式，可以使得多阶段构建实现更多的功能。

#### 为构建阶段命名

默认情况下，每一个构建阶段都没有被命名，你可以通过 FROM 指令出现的顺序来引用这些构建阶段，构建阶段的序号是从 0 开始的。然而，为了提高 Dockerfile 的可读性，我们需要为某些构建阶段起一个名称，这样即便后面我们对 Dockerfile 中的内容进程重新排序或者添加了新的构建阶段，其他构建过程中的 COPY 指令也不需要修改。

上面的 Dockerfile 我们可以优化成如下内容：

```dockerfile
FROM golang:1.13 AS builder
WORKDIR /go/src/github.com/wilhelmguo/multi-stage-demo/
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o http-server .

FROM alpine:latest  
WORKDIR /root/
COPY --from=builder /go/src/github.com/wilhelmguo/multi-stage-demo/http-server .
CMD ["./http-server"]
```

我们在第一个构建阶段，使用 AS 指令将这个阶段命名为 builder。然后在第二个构建阶段使用 --from=builder 指令，即可从第一个构建阶段中拷贝文件，使得 Dockerfile 更加清晰可读。

#### 停止在特定的构建阶段

有时候，我们的构建阶段非常复杂，我们想在代码编译阶段进行调试，但是多阶段构建默认构建 Dockerfile 的所有阶段，为了减少每次调试的构建时间，我们可以使用 target 参数来指定构建停止的阶段。

例如，我只想在编译阶段调试 Dockerfile 文件，可以使用如下命令：

```bash
$ docker build --target builder -t http-server:latest .
```

在执行docker build命令时添加 target 参数，可以将构建阶段停止在指定阶段，从而方便我们调试代码编译过程。

#### 使用现有镜像作为构建阶段

使用多阶段构建时，不仅可以从 Dockerfile 中已经定义的阶段中拷贝文件，还可以使用`COPY --from`指令从一个指定的镜像中拷贝文件，指定的镜像可以是本地已经存在的镜像，也可以是远程镜像仓库上的镜像。

例如，当我们想要拷贝 nginx 官方镜像的配置文件到我们自己的镜像中时，可以在 Dockerfile 中使用以下指令：

```dockerfile
COPY --from=nginx:latest /etc/nginx/nginx.conf /etc/local/nginx.conf
```

从现有镜像中拷贝文件还有一些其他的使用场景。例如，有些工具没有我们使用的操作系统的安装源，或者安装源太老，需要我们自己下载源码并编译这些工具，但是这些工具可能依赖的编译环境非常复杂，而网上又有别人已经编译好的镜像。这时我们就可以使用COPY --from指令从编译好的镜像中将工具拷贝到我们自己的镜像中，很方便地使用这些工具了。

> 多阶段构建可以让我们通过一个 Dockerfile 很方便地构建出体积更小的镜像，并且我们只需要编写 Dockerfile 文件即可，无须借助外部脚本文件。这使得镜像构建过程更加简单透明，但要提醒一点：使用多阶段构建的唯一限制条件是我们使用的 Docker 版本必须高于 17.05 。

## DevOps：容器化后如何通过 DevOps 提高协作效能？

### DevOps 的前生今世

1964 年，世界上的第一台计算机诞生，那时的计算机主要用于军事领域。计算机的运行离不开程序，那时负责编程的人员被称之为“程序员”。由于那时的程序比较简单，很多工作可以一个人完成，所以早期的计算软件交付流程是这样的：设计—开发—自测—发布—部署—维护。如图所示：

![3][3]

然而，随着计算机的发展和普及，越来越多的人接触到了计算机，这时的计算机也开始逐渐应用于商业领域，市场上出现了越来越多的办公、游戏等“软件”，也有越来越多的人开始从事软件开发这个行业，而这些软件开发者也有了更加专业的称呼“软件开发工程师”。

后来，又随着计算机软件规模的增大，软件也越来越复杂，这时一个人已经无法完成一个软件完整的生命周期管理。一个软件的开发需要各个团队的分工配合，同时职能划分也需要更加细化，整个软件管理流程中除了软件工程师外又增加了测试工程师和运维工程师。

分工之后软件开发流程如下：研发工程师做代码设计和开发，测试工程师做专业的测试工作，运维工程师负责将软件部署并负责维护软件。如图所示：

![4][4]

这种软件开发模式被称为瀑布模型，这种模式将软件生命周期划分为制定计划、需求分析、软件设计、程序编写、软件测试和运行维护等六个基本活动，并且规定了它们自上而下、相互衔接的固定次序，如瀑布流水一样，逐级的下降。

![5][5]

瀑布模型的模式十分理想化，它假定用户需求十分明确，开发时间十分充足，且项目是单向迭代的。但随着互联网的出现，软件迭代速度越来越快，软件开发越来越“敏捷”，这时候大名鼎鼎的“敏捷开发”出现了，敏捷开发把大的时间点变成细小的时间点，快速迭代开发，软件更新速度也越来越快。

敏捷开发对传统的开发、测试、运维模式提出了新的挑战，要求更快的开发速度和更高的软件部署频率。而运维工程师信奉的则是稳定性压倒一切，不希望软件频繁变更而引发新的问题。于是乎，敏捷开发和运维工程师之间的矛盾便诞生了。

敏捷开发使得开发和运维工程师之间的矛盾变得越来越深，为了解决这个问题，DevOps 诞生了。DevOps 是研发工程师（Development）和运维工程师（Operations）的组合。下面是维基百科对 DevOps 的定义：

> DevOps（Development 和 Operations 的组合词）是一种重视“软件开发人员（Dev）”和“IT 运维技术人员（Ops）”之间沟通合作的文化、运动或惯例。透过自动化“软件交付”和“架构变更”的流程，来使得构建、测试、发布软件能够更加地快捷、频繁和可靠。

DevOps 的整体目标是**促进开发和运维人员之间的配合，并且通过自动化的手段缩短软件的整个交付周期，提高软件的可靠性。**

### 微服务、容器与 DevOps

软件开发早期，业务模型简单，很多功能都放在一个服务中，这时的服务称之为单体服务，然而随着业务功能越来越复杂，我们发现这种单体服务功能过于复杂，容易牵一发而动全身，导致开发维护成本很高，软件迭代成本也越来越高。

这时，软件开发者开始将单体服务拆分为多个小型服务，每一个小型服务独立负责一项任务，各个小型服务之间通过某种方式（RPC 或者 HTTP）相互调用，然后将不同的服务可以分发给不同的业务团队来开发，各个业务团队可以选择适合自己的编程语言来进行开发。

如果想要微服务实现更快的迭代和更加可靠的稳定性，一定是离不开一个一体化的 DevOps 平台，DevOps 的目标是构建一个稳定可靠的软件生命周期管理环境。所以它不仅可以帮助我们节省很多研发、测试和运维成本，还可以极大地提高我们的软件迭代速度，可以说微服务要想顺利实施，离不开 DevOps 的思想作为指导。

在 Docker 技术出现之前，人们通常更加关注如何做好 CI（Continuous Integration，持续集成）/CD（Continuous Delivery持续交付）以及 IAAS（基础设施即服务），这时我们称之为 DevOps 1.0 时代。

随着 Docker 技术的诞生，我们开始迎来了 DevOps 2.0 时代，DevOps 所有的这些需求都与 Docker 所提供的能力极其匹配。首先 Docker 足够轻量，可以帮助我们的微服务实现快速迭代。其次 Docker 可以很方便地帮助我们构建任何语言的运行环境，帮助我们顺利地使用多种语言来开发的我们的服务，最后 Docker 可以帮助我们更好地隔离开发环境和生产环境。

**可以说 Docker 几乎满足了微服务的所有需求，Docker 为 DevOps 提供了很好的基础支撑。**

这时的研发和运维都开始关注软件统一交付的格式和软件生命周期的管理，**而不像之前一样研发只关注“打包前”，而运维只关注“打包后”的模式**，DevOps 无论是研发环境还是生产环境都开始围绕 Docker 进行构建。

![6][6]

综上所述，微服务、Docker 与 DevOps 三者之间的关系，如上图所示。

1. 云平台作为底层基础，采用 Docker 技术将服务做容器化部署，并且使用资源管理和调度平台（例如 Kubernetes 或 Swarm）来自动化地管理容器。
2. DevOps 平台在云基础平台之上，通过流程自动化以及工具自动化的手段，为可持续集成和交付提供能力支持。
3. 有了云平台和 DevOps 的支撑，微服务才能够发挥更大的作用，使得我们的业务更加成熟和稳定。

### 容器如何助力 DevOps

Docker 可以在 DevOps 各个阶段发挥重要作用，例如 Docker 可以帮助我们在开发阶段提供统一的开发环境，在持续集成阶段帮助我们快速构建应用，在部署阶段帮助我们快速发布或更新生产环境的应用。

下面我们来详细认识一下 Docker 在整个 DevOps 阶段究竟发挥了哪些作用。

#### 开发流程

开发人员可以在本地或者开发机上快速安装一个 Docker 环境，然后使用 Docker 可以快速启动和部署一个复杂的开发环境。相比传统的配置开发环境的方式，不仅大大提升了开发环境部署的效率，同时也保证了不同开发人员的环境一致。

#### 集成流程

通过编写 Dockerfile 可以将我们的业务容器化，然后将我们的 Dockerfile 提交到代码仓库中，在做持续集成的过程中基于已有的 Dockerfile 来构建应用镜像，可以极大提升持续集成的构建速度。

这主要是因为 Docker 镜像使用了写时复制（Copy On Write）和联合文件系统（Union FileSystem）的机制。Docker 镜像分层存储，相同层仅会保存一份，不同镜像的相同层可以复用，比如 Golang 容器在一次构建停止后，镜像已经存在于构建机上了，当我们开始新一轮的测试时，可以直接复用已有的镜像层，大大提升了构建速度。

#### 部署流程

镜像仓库的存在使得 Docker 镜像分发变得十分简单，当我们的镜像构建完成后，无论在哪里只需要执行 docker pull 命令就可以快速地将镜像拉取到本地并且启动我们的应用，这使得应用的创建或更新更快、更高效。

另外，Docker 结合 Kubernetes 或者其他容器管理平台，可以轻松地实现蓝绿发布等流程，当我们升级应用观察到流量异常时，可以快速回滚到稳定版本。

### DevOps 工具介绍

工欲善其事，必先利其器，要想顺利落地 DevOps，工具的选择十分重要，下面我们来看下除了Docker 外还有哪些工具可以帮助我们顺利地构建 DevOps 平台。

#### Git

[Git](https://git-scm.com/) 是一种分布式的版本控制工具， 是目前使用最广泛的 DevOps 工具之一。Git 相比于其他版本控制工具，它可以**实现离线代码提交**，它允许我们提交代码时未连接到 Git 服务器，等到网络恢复再将我们的代码提交到远程服务器。

Git 非常容易上手，并且占用空间很小，相比于传统的版本控制工具（例如：Subversion、CVS 等）性能非常优秀，它可以帮助我们快速地创建分支，使得团队多人协作开发更加方便。

目前全球最大的在线 Git 代码托管服务是 GitHub，GitHub 提供了代码在线托管服务，可以帮助我们快速地将 DevOps 工作流集成起来。除了 GitHub 外，还有很多在线代码托管服务，例如 GitLab、Bitbucket 等。

#### Jenkins

[Jenkins](https://www.jenkins.io/) 是开源的 CI/CD 构建工具，Jenkins 采用插件化的方式来扩展它的功能，它拥有非常丰富的插件，这些插件可以帮助我们实现构建、部署、自动化等流程。它还拥有强大的生态系统，这些生态系统可以很方便地与 Docker 和 Kubernetes 集成。Jenkins 几乎可以和所有的 DevOps 工具进行集成。

#### Ansible

[Ansible](https://www.ansible.com/) 是一个配置管理工具。Ansible 可以帮助我们自动完成一些重复的 IT 配置管理，应用程序部署等任务，还可以帮助我们放弃编写繁杂的 shell 脚本，仅仅做一些 YAML 的配置，即可实现任务下发和管理工作。并且 Ansible 的每一行命令都是幂等的，它允许我们多次重复执行相同的脚本并且得到的结果都是一致的。

#### Kubernetes

[Kubernetes](https://kubernetes.io/) 是当前最流行的容器编排工具之一，Docker 帮助我们解决了容器打包和镜像分发的问题，而 Kubernetes 则帮助我们解决了大批量容器管理和调度的问题，它可以打通从研发到上线的整个流程，使得 DevOps 落地更加简单方便。

> DevOps 虽然已经被提及很多年，但是一直没有很好的落地，直到 2013 年 Docker 的诞生，才使得 DevOps 这个理念又重新火了起来，因为 Docker 为我们解决了应用的构建、分发和隔离的问题，才使得 DevOps 落地变得更加简单。

> DevOps 提倡小规模和增量的服务发布方式，并且 DevOps 还指导我们尽量避免开发大单体（把所有的功能都集成到一个服务中）应用，这一切，都与 Docker 所能提供的能力十分匹配。因此，Docker 是非常重要的 DevOps 工具。

## CI/CD：容器化后如何实现持续集成与交付？（上）

具体来说，CI/CD 是一种通过在应用开发阶段，引入自动化的手段来频繁地构建应用，并且向客户交付应用的方法。它的核心理念是持续开发、持续部署以及持续交付，它还可以让自动化持续交付贯穿于整个应用生命周期，使得开发和运维统一参与协同支持。

### 什么是 CI/CD

#### CI 持续集成（Continuous Integration）

随着软件功能越来越复杂，一个大型项目要想在规定时间内顺利完成，就需要多位开发人员协同开发。但是，如果我们每个人都负责开发自己的代码，然后集中在某一天将代码合并在一起（称为“合并日”）。你会发现，代码可能会有很多冲突和编译问题，而这个处理过程十分烦琐、耗时，并且需要每一位工程师确认代码是否被覆盖，代码是否完整。这种情况显然不是我们想要看到的，这时持续集成（CI）就可以很好地帮助我们解决这个问题。

CI 持续集成要求开发人员频繁地（甚至是每天）将代码提交到共享分支中。一旦开发人员的代码被合并，将会自动触发构建流程来构建应用，并通过触发自动化测试（单元测试或者集成测试）来验证这些代码的提交，确保这些更改没有对应用造成影响。如果发现提交的代码在测试过程中或者构建过程中有问题，则会马上通知研发人员确认，修改代码并重新提交。通过将以往的定期合并代码的方式，改变为频繁提交代码并且自动构建和测试的方式，可以帮助我们**及早地发现问题和解决冲突，减少代码出错。**

传统 CI 流程的实现十分复杂，无法做到标准化交付，而当我们的应用容器化后，应用构建的结果就是 Docker 镜像。代码检查完毕没有缺陷后合并入主分支。此时启动构建流程，构建系统会自动将我们的应用打包成 Docker 镜像，并且推送到镜像仓库。

#### CD 持续交付（Continuous Delivery）

当我们每次完成代码的测试和构建后，我们需要将编译后的镜像快速发布到测试环境，这时我们的持续交付就登场了。持续交付要求我们实现自动化准备测试环境、自动化测试应用、自动化监控代码质量，并且自动化交付生产环境镜像。

在以前，测试环境的构建是非常耗时的，并且很难保证测试环境和研发环境的一致性。但现在，借助于容器技术，我们可以很方便地构建出一个测试环境，并且可以保证开发和测试环境的一致性，这样不仅可以提高测试效率，还可以提高敏捷性。

容器化后的应用交付过程是这样的，我们将测试的环境交由 QA 来维护，当我们确定好本次上线要发布的功能列表时，我们将不同开发人员开发的 feature 分支的代码合并到 release 分支。然后由 QA 来将构建镜像部署到测试环境，结合自动测试和人工测试、自动检测和人工记录，形成完整的测试报告，并且把测试过程中遇到的问题交由开发人员修改，开发修改无误后再次构建测试环境进行测试。测试没有问题后，自动交付生产环境的镜像到镜像仓库。

#### CD 持续部署（Continuous Deployment）

CD 不仅有持续交付的含义，还代表持续部署。经测试无误打包完生产环境的镜像后，我们需要把镜像部署到生产环境，持续部署是最后阶段，它作为持续交付的延伸，可以自动将生产环境的镜像发布到生产环境中。

部署业务首先需要我们有一个资源池，实现资源自动化供给，而且有的应用还希望有自动伸缩的能力，根据外部流量自动调整容器的副本数，而这一切在容器云中都将变得十分简单。

我们可以想象，如果有客户提出了反馈，我们通过持续部署在几分钟内，就能在更改完代码的情况下，将新的应用版本发布到生产环境中（假设通过了自动化测试），这时我们就可以实现快速迭代，持续接收和整合用户的反馈，将用户体验做到极致。

讲了这么多概念，也许你会感觉比较枯燥乏味。下面我们就动动手，利用一些工具搭建一个 DevOps 环境。

搭建 DevOps 环境的工具非常多，这里我选择的工具为 Jenkins、Docker 和 GitLab。Jenkins 和 Docker 都已经介绍过了，这里我再介绍一下 Gitlab。

Gitlab 是由 Gitlab Inc. 开发的一款基于 Git 的代码托管平台，它的功能和 GitHub 类似，可以帮助我们存储代码。除此之外，GitLab 还具有在线编辑 wiki、issue 跟踪等功能，另外最新版本的 GitLab 还集成了 CI/CD 功能，不过这里我们仅仅使用 GitLab 的代码存储功能， CI/CD 还是交给我们的老牌持续集成工具 Jenkins 来做。

### Docker+Jenkins+GitLab 搭建 CI/CD 系统

软件安装环境如下。

- 操作系统：CentOS 7
- Jenkins：tls 长期维护版
- Docker：18.06
- GitLab：13.3.8-ce.0

#### 第一步：安装 Docker

Docker 环境准备好后，我们就可以利用 Docker 来部署 GitLab 和 Jenkins 了。

#### 第二步：安装 GitLab

GitLab 官方提供了 GitLab 的 Docker 镜像，因此我们只需要执行以下命令就可以快速启动一个 GitLab 服务了。

```bash
$ docker run -d \
--hostname localhost \
-p 8080:80 -p 2222:22 \
--name gitlab \
--restart always \
--volume /tmp/gitlab/config:/etc/gitlab \
--volume /tmp/gitlab/logs:/var/log/gitlab \
--volume /tmp/gitlab/data:/var/opt/gitlab \
gitlab/gitlab-ce:13.3.8-ce.0
```

这个启动过程可能需要几分钟的时间。当服务启动后我们就可以通过 http://localhost:8080 访问到我们的 GitLab 服务了。

第一次登陆，GitLab 会要求我们设置管理员密码，我们输入管理员密码后点击确认即可，之后 GitLab 会自动跳转到登录页面。

然后输入默认管理员用户名：admin@example.com，密码为我们上一步设置的密码。点击登录即可登录到系统中，至此，GitLab 已经安装成功。

#### 第三步：安装 Jenkins

Jenkins 官方提供了 Jenkins 的 Docker 镜像，我们使用 Jenkins 镜像就可以一键启动一个 Jenkins 服务。命令如下：

```bash
# docker run -d --name=jenkins \
-p 8888:8080 \
-u root \
--restart always \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /usr/bin/docker:/usr/bin/docker \
-v /tmp/jenkins_home:/var/jenkins_home \
jenkins/jenkins:lts
```

> 这里，我将 docker.sock 和 docker 二进制挂载到了 Jenkins 容器中，是为了让 Jenkins 可以直接调用 docker 命令来构建应用镜像。

Jenkins 的默认密码会在容器启动后打印在容器的日志中，我们可以通过以下命令找到 Jenkins 的默认密码，星号之间的类似于一串 UUID 的随机串就是我们的密码。

```bash
$ docker logs -f jenkins
unning from: /usr/share/jenkins/jenkins.war
webroot: EnvVars.masterEnvVars.get("JENKINS_HOME")
2020-10-31 16:13:06.472+0000 [id=1]	INFO	org.eclipse.jetty.util.log.Log#initialized: Logging initialized @292ms to org.eclipse.jetty.util.log.JavaUtilLog
2020-10-31 16:13:06.581+0000 [id=1]	INFO	winstone.Logger#logInternal: Beginning extraction from war file
2020-10-31 16:13:08.369+0000 [id=1]	WARNING	o.e.j.s.handler.ContextHandler#setContextPath: Empty contextPath
... 省略部分启动日志
Jenkins initial setup is required. An admin user has been created and a password generated.
Please use the following password to proceed to installation:
*************************************************************
*************************************************************
*************************************************************

Jenkins initial setup is required. An admin user has been created and a password generated.
Please use the following password to proceed to installation:

fb3499944e4845bba9d4b7d9eb4e3932

This may also be found at: /var/jenkins_home/secrets/initialAdminPassword
*************************************************************
*************************************************************
*************************************************************
This may also be found at: /var/jenkins_home/secrets/initialAdminPassword
2020-10-31 16:17:07.577+0000 [id=28]	INFO	jenkins.InitReactorRunner$1#onAttained: Completed initialization
2020-10-31 16:17:07.589+0000 [id=21]	INFO	hudson.WebAppMain$3#run: Jenkins is fully up and running
```

之后，我们通过访问 http://localhost:8888 就可以访问到 Jenkins 服务了。

然后在系统管理 -> 插件管理 -> 可选插件处，搜索 GitLab 和 Docker ，分别安装相关插件即可，以便我们的 Jenkins 服务和 GitLab 以及 Docker 可以更好地交互。

> Docker 的出现解决了 CI/CD 流程中的各种问题，Docker 交付的镜像不仅包含应用程序，也包含了应用程序的运行环境，这很好地解决了开发和线上环境不一致问题。同时 Docker 的出现也极大地提升了 CI/CD 的构建效率，我们仅仅需要编写一个 Dockerfile 并将 Dockerfile 提交到我们的代码仓库即可快速构建出我们的应用，最后，当我们构建好 Docker 镜像后 Docker 可以帮助我们快速发布及更新应用。

## CI/CD：容器化后如何实现持续集成与交付？（下）

构建和部署一个应用的流程可以分为五部分。

1. 我们首先需要配置 GitLab SSH 访问公钥，使得我们可以直接通过 SSH 拉取或推送代码到 GitLab。
2. 接着将代码通过 SSH 上传到 GitLab。
3. 再在 Jenkins 创建构建任务，使得 Jenkins 可以成功拉取 GitLab 的代码并进行构建。
4. 然后配置代码变更自动构建流程，使得代码变更可以触发自动构建 Docker 镜像。
5. 最后配置自动部署流程，镜像构建完成后自动将镜像发布到测试或生产环境。

接下来我们逐一操作。

### 1. 配置 GitLab SSH 访问公钥

为了能够让 Jenkins 顺利从 GitLab 拉取代码，我们需要先生成 ssh 密钥。我们可以使用 ssh-keygen 命令来生成 2048 位的 ras 密钥。在 Linux 上执行如下命令：

```bash
$ ssh-keygen -o -t rsa -b 2048 -C "email@example.com"
# 输入上面命令后系统会提示我们密钥保存的位置等信息，只需要按回车即可。
Generating public/private rsa key pair.
Enter file in which to save the key (/home/centos/.ssh/id_rsa):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/centos/.ssh/id_rsa.
Your public key has been saved in /home/centos/.ssh/id_rsa.pub.
The key fingerprint is:
SHA256:A+d0NQQrjxV2h+zR3BQIJxT23puXoLi1RiTKJm16+rg email@example.com
The key's randomart image is:
+---[RSA 2048]----+
|          =XB=o+o|
|         ..=B+o .|
|      . + +. o   |
|       = B .o .  |
|      o S +  o . |
|     . * .... . +|
|      =  ..o   +.|
|     ...  o..   .|
|     E=. ...     |
+----[SHA256]-----+
```

执行完上述命令后 ，$HOME/.ssh/ 目录下会自动生成两个文件：id_rsa.pub 文件为公钥文件，id_rsa 文件为私钥文件。我们可以通过 cat 命令来查看公钥文件内容：

```bash
$ cat $HOME/.ssh/id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDljSlDNHnUr4ursYISKXK5j2mWTYnt100mvYeJCLpr6tpeSarGyr7FnTc6sLM721plU2xq0bqlFEU5/0SSvFdLTht7bcfm/Hf31EdAuIqZuy/guP06ijpidfX6lVDxLWx/sO3Wbj3t7xgj4sfCFTiv+OOFP0NxKr5wy+emojm6KIaXkhjbPeJDgph5bvluFnKAtesMUkdhceAdN9grE3nkBOnwWw6G4dCtbrKt2o9wSyzgkDwPjj2qjFhcE9571/61/Nr8v9iqSHvcb/d7WZ0Qq7a2LYds6hQkpBg2RCDDJA16fFVs8Q5eNCpDQwGG3IbhHMUwvpKDf0OYrS9iftc5 email@example.com
```

然后将公钥文件拷贝到 GitLab 的个人设置 -> SSH Keys 中，点击添加按钮，将我们的公钥添加到 GitLab 中。

### 2. 上传服务代码到 GitLab

这里，我使用 Golang 编写了一个 HTTP 服务，代码如下：

```go
package main

import (
    "fmt"
    "net/http"
)

func hello(w http.ResponseWriter, req *http.Request) {

    fmt.Fprintf(w, "hello\n")
}

func headers(w http.ResponseWriter, req *http.Request) {

    for name, headers := range req.Header {
        for _, h := range headers {
            fmt.Fprintf(w, "%v: %v\n", name, h)
        }
    }
}

func main() {

    http.HandleFunc("/hello", hello)
    http.HandleFunc("/headers", headers)

    http.ListenAndServe(":8090", nil)
}
```

然后编写一个 Dockerfile，利用多阶段构建将我们的 Go 编译，并将编译后的二进制文件拷贝到 scratch（scratch 是一个空镜像，用于构建其他镜像，体积非常小）的基础镜像中。Dockerfile 的内容如下：

```dockerfile
FROM golang:1.14 as builder
WORKDIR /go/src/github.com/wilhelmguo/devops-demo/
COPY main.go .
RUN CGO_ENABLED=0 GOOS=linux go build -o /tmp/http-server .
FROM scratch
WORKDIR /root/
COPY --from=builder /tmp/http-server .
CMD ["./http-server"]
```

编写完 Go HTTP 文件和 Dockerfile 文件后，代码目录内容如下：

```bash
$ ls -lh
total 24
-rw-r--r--  1 root  root   243B Nov  3 22:03 Dockerfile
-rw-r--r--  1 root  root    26B Nov  3 22:06 README.md
-rw-r--r--  1 root  root   441B Nov  3 22:03 main.go
```

然后，我们在 GitLab 上创建一个 hello 项目，并将代码上传。

3. 创建 Jenkins 任务

在 Jenkins 中添加一个自由风格的任务。

点击确定，然后到源码管理选择 Git，填写 GitLab 项目的 URL。此时 Jenkins 会提示没有访问 GitLab 的相关权限，我们需要点击添加按钮将私钥添加到 Jenkins 中用以鉴权。

> 由于部署 GitLab 的宿主机 ssh 默认端口为 22，为了避免与宿主机的 ssh 端口冲突，我们的 GitLab ssh 端口配置为 2222，因此 Jenkins 连接 GitLab 的 URL 中需要包含端口号 2222， 配置格式为 ssh://git@172.20.1.6:2222/root/hello.git。


选择添加的密钥类型为 "SSH Username with private key"，Username 设置为 jenkins，然后将私钥粘贴到 Private Key 输入框中，点击添加即可。

添加完成后，认证名称选择 jenkins 后，红色报错提示就会消失。这证明此时 Jenkins 和 GitLab 已经认证成功，可以成功从 GitLab 拉取代码了。

下面我们使用 shell 脚本来构建我们的应用镜像，在构建中增加一个 Shell 类型的构建步骤，并且填入以下信息，将 USER 替换为目标镜像仓库的用户名，将 PASSWORD 替换为镜像仓库的密码。

```bash
# 第一步，登录镜像仓库
$ docker login -u {USER} -p  {PASSWORD}
# 第二步，使用 docker build 命令构建镜像
$ docker build -t lagoudocker/devops-demo . 
# 第三步, 使用 docker push 命令推送镜像
$ docker push lagoudocker/devops-demo 
```

完成后点击保存，此时任务已经成功添加到 Jenkins 中。回到任务首页，点击构建按钮即可开始构建。第一次构建需要下载依赖的基础镜像，这个过程可能比较慢。构建过程中，我们也可以点击控制台查看构建输出的内容：

### 4. 配置自动构建

点击上一步创建的任务，点击配置进入任务配置界面，到构建触发器下勾选 GitLab 相关的选项，点击 Generate 按钮生成一个 GitLab 回调 Jenkins 的 token。记录下 Jenkins 的回调地址和生成的 token 信息。

在 GitLab 项目设置中，选择 Webhooks，将 Jenkins 的回调地址和 token 信息添加到 Webhooks 的配置中，点击添加即可。

为了实现根据 git 的 tag 自动构建相应版本的镜像，我们需要修改 Jenkins 构建步骤中的 shell 脚本为以下内容：

```bash
# 需要推送的镜像名称
IMAGE_NAME="lagoudocker/devops-demo" 
# 获取当前构建的版本号
GIT_VERSION=`git describe --always --tag`
# 生成完整的镜像 URL 变量，用于构建和推送镜像
REPOSITORY=docker.io/${IMAGE_NAME}:${GIT_VERSION} 
# 构建Docker镜像 
docker build -t $REPOSITORY -f Dockerfile . 
# 登录镜像仓库，username 跟 password 为目标镜像仓库的用户名和密码
docker login --username=xxxxx --password=xxxxxx docker.io
# 推送 Docker 镜像到目标镜像仓库
docker push $REPOSITORY 
```

好了，到此我们已经完成了 GitLab -> Jenkins -> Docker 镜像仓库的自动构建和推送。当我们推送代码到 GitLab 中时，会自动触发 Webhooks，然后 GitLab 会根据配置的 Webhooks 调用 Jenkins 开始构建镜像，镜像构建完成后自动将镜像上传到我们的镜像仓库。

### 5. 配置自动部署

镜像构建完成后，我们还需要将镜像发布到测试或生产环境中将镜像运行起来。发布到环境的过程可以设置为自动发布，每当我们推送代码到 master 中时，即开始自动构建镜像，并将构建后的镜像发布到测试环境中。

在镜像构建过程中，实际上 Jenkins 是通过执行我们编写的 shell 脚本完成的，要想实现镜像构建完成后自动在远程服务器上运行最新的镜像，我们需要借助一个 Jenkins 插件 Publish Over SSH，这个插件可以帮助我们自动登录远程服务器，并执行一段脚本将我们的服务启动。

下面我们来实际操作下这个插件。

第一步，在 Jenkins 中安装 Publish Over SSH 插件。 在 Jenkins 系统管理，插件管理中，搜索 Publish Over SSH，然后点击安装并重启 Jenkins 服务。

第二步，配置 Publish Over SSH 插件。 插件安装完成后，在 Jenkins 系统管理的系统设置下，找到 Publish Over SSH 功能模块，添加远程服务器节点，这里我使用密码验证的方式添加一台服务器。配置好后，我们可以使用测试按钮测试服务器是否可以正常连接，显示Success 代表服务器可以正常连接，测试连接成功后，点击保存按钮保存配置。

第三步，修改之前 shell 任务中脚本， 添加部署相关的内容：

```bash
# 需要推送的镜像名称
IMAGE_NAME="lagoudocker/devops-demo" 
# 获取当前构建的版本号
GIT_VERSION=`git describe --always --tag`
# 生成完整的镜像 URL 变量，用于构建和推送镜像
REPOSITORY=docker.io/${IMAGE_NAME}:${GIT_VERSION} 
# 构建Docker镜像 
docker build -t $REPOSITORY -f Dockerfile . 
# 登录镜像仓库，username 跟 password 为目标镜像仓库的用户名和密码
docker login --username={USER} --password={PASSWORD} docker.io
# 推送 Docker 镜像到目标镜像仓库
docker push $REPOSITORY 
mkdir -p ./shell && echo \ 
"docker login --username={USER} --password={PASSWORD} \n"\ 
"docker pull $REPOSITORY\n"\ 
"docker kill hello \n"\ 
"docker run --rm --name=hello -p 8090:8090 -d $REPOSITORY" >> ./shell/release
```

我们在 docker push 命令后，增加一个输出 shell 脚本到 release 文件的命令，这个脚本会发送到远端的服务器上并执行，通过执行这个脚本文件可以在远端服务器上，拉取最新镜像并且重新启动容器。

第四步，配置远程执行。在 Jenkins 的 hello 项目中，点击配置，在执行步骤中点击添加Send files or execute commands over SSH的步骤，选择之前添加的服务器，并且按照以下内容填写相关信息。

- Source file 就是我们要传递的 shell 脚本信息，这里填写我们上面生成的 shell 脚本文件即可。
- Remove prefix 是需要过滤的目录，这里我们填写 shell。
- Remote directory 为远程执行脚本的目录。

最后点击保存，保存我们的配置即可。配置完成后，我们就完成了推送代码到 GitLab，Jenkins 自动构建镜像，之后推送镜像到镜像仓库，最后自动在远程服务器上拉取并重新部署容器。

> 如果你是生产环境中使用的 Kubernetes 管理服务，可以在 Jenkins 中安装 Kubernetes 的插件，然后构建完成后直接发布镜像到 Kubernetes 集群中。

> DevOps 是一个非常棒的指导思想，而 CI/CD 是整个 DevOps 流程中最重要的部分，目前 CI/CD 的市场已经非常成熟，CI/CD 的工具链也非常完善，因此，无论是小团队还是大团队，都有必要去学习和掌握 CI/CD，以便帮助我们改善团队的效能，一切可以自动化的流程，都应该尽量避免人工参与。

## 参考

- 《由浅入深吃透 Docker》
- 《狂神说Docker》
- http://www.docker.com
- https://www.docker-cn.com
- https://docs.docker.com/compose/compose-file/compose-file-v3/
- https://docs.docker.com/compose/reference/

[1]: /images/docker/docker-03/1.jpg
[2]: /images/docker/docker-03/2.jpg
[3]: /images/docker/docker-03/3.jpg
[4]: /images/docker/docker-03/4.jpg
[5]: /images/docker/docker-03/5.jpg
[6]: /images/docker/docker-03/6.jpg
