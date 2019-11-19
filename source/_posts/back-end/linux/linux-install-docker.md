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

[Docker 常用镜像](https://xinlc.github.io/2019/07/28/back-end/linux/docker-image)

## 参考

- [docker](https://docs.docker.com/install/linux/docker-ce/centos/)
- [docker practice](https://yeasy.gitbooks.io/docker_practice/introduction/what.html)
