
---
title: Linux 知识地图
date: 2019-08-29 10:23:00
categories: Linux
tags: 
  - linux
  - map
---

Linux 知识地图
<!--more-->

## 基础知识

### 基础篇

- Linux 版本】
  - 内核版本格式
    - xx.yy.zzz
      - `xx` 主版本
      - `yy` 次版本
      - `zz` 末版本
    - 小于2.6版本
      - 次版本奇数为开发版
      - 次版本偶数为稳定版
    - 大于2.6版本
      - `longterm` 长期支持版本
      - `stable` 稳定版
      - `mainline` 主线开发版本
  - 常见发行版本
    - `Red Hat`
    - `Ubuntu`
    - `CentOS`
    - `Debian`
    - `Fedora`
- 重要感念
  - `root` 账号：对应Windows系统的管理员账号
  - `/` 根目录：对应Windows系统`我的电脑`

### 操作系统篇

#### 帮助命令

- 使用终端
  - 命令提示符
    - `$` 普通用户
    - `#` root 用户
  - 命令和路径补全: `tab` 键
  - 命令的分类(使用type查看某个命令的所属分类)
    - 内部命令
    - 外部命令
- 帮助命令和用法
  - man
    - `man xxx`：获取 xxx 命令
    - `man 1 man`：查看man命令自身的帮助文档
  - help
    - `help xxx`：获取内部命令的帮助
    - `xxx --help`：获取外部命令的帮助
  - info
    - 比 man 更丰富的帮助信息，格式：`info xxx`

#### 文件与目录管理

- 文件与目录查看命令: ls
  - `-l` (小写L) 显示文件的详细信息
  - `-a` 显示隐藏文件
  - `-r` 逆序显示
  - `-t` 按时间排序
  - `-R` 递归显示
- 路径操作（分绝对路径和相对路径）
  - `cd` 进入指定路径
  - `pwd` 显示当前路径
- 建立与删除目录
  - `mkdir` 建立目录, （`-p` 创建多级目录）
  - `rmdir` 删除空目录
- 通配符
  - `*` 匹配任意字符
  - `?` 匹配单个字符
  - `[xyz]` 匹配xyz任意字符
  - `[a-z]` 匹配字符范围
  - `[!xyz] 或 [^xyz]` 匹配不在xyz中的任意字符
- 复制文件 cp
  - `-r` 复制目录
  - `-p` 保留用户权限时间
  - `-a` 尽可能保留原始文件属性，等同与 `-dpR`
- 删除文件 rm
  - `-r` 递归删除
  - `-f` 不提示(强制删除，谨慎使用)
- 移动与重命名 mv
  - 移动文件 `mv file1 dir1/`
  - 重命名文件 `mv file1 file2`
- 文本查看
  - `head` 显示文件前n行
  - `tail` 显示结尾n行 （比较常用，如查看log `tail -100f aa.log`)
  - `cat` -f 参数可以显示文件更新信息，文件内容过长不建议使用cat查看，可以用less或more
  - `wc` 统计文件行数
    - 代码行数 wc -l `find ./ -name "*.js"`
    - 文件数 find ./ -name "*.js" | wc -l
    - 文件数 ls -l | grep "^-" | wc -l
    - 递归文件数 ls -lR| grep "^-" | wc -l
    - 递归目录树 ls -lR | grep "^d" | wc -l
- 打包和压缩
  - `tar`
    - 打包命令
    - 扩展命 `.tar`
    - 配合 `gzip`和`bzip2`可以使用打包和压缩功能
    - 压缩 tar -czvf aa.gz.tar aa/
    - 解压 tar -xzvf aa.gz.tar  (注意f必须在最后)
  - `gzip`
    - 压缩与解压命令
    - 扩展名 `.gz`
  - `bzip2`
    - 压缩与解压命令
    - 扩展名 `.bz2`
