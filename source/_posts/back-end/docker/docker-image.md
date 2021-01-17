---
title: Docker 常用镜像
date: 2019-07-28 13:40:00
categories: Docker
tags:
  - docker
---

Docker 中有个非常重要的概念叫做——镜像（Image）。Docker 镜像是一个特殊的文件系统，
Image 里面是一层层文件系统，叫做 Union FS（联合文件系统）。联合文件系统，可以将几层目录挂载到一起，形成一个虚拟文件系统。

虚拟文件系统的目录结构就像普通 Linux 的目录结构一样，Docker 通过这些文件再加上宿主机的内核提供了一个 Linux 的虚拟环境。每一层文件系统我们叫做一层 Layer，构建镜像的时候，从一个最基本的操作系统开始，每个构建的操作都相当于做一层的修改，增加了一层文件系统。

在启动 Docker Container 时，依据 Image，Docker 会为 Container 构建出一个虚拟的 Linux 环境。

<!--more-->

## 镜像加速

[CentOS7 安装 Docker](/back-end/linux/linux-install-docker)

```bash
# 官方国内加速地址 https://www.docker-cn.com/registry-mirror
# DaoCloud 加速 https://www.daocloud.io/mirror#accelerator-doc
# http://f1361db2.m.daocloud.io

# 自动 设置 Linux 镜像加速地址
curl -sSL https://get.daocloud.io/daotools/set_mirror.sh | sh -s http://f1361db2.m.daocloud.io

# 手动设置
# 创建或修改 /etc/docker/daemon.json 文件
{
	"registry-mirrors": [
			"加速地址"
	],
	"insecure-registries": []
}
# 重启, 不重启好像也行……
service docker restart

# sudo systemctl daemon-reload
# sudo systemctl restart docker
```

## nginx

```bash
docker pull nginx

docker run --name nginx -p 8081:80 -d nginx

mkdir -p ~/docker-data/nginx/www ~/docker-data/nginx/logs ~/docker-data/nginx/conf


# 拷贝容器内 Nginx 默认配置文件到本地当前目录下的 conf 目录，容器 ID 可以查看 docker ps 命令输入中的第一列：

# 执行docker cp执行将本地主机的index.html复制到docker容器中。
docker cp 本地主机文件路径 nginx容器id://usr/share/nginx/html
docker cp nginx容器id://usr/share/nginx/html/index.html 本地主机文件路径

docker cp <容器id>:/etc/nginx/nginx.conf ~/docker-data/nginx/conf

# www: 目录将映射为 nginx 容器配置的虚拟目录。
# logs: 目录将映射为 nginx 容器的日志目录。
# conf: 目录里的配置文件将映射为 nginx 容器的配置文件。


docker run -d -p 8082:80 --name nginx-web -v ~/docker-data/nginx/www:/usr/share/nginx/html -v ~/docker-data/nginx/conf/nginx.conf:/etc/nginx/nginx.conf -v ~/docker-data/nginx/logs:/var/log/nginx nginx

docker exec -it nginx-web bash

# 如果要重新载入 NGINX 可以使用以下命令发送 HUP 信号到容器：
docker kill -s HUP container-name

# 重启 NGINX 容器命令：
docker restart container-name
```

## [Redis](https://redis.io)

```bash
docker search redis
docker pull redis
docker run --name redis -d -p 6339:6339 redis
docker run -p 6379:6379 -v $PWD/data:/data -d redis redis-server --appendonly yes
docker run --name redis-6379 -p 6379:6379 -v $PWD/data:/data -d --restart=always redis redis-server --appendonly yes --requirepass "123456"

# -p 6379:6379 : 将容器内端口映射到宿主机端口(右边映射到左边)
# -v /data/docker/redis/data:/data : 将主机中当前目录下的data挂载到容器的/data
# redis-server –appendonly yes : 在容器执行redis-server启动命令，并打开redis持久化配置
# requirepass “your passwd” : 设置认证密码
# –restart=always : 随 docker 启动而启动
# –restart=unless-stopped : 如果容器正常 stopped，然后机器重启或 docker 服务重启，这种情况下容器将不会被 restart。

docker exec -it e55caa redis-cli
docker exec -it e55caa redis-cli -a <密码>

keys *
keys auth.*
get auth.userid.203
set key "value"

auth "yourpassword"
```

## MongoDB

```bash

docker pull mongo

docker run --name mongo -p 27017:27017 -v ~/docker-data/mongo:/data/lib -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin -d mongo

docker exec -it mongo bash
mongo -u admin -p admin

help

show dbs

use springbucks
db.createUser(
	{
		user: "springbucks",
		pwd: "springbucks",
		roles: [
			{ role: "readWrite", db: "springbucks" }
		]
	}
)

show users
```

```yaml
version: '3'

services:
  mongo:
    image: mongo:4
    restart: unless-stopped
    ports:
      - "27017:27017"
    networks:
      - net-dev
    environment:
      - MONGO_INITDB_ROOT_USERNAME=root
      - MONGO_INITDB_ROOT_PASSWORD=123456
    volumes:
      - /mnt/dev-data/db/mongo-data:/data/db

  mongo-express:
    image: mongo-express:0.54
    restart: unless-stopped
    ports:
      - "27081:8081"
    networks:
      - net-dev
    environment:
      - ME_CONFIG_BASICAUTH_USERNAME=admin
      - ME_CONFIG_BASICAUTH_PASSWORD=123456
      - ME_CONFIG_MONGODB_ADMINUSERNAME=root
      - ME_CONFIG_MONGODB_ADMINPASSWORD=123456

networks:
  net-dev:
    external: true
```

