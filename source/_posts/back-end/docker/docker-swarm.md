---
title: Docker 三剑客之 Docker Swarm
date: 2019-11-21 21:50:00
categories: Docker
tags:
  - docker
---

Docker Swarm 是 Docker 官方三剑客项目之一，提供 Docker 容器集群服务，是 Docker 官方对容器云生态进行支持的核心方案。

使用它，用户可以将多个 Docker 主机封装为单个大型的虚拟 Docker 主机，快速打造一套容器云平台。

Swarm mode 内置 kv 存储功能，提供了众多的新特性，比如：具有容错能力的去中心化设计、内置服务发现、负载均衡、路由网格、动态伸缩、滚动更新、安全传输等。使得 Docker 原生的 Swarm 集群具备与 Kubernetes、Mesos 竞争的实力。

<!--more-->

## 基本概念

Swarm 是使用 [SwarmKit](https://github.com/docker/swarmkit/) 构建的 Docker 引擎内置（原生）的集群管理和编排工具。

使用 Swarm 集群之前需要了解以下几个概念。

### 节点

运行 Docker 的主机可以主动初始化一个 Swarm 集群或者加入一个已存在的 Swarm 集群，这样这个运行 Docker 的主机就成为一个 Swarm 集群的节点 (node) 。

节点分为管理 (manager) 节点和工作 (worker) 节点。

管理节点用于 Swarm 集群的管理，`docker swarm` 命令基本只能在管理节点执行（节点退出集群命令 `docker swarm leave` 可以在工作节点执行）。一个 Swarm 集群可以有多个管理节点，但只有一个管理节点可以成为 leader，leader 通过 raft 协议实现。

工作节点是任务执行节点，管理节点将服务 (service) 下发至工作节点执行。管理节点默认也作为工作节点。你也可以通过配置让服务只运行在管理节点或工作节点。生产环境建议服务只运行在工作节点，这样即使管理节点宕掉也不会影响服务运行，执行 `docker node update --availability drain manager` 使服务不部署在管理节点上。

来自 Docker 官网的这张图片形象的展示了集群中管理节点与工作节点的关系。

![1][1]

### 服务和任务

任务 （Task）是 Swarm 中的最小的调度单位，目前来说就是一个单一的容器。

服务 （Services） 是指一组任务的集合，服务定义了任务的属性。服务有两种模式：

- `replicated services` 按照一定规则在各个工作节点上运行指定个数的任务。
- `global services` 每个工作节点上运行一个任务

两种模式通过 `docker service create` 的 `--mode` 参数指定。

来自 Docker 官网的这张图片形象的展示了容器、任务、服务的关系。

![2][2]

任务与调度

![3][3]

服务副本与全局服务

![4][4]

## 创建 swarm 集群

集群节点之间保证 TCP 2377、TCP/UDP 7946 和 UDP 4789 端口通信

- TCP 端口 2377 集群管理端口；
- TCP 与 UDP 端口 7946 节点之间通讯端口；
- TCP 与 UDP 端口 4789 overlay 网络通讯端口；

```bash
# CentOS 7 配置防火墙
firewall-cmd --zone=public --add-port=2377/tcp --permanent
firewall-cmd --zone=public --add-port=7946/tcp --permanent
firewall-cmd --zone=public --add-port=7946/udp --permanent
firewall-cmd --zone=public --add-port=4789/tcp --permanent
firewall-cmd --zone=public --add-port=4789/udp --permanent
firewall-cmd --reload
```

为了方便演示，这里使用 Docker Machine 创建 一个 Manager 节点和两个 Worker 节点。

创建管理节点并初始化集群

```bash
docker-machine create -d virtualbox manager
```

使用 `docker swarm init` 在管理节点初始化一个 Swarm 集群

```bash
$ docker-machine ssh manager

docker@manager:~$ docker swarm init --advertise-addr 192.168.99.101
Swarm initialized: current node (2huj5pkeuip0yu9vu8wcp4q7x) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-0sntadyqdf0epdptj6x32r9q18d1a0j6m4p5p5w1tz1c3q78ld-d7fa0b99vfzveggesu88lq05f 192.168.99.101:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

如果你的 Docker 主机有多个网卡，拥有多个 IP，必须使用 `--advertise-addr` 指定 IP。

> 执行 `docker swarm init` 命令的节点自动成为管理节点。

创建工作节点并加入集群

```bash
$ docker-machine create -d virtualbox worker1

$ docker-machine ssh worker1

docker@worker1:~$ docker swarm join \
    --token SWMTKN-1-0sntadyqdf0epdptj6x32r9q18d1a0j6m4p5p5w1tz1c3q78ld-d7fa0b99vfzveggesu88lq05f \
    192.168.99.101:2377

This node joined a swarm as a worker.
```

```bash
$ docker-machine create -d virtualbox worker2

$ docker-machine ssh worker2

docker@worker2:~$ docker swarm join \
    --token SWMTKN-1-0sntadyqdf0epdptj6x32r9q18d1a0j6m4p5p5w1tz1c3q78ld-d7fa0b99vfzveggesu88lq05f \
    192.168.99.101:2377

This node joined a swarm as a worker.
```

在管理节点使用 `docker node ls` 查看集群

```bash
docker@manager:~$ docker node ls
ID                            HOSTNAME            STATUS              AVAILABILITY        MANAGER STATUS      ENGINE VERSION
2huj5pkeuip0yu9vu8wcp4q7x *   manager             Ready               Active              Leader              19.03.5
ygfa4uatifir9h0mvryx0mdk4     worker1             Ready               Active                                  19.03.5
awk7ubm92whmdn3cqrn412x5h     worker2             Ready               Active                                  19.03.5
```

## 部署服务

使用 docker service 命令来管理 Swarm 集群中的服务，该命令只能在管理节点运行。

```bash
# 部署 3 个 nginx 服务
docker service create \
                --name web \
                --replicas 3 \
                --publish published=80,target=80 \
                nginx:latest
```

使用浏览器，输入任意节点 IP ，即可看到 nginx 默认页面。

> 使用私有镜像仓库需要先 login，创建服务时加 `--with-registry-auth` 参数

查看服务

```bash
docker service ls
docker service ps web
```

服务伸缩

```bash
# 扩展服务运行数量
docker service scale web=5

# 减少服务容器运行数量
docker service scale nginx=2

# 删除服务
docker service rm web
```

## 管理秘钥

在动态的、大规模的分布式集群上，管理和分发 密码、证书 等敏感信息是极其重要的工作。传统的密钥分发方式（如密钥放入镜像中，设置环境变量，volume 动态挂载等）都存在着潜在的巨大的安全风险。

Docker 目前已经提供了 secrets 管理功能，用户可以在 Swarm 集群中安全地管理密码、密钥证书等敏感数据，并允许在多个 Docker 容器实例之间共享访问指定的敏感数据。

> 注意：secret 也可以在 Docker Compose 中使用。

### 创建 secret

使用 `docker secret create` 命令以管道符的形式创建 secret

```bash
$ openssl rand -base64 20 | docker secret create mysql_password -

$ openssl rand -base64 20 | docker secret create mysql_root_password -

# 查看创建好的秘钥
$ docker secret ls
```

创建 MySQL 服务

```bash
$ docker network create -d overlay mysql_private

$ docker service create \
     --name mysql \
     --replicas 1 \
     --network mysql_private \
     --mount type=volume,source=mydata,destination=/var/lib/mysql \
     --secret source=mysql_root_password,target=mysql_root_password \
     --secret source=mysql_password,target=mysql_password \
     -e MYSQL_ROOT_PASSWORD_FILE="/run/secrets/mysql_root_password" \
     -e MYSQL_PASSWORD_FILE="/run/secrets/mysql_password" \
     -e MYSQL_USER="wordpress" \
     -e MYSQL_DATABASE="wordpress" \
     mysql:latest
```

> 如果你没有在 target 中显式的指定路径时，secret 默认通过 tmpfs 文件系统挂载到容器的 /run/secrets 目录中。

创建 wordpress 服务

```bash
$ docker service create \
     --name wordpress \
     --replicas 1 \
     --network mysql_private \
     --publish target=30000,port=80 \
     --mount type=volume,source=wpdata,destination=/var/www/html \
     --secret source=mysql_password,target=wp_db_password,mode=0400 \
     -e WORDPRESS_DB_USER="wordpress" \
     -e WORDPRESS_DB_PASSWORD_FILE="/run/secrets/wp_db_password" \
     -e WORDPRESS_DB_HOST="mysql:3306" \
     -e WORDPRESS_DB_NAME="wordpress" \
     wordpress:latest
```

## 管理配置信息

在动态的、大规模的分布式集群上，管理和分发配置文件也是很重要的工作。传统的配置文件分发方式（如配置文件放入镜像中，设置环境变量，volume 动态挂载等）都降低了镜像的通用性。

在 Docker 17.06 以上版本中，Docker 新增了 docker config 子命令来管理集群中的配置信息，以后你无需将配置文件放入镜像或挂载到容器中就可实现对服务的配置。config 仅能在 Swarm 集群中使用并且需 Swarm Manager 权限才能操作。

在 Swarm 中添加一个 Config 时，Docker 通过 TLS 连接把 Config 发送给 Swarm Manager。这个 Config 经过加密后，存储在 Raft 日志中，而且整个 Raft 日志会被复制到其他 Manager 中，确保 Config 的高可用性。

在新创建的或正在运行的服务添加 Config 时，Config 将作为文件安装到容器中，文件路径默认为 linux 容器中的 `/<config-name>`。可以在任何时候通过更新服务的方式授权其他的 Config 或移除已有的 Config 访问权。

如果节点是 Swarm Manager，或者正在运行服务任务已被授权访问这个 Config，那么这个节点才能访问这个配置。当容器任务停止运行时，共享给它的 Config 将从该容器的内存文件系统中卸载，并从节点的内存刷新。

如果一个节点运行了一个带 Config 的任务容器，在它失去与 Swarm 的连接后，这个任务容器仍然可以访问其 Config，但只有在节点重新连接到 Swarm 时才能接收更新。

正在运行的服务正在使用的 Config 不能删除。想要在不中断正在运行的服务的情况下删除配置可以参考 [《Rotate a config》](https://docs.docker.com/engine/swarm/configs/#example-rotate-a-config)。

为了更容易地更新或回退 Config，可以考虑在 Config Name 中添加版本号或日期。

如需更新 Stack ，可以更改 Compose file，然后重新运行 docker stack deploy -c `<new-compose-file> <stack-name>`。如果 Compose file 使用新的 Config ，那么 services 将开始使用这些配置。

> 注意：配置是不可变的，所以无法更改现有服务的文件，可以创建一个新的 Config 来使用不同的文件。

这里以在 Swarm 集群中部署 redis 服务为例。

### 创建 config

```bash
# 新建 redis.conf 文件
echo "port 6380" > redis.conf

# 创建 config
docker config create redis.conf redis.conf

# 查看 config
docker config ls

# 创建 redis 服务
$ docker service create \
     --name redis \
     # --config source=redis.conf,target=/etc/redis.conf \
     --config redis.conf \
     -p 6379:6380 \
     redis:latest \
     redis-server /redis.conf

# 创建 ngxin 服务
# $ docker service create \
#      --name nginx \
#      --secret site.key \
#      --secret site.crt \
#      --config source=site.conf,target=/etc/nginx/conf.d/site.conf,mode=0440 \
#      --publish published=3000,target=443 \
#      nginx:latest \
#      sh -c "exec nginx -g 'daemon off;'"
```

> 如果你没有在 target 中显式的指定路径时，默认的 redis.conf 以 tmpfs 文件系统挂载到容器的 /config.conf。

#### compose-file

- [compose-file-configs](https://docs.docker.com/compose/compose-file/#configs)
- [swarm-configs](https://docs.docker.com/engine/swarm/configs/)

```yaml
version: "3.3"
services:
  redis:
    image: redis:latest
    deploy:
      replicas: 1
    configs:
      - my_config
      - my_other_config
configs:
  my_config:
    file: ./my_config.txt
  my_other_config:
    external: true
```

```yaml
version: "3.7"

services:
  nginx-router:
    image: nginx:1.17.3
    ports:
      # - "9080:80"
      - mode: host    # host 适合做入口（代理），不走集群的负载(ingress 网络)
        protocol: tcp
        published: 9080
        target: 80
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf
        # 将模式设置为0440，以便该文件只能由其所有者和所有者的组读取，而不能由所有人读取。
        mode: 0440
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
    deploy:
      mode: global
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: "2"
          memory: 512M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

configs:
  nginx_config:
    file: ./data/nginx/nginx.conf
```

**注意**：修改 nginx.conf 没有生效，需要 stack rm 重新 deploy。

```bash
docker stack rm nginx-router
docker stack deploy -c docker-compose.yml nginx-router
```

或使用 Rotate 方式，创新的 conf 更新 service：

```bash
# 使用 site.conf 名为的新文件创建新的 Docker 配置 site-v2.conf。
docker config create site-v2.conf site.conf

# 更新nginx服务以使用新配置。
docker service update \
  --config-rm site.conf \
  --config-add source=site-v2.conf,target=/etc/nginx/conf.d/site.conf,mode=0440 \
  nginx
```

## Stack 多服务编排

之前 swarm 集群中 `docker service create` 一次只能部署一个微服务，我们可以使用 `docker stack + compose` 一次启动多个服务。

stack 是一组相互关联的服务，它是服务的上一层，这些服务共享依赖关系，并且可以一起编排和缩放。单个 stack 能够定义和协调整个应用程序的功能，简单来说 stack 就是一组服务的集合。

创建 docker-compose.yml，并创建 volumes 相关文件。

```yaml
version: "3.8"

services:
  web:
    image: nginx:latest
    ports:
      - "8081:80"
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    deploy:
      mode: replicated
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: "0.5"
          memory: 1024M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

  portainer:
    image: portainer/portainer:latest
    ports:
      - "9000:9000"
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/docker-data/portainer_data:/data

    deploy:
      placement:
        constraints: [node.role == manager]
      resources:
        limits:
          cpus: "0.5"
          memory: 1024M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

  visualizer:
    image: dockersamples/visualizer:latest
    ports:
      - "9001:8080"
    stop_grace_period: 1m30s
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - /var/run/docker.sock:/var/run/docker.sock
    deploy:
      placement:
        constraints: [node.role == manager]
      resources:
        limits:
          cpus: "0.5"
          memory: 1024M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

  xxx-service:
    image: xxx-server:1.0.0-RELEASE
    ports:
      - "8800:8080"
    networks:
      - backend
    env_file:
      - ./mysql.env
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
    deploy:
      mode: replicated
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        order: start-first
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: "1"
          memory: 1024M
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"

networks:
  backend:

```

mysql.env：

```env
MYSQL_SERVICE_HOST=mysql
MYSQL_SERVICE_DB_NAME=devtest
MYSQL_SERVICE_PORT=3306
MYSQL_SERVICE_USER=root
MYSQL_SERVICE_PASSWORD=123456
```

> 注意：挂载时区避免时间不准，如果没有 timezone 文件，执行：`echo "Asia/Shanghai" > /etc/timezone`

portainer 是 docker swarm 集群容器管理页面，可管理 Docker 容器、image、volume、network 等，当然我们还可以在其页面上添加多个 stack。

visualizer 服务提供一个可视化页面，我们可以从浏览器中很直观的查看集群中各个服务的运行节点。

```bash
# 创建 overlay 网络, --attachable 允许 docker run 的方式加入该网络
docker network create --driver=overlay --attachable backend

# 部署或更新
docker stack deploy -c docker-compose.yml test-service

# 如果使用了私用镜像仓库先 login，再加入 --with-registry-auth
docker stack deploy --with-registry-auth -c docker-compose.yml test-service

# 查看
docker stack ls
docker stack ps test-service

# 如果部署失败可以用 ps 查看错误
docker stack ps test-service --format "table {{.ID}}\t{{.Name}}\t{{.Error}}" --no-trunc
```

访问 http://192.168.99.101:9000/ 查看管理服务。  
访问 http://192.168.99.101:9001/ 查看监控服务。

> 生产环境需要定期清理节点镜像，可以使用 crontab 定时执行 `docker image prune -f`

## 常用命令

### docker swarm 常用命令

- `docker swarm init` 初始化集群；
- `docker swarm join-token worker` 查看工作节点的 token；
- `docker swarm join-token manager` 查看管理节点的 token；
- `docker swarm join` 加入集群中；
- `docker swarm update --task-history-limit 2` 减少历史任务，节省资源；

### docker node 常用命令

- `docker node ls` 查看所有集群节点；
- `docker node rm` 删除某个节点（-f 强制删除）；
- `docker node inspect` 查看节点详情；
- `docker node demote` 节点降级，由管理节点降级为工作节点；
- `docker node promote` 节点升级，由工作节点升级为管理节点；
- `docker node update` 更新节点；
- `docker node ps` 查看节点中的 Task 任务；
- `docker node update --availability drain manager` 管理阶段不部署服务 ("active"|"pause"|"drain")

### docker service 常用命令

- `docker service create` 部署服务；
- `docker service inspect` 查看服务详情；
- `docker service logs` 产看某个服务日志；
- `docker service ls` 查看所有服务详情；
- `docker service rm` 删除某个服务（-f 强制删除）；
- `docker service scale` 设置某个服务个数；
- `docker service update` 更新某个服务；
- `docker service rollback` 回滚某个服务；

### docker stack 常用命令

- `docker stack deploy` 部署新的堆栈或更新现有堆栈；
- `docker stack ls` 列出现有堆栈；
- `docker stack ps` 列出堆栈中的任务；
- `docker stack rm` 删除堆栈；
- `docker stack services` 列出堆栈中的服务；
- `docker stack down` 移除某个堆栈（不会删除数据）；

## 问题

### Overlay 网络 ipvs 性能问题

并发压测性能极差，扩容服务也不能解决。

- [[SWARM]Very poor performance for ingress network with lots of parallel requests](https://github.com/moby/moby/issues/35082/)
- [Pauses/delays with overlay network on swarm](https://github.com/moby/moby/issues/31746/)

**监控 ipvs 命令：**

```bash

nsenter --net=/var/run/docker/netns/ingress_sbox ipvsadm -l

nsenter --net=/var/run/docker/netns/ingress_sbox cat /proc/net/ip_vs_conn | head

watch -n 0.5 "sudo nsenter --net=/var/run/docker/netns/ingress_sbox cat /proc/net/ip_vs_conn | grep TIME_WAIT | wc -l"

sysctl -a | egrep "net.ipv4.vs.conntrack|net.ipv4.vs.conn_reuse_mode|expire_nodest_conn"
```

**解决方案一：**

```bash
sudo nsenter --net=/var/run/docker/netns/{your_load_balancer} sysctl -w net.ipv4.vs.conn_reuse_mode=0
sudo nsenter --net=/var/run/docker/netns/{your_load_balancer} sysctl -w net.ipv4.vs.expire_nodest_conn=1

# 解决
# nsenter --net=/var/run/docker/netns/ingress_sbox
# sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=3
```

```diff
- net.ipv4.vs.conn_reuse_mode = 1
- net.ipv4.vs.conntrack = 0
- net.ipv4.vs.expire_nodest_conn = 0

+ net.ipv4.vs.conntrack = 1
+ net.ipv4.vs.conn_reuse_mode = 0
+ net.ipv4.vs.expire_nodest_conn = 1
```

**解决方案二：**

使用 dnsrr 网络模式

```yaml
version: '3.8'
services:
  server:
    image: "server:latest"
    stop_grace_period: 10s
    networks:
      - backend-network
    deploy:
      replicas: 2
      endpoint_mode: dnsrr
networks:
  backend-network:
    external: true
```

> 注：dnsrr 不支持暴露端口。

## 参考

- [docker swarm](https://docs.docker.com/engine/swarm/)
- [swarm admin guide](https://docs.docker.com/engine/swarm/admin_guide/)
- [docker practice](https://yeasy.gitbooks.io/docker_practice/content/swarm_mode/overview.html)
- [docker compose file](https://docs.docker.com/compose/compose-file/)
- [Docker Swarm - 服务发现和负载均衡原理](https://www.jianshu.com/p/dba9342071d8)
- [Docker Swarm - 配置管理](https://www.jianshu.com/p/1e6828fd8947/)

[1]: /images/docker/docker-swarm/1.png
[2]: /images/docker/docker-swarm/2.png
[3]: /images/docker/docker-swarm/3.png
[4]: /images/docker/docker-swarm/4.png
