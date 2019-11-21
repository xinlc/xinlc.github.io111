---
title: Docker 三剑客之 Docker Machine
date: 2019-11-20 23:00:00
categories: Docker
tags:
  - docker
---

Docker Machine 是 Docker 官方编排（Orchestration）项目之一，负责在多种平台上快速安装 Docker 环境。

<!--more-->

![1][1]

## 安装

macOS、Windows

Docker Desktop for Mac/Windows 自带 docker-machine 二进制包，安装之后即可使用。

```bash
$ docker-machine -v
docker-machine version 0.16.2, build bd45ab13
```

[Linux](https://github.com/docker/machine/releases/)

```bash
$ curl -L https://github.com/docker/machine/releases/download/v0.16.2/docker-machine-`uname -s`-`uname -m` >/tmp/docker-machine &&
    chmod +x /tmp/docker-machine &&
    sudo cp /tmp/docker-machine /usr/local/bin/docker-machine
```

[1]: /images/docker/docker-machine/1.png

## 使用

Docker Machine 支持多种后端驱动，包括虚拟机、本地主机和云平台等。

### Virtualbox 驱动

使用 virtualbox 类型的驱动，创建一台 Docker 主机，命名为 test。

```bash
$ docker-machine create -d virtualbox test
```

你也可以在创建时加上如下参数，来配置主机或者主机上的 Docker。

- `--engine-opt dns=114.114.114.114` 配置 Docker 的默认 DNS
- `--engine-registry-mirror https://dockerhub.azk8s.cn` 配置 Docker 的仓库镜像
- `--virtualbox-memory 2048` 配置主机内存
- `--virtualbox-cpu-count 2` 配置主机 CPU

更多参数请使用 `docker-machine create --driver virtualbox --help` 命令查看。

### macOS xhyve 驱动

`xhyve` 驱动 [GitHub: https://github.com/zchee/docker-machine-driver-xhyve](https://github.com/zchee/docker-machine-driver-xhyve)

xhyve 是 macOS 上轻量化的虚拟引擎，使用其创建的 Docker Machine 较 VirtualBox 驱动创建的运行效率要高。

```bash
$ brew install docker-machine-driver-xhyve

$ docker-machine create \
      -d xhyve \
      # --xhyve-boot2docker-url ~/.docker/machine/cache/boot2docker.iso \
      --engine-opt dns=114.114.114.114 \
      --engine-registry-mirror https://dockerhub.azk8s.cn \
      --xhyve-memory-size 2048 \
      --xhyve-rawdisk \
      --xhyve-cpu-count 2 \
      xhyve
```

> 注意：非首次创建时建议加上 `--xhyve-boot2docker-url ~/.docker/machine/cache/boot2docker.iso` 参数，避免每次创建时都从 GitHub 下载 ISO 镜像。

### Windows 10

Windows 10 安装 `Docker Desktop for Windows` 之后不能再安装 VirtualBox，也就不能使用 virtualbox 驱动来创建 Docker Machine，我们可以选择使用 hyperv 驱动。

> 注意：必须事先在 `Hyper-V` 管理器中新建一个 外部虚拟交换机 执行下面的命令时，使用 `--hyperv-virtual-switch=MY_SWITCH` 指定虚拟交换机名称

```bash
$ docker-machine create --driver hyperv --hyperv-virtual-switch=MY_SWITCH vm
```

## 基本命令

```bash
# 查看主机列表
docker-machine ls

# 让当前shell docker后续操作对象都是目标主机
eval "$(docker-machine env test)"

# 通过 SSH 登录到主机
docker-machine ssh test

# 停止
docker-machine stop test

# 启动
docker-machine start test
```

## 操作命令

- `active` 查看活跃的 Docker 主机
- `config` 输出连接的配置信息
- `create` 创建一个 Docker 主机
- `env` 显示连接到某个主机需要的环境变量
- `inspect` 输出主机更多信息
- `ip` 获取主机地址
- `kill` 停止某个主机
- `ls` 列出所有管理的主机
- `provision` 重新设置一个已存在的主机
- `regenerate-certs` 为某个主机重新生成 TLS 认证信息
- `restart` 重启主机
- `rm` 删除某台主机
- `ssh` SSH 到主机上执行命令
- `scp` 在主机之间复制文件
- `mount` 挂载主机目录到本地
- `start` 启动一个主机
- `status` 查看主机状态
- `stop` 停止一个主机
- `upgrade` 更新主机 Docker 版本为最新
- `url` 获取主机的 URL
- `version` 输出 docker-machine 版本信息
- `help` 输出帮助信息

> 每个命令，又带有不同的参数，可以通过 `docker-machine COMMAND --help` 来查看具体的用法。

## 官方支持驱动

通过 -d 选项可以选择支持的驱动类型。

- amazonec2
- azure
- digitalocean
- exoscale
- generic
- google
- hyperv
- none
- openstack
- rackspace
- softlayer
- virtualbox
- vmwarevcloudair
- vmwarefusion
- vmwarevsphere

> [第三方驱动列表](https://github.com/docker/docker.github.io/blob/master/machine/AVAILABLE_DRIVER_PLUGINS.md)

## 参考

- [docker machine doc](https://docs.docker.com/machine/)
- [docker machine](https://github.com/docker/machine/)
