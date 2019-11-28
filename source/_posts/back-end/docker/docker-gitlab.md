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

### 持续集成(CI)/持续部署(CD)

持续集成是程序开发人员在频繁的提交代码之后，能有相应的环境能对其提交的代码自动执行构建（Build）、测试（Test），然后根据测试结果判断新提交的代码能否合并加入主分支当中，而持续部署也就是在持续集成之后自动将代码部署（Deploy）到生产环境上。

### GitLab CI

`GitLab CI` 是 GitLab 提供的持续集成服务(从 `8.0` 版本之后，`GitLab CI` 已经集成在 GitLab 中了)，只要在你的仓库根目录下创建一个`.gitlab-ci.yml` 文件，并为该项目指派一个 Runner，当有合并请求或者 Push 操作时，你写在 `.gitlab-ci.yml` 中的构建脚本就会开始执行。

#### Pipeline

Pipeline 相当于一个构建任务，里面可以包含多个流程，如依赖安装、编译、测试、部署等。任何提交或者 Merge Request 的合并都可以触发 Pipeline。

#### Stages

Stage 表示构建的阶段，即上面提到的流程。

- 所有 Stages 按顺序执行，即当一个 Stage 完成后，下一个 Stage 才会开始。
- 任一 Stage 失败，后面的 Stages 将永不会执行，Pipeline 失败。
- 只有当所有 Stages 完成后，Pipeline 才会成功。

#### Jobs

Job 是 Stage 中的任务。

- 相同 Stage 中的 Jobs 会并行执行。
- 任一 Job 失败，那么 Stage 失败，Pipeline 失败。
- 相同 Stage 中的 Jobs 都执行成功时，该 Stage 成功。

### GitLab Runner

`GitLab Runner` 是配合 `GitLab CI` 进行构建任务的应用程序，`GitLab CI` 负责 `yml` 文件中各种阶段流程的执行，而 `GitLab Runner` 就是具体的负责执行每个阶段的脚本执行，一般来说 `GitLab Runner` 需要安装在单独的机器上通过其提供的注册操作跟 `GitLab CI` 进行绑定，当然，你也可以让其和 GitLab 安装在一起，只是有的情况下，你代码的构建过程对资源消耗十分严重的时候，会拖累 GitLab 给其他用户提供正常的 Git 服务。

#### Runner 类型

GitLab-Runner可以分类两种类型：Shared Runner（共享型）和Specific Runner（指定型）。

- `Shared Runner`：所有工程都能够用的，且只有系统管理员能够创建。
- `Specific Runner`：只有特定的项目可以使用。

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

- `#1`：挂载时间，保证主机时间和容器内时间一致（ro 代表容器内只读）。
- `#2`：挂载时区。

> 注意：生产环境要限制cpu和内存。

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

