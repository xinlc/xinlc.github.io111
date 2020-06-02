---
title: Jenkins Maven Mono 仓库构建脚本
date: 2020-06-02 19:30:00
categories: Linux
tags:
  - jenkins
---

## jenkins maven mono 仓库构建脚本

jenkinsfile

```groovy
#!groovy
pipeline {
	agent none

	parameters {
		choice(
				description: '你需要选择哪个模块进行构建 ?',
				name: 'modulename',
				choices: ['1:all', '2:purchaser', '3:supplier', '4:audit', '5:job', '6:auth', '7:gateway', '8:crm', '9:order', '10:logistics', '11:report', '12:datav']
		)

		choice(
				description: '你需要选择哪个环境进行构建 ?',
				name: 'profile',
				choices: ['development', 'testing', 'production']
		)

		string(
				description: '你要推送到哪个镜像仓库 ?',
				name: 'registry',
				defaultValue: 'registry-vpc.cn-beijing.aliyuncs.com',
		)
	}

	stages {
		stage('Build docker') {
			agent any
			environment {
				ACCESS_DOCKER = credentials('docker-register')
			}
			steps {
				sh "docker login -u ${ACCESS_DOCKER_USR} -p ${ACCESS_DOCKER_PSW} ${params.registry}"
				sh "./jenkins-deploy.sh ${params.modulename} ${params.profile}"
			}
		}
	}
}
```

jenkins-deploy.sh

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

# 项目相对路径
project_path=(
  all
  demo-purchaser
  demo-supplier
  demo-audit
  demo-job
  auth/auth-svc
  gateway
  demo-crm
  order/order-svc
	logistics/logistics-svc
  report/report-svc
  datav/datav-svc
)

# 镜像仓库名
register_names=(
  all
  demo-purchaser-server
  demo-supplier-server
  demo-audit-server
  demo-job-svc
  demo-auth-svc
  demo-gateway
  demo-crm-server
  demo-order-svc
	demo-logistics-svc
  demo-report-svc
  demo-datav-svc
)

# 项目版本，最后生成项目名+版本，如：aid-purchaser-server:0.0.1-SNAPSHOT
# 版本和项目名顺序一一对应
image_tags=(
  all
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
)

# 定义环境和镜像 tag 后缀映射
declare -A image_tag_suffix_map=(["development"]="DEV" ["testing"]="SNAPSHOT" ["production"]="RELEASE")
declare -A maven_profile_map=(["development"]="dev" ["testing"]="test" ["production"]="prod")

# 项目ID
project_id=$1

# 环境：development, testing, production
profile_name=$2

# 脚本执行工作路径
work_path=$(
  cd "$(dirname "$0")"
  pwd
)
# docker 镜像仓库地址
docker_registry_uri="registry-vpc.cn-beijing.aliyuncs.com/demo"

