---
title: Kubeadm 部署 Kubernetes
date: 2020-05-23 10:00:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

<!--more-->

## kubeadm 方式部署

Minikube 部署 Kubernetes 的核心就是 Kubeadm。Kubeadm 是一个工具，它提供了 `kubeadm init` 以及 `kubeadm join` 这两个命令作为快速创建 kubernetes 集群的最佳实践。

## kubeadm 部署单Master节点

### 机器准备

> 在所有节点上操作

- 关闭selinux,firewall

```bash
setenforce  0
sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
systemctl stop firewalld
systemctl disable firewalld
```

- 关闭swap，(1.8版本后的要求，目的应该是不想让swap干扰pod可使用的内存limit)

```bash
swapoff -a
```

- 修改下面内核参数，否则请求数据经过iptables的路由可能有问题

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sudo sysctl --system
```

### 检查所需端口

> Master 节点/Control-plane node(s)

协议 | 方向 | 端口范围 | 作用 | 使用者
---|---|---|---|---
TCP | 入站 | 6443* | Kubernetes API 服务器 | 所有组件
TCP | 入站 | 2379-2380 | etcd server client API | kube-apiserver, etcd
TCP | 入站 | 10250 | Kubelet API | kubelet 自身、控制平面组件
TCP | 入站 | 10251 | kube-scheduler | kube-scheduler 自身
TCP | 入站 | 10252 | kube-controller-manager | kube-controller-manager 自身

> Node节点/Worker node(s)

协议 | 方向 | 端口范围 | 作用 | 使用者
---|---|---|---|---
TCP | 入站 | 10250 | Kubelet API | kubelet 自身、控制平面组件
TCP | 入站 | 30000-32767 | NodePort 服务** | 所有组件

** NodePort 服务 的默认端口范围。

使用 * 标记的任意端口号都可以被覆盖，所以您需要保证所定制的端口是开放的。

### 检查网络

> 在所有节点执行命令

安装后的拓扑图如下：[参考](https://kuboard.cn)

![3][3]

- `ip route show` 命令中，可以知道机器的默认网卡，通常是 `eth0`，如 ***default via 172.21.0.23 dev <font color="blue" weight="500">eth0</font>***
- `ip address` 命令中，可显示默认网卡的 IP 地址，Kubernetes 将使用此 IP 地址与集群内的其他节点通信，如 `172.17.216.80`
- 所有节点上 Kubernetes 所使用的 IP 地址必须可以互通（无需 NAT 映射、无安全组或防火墙隔离）

**修改hostname：**

如果在安装使用k8s中出现以下错误, 则需要修改hostname：

```bash
name: Invalid value: "k8s_master": a DNS-1123 subdomain must consist of lower case alphanumeric characters, '-' or '.', and must start and end with an alphanumeric character (e.g. 'example.com', regex used for
 validation is '[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*')
```

出现hostname不合法的情况, 执行以下命令修改hostname

```bash
# 修改 hostname
hostnamectl set-hostname your-new-host-name
# 查看修改结果
hostnamectl status
# 设置 hostname 解析
echo "127.0.0.1   $(hostname)" >> /etc/hosts
```

### 一键安装脚本

> 在 master 节点和 worker 节点都要执行

使用 root 身份在所有节点执行下面的脚本，以安装软件：

- docker
- nfs-utils
- kubectl / kubeadm / kubelet

```bash
# 在 master 节点和 worker 节点都要执行
# 最后一个参数 1.18.3 用于指定 kubenetes 版本，支持所有 1.18.x 版本的安装
# 腾讯云 docker hub 镜像
# export REGISTRY_MIRROR="https://mirror.ccs.tencentyun.com"
# DaoCloud 镜像
# export REGISTRY_MIRROR="http://f1361db2.m.daocloud.io"
# 阿里云 docker hub 镜像
export REGISTRY_MIRROR=https://registry.cn-hangzhou.aliyuncs.com

bash install_kubelet.sh 1.18.3
```

```bash
#!/bin/bash

# install_kubelet.sh
# CentOS 版本: 7.7
# K8s: 1.18.3

# 安装 docker
# 参考文档如下
# https://docs.docker.com/install/linux/docker-ce/centos/ 
# https://docs.docker.com/install/linux/linux-postinstall/

# 卸载旧版本
yum remove -y docker \
docker-client \
docker-client-latest \
docker-ce-cli \
docker-common \
docker-latest \
docker-latest-logrotate \
docker-logrotate \
docker-selinux \
docker-engine-selinux \
docker-engine

# 设置 yum repository
yum install -y yum-utils \
device-mapper-persistent-data \
lvm2
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 安装并启动 docker
yum install -y docker-ce-19.03.8 docker-ce-cli-19.03.8 containerd.io
systemctl enable docker
systemctl start docker

# 安装 nfs-utils
# 必须先安装 nfs-utils 才能挂载 nfs 网络存储
yum install -y nfs-utils
yum install -y wget

# 关闭 防火墙
systemctl stop firewalld
systemctl disable firewalld

# 关闭 SeLinux
setenforce 0
sed -i "s/SELINUX=enforcing/SELINUX=disabled/g" /etc/selinux/config

# 关闭 swap
swapoff -a
yes | cp /etc/fstab /etc/fstab_bak
cat /etc/fstab_bak |grep -v swap > /etc/fstab

# 修改 /etc/sysctl.conf
# 如果有配置，则修改
sed -i "s#^net.ipv4.ip_forward.*#net.ipv4.ip_forward=1#g"  /etc/sysctl.conf
sed -i "s#^net.bridge.bridge-nf-call-ip6tables.*#net.bridge.bridge-nf-call-ip6tables=1#g"  /etc/sysctl.conf
sed -i "s#^net.bridge.bridge-nf-call-iptables.*#net.bridge.bridge-nf-call-iptables=1#g"  /etc/sysctl.conf
sed -i "s#^net.ipv6.conf.all.disable_ipv6.*#net.ipv6.conf.all.disable_ipv6=1#g"  /etc/sysctl.conf
sed -i "s#^net.ipv6.conf.default.disable_ipv6.*#net.ipv6.conf.default.disable_ipv6=1#g"  /etc/sysctl.conf
sed -i "s#^net.ipv6.conf.lo.disable_ipv6.*#net.ipv6.conf.lo.disable_ipv6=1#g"  /etc/sysctl.conf
sed -i "s#^net.ipv6.conf.all.forwarding.*#net.ipv6.conf.all.forwarding=1#g"  /etc/sysctl.conf
# 可能没有，追加
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-iptables = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.lo.disable_ipv6 = 1" >> /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding = 1"  >> /etc/sysctl.conf
# 执行命令以应用
sysctl -p

# 配置K8S的yum源
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
       http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

# 卸载旧版本
yum remove -y kubelet kubeadm kubectl

# 安装kubelet、kubeadm、kubectl
# 将 ${1} 替换为 kubernetes 版本号，例如 1.17.2
yum install -y kubelet-${1} kubeadm-${1} kubectl-${1}

# 修改docker Cgroup Driver为systemd
# # 将/usr/lib/systemd/system/docker.service文件中的这一行 ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
# # 修改为 ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --exec-opt native.cgroupdriver=systemd
# 如果不修改，在添加 worker 节点时可能会碰到如下错误
# [WARNING IsDockerSystemdCheck]: detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd".
# Please follow the guide at https://kubernetes.io/docs/setup/cri/
sed -i "s#^ExecStart=/usr/bin/dockerd.*#ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --exec-opt native.cgroupdriver=systemd#g" /usr/lib/systemd/system/docker.service

# 设置 docker 镜像，提高 docker 镜像下载速度和稳定性
# 如果您访问 https://hub.docker.io 速度非常稳定，亦可以跳过这个步骤
curl -sSL https://xinlichao.cn/resource/back-end/k8s/k8s-installation-kubeadm/set_mirror.sh | sh -s ${REGISTRY_MIRROR}

# 重启 docker，并启动 kubelet
systemctl daemon-reload
systemctl restart docker
systemctl enable kubelet && systemctl start kubelet

