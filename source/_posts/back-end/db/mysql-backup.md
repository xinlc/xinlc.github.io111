---
title: 在 CentOS7 上实现 MySQL5.7 全量备份+增量备份
date: 2019-09-15 11:30:00
categories: Database
tags:
  - MySQL
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

## Binlog 简介

**binlog是什么？**

binlog 是二进制文件，是一组日志文件，包含有关对服务器实例进行数据修改的信息(比如表的创建操作或者表数据更改)，语句以描述修改的事件的形式存储，二进制日志还包含有关每条语句使用更新数据的时间的信息。

简单的说，就是记录mysql表中数据的增删改操作，不记录查询(select)和show语句。如果要记录所有语句（比如排查问题时），需要开启常规查询日志(general_log)，默认是关闭的。

启用binlog会使服务器性能下降，但是相对于它能还原，复制操作的用处，这点性能影响不足挂齿。

binlog中还包含一些其他元数据，例如：

- 有关正确再现语句所需的服务器状态的信息
- 错误代码
- 维护binlog本身所需的元数据（例如，rotate events）

**binlog有什么用？**

- 复制(主副同步)，binlog日志在主服务器上发送语句的记录到从属服务器上，这些从属服务器执行这些语句，以保证数据库能和主服务器数据库进行相同的更改，
- 数据恢复，还原备份文件后，将重新执行备份后记录的二进制日志中的事件，这些事件使数据库从备份点更新。

**binlog如何记录数据的更改的？**

binlog按事件的线性序列记录，修改数据库的sql将生成一个或多个事件并将其追加到binlog日志中，还有一些辅助事件类型描述了binlog的结构。

可以通过两种方式来记录查询(增删改等语句)：

- statement format格式(语句格式)：查询以文本的形式写入binlog
- row format(行格式)：更改的行以二进制的形式写入binlog，每行可包括Before Image(前镜像) (BI) 且/或 After Image(后镜像) (AI)，BI标识要修改的行，AI描述更改后的行。

日志的事件有三种类型：

- Write_rows_log_event：向表中添加新行，只有AI
- Update_rows_log_event：修改表中的现有行，BI和AI都有
- Delete_rows_log_event：从表中删除现有行，只有BI

**binlog记录格式有哪些，如何设置？**

- STATEMENT：基于语句的日志记录(包含产生数据更改的SQL语句插入，更新，删除)又称为SBL优点：不需要记录每一行的变化，减少日志量，提高了性能。比如对于按照条件删除，修改表数据时，如果是ROW格式就会将每行的变化都记录下来，而STATEMENT不会产生这么多日志。缺点：不保证正确记录，记录每一行的时候还需要记录一些上下文信息，对一些函数可能不支持，造成主副同步时，数据不一致。
- ROW：基于行的日志记录(描述对各行的更改)又称为RBL优点：保证正确记录，只记录每一行改成什么，不需要记录上下文信息，不会因为其它原因造成数据的正确复制问题。缺点：每一行的变化都需要记录，会产生大量的日志。
- MIXED：混合日志记录(默认使用基于语句的日志记录，但会根据需要自动切换到基于行的日志记录) 保证正确记录，会根据具体sql来区分使用哪种格式。

> 建议：如果对于数据正确性要求高，无法确定格式会造成数据的异常问题时，建议使用ROW。

查询binlog记录格式语法，默认记录格式为STATEMENT

```sql
show variables like '%binlog_format%'
```

设置全局binlog记录格式

```sql
SET GLOBAL binlog_format = 'STATEMENT'; 
SET GLOBAL binlog_format = 'ROW'; 
SET GLOBAL binlog_format = 'MIXED';
```

设置当前会话的binlog记录格式

```sql
SET SESSION binlog_format = 'STATEMENT';
SET SESSION binlog_format = 'ROW';
SET SESSION binlog_format = 'MIXED';
```

查看binlog是否启用

```sql
show variables like'%log_bin%'
```

查看当前binlog的状态

```sql
show master status;
```

**删除或清空binlog日志**

正常情况下我们是不需要删除的，因为在配置文件中配置了，expire-logs-days = 3，3天清理一次。

```bash
# 删除mysql-bin.000003之前的所有binlog日志,不包括mysql-bin.000003
PURGE BINARY LOGS TO 'mysql-bin.000003';
# 删除2019-01-30 10:53:26 这个日期之前的所有binlog日志
PURGE BINARY LOGS BEFORE '2019-01-30 10:53:26';

# 删除全部binlog日志，谨慎使用此语句
RESET MASTER
```

如果是主从模式，想要安全的删除binlog，需要按照步骤删除：

1. 在每个从属服务器上，用SHOW SLAVE STATUS语句检查它正在读取哪个日志文件
2. 使用SHOW BINARY LOGS语句来获取主服务器上二进制日志文件的列表
3. 确定所有从站中最早的日志文件，这是目标文件。如果所有从属服务器都是最新的，则这是列表中的最后一个日志文件
4. 对要删除的所有日志文件进行备份
5. 清除所有日志文件，但不包括目标文件


## 增量备份 binlog

增量备份主要用到的是`binlog`，需要开启 mysql binlog：

```bash
# 开启 binlog
vim /var/lib/mysql/mysql.conf.d/mysqld.cnf

# [mysqld] 下添加：
[mysqld]
# 开启 binlog
log-bin=mysql-bin
# 选择 ROW 模式
binlog-format=ROW
# binlog 名称
log_bin_index=mysql-bin.index
# 哪些表库记录binlog
binlog_do_db=test
# 不记录mysql库binlog
binlog_ignore_db=mysql
# log 3天自动删除
expire_logs_days=3
# 设置每个文件的大小
max_binlog_size=200m
# 设置缓存大小
binlog_cache_size=10m
# 设置最大缓存大小
max_binlog_cache_size=500m
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
