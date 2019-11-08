---
title: 在 CentOS7 上实现 MySQL5.7 全量备份+增量备份
date: 2019-09-15 11:30:00
categories: Linux
tags:
  - linux
  - centos7
  - mysql
---

数据备份！数据备份！数据备份！

<!--more-->

## 全量备份使用 mysqldump 工具

直接上脚本：

```bash
#!/bin/bash
# 在使用之前，请提前创建以下各个目录
db_user="root"
db_passwd="123456"
db_host="192.168.1.101"
db_prod="3306"
db_name="test"
backup_dir="/home/leo/backup/bakmysql"
backup_old_dir="/home/leo/backup/bakmysqlold"

echo $backup_old_dir

# 进入备份目录将之前的移动到 old 目录
cd "$backup_dir"
echo "you are in bakmysql directory now"
mv $db_name* "$backup_old_dir"
echo "Old databases are moved to bakmysqlold folder"

#时间格式
time=$(date +"%Y-%m-%d")

# mysql 备份的命令，注意有空格和没有空格
mysqldump -h$db_host -P$db_prod -u$db_user -p$db_passwd --single-transaction --flush-logs $db_name | gzip >"$backup_dir/$db_name"-"$time.sql.gz"
echo "your database backup successfully completed"

# 这里将 7 天之前的备份文件删掉
SevenDays=$(date -d -7day +"%Y-%m-%d")
if [ -f "$backup_old_dir/$db_name-$SevenDays.sql.gz" ]; then
  rm -rf "$backup_old_dir/$db_name-$SevenDays.sql.gz"
  echo "you have delete 7days ago bak sql file "
else
  echo "7days ago bak sql file not exist "
  echo "bash complete"
fi

```

通过下面命令将脚本加入系统的计划任务：

```bash
# 分钟 小时 天  月 星期几
# 每天01点10分执行备份
crontab -e
10 01 * * * /usr/bin/bash /home/leo/backup/bakmysql.sh

# 保存后 crontab 会自动加载配置
```

## 增量备份 binlog

增量备份主要用到的是`binlog`, 需要开启 mysql binlog：

```bash
# 开启 binlog
vim /var/lib/mysql/mysql.conf.d/mysqld.cnf

# [mysqld] 下添加：
[mysqld]
log_bin=mysql-bin
log_bin_index=mysql-bin.index
binlog_do_db=test
binlog_ignore_db=mysql
# log 3天自动删除
expire_logs_days=3
```

备份脚本：

```bash
#!/bin/bash
# 在使用之前，请提前创建以下各个目录
backupDir="/home/leo/backup/bakmysql"

# 增量备份时复制mysql-bin.00000*的目标目录，提前手动创建这个目录
mysqlDir="/var/lib/mysql"

# mysql的数据目录
logFile="/home/leo/backup/bakmysql/bak.log"

# mysql的index文件路径，放在数据目录下的
binFile="/var/lib/mysql/mysql-bin.index"


# 这个是用于产生新的 mysql-bin.00000* 文件
mysqladmin -uroot -p123456 flush-logs

# wc -l 统计行数
# awk 简单来说 awk 就是把文件逐行的读入，以空格为默认分隔符将每行切片，切开的部分再进行各种分析处理。
counter=$(wc -l $binFile | awk '{print $1}')
nextNum=0

# 这个 for 循环用于比对 $counter , $nextNum 这两个值来确定文件是不是存在或最新的
for file in $(cat $binFile); do
    base=$(basename $file)
    echo $base
    #basename用于截取mysql-bin.00000*文件名，去掉./mysql-bin.000005前面的./
    nextNum=$(expr $nextNum + 1)
    if [ $nextNum -eq $counter ]; then
        echo $base skip! >>$logFile
    else
        dest=$backupDir/$base
        if (test -e $dest); then #test -e用于检测目标文件是否存在，存在就写exist!到$logFile去
            echo $base exist! >>$logFile
        else
            cp $mysqlDir/$base $backupDir
            echo $base copying >>$logFile
        fi
    fi
done
echo $(date +"%Y年%m月%d日 %H:%M:%S") $Next Bakup succ! >>$logFile
```

通过下面命令将脚本加入系统的计划任务：

```bash
# 分钟 小时 天  月 星期几
# 每两个小时执行备份
crontab -e
0 */2 * * * /home/leo/backup/mysqlIncreBackup.sh

# 保存后 crontab 会自动加载配置
```

## 数据恢复

```bash
# 恢复整个db
gzip < db1.sql.gz | mysql -uroot -p123456
```

`binlog` 数据恢复需要用到 `mysqlbinlog` 工具，由于 binlog 记录的是 sql 的所有操作，请按 `mysql-bin.index` 顺序恢复

```bash
# 恢复增量备份
mysqlbinlog mysql-bin.0000xx | mysql -u用户名 -p密码 数据库名
```

## 清理备份脚本

```bash
#!/bin/bash
##
## 删除备份文件
##
## Started on 2019/11/8 Leo <xinlichao2016@gmail.com>
## Last update 2019/11/8 Leo <xinlichao2016@gmail.com>
##

BAKINCRE_PATH=/home/leo/mysqlbackup/bakincre

# 删除7天前文件
find ${BAKINCRE_PATH} -mtime +7 -type f -name "*.*" | xargs rm -f

# 通过下面命令将脚步加入系统的计划任务
# crontab -e
# 分钟 小时 天  月 星期几
# 每天01点30分执行
# crontab -e
# 30 01 * * * /usr/bin/bash /home/leo/scripts/clearBakMysql.sh >> /dev/null 2>&1
```
