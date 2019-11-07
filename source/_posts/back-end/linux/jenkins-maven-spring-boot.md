---
title: Jenkins 部署 Maven 聚合项目
date: 2019-11-04 20:50:00
categories: Linux
tags:
  - linux
  - docker
  - jenkins
  - CI/CD
---

使用 Jenkins 实现简单部署 `Docker + SpringBoot + Maven` 聚合项目。Jenkins 安装参考 [Docker 安装 Jenkins](https://xinlc.github.io/2019/11/02/back-end/linux/docker-jenkins/)

<!--more-->

## Maven 项目

目录结构如下

```bash
demo-parent
├── README.md         # 项目自述文档
├── demo-common       # 共同模块（util、redis、异常处理等）
├── demo-core         # 核心模块（连接池配置、API 拦截等）
├── demo-dao          # 持久层
├── demo-job          # 定时任务模块
├── demo-service      # 业务层
├── demo-demo         # 具体业务模块 Controller
├── demo-demo2        # 具体业务模块 Controller
├── demo-demo3        # 具体业务模块 Controller
├── jenkins-deploy.sh # Jenkins 部署时需要的脚本
├── Jenkinsfile       # Jenkins 配置脚本
└── pom.xml           # Parent pom
```

## Jenkinsfile

项目根目录下添加 `Jenkinsfile` 文件，这种方式不用写 SCM

```groovy
#!groovy
pipeline {
  agent none
  stages {

    // 打包
    stage('Build') {
      agent {
        docker {
          // 启动一个 maven 镜像环境，该步骤执行完会删除 maven 容器
          image 'maven:3-alpine'
          // 映射主机 .m2 文件夹到容器内容，缓存 maven 需要的依赖，下次构建不会再重新下载
          args '-v /root/.m2:/root/.m2'
        }
      }
      steps {
        // 因为是聚合项目，这里要执行 install
        sh 'mvn clean install -Dmaven.test.skip=true -Ptest'
        // 因为是在代理容器中编译的，阶段执行完，代理生成的文件会被删除
        // 这里把生成的 jar 文件，存放到主机并隐藏，以便后面阶段使用
        stash includes: '**/target/*.jar', name: 'app'
      }
    }

    // 构建 docker 镜像, 并推送到镜像仓
    stage('Build docker') {
      agent any
      environment {
        // 从全局凭据中获取 docker 仓库凭据, 环境变量会自动添加 ACCESS_DOCKER_PSW，ACCESS_DOCKER_USR
        ACCESS_DOCKER = credentials('docker-register')
      }
      steps {
        // 取出构建好的 jar 文件
        unstash 'app'
        // 登录镜像仓库，镜像仓库用的是阿里云镜像服务
        sh 'docker login -u ${ACCESS_DOCKER_USR} -p ${ACCESS_DOCKER_PSW} registry.cn-chengdu.aliyuncs.com'
        // 执行自定义脚本，注意要给这个文件添加执行权限
        sh './jenkins-deploy.sh'
      }
    }

    // 登录远程服务器，拉取新镜像并部署
    stage('Deploy') {
      agent any
      steps {
        script {
          // 从全局凭据中获取 sshUser202 用户名和密码
          withCredentials([usernamePassword(credentialsId: 'sshUser202', passwordVariable: 'userPwd', usernameVariable: 'userName')]) {
            def remote = [:]
            remote.name = 'dev_202'       // 定义连接名称，随便起
            remote.host = '192.168.2.202' // 替换成远程服务器地址
            remote.user = 'root'
            remote.port = 22
            remote.user = userName
            remote.password = userPwd
            remote.allowAnyHosts = true
            stage('Deploy SSH Steps') {
              // 执行 服务器上的 docker-compose 命令发布包，这里建议 在服务器上写个脚本，执行这个脚本
              sshCommand remote: remote, command: 'cd ~/docker/demo-service; docker-compose down; docker-compose pull; docker-compose up -d'

              // 清理 docker 镜像
              sshCommand remote: remote, command: 'docker image prune -f'
            }
          }
        }
      }
    }
  }
}
```

### jenkins-deploy.sh

项目根目录下添加 `jenkins-deploy.sh` 文件

```bash
#!/bin/bash
##
## 测试环境部署脚本
##
## Started on 2019/10/28 Leo <xinlichao2016@gmail.com>
## Last update 2019/10/28 Leo <xinlichao2016@gmail.com>
##

version="1.0.0"

# Colours
red="\033[91m"
green="\033[92m"
yellow="\033[93m"
magenta="\033[95m"
cyan="\033[96m"
none="\033[0m"

# 项目名
project_names=(
  demo-demo
  demo-demo2
  demo-demo3
  demo-job
)

# 项目版本，最后生成项目名+版本，如：demo-demo-server:0.0.1-SNAPSHOT
# 版本和项目名顺序一一对应
image_tags=(
  1.0.0-SNAPSHOT
  1.0.0-SNAPSHOT
  1.0.0-SNAPSHOT
  1.0.0-SNAPSHOT
)

# 脚本执行工作路径
work_path=$(
  cd "$(dirname "$0")"
  pwd
)
# docker 镜像仓库地址
docker_registry_uri="registry.cn-chengdu.aliyuncs.com/demo"

deploy() {

  # 部署所有项目
  for ((i = 1; i <= ${#image_tags[*]} - 1; i++)); do
    ItemTag="${image_tags[$i]}"
    ItemName="${project_names[$i]}"
    ProjectPath=${work_path}/${ItemName}

    # 构建 docker 镜像并推送到镜像仓库
    docker build -t "${docker_registry_uri}/${ItemName}-server:${ItemTag}" -f "${ProjectPath}/Dockerfile" "${ProjectPath}"
    docker push "${docker_registry_uri}/${ItemName}-server:${ItemTag}"

  done
  echo
  echo -e "${green}===============部署成功===============${none}"
  echo
}

# 开始执行
deploy

```

## 添加相关凭据

凭据->系统->全局凭据->添加凭据

目前我用的凭据类型都是 `Username with password`

## 打开 Blue Ocean

创建流水线->选择 git 仓库，完成后会自动扫描项目下的 `Jenkinsfile` 文件

## 参考

- [jenkins](https://jenkins.io/zh/doc/)
- [build-a-java-app-with-maven](https://jenkins.io/zh/doc/tutorials/build-a-java-app-with-maven/)
- [jenkins pipeline](https://jenkins.io/doc/pipeline/steps/workflow-basic-steps/)
- [pipeline syntax](https://jenkins.io/zh/doc/book/pipeline/syntax/)
