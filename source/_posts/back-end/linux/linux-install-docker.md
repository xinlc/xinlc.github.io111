---
title: CentOS7 安装 Docker
date: 2019-09-15 14:57:00
categories: Linux
tags:
  - linux
  - centos7
  - docker
---

Docker 是个划时代的开源项目，它彻底释放了计算虚拟化的威力，极大提高了应用的维护效率，降低了云计算应用开发的成本！使用 Docker，可以让应用的部署、测试和分发都变得前所未有的高效和轻松！

<!--more-->

## 安装 Docker

卸载旧版本 Docker（如果有）：

```bash
sudo yum remove docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine

```

安装所需的包。`yum-utils` 提供了 `yum-config-manager` 效用，并 `device-mapper-persistent-data` 和 `lvm2`由需要 `devicemapper` 存储驱动程序。

```bash
sudo yum install -y yum-utils \
  device-mapper-persistent-data \
  lvm2

```

使用以下命令设置稳定存储库：

```bash
sudo yum-config-manager \
  --add-repo \
  https://download.docker.com/linux/centos/docker-ce.repo
```

安装最新版本的 Docker Engine - 社区和容器：

```bash
# 安装
sudo yum install docker-ce docker-ce-cli containerd.io

# 启动docker
sudo systemctl start docker

# 开机启动
sudo systemctl enable docker
```

## 修改 docker 默认存储位置

默认情况下 Docker 的存放位置为：`/var/lib/docker`

可以执行 `docker info | grep "Docker Root Dir"` 查看

### 方案 1 通过软连接来实现

```bash
# 1. 停掉 docker 服务
systemctl stop docker

# 2. 迁移整个 /var/lib/docker 目录到目的路径
mv /var/lib/docker /mnt/data/docker

# 3. 建立 symlink 软链接
ln -s /mnt/data/docker /var/lib/docker

# 4.确认文件夹类型为 symlink 类型
ls -al /var/lib/docker

# 5. 启动 docker 服务, 完活
systemctl start docker
```

### 方案 2 修改镜像和容器的默认存放路径

编辑 启动文件

```bash
vim /usr/lib/systemd/system/docker.service
```

在添加 ExecStart 后添加 `--graph /mnt/data/docker`

```diff
[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
- ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
+ ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --graph /mnt/data/docker
ExecReload=/bin/kill -s HUP $MAINPID
TimeoutSec=0
RestartSec=2
Restart=always
```

加载配置，重启服务

```bash
systemctl daemon-reload
systemctl restart docker.service
```

## 方案 3 修改 daemon.json

创建或修改 `/etc/docker/daemon.json` 文件, 修改后会立即生效，不需重启 docker 服务。

```json
{
  "registry-mirrors": [
    "加速地址"
  ],
  "insecure-registries": []
  "graph": "/mnt/data/docker"
}
```

## Docker 常用命令

