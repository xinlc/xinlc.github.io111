---
title: 使用 Docker 搭建 GitLab CE 实现 CI
date: 2019-11-27 10:33:00
categories: Docker
tags:
  - docker
  - gitlab
  - ci/cd
---

之前有用 Jenkins 做过 `CI/CD`，但是太吃内存了，今天发现 GitLab 自带了 CI，并整合了 `K8S` 实现 `Auto DevOps`。今天尝试下用 `GitLab CI` 做持续集成。自己环境都是在 Docker 中运行，以下环境基于 `CentOS 7.7`、`Docker CE 19.03.5`、`GitLab CE 12.4.3`、`GitLab Runner 12.5.0` 搭建。

<!--more-->

## 简介

GitLab 是一套基于 Ruby 开发的开源 Git 项目管理应用，其提供的功能和 Github 类似，不同的是 GitLab 提供一个 `GitLab CE` 社区版本，用户可以将其部署在自己的服务器上，这样就可以用于团队内部的项目代码托管仓库。

### 持续集成/持续部署

持续集成是程序开发人员在频繁的提交代码之后，能有相应的环境能对其提交的代码自动执行构建（Build）、测试（Test），然后根据测试结果判断新提交的代码能否合并加入主分支当中，而持续部署也就是在持续集成之后自动将代码部署（Deploy）到生成环境上。

### GitLab CI

`GitLab CI` 是 GitLab 提供的持续集成服务(从 `8.0` 版本之后，`GitLab CI` 已经集成在 GitLab 中了)，只要在你的仓库根目录下创建一个`.gitlab-ci.yml` 文件，并为该项目指派一个 Runner，当有合并请求或者 Push 操作时，你写在 `.gitlab-ci.yml` 中的构建脚本就会开始执行。

### GitLab Runner

`GitLab Runner` 是配合 `GitLab CI` 进行构建任务的应用程序，`GitLab CI` 负责 `yml` 文件中各种阶段流程的执行，而 `GitLab Runner` 就是具体的负责执行每个阶段的脚本执行，一般来说 `GitLab Runner` 需要安装在单独的机器上通过其提供的注册操作跟 `GitLab CI` 进行绑定，当然，你也可以让其和 GitLab 安装在一起，只是有的情况下，你代码的构建过程对资源消耗十分严重的时候，会拖累 GitLab 给其他用户提供正常的 Git 服务。

## 安装 GitLab CE

docker-compose.yml：

```yaml
version: "3"

services:
  gitlab:
    image: 'gitlab/gitlab-ce:latest'
    restart: always
    ports:
      - '11080:80'
      - '11443:443'
      - '11022:22'
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro #1
      - /etc/timezone:/etc/timezone:ro #2
      - '/mnt/docker-data/gitlab/config:/etc/gitlab'
      - '/mnt/docker-data/gitlab/logs:/var/log/gitlab'
      - '/mnt/docker-data/gitlab/data:/var/opt/gitlab'
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"
```

说明：

- `#1`：挂载时间，保证主机时间和容器内时间一致（ro 代表容器内只读）
- `#2`：挂载时区

> 注意：生产环境要限制cpu和内存

### 修改 external_url 带端口号

官方的 `docker-compose.yml` 配置，不能加端口号，否则不好用。

```yaml
environment:
    GITLAB_OMNIBUS_CONFIG: |
      external_url 'https://gitlab.example.com'
```

解决：

```bash
# 第一种
## 修改 docker-compose.yml 为
gitlab:
  hostname: "192.168.0.80:11080" # 这里定义容器主机名，GitLab 默认使用了主机名作为 url
  environment:
    GITLAB_OMNIBUS_CONFIG: |
      # external_url 'http://192.168.0.80:11080'
      gitlab_rails["time_zone"] = "Asia/Shanghai"
      nginx["listen_port"] = 80

# 第二种
## 1. 修改 /etc/gitlab/gitlab.rb 配置，修改 external_url 替换成自己的ip和端口或域名。
vim /mnt/docker-data/gitlab/config/gitlab.rb
external_url 'http://192.168.0.80:11080'
nginx['listen_port'] = 11080

# 2. 修改 docker-compose.yml，ports: 11080:11080，重新运行容器

# 第三种
## 1. 进入容器修改配置，gitlab：host，port 等
vi /opt/gitlab/embedded/service/gitlab-rails/config/gitlab.yml

## 2. 然后运行
gitlab-ctl restart

```

## 安装 GitLab Runner

docker-compose.yml：

```yaml
version: "3"

services:
  gitlab-runner:
    image: 'gitlab/gitlab-runner:latest'
    restart: always
    volumes:
      - /usr/share/zoneinfo/Asia/Shanghai:/etc/localtime:ro
      - /etc/timezone:/etc/timezone:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - '/mnt/docker-data/gitlab-runner/config:/etc/gitlab-runner'
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "2"
```

## 配置 Maven 项目 GitLab Runner

Java Maven 项目

