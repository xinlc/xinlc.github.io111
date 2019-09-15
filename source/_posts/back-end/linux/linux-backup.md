---
title: Linux 系统备份与还原
date: 2019-09-15 10:37:00
categories: Linux
tags: 
  - linux
  - centos7
---

<!--more-->

## 使用 TAR 压缩工具备份系统

和 `Windows` 不同，`Linux` 不会限制 `root` 访问任何东西，可以把分区上的所有东西都扔到一个`TAR`文件里去。

```bash

# 备份系统的完整命令：
tar cvpzf backup.tgz --exclude=/proc--exclude=/lost+found --exclude=/mnt --exclude=/sys --exclude=backup.tgz /

# 还可以用Bzip2来压缩文件，Bzip2比gzip的压缩率高，但是速度慢一些。（用“j”代替命令中的“z”，并且给档案文件一个正确的扩展名“bz2）
tar cvpjf backup.tar.bz2 –exclude=/proc–exclude=/lost+found –exclude=/backup.tar.bz2 –exclude=/mnt –exclude=/sys /

```

> `cvpfz`是 `tar` 的选项，意思是 `创建档案文件`、`保持权限`(保留所有东西原来的权限)、使用`gzip`来减小文件尺寸
`/`是我们要备份的目录，在这里是整个文件系统。
在 档案文件名`backup.gz`和要备份的目录名`/`之间给出了备份时必须排除在外的目录。有些目录是无用的，例如`/proc`、`/lost+ found`、`/sys`。当然，`backup.gz`这个档案文件本身必须排除在外，否则你可能会得到一些超出常理的结果。如果不把`/mnt`排 除在外，那么挂载在`/mnt`上的其它分区也会被备份。另外需要确认一下`/media`上没有挂载任何东西(例如光盘、移动硬盘)，如果有挂载东西， 必须把`/media`也排除在外。

## 恢复系统

在 `Linux` 中有一件很美妙的事情，就是你可以在一个运行的系统中恢复系统，而不需要用`boot-cd`来专门引导。当然，如果你的系统已经挂掉不能启动了， 你可以用`Live CD`来启动，效果是一样的。

```bash
# 恢复系统命令：
tar xvpfz backup.tgz -C /

# 或 如果你的档案文件是使用Bzip2压缩的
tar xvpfj backup.tar.bz2 -C /

# 注意：上面的命令会用档案文件中的文件覆盖分区上的所有文件。 执行恢复命令可能需要一段不短的时间。 
# 恢复命令结束时，别忘了重新创建那些在备份时被排除在外的目录：
mkdir proc
mkdir lost+found
mkdir mnt
mkdir sys

```

> 当你重启电脑，你会发现一切东西恢复到你创建备份时的样子了！

> 原文：https://cloud.tencent.com/developer/article/1173103
