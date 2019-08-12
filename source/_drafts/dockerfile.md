

## jdk
```Dockerfile
FROM centos:7
ADD jdk-7u80-linux-x64.tar.gz /usr/local/
ENV JAVA_HOME=/usr/local/jdk1.7.0_80
ENV JRE_HOME=$JAVA_HOME/jre
ENV CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar:$JRE_HOME/lib:$CLASSPATH
ENV PATH=/sbin:$JAVA_HOME/bin:$PATH
```

## tomcat
```Dockerfile
FROM leo/jdk7
ADD apache-tomcat-7.0.94.tar.gz /usr/local/
#公开端口
EXPOSE 8080
#设置启动命令
ENTRYPOINT ["/usr/local/apache-tomcat-7.0.94/bin/catalina.sh","run"]

```

## java war
```Dockerfile
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
```Dockerfile
FROM nginx:alpine

ADD ./dist/ /usr/share/nginx/html/

EXPOSE 80

```


## 容器不自动退出
Docker容器后台运行,就必须有一个前台进程.容器运行的命令如果不是那些一直挂起的命令（比如运行top，tail），就是会自动退出的。

```bash
docker run -dit --name ubuntu2 ubuntu
```

Dockerfile最后加入：
```bash
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
```bash
docker run -d --name ubuntu ubuntu /bin/bash -c "tail -f /dev/null"
```