
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

- 正则表达式是什么？
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

##### firewalld

- 基本使用
  - 启动： systemctl start firewalld
  - 查看状态： systemctl status firewalld
  - 停止： systemctl disable firewalld
  - 禁用： systemctl stop firewalld
- firewalld-cmd
  - 查看版本： firewall-cmd --version
  - 查看帮助： firewall-cmd --help
  - 显示状态： firewall-cmd --state
  - 查看所有打开的端口： firewall-cmd --zone=public --list-ports
  - 更新防火墙规则： firewall-cmd --reload
  - 查看区域信息:  firewall-cmd --get-active-zones
  - 查看指定接口所属区域： firewall-cmd --get-zone-of-interface=eth0
  - 拒绝所有包：firewall-cmd --panic-on
  - 取消拒绝状态： firewall-cmd --panic-off
  - 查看是否拒绝： firewall-cmd --query-panic
- 开启一个端口
  - 添加： firewall-cmd --zone=public --add-port=80/tcp --permanent    （--permanent永久生效，没有此参数重启后失效）
  - 重新载入： firewall-cmd --reload
  - 查看： firewall-cmd --zone= public --query-port=80/tcp
  - 删除： firewall-cmd --zone= public --remove-port=80/tcp --permanent

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

### Shell 篇

#### 认识 BASH

- Shell 是命令解释器，翻译用户的命令给内核执行，并将结果返回给用户
- Shell 脚本的用处
  - 组合系统命令实现自动化功能
  - 组成脚本的基本元素是命令，不用深入掌握系统函数库
- 内建命令与外部命令
  - 内建命令不会创建子进程，但是对子Shell无效
  - 外部命令会创建子进程

#### 管道与重定向

- 管道符 `|`
- 重定向符号
  - `<` 输入重定向
  - `>` 输出重定向，覆盖方式
  - `>>` 输出重定向，追加方式
- `sort` 对文本进行排序
- `join` 链接两个字符串

#### 进程与内存的查看与调整

- 进程查看命令
  - `ps` / `top` 对当前系统的进程信息进行查看(常用：ps -ef | grep mysqld)
- 内存查看命令
  - `free` 查看系统的内存使用率(free -h)
  - `sar` 显示更详细的系统运行状态，用于故障排除
- 常用的第三方系统状态查看命令
  - `iftop` 查看某一进程的网络流量

#### 变量与环境变量

- 变量的定义
  - Shell 变量无需声明
  - 销毁变量 `unset 变量名`
- 变量的赋值 `变量名 = 变量值`
- 环境变量 `PATH` 命令解释路径
- 环境变量的配置文件
  - `/etc/profile` 系统环境变量默认保存文件
  - `/etc/bashrc` login shell 执行初始化的配置文件

#### 转义与引用

- 特殊符号
- 转义符 `/`
- 引用符号
  - `''` 单引号
  - `""` 双引号

#### 循环

- while 循环
  - while 循环根据while判断结果确定是否继续执行
  - 判断的结果为命令的返回值，如果为0则循环会继续执行
  - 如果判断结果一直为真"0"， 无法到达循环结束称作死循环
- for 循环
  - Shell 的for循环使用遍历方式，`for...in..`格式
  - for 循环支持C语音写法，需要使用`(())`格式
  - 支持使用`break`, `continue` 对循环进行控制
  - for 循环支持嵌套使用

#### 函数

- 函数的定义
  - 函数是对重复利用的代码进行封装
  - 函数的定义方法是 `函数名(){}`
- 函数的使用
  - 使用函数的方式是直接使用`函数名`

#### 计划任务

- 一次性计划任务 `at`
- 周期性计划任务 `cron`
  - `crontab -l` 查看周期性计划任务
  - `crontab -e` 编辑周期性计划任务

#### 运算符

- 运算符号
  - `+ - * / %` 加 减 乘 除 取余
- Shell 运算符的弊端
  - 支持整数运算，但和编译语音比起来效率很低
  - 对浮点运算支持不好

#### 测试与判断

- `test` 测试
  - 可以书写为`[]`
  - 可以使用`[[]]` 扩展格式
  - 文件测试
  - 数字比较
- if 判断
  - 基本原理：根据命令的返回值是否为`0`进行分支判断
  - 支持 `if...else`写法
  - 支持 `if`嵌套写法
- case 分支
  - `case` 分支一般作为if判断的补充
  - `case` 分支的结束符号是`;;`, 它是`;`的转义形式

### 文本操作篇

#### 正则表达式与文本搜索

元字符