- [Vim 文本编辑器](https://xinlc.github.io/2017/03/12/tools/vim/)

#### 用户管理

- 用户命令
  - 常用用户命令
    - `useradd` 添加用户
    - `userdel` 删除用户
    - `passwd`  设置用户密码
    - `usermod` 修改用户信息
    - `groupadd` 添加用户组
    - `groupdel` 删除用户组
  - 已管理员身份运行
    - `su` 切换当前用户身份
    - `sudo` 用 `root` 用户身份执行某条命令
    - `visudo` 修改sudo命令的配置文件
- 用户配置文件
  - `/etc/passwd` 用户信息配置文件
  - `/etc/shadow` 用户密码信息配置文件

#### 权限管理

- 权限的表示法
  - 一般权限用三种字符表示
    - `r`
    - `w`
    - `x`
  - 文件权限与目录权限格式相同，但功能不同
    - 文件权限 r w x
    - 目录权限
      - `rx` 进入目录读取文件名
      - `wx` 修改目录内文件名
      - `x` 进入目录权限
    - 特殊权限
      - `/etc/passwd` 用户信息配置文件
      - `t` 添加了目录权限为777的目录的安全性，确保只有root用户和文件属主才可操作自己的文件或目录
- 权限相命令
  - `chmod` 修改权限
  - `chown` 更改属主，属组
  - `chgrp` 可以单独更改属组，不常用

### 系统管理篇

#### 正则表达式

- 政策表达式是什么？
  - 对字符串的一组公式
  - 用户对符合规则的字符进行查找和替换
- 初始元字符
  - `^`
  - `$`
  - `*`
- 扩展元字符

#### 文本与文件查找

- grep
  - `-i` 忽略大小写
  - `-v` 反转
  - `-a` 处理二进制文件
  - `-R` 递归方式
- find
  - `-name` 按照文件名搜索
  - `-perm` 按照权限搜索
  - `-user` 按照属主搜索
  - `-type` 按照文件类型搜索

#### 网络配置

- 网络配置命令
  - `ifconfig` 查看和网络配置接口
  - `ip` 查看和配置网络接口、路由
  - `netstat` 查看进程监听端口和状态
    - `-t` 指明显示TCP端口
    - `-u` 指明显示UDP端口
    - `-l` 仅显示监听套接字(所谓套接字就是使应用程序能够读写与收发通讯协议(protocol)与资料的程序)
    - `-p` 显示进程标识符和程序名称，每一个套接字/端口都属于一个程序。
    - `-n` 不进行DNS轮询，显示IP(可以加速操作)
    - `netstat -ntlp` 查看当前所有tcp端口
    - `netstat -ntulp | grep 80` 查看所有80端口使用情况
  - network 与 NetworkManager 网络管理脚本
- 配置文件
  - `ifcfg-eth0 eth0` 网卡配置文件
  - `networking` 主机名配置文件
  - `resolv.conf` 域名配置文件

#### 软件安装与更新

- rpm 安装
  - `-i` 安装
  - `-q` 查询
  - `-U` 升级
  - `-e` 卸载
- 源代码编译安装
  - `./configure`
  - `make`
  - `make install`
- yum
  - 安装 yum install xxx（软件名）
  - 卸载 yum remove xxx
  - 更新 yum update xxx

#### 服务与日志

- 服务状态的查看命令
  - `service` 用法：service 服务名 start|stop|restart|status
  - systemctl是CentOS7的服务管理工具中主要的工具，它融合之前service和chkconfig的功能于一体。 Systemctl接受服务（.service），挂载点（.mount），套接口（.socket）和设备（.device）作为单元。
  - `systemctl` 用法：systemctl start|stop|restart|status 服务名.service
    - 在开机时启用一个服务：systemctl enable firewalld.service
    - 在开机时禁用一个服务：systemctl disable firewalld.service
    - 查看服务是否开机启动：systemctl is-enabled firewalld.service
    - 查看已启动的服务列表：systemctl list-unit-files|grep enabled
    - 查看启动失败的服务列表：systemctl --failed
    - 列出当前系统服务的状态：systemctl list-units
    - 列出所有可用单元：systemctl list-unit-files
    - 查找某个服务：systemctl list-units --type=service | grep network
    - 使用systemctl命令杀死服务： systemctl kill network.service
    - 列出所有系统挂载点： systemctl list-unit-files --type=moun
- 常用系统日志
  - `/var/log` 系统日志默认目录
  - `message` 系统日志
  - `dmesg` 内核启动日志
  - `secure` 安全日志

#### 磁盘分区

- 链接文件
  - 符号文件
  - 硬链接
- mount 挂载命令
  - `-t` 文件系统类型
  - `-o` 挂载选项
    - `ro` 只读挂载
    - `rw` 读写挂载
    - `remount` 重挂载
- 配置文件 /etc/fstab

#### 文件系统

- 常用命令
  - `fdisk` 分区工具
    - `-l` 查看分区信息
    - `fdisk /dev/sdX` 为某个存储分区
  - `df` 查看分区使用空间大小(-h 人类可读单位)
  - `du` 查看文件夹使用空间大小(du -sh)
  - `mkfs` 格式化命令
    - mkfs.ext4 格式化为ext4系统
    - mkfs.xfs 格式化为XFS文件系统

#### 逻辑卷与LVM

- LVM 分为三层
  - PV 物理卷
  - VG 卷组
  - LV 逻辑卷
- 常用命令
  - `pvcreate` 建立 PV, `psv` 查看PV
  - `vgcreate` 建立 VG, `vgs` 查看VG
  - `lvcreate` 建立LV, `lvs` 查看LV
  - `lvextend` 扩展LV

#### 防火墙

##### SELinux

- 访问控制方式分类
  - DAC 自主访问控制
  - MAC 强制访问控制
- 常用命令
  - `getenforce` 查看SELinux状态
  - `setenforce` 修改访问状态
- 配置文件
  - `/etc/selinux/config`
  - `enforcing` 强制控制
  - `permissive` 通知单不强制控制
  - `disable` 禁止访问控制

##### iptables

- 表
  - `filter` 用于过滤
  - `nat` 用于地址转换
- 链
  - `INPUT` 进入本主机方向
  - `OUTPUT` 本主机发出方向
  - `FORWARD` 转发方向
  - `PREROUTING` 路由前转换
  - `POSTROUTING` 路由后转换
- 选项
  - -i -o 接口
  - -s -d IP 地址 / 子网掩码
  - -p tcp/udp 指定协议
    - --sport 源端口
    - --dport 目的端口
  - -j 动作
    - ACCEPT 允许此规则匹配的数据包通过
    - DROP 丢弃此规则匹配的数据包
    - REJECT 拒绝此规则匹配的数据包并返回rst包
    - SNAT 源地址转换
    - DNAT 目的地址转换
    - MASQUERADE 动态源地址转换

##### tcpdump

- 保存和读取规则
  - `-r filename` 从文件读取已抓取的数据包
  - `-w filename` 将抓取的数据包保存至文件
- 常用选项
  - `-v` 显示详细信息
  - `-n` 不将IP地址解析为主机名
  - `-i` 接口
  - `host` 主机
  - `port` 端口

#### 系统启动过程与故障修复

- 系统启动过程简述
  - BIOS 选择启动设备
  - MBR 硬盘引导扇区
  - 内核
  - init 或 systemd (CentOS 7 以前为init)
  - service 服务或systemd服务 (CentOS 7 以前仅有service服务)
  - 启动 tty 等待用户登录
- 更新内核版本
  - RPM 方式更新
    - 安速度快
    - 没有最新的版本
  - 源代码编译方式更新
    - 可以使用最新的版本
    - 编译时间较长
