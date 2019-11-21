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

[CentOS7 安装 Docker](https://xinlc.github.io/2019/09/15/back-end/linux/linux-install-docker)

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
# –restart=always : 随docker启动而启动

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

# docker-compose.yml

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

## 参考

- [docker docs](https://docs.docker.com)
- [docker hub](https://hub.docker.com)
- [daocloud](https://www.daocloud.io/mirror)
