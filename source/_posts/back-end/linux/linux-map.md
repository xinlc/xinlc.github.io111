
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