```bash
docker pull <image>
docker search <image>

docker run [options] image [command][arg...]
-d                   # 后台运行容器
-e                   # 设置环境变量
--expose/-p          # 宿主端口：容器端口映射
--name               # 指定容器名称
--linke              # 连接不同容器
-v                   # 宿主目录：容器目录，挂载磁盘卷

docker start/stop <容器名>
docker ps <容器名>
docker ps -a        # 查看所有容器
dokcer ps -l        # 查看最后一次创建的容器
docker rm           # 删除容器
docker rmi          # 删除镜像
docker logs <容器名> # 查看容器日志
docker images       # 显示镜像列表
docker inspect <容器名> # 查看容器信息

docker exec -it <容器名> bash # 登录到容器中
docker help          # 终极命令
docker-compose up -d # 通过 compose 启动


# 执行docker cp执行将本地主机的index.html复制到docker容器中
docker cp 本地主机文件路径 nginx容器id://usr/share/nginx/html
docker cp nginx容器id://usr/share/nginx/html/index.html 本地主机文件路径

# 登录aliyun镜像仓库
sudo docker login --username=xxx registry.cn-hangzhou.aliyuncs.com
sudo docker login -u xxx -p xxx registry.cn-hangzhou.aliyuncs.com

# 如果失败就不带用户名参数
docker login registry.cn-hangzhou.aliyuncs.com

# 批量操作
docker stop $(docker ps -a | grep "Exited" | awk '{print $1 }') # 停止容器
docker rm $(docker ps -a | grep "Exited" | awk '{print $1 }') # 删除容器
docker rmi $(docker images | grep "none" | awk '{print $3}')  # 删除<none>镜像
docker rmi $(docker images -f "dangling=true" -q) # 删除<none>镜像
docker image prune -f # 删除所有悬空映像 -f 不提示。如果-a指定，还将删除任何容器未引用的所有映像

# 格式化输出
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Status}}"

# 解决 docker命令不需要敲sudo的方法
# 由于docker daemon需要绑定到主机的Unix socket而不是普通的TCP端口，而Unix socket的属主为root用户，所以其他用户只有在命令前添加sudo选项才能执行相关操作。
# 查看是否有docker用户组
cat /etc/group

# 没有就创建一个docker组
sudo groupadd docker
# 添加当前用户到docker组
sudo usermod -aG docker $USER
# 如果有用户组就直接添加
sudo gpasswd -a <你的用户名> docker
# 重启
sudo service docker restart 或 sudo systemctl restart docker
# 重新登录shelL
# linux 系统 可以直接激活对组的更改
newgrp docker

# centos7 避免 docker 每次都输入 sudo：
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

## 镜像操作

```bash
docker images   # 显示本地所有的镜像列表
docker import   # 从一个tar包创建一个镜像，往往和export结合使用
docker build    # 使用Dockerfile创建镜像
docker commit   # 从容器创建镜像
docker rmi      # 删除一个镜像
docker load     # 从一个tar包创建一个镜像，和save配合使用
docker save     # 将一个镜像保存为一个tar包，带layers和tag信息
docker history  # 显示生成一个镜像的历史命令
docker tag      # 为镜像起一个别名
```

## 镜像仓库(registry)操作

```bash
docker login    # 登录到一个registry
docker search   # 从registry仓库搜索镜像
docker pull     # 从仓库下载镜像到本地
docker push     # 将一个镜像push到registry仓库中
```

## 容器相关操作

```bash
docker create   # 创建一个容器但是不启动它
docker run      # 创建并启动一个容器
docker stop     # 停止容器运行，发送信号SIGTERM
docker start    # 启动一个停止状态的容器
docker restart  # 重启一个容器
docker rm       # 删除一个容器
docker kill     # 发送信号给容器，默认SIGKILL
docker attach   # 连接(进入)到一个正在运行的容器
docker wait     # 阻塞到一个容器，直到容器停止运行
docker cp       # 从容器里向外拷贝文件或目录
docker export   # 将容器整个文件系统导出为一个tar包，不带layers、tag等信息
docker exec     # 在容器里执行一个命令，可以执行 bash 进入交互式
```

## 获取容器相关信息

```bash
docker ps       # 显示状态为运行（Up）的容器
docker ps -a    # 显示所有容器,包括运行中（Up）的和退出的(Exited)
docker inspect  # 深入容器内部获取容器所有信息
docker logs     # 查看容器的日志(stdout/stderr)
docker events   # 得到docker服务器的实时的事件
docker port     # 显示容器的端口映射
docker top      # 显示容器的进程信息
docker diff     # 显示容器文件系统的前后变化
```

## 命令大全

### 客户端命令选项

- `--config=""`：指定客户端配置文件，默认为 ~/.docker；
- `-D=true|false`：是否使用 debug 模式。默认不开启；
- `-H, --host=[]`：指定命令对应 Docker 守护进程的监听接口，可以为 unix 套接字 `unix:///path/to/socket`，文件句柄 `fd://socketfd` 或 tcp 套接字 `tcp://[host[:port]]`，默认为 `unix:///var/run/docker.sock；`
- `-l, --log-level="debug|info|warn|error|fatal"`：指定日志输出级别；
- `--tls=true|false`：是否对 Docker 守护进程启用 TLS 安全机制，默认为否；
- `--tlscacert=/.docker/ca.pem`：TLS CA 签名的可信证书文件路径；
- `--tlscert=/.docker/cert.pem`：TLS 可信证书文件路径；
- `--tlscert=/.docker/key.pem`：TLS 密钥文件路径；
- `--tlsverify=true|false`：启用 TLS 校验，默认为否。

