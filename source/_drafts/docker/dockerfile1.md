
## docker 打包jar

``` Dockerfile
FROM openjdk:8-jdk-alpine
VOLUME /tmp
ADD user-center.jar app.jar
RUN sh -c 'touch /app.jar'
ENV JAVA_OPTS=""
ENTRYPOINT [ "sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar /app.jar" ]
```

```Dockerfile
FROM openjdk:8-jre
EXPOSE 80
ADD ./target/order-svc.jar /order-svc.jar
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "/order-svc.jar"]
```

## dockerfile 构建 java项目

## jdk

``` Dockerfile
FROM centos:7
ADD jdk-7u80-linux-x64.tar.gz /usr/local/
ENV JAVA_HOME=/usr/local/jdk1.7.0_80
ENV JRE_HOME=$JAVA_HOME/jre
ENV CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar:$JRE_HOME/lib:$CLASSPATH
ENV PATH=/sbin:$JAVA_HOME/bin:$PATH
```

## tomcat

``` Dockerfile
FROM leo/jdk7
ADD apache-tomcat-7.0.94.tar.gz /usr/local/
#公开端口
EXPOSE 8080
#设置启动命令
ENTRYPOINT ["/usr/local/apache-tomcat-7.0.94/bin/catalina.sh","run"]

```

## java war

``` Dockerfile
FROM centos7
ADD jdk-7u80-linux-x64.tar /usr/local/
ADD apache-tomcat-7.0.94.tar.gz /usr/local/
ENV JAVA_HOME /usr/local/jdk1.7.0_80
ENV CLASSPATH $JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
ENV CATALINA_HOME /usr/local/apache-tomcat-7.0.94
ENV CATALINA_BASE /usr/local/apache-tomcat-7.0.94
ENV PATH $PATH:$JAVA_HOME/bin:$CATALINA_HOME/lib:$CATALINA_HOME/bin
ADD ./TRMS_HK.war /usr/local/apache-tomcat-7.0.94/webapps
EXPOSE 8080
CMD /usr/local/apache-tomcat-7.0.94/bin/catalina.sh run

```

## nginx

``` Dockerfile
FROM nginx:alpine

ADD ./dist/ /usr/share/nginx/html/

EXPOSE 80

```

## 容器不自动退出

Docker容器后台运行, 就必须有一个前台进程. 容器运行的命令如果不是那些一直挂起的命令（比如运行top，tail），就是会自动退出的。

``` bash
docker run -dit --name ubuntu2 ubuntu
```

Dockerfile最后加入：

``` bash
CMD ["/bin/bash", "-c", "echo hello"]
# 或
CMD ["sh", "-c", "echo hello"]
# 或
#!/bin/bash
set -m && \
    sh /opt/onStart.sh && \
    touch /var/log/1.txt && \
    tail -f /var/log/1.txt
# 或
/bin/bash -c "echo 'hello' && exec nginx -g 'daemon off;'"
```

或

``` bash
docker run -d --name ubuntu ubuntu /bin/bash -c "tail -f /dev/null"
```

## Dockerfile 中的 multi-stage 特性，Vue 项目多阶段构建实战

最近在写一个 Vue 项目，并已经实现 Docker 镜像构建和容器化部署，之前也分享过一篇文章关于 Vue 项目的静态资源打包和镜像构建。但是之前在镜像构建之前是需要使用 npm 进行项目打包生产 dist 文件之后才能进行镜像构建，不过最近我在使用 Jenkins pipeline 的时候突然想到了 Dockerfile 的多阶段构建，完全可以使用这个特性直接构建出镜像。

### 多阶段构建场景

所谓的多阶段构建，就是当有的服务是需要编译环境进行编译或者打包，然后才能将构建产物移到运行环境中的多个阶段的构建形式。

比如这篇文章所提到的 Vue 项目的构建，Vue 的项目无论是简单还是复杂，最终都是会形成一个静态资源文件夹，这个文件夹里面的内容才是需要放到运行环境中使用的。同样的，Java 项目一般也是需要需要进行编译打包，形成各种包然后才会进行构建。

说的简单一点，就是当一个项目从项目代码到构建成 Docker 镜像的过程需要在不同的环境中进行的场景，那就属于多阶段构建。

### 多阶段构建实战

本篇文章就来分享一下我这个 Vue 项目的多阶段构建实战，其实这不仅仅能代表我这一个项目，而是可以代表所有 Vue 类型的项目的构建思路。

### 单阶段构建步骤

由于多阶段构建的依据其实也是单阶段构建，只是把多个步骤集中到一个 Dockerfile 里面而已，所以要实现多阶段构建，首先需要明确真个构建需要做的事情，理清步骤才能开始构建。

一个 Vue 项目从项目代码到形成镜像，主要分两个步骤，第一步是将源代码构建出静态资源文件，第二步就是选择基础镜像，将静态资源移动到基础镜像，构建镜像。

由于 Vue 是需要 node 环境才能镜像打包的，所以第一步骤需要一个 node 环境，之前我是在构建镜像的环境中安装了 node 环境的，然后进行打包，执行步骤比较简单：

```bash
npm install
npm run build
```

执行完上面的 npm 命令之后，就会在项目代码中生成 dist（默认目录）静态资源包，然后就可以执行 Dockerfile 镜像镜像构建，下面是我之前的 Dockerfile 文件的内容：

```dockerfile
FROM nginx:latest
ARG from_dir=dist
ARG to_dir=/usr/share/nginx/html

COPY ${from_dir} ${to_dir}
```

其实这个目录也就是一个文件夹的移动操作，非常简单，但是 dist 目录是需要提前镜像打包产生的。

可以看到，上面的两个步骤，使用了不同的环境，打包静态资源的时候是在 node 环境，而最终的运行环境是 nginx 基础镜像中，所以这很符合多阶段构建的场景。

### 多阶段构建步骤

Dockerfile 中的 multi-stage 特性允许在一个 Dockerfile 引用多个基础镜像，可以对每个引用的镜像进行单独的操作，然后可以将每个镜像中的文件等内容进行传递。

直接来看 Dockerfile 文件：

```dockerfile
FROM node:latest AS stage
WORKDIR /opt/build
COPY . .
RUN npm config set registry https://registry.npm.taobao.org/ && \
    npm install && \
    npm audit fix && \
    npm run build

FROM nginx:latest
COPY --from=stage /opt/build/dist /usr/share/nginx/html
```

```dockerfile
# build stage
FROM node:14.15.3-slim as build-stage
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production --registry=https://registry.npm.taobao.org
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

可以看到这个 Dockerfile 是有用两个 FROM 命令的，第一个从 node 基础镜像进行构建，执行的步骤就是 npm 的打包，执行完成之后就会在镜像中生成 dist 资源文件夹了，这个时候就开始从 nginx 基础镜像进行构建，需要执行的目录就是从第一个镜像中把生成的目录复制过来即可。

这里就涉及到两个“语法糖”，第一个是 FROM baseimage AS xxx 这个很好理解，就是将这个构建步骤打个标记，用 xxx 来代表，后面可以用这个名词来表示这个阶段，第二个是 COPY --from=xxx 这个 --from 参数表示的就是从某个构建阶段的镜像中复制，而不是从本地，这个也即是多阶段构建的精髓所在，就是镜像之前可以传递文件。
