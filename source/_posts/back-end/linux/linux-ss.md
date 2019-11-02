---
title: Linux搭建SS（ShadowSocks）
date: 2018-04-03 18:30:00
categories: Linux
tags:
  - linux
  - network
  - proxy
---

在 Linux 上搭建 SS 代理服务，实现科学上网。首先你需要购买一台在 GFW 之外的服务器，[vultr](https://www.vultr.com)，[Digital Ocean](https://www.digitalocean.com) 或 [搬瓦工](http://banwagong.cn)。

## 在 CentOS 7 上安装 SS

### 安装 pip

```bash
$ curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
$ python get-pip.py
```

<!--more-->

### 安装 SS

```bash
$ pip install --upgrade pip
$ pip install shadowsocks
```

### 创建 SS 配置文件

单端口配置

```bash
# 创建配置文件
$ vi /etc/shadowsocks.json

# 添加下面内容
{
  "server": "0.0.0.0",
  "server_port": 8388,            # 设置SS端口
  "local_address": "127.0.0.1",
  "password": "password1",        # 设置成你的密码
  "timeout": 300,
  "method": "aes-256-cfb"
}
```

多端口配置

```bash
{
    "server": "0.0.0.0",
    "port_password": {
        "8381": "password1",
        "8382": "password2",
    },
    "local_address": "127.0.0.1",
    "timeout": 300,
    "method": "aes-256-cfb"
}
```

### 关闭防火墙

```bash
$ systemctl stop firewalld.service
```

### 启动/关闭

```bash
# 启动SS
$ ssserver -c /etc/shadowsocks.json -d start

# 关闭SS
$ ssserver -c /etc/shadowsocks.json -d stop
```

### 配置自启动

创建配置文件

```bash
$ vi /etc/systemd/system/shadowsocks.service
# 加入下面内容
[Unit]
Description=Shadowsocks

[Service]
TimeoutStartSec=0
ExecStart=/usr/bin/ssserver -c /etc/shadowsocks.json

[Install]
WantedBy=multi-user.target
```

执行以下命令启动 shadowsocks 服务

```bash
$ systemctl enable shadowsocks
$ systemctl start shadowsocks

# 查看状态
$ systemctl status shadowsocks -l
```

### 客户端下载

- [Mac](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)
- [Windows](https://github.com/shadowsocks/shadowsocks-windows/releases)
- [Android](https://github.com/shadowsocks/shadowsocks-android/releases)
- ios 安装 SsrConnectPro

## 快速安装

```bash
$ wget --no-check-certificate -O shadowsocks.sh https://raw.githubusercontent.com/teddysun/shadowsocks_install/master/shadowsocks.sh

$ chmod +x shadowsocks.sh

$ ./shadowsocks.sh 2>&1 | tee shadowsocks.log
```

依次执行上面的命令后，选择输入：

- Shadowsocks-R
- 输入密码
- 输入端口号 [2000-65545]
- chacha20
- origin
- plain

## 一键安装最新内核并开启 [BBR](https://teddysun.com/489.html) 脚本

```bash
$ wget --no-check-certificate https://github.com/teddysun/across/raw/master/bbr.sh
$ chmod +x bbr.sh
$ ./bbr.sh
```

```bash
$ reboot # 重启
```

### 验证

```bash
$ uname -r  # 查看版本是否更新
```

```
$ lsmod | grep bbr # 返回值有 tcp_bbr 即bbr已启动。
```

## 优化 TCP 配置

```bash
$ vim /etc/sysctl.conf
```

复制如下代码：

```
# TCP配置优化
fs.file-max = 51200
# 提高整个系统的文件限制
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.core.netdev_max_backlog = 250000
net.core.somaxconn = 4096
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.ip_local_port_range = 10000 65000
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_mem = 25600 51200 102400
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_congestion_control = bbr
```

应用 & 重启 SS

```bash
$ sysctl -p
$ /etc/init.d/shadowsocks-r restart
$ ssserver -c /etc/shadowsocks.json -d start
```

## 参考

- [在 CentOS 7 下安装配置 shadowsocks](http://morning.work/page/2015-12/install-shadowsocks-on-centos-7.html)
- [shadowsocks wiki](https://github.com/shadowsocks/shadowsocks/wiki)
- [Vpn 与 ss/ssr 的区别](https://blog.csdn.net/marvel__dead/article/details/78495583)
