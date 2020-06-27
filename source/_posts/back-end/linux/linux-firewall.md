---
title: CentOS7 防火墙配置
date: 2019-09-14 15:00:00
categories: Linux
tags:
  - linux
  - centos7
---

在CentOS7中，默认的防火墙不是iptables，而是firewalld。

<!--more-->

## Linux 防火墙名词解释

iptables 不是防火墙，firewall-cmd 也不是，它们只是控制防火墙的工具。netfilter 才是真正的防火墙，其都是操作 netfilter 的工具。

centos 6 默认用 iptables-services 服务，iptables 命令工具。
centos 7 默认用 firewalld 服务，firewall-cmd 命令工具。当然也能用 iptables 工具，只是没有iptables服务不能保存 netfilter 规则，重启后会失效。（docker 或 k8s 就是直接写入防火墙规则）

## firewalld 的基本使用

- 启动： systemctl start firewalld
- 关闭： systemctl stop firewalld
- 查看状态： systemctl status firewalld
- 开机禁用 ： systemctl disable firewalld
- 开机启用 ： systemctl enable firewalld

## systemctl是CentOS7的服务管理工具中主要的工具，它融合之前service和chkconfig的功能于一体

- 启动一个服务：`systemctl start firewalld.service`
- 关闭一个服务：`systemctl stop firewalld.service`
- 重启一个服务：`systemctl restart firewalld.service`
- 显示一个服务的状态：`systemctl status firewalld.service`
- 在开机时启用一个服务：`systemctl enable firewalld.service`
- 在开机时禁用一个服务：`systemctl disable firewalld.service`
- 查看服务是否开机启动：`systemctl is-enabled firewalld.service`
- 查看已启动的服务列表：`systemctl list-unit-files|grep enabled`
- 查看启动失败的服务列表：`systemctl –failed`

## 配置firewalld-cmd

- 查看版本：`firewall-cmd –version`
- 查看帮助：`firewall-cmd –help`
- 显示状态：`firewall-cmd –state`
- 查看所有打开的端口：`firewall-cmd –zone=public –list-ports`
- 更新防火墙规则：`firewall-cmd –reload`
- 查看区域信息: `firewall-cmd –get-active-zones`
- 查看指定接口所属区域：`firewall-cmd –get-zone-of-interface=eth0`
- 拒绝所有包：`firewall-cmd –panic-on`
- 取消拒绝状态：`firewall-cmd –panic-off`
- 查看是否拒绝：`firewall-cmd –query-panic`

## 常用命令

```bash
# 添加
firewall-cmd –zone=public –add-port=80/tcp –permanent # （–permanent永久生效，没有此参数重启后失效）

# 重新载入
firewall-cmd –reload

# 查看
firewall-cmd –zone= public –query-port=80/tcp

# 删除
firewall-cmd –zone= public –remove-port=80/tcp –permanent

firewall-cmd --list-services
firewall-cmd --get-services
firewall-cmd --add-service=<service>
firewall-cmd --delete-service=<service>
# 在每次修改端口和服务后/etc/firewalld/zones/public.xml文件就会被修改,所以也可以在文件中之间修改,然后重新加载
# 使用命令实际也是在修改文件，需要重新加载才能生效。

firewall-cmd --zone=public --query-port=80/tcp
firewall-cmd --zone=public --query-port=8080/tcp
firewall-cmd --zone=public --query-port=3306/tcp
firewall-cmd --zone=public --add-port=8080/tcp --permanent
firewall-cmd --zone=public --add-port=3306/tcp --permanent
firewall-cmd --zone=public --query-port=3306/tcp
firewall-cmd --zone=public --query-port=8080/tcp
firewall-cmd --reload  # 重新加载后才能生效
firewall-cmd --zone=public --query-port=3306/tcp
firewall-cmd --zone=public --query-port=8080/tcp

# 参数解释
–add-service #添加的服务
–zone #作用域
–add-port=80/tcp #添加端口，格式为：端口/通讯协议
–permanent #永久生效，没有此参数重启后失效

# 详细使用
firewall-cmd --permanent --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.0.4/24" service name="http" accept'    //设置某个ip访问某个服务
firewall-cmd --permanent --zone=public --remove-rich-rule='rule family="ipv4" source address="192.168.0.4/24" service name="http" accept' //删除配置
firewall-cmd --permanent --add-rich-rule 'rule family=ipv4 source address=192.168.0.1/2 port port=80 protocol=tcp accept'     //设置某个ip访问某个端口
firewall-cmd --permanent --remove-rich-rule 'rule family=ipv4 source address=192.168.0.1/2 port port=80 protocol=tcp accept'     //删除配置

firewall-cmd --query-masquerade  # 检查是否允许伪装IP
firewall-cmd --add-masquerade    # 允许防火墙伪装IP
firewall-cmd --remove-masquerade # 禁止防火墙伪装IP

firewall-cmd --add-forward-port=port=80:proto=tcp:toport=8080   # 将80端口的流量转发至8080
firewall-cmd --add-forward-port=proto=80:proto=tcp:toaddr=192.168.1.0.1 # 将80端口的流量转发至192.168.0.1
firewall-cmd --add-forward-port=proto=80:proto=tcp:toaddr=192.168.0.1:toport=8080 # 将80端口的流量转发至192.168.0.1的8080端口
```