### 客户端命令

可以通过 `docker COMMAND --help` 来查看这些命令的具体用法。

- `attach`：依附到一个正在运行的容器中；
- `build`：从一个 Dockerfile 创建一个镜像；
- `commit`：从一个容器的修改中创建一个新的镜像；
- `cp`：在容器和本地宿主系统之间复制文件中；
- `create`：创建一个新容器，但并不运行它；
- `diff`：检查一个容器内文件系统的修改，包括修改和增加；
- `events`：从服务端获取实时的事件；
- `exec`：在运行的容器内执行命令；
- `export`：导出容器内容为一个 tar 包；
- `history`：显示一个镜像的历史信息；
- `images`：列出存在的镜像；
- `import`：导入一个文件（典型为 tar 包）路径或目录来创建一个本地镜像；
- `info`：显示一些相关的系统信息；
- `inspect`：显示一个容器的具体配置信息；
- `kill`：关闭一个运行中的容器 (包括进程和所有相关资源)；
- `load`：从一个 tar 包中加载一个镜像；
- `login`：注册或登录到一个 Docker 的仓库服务器；
- `logout`：从 Docker 的仓库服务器登出；
- `logs`：获取容器的 log 信息；
- `network`：管理 Docker 的网络，包括查看、创建、删除、挂载、卸载等；
- `node`：管理 swarm 集群中的节点，包括查看、更新、删除、提升/取消管理节点等；
- `pause`：暂停一个容器中的所有进程；
- `port`：查找一个 nat 到一个私有网口的公共口；
- `ps`：列出主机上的容器；
- `pull`：从一个 Docker 的仓库服务器下拉一个镜像或仓库；
- `push`：将一个镜像或者仓库推送到一个 Docker 的注册服务器；
- `rename`：重命名一个容器；
- `restart`：重启一个运行中的容器；
- `rm`：删除给定的若干个容器；
- `rmi`：删除给定的若干个镜像；
- `run`：创建一个新容器，并在其中运行给定命令；
- `save`：保存一个镜像为 tar 包文件；
- `search`：在 Docker index 中搜索一个镜像；
- `service`：管理 Docker 所启动的应用服务，包括创建、更新、删除等；
- `start`：启动一个容器；
- `stats`：输出（一个或多个）容器的资源使用统计信息；
- `stop`：终止一个运行中的容器；
- `swarm`：管理 Docker swarm 集群，包括创建、加入、退出、更新等；
- `tag`：为一个镜像打标签；
- `top`：查看一个容器中的正在运行的进程信息；
- `unpause`：将一个容器内所有的进程从暂停状态中恢复；
- `update`：更新指定的若干容器的配置信息；
- `version`：输出 Docker 的版本信息；
- `volume`：管理 Docker volume，包括查看、创建、删除等；
- `wait`：阻塞直到一个容器终止，然后输出它的退出符。

[Docker 常用镜像](https://xinlichao.cn/back-end/linux/docker-image)

## 参考

- [docker](https://docs.docker.com/install/linux/docker-ce/centos/)
- [docker practice](https://yeasy.gitbooks.io/docker_practice/introduction/what.html)
