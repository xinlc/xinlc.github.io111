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

使用 Jenkins 实现简单部署 `Docker + Vue` 项目。Jenkins 安装参考 [Docker 安装 Jenkins](https://xinlichao.cn/back-end/linux/docker-jenkins/)

<!--more-->

## 新建任务

1. 输入任务名，选择流水线（Pipeline）
2. 选择流水定义 `Pipeline script`（官方建议在项目中添加 Jenkinsfile 文件）

### Pipeline script

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

> 流水线代码可以点击 “流水线语法” 生成流水线脚本。流水线语法参考 Jenkins [官方文档](https://www.jenkins.io/doc/book/pipeline/syntax/)。

### Vue Dockerfile

在项目根目录下添加 `Dockerfile` 并添加如下代码

```Dockerfile
FROM nginx:alpine

ADD ./dist/ /usr/share/nginx/html/

EXPOSE 80

```

在项目根目录下添加 `.dockerignore` 文件并添加如下

```dockerignore
.DS_Store
node_modules/
build/
mock/
tests/
```

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

# 安装 node-sass 依赖
set SASS_BINARY_SITE=https://npm.taobao.org/mirrors/node-sass/
npm install node-sass
# 或修改.npmrc
sass_binary_site=https://npm.taobao.org/mirrors/node-sass/
phantomjs_cdnurl=https://npm.taobao.org/mirrors/phantomjs/
electron_mirror=https://npm.taobao.org/mirrors/electron/
registry=https://registry.npm.taobao.org

# 如果是 Nexus 则 set SASS_BINARY_SITE=https://nexus/repository/npm/
npm install -g cnpm; cnpm install

# 可能还需要安装一下软件
apk add git=2.20.2-r0
apk add maven=3.6.0-r0
apk add python2=2.7.16-r1
apk add make=4.2.1-r2
apk add g++=8.3.0-r
```

## 问题

### 构建vue时 Jenkins 偶尔会重启

缓存太小，建议 >= 4g

### 多分支流水线 node_modules 缓存失效问题

使用 Jenkinsfile 方式构建多分支流水线时，每次构建 node_modules 都会被自动删除，查看日志发现执行了 `git clean -fdx` 这个命令会删除未被git管理的文件。

**解决：**

> 项目 -> 配置 -> 分支源 -> Git -> 行为

- 删除 `Clean before checkout`
- 删除 `Clean after checkout`

### 缓存 node_modules 思路

使用 md5sum 对比 package-lock.json 是否有变化，有变更再执行 `npm install`

```bash
#!/bin/bash
##
## 自动化构建部署脚本
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

# # 项目名称
project_name=""

# # 环境：development, testing, production
# profile_name=$2
profile_name=development

# # 构建版本：2.0.0
# project_version=$3
project_version=1.0.0

# # 强制安装依赖
# install_dependencies=$4
install_dependencies=0

usage() {
  echo -e "$red Usage:`basename $0` -p [Project Name] -e [development | testing | production] -v [Build Version] | -i [install]$none"

  exit 1
}

# 获取输入参数
while getopts "hp:e:v:i:" opt; do
  case $opt in
  h)
    usage
    ;;
  p)
    project_name=$OPTARG
    ;;
  e)
    profile_name=$OPTARG
    ;;
  v)
    project_version=$OPTARG
    ;;
  i)
    install_dependencies=$OPTARG
    ;;
  ?)
    usage
    ;;
  esac
done

# 检查输入参数
# if test "$#" -ne 4; then
#   echo -e "$red 请输入正确参数：[Project Name] [development | testing | production] [Build Version] | [install]$none"
#   exit 1
# fi

# 检查输入参数
echo $*
if [ $# == 0 ]; then
  usage
fi

if [ -z $project_name ]; then
  usage
fi

# 脚本执行工作路径
work_path=$(
  cd "$(dirname "$0")"
  pwd
)
project_path=$(
  cd "$work_path"
  cd ../
  pwd
)

# docker 镜像仓库地址
docker_registry_uri="registry-vpc.cn-beijing.aliyuncs.com/hst"
docker_file_path="${project_path}/Dockerfile"

# 定义环境和镜像 tag 后缀映射
declare -A image_tag_suffix_map=(["development"]="dev" ["testing"]="staging" ["production"]="release")
declare -A profile_map=(["development"]="stage" ["testing"]="stage" ["production"]="prod")

# 镜像tag
image_tag="${project_version}-${image_tag_suffix_map[$profile_name]}"

# 执行环境
profile="${profile_map[$profile_name]}"

# 镜像地址
image_path="${docker_registry_uri}/${project_name}:${image_tag}"

# package 签名
package_lock="${project_path}/package-lock.json"
package_md5_file="${work_path}/package-md5"
# .gitignore 需要添加 package-md5, 不能被git跟踪否则每次构建会被删除
touch $package_md5_file
package_md5=$(head -n 1 ${package_md5_file})

# 校验 package 版本
check_version() {
  echo -e "$cyan ==========比较依赖版本========== $none"

  current_package_md5=$(md5sum ${package_lock} | cut -d" " -f 1)

  echo -e "$cyan prev: ${package_md5} current: ${current_package_md5}  $none"

  if [ "$current_package_md5" != "$package_md5" ]; then
    echo -e "$cyan ==========依赖有变化========== $none"
    echo $current_package_md5 >${package_md5_file}
    return 0
  fi
  echo -e "$cyan ==========依赖无变化========== $none"
  return 1
}

deploy() {
  echo "=============================="
  echo -e "$yellow 即将部署 $none"
  echo
  echo -e "$cyan ${image_path} $none"
  echo
  echo "=============================="

  check_version

  if [[ $? -eq 0 || $install_dependencies -eq 1 ]]; then
    echo -e "$cyan ==========安装依赖========== $none"

    npm install --registry=https://registry.npm.taobao.org
  fi

  echo -e "$cyan ==========开始构建========== $none"

  # 打包
  npm run build:${profile}

  echo -e "$cyan ==========开始构建镜像文件========== $none"
  # 构建镜像
  docker build -t "${image_path}" -f ${docker_file_path} ${project_path}

  echo -e "$cyan ==========发布镜像========== $none"
  # 发布镜像
  docker push ${image_path}

  echo
  echo -e "${green}===============部署成功===============${none}"
  echo

}

# 开始执行
deploy
```

## 参考

- [jenkins](https://jenkins.io/zh/doc/)
- [build-a-node-js-and-react-app-with-npm](https://jenkins.io/zh/doc/tutorials/build-a-node-js-and-react-app-with-npm/)
- [pipeline syntax](https://jenkins.io/zh/doc/book/pipeline/syntax/)
- [jenkins pipeline](https://jenkins.io/doc/pipeline/steps/workflow-basic-steps/)
