---
title: Docker 命令指令详情
date: 2017-06-20 17:05:00
categories: Docker
tags:
  - docker
---

> 原文：http://www.dockerinfo.net/341.html

## Docker 命令指令详情

<!--more-->

```Apache
attach    attach到一个运行中的容器
build     从Dockefile中建立一个镜像
commit    从一个修改后的容器创建一个新的镜像
create    创建一下新容器
diff      检查容器中文件的改变
exec      在一个运行中的容器执行一个命令
images    镜像列表   （ Docker获取与列出Images镜像详情 ）
info      显示系统信息
kill      kill 一个运行中的容器
login     登录到docker 注册服务器
logout    从docker注册服务器退出
pause     暂停某一容器的所有进程
push      上传镜像或资源库到Docker注册服务器
rename    重命名一个存在的容器
search    在Docker Hub上搜索一个镜像
stats     显示容器使用资源的一系列的统计信息
cp        从一个容器文件系统中拷贝文件/目录到主机
unpause   取消暂停的容器
    sudo docker cp 7bb0e258aefe:/etc/debian_version
    拷贝7bb0e258aefe中的/etc/debian_version到当前目录下
    注意：只要7bb0e258aefe没有被删除，文件命名空间就还在，可以放心的把exit状态的container的文件拷贝出来
import    从压缩的文件中创建一个新文件系统镜像
    docker import url|-  "o">[repository[:tag "o">]]
    cat export.tar  "p">| docker import - imported-nginx:latest
    docker import http://example.com/export.tar
    从归档文件（支持远程文件）创建一个镜像， export 的逆操作，可为导入镜像打上标签。导出后导入（exported-imported)）的容器会丢失所有的提交历史，无法回滚
inspect   返回容器或镜像底层信息
    docker instpect nginx:latest
    docker inspect nginx-container
    检查镜像或者容器的参数，默认返回 JSON 格式
    -f 指定返回值的模板文件。
load      从归档的tar中加载一个镜像
    docker load [options]
    docker load < debian.tar
    docker load -i "debian.tar"
    从 tar 镜像归档中载入镜像， docker save 的逆操作。保存后再加载（saved-loaded）的镜像不会丢失提交历史和层，可以回滚
    -i "debian.tar" 指定载入的镜像归档。
logs      获取容器操作日志
     -f 跟踪容器日志的最近更新
     -t 显示容器日志的时间戳
     --tail="10" 仅列出最新10条容器日志
ps        容器列表
    -a 列出所有容器（含沉睡镜像）
    --before="nginx" 列出在某一容器之前创建的容器，接受容器名称和ID作为参数
    --since="nginx" 列出在某一容器之后创建的容器，接受容器名称和ID作为参数
    -f [exited=<int>] 列出满足
    exited=<int> 条件的容器
    -l 仅列出最新创建的一个容器
    --no-trunc 显示完整的容器ID
    -n=4 列出最近创建的4个容器
    -q 仅列出容器ID
    -s 显示容器大小
pull      从Docker注册服务器下载镜像或资源库
          将镜像推送至远程仓库，默认为 Docker Hub
rm        删除一个或多个容器
    docker rm [options "o">] <container>  "o">[container...]
    docker rm nginx-01 nginx-02 db-01 db-02
    sudo docker rm -l /webapp/redis
    -f强行移除该容器，即使其正在运行
    -l 移除容器间的网络连接，而非容器本身
    -v 移除与容器关联的空间
rmi       删除一个或多个镜像
    docker rmi [options "o">] <image>  "o">[image...]
    docker rmi nginx:latest postgres:latest python:latest
    从本地移除一个或多个指定的镜像
    -f 强行移除该镜像，即使其正被使用
    --no-prune 不移除该镜像的过程镜像，默认移除
run       在一个新的容器中运行一个命令
    -a stdin 指定标准输入输出内容类型，可选 STDIN/
    STDOUT / STDERR 三项；
    -d 后台运行容器，并返回容器ID；
    -i 以交互模式运行容器，通常与 -t 同时使用；
    -t 为容器重新分配一个伪输入终端，通常与 -i 同时使用；
    --name="nginx-lb" 为容器指定一个名称；
    --dns 8.8.8.8 指定容器使用的DNS服务器，默认和宿主一致；
    --dns-search example.com 指定容器DNS搜索域名，默认和宿主一致；
    -h "mars" 指定容器的hostname；
    -e username="ritchie" 设置环境变量；
    --env-file=[] 从指定文件读入环境变量；
    --cpuset="0-2" or --cpuset="0,1,2"
    绑定容器到指定CPU运行；
save      保存一个镜像到一个归档文件
    docker save -i "debian.tar"
    docker save -i "debian.tar"
    docker save > "debian.tar"
    将指定镜像保存成 tar 归档文件， docker load 的逆操作。保存后再加载（saved-loaded）的镜像不会丢失提交历史和层，可以回滚
    -o "debian.tar" 指定保存的镜像归档
start|stop|restart 启动、停止和重启一个或多个指定容器
    docker start|stop "p">|restart [options "o">] <container>  "o">[container...]
    -a 待完成
    -i 启动一个容器并进入交互模式；
    -t 10 停止或者重启容器的超时时间（秒），超时后系统将杀死进程。
kill      杀死一个或多个指定容器进程
    -s "KILL" 自定义发送至容器的信号
top       查看容器中运行的进程
    docker top <running_container>  "o">[ps options]
    查看一个正在运行容器进程，支持 ps 命令参数
history
    docker history  "o">[options] <image> 查看指定镜像的创建历史
    --no-trunc 显示完整的提交记录
    -q 仅列出提交记录ID
events    从服务器拉取个人动态，可选择时间区间
    ocker events [options "o">]
    docker events --since= "s2">"20141020"
    docker events --until= "s2">"20120310"
export
    docker export <container>
    docker export nginx-01 > export.tar
    将指定的容器保存成 tar 归档文件， docker import 的逆操作。导出后导入（exported-imported)）的容器会丢失所有的提交历史，无法回滚
tag
    docker tag [options "o">] <image>[:tag "o">] [repository/ "o">][username/]name "o">[:tag]
    标记本地镜像，将其归入某一仓库
    -f 覆盖已有标记。
```