## [Mysql](https://hub.docker.com/_/mysql)

```bash
docker pull mysql

docker run --name mysql -d -p 3306:3306 -v ~/docker-data/mysql:/var/lib/mysql -e MYSQL_DATABASE=springbucks -e MYSQL_USER=springbucks -e MYSQL_PASSWORD=springbucks -e MYSQL_ROOT_PASSWORD=root_password mysql

docker run --name mysql -d -p 3306:3306 -v ~/docker-data/mysql:/var/lib/mysql -e MYSQL_DATABASE=ssms -e MYSQL_USER=root -e MYSQL_PASSWORD=root -e MYSQL_ROOT_PASSWORD=root mysql

docker exec -it mysql bash
mysql -h localhost -P 3306 -u springbucks -p

show databases;
use springbucks;
show tables;

# 修改密码
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root账户密码';

# 常用命令
# 导出整个数据库
mysqldump -u 用户名 -p –default-character-set=latin1 数据库名 > 导出的文件名(数据库默认编码是latin1)
mysqldump -u root -p test > test.sql

# 导出一个表
mysqldump -u 用户名 -p 数据库名 表名> 导出的文件名
mysqldump -u root -p test users> test_users.sql

# 导出一个数据库结构
mysqldump -u root -p -d –add-drop-table test >d:test.sql
# -d 没有数据 –add-drop-table 在每个create语句之前增加一个drop table

# 导入数据库
# 1. source 导入数据
source test.sql
# 2. 使用mysqldump命令
mysqldump -u username -p dbname < filename.sql
# 3. 使用mysql命令
mysql -u username -p -D dbname < filename.sql

# 库操作
# 创建数据库
# 命令：create database <数据库名>
create database test;
# 显示所有的数据库
# 命令：show databases （注意：最后有个s）
# 删除数据库
# 命令：drop database <数据库名>
# 连接数据库
# 命令：use <数据库名>
# 查看当前使用的数据库
select database();
# 当前数据库包含的表信息：
# show tables; （注意：最后有个s）

# 表操作
# 命令：create table <表名> ( <字段名> <类型> [,..<字段名n> <类型n>]);
mysql> create table MyClass(
> id int(4) not null primary key auto_increment,
> name char(20) not null,
> sex int(4) not null default ’′,
> degree double(16,2));
# 获取表结构
# 命令：desc 表名，或者show columns from 表名
DESCRIBE MyClass
desc MyClass;
show columns from MyClass;
# 删除表
# 命令：drop table <表名>
```

## docker-compose 部署 MySQL8 版本

```yaml
version: '3'

services:
  mysql:
    image: mysql
    container_name: mysql
    command:
    # MySQL8的密码验证方式默认是 caching_sha2_password，但是很多的连接工具还不支持该方式
    # 就需要手动设置下mysql的密码认证方式为以前的 mysql_native_password 方式
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_general_ci
    # docker的重启策略：在容器退出时总是重启容器，但是不考虑在Docker守护进程启动时就已经停止了的容器
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password # root用户的密码
      MYSQL_USER: user # 创建新用户
      MYSQL_PASSWORD: user_password # 新用户的密码
    ports:
      - 3306:3306
    volumes:
      - ~/docker/mysql/data:/var/lib/mysql
      - ~/docker/mysql/conf:/etc/mysql/conf.d
      - ~/docker/mysql/logs:/logs
```

这里有个小坑就是创建的用户还需要先使用root用户登陆以后给它赋予相关的权限才可以使用它进行数据库的连接：

```bash
docker exec -it mysql1 mysql -uroot -p

grant all privileges on dbname.tablename to 'username'@'ip';
# 比如想给用户user赋予数据库test所有的表的权限并且不限制root用户的连接地址，代码如下
grant all privileges on test.* to 'user'@'%';
flush privileges; # 刷新权限
```

## 安装 [mysql-server:8.0.22](https://hub.docker.com/r/mysql/mysql-server/)

> 目前只有 mysql-server:8.x 镜像支持 arm64

```bash
# 启动镜像
docker run --name=mysql1 -d -p 3306:3306 mysql/mysql-server:8.0.22

# 获取初始密码
docker logs mysql1 2>&1 | grep GENERATED

# 使用该命令从docker log里获取初始密码。之后访问mysql，不支持跨域，得用容器方法访问,把刚才密码输进去进入mysql的terminal，之后就可以改密码了。
docker exec -it mysql1 mysql -uroot -p

# password 替换成你的密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';

# 如要支持端口访问，需要修改跨域
use mysql;
update user set host='%' where user='root';
flush privileges;

# 建个新用户
create database mydb;
create user 'userName'@'%' identified by 'password';
grant all privileges on mydb.* to userName@'%';
flush privileges;

# 进入容器拷贝配置文件，到宿主主机。
docker cp mysql1:/etc/my.cnf ./my.cnf
```

```yaml
version: "3"

services:
  mysql:
    image: mysql/mysql-server:8.0.22
    container_name: mysql8
    ports:
      - "3306:3306"
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=123456
    networks:
      - net-dev
    volumes:
      - ./mysql-data:/var/lib/mysql
      - ./my.cnf:/etc/my.cnf

networks:
  net-dev:
    external: true
```

