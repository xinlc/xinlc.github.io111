---
title: mysqldump 常用命令
date: 2019-09-15 11:00:00
categories: Database
tags:
  - MySQL
---

数据备份！数据备份！数据备份！

<!--more-->

## mysqldump 常用命令

```bash
# 备份命令
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 数据库名 > 文件名.sql
mysqldump -h192.168.1.101 -P3306 -uroot -p123456 db > /data/backup/test.sql

# 压缩备份
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 数据库名 | gzip > 文件名.sql.gz
mysqldump -h192.168.1.101 -P3306 -uroot -p123456 db | gzip > /data/backup/db.sql.gz

# 备份同个库多个表
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 数据库名 表1 表2 .... > 文件名.sql
mysqldump -h192.168.1.101 -P3306 -uroot -p123456 db t1 t2 > /data/backup/db_t1_t2.sql

# 同时备份多个库
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 --databases 数据库名1 数据库名2 数据库名3 > 文件名.sql
mysqldump -h192.168.1.100 -uroot -p123456 --databases db1 db2 > /data/backup/db1_db2_db.sql

# 备份实例上所有的数据库
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 --all-databases > 文件名.sql
mysqldump -h192.168.1.101 -P3306 -uroot -p123456 --all-databases > /data/backup/all_db.sql

# 备份数据带删除数据库或者表的sql备份
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 --add-drop-table --add-drop-database 数据库名 > 文件名.sql
mysqldump -uroot -p123456 --add-drop-table --add-drop-database db > /data/backup/db.sql

# 备份数据库结构，不备份数据
# 格式：mysqldump -h主机名 -P端口 -u用户名 -p密码 --no-data 数据库名1 数据库名2 > 文件名.sql
mysqldump --no-data –databases db1 db2 > /data/backup/structure.sql

# 恢复备份
# 格式：mysql -h链接ip -P(大写)端口 -u用户名 -p密码 数据库名 < 文件名.sql
mysql -uroot -p123456 db1 < db1.sql

# 或进入mysql命令行，使用 source 命令
mysql>
user db1;
source db1.sql;

# 从压缩文件导入
gzip < db1.sql.gz | mysql -uroot -p123456


# 备份开启新logs
# 参数 —flush-logs：使用一个新的日志文件来记录接下来的日志；
# 参数 —lock-all-tables：锁定所有数据库;
# 对于InnoDB将--lock-all-tables替换为--single-transaction
/usr/bin/mysqldump -uroot -p123456  --lock-all-tables --flush-logs db > /data/backup/db.sql

```
