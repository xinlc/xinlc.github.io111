---
title: Docker Swarm 中获得真实的客户IP
date: 2019-11-17 21:20:00
categories: Docker
tags:
  - docker
---

如果您曾经使用过 Docker Swarm，一定会被它简单到爆炸的创建和操作方式些微震撼过，他还不能和K8s这么强力的工具对抗，但是对于一些小型的集群，这个自带的集群模式实在太有诱惑力了。

因为他自带了负载均衡等一系列功能，客户访问集群服务时，程序是无法获得用户的真实IP的（只能获得一系列的overlay网络ip），如果仅仅是做内部系统的微服务，那是一点问题都没有，但是如果直接提供API给外网访问，很多时候程序中获得客户端IP对于限流、日志都是有好处的。

<!--more-->

## 问题概述

最近在项目中遇到一个问题，因为业务要求，需要在服务中获取到客户端IP，但是在项目开发部署过程中发现利用`java -jar ***.jar`单独运行服务，或者打成镜像再`docker run`启动的服务都可以正确的获取到client IP，但是当采用`docker stack deploy`发布到docker swarm集群的时候，服务却获取不到正确的client IP了，得到的都是`10.255.x.x`这样的IP。

## Docker Swarm 接收外部请求的处理流程

Docker swarm利用ingress overlay网络处理外部请求，并利用IPVS做外部负载均衡。[更多参考 Docker Swarm 之 服务发现和负载均衡原理](https://xinlichao.cn/back-end/docker/docker-swarm-lb/)

IPVS有三种NAT、IP Tunneling和 DR：

- NAT工作模式，简单来说就是传统的NAT，进出流量都需要经过调度器，调度器会选择一个目的服务器，将进入流量的目标IP改写为负载均衡到的目标服务器，同时源IP地址也会改为调度器IP地址。机制简单，但限制大，IPVS需要维护每个映射关系，而且进出入流量都需要经过调度器，实际上这个会成为瓶颈。
- TUN工作模式，即IP Tunneling模式。这种模式中，调度器将进入的包重新包成一个IP包，然后发送给选定的目的服务器，目的服务器处理后，直接将应答发送给客户（当然该重新封装的报文的源IP地址还是要填成调度器的）。
- DR工作模式，即Direct Routing模式。这种模式中，调度器直接重写进入包的mac地址，将其改为选定的目标服务器的mac地址，这样就可以到达服务器。但这样的话需要要求IPVS服务器需要和真实服务器在同一局域网内，且真实服务器必须有真实网卡（这样重写了mac地址的报文才可以才可以到达该服务器）

### docker ingress网络的选择

Docker ingress为了满足所有节点都可以接收请求，即便是没有相应服务的节点也要能提供服务（routing mesh），采用了NAT模式，请求进入ingress网络后，会把源地址修改成收到请求的节点的ingress 网络的IP地址,默认情况下是`10.255.x.x`，再找到具体服务所在的节点，把请求转发过去，把目标地址改成真正服务对应的IP，返回时也是先返回到接收请求的节点再返回到客户端，所有在docker swarm里面的服务获取不到真实的client ip。

## 解决方法

这个问题在docker的issues中有很多人讨论，具体可以看[Unable to retrieve user's IP address in docker swarm mode #25526](https://github.com/moby/moby/issues/25526)，幸运的是docker 在docker engine 1.3.0中追加了一个新的特性 --publish可以指定mode=host，用来绕过ingress网络，根据这个特性，解决思路是在所有的服务外层利用nginx或zuul等做一个反向代理，并且这个代理不能用`docker stack deploy`的形式启动，要用`server create`的方式启动，并且要指定publish的mode=host。compose文件在3.2版本中才加入了ports的新语法来支持这个host模式，需要docker engine在17.04.0及以上版本才能支持。

使用zuul，具体的启动命令是

```bash
docker service create --name zuu-server --publish "mode=host,target=8080,published=8080" --mode global --network mynet image/zuul:1.0.0  
```

说明：

- 因为用了mode=host应用就不会利用ingress网络，所以服务对应的task在哪个节点上那个节点才能接收外部请求，为了还要满足在任意节点上都可以访问到服务，所以把发布模式定义成了global
- zuul接到请求后单纯的根据配置把请求转发到具体的服务，为了能在zuul中能发现其他的服务，zuul还必须在自建的mynet网络里面

除了用service create方式外，还可以用docker run的方式绕过ingress网络，方法如下

- 创建attachable overlay network：`docker network create --attachable  --driver overlay --subnet 10.0.0.1/16 mynet`
- `docker run -d -p 8080:8080 --name zuuServer --net mynet image/zuul:1.0.0`

具体应用服务获取客户端IP的代码片段：

```java
String ips = request.getHeader("x-forwarded-for");  
if (StringUtils.isEmpty(ips)) {  
    ips = request.getHeader("Proxy-Client-IP");  
}  
if (StringUtils.isEmpty(ips)) {  
    ips = request.getHeader("WL-Proxy-Client-IP");  
}  
if (StringUtils.isEmpty(ips)) {  
    ips = request.getRemoteAddr();  
}  
String ip = Arrays.stream(ips.split(",")).filter(ip-> ! StringUtils. equalsIgnoreCase("unkonwn",ip)).findFirst().get();  
```

如果用nginx：

```bash
docker service update nginx_proxy \  
    --publish-rm 80 \  
    --publish-add "mode=host,published=80,target=80" \  
    --publish-rm 443 \  
    --publish-add "mode=host,published=443,target=443"  
```

我们把nginx上对外绑定的端口使用host模式，这样相当于使用了真实的网卡，就可以把客户ip传递到后面的程序中去了。

或者使用配置文件：

```yaml
version: '3.4'
 services:
   nginx:
     ports:
       - mode: host
         protocol: tcp
         published: 80
         target: 80
       - mode: host
         protocol: tcp
         published: 443
         target: 81
```

用Nginx进行域名转发后加参数：

```conf
server {
  listen 80;//端口
  server_name your.domain.com;//域名

  location / {
    proxy_pass http://your-service:80;
    # proxy_set_header    Host             $host:$server_port;//转发后端口别忘了
    proxy_set_header    Host             $host;
    proxy_set_header    X-Real-IP        $remote_addr;
    proxy_set_header    X-Forwarded-For  $proxy_add_x_forwarded_for;
    proxy_set_header    HTTP_X_FORWARDED_FOR $remote_addr;//关键句
    proxy_set_header    X-Forwarded-Proto $scheme;
    proxy_read_timeout  90;
    proxy_redirect      default;
  }
}
```

如果使用了类似[Traefik](https://github.com/containous/traefik)之类的网关，那么我们可以让Traefik连入host网络，如下：

```yaml
version: "3.3"

services:

  traefik:
    image: "traefik:v2.0.0-rc3"
    container_name: "traefik"
    # command: --docker \
    #   --docker.swarmMode \
    #   --docker.watch
    command:
      #- "--log.level=DEBUG"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.endpoint=unix:///var/run/docker.sock"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    networks:
      - traefik-net
    # ports:
    #   - "80:80"
    #   - "8080:8080"
    ports:
      - target: 80
        published: 80
        protocol: tcp
        mode: host
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  whoami:
    image: "containous/whoami"
    container_name: "simple-service"
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.whoami.rule=HostRegexp(`{any:.*}`)"
        - "traefik.http.routers.whoami.entrypoints=web"
        - "traefik.http.services.whoami.loadbalancer.server.port=80"
```

这样我们就可以从 ‘X_REAL_IP’的Header中获取真实ip了，虽然略麻烦了一点，但总是可以用了。

## 参考

- https://github.com/moby/moby/issues/25526/
- https://docs.docker.com/compose/compose-file/
