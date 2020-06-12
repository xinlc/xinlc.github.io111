---
title: Linux OpenVPN 客户端连接配置
date: 2020-05-18 15:07:00
categories: Linux
tags:
  - vpn
---

CentOS 连接 OpenVPN

<!--more-->

## 安装 OpenVPN 客户端

- Linux 服务器安装 OpenVPN 相对简单一些，为了方便安装，我们用 yum 直接安装，具体过程如下：

```bash
yum -y install epel-release
yum -y install openvpn
```

- OpenVPN 安装完成后会在 /etc/openvpn 生成对应的文件，具体如下：

```bash
[root@ns1 ~]# ll /etc/openvpn/
total 8
drwxr-x--- 2 root openvpn  34 Jul 26 15:06 client
drwxr-x--- 2 root openvpn   6 Apr 26 23:04 server
```

## 准备配置文件及证书文件

- 因为我们之前有安装过 OpenVPN 服务端，具体过程参见 Docker 常用镜像文章下的 OpenVPN 安装配置，在这里我们直接用它提供的配置文件即可。

- 注意： 我们之前安装的 OpenVPN 服务端集成了 LDAP 统一认证，所以我们不再需要服务端分配给客户端的证书及密钥，只需要配置文件及相应的 key 即可，还有就是我们需要新建账号密码文件 passwd 。

- 配置文件修改完成后， /etc/openvpn 目录结构如下所示:

```bash
[root@ns1 ~]# tree /etc/openvpn/
/etc/openvpn/
├── client
│   ├── ca.crt                    # 服务端提供
│   └── ta.key                    # 服务端提供
├── client.ovpn                    # 客户端配置文件
├── passwd                         # 账号密码文件，需要新建，第一行账号，第二行是密码
└── server
2 directories, 4 files
```

## 连接测试

- 配置完成后，我们用命令行相关命令进行测试，具体命令如下：

```bash
openvpn \
--daemon \
--cd /etc/openvpn \
--config client.ovpn \
--auth-user-pass /etc/openvpn/passwd \
--log-append /var/log/openvpn.log
```

- 命令参数说明：

```bash
--daemon           # 后台运行
--cd               # 配置文件目录路径
--config           # 配置文件名称
--auth-user-pass   # 指定账号密码文件
--log-append       # 日志文件
```

- 命令执行完后，可以用以下命令查看相关日志：

```bash
tail -f /var/log/openvpn.log
```

- 当日志末尾出现类似如下内容说明正常连接了：

```bash
Thu Jul 26 15:19:43 2018 /sbin/ip addr add dev tun0 local 10.6.0.226 peer 10.6.0.225
Thu Jul 26 15:19:43 2018 /sbin/ip route add 172.16.1.0/24 via 10.6.0.225
Thu Jul 26 15:19:43 2018 /sbin/ip route add 10.0.0.0/8 via 10.6.0.225
Thu Jul 26 15:19:43 2018 /sbin/ip route add 10.6.0.0/24 via 10.6.0.225
Thu Jul 26 15:19:43 2018 Initialization Sequence Completed
```

- 最后补充一下配置文件内容：

```bash
client
dev tun
proto tcp
remote x.x.x.x 1194               # x.x.x.x 代表服务端IP地址映射的公网IP地址
resolv-retry infinite
nobind
persist-key
persist-tun

ca client/ca.crt
;cert client.crt
;key client.key
remote-cert-tls server
tls-auth client/ta.key 1
cipher AES-256-CBC

ns-cert-type server
auth-user-pass

comp-lzo
verb 3
```
