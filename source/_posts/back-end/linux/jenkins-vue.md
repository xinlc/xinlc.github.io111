---
title: Jenkins 部署前端 Vue 项目
date: 2019-11-03 20:50:00
categories: Linux
tags:
  - linux
  - docker
  - jenkins
  - CI/CD
---

使用 Jenkins 实现简单部署 `Docker + Vue` 项目。Jenkins 安装参考 [Docker 安装 Jenkins](https://xinlc.github.io/2019/11/02/back-end/linux/docker-jenkins/)

<!--more-->

## 新建任务

1. 输入任务名，选择流水线（Pipeline）
2. 选择流水定义 `Pipeline script`（官方建议在项目中添加 Jenkinsfile 文件），脚本如下

```groovy
pipeline {
  agent any
  environment {
    // 在环境变量中定义项目名
    SERVICE_NAME = 'testvue'
  }

  stages {
    // 编译 JS
    stage('Build') {
      steps {
        // 从 gitlab 仓库拉取代码
        git branch: 'dev', credentialsId: 'gitlab_jenkins', url: "http://192.168.2.202:8081/root/test-${SERVICE_NAME}-web.git"

        // 安装依赖包
        sh 'npm install --registry=https://registry.npm.taobao.org'

        // 构建测试包
        sh 'npm run build:stage'
      }
    }

    // 构建 docker 镜像, 并推送到镜像仓库
    stage('Build docker') {
      environment {
        // 从全局凭据中获取 docker 仓库凭据, 环境变量会自动添加 ACCESS_DOCKER_PSW，ACCESS_DOCKER_USR
        ACCESS_DOCKER = credentials('docker-register')
      }
      steps {
        // 登录镜像仓库，镜像仓库用的是阿里云镜像服务
        sh 'docker login -u ${ACCESS_DOCKER_USR} -p ${ACCESS_DOCKER_PSW} registry.cn-chengdu.aliyuncs.com'
        // 构建镜像，项目要有 Dockerfile
        sh 'docker build -t registry.cn-chengdu.aliyuncs.com/demo/test-${SERVICE_NAME}-web:latest-staging .'
        // 推送镜像
        sh 'docker push registry.cn-chengdu.aliyuncs.com/demo/test-${SERVICE_NAME}-web:latest-staging'
      }
    }

    // 登录远程服务器，拉取新镜像并部署
    stage('Deploy') {
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
              sshCommand remote: remote, command: "cd ~/docker/web; docker-compose stop test-${env.SERVICE_NAME}-web; docker-compose pull test-${env.SERVICE_NAME}-web; docker-compose up -d test-${env.SERVICE_NAME}-web"

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

> 流水线代码可以点击 “流水线语法” 生成流水线脚本。流水线语法多读 Jenkins 官方文档，写的还可以。

## 添加相关凭据

凭据->系统->全局凭据->添加凭据

目前我用的凭据类型都是 `Username with password`

## 使用 NodeJS

### 使用 Dockerfile 安装 NodeJS

[pipeline syntax](https://jenkins.io/zh/doc/book/pipeline/syntax/)

在项目根目录下创建 `Dockerfile.build` 文件并添加如下代码

```Dockerfile
FROM node:10-alpine

RUN apk update && apk add --no-cache git
```

在项目根目录下添加 `Jenkinsfile` 并添加如下代码

```bash
pipeline {
  agent none
  stages {
    stage('build') {
      agent {
        dockerfile {
          filename 'Dockerfile.build'
        }
      }
      steps {
        sh 'node --version'
        sh 'npm --version'
        sh 'git --version'
      }
    }
  }
}
```

### 在容器中安装 NodeJS

目前我是这样做的，但不建议这么做

```bash
# 进入容器
docker-compose exec jenkins bash

# 搜索软件, apk 是 Alpine 系统包管理工具
apk search node

# 安装 node & npm
apk add nodejs=10.14.2-r0
apk add npm=10.14.2-r0
```

## 参考

- [jenkins](https://jenkins.io/zh/doc/)
- [build-a-node-js-and-react-app-with-npm](https://jenkins.io/zh/doc/tutorials/build-a-node-js-and-react-app-with-npm/)
- [pipeline syntax](https://jenkins.io/zh/doc/book/pipeline/syntax/)
- [jenkins pipeline](https://jenkins.io/doc/pipeline/steps/workflow-basic-steps/)