## [Zookeeper](https://hub.docker.com/_/zookeeper)

```bash

docker pull zookeeper:3.5

docker run --name zookeeper -p 2181:2181 -d zookeeper:3.5

docker logs zookeeper

docker exec -it zookeeper bash

cd bin
./zkCli.sh


ls /
ls /xxx
get /xxx
```

## [Consul](https://hub.docker.com/_/consul)

```bash

docker pull consul

docker run --name consul -d -p 8500:8500 -p 8600:8600/udp consul

http://localhost:8500

```

## [rabbitmq](https://hub.docker.com/_/rabbitmq)

```bash

docker pull rabbitmq

docker pull rabbitmq:3.7-management   # 一般用这个

docker run --name rabbitmq -d -p5672:5672 -p 15671:15672 -e RABBITMQ_DEFAULT_USER=spring -e RABBITMQ_DEFAULT_PASS=spring rabbitmq:3.7-management

```

## activeMQ

```bash

docker pull docker.io/webcenter/activemq

docker run -d --name myactivemq -p 61616:61616 -p 8161:8161 docker.io/webcenter/activemq:latest

61616是activemq的容器使用端口（映射为61617），8161是web页面管理端口（对外映射为8162）
http://192.168.100.166:8162/ 本地虚拟机访问地址

默认账号密码都是admin
```

## [zipkin](https://hub.docker.com/r/openzipkin/zipkin)

```bash
https://github.comopenzipkin/docker-zipkin

docker pull openzipkin/zipkin

docker run --name zipkin -d -p 9411:9411 openzipkin/zipkin

http://localhost:9411/zipkin


# 让Zipkin 通过RabbitMQ接收消息

docker run --name rabbit-zipkin -d -p 9411:9411 --link rabbitmq -e RABBIT_ADDRESSES=rabbitmq:5672 -e RABBIT_USER=spring -e RABBIT_PASSWORD=spring openzipkin/zipkin

```

## [gitlab](https://docs.gitlab.com/omnibus/docker/)

```bash
docker pull gitlab/gitlab-ce

docker run --detach \
  --hostname gitlab.example.com \
  --publish 22443:443 --publish 20280:80 --publish 20222:22 \
  --name gitlab \
  --restart always \
  --volume ~/docker-data/gitlab/config:/etc/gitlab \
  --volume ~/docker-data/gitlab/logs:/var/log/gitlab \
  --volume ~/docker-data/gitlab/data:/var/opt/gitlab \
  gitlab/gitlab-ce:latest

# 逐行解释
# 1. 后台运行
# 2. 设置主机名或域名
# 3. 本地端口的映射
# 4. gitlab-ce 的镜像运行成为一个容器，这里是对容器的命名
# 5. 设置重启方式，always 代表一直开启，服务器开机后也会自动开启的
# 6. 将 gitlab 的配置文件目录映射到 ~/docker-data/gitlab/config 目录中
# 7. 将 gitlab 的log文件目录映射到 ~/docker-data/gitlab/logs 目录中
# 8. 将 gitlab 的数据文件目录映射到 ~/docker-data/gitlab/data 目录中
# 9. 需要运行的镜像

# 查看容器列表
docker container ls

# 查看系统 ip
ip addr

# 打开 gitlab
http://xxx:20280

# 设置密码
# 用 root 登录

# swarm docker-compose.yml
version: "3"

services:
  gitlab:
    image: 'gitlab/gitlab-ce:latest'
    ports:
      - '20280:80'
      - '22443:443'
      - '20222:22'
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - '~/docker-data/gitlab/config:/etc/gitlab'
      - '~/docker-data/gitlab/logs:/var/log/gitlab'
      - '~/docker-data/gitlab/data:/var/opt/gitlab'
    deploy:
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "2"
          memory: 2048M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

# docker-compose.yml
version: "2.2"

services:
  gitlab-web:
    image: 'gitlab/gitlab-ce:latest'
    restart: always
    hostname: 'gitlab.example.com'
    environment:
      GITLAB_OMNIBUS_CONFIG: |
        external_url 'https://gitlab.example.com'
        # Add any other gitlab.rb configuration here, each on its own line
    ports:
      - '80:80'
      - '443:443'
      - '22:22'
    volumes:
      - '/srv/gitlab/config:/etc/gitlab'
      - '/srv/gitlab/logs:/var/log/gitlab'
      - '/srv/gitlab/data:/var/opt/gitlab'
    cpus: '0.5'
    mem_limit: 2048m

```

## [jenkins](https://hub.docker.com/r/jenkins/jenkins)