```bash
# 进入容器
$ docker-compose exec gitlab-runner bash

# 注册 runner，相关参数可以从 GitLab项目 -> Settings -> CI/CD -> Runners 中获取
root@centos01:/# gitlab-runner register
Runtime platform                                    arch=amd64 os=linux pid=50 revision=577f813d version=12.5.0
Running in system-mode.

Please enter the gitlab-ci coordinator URL (e.g. https://gitlab.com/):
http://192.168.0.80:11080/
Please enter the gitlab-ci token for this runner:
2y2F4cCSxF8rwJ4z8FY3
Please enter the gitlab-ci description for this runner:
[742ec4ad6000]: test
Please enter the gitlab-ci tags for this runner (comma separated):
test
Registering runner... succeeded                     runner=2y2F4cCS
Please enter the executor: parallels, shell, ssh, docker+machine, custom, docker, docker-ssh, virtualbox, docker-ssh+machine, kubernetes:
docker
Please enter the default Docker image (e.g. ruby:2.6):
maven:3-jdk-8
Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!

```

修改配置

```bash
vim /mnt/docker-data/gitlab-runner/config/config.toml

concurrent = 1
check_interval = 0

[session_server]
  session_timeout = 1800

[[runners]]
  name = "test"
  url = "http://192.168.0.80:11080/"
  token = "1Jmx4mYYDLKHiycq8zvx"
  executor = "docker"
  [runners.custom_build_dir]
  [runners.docker]
    tls_verify = false
    image = "maven:3-jdk-8"
    privileged = true #1
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache", "/mnt/docker-data/.m2:/root/.m2"] #2
    shm_size = 0
  [runners.cache]
    [runners.cache.s3]
    [runners.cache.gcs]

# 重启 docker 容器
```

说明：

- `#1`：docker:dind 需要提升权限，[use-docker-in-docker-with-privileged-mode](https://docs.gitlab.com/runner/executors/docker.html#use-docker-in-docker-with-privileged-mode)
- `#2`：挂载到本地 maven 仓库，可以配置镜像源等等。

## 配置 Maven 项目 GitLab CI

在项目根目录下新建 `.gitlab-ci.yml`

```yaml
image: maven:3-jdk-8  #1
variables:  #2
  DOCKER_HOST: tcp://192.168.0.80:2375
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ''
  MAVEN_CLI_OPTS: "-s /root/.m2/settings.xml --batch-mode"
  MAVEN_OPTS: "-Dmaven.repo.local=/root/.m2/repository"
  TAG: test/test:v1
  
cache:  #3
  paths:
    # - /root/.m2/repository/
    - demo/target/

services:  #4
  - docker:dind
  
stages:  #5
  - package
  - deploy
  
maven-package-job:  #6
  stage: package
  tags:
    - test
  script:
    - mvn clean package -Dmaven.test.skip=true
  artifacts:
    paths:
      - aid-supplier/target/*.jar #7

build-master-job:
  stage: deploy
  image: docker:dind #8
  tags:
    - test
  script:
    - docker build -t $TAG -f demo/Dockerfile demo
    - echo "success"
  only:
    - master

```

说明：

- `#1`：默认全局镜像
- `#2`：配置的一些环境变量
- `#3`：配置缓存
- `#4`：配置需要用到的额外的服务 docker:dind，打包 docker 时需要用到，服务就是运行时。
- `#5`：Stages 表示构建阶段，是一些按序执行的流程，具体执行是依赖于 Jobs。
- `#6`：定义的 Jobs 之一，用于构建 jar 包。
- `#7`：工件，就是在依赖项之间传递的东西，以便后面job使用。我这里是聚合项目，配置的是构建一个子项目。
- `#8`：当前阶段用到的镜像，其实就是能执行镜像里提供的命令。

### 问题

1. 使用 `docker:dind` 报错

```bash
$ docker ps
Cannot connect to the Docker daemon at tcp://docker:2375. Is the docker daemon running?
ERROR: Job failed: exit code 1
```

解决：

`gitlab-ci.yml` 加入：

```bash
variables:
  DOCKER_HOST: tcp://192.168.0.80:2375
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ''
```

修改 `docker.service`：

```bash
vim /usr/lib/systemd/system/docker.service
# ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
ExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix://var/run/docker.sock

# 加载docker守护线程
systemctl daemon-reload

# 重启docker
systemctl restart docker

# 防火墙开放端口
firewall-cmd --zone=public --add-port=2375/tcp --permanent
firewall-cmd --reload

```

> 参考：[https://gitlab.com/charts/gitlab/issues/1477](https://gitlab.com/charts/gitlab/issues/1477)，[https://gitlab.com/gitlab-org/gitlab-runner/issues/4501#per-job](https://gitlab.com/gitlab-org/gitlab-runner/issues/4501#per-job)

## 扩展

`GitLab CI` 相比 Jenkins 已经简化了很多。这里介绍另一个持续集成系统，[Drone](https://github.com/drone/drone) 是一个基于 Docker 的持续部署系统，用 Go 语言编写。`Drone` 本身和所有插件都是镜像，易于使用。[https://drone.io/](https://drone.io/)

## 参考

- [什么是 CI/CD？](https://www.redhat.com/zh/topics/devops/what-is-ci-cd)
- [gitlab docker](https://docs.gitlab.com/omnibus/docker/)
- [gitlab ci](https://docs.gitlab.com/ce/ci/README.html)
- [gitlab cit yaml](https://docs.gitlab.com/ce/ci/yaml/README.html)
- [gitlab runner](https://docs.gitlab.com/runner/)
