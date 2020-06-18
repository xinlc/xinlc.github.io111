---
title: Kubespray 部署 Kubernetes
date: 2020-05-25 22:12:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

<!--more-->

## Kubespray 方式部署

[Kubespray](https://github.com/kubernetes-incubator/kubespray) 是 Google 开源的一个部署生产级别的 Kubernetes 服务器集群的开源项目，它整合了Ansible作为部署的工具。目标是提供 Production Ready Kubernetes 部署方案，该项目基础是通过 Ansible Playbook 来定义系统与 Kubernetes 集群部署的任务，具有以下几个特点：

- 可以部署在 AWS, GCE, Azure, OpenStack 以及裸机上.
- 部署 High Available Kubernetes 集群.
- 可组合性 (Composable)，可自行选择 Network Plugin (flannel, calico, canal, weave) 来部署.
- 支持多种 Linux distributions(CoreOS, Debian Jessie, Ubuntu 16.04, CentOS/RHEL7).

## KubeSpray 搭建多节点K8S集群

部署多节点

## 机器准备

使用 Aliyun 抢占式 ECS 测试：

主机 | 系统版本 | 配置 | ip
---|---|---|---
Ansible(KubeSpray) | CentOS 7.7 | 2核8G | 192.168.1.100
mater01 | CentOS 7.7 | 2核8G | 192.168.1.101
mater02 | CentOS 7.7 | 2核8G | 192.168.1.102
mater03 | CentOS 7.7 | 2核8G | 192.168.1.103
worker01 | CentOS 7.7 | 2核8G | 192.168.1.111
worker02 | CentOS 7.7 | 2核8G | 192.168.1.112
worker03 | CentOS 7.7 | 2核8G | 192.168.1.113
worker04 | CentOS 7.7 | 2核8G | 192.168.1.114

Ansible那台主机使用KubeSpray进行部署，这台机器不做Kubernetes相关集群的部署，这里部署7节点的k8s集群环境。本次部署，使用的KubeSpray版本为v2.13.1。

## 环境准备

> 在所有节点上操作

### 加速源配置

**yum源：**

```bash
yum install -y wget
mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup
wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
yum clean all
yum makecache
```

**pip源：**

```bash
mkdir ~/.pip
cat > ~/.pip/pip.conf << EOF
[global]
trusted-host=mirrors.aliyun.com
index-url=https://mirrors.aliyun.com/pypi/simple/
EOF
```

**docker源：**

```bash
mkdir /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "registry-mirrors": ["https://自己申请.mirror.aliyuncs.com", "http://hub-mirror.c.163.com"]
}
EOF
```

### 配置机器环境

```bash
# 关闭 selinux
setenforce  0
sed -i --follow-symlinks 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/sysconfig/selinux

# 关闭 firewall
systemctl stop firewalld
systemctl disable firewalld

# 关闭swap
swapoff -a
sed -i 's/^.*swap.*$/###&/g' /etc/fstab

# 开启iptables
# yum install iptables -y
# yum install iptables-services -y
# systemctl start iptables.service
# systemctl enable iptables.service

# iptables -F
# iptables -P INPUT ACCEPT
# iptables -P OUTPUT ACCEPT
# iptables -P FORWARD ACCEPT
# service iptables save
# systemctl restart iptables.service

# 配置ip转发
# modprobe br_netfilter
# echo '1' > /proc/sys/net/bridge/bridge-nf-call-iptables
# sysctl -w net.ipv4.ip_forward=1

# 查看br_netfilter模块是否存在
lsmod | grep br_netfilter
# 添加br_netfilter模块
modprobe br_netfilter
# cat > /etc/rc.sysinit << EOF
# #!/bin/bash
# for file in /etc/sysconfig/modules/*.modules
# do
#   [ -x \$file ] && \$file
# done
# EOF
# cat > /etc/sysconfig/modules/br_netfilter.modules << EOF
# modprobe br_netfilter
# EOF
# chmod 755 /etc/sysconfig/modules/br_netfilter.modules

# 优化内核参数
# sudo vim /etc/sysctl.d/k8s.conf
# net.bridge.bridge-nf-call-ip6tables = 1
# net.bridge.bridge-nf-call-iptables = 1
# net.ipv4.ip_nonlocal_bind = 1
# net.ipv4.ip_forward = 1
# vm.swappiness=0
# sudo sysctl --system
# sudo sysctl -p
cd /tmp
cat > k8s.conf <<EOF
net.bridge.bridge-nf-call-iptables=1
net.bridge.bridge-nf-call-ip6tables=1
net.ipv4.ip_forward=1
net.ipv4.tcp_tw_recycle=0
net.ipv4.neigh.default.gc_thresh1=1024
net.ipv4.neigh.default.gc_thresh1=2048
net.ipv4.neigh.default.gc_thresh1=4096
vm.swappiness=0
vm.overcommit_memory=1
vm.panic_on_oom=0
fs.inotify.max_user_instances=8192
fs.inotify.max_user_watches=1048576
fs.file-max=52706963
fs.nr_open=52706963
net.ipv6.conf.all.disable_ipv6=1
net.netfilter.nf_conntrack_max=2310720
EOF
/bin/cp -av k8s.conf /etc/sysctl.d/k8s.conf
sysctl -p /etc/sysctl.d/k8s.conf

# 安装软件包
cd /tmp
wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
yum clean all && yum makecache faster
yum -y install conntrack ipvsadm ipset jq iptables curl sysstat libseccomp wget socat git


# 升级内核
rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-3.el7.elrepo.noarch.rpm
yum --enablerepo=elrepo-kernel install -y kernel-lt
grep initrd16 /boot/grub2/grub.cfg
grub2-set-default 0
reboot
```

## 对Ansibe(kubespray)主机之外的实验机进行预部署

> Master、worker节点的操作

```bash
# 主机名和hosts解析
HOSTNAME=master01
# HOSTNAME=master02
# HOSTNAME=master03
# HOSTNAME=worker01
# HOSTNAME=worker02
# HOSTNAME=worker03
# HOSTNAME=worker04
hostnamectl set-hostname "$HOSTNAME"
echo "$HOSTNAME">/etc/hostname
echo "$(grep -E '127|::1' /etc/hosts)">/etc/hosts
echo "$(ip a|grep "inet "|grep -v 127|awk -F'[ /]' '{print $6}') $HOSTNAME">>/etc/hosts

# 部署安装docker-18.09.7
yum install -y yum-utils
yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum makecache faster
yum install docker-ce-18.09.7 -y
systemctl enable docker
systemctl restart docker

```

## Ansibe(KubeSpray)主机操作

Ansibe主机也需要关闭selinux和关闭防火墙以及网络设置。

操纵kubespray主机进行集群安装：

```bash
HOSTNAME=kubespray
hostnamectl set-hostname "$HOSTNAME"
echo "$HOSTNAME">/etc/hostname
echo "$(grep -E '127|::1' /etc/hosts)">/etc/hosts
echo "$(ip a|grep "inet "|grep -v 127|awk -F'[ /]' '{print $6}') $HOSTNAME">>/etc/hosts

# 在Ansible主机上设置免密码操作其它主机
# 追加配置到hosts文件
cat >>/etc/hosts<<EOF
192.168.1.101    master01
192.168.1.102    master02
192.168.1.103    master03
192.168.1.111    worker01
192.168.1.112    worker02
192.168.1.113    worker03
192.168.1.114    worker04
EOF

# 配置ssh免密登录
ssh-keygen # 三次回车
# ssh-copy-id root@192.168.1.101  # 将秘钥分发给master主机。
# ssh-copy-id -i /root/.ssh/id_rsa.pub root@master
ssh-copy-id -o StrictHostKeyChecking=no 127.0.0.1
ssh -o StrictHostKeyChecking=no $(hostname) hostname
for i in $(cat /etc/hosts|grep -E 'master|worker'|awk '{print $2}')
do
  ssh-copy-id -o StrictHostKeyChecking=no $i
  ssh -o StrictHostKeyChecking=no $i hostname
done

# 安装ansible环境
# yum install -y epel-release python36 python36-pip git
cd /tmp
wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
yum clean all && yum makecache faster
yum -y install python36 python36-pip ansible
pip3 install -i https://mirrors.aliyun.com/pypi/simple/ --upgrade pip Jinja2

# 下载 kubespray 并安装依赖
cd /opt
wget https://github.com/kubernetes-sigs/kubespray/archive/v2.13.1.tar.gz
tar -xf v2.13.1.tar.gz
cd kubespray-2.13.1
# 安装依赖
pip3 install -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt
cp -rfp inventory/sample inventory/mycluster

# 集群安装，生成配置文件：
# declare -a IPS=($(hostname -i))
# declare -a IPS=(192.168.1.101 192.168.1.102 xxx xxx)
declare -a IPS=($(cat /etc/hosts|grep -E 'master|worker'|awk '{printf $1" "}'))
# rm -rf inventory/mycluster/hosts.yaml
CONFIG_FILE=inventory/mycluster/hosts.yaml python3 contrib/inventory_builder/inventory.py ${IPS[@]}
sed -i "s/node1/master01/g" inventory/mycluster/hosts.yaml
sed -i "s/node2/master02/g" inventory/mycluster/hosts.yaml
sed -i "s/node3/master03/g" inventory/mycluster/hosts.yaml
sed -i "s/node4/worker01/g" inventory/mycluster/hosts.yaml
sed -i "s/node5/worker02/g" inventory/mycluster/hosts.yaml
sed -i "s/node6/worker03/g" inventory/mycluster/hosts.yaml
sed -i "s/node7/worker04/g" inventory/mycluster/hosts.yaml
# 手动修改hosts.yaml文件，在kube-master中加入master03，将kube-node中master节点剔除
cat inventory/mycluster/group_vars/all/all.yml
cat inventory/mycluster/group_vars/k8s-cluster/k8s-cluster.yml

# 替换被墙得源：
find /opt/kubespray-2.13.1 -name '*.yml' | xargs -n1 -I{} sed -i "s/gcr\.io\/google_containers/gcr\.mirrors\.ustc\.edu\.cn\/google-containers/g" {}
find /opt/kubespray-2.13.1 -name '*.yml' | xargs -n1 -I{} sed -i "s/gcr\.io\/google-containers/gcr\.mirrors\.ustc\.edu\.cn\/google-containers/g" {}
find /opt/kubespray-2.13.1 -name '*.yml' | xargs -n1 -I{} sed -i 's/quay\.io/quay-mirror\.qiniu\.com/' {}


# 执行集群安装
cd /opt/kubespray-2.13.1
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root cluster.yml

# 在任意一个master节点上验证
ssh master01
kubectl get node --all-namespaces -o wide
kubectl get pods --all-namespaces -o wide
kubectl cluster-info
kubectl -n kube-system describe $(kubectl -n kube-system get secret -n kube-system -o name | grep namespace) | grep ^token
exit


# 扩展 node, 运行ansible-playbook命令，用cluster.yml代替scale.yml
ansible-playbook -i inventory/mycluster/hosts.yaml scale.yml -b -v

# 删除节点，hosts.yaml无需修改，运行命令--extra-vars指定node。
# https://github.com/kubernetes-sigs/kubespray/blob/master/docs/getting-started.md
ansible-playbook -i inventory/mycluster/hosts.yaml remove-node.yml -b -v --extra-vars "node=node3"

# 升级
# https://github.com/kubernetes-sigs/kubespray/blob/master/docs/upgrades.md
ansible-playbook upgrade-cluster.yml -b -i inventory/sample/hosts.ini -e kube_version=v1.15.0

# 卸载
ansible-playbook -i inventory/mycluster/hosts.ini reset.yml
# 每台node都要执行
rm -rf /etc/kubernetes/
rm -rf /var/lib/kubelet
rm -rf /var/lib/etcd
rm -rf /usr/local/bin/kubectl
rm -rf /etc/systemd/system/calico-node.service
rm -rf /etc/systemd/system/kubelet.service
systemctl stop etcd.service
systemctl disable etcd.service
systemctl stop calico-node.service
systemctl disable calico-node.service
docker stop $(docker ps -q)
docker rm $(docker ps -a -q)
service docker restart
# reboot
```

## 集群安装测试和卸载

```bash
cd /opt/kubespray-2.13.1
ansible-playbook -i inventory/mycluster/hosts.yaml --become --become-user=root cluster.yml
kubectl get node --all-namespaces -o wide
kubectl get pods --all-namespaces -o wide
kubectl describe pod coredns-xxxx-xxxx --namespace kube-system
kubectl logs -f pods/coredns-xxxx-xxxx -n kube-system
# 单节点的k8s集群中会有一个coredns处于故障状态
kubectl describe pod kubernetes-dashboard-xxxx-dncrl --namespace kube-system
kubectl logs -f pods/kubernetes-dashboard-xxxx-dncrl -n kube-system
kubectl cluster-info
kubectl -n kube-system describe $(kubectl get secret -n kube-system -o name | grep namespace) | grep ^token
# 浏览器访问 https://192.168.199.10:6443/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy
# 需要贴入提取到的token才能最终授权访问

# 集群卸载：
cd /opt/kubespray-2.13.1
ansible-playbook -i inventory/mycluster/hosts.yaml  --become --become-user=root reset.yml

```

## 创建具有操作权限的Dashboard账号

```bash
# 默认的Dashboard登陆token只有浏览权限，没有操作权限，需要创建一个admin账号
cd /tmp/
cat >k8s-admin.yaml<<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-admin
  namespace: kube-system
---
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: dashboard-admin
subjects:
  - kind: ServiceAccount
    name: dashboard-admin
    namespace: kube-system
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
EOF
kubectl create -f k8s-admin.yaml

# 将获取token的语句存入脚本
cat >k8s-dashboard-info.sh<<EOF
#!/bin/bash
source ~/.bash_profile
kubectl cluster-info
echo -e '\n默认登陆Token:'
SecretName=\$(kubectl get secret -o wide --all-namespaces|grep namespace-controller-token|awk '{print \$2}')
kubectl describe secret \${SecretName} -n kube-system| grep ^token|awk '{print \$2}'
echo -e '\n具有操作权限的Token:'
SecretName=\$(kubectl get secret -o wide --all-namespaces|grep dashboard-admin|awk '{print \$2}')
kubectl describe secret \${SecretName} -n kube-system|grep ^token|awk '{print \$2}'
EOF
bash k8s-dashboard-info.sh
```

## 问题

### 由于墙的原因导致安装失败

解决思路：

- 搜索被墙的资源，替换为国内镜像资源；
- 将被墙资源提前下载到一台服务器上，开启静态服务，供其它节点下载；
- 用Minikube部署得知使用了哪些docker镜像，仅需要将含有相关镜像的Dockerfile提交到阿里云镜像仓库，由海外机器构建。再一台节点下载镜像后打tar包，供其它节点load；

```bash
# ./roles/container-engine/docker/defaults/main.yml
# 该文件记录了docker的安装信息，诸如版本、相应系统的软件包下载url：
# docker_rh_repo_base_url: 'https://download.docker.com/linux/centos/7/$basearch/stable'
# docker_rh_repo_gpgkey: 'https://download.docker.com/linux/centos/gpg'
# extras_rh_repo_base_url: "http://mirror.centos.org/centos/$releasever/extras/$basearch/"
# extras_rh_repo_gpgkey: "http://mirror.centos.org/centos/RPM-GPG-KEY-CentOS-7"
# 可以手动安装相应版本docker，建议手动安装并做下载优化，或者提前准备好优化配置：
mkdir -p /etc/docker
cat >/etc/docker/daemon.json<<EOF
{
  "registry-mirrors": ["http://hub-mirror.c.163.com","https://docker.mirrors.ustc.edu.cn"]
}
EOF
cd /opt/kubespray-2.13.1/roles/container-engine/docker/defaults
sed -i 's|download.docker.com/linux/centos/7|mirrors.aliyun.com/docker-ce/linux/centos/7|g' main.yml
sed -i 's|download.docker.com/linux/centos/gpg|mirrors.aliyun.com/docker-ce/linux/centos/gpg|g' main.yml
sed -i 's|mirror.centos.org/centos|mirrors.aliyun.com/centos|g' main.yml

```

```bash
# ./roles/download/defaults/main.yml
# 该文件记录了kubelet、kubectl、kubeadm、etcd、cni、calicoctl和crictl的版本和下载地址，这些地址均是不可达的
# 该文件还记录了k8s集群所需要的镜像仓库和tag，依旧是不可达的
# 这两类不可达的软件下载是使用kubespray安装k8s集群的核心问题
# 手动下载以下安装包，在本机之上创建一个nginx共享这些包的下载：
# kubelet_download_url:   "https://storage.googleapis.com/kubernetes-release/release/v1.16.7/bin/linux/amd64/kubelet"
# kubectl_download_url:   "https://storage.googleapis.com/kubernetes-release/release/v1.16.7/bin/linux/amd64/kubectl"
# kubeadm_download_url:   "https://storage.googleapis.com/kubernetes-release/release/v1.16.7/bin/linux/amd64/kubeadm"
# etcd_download_url:      "https://github.com/coreos/etcd/releases/download/v3.3.10/etcd-v3.3.10-linux-amd64.tar.gz"
# cni_download_url:       "https://github.com/containernetworking/plugins/releases/download/v0.8.1/cni-plugins-linux-amd64-v0.8.1.tgz"
# calicoctl_download_url: "https://github.com/projectcalico/calicoctl/releases/download/v3.7.3/calicoctl-linux-amd64"
# crictl_download_url:    "https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.16.1/crictl-v1.16.1-linux-amd64.tar.gz"
cd /tmp
yum -y install nginx
sed -i 's/80 default_server/60000 default_server/g' /etc/nginx/nginx.conf
cd /usr/share/nginx/html
rm -rf *
tar -xf /tmp/手动下载的全部包.tar.gz
systemctl start nginx && systemctl enable nginx
# 测试下载
mkdir /tmp/test && cd /tmp/test
wget "http://$(hostname -i):60000/kubelet"
wget "http://$(hostname -i):60000/kubectl"
wget "http://$(hostname -i):60000/kubeadm"
wget "http://$(hostname -i):60000/etcd-v3.3.10-linux-amd64.tar.gz"
wget "http://$(hostname -i):60000/cni-plugins-linux-amd64-v0.8.1.tgz"
wget "http://$(hostname -i):60000/calicoctl-linux-amd64"
wget "http://$(hostname -i):60000/crictl-v1.16.1-linux-amd64.tar.gz"
cd /tmp && rm -rf /tmp/test
# 修改配置
cd /opt/kubespray-2.13.1/roles/download/defaults/
sed -i "s|^kubelet_download_url.*$|#&\nkubelet_download_url: 'http://$(hostname -i):60000/kubelet'|g" main.yml
sed -i "s|^kubectl_download_url.*$|#&\nkubectl_download_url: 'http://$(hostname -i):60000/kubectl'|g" main.yml
sed -i "s|^kubeadm_download_url.*$|#&\nkubeadm_download_url: 'http://$(hostname -i):60000/kubeadm'|g" main.yml
sed -i "s|^etcd_download_url.*$|#&\netcd_download_url: 'http://$(hostname -i):60000/etcd-v3.3.10-linux-amd64.tar.gz'|g" main.yml
sed -i "s|^cni_download_url.*$|#&\ncni_download_url: 'http://$(hostname -i):60000/cni-plugins-linux-amd64-v0.8.1.tgz'|g" main.yml
sed -i "s|^calicoctl_download_url.*$|#&\ncalicoctl_download_url: 'http://$(hostname -i):60000/calicoctl-linux-amd64'|g" main.yml
sed -i "s|^crictl_download_url.*$|#&\ncrictl_download_url: 'http://$(hostname -i):60000/crictl-v1.16.1-linux-amd64.tar.gz'|g" main.yml

```

```bash
# 在一个节点上下载，另外节点装载即可
cd /tmp
cat >/tmp/image-list.txt<<EOF
nginx:1.17
coredns/coredns:1.6.0
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/quay.io-coreos-etcd:v3.3.10
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/pause-amd64:3.1
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/pause:3.1
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/kube-scheduler:v1.16.7
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/kubernetes-dashboard-amd64:v2.0.0-rc5
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/kube-proxy:v1.16.7
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/kube-controller-manager:v1.16.7
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/kube-apiserver:v1.16.7
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/k8s-dns-node-cache:1.15.8
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/docker.io-calico-node:v3.7.3
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/docker.io-calico-kube-controllers:v3.7.3
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/docker.io-calico-cni:v3.7.3
registry.cn-hangzhou.aliyuncs.com/vinc-k8s/cluster-proportional-autoscaler-amd64:1.6.0
EOF
mkdir image
for i in $(cat /tmp/image-list.txt)
do
  Name=$(basename $(echo $i|awk -F':' '{print $1}'))
  docker pull $i
  docker save $i -o /tmp/image/${Name}.tar
done
tar -czf image.tar.gz image

for i in 102 103 111 112 113 114
do
  scp -r /tmp/image.tar.gz 192.168.77.${i}:/tmp/
  ssh -o StrictHostKeyChecking=no 192.168.77.${i} \
    'cd /tmp/&& tar -xf image.tar.gz && cd /tmp/image && for i in $(ls);do docker load<$i;done'
done
for i in 101 102 103 111 112 113 114
do
  ssh 192.168.77.${i} 'rm -rf /tmp/image*'
done
```

> [更多参考](https://kubespray.io)

## 参考

- https://blog.csdn.net/zwjzqqb/article/details/104750727/
- https://www.jianshu.com/p/45b9707b4567/
- https://github.com/kubernetes-sigs/kubespray/
- https://github.com/ansible/ansible/