## centos7以下版本

```bash
# 1.开放80，22，8080 端口
/sbin/iptables -I INPUT -p tcp --dport 80 -j ACCEPT
/sbin/iptables -I INPUT -p tcp --dport 22 -j ACCEPT
/sbin/iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
# 2.保存
/etc/rc.d/init.d/iptables save
# 3.查看打开的端口
/etc/init.d/iptables status
# 4.关闭防火墙
# 1） 永久性生效，重启后不会复原
开启： chkconfig iptables on
关闭： chkconfig iptables off
# 2） 即时生效，重启后复原
开启： service iptables start
关闭： service iptables stop

# 查看所有链规则
iptables -nvL
# 查看 input 链规则
iptables -nvL INPUT
```

## CentOS 7安装iptables服务，以及常用命令

禁用/停止自带的firewalld服务：

iptables服务

```bash
#先检查是否安装了iptables
service iptables status
#安装iptables
yum install -y iptables
#升级iptables
yum update iptables
#安装iptables-services
yum install iptables-services
#停止firewalld服务
systemctl stop firewalld
#禁用firewalld服务
systemctl mask firewalld
```

设置现有iptables规则

```bash
#查看iptables现有规则
iptables -L -n
#先允许所有,不然有可能会杯具
iptables -P INPUT ACCEPT
#清空所有默认规则
iptables -F
#清空所有自定义规则
iptables -X
#所有计数器归0
iptables -Z
#允许来自于lo接口的数据包(本地访问)
iptables -A INPUT -i lo -j ACCEPT
#开放22端口
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
#开放21端口(FTP)
iptables -A INPUT -p tcp --dport 21 -j ACCEPT
#开放80端口(HTTP)
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
#开放443端口(HTTPS)
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
#允许ping
iptables -A INPUT -p icmp --icmp-type 8 -j ACCEPT
#允许接受本机请求之后的返回数据 RELATED,是为FTP设置的
iptables -A INPUT -m state --state  RELATED,ESTABLISHED -j ACCEPT
#其他入站一律丢弃
iptables -P INPUT DROP
#所有出站一律绿灯
iptables -P OUTPUT ACCEPT
#所有转发一律丢弃
iptables -P FORWARD DROP
```

设置其他iptables规则

```bash
#如果要添加内网ip信任（接受其所有TCP请求）
iptables -A INPUT -p tcp -s 45.96.174.68 -j ACCEPT
#过滤所有非以上规则的请求
iptables -P INPUT DROP
#要封停一个IP，使用下面这条命令：
iptables -I INPUT -s ***.***.***.*** -j DROP
#要解封一个IP，使用下面这条命令:
iptables -D INPUT -s ***.***.***.*** -j DROP

#保存上述规则
service iptables save
```

开启iptables服务

```bash
#注册iptables服务
#相当于以前的chkconfig iptables on
systemctl enable iptables.service
#开启服务
systemctl start iptables.service
#查看状态
systemctl status iptables.service
```

解决vsftpd在iptables开启后,无法使用被动模式的问题

```bash
# 1.首先在/etc/sysconfig/iptables-config中修改或者添加以下内容
#添加以下内容,注意顺序不能调换
IPTABLES_MODULES="ip_conntrack_ftp"
IPTABLES_MODULES="ip_nat_ftp"

# 2.重新设置iptables设置
iptables -A INPUT -m state --state  RELATED,ESTABLISHED -j ACCEPT
```

> 注意：-A 是在后面添加，-I 是插入在最前面，防火墙按顺序匹配。

## 参考

- [firewall-cmd](https://wangchujiang.com/linux-command/c/firewall-cmd.html)
- [CentOS7中firewalld的安装与使用详解](https://blog.csdn.net/solaraceboy/article/details/78342360)
