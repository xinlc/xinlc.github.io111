---
title: CentOS7 安装 Docker
date: 2019-09-15 14:57:00
categories: Linux
tags:
  - linux
  - centos7
  - docker
---

在 CentOS7 中安装 `docker` 和 `docker-compose`。

<!--more-->

## docker

卸载旧版本 docker（如果有）：

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

## docker-compose

运行此命令以下载 Docker Compose 的当前稳定版本：

```bash
# 下载
sudo curl -L "https://github.com/docker/compose/releases/download/1.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 对二进制文件应用可执行权限：
sudo chmod +x /usr/local/bin/docker-compose
```

避免 docker 每次都输入 sudo：

```bash
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
```

[Docker 常用命令和镜像](https://xinlc.github.io/2019/07/28/back-end/linux/docker-image)

## 参考

- [docker](https://docs.docker.com/install/linux/docker-ce/centos/)
- [docker-compose](https://docs.docker.com/compose/install/)