docker version
```

### 初始化 master 节点

> 只在 master 节点执行

**注意事项：**

- 以 root 身份在 master-k8s 机器上执行
- 关于初始化时用到的环境变量
  - APISERVER_NAME 不能是 master 的 hostname
  - APISERVER_NAME 必须全为小写字母、数字、小数点，不能包含减号
  - POD_SUBNET 所使用的网段不能与 master节点/worker节点 所在的网段重叠。该字段的取值为一个 CIDR 值，如果您对 CIDR 这个概念还不熟悉，请仍然执行 export POD_SUBNET=10.100.0.1/16 命令，不做修改

```bash
# 执行以下命令只在 master-k8s 节点机器执行
# 替换 x.x.x.x 为 master 节点实际 IP（请使用内网 IP）
# export 命令只在当前 shell 会话中有效，开启新的 shell 窗口后，如果要继续安装过程，请重新执行此处的 export 命令
export MASTER_IP=x.x.x.x
# 替换 apiserver.demo 为 您想要的 dnsName
export APISERVER_NAME=apiserver.demo
# Kubernetes 容器组所在的网段，该网段安装完成后，由 kubernetes 创建，事先并不存在于您的物理网络中
export POD_SUBNET=10.100.0.1/16
echo "${MASTER_IP}    ${APISERVER_NAME}" >> /etc/hosts

bash init_master.sh 1.18.3
```

```bash
#!/bin/bash

# init_master.sh
# 只在 master 节点执行

# 脚本出错时终止执行
set -e