```bash
docker pull jenkins/jenkins

docker run -d -p 8090:8080 -p 50000:50000 -v ~/docker-data/jenkins:/var/jenkins_home --name jenkins jenkins/jenkins

# -p 8090:8080 将镜像的8080端口映射到服务器的8090端口
# -p 50000:50000 将镜像的50000端口映射到服务器的50000端口
# -v jenkins:/var/jenkins_home jenkins_home目录为jenkins工作目录，我们将硬盘上的一个目录挂载到这个位置，方便后续更新镜像后继续使用原来的工作目录。
# -v /etc/localtime:/etc/localtime 让容器使用和服务器同样的时间设置。
# --name jenkins 给容器起一个别名

# 获取密码
docker exec jenkins tail /var/jenkins_home/secrets/initialAdminPassword

# 可能遇到的问题
#1. touch: cannot touch '/var/jenkins_home/copy_reference_file.log': Permission denied
# Can not write to /var/jenkins_home/copy_reference_file.log. Wrong volume permissions?
# 需要修改下目录权限, 因为当映射本地数据卷时，~/docker-data/jenkins目录的拥有者为root用户，而容器中jenkins user的uid为1000
# 执行如下命令即可：
chown -R 1000:1000 ~/docker-data/jenkins

# 2. 如果一直在 Please wait while Jenkins is getting ready to work ..., 是网络问题，需要添加国内镜像
# 需要你进入jenkins的工作目录，打开
vi ~/docker-data/jenkins/hudson.model.UpdateCenter.xml
# 把 https://updates.jenkins.io/update-center.json 改成 http://mirror.xmission.com/jenkins/updates/update-center.json

# 其他镜像源
# 1. 清华大学 https://mirrors.tuna.tsinghua.edu.cn/jenkins/
# 2. 华为 https://mirrors.huaweicloud.com/jenkins/
# 3. 腾讯云 https://mirrors.cloud.tencent.com/jenkins/
# 4. 北京理工大 http://mirror.bit.edu.cn/jenkins/
# 5. USTC http://mirrors.ustc.edu.cn/jenkins/

```

## [禅道](https://hub.docker.com/r/idoop/zentao)

```bash
docker pull idoop/zentao

# open soure edition:
# Zentao管理员帐户为admin，默认初始化密码为123456。并且MySQL root帐户密码为123456，请在首次登录时更改密码。
mkdir -p ~/docker-data/zbox && \
docker run -d -p 28080:80 -p 23306:3306 \
        -e ADMINER_USER="root" -e ADMINER_PASSWD="123456" \
        -e BIND_ADDRESS="false" \
        -v ~/docker-data/zbox/:/opt/zbox/ \
        --add-host smtp.exmail.qq.com:163.177.90.125 \
        --name zentao-server \
        idoop/zentao:latest

# 环境配置
# ADMINER_USER ：设置Web登录数据库Adminer帐户。
# ADMINER_USER ：设置Web登录数据库Adminer帐户。
# ADMINER_PASSWD ：设置Web登录数据库Adminer密码。
# BIND_ADDRESS：如果设置值为false，则MySQL服务器不会绑定地址。
# SMTP_HOST：设置smtp服务器IP和主机。（如果无法发送邮件，则会有所帮助。）也可以extra_host在docker-compose.yaml中使用，或者--add-host在使用dokcer run命令时使用param 。
# 注意：Zentao管理员帐户为admin，默认初始化密码为123456。并且MySQL root帐户密码为123456，请在首次登录时更改密码。

# 如果要升级zentao版本，只需运行具有最新docker镜像的容器并安装相同的zbox路径$volume/zbox/。
# stop and backup old container
docker stop zentao-server
docker rename zentao-server zentao-server-bak
# backup zbox
cp -r /data/zbox /data/zbox-bak
# pull the latest image
docker pull idoop/zentao:latest
# run new container with the latest image and mount the same path
docker run -d -p 80:80 -p 3306:3306 \
        -e ADMINER_USER="root" -e ADMINER_PASSWD="password" \
        -e BIND_ADDRESS="false" \
        -v /data/zbox/:/opt/zbox/ \
        --add-host smtp.exmail.qq.com:163.177.90.125 \
        --name zentao-server \
        idoop/zentao:latest
docker logs -f zentao-server

# docker rm -f zentao-server-bak && rm -rf /data/zbox-bak
# 更多可以访问 http://www.zentao.net/goto.php?item=zbox.
```

## [registry](https://hub.docker.com/_/registry)

