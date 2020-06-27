---
title: CentOS 6 7 8版本对比
date: 2019-10-19 15:00:00
categories: Linux
tags:
  - CentOS
---

CentOS（Community Enterprise Operating System）是Linux发行版之一，它是来自于Red Hat Enterprise Linux(RHEL)依照开放源代码规定发布的源代码所编译而成。由于出自同样的源代码，因此有些要求高度稳定性的服务器以CentOS替代商业版的Red Hat Enterprise Linux使用。两者的不同，在于CentOS并不包含封闭源代码软件。

<!--more-->

## CentOS 8和7版本对比

CentOS 7于2014-07-07发布，完整更新于2020-08-06结束。CentOS 7基于RHEL 7版本，最初发行时使用Linux kernel 3.10, systemd 208 (在RHEL 7.2中升级到219),和GNOME 3.8。

CentOS 8于2019-09-24发布，完整更新于2024-05-01结束。CentOS 8基于RHEL 8版本，最初发行时使用Linux kernel 4.18, GCC 8.2, glibc 2.28, systemd 239和GNOME 3.28。

功能 | CentOS 8 | CentOS 7
---|---|---
内核版本 | 4.18.0-x | 3.10.0-x
文件系统 | XFS | XFS
时间同步 | 只支持Chronyd | 支持NTP和Chronyd
文件大小 | 8EB | 500TB
文件系统大小 | 1PB | 500TB
包管理工具 | DNF（YUM v4）| YUM（YUM v3）
最大内存 | 24TB | 12TB
防火墙 | nftables取代iptables | firewalld底层使用iptables
支持架构 | 支持64-bit ARM | 不支持64-bit ARM
网络管理 | 默认安装Cockpit | 无默认安装
CPU日志 | CPU日志记录在journald进程中 | CPU相关日志位于/var/log/cups目录
发布时间 | 2019-09-24 | 2014-07-07
完整更新 | 2024-05-01 | 2020-08-06
支持IPv6 | 支持 | Ready Logo Phase 2
Git | 2.18 | 1.7
GCC | 8.2.1 | 4.8.5
Python | 3.6.6 | 2.7.5
Glibc | 2.28 | 2.17
Boost | 1.66 | 1.53
LLVM/Clang | 6.0 | 5.0

## ## CentOS 6和7版本对比

功能 | CentOS 6 | CentOS 7 | 说明
---|---|---|---
init系统 | sysvinit | systemd
桌面系统 | GNOME 2.x | GNOME 3.x/GNOME Shell
文件系统 | ext4 | xfs | 大量小文件在ext4上工作性能较好，在64位linux中，ext4最大支持16TB的文件，xfs最大支持8EB的文件
内核版本 | 2.6.x | 3.10.x
启动加载器 | GRUB Legacy(+efibootmgr) | GRUB2
防火墙 | iptables | firewalld | 原来使用iptables，现在在CentOS 7中失效。关闭防火墙使用chkconfig iptables off，是会报错error reading information on service iptables: No such file or directory。需要systemctl disable firewalld.service 注：如果不关闭防火墙，在创建MySQL group replication时会报错无法连接到其他节点
数据库 | mysqld | MariaDB | 在CentOS 7上安装mysql（社区版或者企业版），需要先卸载mariadb
文件目录 | /bin,/sbin,/lib, and /lib64在/根下 | /bin,/sbin,lib, and /lib64在/usr下
主机名 | `vim /etc/sysconfig/network`</br>NETWORKING=yes</br>HOSTNAME=hostname</br>GATEWAY=192.168.10.1 | `cat /etc/hostname`</br>`hostnamectl set-hostname <hostname>` | CentOS 6的修改主机名方式，在7下，重启后就失效
时间同步 | ntp, ntpq -p | chrony, chronyc sources
修改时间 | `vim /etc/sysconfig/clock`</br>ZONE="Asia/Tokyo"</br>UTC=fales</br> `sudo ln -s /usr/share/zoneinfo/Asia/Tokyo /etc/localtime` | `timedatectl set-timezone Asia/Tokyo`
语言和字符集 | `cat /etc/sysconfig/i18n` | `cat /etc/locale.conf`</br>`localectl set-local LANG=zh_CN.utf`</br>`localectl status`
重启服务 | `service sshd restart/status/reload` | `systemctl restart/status/reload sshd.service` | service的命令，被替换成systemctl xxx.service，但是其实service命令还是在centos 7中被兼容，只是会提示被redirect到systemctl命令
随机启动服务 | `chkconfig service_name on/off` | `systemctl enable/disable service_name` | 随机启动服务的命令也会systemctl接管
服务列表 | `chkconfig --list` | `systemctl list-unit-files`</br>`systemctl --type service`
kill服务 | `kill -9 <PID>` | `systemctl kill --signal=9 sshd`
网络及端口信息 | `netstat` | `ss`
网卡名称 | eth0 | eno16777736 | [网卡名称说明](#网卡名称说明)
IP信息 | `ifconfig` | `ip address show` | CentOS 7 最小安装，不包含ifconfig，需要 `yum install net-tools`
路由信息 | `route -n` | `ip route show`
关闭停止系统 | `shutdown -h now` | `systemctl poweroff`
单用户模式 | `init S` | `systemctl rescue`
运行模式 | `vim /etc/inittab`</br>id:3:initdefault: | `systemctl set-default graphical.target`</br>`systemctl setdefault multi-user.target`
进单用户模式 | 开机在kernel版本的菜单，按e，再在kernel一行的最后加上空格single | 开机在kernel版本的菜单，按e，再在linux 16的那一行，把ro改成 “rw init=/sysroot/bin/sh”. 完成之后按 “Ctrl+x”进入单用户模式。 `chroot /sysroot/`</br>`passwd root`</br>`touch / .autorelabel`（如果有开selinux，必须touch这个文件）

### 网卡名称说明

CentOS7采用NetworkManager.service来进行网络管理，采用主板dmidecode采集命名。

两个节点网卡名称不一致，会导致Oracle RAC安装时自检报错。

可以通过修改配置来还原为RHEL6的命名方案。

1. 修改Grub配置文件

```bash
# 开机给kernel传递参数，关闭主板dmidecode采集命名
vim /etc/sysconfig/grub
#在GRUB_CMDLINE_LINUX配置项中加入
net.ifnames=0 biosdevname=0         #不启用BIOSDEV的配置
```

2. 重新加载Grub配置

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
```

3. 生成RHEL6的网卡配置文件

```bash
cd /etc/sysconfig/network-scripts
mv ifcfg-enxxxxxx ifcfg-eth0
```

4. 配置网卡

```bash
vim ifcfg-eth0
NAME=”eth0″
ONBOOT=yes
```

5. 重启系统生效

```bash
systemctl reboot
```

## 参考

- https://wiki.centos.org/zh/About/Product/
