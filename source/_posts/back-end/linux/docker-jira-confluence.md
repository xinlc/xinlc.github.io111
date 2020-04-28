---
title: 使用 Docker 安装 Jira Software 和 Confluence
date: 2019-09-26 04:31:00
categories: Linux
tags:
  - docker
  - jira
  - confluence
---

`Jira` 是一个缺陷跟踪管理系统，为针对缺陷管理、任务追踪和项目管理的商业性应用软件，开发者是澳大利亚的 `Atlassian`。`Jira` 这个名字并不是一个缩写，而是截取自 `Gojira` ，日文的哥斯拉发音。[官网](https://www.atlassian.com/software/jira)

`Atlassian Confluence`（简称`Confluence`）是一个专业的`wiki`程序。它是一个知识管理的工具，通过它可以实现团队成员之间的协作和知识共享。[官网](https://www.atlassian.com/software/confluence)

<!--more-->

## 安装 Jira（8.1.0) 和 Confluence (7.0.1)

### 申明

- 本文章只做个人学习研究之用，不得用于商业用途！
- 商业使用请向 [Atlassian](https://www.atlassian.com) 购买正版，谢谢合作！

### 制作 Docker 破解镜像

atlassian-agent.jar 破解文件自行网上搜索下载：

目录结构：

```bash
atlassian
├── docker-compose.yml
├── confluence
│   ├── Dockerfile
│   └── atlassian-agent.jar
└── jira
    ├── Dockerfile
    └── atlassian-agent.jar
```

`atlassian/docker-compose.yml`：

```yml
version: "3.7"

services:
  mysql:
    image: mysql:5.7
    container_name: mysql
    ports:
      - "3306:3306"
    restart: unless-stopped
    networks:
      atlassian-net:
        aliases:
          - mysql
    environment:
      - MYSQL_ROOT_PASSWORD=123456
    volumes:
      - type: volume
        source: data_mysql_vol
        target: /var/lib/mysql
      - type: volume
        source: conf_mysql_vol
        target: /etc/mysql/mysql.conf.d
      - type: volume
        source: data_backup_vol
        target: /backup
      - type: bind
        source: /usr/share/zoneinfo/Asia/Shanghai
        target: /etc/localtime
        read_only: true

  jira:
    image: jira/jira:v8.1.0
    build: ./jira
    container_name: jira
    ports:
      - "9005:8080"
    restart: unless-stopped
    depends_on:
      - mysql
    networks:
      atlassian-net:
        aliases:
          - jira
    environment:
      - CATALINA_OPTS= -Xms1024m -Xmx2g -Datlassian.plugins.enable.wait=300
    volumes:
      - data_jira_var:/var/atlassian/jira
      - data_jira_opt:/opt/atlassian/jira

  confluence:
    image: confluence/confluence:7.0.1
    build: ./confluence
    container_name: confluence
    ports:
      - "9006:8090"
    restart: unless-stopped
    depends_on:
      - mysql
    networks:
      atlassian-net:
        aliases:
          - confluence
    environment:
      - CATALINA_OPTS= -Xms4096m -Xmx8192
    volumes:
      - data_confluence_vol:/home/confluence_data
      - data_confluence_opt:/opt/atlassian/confluence
      - data_confluence_var:/var/atlassian/confluence

networks:
  atlassian-net:
    driver: bridge

volumes:
  data_mysql_vol:
  conf_mysql_vol:
  data_backup_vol:
  data_jira_var:
  data_jira_opt:
  data_confluence_vol:
  data_confluence_opt:
  data_confluence_var:
```

`atlassian/jira/Dockerfile`：

```bash
FROM cptactionhank/atlassian-jira-software:8.1.0

USER root

# 将代理破解包加入容器
COPY "atlassian-agent.jar" /opt/atlassian/jira/

# 设置启动加载代理包
RUN echo 'export CATALINA_OPTS="-javaagent:/opt/atlassian/jira/atlassian-agent.jar ${CATALINA_OPTS}"' >> /opt/atlassian/jira/bin/setenv.sh
```

`atlassian/confluence/Dockerfile`：

```bash
FROM cptactionhank/atlassian-confluence:7.0.1

USER root

# 将代理破解包加入容器
COPY "atlassian-agent.jar" /opt/atlassian/confluence/

# 设置启动加载代理包
RUN echo 'export CATALINA_OPTS="-javaagent:/opt/atlassian/confluence/atlassian-agent.jar ${CATALINA_OPTS}"' >> /opt/atlassian/confluence/bin/setenv.sh
```

在 `atlassian` 目录下执行构建命令：

```bash
docker-compose build
# 或直接启动
docker-compose up -d
```

## 配置数据库

- [jira mysql](https://confluence.atlassian.com/adminjiraserver081/connecting-jira-applications-to-mysql-5-7-970608532.html)
- [confluence mysql](https://confluence.atlassian.com/doc/database-setup-for-mysql-128747.html)

```bash
vim /var/lib/docker/volumes/atlassian_conf_mysql_vol/_data/mysqld.cnf
```

需要注意的是，`Confluence`需要使用`utf8_bin`，并将事务隔离策略设为`READ-COMMITTED`：

```bash
[mysqld]
pid-file        = /var/run/mysqld/mysqld.pid
socket          = /var/run/mysqld/mysqld.sock
datadir         = /var/lib/mysql
#log-error      = /var/log/mysql/error.log
# By default we only accept connections from localhost
#bind-address   = 127.0.0.1
# Disabling symbolic-links is recommended to prevent assorted security risks
symbolic-links=0

sql_mode        = STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION

# JIRA
default-storage-engine=INNODB
character_set_server=utf8mb4
innodb_default_row_format=DYNAMIC
innodb_large_prefix=ON
innodb_file_format=Barracuda
innodb_log_file_size=2G

# Confluence
max_allowed_packet=256M
transaction-isolation=READ-COMMITTED
binlog_format=row

```

保存后重启 `mysql`：

```bash
docker-compose restart mysql
```

执行以下 sql：

```sql
-- 创建jira数据库及用户
-- DROP DATABASE jira;
CREATE DATABASE jira CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE user jira identified BY 'jira';
-- GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,DROP,ALTER,INDEX on <JIRADB>.* TO '<USERNAME>'@'<JIRA_SERVER_HOSTNAME>' IDENTIFIED BY '<PASSWORD>';
GRANT ALL PRIVILEGES ON `jira`.* TO 'jira'@'172.%' IDENTIFIED BY 'jira' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `jira`.* TO 'jira'@'localhost' IDENTIFIED BY 'jira' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- 创建confluence数据库及用户
-- DROP DATABASE confluence;
CREATE DATABASE confluence CHARACTER SET utf8 COLLATE utf8_bin;
CREATE user confluence identified BY 'confluence';
-- GRANT ALL PRIVILEGES ON <database-name>.* TO '<confluenceuser>'@'localhost' IDENTIFIED BY '<password>';
GRANT ALL PRIVILEGES ON `confluence`.* TO 'confluence'@'%' IDENTIFIED BY 'confluence' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON `confluence`.* TO 'confluence'@'localhost' IDENTIFIED BY 'confluence' WITH GRANT OPTION;
FLUSH PRIVILEGES;

-- 设置confluence字符集
-- alter database confluence character set utf8 collate utf8_bin;
-- confluence要求设置事务级别为READ-COMMITTED
-- set global tx_isolation='READ-COMMITTED';
-- set session transaction isolation level read committed;
-- show variables like 'tx%';
```

## 配置 JIRA

1. 打开浏览器访问 [http://127.0.0.1:9005](http://127.0.0.1:9005)
2. 设置`jira`页面，可切换中文操作，选择手动配置项目（必须!!!)
3. 选择其它数据库 (推荐用于正式生产环境)
4. 主机：mysql, 端口：3306, 数据库：jira, 用户名：root, 密码：123456
5. 在请指定你的许可证关键字时，把服务器`ID`记下，使用`atlassian-agent.jar`算号破解！！！操作如下：

```bash
# 复制服务器ID: BWGW-TLZP-088V-VKY0
# 在本地存放"atlassian-agent.jar"的目录下执行命令，生成许可证：

# 进入容器
docker-compose exec jira bash

cd /opt/atlassian/jira

# 设置产品类型：-p jira， 详情可执行：java -jar atlassian-agent.jar
java -jar atlassian-agent.jar -d -m test@test.com -n BAT -p jira -o http://127.0.0.1 -s BWGW-TLZP-088V-VKY0
```

## 配置 Confluence

1. 打开浏览器访问 [http://127.0.0.1:9006](http://127.0.0.1:9006)
2. 设置`Confluence`页面，可切换中文操作，选择产品安装
3. 在请指定你的许可证关键字时，把服务器`ID`记下，使用`atlassian-agent.jar`算号破解！！！操作如下：

```bash

# 复制服务器ID: BDS2-P4CI-ZTQQ-5YW9
# 在本地存放"atlassian-agent.jar"的目录下执行命令，生成许可证：

# 进入容器
docker-compose exec confluence bash

cd /opt/atlassian/confluence

# 设置产品类型：-p conf， 详情可执行：java -jar atlassian-agent.jar
java -jar atlassian-agent.jar -d -m test@test.com -n BAT -p conf -o http://127.0.0.1 -s BDS2-P4CI-ZTQQ-5YW9
```

4. 输入集群名：confluence
5. 共享的主目录：/home/confluence_data
6. 数据库: MySQL
7. 主机：mysql, 端口：3306, 数据库：confluence, 用户名：root, 密码：123456

## 后台日志报错 Establishing SSL connection without 解决

> WARN：Establishing SSL connection without server's identity verification is not recommended. According to MySQL 5.5.45+, 5.6.26+ and 5.7.6+ requirements SSL connection must be established by default if explicit option isn't set. For compliance with existing applications not using SSL the verifyServerCertificate property is set to 'false'. You need either to explicitly disable SSL by setting useSSL=false, or set useSSL=true and provide truststore for server certificate verification.

- 原因：`MySQL5.7.6` 以上版本要默认要求使用`SSL`连接，如果不使用需要通过设置 `useSSL=false` 来声明。
- 解决方案：在`mysql`连接字符串`url`中加入`useSSL=true`或者`false`即可，如下：

```bash
# Jira找到配置文件/var/lib/docker/volumes/atlassian_data_jira_var/_data/dbconfig.xml修改mysql连接字符串如下：
jdbc:mysql://address=(protocol=tcp)(host=mysql)(port=3306)/jira?sessionVariables=default_storage_engine=InnoDB&amp;useSSL=false

# Confluence找到配置文件/var/lib/docker/volumes/atlassian_data_confluence_var/_data/confluence.cfg.xml修改mysql连接字符串如下：
jdbc:mysql://mysql:3306/confluence?useSSL=false

# 修改后重启服务
docker-compose restart jira
docker-compose restart confluence
```

## 安装好后可以集成参考： [Jira Software 和 Confluence 集成](https://xinlc.github.io/2019/09/27/back-end/linux/jira-integration-confluence/)

## 参考

- [Atlassian](https://www.atlassian.com/)