- `.` 单个字符
- `*` 一个（包括零个）它前面的字符
- `[...]` 匹配方括号中的任意字符
- `^` 匹配行开始
- `$` 匹配行结尾
- `\` 转义特殊字符
- `{...}` 匹配出现的次数
- `+` 匹配前面的正则表达式出现一次或多次
- `?` 匹配前面的正则表达式出现零次或一次
- `|` 并列匹配
- `()` 分组
- `POSIX` 字符类

#### sed 基础

- 基本语法
  - sed ‘cmd’ filename
  - sed -e 'cmd' filename
- sed 的工作方式
  - 模式空间
- sed 基础命令
  - `s` 替换
  - `d` 删除
  - `a` 追加
  - `i` 插入
  - `c` 更改
  - `n` 下一步
  - `r` 读文件
  - `w` 写文件
  - `q` 退出
  - `y` 替换
  - `p` 打印

#### sed 高级命令

- 多行命令
  - `N` 将多行追加到模式空间进行处理
  - `D` 删除多行模式空间的第一个字符至第一个换行符，并返回到脚本的开头执行
  - `P` 输出模式空间中的第一个字符至第一个换行符
- 保持空间模式
  - `h` 将模式空间中的内容存储至保持空间，并覆盖保持空间的内容
  - `H` 将模式空间中的内容存储至保持空间，并追加到保持空间的内容
  - `g` 将保持空间的内容存储至模式空间，并追加到模式空间
  - `G` 将保持空间的内容存储至模式空间，并追加到模式空间
  - `x` 交换模式空间和保持空间的内容
- 条件与分支
  - `:` 标签
  - `b branch` 命令用于在脚本中将控制权转移到另一行，如果没有指定标签就转移到脚本的结尾
  - `t` 测试命令，如果当前匹配地址的进行了成功替换，test 命令就跳转到标签处，如果没有指定标签就转移到脚本的结尾

#### AWK

- WDK 的工作方式
  - `BEGIN{}` 模式用于处理文件前的预处理
  - `{}` 模式用于对文件每行进行处理
  - `END{}` 模式用于处理完文件之后的操作
- 运算符
  - 算数运算符
  - 关系运算符
  - 布尔运算符
- 循环
  - 支持 while 循环
  - 支持 for 循环
  - 支持 break、continue
- 系统变量
  - `FS` 字段分隔符
  - `OFS` 输出字段分隔符
  - `RS` 记录分隔符
  - `ORS` 输出记录分隔符
- 条件
  - 和 C 语音用法相似
  - 语法格式为：`if(判断)`
  - 支持 `if...else...` 用法
  - 支持 if 嵌套
- 函数
  - 算数函数
  - 随机函数
  - 字符串函数

## 性能优化

### 常见性能指标及 USE 法分类

#### CPU 性能指标

- CPU 使用率
  - 用户 CPU
  - 系统 CPU
  - IOWAIT
  - 软中断
  - 硬中断
  - 窃取 CPU
  - 客户 CPU
- 上下文切换
  - 自愿上下文切换
  - 非自愿上下文切换
- 平均负载
- CPU 缓存命中率

#### 内存性能指标

- 系统内存指标
  - 已用内存
  - 剩余内存
  - 可用内存
  - 缺页异常
  - 缓存/缓冲区
  - Slabs
- 进程内存指标
  - 虚拟内存(VSS)
  - 常驻内存(RSS)
  - 按比例分配共享内存后的物理内容(PSS)
  - 独占内存(USS)
  - 共享内存
  - SWAP 内存
  - 缺页异常
- SWAP
  - 已用空间
  - 剩余空间
  - 换入速度
  - 换出速度

#### I/O 性能指标

- 文件系统
  - 存储空间容量、使用量以及剩余空间
  - 索引节点容量、使用量以及剩余量
  - 缓存
    - 页缓存
    - 目录项缓存
    - 索引节点缓存
    - 具体文件系统缓存（如 ext4 的缓存）
  - IOPS(文件I/O)
  - 响应时间（延迟）
  - 吞吐量（B/s)
- 磁盘
  - 使用率
  - IOPS
  - 吞吐量(B/s)
  - 响应时间（延迟）
  - 缓冲区
  - 相关因素
    - 读写类型（如循序还是随机）
    - 读写比例
    - 读写大小
    - 存储类型（如 `RAID` 级别、本地还是网络）

#### 网络性能指标

- 应用层
  - QPS(每秒请求数)
  - 套接字缓冲区大小
  - DNS 解析延迟
  - 响应时间
  - 错误数
- 传输层
  - TCP 链接数
    - 全连接
    - 半链接
    - TIMEWAIT
  - 链接跟踪数
  - 重传数
  - 丢包数
  - 延迟
- 网络层
  - 丢包数
  - TTL
  - 拆包
- 链路层
  - PPS(每秒网络帧数)
  - BPS(每秒字节数)
  - 丢包数
  - 错误数

#### 常见指标分类（USE 法）

USE 法（Utilization Saturation and Errors），专门用于系统资源性能监控的分类方法。

|资源 | 类型| 性能指标|
|:-------- |:----------|:---------|
| CPU | 使用率 | CPU使用率 |
| CPU | 饱和度 | 运行队列长度或平均负载 |
| CPU | 错误数 | 硬件CPU错误数 |
| 内存 | 使用率 | 已用内存百分比或SWAP用量百分比 |
| 内存 | 饱和度 | 内存换页量 |
| 内存 | 错误数 | 内存分配失败或00M |
| 存储设备 I/O | 使用率 | 设备I/O时间百分比 |
| 存储设备 I/O | 饱和度 | 等待队列长度或延迟 |
| 存储设备 I/O | 错误数 | I/O 错误数 |
| 文件系统 | 使用率 | 已用容量百分比 |
| 文件系统 | 饱和度 | 已用容量百分比 |
| 文件系统 | 错误数 | 文件读写错误数 |
| 网络 | 使用率 | 带宽使用率 |
| 网络 | 饱和度 | 重传报文数 |
| 网络 | 错误数 | 网卡收发错误数，丢包数 |
| 文件描述符 | 使用率 | 已用文件描述符数百分比 |
| 连接跟踪 | 使用率 | 已用链接跟踪数百分比 |
| 连接数 | 饱和度 | TIMEWAIT 状态连接数 |

### 常见性能工具

#### CPU 性能工具

|性能指标 | 性能工具| 说明|
|:-------- |:----------|:---------|
| 平均负载 | `uptime`、`top`、`/proc/loadavg` | uptime最简单；top提供了更全的指标; /proc/loadavg 常用于监控系统 |
| 系统 CPU 使用率 | `vmstat`、`mpstat`、`top`、`sar`、`/proc/stat` | top、vmstat、mpstat 只可以动态查看，而sar还可以记录历史数据；/proc/stat是其他性能工具的数据来源，也常用于监控|
| 进程 CPU 使用率| `top`、`ps`、`pidstat`、`htop`、`atop`| top和ps可以按CPU使用率给进程排序，而pidstat只显示实际用了CPU的进程；htop和atop以不同颜色显示更加直观|
| 系统上下切换 | `vmstat` | 除了上下切换次数，还提供运行状态和不可中断状态进程的数量 |
| 进程上下切换 | `pidstat` | 加上 -w 选项|
| 软中断 | `top`、`mpstat`、`/proc/softirqs` | top 提供软中断CPU使用率，而`/proc/softirqs` 和 mpstat 提供各种软中断在每个CPU上的运行次数|
|硬中断| `vmstat`、`/proc/interrupts`| vmstat提供总的中断次数，而`/proc/interrupts`提供各种中断在每个CPU上运行的累计次数
|网络|`dstat`、`sar`、`tcpdump`|dstat、sar提供总的网络接收和发生情况，而tcpdump则是动态抓取正在进行的网络通讯|
|I/O| `dstat`、`sar` | dstat和sar都提供I/O的整体情况|
|CPU缓存| `perf` | 使用perf stat 子命令|
|CPU数|`lscpu`、`/proc/cpuinfo`| lscpu 更直观|
|事件剖析|`perf`、`火焰图`、`execsnoop`| perf和火焰图用来分析热点函数以及调用栈，execsnoop用来监测短时进程|
|动态追踪| `ftrace`、`bcc`、`systemtap` | ftrace 用于跟踪内核函数调用栈，而bcc和systemtap则用于跟踪内核或应用程序的执行过程（bcc要求内核版本`>=4.1`)|

#### 内存性能工具

|性能指标 | 性能工具| 说明|
|:-------- |:----------|:---------|
|系统已用、可用、剩余内存|`free`、`vmstat`、`sar`、`/proc/meminfo`|free最为简单，而vmstat、sar更为全面；/proc/meminfo是其他工具的数据来源，也常用于监控系统中|
|进程虚拟、常驻、共享内存|`ps`、`top`、`pidstat`、`/proc/pid/stat`、`/proc/pid/status`|ps和top最为简单，而pidstat则要加上-r选项；/proc/pid/stat和/proc/pid/status是其他工具的数据来源|
|进程内存分布|`pmap`、`/proc/pid/maps`|/proc/pid/maps是pmap的数据来源|
|进程Swap换出内存|`top`、`/proc/pid/status`|/proc/pid/status是top的数据来源|
|进程缺页异常|`ps`、`top`、`pidstat`|给pidstat加上-r选项|
|系统换页情况|`sar`|加上-B选项|
|缓存/缓冲区用量|`free`、`vmstat`、`sar`、`cachestat`|vmstat最常用，而cachestat需要安装bcc|
|缓存/缓冲区命中率|`cachetop`|需要安装bcc|
|SWAP已用空间和剩余空间|`free`、`sar`|free最为简单，而sar还可以记录历史|
|Swap换入换出|`vmstat`、`sar`|vmstat最为简单，而sar还可以记录历史|
|内存泄漏检测|`memleak`、`valgrind`|memleak 需要安装bcc, valgrind可以在旧版本（如3.x）内核中使用|
|指定文件的缓存|`pcstat`|需要从源码下载安装|

#### 文件系统和磁盘I/O性能工具

|性能指标 | 性能工具| 说明|
|:-------- |:----------|:---------|
|文件系统空间容量、使用量以及剩余空间|df|详细文档可以执行info coreutils 'df invocation'命令查询|
|索引节点容量、使用以及剩余量|df|注意加上-i选项|
|缓存页和可回收Slab缓存|`/proc/meminfo`、`sar`、`vmstat`|注意sar需要加上-r选项，而/proc/meminfo是其他工具的数据来源|
|缓冲区|/proc/meminfo、sar、vmstat|注意sar需要加上-r选项，而/proc/meminfo是其他工具的数据来源|
|目录项、索引节点以及文件系统的缓存|`/proc/slabinfo`、slabtop|slabtop更直观|
|磁盘I/O使用率、IOPS、吞吐量、响应时间、I/O平均大小以及等待队列长度|iostat、sar、dstat、`/proc/diskstats`|iostat最为常用、注意使用iostat -d -x或sar -d 选项；`/proc/diskstats`则是其他工具的数据来源|
|进程I/O大小以及I/O延迟|pidstat、iotop|注意使用pidstat -d选项|
|块设备I/O事件跟踪|`blktrace`|需要跟blkparse配合使用，比如blktrace -d /dev/sda -o | blkparse -i|
|进程I/O系统调用跟踪|`strace`、`perf` `trace`|strace只可以跟踪单个进程，而perf trace还可以跟踪所有进程的系统调用|
|进程块设备I/O大小跟踪|`biosnoop`、`biotop`|需要安装bcc|
|动态追踪|`ftrace`、`bcc`、`systemtap`|ftrace用于跟踪内核函数调用栈，而bcc和systemap则用于跟踪内核或应用程序的执行过程|

#### 网络性能工具

|性能指标 | 性能工具| 说明|
|:-------- |:----------|:---------|
|吞吐量(BPS) | `ifconfig`、`ip`、`sar`、`nethogs`、`iftop`、`/proc/net/dev`|分别可以查看网络接口、进程以及IP地址的网络吞吐量;`/proc/net/dev`常用于监控|
|吞吐量(PPS)|`sar`、`/proc/net/dev`|注意使用|sar -n DEV选项|
|网络连接数|`netstat`、`ss`|ss速度更快|
|网络错误数|`netstat`、`ss`|注意使用netstat -s 或者sar -n EDEV/EIP选项|
|网络延迟|`ping`、`hping3`|ping基于ICMP而hping3则基于TCP协议|
|连接跟踪数|`connetrack`、`/proc/sys/net/netfilter/nf_conntrack_count`、`/proc/sys/net/netfilter/nf_conntrack_mac`|conntr可以用来查看所有连接跟踪的信息，nf_conntrack_count只是连接跟踪的数量，而nf_conntrack_max则限制了总的连接跟总数|
|路由|`mtr`、`traceroute`、`route`|route用于查询路由表，而mtr和traceroute则用来排查和定位网络链路中的路由问题|
|DNS|`dig`、`nslookup`|用于排查DNS解析问题|
|防火墙和NAT|`iptables`|用于排查防火墙及NAT的问题|
|网卡选项|`ethtool`|用于查看和配置网络接口的功能选项|
|网络抓包|`tcpdump`、`Wireshark`|通常在服务器中使用tcpdump抓包再复制出来用Wireshark的图形界面分析|
|动态追踪|`ftrace`、`bcc`、`systemtap`|ftrace用于跟踪内核函数调用栈，而bcc和systemap则用于跟踪内核或应用程序的执行过程|

## 参考

- 《极客时间 Linux 操作系统知识地图》
- [Linux命令大全](https://man.linuxde.net/)
- [Linux命令大全(手册)](https://www.linuxcool.com/)