init() {

	# 截取字符 10:demo-abc -> 10
	project_id=${project_id%%:*}

	# 映射 maven 环境
	maven_profile="${maven_profile_map[$profile_name]}"

	# 根据环境映射镜像tag
  for ((i = 1; i < ${#image_tags[@]}; i++)); do
    ImageTag=${image_tags[$i]}
    image_tags[$i]="${ImageTag}-${image_tag_suffix_map[$profile_name]}"
  done
}

error() {
  echo -e "\n$red 输入错误！$none\n"
  exit 1
}

pause() {
  read -rsp "$(echo -e "按${green} Enter 回车键 ${none}继续...或按${red} Ctrl + C ${none}取消.")" -d $'\n'
  echo
}

show_projects() {
  for ((i = 1; i <= ${#register_names[*]}; i++)); do
    Item="${register_names[$i - 1]}"
    if [[ "$i" -le 9 ]]; then
      # echo
      echo -e "$yellow  $i. $none${Item}"
    else
      # echo
      echo -e "$yellow $i. $none${Item}"
    fi
  done
}

show_deploy_projects() {
  for ((i = 1; i <= ${#image_tags[*]} - 1; i++)); do
    ItemTag="${image_tags[$i]}"
    ItemName="${register_names[$i]}"
    echo -e "$cyan ${ItemName}:${ItemTag}$none"
  done
}

show_confirm_deploy() {
  echo "=============================="
  echo -e "$yellow 即将部署 $none"
  echo
  if test $project_id -eq 1; then
    show_deploy_projects
  else
    echo -e "$cyan ${register_names[project_id - 1]}:${image_tags[$project_id - 1]}$none"
  fi
  echo
  echo "=============================="

  # 提示
  pause

  # 部署
  deploy
}

deploy() {

  # 部署所有项目
  if test $project_id -eq 1; then
		# 构建测试包
		mvn clean install -Dmaven.test.skip=true -P${maven_profile}

    for ((i = 1; i <= ${#image_tags[*]} - 1; i++)); do
      ItemTag="${image_tags[$i]}"
      ItemName="${register_names[$i]}"
      RegisterName="${register_names[$i]}"
#      ProjectPath=${work_path}/${ItemName}
      ProjectPath=${work_path}/${project_path[$i]}

      # 构建 docker 镜像并推送到镜像仓库
      docker build -t "${docker_registry_uri}/${RegisterName}:${ItemTag}" -f "${ProjectPath}/Dockerfile" "${ProjectPath}"
      docker push "${docker_registry_uri}/${RegisterName}:${ItemTag}"

    done
  else

    # 部署选择的项目
    ItemTag="${image_tags[$project_id - 1]}"
    ItemName="${register_names[project_id - 1]}"
    RegisterName="${register_names[project_id - 1]}"
#    ProjectPath=${work_path}/${ItemName}
		ProjectPath=${work_path}/${project_path[project_id - 1]}

		# 构建指定模块
		mvn clean install -Dmaven.test.skip=true -pl :${RegisterName} -am -P${maven_profile}


    # 构建 docker 镜像并推送到镜像仓库
    docker build -t "${docker_registry_uri}/${RegisterName}:${ItemTag}" -f "${ProjectPath}/Dockerfile" "${ProjectPath}"
    docker push "${docker_registry_uri}/${RegisterName}:${ItemTag}"
  fi
  echo
  echo -e "${green}===============部署成功===============${none}"
  echo
}

run() {

  # clear
  echo
  while :; do
    echo -e "请选择要部署的项目 [${magenta}1-${#register_names[*]}$none]"
    echo

    # 显示所有项目
    show_projects

    # 读取用户输入
    # read -p "$(echo -e "(默认: ${cyan}all$none)"):" project_id

    pwd

    # project_id=1

    case $project_id in
    [1-9]|1[0-9])
      echo
      echo -e "$yellow 已选择 $cyan${register_names[$project_id - 1]}$none"
      break
      ;;
    *)
      error
      ;;
    esac
  done

  # 显示确认部署信息
  # show_confirm_deploy
  deploy
}

# 检查输入参数
if test "$#" -ne 2; then
  # echo '请传入要构建的项目id'
  echo '<Project Name | all> <development | testing | production>'
  show_projects
  exit 1
fi


# 初始化
init

# 开始执行
run
```

手动部署脚本：deploy.sh

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

# 项目相对路径
project_path=(
  all
  demo-purchaser
  demo-supplier
  demo-audit
  demo-job
  auth/auth-svc
  gateway
  demo-crm
  order/order-svc
  logistics/logistics-svc
  report/report-svc
  datav/datav-svc
)

# 镜像仓库名
register_names=(
  all
  demo-purchaser-server
  demo-supplier-server
  demo-audit-server
  demo-job-svc
  demo-auth-svc
  demo-gateway
  demo-crm-server
  demo-order-svc
  demo-logistics-svc
  demo-report-svc
  demo-datav-svc
)

# 项目版本，最后生成项目名+版本，如：aid-purchaser-server:0.0.1-SNAPSHOT
# 版本和项目名顺序一一对应
image_tags=(
  all
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
  1.0.0
)

# 定义环境和镜像 tag 后缀映射
declare -A image_tag_suffix_map=(["development"]="DEV" ["testing"]="SNAPSHOT" ["production"]="RELEASE")
declare -A maven_profile_map=(["development"]="dev" ["testing"]="test" ["production"]="prod")

# 环境：development, testing, production
profile_name=$1

# 脚本执行工作路径
work_path=$(
  cd "$(dirname "$0")"
  pwd
)
# docker 镜像仓库地址
#docker_registry_uri="registry.cn-chengdu.aliyuncs.com/demo"
docker_registry_uri="registry.cn-beijing.aliyuncs.com/demo"

init() {

	# 映射 maven 环境
	maven_profile="${maven_profile_map[$profile_name]}"

	# 根据环境映射镜像tag
  for ((i = 1; i < ${#image_tags[@]}; i++)); do
    ImageTag=${image_tags[$i]}
    image_tags[$i]="${ImageTag}-${image_tag_suffix_map[$profile_name]}"
  done
}

error() {
  echo -e "\n$red 输入错误！$none\n"
  exit 1
}

pause() {
  read -rsp "$(echo -e "按${green} Enter 回车键 ${none}继续...或按${red} Ctrl + C ${none}取消.")" -d $'\n'
  echo
}

show_projects() {
  for ((i = 1; i <= ${#register_names[*]}; i++)); do
    Item="${register_names[$i - 1]}"
    if [[ "$i" -le 9 ]]; then
      # echo
      echo -e "$yellow  $i. $none${Item}"
    else
      # echo
      echo -e "$yellow $i. $none${Item}"
    fi
  done
}

show_deploy_projects() {
  for ((i = 1; i <= ${#image_tags[*]} - 1; i++)); do
    ItemTag="${image_tags[$i]}"
    ItemName="${register_names[$i]}"
    echo -e "$cyan ${ItemName}:${ItemTag}$none"
  done
}

show_confirm_deploy() {
  echo "=============================="
  echo -e "$yellow 即将部署 $none"
  echo
  if test $project_id -eq 1; then
    show_deploy_projects
  else
    echo -e "$cyan ${register_names[project_id - 1]}:${image_tags[$project_id - 1]}$none"
  fi
  echo
  echo "=============================="

  # 提示
  pause

  # 部署
  deploy
}

deploy() {

  # 部署所有项目
  if test $project_id -eq 1; then
		# 构建测试包
		mvn clean install -Dmaven.test.skip=true -P${maven_profile}

    for ((i = 1; i <= ${#image_tags[*]} - 1; i++)); do
      ItemTag="${image_tags[$i]}"
      ItemName="${register_names[$i]}"
      RegisterName="${register_names[$i]}"
#      ProjectPath=${work_path}/${ItemName}
      ProjectPath=${work_path}/${project_path[$i]}

      # 构建 docker 镜像并推送到镜像仓库
      docker build -t "${docker_registry_uri}/${RegisterName}:${ItemTag}" -f "${ProjectPath}/Dockerfile" "${ProjectPath}"
      docker push "${docker_registry_uri}/${RegisterName}:${ItemTag}"

    done
  else

    # 部署选择的项目
    ItemTag="${image_tags[$project_id - 1]}"
    ItemName="${register_names[project_id - 1]}"
    RegisterName="${register_names[project_id - 1]}"
#    ProjectPath=${work_path}/${ItemName}
		ProjectPath=${work_path}/${project_path[project_id - 1]}

    # 构建指定模块
    mvn clean install -Dmaven.test.skip=true -pl :${RegisterName} -am -P${maven_profile}

    # 构建 docker 镜像并推送到镜像仓库
    docker build -t "${docker_registry_uri}/${RegisterName}:${ItemTag}" -f "${ProjectPath}/Dockerfile" "${ProjectPath}"
    docker push "${docker_registry_uri}/${RegisterName}:${ItemTag}"
  fi
  echo
  echo -e "${green}===============部署成功===============${none}"
  echo
}

run() {

  # clear
  echo
  while :; do
    echo -e "请选择要部署的项目 [${magenta}1-${#register_names[*]}$none]"
    echo

    # 显示所有项目
    show_projects

    # 读取用户输入
    read -p "$(echo -e "(默认: ${cyan}all$none)"):" project_id

    [ -z "$project_id" ] && project_id=1

    case $project_id in
    [1-9]|1[0-9])
      echo
      echo -e "$yellow 已选择 $cyan${register_names[$project_id - 1]}$none"
      break
      ;;
    *)
      error
      ;;
    esac
  done

  # 显示确认部署信息
  show_confirm_deploy
}

# 检查输入参数
if test "$#" -ne 1; then
  echo '<development | testing | production>'
  exit 1
fi

# 初始化
init

# 开始执行
run
```
