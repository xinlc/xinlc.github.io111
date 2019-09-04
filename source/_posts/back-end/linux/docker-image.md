
---
title: Docker 常用镜像
date: 2019-07-28 13:40:00
categories: Linux
tags: 
  - linux
  - docker
---

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
docker inspect <容器名> # 查看容器信息

docker exec -it <容器名> bash # 登录到容器中
docker help          # 终极命令
docker-compose up -d # 通过 compose 启动

# 批量操作
docker stop $(docker ps -a | grep "Exited" | awk '{print $1 }') # 停止容器
docker rm $(docker ps -a | grep "Exited" | awk '{print $1 }') # 删除容器
docker rmi $(docker images | grep "none" | awk '{print $3}')  # 删除<none>镜像

# 解决 docker命令不需要敲sudo的方法
# 由于docker daemon需要绑定到主机的Unix socket而不是普通的TCP端口，而Unix socket的属主为root用户，所以其他用户只有在命令前添加sudo选项才能执行相关操作。
# 查看是否有docker用户组
cat /etc/group

# 没有就创建一个docker组
sudo groupadd docker
# 添加当前用户到docker组
sudo usermod -aG docker $USER
# 如果有用户组就直接添加
sudo gpasswd -a <你的用户名> docker
# 重启
sudo service docker restart 或 sudo systemctl restart docker
# 重新登录shelL
```

## 镜像加速
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

### 

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

### [jenkins](https://hub.docker.com/r/jenkins/jenkins)
```bash
docker pull jenkins/jenkins

docker run -d -p 8090:8080 -p 50000:50000 -v ~/docker-data/jenkins:/var/jenkins_home --name jenkins jenkins/jenkins

# -p 8090:8080将镜像的8080端口映射到服务器的8090端口
# -p 50000:50000将镜像的50000端口映射到服务器的50000端口
# -v jenkins:/var/jenkins_home/var/jenkins_home目录为jenkins工作目录，我们将硬盘上的一个目录挂载到这个位置，方便后续更新镜像后继续使用原来的工作目录。
# -v /etc/localtime:/etc/localtime让容器使用和服务器同样的时间设置。
# --name jenkins给容器起一个别名

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

```

### [禅道](https://hub.docker.com/r/idoop/zentao)
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

### (registry)(https://hub.docker.com/_/registry)
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
- [docker hub](https://hub.docker.com)
- [daocloud](https://www.daocloud.io/mirror)

