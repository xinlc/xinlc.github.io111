---
title: CentOS7 使用 rsync + inotify 实现同步备份文件
date: 2019-09-15 14:07:00
categories: Linux
tags:
  - linux
  - centos7
  - rsync
  - inotify
---

继 [在 CentOS7 上实现 MySQL5.7 全量备份+增量备份](https://xinlc.github.io/2019/09/15/back-end/linux/linux-mysql-backup/#more)，备份后需要将文件备份的其他机器，以提高安全性。
这里使用 `Linux` 同步文件工具 `rsync + inotify` 来进行文件的同步。

<!--more-->

## rsync

`rsync` 是类 `unix` 系统下的数据镜像备份工具—— `remote sync`。一款快速增量备份工具 `Remote Sync`，远程同步 支持本地复制，或者与其他`SSH`、`rsync`主机同步。

```bash
# 安装 rsync
yum -y install rsync

# 启动 rsync 服务
systemctl start rsyncd.service

# 设置为开机启动
systemctl enable rsyncd.service

# 检查是否已经成功启动
netstat -lnp | grep 873

```

安装好后启用 `rsync` 服务器端同步远程文件, `rsycn` 的服务端为服务器的文件接收端，`rsycn` 的客户端为服务器的文件推动端。

`rsycn` 的服务端/文件接收端配置, 服务端需要开启 `rsyncd` 服务, 添加配置文件 `rsyncd.conf`：

```bash
vim /etc/rsyncd.conf

# 以下是全局配置

log file = /var/log/rsyncd.log
pid file = /var/run/rsyncd.pid
lock file = /var/lock/rsyncd
# 模块名，在源服务器指定这个名字
[mysqlbak]
   # 描述信息
   comment = sync rsync/home
   # 备份目录
   path = /home/101bak/mysqlbak
   # 不使用chroot，不用root权限
   use chroot=no
   # 设置本地备份目录为读写权限
   read only = no
   uid=root
   gid=root
   # 客户端最大连接数
   max connections=10
   # 指定数据同步用户
   auth users = root
   # 指定数据同步用户信息文件
   secrets file = /etc/rsyncd.pass
   # 允许连接的客户端
   hosts allow=192.168.1.101
   # 忽略出现I/O错误
   ignore errors = yes
   timeout = 600

```

创建认证文件：

```bash
# 格式是用户名：密码
vi /etc/rsyncd.pass
root:123456

# 保存后给文件权限, 否则会报没权限
chmod 600 /etc/rsyncd.pass

```

修改`/etc/xinetd.d/rsync`文件，disable 改为 no：

```bash
vim /etc/xinetd.d/rsync

service rsync
{
  disable = no
  socket_type     = stream
  wait            = no
  user            = root
  server          = /usr/bin/rsync
  server_args     = --daemon
  log_on_failure  += USERID
}

```

启动服务端：

```bash

# 启动服务
rsync --daemon --config=/etc/rsyncd.conf

# 关闭服务用 kill
ps -ef | grep /etc/rsyncd.conf
kill -9 pid

# 如果再次启动服务报pid文件相关错误，删掉报错的pid文件，再重新启动即可

```

`rsycn` 的客户端/文件发送端配置，客户端配置简单 只需要配置密码既可：

```bash
# 只需要填写rsync服务的密码
vi /etc/rsync_client.pwd
123456

# 保存后给文件权限, 否则会报没权限
chmod 600 /etc/rsync_client.pwd
# /home/leo/mysqlbackup/rsync_client.pwd

```

客户端同步测试：

```bash
/usr/bin/rsync -auvrtzopgP --progress --password-file=/home/leo/mysqlbackup/rsync_client.pwd /home/leo/mysqlbackup root@192.168.1.102::mysqlbak
```

log 相关查找：

```bash
# 通过配置文件找到了log存放目录
cat /etc/rsyncd.conf | grep -i log

# log file = /var/log/rsync.log
# 查看/var/log/rsync.log
```

## inotify

`Inotify` 是一种强大的、细粒度的、异步的文件系统事件监控机制，`Linux` 内核从 `2.6.13` 起，加入了 `Inotify` 支持，通过 `Inotify` 可以监控文件系统中添加、删除，修改、移动等各种细微事件，利用这个内核接口，第三方软件就可以监控文件系统下文件的各种变化情况，而 `inotify-tools` 就是这样的一个第三方软件。

`Inotify` 只需要要按照部署在同步的客户端，当监控的文件有变化触动 `rsync` 脚本来同步。

安装：

```bash
yum -y install inotify-tools
```

配置监控的文件路径：

```bash
# 不要把注释写到文件里
vim /etc/inotify_exclude.lst

# 监控目录
/bak/mysqlbak

# 排除监控目录
@/bak/log

```

rsync 排除监控文件目录：

```bash
vim /etc/rsyncd.d/rsync_exclude.lst

src/*.html*
src/js/
src/2019/20190[1-9]/

```

客户端同步到远程的脚本 rsync.sh：

```bash
#!/bin/bash

# rsync auto sync script with inotify
# variables
current_date=$(date +%Y%m%d_%H%M%S)
source_path=/home/leo/mysqlbackup/
log_file=/var/log/rsync_client.log

# rsync
rsync_server=192.168.1.101
rsync_user=root
rsync_pwd=/home/leo/mysqlbackup/rsync_client.pwd
rsync_module=mysqlbak
INOTIFY_EXCLUDE='(.*/*\.log|.*/*\.swp)$|^/tmp/src/mail/(2019|20.*/.*che.*)'
RSYNC_EXCLUDE='/bak/rsync_exclude.lst'

# rsync client pwd check
if [ ! -e ${rsync_pwd} ];then
    echo -e "rsync client passwod file ${rsync_pwd} does not exist!"
    exit 0
fi

# inotify_function
inotify_fun(){
    /usr/bin/inotifywait -mrq --timefmt '%Y/%m/%d-%H:%M:%S' --format '%T %w %f' \
          --exclude ${INOTIFY_EXCLUDE}  -e modify,delete,create,move,attrib ${source_path} \
          | while read file
      do
          /usr/bin/rsync -auvrtzopgP --exclude-from=${RSYNC_EXCLUDE} --progress --bwlimit=800 --password-file=${rsync_pwd} ${source_path} ${rsync_user}@${rsync_server}::${rsync_module}
      done
}

# inotify log
inotify_fun >> ${log_file} 2>&1 &

# nohup inotify_fun >> ${log_file} 2>&1 &

```

给脚本执行权限：

```bash
chmod 777 rsync.sh

./rsync.sh

```

监听 inotify 进程脚本，防止 inotify 由于某种原因中断无法实时同步

```bash
#!/bin/bash

# 如果有 inotify 进程在运行，那么 echo $? 返回值是 0，条件为真。否则返回值为非 0
ps -lef | pgrep inotify &>/dev/null
if [ $? -eq 0 ]; then
  echo "inotify is runing ..."
else
  ./rsync.sh
  # nohup /usr/bin/bash /home/leo/scripts/rsync.sh &
  echo "inotify aready runing ..."
fi
```

添加定时任务计划, 每分钟检测一次

```bash
# crontab -e
* * * * * /usr/bin/bash /home/leo/scripts/checkInotify.sh &>/dev/null
```

## 开机自启动

不建议这样做，应使用编写 `systemd`

```bash
# 在 CentOS7 中，/etc/rc.d/rc.local 的权限被降低了，所以需要执行如下命令赋予其可执行权限
chmod u+x  /etc/rc.d/rc.local

# 打开 /etc/rc.d/rc.local 文件
vim /etc/rc.d/rc.local

# 在末尾添加
rsync --daemon --config=/etc/rsyncd.conf
```

## 遇到的问题

### mysql-bin.0000xx 因权限问题同步失败

由于我是用 `docker` 启动的 `mysql`，`docker` 必须是 `root` 权限，而我用的是普通用用户所有没有权限访问 `mysql binlog`

解决：

```bash
# 将当前用户加入到 docker 用户组
sudo usermod -aG docker $USER

# 重启系统后发现 docker 的 mysql 目录权限改为了 polkitd 用户 ssh_keys 用户组
# 将当前用户加入到 ssh_keys 用户组
sudo usermod -aG ssh_keys $USER
```
