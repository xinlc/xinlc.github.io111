
---
title: Docker 常用镜像
date: 2019-07-28 13:40:00
categories: Linux
tags: 
  - linux
  - docker
---

## Docker 镜像
Docker中有个非常重要的概念叫做——镜像（Image）。Docker 镜像是一个特殊的文件系统，
Image 里面是一层层文件系统，叫做 Union FS（联合文件系统）。联合文件系统，可以将几层目录挂载到一起，形成一个虚拟文件系统。

虚拟文件系统的目录结构就像普通 Linux 的目录结构一样，Docker 通过这些文件再加上宿主机的内核提供了一个 Linux 的虚拟环境。每一层文件系统我们叫做一层 Layer，构建镜像的时候，从一个最基本的操作系统开始，每个构建的操作都相当于做一层的修改，增加了一层文件系统。

在启动Docker Container时，依据Image，Docker 会为 Container 构建出一个虚拟的Linux环境。
<!--more-->

## Docker 常用命令

```bash
docker pull <image>
docker search <image>

docker run [options] image [command][arg...]
-d                   # 后台运行容器
-e                   # 设置环境变量
--expose/-p          # 宿主端口：容器端口映射
--name               # 指定容器名称
--linke              # 连接不同容器
-v                   # 宿主目录：容器目录，挂载磁盘卷

docker start/stop <容器名>
docker ps <容器名>
docker ps -a        # 查看所有容器
dokcer ps -l        # 查看最后一次创建的容器
docker rm           # 删除容器
docker rmi          # 删除镜像
docker logs <容器名> # 查看容器日志
docker images       # 显示镜像列表

docker exec -it <容器名> bash # 登录到容器中
docker help          # 终极命令
docker-compose up -d # 通过 compose 启动

```

## 常用的 Docker Image

### nginx
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

### [Redis](https://redis.io)
```bash
docker search redis
docker pull redis
docker run --name redis -d -p 6339:6339 redis
docker run -p 6379:6379 -v $PWD/data:/data -d redis redis-server --appendonly yes
docker exec -it e55caa redis-cli
```

### MongoDB

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
### [Mysql](https://hub.docker.com/_/mysql)

```bash
docker pull mysql

docker run --name mysql -d -p 3306:3306 -v ~/docker-data/mysql:/var/lib/mysql -e MYSQL_DATABASE=springbucks -e MYSQL_USER=springbucks -e MYSQL_PASSWORD=springbucks -e MYSQL_ROOT_PASSWORD=root_password mysql

docker run --name mysql -d -p 3306:3306 -v ~/docker-data/mysql:/var/lib/mysql -e MYSQL_DATABASE=ssms -e MYSQL_USER=root -e MYSQL_PASSWORD=root -e MYSQL_ROOT_PASSWORD=root mysql

docker exec -it mysql bash
mysql -h localhost -u springbucks -p

show database;
use springbucks;
show tables;

ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root账户密码';
```

### [Zookeeper](https://hub.docker.com/_/zookeeper)

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

### [Consul](https://hub.docker.com/_/consul)
```bash

docker pull consul

docker run --name consul -d -p 8500:8500 -p 8600:8600/udp consul

http://localhost:8500

```

### [rabbitmq](https://hub.docker.com/_/rabbitmq)
```bash

docker pull rabbitmq

docker pull rabbitmq:3.7-management   # 一般用这个

docker run --name rabbitmq -d -p5672:5672 -p 15671:15672 -e RABBITMQ_DEFAULT_USER=spring -e RABBITMQ_DEFAULT_PASS=spring rabbitmq:3.7-management

```

### activeMQ
```bash

docker pull docker.io/webcenter/activemq

docker run -d --name myactivemq -p 61616:61616 -p 8161:8161 docker.io/webcenter/activemq:latest

61616是activemq的容器使用端口（映射为61617），8161是web页面管理端口（对外映射为8162）
http://192.168.100.166:8162/ 本地虚拟机访问地址

默认账号密码都是admin
```

### [zipkin](https://hub.docker.com/r/openzipkin/zipkin)
```bash
https://github.comopenzipkin/docker-zipkin

docker pull openzipkin/zipkin

docker run --name zipkin -d -p 9411:9411 openzipkin/zipkin

http://localhost:9411/zipkin


# 让Zipkin 通过RabbitMQ接收消息

docker run --name rabbit-zipkin -d -p 9411:9411 --link rabbitmq -e RABBIT_ADDRESSES=rabbitmq:5672 -e RABBIT_USER=spring -e RABBIT_PASSWORD=spring openzipkin/zipkin

```

### jenkins
```bash
docker pull jenkins/jenkins

docker run -d -p 8090:8080 -p 50000:50000 -v /Users/leo/docker-data/jenkins:/var/jenkins_home --name jenkins jenkins/jenkins

# -p 8090:8080将镜像的8080端口映射到服务器的8090端口
# -p 50000:50000将镜像的50000端口映射到服务器的50000端口
# -v jenkins:/var/jenkins_home/var/jenkins_home目录为jenkins工作目录，我们将硬盘上的一个目录挂载到这个位置，方便后续更新镜像后继续使用原来的工作目录。
# -v /etc/localtime:/etc/localtime让容器使用和服务器同样的时间设置。
# --name jenkins给容器起一个别名

# 获取密码
docker exec jenkins tail /var/jenkins_home/secrets/initialAdminPassword

```

## 参考
- [docker hub](https://hub.docker.com)
- [daocloud](https://www.daocloud.io/mirror)