[docker image 私有仓库](https://docs.docker.com/registry/)

建议使用 [harbor](https://github.com/goharbor/harbor) 或 [Nexus3](https://www.sonatype.com/download-oss-sonatype) 搭建私有仓库

```bash
# docker-register-web
# docker pull joxit/docker-registry-ui
docker pull registry

# docker run -d -p 5000:5000 --restart always --name registry registry:2
# docker run -d -p 5000:5000 --restart=always --name registry registry

docker run -d \
    -p 5000:5000 \
    -v /opt/data/registry:/var/lib/registry \
    registry

# 推送本地仓库
# docker tag IMAGE[:TAG] [REGISTRY_HOST[:REGISTRY_PORT]/]REPOSITORY[:TAG]。
# 使用 docker tag 将 ubuntu:latest 这个镜像标记为 127.0.0.1:5000/ubuntu:latest
docker tag ubuntu:latest 127.0.0.1:5000/ubuntu:latest
docker push 127.0.0.1:5000/ubuntu:latest

# 用 curl 查看仓库中的镜像。
curl 127.0.0.1:5000/v2/_catalog


# 注意
# 如果你不想使用 127.0.0.1:5000 作为仓库地址，比如想让本网段的其他主机也能把镜像推送到私有仓库。
# 你就得把例如 192.168.199.100:5000 这样的内网地址作为私有仓库地址，这时你会发现无法成功推送镜像。
# 这是因为 Docker 默认不允许非 HTTPS 方式推送镜像。我们可以通过 Docker 的配置选项来取消这个限制，或者查看下一节配置能够通过 HTTPS 访问的私有仓库。
# 对于使用 systemd 的系统，请在 /etc/docker/daemon.json 中写入如下内容（如果文件不存在请新建该文件）
{
  "registry-mirror": [
    "https://registry.docker-cn.com"
  ],
  "insecure-registries": [
    "192.168.199.100:5000"
  ]
}
```

## [openvpn](https://github.com/kylemanna/docker-openvpn.git)

```bash
docker pull kylemanna/openvpn

# 存放 openvpn 数据
OVPN_DATA="~/docker-data/openvpn"

# OVPN_DATA="ovpn-data-example"
# docker volume create --name $OVPN_DATA

# 初始化，生成配置文件，VPN.SERVERNAME.COM 改成 host 公网 ip
docker run \
  -v $OVPN_DATA:/etc/openvpn \
  --log-driver=none \
  --rm kylemanna/openvpn \
  ovpn_genconfig \
  -u udp://VPN.SERVERNAME.COM

# 生成秘钥文件，输入两次秘钥密码，CA 名称，输入两次秘钥密码
docker run \
  -v $OVPN_DATA:/etc/openvpn \
  --log-driver=none \
  --rm -it kylemanna/openvpn \
  ovpn_initpki

# 启动 OpenVPN 服务器进程
docker run \
  --name openvpn \
  --restart always \
  -v $OVPN_DATA:/etc/openvpn \
  -d -p 1194:1194/udp \
  --cap-add=NET_ADMIN \
  kylemanna/openvpn

# 生成没有密码的客户端证书, CLIENTNAME 换成你想起的证书名称, 输入上面的秘钥密码
docker run \
  -v $OVPN_DATA:/etc/openvpn \
  --log-driver=none \
  --rm -it kylemanna/openvpn \
  easyrsa build-client-full CLIENTNAME nopass

# 导出客户端配置, CLIENTNAME 替换成上面的证书名，CLIENTNAME.ovpn，导出的证书文件
docker run \
  -v $OVPN_DATA:/etc/openvpn \
  --log-driver=none \
  --rm kylemanna/openvpn \
  ovpn_getclient CLIENTNAME > CLIENTNAME.ovpn

# CentOS 7 配置防火墙
firewall-cmd --zone=public --add-port=1194/udp --permanent
firewall-cmd --reload

# Mac 客户端配置
https://tunnelblick.org/
https://openvpn.net/client-connect-vpn-for-mac-os/

# 调试
docker run -v $OVPN_DATA:/etc/openvpn -p 1194:1194/udp --privileged -e DEBUG=1 kylemanna/openvpn

# openvpn 创建用户脚本
#!/bin/bash
read -p "please your username: " NAME
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn easyrsa build-client-full $NAME nopass
docker run -v /data/openvpn:/etc/openvpn --rm kylemanna/openvpn ovpn_getclient $NAME > /data/openvpn/conf/"$NAME".ovpn
docker restart openvpn

# openvpn 删除用户脚本
#!/bin/bash
read -p "Delete username: " DNAME
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn easyrsa revoke $DNAME
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn easyrsa gen-crl
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn rm -f /etc/openvpn/pki/reqs/"$DNAME".req
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn rm -f /etc/openvpn/pki/private/"$DNAME".key
docker run -v /data/openvpn:/etc/openvpn --rm -it kylemanna/openvpn rm -f /etc/openvpn/pki/issued/"$DNAME".crt
docker restart openvpn


# 配置 vpn 非全局代理
# net_gateway 表示强行指定 ip 段不使用 vpn，vpn_gateway 表示强行 ip 段使用 vpn
# 修改客户端配置, xxx.ovpn
# 注释掉 redirect-gateway, redirect-gateway def1 代表所有流量都走 vpn
; redirect-gateway def1

# route-nopull 代表不会添加路由，任何流量都不走 vpn
route-nopull

# 默认只允许添加100条路由
max-routes 1000

# 添加需要走 vpn 的 ip
route 192.168.0.80 255.255.255.255 vpn_gateway

# 查看路由表
netstat -nr

```

## dnsmasq

```bash
## 1. 带 web ui https://github.com/jpillora/docker-dnsmasq
docker pull jpillora/dnsmasq

# 创建配置文件
vim /mnt/docker-data/dns/dnsmasq.conf
#dnsmasq config, for a complete example, see:
#  http://oss.segetech.com/intra/srv/dnsmasq.conf
#log all dns queries
log-queries
#dont use hosts nameservers
no-resolv
#use cloudflare as default nameservers, prefer 1^4
server=114.114.114.114
server=8.8.8.8
strict-order
#serve all .company queries using a specific nameserver
server=/company/10.0.0.1
server=/foo.com/192.168.0.10
#explicitly define host-ip mappings
address=/myhost.company/10.0.0.2
address=/.foo.com/192.168.0.10
address=/a.foo.com/192.168.0.11
address=/a.bar.com/192.168.0.12

# 运行容器
docker run \
    --name dnsmasq \
    -d \
    -p 53:53/udp \
    -p 5380:8080 \
    -v /opt/dnsmasq.conf:/etc/dnsmasq.conf \
    --log-opt "max-size=100m" \
    -e "HTTP_USER=foo" \
    -e "HTTP_PASS=bar" \
    --restart always \
    jpillora/dnsmasq

# 防火墙开放端口
firewall-cmd --zone=public --add-port=53/udp --permanent
firewall-cmd --zone=public --add-port=5380/tcp --permanent
firewall-cmd --reload

# 测试
host myhost.company <docker-host>

# docker-compose.yml
version: "2.2"

services:
  dns-server:
    image: 'jpillora/dnsmasq:latest'
    restart: unless-stopped
    ports:
      - '53:53/udp'
      - '5380:8080'
    environment:
      - HTTP_USER=root
      - HTTP_PASS=123456
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - '/mnt/docker-data/dns/dnsmasq.conf:/etc/dnsmasq.conf'
    cpus: '0.5'
    mem_limit: 512m
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"


## 2. 不带 ui https://github.com/andyshinn/docker-dnsmasq.git
docker pull andyshinn/dnsmasq
# docker pull andyshinn/dnsmasq:2.78

docker run -d \
  --restart=always \
  -p 53:53/tcp -p 53:53/udp \
  --cap-add=NET_ADMIN \
  --name dns-server andyshinn/dnsmasq:latest

# 进入容器
docker exec -it dns-server /bin/sh

# 配置上行的真正的dns服务器地址，毕竟你只是个本地代理，不了解外部规则
vim /etc/resolv.dnsmasq
nameserver 114.114.114.114
nameserver 8.8.8.8
# 或者使用阿里云的 DNS
nameserver 223.5.5.5
nameserver 223.6.6.6

# 配置本地解析规则
vim /etc/dnsmasq.hosts
192.168.0.79 dev.demo.com test.demo.com
192.168.0.80 master
192.168.0.81 slave01
192.168.0.82 slave02

# 修改 dnsmasq 配置文件，指定使用上述两个我们自定义的配置文件
vim /etc/dnsmasq.conf
resolv-file=/etc/resolv.dnsmasq
addn-hosts=/etc/dnsmasq.hosts

# 重启容器
docker restart dns-server

# 接下来添加dns服务器ip到电脑，或者添加到路由器上就可以了

# docker-compose.yml
version: "3"

services:
  dns-server:
    image: 'andyshinn/dnsmasq:latest'
    restart: unless-stopped
    cap_add
      - NET_ADMIN
    ports:
      - '53:53/tcp'
      - '53:53/udp'
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - '~/docker-data/dns/resolv.dnsmasq:/etc/resolv.dnsmasq'
      - '~/docker-data/dns/dnsmasq.hosts:/etc/dnsmasq.hosts'
      - '~/docker-data/dns/dnsmasq.conf:/etc/dnsmasq.conf'


# https://github.com/andyshinn/docker-dnsmasq/issues/14
# 问：Can't resolve name when the dockerized app and dockerized dnsmasq on the same host

# 答：I think this is a hairpin NAT problem (containers going out the NAT cannot connect back in to the same NAT). Do we know if Docker supports this?

# You could solve it by connecting to the Docker bridge IP (usually 172.17.42.1 but could be different). I think you can also specify a gateway IP when creating a network. You could create a network (docker network create --subnet 192.168.52.0/24 --gateway 192.168.52.1 mynetwork) and then specify this network to attach in both Docker Compose and the dnsmasq container. Your container applications would then use DNS for 192.168.52.1.
```

## [bind](https://github.com/sameersbn/docker-bind)

```bash
# docker pull sameersbn/bind

## 创建docker网
# 创建一个macvlan网络，可以使容器的IP和宿主机IP在同一个网段。这样就可以直接使用容器IP来访问DNS服务了。
# 查看主机网卡，一般是eth0
ifconfig
docker network create -d macvlan --subnet=10.0.10.0/24 --gateway=10.0.10.1 -o parent=eth0 mynet
# -d 驱动， 这里使用 macvlan
# --subnet，指定子网
# --gateway，指定网关
# parent，这里指定宿主机网卡名称
# appnet，这是新创建的docker网络名称

# 运行
docker run -dit --hostname bind --net=appnet --ip=10.0.10.1 --name bind --restart=always --volume /app/bind:/data sameersbn/bind:latest

# 使用--net 指定刚刚创建的macvlan网络，使用--ip指定一个IP地址
# 打开浏览器：https://10.0.10.1:10000，输入默认的用户名：root，密码：password，点击左则菜单的 Servers 就可以看到 DNS 服务器已经运行起来了
```

## svn

```bash
docker pull garethflowers/svn-server

docker run \
    --name svn-server \
    --detach \
    --volume /home/svn:/var/opt/svn \
    --publish 3690:3690 \
    garethflowers/svn-server

# 创建新仓库
docker exec -it svn-server svnadmin create repo

# 当前仓库下
## ！！！注意！！！配置文件不要注释！！！
## ！！！注意！！！配置文件不要注释！！！
## ！！！注意！！！配置文件不要注释！！！
## 资源仓库配置，修改 conf/svnserve.conf
vim conf/svnserve.conf

[general]
anon-access=none             # 匿名用户不可读写，也可设置为只读 read
auth-access=write            # 授权用户可读可写
password-db=passwd           # 密码文件路径，相对于当前目录
authz-db=authz               # 访问控制文件
# realm=/var/opt/svn/repo      # 认证命名空间，会在认证提示界面显示，并作为凭证缓存的关键字，可以写仓库名称比如repo
# realm=repo

## 配置账号与密码，修改 conf/passwd 文件，格式为“账号 = 密码”
[users]
# harry = harryssecret
# sally = sallyssecret
admin=123456

## 配置账户权限，修改 conf/authz 文件
# [groups]
# owner=admin

[/]               # / 表示所有仓库
admin=rw        # 用户 admin 在所有仓库拥有读写权限

# [repo:/]           # 表示以下用户在仓库 svn 的所有目录有相应权限
# @owner=rw       # 表示 owner 组下的用户拥有读写权限

# 防火墙开放端口
firewall-cmd --zone=public --add-port=3690/tcp --permanent
firewall-cmd --reload

# 重启 svn-server
docker restart svn-server

# 常用命令
## 检出仓库
svn checkout svn://localhost:3690/repo --username admin
# svn checkout svn://localhost:3690/repo /Users/leo/repo --username admin
# svn co svn://localhost/repo --username admin --password 123456

### 提交文件
echo abc > test.txt
svn add test.txt
svn commit -m 'test'

### 查看仓库中的文件
svn list test.txt

### 还原文件
svn revert test.txt

# docker-compose.yml
version: "2.2"

services:
  svn:
    image: 'garethflowers/svn-server:latest'
    restart: unless-stopped
    ports:
      - '3690:3690'
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - '/mnt/docker-data/svn/home:/var/opt/svn'
    cpus: '1'
    mem_limit: 1024m
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

```

## [nginx-proxy](https://github.com/jwilder/nginx-proxy)

自动化 Nginx 反向代理 Docker, nginx-proxy 启动一个容器来运行 nginx 和 docker-gen。 在主机上的容器启动和停止时 docker-gen 会生成 nginx 反向代理配置并且重新加载 nginx。

```bash
version: '2'

services:
  nginx-proxy:
    image: jwilder/nginx-proxy
    ports:
      - "80:80"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro

  whoami:
    image: jwilder/whoami
    environment:
      # - VIRTUAL_HOST=whoami.local # 定义访问改容器的域名
      - VIRTUAL_HOST=xinlichao.cn,www.xinlichao.cn
      - VIRTUAL_PORT=8000


curl -H "Host: whoami.local" localhost
```

## [sharding-proxy](https://github.com/apache/shardingsphere)

[Sharding-Proxy](https://shardingsphere.apache.org/document/current/cn/manual/sharding-proxy/)是[ShardingSphere](https://shardingsphere.apache.org/)的第二个产品。 它定位为透明化的数据库代理端，提供封装了数据库二进制协议的服务端版本，用于完成对异构语言的支持。 目前先提供MySQL/PostgreSQL版本，它可以使用任何兼容MySQL/PostgreSQL协议的访问客户端(如：MySQL Command Client, MySQL Workbench, Navicat等)操作数据，对DBA更加友好。

在/${your_work_dir}/conf/创建server.yaml和config-xxx.yaml文件，进行服务器和分片规则配置。 配置规则，请参考[配置手册](https://shardingsphere.apache.org/document/current/cn/manual/sharding-proxy/configuration/)。 配置模板，请参考[配置模板](https://github.com/apache/shardingsphere/tree/master/sharding-proxy/sharding-proxy-bootstrap/src/main/resources/conf)

```yaml
version: '3'

services:
  sharding-proxy:
    image: apache/sharding-proxy:4.0.1
    container_name: sharding-proxy
    restart: unless-stopped
    ports:
      - 13308:3308 # 13308表示宿主机端口:docker容器端口(PORT=3308)
    environment:
      - PORT=3308 # docker容器端口
      - JVM_OPTS= -Djava.awt.headless=true
    volumes:
      - /mnt/docker-data/sharding-proxy/conf:/opt/sharding-proxy/conf
      - /mnt/docker-data/sharding-proxy/ext-lib:/opt/sharding-proxy/ext-lib
```

代理配置：server.yaml

```yaml
# 权限验证
authentication:
 users:
   root: # 自定义用户名
     password: root
   sharding: # 自定义用户名
     password: sharding
     authorizedSchemas: sharding_db # 该用户授权可访问的数据库，多个用逗号分隔。缺省将拥有root权限，可访问全部数据库。

props:
 max.connections.size.per.query: 1
 acceptor.size: 16  # #用于设置接收客户端请求的工作线程个数，默认为CPU核数*2
 executor.size: 16  # Infinite by default.
 proxy.frontend.flush.threshold: 128  # 对于单个大查询,每多少个网络包返回一次
 proxy.transaction.type: LOCAL # 默认为LOCAL事务，允许LOCAL，XA，BASE三个值，XA采用Atomikos作为事务管理器，BASE类型需要拷贝实现ShardingTransactionManager的接口的jar包至lib目录中
 proxy.opentracing.enabled: false # 是否开启链路追踪功能，默认为不开启。详情请参见[链路追踪](/cn/features/orchestration/apm/)
 proxy.hint.enabled: false # 是否启用 hint 语句
 query.with.cipher.column: true # 是否使用密文列查询
 sql.show: false
 allow.range.query.with.inline.sharding: false
```

数据分片配置：config-sharding.yaml

```yaml
schemaName: sharding_db

dataSources:
  ds0: 
    url: jdbc:postgresql://localhost:5432/ds0
    username: root
    password: 123456
    connectionTimeoutMilliseconds: 30000
    idleTimeoutMilliseconds: 60000
    maxLifetimeMilliseconds: 1800000
    maxPoolSize: 65
  ds1:
    url: jdbc:postgresql://localhost:5432/ds1
    username: root
    password: 123456
    connectionTimeoutMilliseconds: 30000
    idleTimeoutMilliseconds: 60000
    maxLifetimeMilliseconds: 1800000
    maxPoolSize: 65

shardingRule:
  tables:
    t_order:
      actualDataNodes: ds${0..1}.t_order${0..1}
      databaseStrategy:
        inline:
          shardingColumn: user_id
          algorithmExpression: ds${user_id % 2}
      tableStrategy: 
        inline:
          shardingColumn: order_id
          algorithmExpression: t_order${order_id % 2}
      keyGenerator:
        type: SNOWFLAKE
        column: order_id
    t_order_item:
      actualDataNodes: ds${0..1}.t_order_item${0..1}
      databaseStrategy:
        inline:
          shardingColumn: user_id
          algorithmExpression: ds${user_id % 2}
      tableStrategy:
        inline:
          shardingColumn: order_id
          algorithmExpression: t_order_item${order_id % 2}
      keyGenerator:
        type: SNOWFLAKE
        column: order_item_id
  bindingTables:
    - t_order,t_order_item
  defaultTableStrategy:
    none:
```

```bash
# 防火墙开放端口
firewall-cmd --zone=public --add-port=13308/tcp --permanent
firewall-cmd --reload

## 连接PostgreSQL
psql -U ${your_user_name} -h ${your_host} -p 13308

# 连接 mysql，注意：需要 将mysql-connector.jar所在目录挂载到/opt/sharding-proxy/ext-lib。
# wget https://repo1.maven.org/maven2/mysql/mysql-connector-java/5.1.47/mysql-connector-java-5.1.47.jar
# 如果还提示 Cannot load JDBC driver class 'com.mysql.jdbc.Driver'，就进入容器把驱动copy到 opt/sharding-proxy/lib
mycli -u sharding -h 1921.68.0.20 -P 13308 -D sharding_db

# 或者
mysql -u sharding -h 1921.68.0.20 -P 13308 -p
```

### FAQ

- 问题1：I/O exception (java.io.IOException) caught when processing request to {}->unix://localhost:80: Connection refused？
- 回答：在构建镜像前，请确保docker daemon进程已经运行。
- 问题2：启动时报无法连接到数据库错误？
- 回答：请确保/${your_work_dir}/conf/config-xxx.yaml配置文件中指定的PostgreSQL数据库的IP可以被Docker容器内部访问到。
- 问题3：如何使用后端数据库为MySQL的ShardingProxy？
- 回答：将mysql-connector.jar所在目录挂载到/opt/sharding-proxy/ext-lib。
- 问题4：如何使用自定义分片算法？
- 回答：实现对应的分片算法接口，将编译出的分片算法jar所在目录挂载到/opt/sharding-proxy/ext-lib。

> [更多参考](https://shardingsphere.apache.org/document/current/cn/manual/sharding-proxy/docker/)

### Yaml语法说明

- `!!` 表示实例化该类
- `-` 表示可以包含一个或多个
- `[]` 表示数组，可以与减号相互替换使用

## 常用 DB

```yaml
version: "3"

services:
  mysql:
    image: mysql:5.7
    container_name: mysql
    ports:
      - "3306:3306"
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=123456
    networks:
      - net-dev
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /mnt/dev-data/db/mysql-data:/var/lib/mysql
      - /mnt/dev-data/db/mysql.conf.d:/etc/mysql/mysql.conf.d

  redis:
    image: redis:5.0.5
    container_name: redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass 123456
    ports:
      - "6379:6379"
    networks:
      - net-dev
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /mnt/dev-data/db/redis-data:/data

  mongo:
    image: mongo:4
    restart: unless-stopped
    ports:
      - "27017:27017"
    networks:
      - net-dev
    volumes:
      - /mnt/dev-data/db/mongo-data:/data/db

  mongo-express:
    image: mongo-express:0.54
    restart: unless-stopped
    ports:
      - "27081:8081"
    networks:
      - net-dev

networks:
  net-dev:
    external: true
```

## [Nexus3](https://github.com/sonatype/docker-nexus3)

[Nexus3](https://www.sonatype.com/download-oss-sonatype/) 是一个仓库管理器，它极大地简化了本地内部仓库的维护和外部仓库的访问。支持多种仓库类型：Maven、npm、APT、Yum、PyPI、Docker、Helm、Go 等等。

```bash
docker volume create --name nexus-data
docker run -d -p 8081:8081 --name nexus -v nexus-data:/nexus-data sonatype/nexus3 

mkdir /some/dir/nexus-data && chown -R 200 /some/dir/nexus-data
docker run -d -p 8081:8081 --name nexus -v /some/dir/nexus-data:/nexus-data sonatype/nexus3
```

```yaml
version: "3"

services:
  nexus:
    image: sonatype/nexus3
    container_name: nexus
    ports:
      - "8002:8081"
    restart: unless-stopped
    environment:
      # - NEXUS_CONTEXT=nexus
      # - INSTALL4J_ADD_VM_PARAMS=-Xms2g -Xmx2g -XX:MaxDirectMemorySize=3g  -Djava.util.prefs.userRoot=/some-other-dir
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /mnt/dev-data/nexus-data:/nexus-data # 注意修改目录用户为 200
```

## 参考

- [docker docs](https://docs.docker.com)
- [docker hub](https://hub.docker.com)
- [daocloud](https://www.daocloud.io/mirror)
