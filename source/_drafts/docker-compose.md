```bash
# Docker 如何访问宿主机
ifconfig
ip addr show docker0
ip addr show docker0 | grep -Po 'inet \K[\d.]+'
# 会看到 docker0 那个 ip，可以使用来访问宿主机
# 一般为172.17.0.1
# 或者访问当前机器ip(192.168.1.xxx)

# mac 中
# docker 18.03 加入了一个 feature，在容器中可以通过 host.docker.internal来访问主机 。

# nginx: No route to host
# 服务器防火墙问题
# systemctl status firewalld
# 此问题适用于： RHEL/CentOS 7.x and later
# 默认情况下，firewalld将阻止同一个docker主机上的intercontainer网络。要允许docker容器之间的通信，请运行以下命令：
firewall-cmd --permanent --direct --add-rule ipv4 filter INPUT 4 -i docker0 -j ACCEPT
firewall-cmd --reload
systemctl restart docker

或者 docker run 加上 --net host
docker-compse 加上 network_mode: host
# p.s. host 模式 就不能绑定端口了，所有容器端口都对应属主机端口



# 参考，但不好用：https://www.jianshu.com/p/03b386fece41

# http://www.zsythink.net/archives/1199
# https://wangchujiang.com/linux-command/c/firewall-cmd.html
# 查看已经开放的端口：
# firewall-cmd --list-ports
# 开启端口
# firewall-cmd --zone=public --add-port=80/tcp --permanent
# 命令含义：
# –zone #作用域
# –add-port=80/tcp #添加端口，格式为：端口/通讯协议
# –permanent #永久生效，没有此参数重启后失效
# 重启防火墙
# firewall-cmd --reload #重启firewall
# systemctl stop firewalld.service #停止firewall
# systemctl disable firewalld.service #禁止firewall开机启动
# firewall-cmd --state #查看默认防火墙状态（关闭后显示notrunning，开启后显示running）

# firewall-cmd --get-active-zone
# iptables -L -n


# docker 集群 zookeeper 碰到 java.net.NoRouteToHostException: Host is unreachable (Host unreachable)
# 原因是 firewalld 的没有信任 docker 的 ip 地址，stackoverflower 中也有类似的问题。
# 将所有 docker 的 ip 添加都白名单即可。
# docker network ls
# docker inspect <network id>

ifconfig

firewall-cmd --zone=trusted --add-source=172.17.0.1/16 --permanent
firewall-cmd --zone=trusted --add-source=192.168.48.1/20 --permanent
firewall-cmd --reload


# 删除
firewall-cmd --zone=trusted --remove-source=192.168.48.1/20 --permanent
firewall-cmd --reload
```

```bash
# docker 容器时间和主机不一样，相差8小时
# 这个最简单, 跟宿主挂载时区和时间
# “ro”的意思是只读(read-only)模式，可以保证其挂载卷不被 Docker 容器内部文件系统配置所覆盖。
-v /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro

-v /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime

-v /etc/timezone:/etc/timezone -v /etc/localtime:/etc/localtime



# Alpine
RUN apk --no-cache add tzdata  && \
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone
# --no-cache参数不缓存文件，有助于减少最终体积。
# Ubuntu
# 如未安装可先安装tzdata

RUN echo "Asia/Shanghai" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata
或者
echo "Asia/Shanghai" > /etc/timezone
ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

CentOS
RUN echo "Asia/shanghai" > /etc/timezone;
# 当然也可以将时区作为构建镜像的参数处理，这样可以带来更大的灵活性。

RUN ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime


# 这个好用
docker容器时间不对及java程序时间不对解决
使用docker容器部署的应用，会出现时间与主机不一致的情况

1. 容器时间与主机差8个小时：主机的与容器的/etc/localtime不一致

解决方法：挂载主机的/etc/localtime，如果没有则cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

2. 如果里面运行的是java程序，哪么程序时间还是会8个小时的差别：主要是Java或取时间是从/etc/timezone里获取时区

解决方法：挂载主机的/etc/timezone，如果没有则新建echo "Asia/shanghai" > /etc/timezone;

或者是通过jvm参数将时区信息传进jvm里：-Duser.timezone=GMT+08

```

```bash
# 格式化
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
```

## 其他

### jenkins

```yaml
#： docker run -d -p 8080:8080
-v /var/run/docker.sock:/var/run/docker.sock
-v $(which docker):/usr/bin/docker
-v /lib64/libdevmapper.so.1.02:/usr/lib/libdevmapper.so.1.02
-v /lib64/libsystemd.so.0:/usr/lib/libsystemd.so.0
-v /lib64/libgcrypt.so.20:/usr/lib/libgcrypt.so.20
-v /lib64/libudev.so.0:/usr/lib/libudev.so.0
-v /home/jenkins_home:/var/jenkins_home  myjenkins


jenkins:
  image: jenkins/jenkins:lts
  volumes:
    - /data/jenkins/:/var/jenkins_home
    - /var/run/docker.sock:/var/run/docker.sock
    - /usr/bin/docker:/usr/bin/docker
    - /usr/lib/x86_64-linux-gnu/libltdl.so.7:/usr/lib/x86_64-linux-gnu/libltdl.so.7
  ports:
    - "8029:8080"
  expose:
    - "8080"
    - "50000"
  privileged: true
  user: root
  restart: always
  container_name: jenkins
  environment:
    JAVA_OPTS: '-Djava.util.logging.config.file=/var/jenkins_home/log.properties'

```


## 201 防火墙

```bash
vim lockdown-whitelist.xml
<?xml version="1.0" encoding="utf-8"?>
<whitelist>
  <command name="/usr/bin/python -Es /usr/bin/firewall-config"/>
  <selinux context="system_u:system_r:NetworkManager_t:s0"/>
  <selinux context="system_u:system_r:virtd_t:s0-s0:c0.c1023"/>
  <user id="0"/>
</whitelist>


vim direct.xml
<?xml version="1.0" encoding="utf-8"?>
<direct>
  <rule priority="4" table="filter" ipv="ipv4" chain="INPUT">-i docker0 -j ACCEPT</rule>
</direct>

vim zones/public.xml
<?xml version="1.0" encoding="utf-8"?>
<zone>
  <short>Public</short>
  <description>For use in public areas. You do not trust the other computers on networks to not harm your computer. Only selected incoming connections are accepted.</description>
  <service name="ssh"/>
  <service name="dhcpv6-client"/>
  <port protocol="tcp" port="1521"/>
  <port protocol="tcp" port="21"/>
  <port protocol="tcp" port="20"/>
  <port protocol="tcp" port="22"/>
  <port protocol="tcp" port="8090"/>
  <port protocol="tcp" port="80"/>
  <port protocol="tcp" port="6379"/>
  <rule family="ipv4">
    <source address="172.17.0.1/16"/>
    <accept/>
  </rule>
</zone>

vim zones/trusted.xml
<?xml version="1.0" encoding="utf-8"?>
<zone target="ACCEPT">
  <short>Trusted</short>
  <description>All network connections are accepted.</description>
  <interface name="docker0"/>
</zone>
```