- `#1`：docker:dind 需要提升权限，[use-docker-in-docker-with-privileged-mode](https://docs.gitlab.com/runner/executors/docker.html#use-docker-in-docker-with-privileged-mode)。
- `#2`：挂载到本地 maven 仓库，可以配置镜像源等等。

## 配置 Maven 项目 GitLab CI

在项目根目录下新建 `.gitlab-ci.yml`

```yaml
image: maven:3-jdk-8  #1
variables:  #2
  DOCKER_HOST: tcp://192.168.0.80:2375 # 3
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ''
  MAVEN_CLI_OPTS: "-s /root/.m2/settings.xml --batch-mode"
  MAVEN_OPTS: "-Dmaven.repo.local=/root/.m2/repository"
  TAG: test/test:v1
  
cache:  #4
  paths:
    # - /root/.m2/repository/
    - demo/target/

services:  #5
  - docker:dind
  
stages:  #6
  - package
  - build&push-image
  - deploy
  
maven_package_job:  #7
  stage: package
  tags:
    - test
  script:
    - mvn clean package -Dmaven.test.skip=true
  artifacts:
    paths:
      - aid-supplier/target/*.jar #8

build_master_job:
  stage: build&push-image
  image: docker:dind #9
  tags:
    - test
  script:
    - docker login -u xxx -p xxx xxx.com
    - docker build -t $TAG -f demo/Dockerfile demo
    - docker push demo/$TAG
  only:
    - master

deploy_pord_job:
  stage: deploy
  image: ictu/sshpass:latest
  tags:
    - test
  script:
    # - apt-get install -y sshpass # 10
    - sshpass -p "$DEPLOY_HOST_PASSWORD" ssh -o StrictHostKeyChecking=no -tt root@$DEPLOY_HOST_IP 'bash /scripts/deploy-docker.sh'
  when: manual #11
  only:
    - master
```

说明：

- `#1`：默认全局镜像。
- `#2`：配置的一些环境变量。
- `#3`：这里我连接的是宿主机的 `docker daemon`，为了使用宿主机的镜像。如果想要连接 `dind` 自己，使用 `tcp://docker:2375`
- `#4`：配置缓存。
- `#5`：配置需要依赖的额外的服务，如构建可能需要依赖 mysql，redis 等。 `docker:dind`，docker 打包需要依赖 dind。services 的本质其实是使用了 docker 的 `--link`。
- `#6`：Stages 表示构建阶段，是一些按序执行的流程，具体执行是依赖于 Jobs。
- `#7`：定义的 Jobs 之一，用于构建 jar 包。
- `#8`：工件，就是在依赖项之间传递的东西，以便后面job使用。我这里是聚合项目，配置的是构建一个子项目。
- `#9`：当前阶段用到的镜像，镜像提供阶段用到的环境。
- `#10`：使用 sshpass 进行远程部署。[推荐使用官方使用ssh免密的方法](https://docs.gitlab.com/ee/ci/ssh_keys/README.html)。
- `#11`：手动触发部署。

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
  # DOCKER_HOST: tcp://docker:2375
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

## 配置 Vue 项目 GitLab Runner

Vue 项目

```bash
# 进入容器
$ docker-compose exec gitlab-runner bash

# 注册 runner，相关参数可以从 GitLab项目 -> Settings -> CI/CD -> Runners 中获取
root@centos01:/# gitlab-runner register
Runtime platform                                    arch=amd64 os=linux pid=54 revision=577f813d version=12.5.0
Running in system-mode.

Please enter the gitlab-ci coordinator URL (e.g. https://gitlab.com/):
http://192.168.0.80:11080/
Please enter the gitlab-ci token for this runner:
TCTjaSpp8zA8ysgHMXQM
Please enter the gitlab-ci description for this runner:
[92ecee27f3df]: test-vue
Please enter the gitlab-ci tags for this runner (comma separated):
test-vue
Registering runner... succeeded                     runner=TCTjaSpp
Please enter the executor: docker, docker-ssh+machine, custom, docker-ssh, parallels, shell, ssh, virtualbox, docker+machine, kubernetes:
docker
Please enter the default Docker image (e.g. ruby:2.6):
docker:stable
Runner registered successfully. Feel free to start it, but if it's running already the config should be automatically reloaded!

```

## 配置 Vue 项目 GitLab CI

在项目根目录下新建 `.gitlab-ci.yml`

```yaml
image: docker:stable
variables:
  DOCKER_HOST: tcp://192.168.0.80:2375
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ''
  TAG: test/vue-test:v1
  
cache:
  key: ${CI_BUILD_REF_NAME}
  paths:
    - node_modules/
    - dist/

services:
  - docker:dind
  
stages:
  - install_deps
  - test
  - build_stage
  - build_production
  - build_image
  - deploy_stage
  - deploy_production

# 安装依赖
install_deps:
  stage: install_deps
  image: buhler/node-git:10
  tags:
    - test-vue
  script:
    - npm install --registry=https://registry.npm.taobao.org
  only:
    - master
    - develop

# 运行测试用例
test:
  stage: test
  image: buhler/node-git:10
  tags:
    - test-vue
  script:
    - npm run test
  only:
    - master
    - develop

# 编译测试
build_stage:
  stage: build_stage
  image: buhler/node-git:10
  tags:
    - test-vue
  script:
    - npm run clean
    - npm run build:stage
  artifacts:
    paths:
      - dist/
  only:
    - develop

# 编译生产
build_production:
  stage: build_production
  image: buhler/node-git:10
  tags:
    - test-vue
  script:
    - npm run clean
    - npm run build:prod
  artifacts:
    paths:
      - dist/
  only:
    - master

# 构建 docker image
build_image:
  stage: build_image
  image: docker:dind
  tags:
    - test-vue
  script:
    - docker login -u xxx -p xxx xxx.com
    - docker build -t $TAG .
    - docker push $TAG
  only:
    - master
    - develop

deploy_stage:
  stage: deploy_stage
  image: ictu/sshpass:latest
  tags:
    - test-vue
  script:
    - sshpass -p "$DEPLOY_HOST_PASSWORD" ssh -o StrictHostKeyChecking=no -tt root@$DEPLOY_HOST_IP 'bash /scripts/deploy-docker.sh'
  only:
    - develop

deploy_production:
  stage: deploy_production
  image: ictu/sshpass:latest
  tags:
    - test-vue
  script:
    - sshpass -p "$DEPLOY_HOST_PASSWORD" ssh -o StrictHostKeyChecking=no -tt root@$DEPLOY_HOST_IP 'bash /scripts/deploy-docker.sh'
  when: manual
  only:
    - master
```

## 扩展

### Docker In Docker / Docker run Docker

`Docker In Docker` 简称 dind，在 GitLab CI 的使用中，可能会常被用于 service 的部分。 dind 表示在 Docker 中实际运行了一个 Docker 容器, 或 Docker daemon。

其实如果只是在 Docker 中执行 docker 命令， 那装个二进制文件即可。 但是如果想要运行 Docker daemon (比如需要执行 docker info)或者访问任意的设备都是不允许的。

在 2013年 左右，`--privileged` 选项被加入 docker， 这让我们在容器内启动容器变成了可能。 虽然 --privileged 的初始想法是为了能让容器开发更加便利，不过有些人在使用的时候，其实可能有些误解。

有时候，我们可能只是想要能够在容器内正常的 build 镜像，或者是与 `Docker daemon` 进行交互，例如 `docker images` 等命令。 那么，我们其实不需要 dind， 我们需要的是 `Docker Out Of Docker`，即 dood，在使用的时候，其实是将 docker.sock 挂载入容器内。

例如，使用如下命令：

```bash
sudo docker run --rm -ti -v /var/run/docker.sock:/var/run/docker.sock docker:stable /bin/sh
```

在容器内可进行正常的 `docker images` 等操作， 同时需要注意，在容器内的动作，将影响到宿主机上的 docker daemon。容器内没有 docker 客户端命令需要挂载 `-v /usr/bin/docker:/usr/bin/docker`。

#### 如何实现

- 创建组和用户，并将用户加入该组。 使用 `groupadd` 和 `useradd` 命令。
- 更新 subuid 和 subgid 文件， 将新用户和组配置到 `/etc/subgid` 和 `/etc/subuid` 文件中。`subuid` 和 `subgid` 规定了允许用户使用的从属id。
- 接下来需要挂载 `/sys/kernel/security` 为 securityfs 类型可以使用 mountpoint 命令进行测试 `mountpoint /sys/kernel/security` 如果不是一个挂载点，那么使用 `mount -t securityfs none /sys/kernel/security` 进行挂载。如果没有挂载成功的话， 可以检查是否是 SELinux 或者 AppArmor 阻止了这个行为。这里详细的安全问题，可以参考 Linux Security Modules (LSM)。
- 接下来允许 dockerd 命令启动 daemon 即可，`dockerd --host=unix:///var/run/docker.sock --host=tcp://0.0.0.0:2375` 即可将docker daemon 监听至 2375 端口。

#### 简单做法

可以直接使用 Docker 官方镜像仓库中的 docker:dind 镜像, 但是在运行时， 需要指定 `--privileged` 选项

### [Drone](https://github.com/drone/drone)

`GitLab CI` 相比 Jenkins 已经简化了很多。这里介绍另一个持续集成系统，[Drone](https://github.com/drone/drone) 是一个基于 Docker 的持续部署系统，用 Go 语言编写。`Drone` 本身和所有插件都是镜像，易于使用。[https://drone.io/](https://drone.io/)

## 参考

- [什么是 CI/CD？](https://www.redhat.com/zh/topics/devops/what-is-ci-cd)
- [gitlab docker](https://docs.gitlab.com/omnibus/docker/)
- [gitlab ci](https://docs.gitlab.com/ce/ci/README.html)
- [gitlab cit yaml](https://docs.gitlab.com/ce/ci/yaml/README.html)
- [gitlab runner](https://docs.gitlab.com/runner/)
- [基于 GitLab 的 CI 实践](https://www.jianshu.com/p/bfb342624db2)
