---
title: Windows10 安装 Ubuntu 子系统
date: 2021-01-15 16:00:00
categories: Linux
tags:
  - WSL
  - Ubuntu
---

WSL 安装 Ubuntu

<!--more-->

## 启动 WSL

1. 启动开发者模式:

设置——>更新和安全——>开发者选项——>开发人员模式

2. 打开windows下的Linux子系统

控制面板——>程序和功能——>启用或关闭Windows功能——>适用于Linux的Windows子系统——>确定——>重启(开机可能需要长时间，耐心等待即可）

3. 下载并安装Ubuntu

在应用商店中搜索Ubuntu，选择Ubuntu 18.04 LTS长期支持版，点击获取进行下载及安装，安装完毕点击启动会打开bash命令行提示我们设置用户名（常用的不具有root权限的用户）和密码。这样我们就拥有了Ubuntu子系统。
子系统所在目录为：`C:\Users\【你的windows用户名】\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu18.04onWindows_79rhkp1fndgsc\LocalState\rootfs`

## Ubuntu 安装后的一些配置

### 查看基本的信息

```bash
# 查看linux内核版本
uname -r

# 查看系统版本
cat /etc/lsb-release

# Win10下其他硬盘分区会在Linux安装过程自动加载到Linux中，具体可进入/mnt中查看。
df -h

# 在 windows 中打开当前文件夹
explorer.exe .

# 使用 root 权限登录，后续输入密码
sudo -i
```

### 修改软件源

Ubuntu 软件源的源列表文件位于 `/etc/apt/sources.list`

```bash
# 备份原来的数据源配置文件：
sudo cp /etc/apt/sources.list /etc/apt/sources.list_backup

# 修改数据源配置文件：
sudo vim /etc/apt/sources.list

# 更改为阿里镜像源：
# 用 vim 编辑/etc/apt/sources.list 文件，可以用下面命令快捷的修改字符：
:%s/http:\/\/archive.ubuntu.com/https:\/\/mirrors.aliyun.com/

# 更新软件源
sudo apt update

# 更新软件包
sudo apt upgrade
```

### 启用SSH所需设置

```bash
# 设置root的口令（密码），用作后续登陆使用
sudo passwd root

# 安装openssh-server（似乎ubuntu自带已安装）
sudo apt install openssh-server

# 备份很重要
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# 使用vim进行编辑，按i进入insert模式
sudo vim /etc/ssh/sshd_config

service ssh start             #启动SSH服务
service ssh status            #检查状态

# 在vim中分别找到并对应修改四处，修改后ESC，输入wq保存退出，具体如下：
Port = 8022
ListenAddress 0.0.0.0        # 如果需要指定监听的IP则去除最左侧的井号，并配置对应IP，默认即监听PC所有IP
PermitRootLogin yes           # 如果你需要用 root 直接登录系统则此处改为 yes
PasswordAuthentication yes    # 将 no 改为 yes 表示使用帐号密码方式登录


# 启动SSH并检查状态，输出running即正确。
sudo service ssh start             # 启动SSH服务
sudo service ssh status            # 检查状态
sudo systemctl enable ssh          # 开机自动启动ssh命令
```

### 配置Ubuntu子系统图形桌面

安装WSL之后，Linux是没有形界面的。

```bash
# 安装 xrdp、xfce4
sudo apt install xorg

sudo apt-get install xfce4

sudo apt-get install xrdp

# 说明，xrdp是一个轻量级ubuntu桌面，里面的应用只能满足基本需求，但够用了。
```

配置xrdp 

```bash
# 设置使用3390端口，
sudo sed -i 's/port=3389/port=3390/g' /etc/xrdp/xrdp.ini

# 向xsession中写入xfce4-session
sudo echo xfce4-session >~/.xsession

# 重启xrdp服务：
sudo service xrdp restart
```

连接远程桌面

在windows10，启动远程桌面连接(运行命令：`mstsc`。点击显示选项，填入本机IP（本地IP默认是127.0.0.1），输入登录用户，点击连接。输入密码，确定即可连接。


> 注意，如果WSL的Ubuntu系统关闭，如关机重启，会导致远程连接不上，此时需要先在Win10中打开Ubuntu的命令行界面，输入：`sudo service xrdp restart` 此时再远程连接，即可连接上。

```bash
# 安装常用软件

sudo apt install make g++

sudo apt install perl-doc

sudo apt install tree
 
# 清理无用的软件

# 清理旧版本的软件缓存
sudo apt-get autoclean

# 清理所有软件缓存
sudo apt-get clean

# 删除系统不再使用的孤立软件
sudo apt-get autoremove
```

### 解决WSL的中文乱码问题

```bash
# 先安装以下软件包：
sudo apt-get install language-pack-zh-hans

# 打开以下文件
sudo vim /etc/environment

# 在最后写入以下内容，保存
LANG="zh_CN.UTF-8"
LANGUAGE="zh_CN:zh:en_US:en"

# 在/var/lib/locales/supported.d/，新建local文件
sudo vim /var/lib/locales/supported.d/local

# 写入以下，并保存：
en_US.UTF-8 UTF-8
zh_CN.UTF-8 UTF-8
zh_CN.GBK GBK
zh_CN GB2312

# 执行以下命令, 关闭WSL界面再开启即可，不用关机
sudo locale-gen

# 解决中文空格乱码问题
sudo apt-get install fonts-droid-fallback ttf-wqy-zenhei ttf-wqy-microhei fonts-arphic-ukai fonts-arphic-uming

```

## Docker 配置与安装

先卸载旧版本的docker

```bash
sudo apt-get remove docker docker-engine docker.io
```

安装必要的一些系统工具

```bash
sudo apt-get update
sudo apt-get install \
      apt-transport-https \
      ca-certificates \
      curl \
      software-properties-common
```

安装GPG证书

```bash
# 别忘了最后的“-”
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

写入软件源信息

```bash
sudo add-apt-repository "deb [arch=amd64] http://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable"
```

列出可用版本

```bash
sudo apt-cache madison docker-ce
```

更新并安装 Docker-CE

```bash
sudo apt-get update
sudo apt-get install docker-ce=18.06.3~ce-0~ubuntu-xenial
```

开启docker服务，查看docker状态

```bash
sudo service docker start
sudo service docker status

# 或
sudo systemctl status docker
sudo systemctl start docker
sudo systemctl enable docker
```

加载阿里云加速器

```bash
sudo mkdir -p /etc/docker 
sudo tee /etc/docker/daemon.json <<-'EOF'
{ 
"registry-mirrors": ["https://你自己的加速地址.mirror.aliyuncs.com"]
} 
EOF 
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 命令

```cmd
wslconfig 在适用于 Linux 的 Windows 子系统上执行管理操作

用法:
    /l, /list [Option]
        列出已注册的分发。
        /all - 可选择列出所有分发，包括当前正在
               安装或卸载的分发。

        /running - 只列出当前正在运行的分发。

    /s, /setdefault <DistributionName>
        将分发设置为默认值。

    /t, /terminate <DistributionName>
        终止分发。

    /u, /unregister <DistributionName>
        注销分发。


当我们运行WSL时，它会用第一次运行时输入的用户名登陆，如果想改为其他用户，可以（以ubuntu为例）：
ubuntu config --default-user root

这样，以后再运行ubuntu它就会默认以root登陆。此外还可以“ubuntu /?”查看其更多使用方法。
```

## 参考

- [适用于 Linux 的 Windows 子系统安装指南 (Windows 10)](https://docs.microsoft.com/zh-cn/windows/wsl/install-win10)
- [手动下载适用于 Linux 的 Windows 子系统发行版包](https://docs.microsoft.com/zh-cn/windows/wsl/install-manual)
- [【WSL+Docker】新手Win10下的WSL Ubuntu18并使用Docker（两种方式）](https://zhuanlan.zhihu.com/p/61542198/)