| 参数                             | 说明                                                                                                                                                   |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| –api-cors-header=                | 开放远程 API 调用的 CORS 头信息。这个接口开关对想进行二次开发的上层应用提供了支持                                                                      |
| -b, –bridge=                     | 挂载以存在的网桥设备到 Docker 容器里。注意，使用 none 可以停用容器里的网络                                                                             |
| –bip=                            | 使用 CIDR 地址来设定网桥的 IP。注意，此参数和-b 不能一起使用                                                                                           |
| -D, –debug=false                 | 开启 Debug 模式。如 docker -d -D                                                                                                                       |
| -d, –daemon=false                | 开启 Daemon 模式                                                                                                                                       |
| –default-gateway=                | 容器默认网关 IPv4 地址                                                                                                                                 |
| –default-gateway-v6=             | 容器默认网关 IPv6 地址                                                                                                                                 |
| –default-ulimit=[]               | 容器设置默认 ulimits                                                                                                                                   |
| –dns=[]                          | 强制容器使用 DNS 服务器。例如：docker -d –dns 8.8.8.8                                                                                                  |
| –dns-search=[]                   | 强制容器使用指定的 DNS 搜索域名。例如：docker -d –dns-search example.com                                                                               |
| -e, –exec-driver=native          | 强制容器使用指定的运行时驱动。例如：docker -d -e lxc                                                                                                   |
| –exec-opt=[]                     | 设置执行驱动选项                                                                                                                                       |
| –exec-root=/var/run/docker       | 配置 docker 执行驱动的根目录                                                                                                                           |
| –fixed-cidr=                     | IPv4 子网设置掩码（ex:10.20.0.0.0/16）,这个子网必须嵌套于网桥子网内（由-b 或者–bip 定义）                                                              |
| –fixed-cidr-v6=                  | IPv6 子网设置掩码                                                                                                                                      |
| -G, –group=docker                | 在后台运行模式下，赋予指定的 Group 到相应的 unix socket 上。当参数–group 赋予空字符串时，将去除组信息                                                  |
| -g, –graph=/var/lib/docker       | 配置 Docker 运行时根目录                                                                                                                               |
| -H, –host=[]                     | 在后台模式下指定 socket 绑定，可以绑定一个或多个 tcp://host:port，unix:///path/to/socket,fd://\*或 fd://socketfd.例如：docker -H tcp://0.0.0.0:2375 ps |
| -h, –help=false                  | 帮助                                                                                                                                                   |
| –icc=true                        | 启用内联容器的通信                                                                                                                                     |
| –insecure-registry=[]            | 对于特定注册启用非安全通信（对于 HTTPS 没有证书校验，启用 HTTP 启用 fallback）                                                                         |
| –ip=0.0.0.0                      | 容器绑定 IP 时使用的默认 IP 地址                                                                                                                       |
| –ip-forward=true                 | 启用容器的 net.ipv4.ip_forward                                                                                                                         |
| –ip-masq=true                    | 对于网桥的 IP 段启用 ip 伪装                                                                                                                           |
| –iptables=true                   | 启用 Docker 容器自定义的 iptable 规则                                                                                                                  |
| –ipv6=false                      | 启用 IPv6 网络                                                                                                                                         |
| -l, –log-level=info              | 设置日志级别                                                                                                                                           |
| –label=[]                        | 为守护进程设置标签                                                                                                                                     |
| –log-driver=json-file            | 默认容器驱动日志                                                                                                                                       |
| –log-opt=map[]                   | 设置日志驱动选项                                                                                                                                       |
| –mtu=0                           | 设置容器网络的 MTU 值，如果没有这个参数，选用默认 route MTU，如果没有默认 route，就设置常量值 1500                                                     |
| -p, –pidfile=/var/run/docker.pid | 后台进程 PID 文件路径                                                                                                                                  |
| –registry-mirror=[]              | 指定优先使用的 Docker registry 镜像                                                                                                                    |
| -s, –storage-driver=             | 强制容器运行时使用指定的存储驱动。例如：指定使用 devicemapper， docker -d -s devicemapper                                                              |
| –selinux-enabled=false           | 启用 selinux 支持                                                                                                                                      |
| –storage-opt=[]                  | 配置存储驱动的参数                                                                                                                                     |
| –tls=false                       | 启用 TLS 默认开关                                                                                                                                      |
| –tlscacert=~/.docker/ca.pem      | 通过 CA 认证过的 certificate 文件路径                                                                                                                  |
| –tlscert=~/.docker/cert.pem      | TLS 的 certificate 文件路径                                                                                                                            |
| –tlskey=~/.docker/key.pem        | TLS 的 key 文件路径                                                                                                                                    |
| –tlsverify=false                 | 使用 TLS 并做后台进程与客户端通讯的验证                                                                                                                |
| –userland-proxy=true             | 回路使用用户代理                                                                                                                                       |
| -v, –version=false               | 显示版本信息                                                                                                                                           |
