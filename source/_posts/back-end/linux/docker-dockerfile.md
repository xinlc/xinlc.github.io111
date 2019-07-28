
---
title: Docker 之 Dockefile
date: 2019-07-28 15:00:00
categories: Linux
tags: 
  - linux
  - docker
---

Dockerfile 类似 Makefile，Makefile 是通过 make 构建整个工程项目，而 Dockerfile 是通过 Docker build 来构建整个镜像。

<!--more-->

## Dockerfile 构建 debian-jdk8
阿里中间件大赛给的debian-jdk8 Dockerfile
```Dockerfile
FROM debian:stretch

ARG DEBIAN_FRONTEND=noninteractive
ARG JAVA_VERSION=8
ARG JAVA_UPDATE=172
ARG JAVA_BUILD=11
ARG JAVA_PACKAGE=jdk
ARG JAVA_HASH=a58eab1ec242421181065cdc37240b08

ENV LANG C.UTF-8
ENV JAVA_HOME=/opt/jdk
ENV PATH=${PATH}:${JAVA_HOME}/bin

RUN set -ex \
 && apt-get update \
 && apt-get -y install ca-certificates wget unzip \
 && wget -q --header "Cookie: oraclelicense=accept-securebackup-cookie" \
         -O /tmp/java.tar.gz \
         http://download.oracle.com/otn-pub/java/jdk/${JAVA_VERSION}u${JAVA_UPDATE}-b${JAVA_BUILD}/${JAVA_HASH}/${JAVA_PACKAGE}-${JAVA_VERSION}u${JAVA_UPDATE}-linux-x64.tar.gz \
 && CHECKSUM=$(wget -q -O - https://www.oracle.com/webfolder/s/digest/${JAVA_VERSION}u${JAVA_UPDATE}checksum.html | grep -E "${JAVA_PACKAGE}-${JAVA_VERSION}u${JAVA_UPDATE}-linux-x64\.tar\.gz" | grep -Eo '(sha256: )[^<]+' | cut -d: -f2 | xargs) \
 && echo "${CHECKSUM}  /tmp/java.tar.gz" > /tmp/java.tar.gz.sha256 \
 && sha256sum -c /tmp/java.tar.gz.sha256 \
 && mkdir ${JAVA_HOME} \
 && tar -xzf /tmp/java.tar.gz -C ${JAVA_HOME} --strip-components=1 \
 && wget -q --header "Cookie: oraclelicense=accept-securebackup-cookie;" \
         -O /tmp/jce_policy.zip \
         http://download.oracle.com/otn-pub/java/jce/${JAVA_VERSION}/jce_policy-${JAVA_VERSION}.zip \
 && unzip -jo -d ${JAVA_HOME}/jre/lib/security /tmp/jce_policy.zip \
 && rm -rf ${JAVA_HOME}/jar/lib/security/README.txt \
       /var/lib/apt/lists/* \
       /tmp/* \
       /root/.wget-hsts

```
用 Dcokerfile 构建 debian-jdk8 镜像
```bash
cd ~
mkdir debian-jdk8
cd debian-jdk8
# 把上面的内容copy进来
vim Dockerfile

# 构建
# docker build [选项] <上下文路径/URL/->
docker build -t debian-jdk8:v1.0 .

# Dockerfile一般位于构建上下文的根目录下，也可以通过-f指定该文件的位置
# docker build -t debian-jdk8:v1.0 -f /path/Dockerfile .
```
注意命令的最后有一个`.`，这个表示打包的上下文，上下文中的目录文件全部都会发送给守护进程，大多情况下，应该将一个空目录作为构建上下文环境，并将Dockerfile文件放在该目录下。

> Docker 在运行时分为 Docker 引擎（也就是服务端守护进程）和客户端工具。Docker 的引擎提供了一组 REST API，被称为 Docker Remote API，而如 docker 命令这样的客户端工具，则是通过这组 API 与 Docker 引擎交互，从而完成各种功能。因此，虽然表面上我们好像是在本机执行各种 docker 功能，但实际上，一切都是使用的远程调用形式在服务端（Docker 引擎）完成。也因为这种 C/S 设计，让我们操作远程服务器的 Docker 引擎变得轻而易举。
当我们进行镜像构建的时候，并非所有定制都会通过 RUN 指令完成，经常会需要将一些本地文件复制进镜像，比如通过 COPY 指令、ADD 指令等。而 docker build 命令构建镜像，其实并非在本地构建，而是在服务端，也就是 Docker 引擎中构建的。那么在这种客户端/服务端的架构中，如何才能让服务端获得本地文件呢？
这就引入了上下文的概念。当构建的时候，用户会指定构建镜像上下文的路径，docker build 命令得知这个路径后，会将路径下的所有内容打包，然后上传给 Docker 引擎。这样 Docker 引擎收到这个上下文包后，展开就会获得构建镜像所需的一切文件。

## Dockerfile 指令
|指令 | 解释 |
|:-------- |:----------|
|FROM | FROM debian:stretch表示以debian:stretch作为基础镜像进行构建|
|RUN | RUN后面跟的就是一些shell命令，通过&&将这些脚本连接在了一行执行，这么做的原因是为了减少镜像的层数|
|ENV | 设置环境变量|
|ARG | 和 ENV 的效果一样，都是设置环境变量。ARG 所设置的构建环境的环境变量，在将来容器运行时是不会存在这些环境变量|
|COPY | 复制文件，COPY [--chown=<user>:<group>] <源路径>... <目标路径>|
|ADD | 跟COPY性质一样，ADD 支持URL，自动解压tar等压缩文件|
|CMD | 指定默认的容器主进程的启动命令, CMD ["nginx", "-g", "daemon off;"]|
|ENTRYPOINT | 一个Dockerfile只能有一个ENTRYPOINT，跟CMD区别是ENTRYPOINT可以指定参数|
|VOLUME | 定义匿名卷, 容器运行时应该尽量保持容器存储层不发生写操作，对于数据库类需要保存动态数据的应用，其数据库文件应该保存于卷(volume)中|
|EXPOSE | 声明端口, EXPOSE <端口1> [<端口2>...] |
|WORKDIR | 指定RUN工作目录, WORKDIR <工作目录路径>|

## 优化
1. 编写 `.dockerignore` 文件排除不需要的文件和目录。
2. 容器只运行单个应用。
使用 `Docker Compose` 运行多个 Docker 容器。
3. 将多个 RUN 指令合并为一个。
- Docker 镜像是分层的。
- Dockerfile 中的每个指令都会创建一个新的镜像层。
- 镜像层将被缓存和复用。
- 当 Dockerfile 的指令修改了，复制的文件变化了，或者构建镜像时指定的变量不同了，对应的镜像层缓存就会失效。
- 某一层的镜像缓存失效之后，它之后的镜像层缓存都会失效。
- 镜像层是不可变的，如果我们再某一层中添加一个文件，然后在下一层中删除它，则镜像中依然会包含该文件(只是这个文件在 Docker 容器中不可见了)。
> Union FS 是有最大层数限制的，比如 AUFS，曾经是最大不得超过 42 层，现在是不得超过 127 层。

## 参考
- [docker](https://docs.docker.com/engine/reference/builder/)
- [docker_practice](https://yeasy.gitbooks.io/docker_practice/image/build.html)
- [Docker与Dockerfile极简入门文档](https://blog.csdn.net/qq_33256688/article/details/80319673)
- [如何编写最佳的Dockerfile](https://blog.fundebug.com/2017/05/15/write-excellent-dockerfile/)
- [多段构建](https://yeasy.gitbooks.io/docker_practice/image/multistage-builds/laravel.html)