if [ ${#POD_SUBNET} -eq 0 ] || [ ${#APISERVER_NAME} -eq 0 ]; then
  echo -e "\033[31;1m请确保您已经设置了环境变量 POD_SUBNET 和 APISERVER_NAME \033[0m"
  echo 当前POD_SUBNET=$POD_SUBNET
  echo 当前APISERVER_NAME=$APISERVER_NAME
  exit 1
fi


# 查看完整配置选项 https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2
rm -f ./kubeadm-config.yaml
cat <<EOF > ./kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
kubernetesVersion: v${1}
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
controlPlaneEndpoint: "${APISERVER_NAME}:6443"
networking:
  serviceSubnet: "10.96.0.0/16"
  podSubnet: "${POD_SUBNET}"
  dnsDomain: "cluster.local"
EOF

# kubeadm init
# 根据您服务器网速的情况，您需要等候 3 - 10 分钟
kubeadm init --config=kubeadm-config.yaml --upload-certs

# 配置 kubectl
rm -rf /root/.kube/
mkdir /root/.kube/
cp -i /etc/kubernetes/admin.conf /root/.kube/config

# 安装 calico 网络插件
# 参考文档 https://docs.projectcalico.org/v3.13/getting-started/kubernetes/self-managed-onprem/onpremises
echo "安装calico-3.13.1"
rm -f calico-3.13.1.yaml
wget https://xinlichao.cn/resource/back-end/k8s/k8s-installation-kubeadm/calico-3.13.1.yaml-t -O calico-3.13.1.yaml
kubectl apply -f calico-3.13.1.yaml
```

- 检查 master 初始化结果

```bash
# 执行如下命令，等待 3-10 分钟，直到所有的容器组处于 Running 状态
watch kubectl get pod -n kube-system -o wide

# 查看 master 节点初始化结果
kubectl get nodes -o wide
```

### 初始化 worker 节点

- 获得 join命令参数

```bash
# 只在 master 节点执行
kubeadm token create --print-join-command

# kubeadm token create 命令的输出
# 该 token 的有效时间为 2 个小时，2小时内，您可以使用此 token 初始化任意数量的 worker 节点。
kubeadm join apiserver.demo:6443 --token mpfjma.4vjjg8flqihor4vt     --discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303
```

- 执行加入集群命令

```bash
# 只在 worker 节点执行
# 替换 x.x.x.x 为 master 节点的内网 IP
export MASTER_IP=x.x.x.x
# 替换 apiserver.demo 为初始化 master 节点时所使用的 APISERVER_NAME
export APISERVER_NAME=apiserver.demo
echo "${MASTER_IP}    ${APISERVER_NAME}" >> /etc/hosts

# 替换为 master 节点上 kubeadm token create 命令的输出
kubeadm join apiserver.demo:6443 --token mpfjma.4vjjg8flqihor4vt     --discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303
```

- 检查初始化结果

```bash
# 只在 master 节点执行
kubectl get nodes -o wide
```

## 安装helm（kubeSphere准备工作）

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# 执行helm version 可以看到client已经安装好了，但是server端还没有安装。
helm version
```

创建rbac-config.yaml文件

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tiller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: tiller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: tiller
    namespace: kube-system
```

```bash
kubectl create -f rbac-config.yaml
```

以上步骤配置成功后，安装tiller （和helm client的版本要一样）

```bash
# 以下命令二选一

# google源
helm init --service-account tiller --upgrade -i gcr.io/kubernetes-helm/tiller:v2.16.0
# 阿里源
helm init --service-account tiller --upgrade -i registry.cn-hangzhou.aliyuncs.com/google_containers/tiller:v2.16.0 --stable-repo-url https://kubernetes.oss-cn-hangzhou.aliyuncs.com/charts

# 参数--stable-repo-url用于拉取charts所在源的位置，如果不设置则默认访问官方charts

# 查看tiller是否安装成功
kubectl get pod -n kube-system -l app=helm

# 再次执行 helm version可以看到client和service都安装好了
helm version
```

## 部署 KubeSphere

版本要求：

- Kubernetes >=1.13.0 && <=1.16.0
- GitVersion >v1.13.0
- Helm >= 2.10.0

机器要求：

- 集群work节点可用总内存至少10G以上，建议20G

### 在 Master 节点安装 kubeSphere

```bash
# 在Kubernetes 集群中创建名为 kubesphere-system 和 kubesphere-monitoring-system 的 namespace。

cat <<EOF | kubectl create -f -
---
apiVersion: v1
kind: Namespace
metadata:
    name: kubesphere-system
---
apiVersion: v1
kind: Namespace
metadata:
    name: kubesphere-monitoring-system
EOF
```

### 创建 Kubernetes 集群 CA 证书的 Secret

> 注：按照当前集群 ca.crt 和 ca.key 证书路径创建（Kubeadm 创建集群的证书路径一般为 /etc/kubernetes/pki）

```bash
kubectl -n kubesphere-system create secret generic kubesphere-ca  \
--from-file=ca.crt=/etc/kubernetes/pki/ca.crt  \
--from-file=ca.key=/etc/kubernetes/pki/ca.key
```

### 创建集群 etcd 的证书 Secret

- 若 etcd 已经配置过证书，则参考如下创建（以下命令适用于 Kubeadm 创建的 Kubernetes 集群环境）：

```bash
kubectl -n kubesphere-monitoring-system create secret generic kube-etcd-client-certs  \
--from-file=etcd-client-ca.crt=/etc/kubernetes/pki/etcd/ca.crt  \
--from-file=etcd-client.crt=/etc/kubernetes/pki/etcd/healthcheck-client.crt  \
--from-file=etcd-client.key=/etc/kubernetes/pki/etcd/healthcheck-client.key
```

- 若 etcd 没有配置证书，则创建空 Secret：

```bash
kubectl -n kubesphere-monitoring-system create secret generic kube-etcd-client-certs
```

- 克隆 kubesphere-installer 仓库至本地

```bash
yum install git
git clone https://github.com/kubesphere/ks-installer.git
```

- 进入 ks-installer，然后在 Kubernetes 集群部署 KubeSphere

```bash
cd deploy

# 根据参数说明列表，编辑 kubesphere-installer.yaml 中 ks-config.yaml 为当前集群参数信息（若 etcd 无证书，设置 etcd_tls_enable: False）
# 修改kube_apiserver_host和etcd_endpoint_ips为机器的内网IP
vim kubesphere-installer.yaml

kubectl apply -f kubesphere-installer.yaml
```

- 查看部署日志信息

```bash
kubectl logs -n kubesphere-system $(kubectl get pod -n kubesphere-system -l job-name=kubesphere-installer -o jsonpath='{.items[0].metadata.name}') -f
```

- 安装成功 安装成功执行以下命令查看状态

```bash
kubectl get svc -n kubesphere-system
```

- 使用 IP:30880 访问 KubeSphere UI 界面，默认的集群管理员账号为 admin/P@88w0rd

```bash
# 查看指定 namespace 下 pod 所属的 node 节点
kubectl get pods -n istio-system -o wide

# 查看dev下的pod
kubectl get pods -n dev

# 查看pod xxx的yaml文件
kubectl get pods -n dev xxx -o yaml

# 获取namespace 为dev 的pod详情
kubectl get pods -n dev -o wide

# 创建pod
kubectl apply -f xxx.yaml

# 显示node的labeal
kubectl get nodes --show-labels

# 查看 namespace为dev下的pod详情
kubectl describe pods -n dev [podName]

## 查看node节点详情
kubectl describe nodes [nodeName] -o wide
```

> 碰到 status为ContainerCreating ，可以到对应pod所在的node节点上执行journalctl -f查看镜像或容器实时状态

## kubeadm 部署高可用

高可用集群安装具备如下特点：

- CentOS 7.7
- Kubernetes 1.16.2
  - calico 3.9
  - nginx-ingress 1.5.5
- Docker 18.09.7
- 三个 master 组成主节点集群，通过内网 loader balancer 实现负载均衡；至少需要三个 master 节点才可组成高可用集群，否则会出现 脑裂 现象
- 多个 worker 组成工作节点集群，通过外网 loader balancer 实现负载均衡

安装后的拓扑图如下：

![4][4]

### 检查 centos / hostname

```bash
# 在 master 节点和 worker 节点都要执行
cat /etc/redhat-release

# 此处 hostname 的输出将会是该机器在 Kubernetes 集群中的节点名字
# 不能使用 localhost 作为节点的名字
hostname

# 请使用 lscpu 命令，核对 CPU 信息
# Architecture: x86_64    本安装文档不支持 arm 架构
# CPU(s):       2         CPU 内核数量不能低于 2
lscpu
```

- 修改 hostname

如果需要修改 hostname，可执行如下指令：

```bash
# 修改 hostname
hostnamectl set-hostname your-new-host-name
# 查看修改结果
hostnamectl status
# 设置 hostname 解析
echo "127.0.0.1   $(hostname)" >> /etc/hosts
```

- 检查网络

> 在所有节点执行命令

```bash{2,11,13}
[root@demo-master-a-1 ~]$ ip route show
default via 172.21.0.1 dev eth0
169.254.0.0/16 dev eth0 scope link metric 1002
172.21.0.0/20 dev eth0 proto kernel scope link src 172.21.0.12

[root@demo-master-a-1 ~]$ ip address
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:16:3e:12:a4:1b brd ff:ff:ff:ff:ff:ff
    inet 172.17.216.80/20 brd 172.17.223.255 scope global dynamic eth0
       valid_lft 305741654sec preferred_lft 305741654sec
```

- kubelet使用的IP地址：
  - `ip route show` 命令中，可以知道机器的默认网卡，通常是 `eth0`，如 ***default via 172.21.0.1 dev <font color="blue" weight="500">eth0</font>***
  - `ip address` 命令中，可显示默认网卡的 IP 地址，Kubernetes 将使用此 IP 地址与集群内的其他节点通信，如 `172.17.216.80`
  - 所有节点上 Kubernetes 所使用的 IP 地址必须可以互通（无需 NAT 映射、无安全组或防火墙隔离）

### 安装 docker / kubelet

**注意事项：**

- 任意节点 centos 版本为 7.6 或 7.7
- 任意节点 CPU 内核数量大于等于 2，且内存大于等于 4G
- 任意节点 hostname 不是 localhost，且不包含下划线、小数点、大写字母
- 任意节点都有固定的内网 IP 地址
- 任意节点都只有一个网卡，如果有特殊目的，我可以在完成 K8S 安装后再增加新的网卡
- 任意节点上 Kubelet使用的 IP 地址 可互通（无需 NAT 映射即可相互访问），且没有防火墙、安全组隔离
- 任意节点不会直接使用 docker run 或 docker-compose 运行容器

使用 root 身份在所有节点执行如下代码，以安装软件：

- docker
- nfs-utils
- kubectl / kubeadm / kubelet

install_kubelet.sh：

```bash
#!/bin/bash

# 在 master 节点和 worker 节点都要执行

# 安装 docker
# 参考文档如下
# https://docs.docker.com/install/linux/docker-ce/centos/ 
# https://docs.docker.com/install/linux/linux-postinstall/

# 卸载旧版本
yum remove -y docker \
docker-client \
docker-client-latest \
docker-common \
docker-latest \
docker-latest-logrotate \
docker-logrotate \
docker-selinux \
docker-engine-selinux \
docker-engine

# 设置 yum repository
yum install -y yum-utils \
device-mapper-persistent-data \
lvm2
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 安装并启动 docker
yum install -y docker-ce-18.09.7 docker-ce-cli-18.09.7 containerd.io
systemctl enable docker
systemctl start docker

# 安装 nfs-utils
# 必须先安装 nfs-utils 才能挂载 nfs 网络存储
yum install -y nfs-utils
yum install -y wget

# 关闭 防火墙
systemctl stop firewalld
systemctl disable firewalld

# 关闭 SeLinux
setenforce 0
sed -i "s/SELINUX=enforcing/SELINUX=disabled/g" /etc/selinux/config

# 关闭 swap
swapoff -a
yes | cp /etc/fstab /etc/fstab_bak
cat /etc/fstab_bak |grep -v swap > /etc/fstab

# 修改 /etc/sysctl.conf
# 如果有配置，则修改
sed -i "s#^net.ipv4.ip_forward.*#net.ipv4.ip_forward=1#g"  /etc/sysctl.conf
sed -i "s#^net.bridge.bridge-nf-call-ip6tables.*#net.bridge.bridge-nf-call-ip6tables=1#g"  /etc/sysctl.conf
sed -i "s#^net.bridge.bridge-nf-call-iptables.*#net.bridge.bridge-nf-call-iptables=1#g"  /etc/sysctl.conf
# 可能没有，追加
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-ip6tables = 1" >> /etc/sysctl.conf
echo "net.bridge.bridge-nf-call-iptables = 1" >> /etc/sysctl.conf
# 执行命令以应用
sysctl -p

# 配置K8S的yum源
cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
       http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

# 卸载旧版本
yum remove -y kubelet kubeadm kubectl

# 安装kubelet、kubeadm、kubectl
yum install -y kubelet-1.16.2 kubeadm-1.16.2 kubectl-1.16.2

# 修改docker Cgroup Driver为systemd
# # 将/usr/lib/systemd/system/docker.service文件中的这一行 ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock
# # 修改为 ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --exec-opt native.cgroupdriver=systemd
# 如果不修改，在添加 worker 节点时可能会碰到如下错误
# [WARNING IsDockerSystemdCheck]: detected "cgroupfs" as the Docker cgroup driver. The recommended driver is "systemd".
# Please follow the guide at https://kubernetes.io/docs/setup/cri/
sed -i "s#^ExecStart=/usr/bin/dockerd.*#ExecStart=/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock --exec-opt native.cgroupdriver=systemd#g" /usr/lib/systemd/system/docker.service

# 设置 docker 镜像，提高 docker 镜像下载速度和稳定性
# 如果您访问 https://hub.docker.io 速度非常稳定，亦可以跳过这个步骤
curl -sSL https://get.daocloud.io/daotools/set_mirror.sh | sh -s http://f1361db2.m.daocloud.io

# 重启 docker，并启动 kubelet
systemctl daemon-reload
systemctl restart docker
systemctl enable kubelet && systemctl start kubelet

docker version
```

> 如果此时执行 service status kubelet 命令，将得到 kubelet 启动失败的错误提示，请忽略此错误，因为必须完成后续步骤中 kubeadm init 的操作，kubelet 才能正常启动

### 初始化API Server

创建 ApiServer 的 Load Balancer（私网）

- 监听端口：6443 / TCP
- 后端资源组：包含 demo-master-a-1, demo-master-a-2, demo-master-a-3
- 后端端口：6443
- 开启 按源地址保持会话
- 假设完成创建以后，Load Balancer的 ip 地址为 x.x.x.x

> 根据每个人实际的情况不同，实现 LoadBalancer 的方式不一样，本文不详细阐述如何搭建 LoadBalancer，请读者自行解决，可以考虑的选择有：
> - nginx
> - haproxy
> - keepalived
> - 云供应商提供的负载均衡产品

### 初始化第一个Master节点

**注意事项：**

- 以 root 身份在 demo-master-a-1 机器上执行
- 初始化 master 节点时，如果因为中间某些步骤的配置出错，想要重新初始化 master 节点，请先执行 `kubeadm reset` 操作
- 关于初始化时用到的环境变量
  - APISERVER_NAME 不能是 master 的 hostname
  - APISERVER_NAME 必须全为小写字母、数字、小数点，不能包含减号
  - POD_SUBNET 所使用的网段不能与 master节点/worker节点 所在的网段重叠。该字段的取值为一个 CIDR 值，如果您对 CIDR 这个概念还不熟悉，请不要修改这个字段的取值 10.100.0.1/16

<pre style="display:none;">
  <!--
    Aliyun 建议：
    Pod CIDR 172.20.0.0/16
    Service CIDR 172.21.0.0/20
    建议选择范围：
    Pod CIDR 10.0.0.0/8，172.16-31.0.0/12-16，192.168.0.0/16 
    Service CIDR 10.0.0.0/16-24，172.16-31.0.0/16-24，192.168.0.0/16-24 
    注意：不能与 VPC 及 VPC 内已有 Kubernetes 集群使用的网段重复
   -->
</pre>

- 执行以下脚本完成初始化集群

```bash
# 只在第一个 master 节点执行
# 替换 apiserver.demo 为 您想要的 dnsName
export APISERVER_NAME=apiserver.demo
# Kubernetes 容器组所在的网段，该网段安装完成后，由 kubernetes 创建，事先并不存在于您的物理网络中
export POD_SUBNET=10.100.0.1/16
echo "127.0.0.1    ${APISERVER_NAME}" >> /etc/hosts

# 运行下面初始化脚本
bash init_master.sh
```

```bash
#!/bin/bash

# 只在 master 节点执行

# 脚本出错时终止执行
set -e

if [ ${#POD_SUBNET} -eq 0 ] || [ ${#APISERVER_NAME} -eq 0 ]; then
  echo -e "\033[31;1m请确保您已经设置了环境变量 POD_SUBNET 和 APISERVER_NAME \033[0m"
  echo 当前POD_SUBNET=$POD_SUBNET
  echo 当前APISERVER_NAME=$APISERVER_NAME
  exit 1
fi


# 查看完整配置选项 https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta2
rm -f ./kubeadm-config.yaml
cat <<EOF > ./kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
kubernetesVersion: v1.16.2
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers
controlPlaneEndpoint: "${APISERVER_NAME}:6443"
networking:
  serviceSubnet: "10.96.0.0/16"
  podSubnet: "${POD_SUBNET}"
  dnsDomain: "cluster.local"
EOF

# kubeadm init
# 根据您服务器网速的情况，您需要等候 3 - 10 分钟
kubeadm init --config=kubeadm-config.yaml --upload-certs

# 配置 kubectl
rm -rf /root/.kube/
mkdir /root/.kube/
cp -i /etc/kubernetes/admin.conf /root/.kube/config

# 安装 calico 网络插件
# 参考文档 https://docs.projectcalico.org/v3.9/getting-started/kubernetes/
rm -f calico-3.9.2.yaml
wget https://xinlichao.cn/resource/back-end/k8s/k8s-installation-kubeadm/calico-3.9.2.yaml-t -O calico-3.9.2.yaml
sed -i "s#192\.168\.0\.0/16#${POD_SUBNET}#" calico-3.9.2.yaml
kubectl apply -f calico-3.9.2.yaml
```

**执行结果中：**

- 第15、16、17行，用于初始化第二、三个 master 节点
- 第25、26行，用于初始化 worker 节点

```bash
Your Kubernetes control-plane has initialized successfully!

To start using your cluster, you need to run the following as a regular user:

  mkdir -p $HOME/.kube
  sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
  sudo chown $(id -u):$(id -g) $HOME/.kube/config

You should now deploy a pod network to the cluster.
Run "kubectl apply -f [podnetwork].yaml" with one of the options listed at:
  https://kubernetes.io/docs/concepts/cluster-administration/addons/

You can now join any number of the control-plane node running the following command on each as root:

  kubeadm join apiserver.k8s:6443 --token 4z3r2v.2p43g28ons3b475v \
    --discovery-token-ca-cert-hash sha256:959569cbaaf0cf3fad744f8bd8b798ea9e11eb1e568c15825355879cf4cdc5d6 \
    --control-plane --certificate-key 41a741533a038a936759aff43b5680f0e8c41375614a873ea49fde8944614dd6

Please note that the certificate-key gives access to cluster sensitive data, keep it secret!
As a safeguard, uploaded-certs will be deleted in two hours; If necessary, you can use 
"kubeadm init phase upload-certs --upload-certs" to reload certs afterward.

Then you can join any number of worker nodes by running the following on each as root:

kubeadm join apiserver.k8s:6443 --token 4z3r2v.2p43g28ons3b475v \
    --discovery-token-ca-cert-hash sha256:959569cbaaf0cf3fad744f8bd8b798ea9e11eb1e568c15825355879cf4cdc5d6 
```

- 检查 Master 初始化结果

```bash
# 只在第一个 master 节点执行

# 执行如下命令，等待 3-10 分钟，直到所有的容器组处于 Running 状态
watch kubectl get pod -n kube-system -o wide

# 查看 master 节点初始化结果
kubectl get nodes
```

> 请等到所有容器组（大约9个）全部处于 Running 状态，才进行下一步

### 初始化第二、三个Master节点

***获得 master 节点的 join 命令：***

可以和第一个Master节点一起初始化第二、三个Master节点，也可以从单Master节点调整过来，只需要

- 增加Master的 LoadBalancer
- 将所有节点的 /etc/hosts 文件中 apiserver.demo 解析为 LoadBalancer 的地址
- 添加第二、三个Master节点
- 初始化 master 节点的 token 有效时间为 2 小时

***在 demo-master-a-2 和 demo-master-a-3 机器上执行：***

```bash
# 只在第二、三个 master 节点 demo-master-a-2 和 demo-master-a-3 执行
# 替换 x.x.x.x 为 ApiServer LoadBalancer 的 IP 地址。如果还没有配置负载可以设置 demo-master-a-1 的ip（临时解决，生产建议用内网私有 LoadBalancer）
export APISERVER_IP=x.x.x.x
# 替换 apiserver.demo 为 前面已经使用的 dnsName
export APISERVER_NAME=apiserver.demo
echo "${APISERVER_IP}    ${APISERVER_NAME}" >> /etc/hosts
# 使用前面步骤中获得的第二、三个 master 节点的 join 命令
kubeadm join apiserver.demo:6443 --token ejwx62.vqwog6il5p83uk7y \
--discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303 \
--control-plane --certificate-key 70eb87e62f052d2d5de759969d5b42f372d0ad798f98df38f7fe73efdf63a13c
```

***第一个Master节点初始化2个小时后再初始化：***

获得 certificate key

```bash
# 只在 第一个 master 节点 demo-master-a-1 上执行
kubeadm init phase upload-certs --upload-certs
```

获得 join 命令

```bash
# 只在 第一个 master 节点 demo-master-a-1 上执行
kubeadm token create --print-join-command
```

则，第二、三个 master 节点的 join 命令如下：

```bash
kubeadm join apiserver.demo:6443 --token ejwx62.vqwog6il5p83uk7y \
--discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303 \ #1
--control-plane --certificate-key 70eb87e62f052d2d5de759969d5b42f372d0ad798f98df38f7fe73efdf63a13c #2
```

> 命令行中，#1部分(第1、2行)来自于前面获得的 join 命令，#2部分(第3行)来自于前面获得的 certificate key

如果一直停留在 pre-flight 状态，请在第二、三个节点上执行命令检查：

```bash
curl -ik https://apiserver.demo:6443/version

# 输出
HTTP/1.1 200 OK
Cache-Control: no-cache, private
Content-Type: application/json
Date: Wed, 30 Oct 2019 08:13:39 GMT
Content-Length: 263

{
  "major": "1",
  "minor": "16",
  "gitVersion": "v1.16.2",
  "gitCommit": "2bd9643cee5b3b3a5ecbd3af49d09018f0773c77",
  "gitTreeState": "clean",
  "buildDate": "2019-09-18T14:27:17Z",
  "goVersion": "go1.12.9",
  "compiler": "gc",
  "platform": "linux/amd64"
}

# 否则，请您检查一下您的 Loadbalancer 是否设置正确
```

检查 master 初始化结果

```bash
# 只在第一个 master 节点 demo-master-a-1 执行
# 查看 master 节点初始化结果
kubectl get nodes
```

### 初始化 worker节点

> 针对所有的 worker 节点执行

```bash
# 只在 worker 节点执行
# 替换 x.x.x.x 为 ApiServer LoadBalancer 的 IP 地址
export MASTER_IP=x.x.x.x
# 替换 apiserver.demo 为初始化 master 节点时所使用的 APISERVER_NAME
export APISERVER_NAME=apiserver.demo
echo "${MASTER_IP}    ${APISERVER_NAME}" >> /etc/hosts

# 替换为前面 kubeadm token create --print-join-command 的输出结果
kubeadm join apiserver.demo:6443 --token mpfjma.4vjjg8flqihor4vt     --discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303
```

***第一个Master节点初始化2个小时后再初始化：***

在第一个 master 节点 demo-master-a-1 节点执行

```bash
# 只在第一个 master 节点 demo-master-a-1 上执行
kubeadm token create --print-join-command

# 可获取kubeadm join 命令及参数，如下所示
kubeadm join apiserver.demo:6443 --token mpfjma.4vjjg8flqihor4vt     --discovery-token-ca-cert-hash sha256:6f7a8e40a810323672de5eee6f4d19aa2dbdb38411845a1bf5dd63485c43d303
```

> 该 token 的有效时间为 2 个小时，2小时内，您可以使用此 token 初始化任意数量的 worker 节点。

### 移除 worker 节点

> 在准备移除的 worker 节点上执行

```bash
kubeadm reset

```

> 在第一个 master 节点 demo-master-a-1 上执行

```bash
kubectl delete node demo-worker-x-x
```

> - 将 demo-worker-x-x 替换为要移除的 worker 节点的名字
> - worker 节点的名字可以通过在第一个 master 节点 demo-master-a-1 上执行 `kubectl get nodes` 命令获得

### 安装 Ingress Controller

kubernetes支持多种Ingress Controllers (traefik / Kong / Istio / Nginx 等)，推荐使用 https://github.com/nginxinc/kubernetes-ingress

```bash
# 只在第一个 master 节点 demo-master-a-1 上执行
kubectl apply -f nginx-ingress.yaml

# 卸载
kubectl delete -f nginx-ingress.yaml
```

nginx-ingress.yaml：

```yaml
# 如果打算用于生产环境，请参考 https://github.com/nginxinc/kubernetes-ingress/blob/v1.5.5/docs/installation.md 并根据您自己的情况做进一步定制

apiVersion: v1
kind: Namespace
metadata:
  name: nginx-ingress

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nginx-ingress
  namespace: nginx-ingress

---
apiVersion: v1
kind: Secret
metadata:
  name: default-server-secret
  namespace: nginx-ingress
type: Opaque
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUN2akNDQWFZQ0NRREFPRjl0THNhWFhEQU5CZ2txaGtpRzl3MEJBUXNGQURBaE1SOHdIUVlEVlFRRERCWk8KUjBsT1dFbHVaM0psYzNORGIyNTBjbTlzYkdWeU1CNFhEVEU0TURreE1qRTRNRE16TlZvWERUSXpNRGt4TVRFNApNRE16TlZvd0lURWZNQjBHQTFVRUF3d1dUa2RKVGxoSmJtZHlaWE56UTI5dWRISnZiR3hsY2pDQ0FTSXdEUVlKCktvWklodmNOQVFFQkJRQURnZ0VQQURDQ0FRb0NnZ0VCQUwvN2hIUEtFWGRMdjNyaUM3QlBrMTNpWkt5eTlyQ08KR2xZUXYyK2EzUDF0azIrS3YwVGF5aGRCbDRrcnNUcTZzZm8vWUk1Y2Vhbkw4WGM3U1pyQkVRYm9EN2REbWs1Qgo4eDZLS2xHWU5IWlg0Rm5UZ0VPaStlM2ptTFFxRlBSY1kzVnNPazFFeUZBL0JnWlJVbkNHZUtGeERSN0tQdGhyCmtqSXVuektURXUyaDU4Tlp0S21ScUJHdDEwcTNRYzhZT3ExM2FnbmovUWRjc0ZYYTJnMjB1K1lYZDdoZ3krZksKWk4vVUkxQUQ0YzZyM1lma1ZWUmVHd1lxQVp1WXN2V0RKbW1GNWRwdEMzN011cDBPRUxVTExSakZJOTZXNXIwSAo1TmdPc25NWFJNV1hYVlpiNWRxT3R0SmRtS3FhZ25TZ1JQQVpQN2MwQjFQU2FqYzZjNGZRVXpNQ0F3RUFBVEFOCkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQWpLb2tRdGRPcEsrTzhibWVPc3lySmdJSXJycVFVY2ZOUitjb0hZVUoKdGhrYnhITFMzR3VBTWI5dm15VExPY2xxeC9aYzJPblEwMEJCLzlTb0swcitFZ1U2UlVrRWtWcitTTFA3NTdUWgozZWI4dmdPdEduMS9ienM3bzNBaS9kclkrcUI5Q2k1S3lPc3FHTG1US2xFaUtOYkcyR1ZyTWxjS0ZYQU80YTY3Cklnc1hzYktNbTQwV1U3cG9mcGltU1ZmaXFSdkV5YmN3N0NYODF6cFErUyt1eHRYK2VBZ3V0NHh3VlI5d2IyVXYKelhuZk9HbWhWNThDd1dIQnNKa0kxNXhaa2VUWXdSN0diaEFMSkZUUkk3dkhvQXprTWIzbjAxQjQyWjNrN3RXNQpJUDFmTlpIOFUvOWxiUHNoT21FRFZkdjF5ZytVRVJxbStGSis2R0oxeFJGcGZnPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBdi91RWM4b1JkMHUvZXVJTHNFK1RYZUprckxMMnNJNGFWaEMvYjVyYy9XMlRiNHEvClJOcktGMEdYaVN1eE9ycXgrajlnamx4NXFjdnhkenRKbXNFUkJ1Z1B0ME9hVGtIekhvb3FVWmcwZGxmZ1dkT0EKUTZMNTdlT1l0Q29VOUZ4amRXdzZUVVRJVUQ4R0JsRlNjSVo0b1hFTkhzbysyR3VTTWk2Zk1wTVM3YUhudzFtMApxWkdvRWEzWFNyZEJ6eGc2clhkcUNlUDlCMXl3VmRyYURiUzc1aGQzdUdETDU4cGszOVFqVUFQaHpxdmRoK1JWClZGNGJCaW9CbTVpeTlZTW1hWVhsMm0wTGZzeTZuUTRRdFFzdEdNVWozcGJtdlFmazJBNnljeGRFeFpkZFZsdmwKMm82MjBsMllxcHFDZEtCRThCay90elFIVTlKcU56cHpoOUJUTXdJREFRQUJBb0lCQVFDZklHbXowOHhRVmorNwpLZnZJUXQwQ0YzR2MxNld6eDhVNml4MHg4Mm15d1kxUUNlL3BzWE9LZlRxT1h1SENyUlp5TnUvZ2IvUUQ4bUFOCmxOMjRZTWl0TWRJODg5TEZoTkp3QU5OODJDeTczckM5bzVvUDlkazAvYzRIbjAzSkVYNzZ5QjgzQm9rR1FvYksKMjhMNk0rdHUzUmFqNjd6Vmc2d2szaEhrU0pXSzBwV1YrSjdrUkRWYmhDYUZhNk5nMUZNRWxhTlozVDhhUUtyQgpDUDNDeEFTdjYxWTk5TEI4KzNXWVFIK3NYaTVGM01pYVNBZ1BkQUk3WEh1dXFET1lvMU5PL0JoSGt1aVg2QnRtCnorNTZud2pZMy8yUytSRmNBc3JMTnIwMDJZZi9oY0IraVlDNzVWYmcydVd6WTY3TWdOTGQ5VW9RU3BDRkYrVm4KM0cyUnhybnhBb0dCQU40U3M0ZVlPU2huMVpQQjdhTUZsY0k2RHR2S2ErTGZTTXFyY2pOZjJlSEpZNnhubmxKdgpGenpGL2RiVWVTbWxSekR0WkdlcXZXaHFISy9iTjIyeWJhOU1WMDlRQ0JFTk5jNmtWajJTVHpUWkJVbEx4QzYrCk93Z0wyZHhKendWelU0VC84ajdHalRUN05BZVpFS2FvRHFyRG5BYWkyaW5oZU1JVWZHRXFGKzJyQW9HQkFOMVAKK0tZL0lsS3RWRzRKSklQNzBjUis3RmpyeXJpY05iWCtQVzUvOXFHaWxnY2grZ3l4b25BWlBpd2NpeDN3QVpGdwpaZC96ZFB2aTBkWEppc1BSZjRMazg5b2pCUmpiRmRmc2l5UmJYbyt3TFU4NUhRU2NGMnN5aUFPaTVBRHdVU0FkCm45YWFweUNweEFkREtERHdObit3ZFhtaTZ0OHRpSFRkK3RoVDhkaVpBb0dCQUt6Wis1bG9OOTBtYlF4VVh5YUwKMjFSUm9tMGJjcndsTmVCaWNFSmlzaEhYa2xpSVVxZ3hSZklNM2hhUVRUcklKZENFaHFsV01aV0xPb2I2NTNyZgo3aFlMSXM1ZUtka3o0aFRVdnpldm9TMHVXcm9CV2xOVHlGanIrSWhKZnZUc0hpOGdsU3FkbXgySkJhZUFVWUNXCndNdlQ4NmNLclNyNkQrZG8wS05FZzFsL0FvR0FlMkFVdHVFbFNqLzBmRzgrV3hHc1RFV1JqclRNUzRSUjhRWXQKeXdjdFA4aDZxTGxKUTRCWGxQU05rMXZLTmtOUkxIb2pZT2pCQTViYjhibXNVU1BlV09NNENoaFJ4QnlHbmR2eAphYkJDRkFwY0IvbEg4d1R0alVZYlN5T294ZGt5OEp0ek90ajJhS0FiZHd6NlArWDZDODhjZmxYVFo5MWpYL3RMCjF3TmRKS2tDZ1lCbyt0UzB5TzJ2SWFmK2UwSkN5TGhzVDQ5cTN3Zis2QWVqWGx2WDJ1VnRYejN5QTZnbXo5aCsKcDNlK2JMRUxwb3B0WFhNdUFRR0xhUkcrYlNNcjR5dERYbE5ZSndUeThXczNKY3dlSTdqZVp2b0ZpbmNvVlVIMwphdmxoTUVCRGYxSjltSDB5cDBwWUNaS2ROdHNvZEZtQktzVEtQMjJhTmtsVVhCS3gyZzR6cFE9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=

---
kind: ConfigMap
apiVersion: v1
metadata:
  name: nginx-config
  namespace: nginx-ingress
data:
  server-names-hash-bucket-size: "1024"


---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: nginx-ingress
rules:
- apiGroups:
  - ""
  resources:
  - services
  - endpoints
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
  - update
  - create
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - list
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - extensions
  resources:
  - ingresses
  verbs:
  - list
  - watch
  - get
- apiGroups:
  - "extensions"
  resources:
  - ingresses/status
  verbs:
  - update
- apiGroups:
  - k8s.nginx.org
  resources:
  - virtualservers
  - virtualserverroutes
  verbs:
  - list
  - watch
  - get

---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: nginx-ingress
subjects:
- kind: ServiceAccount
  name: nginx-ingress
  namespace: nginx-ingress
roleRef:
  kind: ClusterRole
  name: nginx-ingress
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nginx-ingress
  namespace: nginx-ingress
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9113"
spec:
  selector:
    matchLabels:
      app: nginx-ingress
  template:
    metadata:
      labels:
        app: nginx-ingress
    spec:
      serviceAccountName: nginx-ingress
      containers:
      - image: nginx/nginx-ingress:1.5.5
        name: nginx-ingress
        ports:
        - name: http
          containerPort: 80
          hostPort: 80
        - name: https
          containerPort: 443
          hostPort: 443
        - name: prometheus
          containerPort: 9113
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        args:
          - -nginx-configmaps=$(POD_NAMESPACE)/nginx-config
          - -default-server-tls-secret=$(POD_NAMESPACE)/default-server-secret
         #- -v=3 # Enables extensive logging. Useful for troubleshooting.
         #- -report-ingress-status
         #- -external-service=nginx-ingress
         #- -enable-leader-election
          - -enable-prometheus-metrics
         #- -enable-custom-resources
```

### 在 IaaS 层完成如下配置（公网Load Balancer）

创建负载均衡 Load Balancer：

- 监听器 1：80 / TCP， SOURCE_ADDRESS 会话保持
- 服务器资源池 1： demo-worker-x-x 的所有节点的 80端口
- 监听器 2：443 / TCP， SOURCE_ADDRESS 会话保持
- 服务器资源池 2： demo-worker-x-x 的所有节点的443端口

假设刚创建的负载均衡 Load Balancer 的 IP 地址为： z.z.z.z

**配置域名解析：**

将域名 *.demo.yourdomain.com 解析到地址负载均衡服务器 的 IP 地址 z.z.z.z

> 在浏览器访问 a.demo.yourdomain.com，将得到 404 NotFound 错误页面

## 安装 Kubectl

日常工作中，您可能需要在自己的笔记本电脑上执行 kubectl 命令以管理远程 Linux 服务器上的 Kubernetes 集群。

### 在客户端电脑安装 kubectl

Kubernetes 官网文档参照 安装 [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) 安装时，经常会失败，因为国内访问 google 的镜像仓库存在问题。

#### Mac 安装 kubectl

```bash
# 下载最新的可执行文件
curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/darwin/amd64/kubectl"

# 添加可执行权限
chmod +x ./kubectl

# 复制到 PATH 路径
sudo mv ./kubectl /usr/local/bin/kubectl

# 检查已安装版本
kubectl version
```

#### Windows 安装 kubectl

- 从下面的链接下载 kubectl 可执行文件

https://storage.googleapis.com/kubernetes-release/release/v1.16.2/bin/windows/amd64/kubectl.exe

> - 请将其中的 v1.16.2 替换为最新的版本号
> - 通过此链接可获取最新的版本号 https://storage.googleapis.com/kubernetes-release/release/stable.txt

- 将下载的可执行文件添加到 PATH 环境变量

- 执行命令查看已安装的 kubectl 版本号

#### Linux 安装 kubectl

```bash
# 配置K8S的yum源

cat <<EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=http://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=http://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
       http://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

# 安装
yum install -y kubectl
```

### 获取 kubectl config 文件

> 请在 demo-master-a-1 节点上执行如下命令

```bash
cat /etc/kubernetes/admin.conf
```

**Linux 和 Mac：**

```bash
# 将前面获得的 /etc/kubernetes/admin.conf 文件的内容粘贴进该文件并保存
vim ~/.kube/config

# 配置 hosts, 将 x.x.x.x 替换成 demo-master-a-1 的实际 IP 地址
# 将 apiserver.demo 替换成前面获得 /etc/kubernetes/admin.conf 文件中 clusters/cluster/server 中 URL 里 host 对应的部分
sudo echo "x.x.x.x    apiserver.demo" >> /etc/hosts

# 验证。 更多参考：https://kubernetes.io/docs/reference/kubectl/overview/
kubectl get nodes
kubectl get pods -n kube-system

# 多个config（集群），合并配置
cd $HOME/.kube/config
KUBECONFIG=config1:config2 kubectl config view --flatten > $HOME/.kube/config

# 查看配置
kubectl config view

# 查看集群
kubectl config get-contexts
kubectl config current-context

# 切换集群
kubectl config use-context docker-for-desktop
kubectl config use-context kubernetes-admin@kubernetes
```

**Windows：**

```bash
# 用记事本（或其他文本编辑器）创建文件 ~/.kube/config，其中 ~ 代表当前的用户目录
# 将前面获得的 /etc/kubernetes/admin.conf 文件的内容粘贴进该文件并保存

# 用记事本打开 C:\windows\System32\drivers\etc\hosts 文件（需要管理员权限），在该文件末尾添加一行记录：
x.x.x.x    apiserver.demo

# 将 x.x.x.x 替换成 demo-master-a-1 的实际 IP 地址
# 将 apiserver.demo 替换成前面获得 /etc/kubernetes/admin.conf 文件中 clusters/cluster/server 中 URL 里 host 对应的部分
```

## 配置 Kubectl

`kubectl` 命令行工具从配置文件kubeconfig中查找用于调用 API Server 接口的信息：
* 集群 cluster
* 用户 user
* 名称空间 namespace
* 认证机制 authentication mechanism

> kubeconfig 并不是一个文件的名字，而是 kubectl 配置文件的统称

默认情况下，`kubectl` 读取 `$HOME/.kube/config` 作为配置文件。您可以通过两种方式为 `kubectl` 指定配置文件：
* 环境变量 `KUBECONFIG`
* 命令行参数 `--kubeconfig`

可以在一个或多个kubeconfig文件中配置多个集群的访问信息，并使用 `kubectl config use-context` 命令切换要访问哪个集群。本文描述了如何配置 kubectl 以访问多个集群。

> kubectl的版本号必须大于等于集群的版本号，执行命令 `kubectl version` 可查看 kubectl 版本

### KUBECONFIG环境变量

可以在 `KUBECONFIG` 环境变量中配置多个 kubeconfig 文件：
* 在 Linux 和 MAC 中，使用英文冒号 `:` 分隔
* 在 Windows 中，使用英文分号 `;` 分隔

当 `KUBECONFIG` 指定了多个 kubeconfig 文件时，kubectl会自动合并所有文件中的配置内容。您可以将每个集群的访问信息存储到一个文件中，并将该文件加入到 `KUBECONFIG` 环境变量中。

`KUBECONFIG` 环境变量并不是必须配置的，如果该环境变量不存在， kubectl 将使用默认位置的 kubeconfig 文件，即 `$HOME/.kube/config`。

### kubeconfig文件的合并

前面提到，kubectl会自动合并 `KUBECONFIG` 指定的多个文件，执行以下指令，可以查看最终生效的结果：

``` sh
kubectl config view
```

合并时的规则如下：
* 如果执行 kubectl 指令时，指定了 `--kubeconfig` 参数，则只使用该参数指定的 kubeconfig 文件，不会进行合并
* 否则，在指定了环境变量 `KUBECONFIG` 的情况下，该环境变量中的所有文件将被合并使用：
  * 对于不能正常解析的文件，提示错误信息
  * 当执行 `kubectl config use-context` 指令后，在第一个文件中保存 `current-context` 字段
  * 合并过程忽略冲突。例如：如果多个文件中都定义了 `red-user`，将只使用列表中第一个定义了 `red-user` 的内容，所有后面定义的 `red-user` 都将被忽略
* 如果既没指定 `--kubeconfig` 参数，又没指定 `KUBECONFIG` 环境变量，则使用默认的配置文件 `$HOME/.kube/config`，此时也无需合并

### 切换当前访问的集群

当您通过 `KUBECONFIG` 环境变量指定了多个集群的访问配置文件时，执行 `kubectl config view` 指令，输出结果如下所示：

* 其中 `contexts` 字段包含了多个访问集群的 `上下文`，每个上下文指定了一个 `name`，并指定了该 `上下文` 要访问的集群名称`cluster`，集群中的名称空间`namespace`，使用哪个用户去访问`user`。
* `current-context` 字段指定了当前生效的 `上下文`


``` yaml {6,11,21,22}
contexts: 
- context:
    cluster: development
    namespace: frontend
    user: developer
  name: dev-frontend
- context:
    cluster: development
    namespace: ramp
    user: developer
  name: dev-ramp-up
- context:
    cluster: development
    namespace: storage
    user: developer
  name: dev-storage
- context:
    cluster: scratch
    namespace: default
    user: experimenter
  name: exp-scratch
current-context: dev-frontend
kind: Config
users:
...
```

执行 `kubectl config get-contexts` 命令，可以查看可用的 `上下文` 列表，其中第一列带 `*` 的为当前使用的 `上下文`。

执行 `kubectl config use-context dev-storage` 命令，可以切换到另外一个 `上下文`

## 安装 Kubernetes Dashboard

Kubernetes Dashboard 是 Kubernetes 的官方 Web UI。使用 Kubernetes Dashboard，您可以：

- 向 Kubernetes 集群部署容器化应用
- 诊断容器化应用的问题
- 管理集群的资源
- 查看集群上所运行的应用程序
- 创建、修改Kubernetes 上的资源（例如 Deployment、Job、DaemonSet等）
- 展示集群上发生的错误

例如：您可以伸缩一个 Deployment、执行滚动更新、重启一个 Pod 或部署一个新的应用程序

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.3/aio/deploy/recommended.yaml
```

### 访问 Dashboard

Kubernetes Dashboard 当前，只支持使用 Bearer Token登录。 由于 Kubernetes Dashboard 默认部署时，只配置了最低权限的 RBAC。因此，我们要创建一个名为 `admin-user` 的 ServiceAccount，再创建一个 ClusterRolebinding，将其绑定到 Kubernetes 集群中默认初始化的 `cluster-admin` 这个 ClusterRole。

> 更多关于权限管理的信息，请参考 [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

- 创建 Service Account 和 ClusterRoleBinding

使用 kubeadm 安装集群时，默认创建了 ClusterRole cluster-admin。此时我们可以直接为刚才的 ServiceAccount 创建 ClusterRoleBinding。

执行如下命令可创建 ServiceAccount 和 ClusterRoleBinding

```bash
kubectl apply -f k8s-dashboard-auth.yaml
```

**k8s-dashboard-auth.yaml：**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
```

- 获取 Bearer Token

```bash
kubectl -n kubernetes-dashboard describe secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')
```

- 执行 kubectl proxy 命令

```bash
kubectl proxy

# 如果在服务器运行，修改监听地址，并接收所有请求，让外网访问。
# kubectl proxy --address=0.0.0.0 --port=8001 --accept-hosts='^*$'
```

您必须能够在自己的笔记本（工作电脑）上运行 kubectl 并访问您的集群。

访问路径：http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

> 如需要使用 nodePort 或 Ingress 的方式访问 Kubernetes Dashboard 请配置正确的 https 证书，或者使用 Firefox 浏览器，并忽略 HTTPS 校验错误。

将上一个步骤中获得的 Token 输入到登录界面中，点击 Sign in 按钮，完成登录

## 问题

### 重启Kubernetes集群

Kubernetes集群的设计目标是setup-and-run-forever，然而许多学习者使用自己笔记本上的虚拟机安装K8S集群用于学习，这就必然会出现反复重启集群所在虚拟机的情况。

**Worker节点不能启动：**

Master 节点的 IP 地址变化，导致 worker 节点不能启动。请重装集群，并确保所有节点都有固定内网 IP 地址。

**许多Pod一直Crash或不能正常访问：**

```bash
kubectl get pods --all-namespaces
```

重启后会发现许多 Pod 不在 Running 状态，此时，请使用如下命令删除这些状态不正常的 Pod。通常，您的 Pod 如果是使用 Deployment、StatefulSet 等控制器创建的，kubernetes 将创建新的 Pod 作为替代，重新启动的 Pod 通常能够正常工作。

```bash
kubectl delete pod <pod-name> -n <pod-namespece>
```

### 为什么Kubernetes Service不能ping

#### 现象

**Kubernetes Service 不能 ping**

例如可以执行 `nslookup` 命令，如下所示：

```bash
[root@gateway-example-6f6f45cd6-px8bn eip]# nslookup gateway-example
Server:         10.96.0.10
Address:        10.96.0.10#53

Name:   gateway-example.example.svc.cluster.local
Address: 10.105.141.232
```

但是执行 `ping` 命令则会失败：

```bash
[root@gateway-example-6f6f45cd6-px8bn eip]# ping gateway-example
PING gateway-example.example.svc.cluster.local (10.105.141.232) 56(84) bytes of data.
From 172.17.76.171 (172.17.76.171) icmp_seq=1 Time to live exceeded
From 172.17.76.171 (172.17.76.171) icmp_seq=2 Time to live exceeded
From 172.17.76.171 (172.17.76.171) icmp_seq=3 Time to live exceeded
From 172.17.76.171 (172.17.76.171) icmp_seq=4 Time to live exceeded
^C
--- gateway-example.example.svc.cluster.local ping statistics ---
4 packets transmitted, 0 received, +4 errors, 100% packet loss, time 3003ms
```

执行 `curl` 命令会成功：(如果后端 Pod 正常)

```bash
[root@gateway-example-6f6f45cd6-px8bn eip]# curl gateway-example:9201
{"timestamp":"2019-11-29T15:29:39.515+0000","path":"/","status":404,"error":"Not Found","message":null}
```

执行 `telnet` 命令也可以成功：(如果后端 Pod 正常)

```bash
[root@gateway-example-6f6f45cd6-px8bn eip]# telnet gateway-example 9201
Trying 10.105.141.232...
Connected to gateway-example.
Escape character is '^]'.
```

#### 解释

在 Kubernetes 的网络中，Service 就是 ping 不通的。因为 Kubernetes 只是为 Service 生成了一个虚拟 IP 地址，实现的方式有：
- [User space 代理模式](https://xinlichao.cn/back-end/k8s/k8s-services-networking/#user-space-代理模式)
- [Iptables 代理模式](https://xinlichao.cn/back-end/k8s/k8s-services-networking/#iptables-代理模式)
- [IPVS 代理模式](https://xinlichao.cn/back-end/k8s/k8s-services-networking/#ipvs-代理模式)

不管是哪种代理模式，Kubernetes Service 的 IP 背后都没有任何实体可以响应「ICMP」，全称为 Internet 控制报文协议（Internet Control Message Protocol）。参考 [每天都在用的Ping命令，它到底是什么？](https://www.jianshu.com/p/dc9de5038874)

通过 Service 访问 Pod 时的数据传递方式，可参考 [数据包的传递：Service-to-Pod](https://xinlichao.cn/back-end/k8s/k8s-services-networking/#数据包的传递：service-to-pod)

### 为什么我不能获取到镜像，ImagePullBackoff

> 应用长时间处于 Pending 状态时，也可以按照这个办法查看镜像的下载进度。

安装 Kubernetes 过程中，或者向 Kubernetes 部署应用的过程中，有可能会碰到 ImagePullBackoff 的问题。例如执行命令：

```sh
kubectl get pods -n kube-system
```

结果如下所示：

``` {2,3}
NAME                                          READY   STATUS              RESTARTS   AGE
coredns-94d74667-6dj45                        1/1     ImagePullBackOff    0          12m
coredns-94d74667-xv6wd                        1/1     Pending             0          12m
etcd-master                                   1/1     Running             0          13m
kube-apiserver-master                         1/1     Running             0          13m
kube-controller-manager-master                1/1     Running             0          12m
kube-flannel-ds-amd64-4wjcl                   1/1     Running             0          12m
kube-flannel-ds-amd64-9k28h                   1/1     Running             0          12m
kube-flannel-ds-amd64-pwkv5                   1/1     Running             0          12m
kube-proxy-qd6w7                              1/1     Running             0          12m
kube-scheduler-master                         1/1     Running             0          12m
```

碰到这个问题时，可按如下步骤解决：

* 确定问题 Pod 所在节点，以 `kube-system` 名称空间下的 Pod `coredns-94d74667-6dj45` 为例：
  ``` sh
  kubectl get pods coredns-94d74667-6dj45 -n kube-system -o wide
  ```

  输出结果如下所示：
  ```
  NAME                     READY   STATUS    RESTARTS   AGE   IP            NODE     NOMINATED NODE   READINESS GATES
  coredns-94d74667-6dj45   1/1     Running   2          39d   10.244.0.40   master   <none>           <none>
  ```
  从这个就结果中，我们得知，该 Pod 被调度到了 `master` 节点

* 确定 Pod 所使用的容器镜像：
  ``` sh
  kubectl get pods coredns-94d74667-6dj45 -n kube-system -o yaml | grep image:
  ```
  输出结果如下所示：
  ```
      image: registry.aliyuncs.com/google_containers/coredns:1.3.1
      image: registry.aliyuncs.com/google_containers/coredns:1.3.1
  ```
  从这个结果中，我们得知，该 Pod 使用到了容器镜像 `registry.aliyuncs.com/google_containers/coredns:1.3.1`

* 在 Pod 所在节点执行 docker pull 指令：
  ```sh
  docker pull registry.aliyuncs.com/google_containers/coredns:1.3.1
  ```

  如果镜像标签没有问题，docker 指令将显示该镜像的下载过程，耐心等待即可。如果不能抓取 docker 镜像，请参考 Docker 命令的输出提示，做对应的处理。

### 修改NodePort的范围

在 Kubernetes 集群中，NodePort 默认范围是 30000-32767，某些情况下，因为您所在公司的网络策略限制，您可能需要修改 NodePort 的端口范围，本文描述了具体的操作方法。

#### 修改kube-apiserver.yaml

使用 kubeadm 安装 K8S 集群的情况下，您的 Master 节点上会有一个文件 `/etc/kubernetes/manifests/kube-apiserver.yaml`，修改此文件，向其中添加 `--service-node-port-range=20000-22767` （请使用您自己需要的端口范围），如下所示：

``` yaml {38}
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    component: kube-apiserver
    tier: control-plane
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    - --advertise-address=172.17.216.80
    - --allow-privileged=true
    - --authorization-mode=Node,RBAC
    - --client-ca-file=/etc/kubernetes/pki/ca.crt
    - --enable-admission-plugins=NodeRestriction
    - --enable-bootstrap-token-auth=true
    - --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
    - --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
    - --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
    - --etcd-servers=https://127.0.0.1:2379
    - --insecure-port=0
    - --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
    - --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
    - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
    - --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
    - --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
    - --requestheader-allowed-names=front-proxy-client
    - --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
    - --requestheader-extra-headers-prefix=X-Remote-Extra-
    - --requestheader-group-headers=X-Remote-Group
    - --requestheader-username-headers=X-Remote-User
    - --secure-port=6443
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --service-cluster-ip-range=10.96.0.0/12
    - --service-node-port-range=20000-22767
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    - --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    image: registry.cn-hangzhou.aliyuncs.com/google_containers/kube-apiserver:v1.16.0
    imagePullPolicy: IfNotPresent
    livenessProbe:
      failureThreshold: 8
      httpGet:
        host: 172.17.216.80
        path: /healthz
        port: 6443
        scheme: HTTPS
      initialDelaySeconds: 15
      timeoutSeconds: 15
  ...
```

#### 重启apiserver

执行以下命令，重启 apiserver
``` sh
# 获得 apiserver 的 pod 名字
export apiserver_pods=$(kubectl get pods --selector=component=kube-apiserver -n kube-system --output=jsonpath={.items..metadata.name})
# 删除 apiserver 的 pod
kubectl delete pod $apiserver_pods -n kube-system
```

#### 验证结果

执行以下命令，验证修改是否生效：
``` sh
kubectl describe pod $apiserver_pods -n kube-system
```
输出结果如下所示：（此时，我们可以看到，apiserver 已经使用新的命令行参数启动）
``` {29}
...
    Host Port:     <none>
    Command:
      kube-apiserver
      --advertise-address=172.17.216.80
      --allow-privileged=true
      --authorization-mode=Node,RBAC
      --client-ca-file=/etc/kubernetes/pki/ca.crt
      --enable-admission-plugins=NodeRestriction
      --enable-bootstrap-token-auth=true
      --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt
      --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt
      --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
      --etcd-servers=https://127.0.0.1:2379
      --insecure-port=0
      --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt
      --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key
      --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
      --proxy-client-cert-file=/etc/kubernetes/pki/front-proxy-client.crt
      --proxy-client-key-file=/etc/kubernetes/pki/front-proxy-client.key
      --requestheader-allowed-names=front-proxy-client
      --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt
      --requestheader-extra-headers-prefix=X-Remote-Extra-
      --requestheader-group-headers=X-Remote-Group
      --requestheader-username-headers=X-Remote-User
      --secure-port=6443
      --service-account-key-file=/etc/kubernetes/pki/sa.pub
      --service-cluster-ip-range=10.96.0.0/12
      --service-node-port-range=20000-22767
      --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
      --tls-private-key-file=/etc/kubernetes/pki/apiserver.key
    State:          Running
      Started:      Mon, 11 Nov 2019 21:31:39 +0800
    Ready:          True
    Restart Count:  0
    Requests:
      cpu:        250m
  ...
```

::: tip 注意
* 对于已经创建的NodePort类型的Service，您需要删除重新创建
* 如果您的集群有多个 Master 节点，您需要逐个修改每个节点上的  `/etc/kubernetes/manifests/kube-apiserver.yaml` 文件，并重启 apiserver
:::

## 参考

- https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux/
- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm/
- https://kubernetes.io/zh/docs/reference/kubectl/overview/
- https://kuboard.cn/

[1]: /images/k8s/k8s-installation/1.jpg
[2]: /images/k8s/k8s-installation/2.jpg
[3]: /images/k8s/k8s-installation/3.jpg
[4]: /images/k8s/k8s-installation/4.jpg
