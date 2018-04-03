---
title: Linux搭建SS（ShadowSocks）
date: 2018-04-03 18:30:00
categories: Linux
tags: 
  - linux
  - network
  - proxy
---

在Linux上搭建SS代理服务器实现科学上网，首先你需要购买一台在GFW之外的服务器，[vultr](https://www.vultr.com) 或 [搬瓦工](http://banwagong.cn)

## 在CentOS 7上安装 SS
### 安装pip
```bash
curl "https://bootstrap.pypa.io/get-pip.py" -o "get-pip.py"
python get-pip.py
```

<!--more-->

### 安装SS
```
pip install --upgrade pip
pip install shadowsocks
```

### 创建SS配置文件
单端口配置

```bash
# 创建配置文件
vi /etc/shadowsocks.json

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
systemctl stop firewalld.service
```

### 启动/关闭
```
# 启动SS
ssserver -c /etc/shadowsocks.json -d start

# 关闭SS
ssserver -c /etc/shadowsocks.json -d stop 
```

### 配置自启动
创建配置文件
```bash
vi /etc/systemd/system/shadowsocks.service
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
systemctl enable shadowsocks
systemctl start shadowsocks

# 查看状态
systemctl status shadowsocks -l
```




### 客户端下载
- [Mac](https://github.com/shadowsocks/ShadowsocksX-NG/releases/)
- [Windows](https://github.com/shadowsocks/shadowsocks-windows/releases)
- [Android](https://github.com/shadowsocks/shadowsocks-android/releases)
- ios安装SsrConnectPro


## 快速安装

```bash
wget --no-check-certificate -O shadowsocks.sh https://raw.githubusercontent.com/teddysun/shadowsocks_install/master/shadowsocks.sh

chmod +x shadowsocks.sh

./shadowsocks.sh 2>&1 | tee shadowsocks.log
```


## 参考
- [在 CentOS 7 下安装配置 shadowsocks](http://morning.work/page/2015-12/install-shadowsocks-on-centos-7.html)
- [shadowsocks wiki](https://github.com/shadowsocks/shadowsocks/wiki)
- [Vpn与ss/ssr的区别](https://blog.csdn.net/marvel__dead/article/details/78495583)