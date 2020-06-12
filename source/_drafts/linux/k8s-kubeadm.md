---
title: Kubernetes 多种安装方式
date: 2020-06-10 13:05:00
categories: Kubernetes
tags:
  - Kubernetes
---

目前安装 Kubernetes 的方式多样，主要是：Minikube、二进制部署、kubeadm、Kops、Rancher、Kubespray。

<!--more-->

## kubeadm 方式部署

Minikube 部署 Kubernetes 的核心就是 Kubeadm，下面来详细说明下 Kubeadm 原理及部署步骤。

Kubeadm 工具的出发点很简单，就是尽可能简单的部署一个生产可用的Kubernetes集群。实际也确实很简单，只需要两条命令：

```bash
# 创建一个 Master 节点
kubeadm init

# 将一个 Node 节点加入到当前集群中
kubeadm join <Master 节点的 IP 和端口>
```

执行 kubeadm init时：

- 自动化的集群机器合规检查
- 自动化生成集群运行所需的各类证书及各类配置，并将Master节点信息保存在名为cluster-info的ConfigMap中。
- 通过static Pod方式，运行API server, controller manager 、scheduler及etcd组件。
- 生成Token以便其他节点加入集群

执行 kubeadm join时：

- 节点通过token访问kube-apiserver，获取cluster-info中信息，主要是apiserver的授权信息（节点信任集群）。
- 通过授权信息，kubelet可执行TLS bootstrapping，与apiserver真正建立互信任关系（集群信任节点）。

简单来说，kubeadm 做的事就是把大部分组件都容器化，通过 StaticPod 方式运行，并自动化了大部分的集群配置及认证等工作，简单几步即可搭建一个可用Kubernetes的集群。

这里有个问题，为什么不把kubelet组件也容器化呢，是因为，kubelet在配置容器网络、管理容器数据卷时，都需要直接操作宿主机，而如果现在 kubelet 本身就运行在一个容器里，那么直接操作宿主机就会变得很麻烦。比如，容器内要做NFS的挂载，需要kubelet先在宿主机执行mount挂载NFS。如果kubelet运行在容器中问题来了，如果kubectl运行在容器中，要操作宿主机的Mount Namespace是非常复杂的。所以，kubeadm选择把kubelet运行直接运行在宿主机中，使用容器部署其他Kubernetes组件。所以，Kubeadm部署要安装的组件有Kubeadm、kubelet、kubectl三个。

上面说的是kubeadm部署方式的一般步骤，kubeadm部署是可以自由定制的，包括要容器化哪些组件，所用的镜像，是否用外部etcd，是否使用用户证书认证等以及集群的配置等等，都是可以灵活定制的，这也是kubeadm能够快速部署一个高可用的集群的基础。详细的说明可以参考[官方Reference](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm/)。但是，kubeadm最重要的作用还是解决集群部署问题，而不是集群配置管理的问题，官方也建议把Kubeadm作为一个基础工具，在其上层再去量身定制适合自己的集群的管理工具（例如minikube）。

### Kubeadm部署一个高可用集群

#### Kubernetes的高可用

Kubernetes的高可用主要指的是控制平面的高可用，简单说，就是有多套Master节点组件和Etcd组件，工作节点通过负载均衡连接到各Master。HA有两种做法，一种是将etcd与Master节点组件混布在一起：

![1][1]

另外一种方式是，使用独立的Etcd集群，不与Master节点混布：

![2][2]

两种方式的相同之处在于都提供了控制平面的冗余，实现了集群高可以用，区别在于：

Etcd混布方式：

- 所需机器资源少；
- 部署简单，利于管理；
- 容易进行横向扩展；
- 风险大，一台宿主机挂了，master和etcd就都少了一套，集群冗余度受到的影响比较大；

Etcd独立部署方式：

- 所需机器资源多（按照Etcd集群的奇数原则，这种拓扑的集群关控制平面最少就要6台宿主机了）；
- 部署相对复杂，要独立管理etcd集群和和master集群；
- 解耦了控制平面和Etcd，集群风险小健壮性强，单独挂了一台master或etcd对集群的影响很小；

#### 部署环境

由于机器资源不足，下面的部署测试，只会以混布的方式部署一个1*haproxy，2*master，2*node，共5台机器的集群，实际上由于etcd选举要过半数，至少要3台master节点才能构成高可用，在生产环境，还是要根据实际情况，尽量选择风险低的拓扑结构。

**机器：**

- master-1：192.168.41.230 (控制平面节点1)
- master-2：192.168.41.231 (控制平面节点2)
- node-1：172.16.201.108 (工作节点1)
- node-2：172.16.201.109 (工作节点2)
- haproxy：192.168.41.231 (haproxy)

**系统内核版本：**

```bash
# cat /etc/redhat-release
CentOS Linux release 7.6.1810 (Core)
# uname -r
5.0.5-1.el7.elrepo.x86_64
```

**集群版本：**

- kubeadm：1.14.0
- Kubernetes：1.14.0
- Docker：Community 18.09.4
- haproxy: 1.5.18

#### 部署步骤

**机器准备：**

> 在所有节点上操作：

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
cat <<EOF >  /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF
sysctl --system
```

**安装kubeadm、docker：**

> 在除了haproxy以外所有节点上操作:

- 将Kubernetes安装源改为阿里云，方便国内网络环境安装

```bash
cat << EOF > /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64/
enabled=1
gpgcheck=1
repo_gpgcheck=1
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
```

- 安装docker-ce

```bash
wget -O /etc/yum.repos.d/docker-ce.repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

yum install -y docker-ce
```

- 安装kubelet kubeadm kubectl

```bash
yum install -y kubelet kubeadm kubectl
```

- 安装配置负载均衡

> 在haproxy节点操作：

```bash
# 安装haproxy
yum install haproxy -y

# 修改haproxy配置
cat << EOF > /etc/haproxy/haproxy.cfg
global
    log         127.0.0.1 local2
    chroot      /var/lib/haproxy
    pidfile     /var/run/haproxy.pid
    maxconn     4000
    user        haproxy
    group       haproxy
    daemon

defaults
    mode                    tcp
    log                     global
    retries                 3
    timeout connect         10s
    timeout client          1m
    timeout server          1m

frontend kube-apiserver
    bind *:6443 # 指定前端端口
    mode tcp
    default_backend master

backend master # 指定后端机器及端口，负载方式为轮询
    balance roundrobin
    server master-1  192.168.41.230:6443 check maxconn 2000
    server master-2  192.168.41.231:6443 check maxconn 2000
EOF

# 开机默认启动haproxy，开启服务
systemctl enable haproxy
systemctl start haproxy

# 检查服务端口情况：
# netstat -lntup | grep 6443
tcp        0      0 0.0.0.0:6443            0.0.0.0:*               LISTEN      3110/haproxy
```

**部署Kubernetes：**

> 在master-1节点操作：

- 准备集群配置文件,目前用的api版本为v1beta1，具体配置可以参考[官方reference](https://godoc.org/k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm/v1beta1)

```bash
cat << EOF > /root/kubeadm-config.yaml
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.14.0 # 指定1.14版本
controlPlaneEndpoint: 192.168.41.232:6443 # haproxy地址及端口
imageRepository: registry.cn-hangzhou.aliyuncs.com/google_containers # 指定镜像源为阿里源
networking:
  podSubnet: 10.244.0.0/16 # 计划使用flannel网络插件，指定pod网段及掩码
EOF
```

- 执行节点初始化

```bash
systemctl enable kubelet
systemctl start kubelet
kubeadm config images pull --config kubeadm-config.yaml  # 通过阿里源预先拉镜像
kubeadm init --config=kubeadm-config.yaml --experimental-upload-certs
```

安装成功，可以看到输出

```bash
You can now join any number of the control-plane node running the following command on each as root:
# master节点用以下命令加入集群：

  kubeadm join 192.168.41.232:6443 --token ocb5tz.pv252zn76rl4l3f6 \
    --discovery-token-ca-cert-hash sha256:141bbeb79bf58d81d551f33ace207c7b19bee1cfd7790112ce26a6a300eee5a2 \
    --experimental-control-plane --certificate-key 20366c9cdbfdc1435a6f6d616d988d027f2785e34e2df9383f784cf61bab9826

Then you can join any number of worker nodes by running the following on each as root:
# 工作节点用以下命令加入集群：
kubeadm join 192.168.41.232:6443 --token ocb5tz.pv252zn76rl4l3f6 \
    --discovery-token-ca-cert-hash sha256:141bbeb79bf58d81d551f33ace207c7b19bee1cfd7790112ce26a6a300eee5a2 
```

原来的kubeadm版本，join命令只用于工作节点的加入，而新版本加入了 --experimental-contaol-plane 参数后，控制平面（master）节点也可以通过kubeadm join命令加入集群了。

- 加入另外一个master节点

> 在master-2操作：

```bash
kubeadm join 192.168.41.232:6443 --token ocb5tz.pv252zn76rl4l3f6 \
--discovery-token-ca-cert-hash sha256:141bbeb79bf58d81d551f33ace207c7b19bee1cfd7790112ce26a6a300eee5a2 \
--experimental-control-plane --certificate-key 20366c9cdbfdc1435a6f6d616d988d027f2785e34e2df9383f784cf61bab9826

mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config
```

现在，在任何一个master 节点，执行kubectl get no,可以看到，集群中已经有2台master节点了

```bash
# kubectl get no
NAME       STATUS     ROLES    AGE     VERSION
master-1   NotReady   master   34m     v1.14.0
master-2   NotReady   master   4m52s   v1.14.0
```

- 加入两个工作节点

> 分别在两个node节点操作：

```bash
kubeadm join 192.168.41.232:6443 --token ocb5tz.pv252zn76rl4l3f6 \
    --discovery-token-ca-cert-hash sha256:141bbeb79bf58d81d551f33ace207c7b19bee1cfd7790112ce26a6a300eee5a2 
```

再次执行kubectl get no

```bash
# kubectl  get no
NAME       STATUS     ROLES    AGE     VERSION
master-1   NotReady   master   45m     v1.14.0
master-2   NotReady   master   15m     v1.14.0
node-1     NotReady   <none>   6m19s   v1.14.0
node-2     NotReady   <none>   4m59s   v1.14.0
```

可以看到两个node节点都加入集群了。可是，各个节点状态为什么都是NotReady呢。通过执行kubectl describe master-1，可以看到这样的提示：

```bash
runtime network not ready: NetworkReady=false reason:NetworkPluginNotReady message:docker: network plugin is not ready: cni config uninitialized
```

原来是因为网络插件没有就绪导致的。所以 ，我们来安装一波

```bash
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/a70459be0084506e4ec919aa1c114638878db11b/Documentation/kube-flannel.yml
```

再次查看节点状态，可以看到所有节点都已经ready了。

```bash
# kubectl  get no
NAME       STATUS   ROLES    AGE    VERSION
master-1   Ready    master   134m   v1.14.0
master-2   Ready    master   104m   v1.14.0
node-1     Ready    <none>   94m    v1.14.0
node-2     Ready    <none>   93m    v1.14.0
```

至此，一个2主节点2工作节点的k8s集群已经搭建完毕。如果要加入更多的master或node节点，只要多次执行kubeadm join命令加入集群就好，不需要额外配置，非常方便。

**token过期问题：**

使用kubeadm join命令新增节点，需要2个参数，--token与--discovery-token-ca-cert-hash。其中，token有限期一般是24小时，如果超过时间要新增节点，就需要重新生成token。

```bash
# 重新创建token，创建完也可以通过kubeadm token list命令查看token列表
$ kubeadm token create
s058gw.c5x6eeze28****

# 通过以下命令查看sha256格式的证书hash
$ openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt | openssl rsa -pubin -outform der 2>/dev/null | openssl dgst -sha256 -hex | sed 's/^.* //'
9592464b295699696ce35e5d1dd155580ee29d9bd0884b*****

# 在新节点执行join
$  kubeadm join api-serverip:port --token s058gw.c5x6eeze28**** --discovery-token-ca-cert-hash 9592464b295699696ce35e5d1dd155580ee29d9bd0884b*****
```

**集群测试：**

这里部署一个简单的goweb服务来测试集群，运行时暴露8000端口，同时访问/info路径会显示容器的主机名。

- 准备deployment和svc的yaml：

```yaml
# deployment-goweb.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: goweb
spec:
  selector:
    matchLabels:
      app: goweb
  replicas: 4
  template:
    metadata:
      labels:
        app: goweb
    spec:
      containers:
      - image: lingtony/goweb
        name: goweb
        ports:
        - containerPort: 8000
```

```yaml
# svc-goweb.yaml
apiVersion: v1
kind: Service
metadata:
  name: gowebsvc
spec:
  selector:
    app: goweb
  ports:
  - name: default
    protocol: TCP
    port: 80
    targetPort: 8000
```

- 部署服务

```bash
kubectl apply -f deployment-goweb.yaml
kubectl apply -y svc-goweb.yaml
```

- 查看pod及服务

```bash
[root@master-1 ~]# kubectl get po -o wide
NAME                    READY   STATUS    RESTARTS   AGE   IP           NODE     NOMINATED NODE   READINESS GATES
goweb-6c569f884-67z89   1/1     Running   0          25m   10.244.1.2   node-1   <none>           <none>
goweb-6c569f884-bt4p6   1/1     Running   0          25m   10.244.1.3   node-1   <none>           <none>
goweb-6c569f884-dltww   1/1     Running   0          25m   10.244.1.4   node-1   <none>           <none>
goweb-6c569f884-vshkm   1/1     Running   0          25m   10.244.3.4   node-2   <none>           <none>
# 可以看到，4个pod分布在不同的node上
[root@master-1 ~]# kubectl get svc
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
gowebsvc     ClusterIP   10.106.202.0   <none>        80/TCP    11m
kubernetes   ClusterIP   10.96.0.1      <none>        443/TCP   21h
# 暴露80端口
```

- 测试访问

```bash
[root@master-1 ~]# curl http://10.106.202.0/info
Hostname: goweb-6c569f884-bt4p6
[root@master-1 ~]# curl http://10.106.202.0/info
Hostname: goweb-6c569f884-67z89
[root@master-1 ~]# curl http://10.106.202.0/info
Hostname: goweb-6c569f884-vshkm
#可以看到，对SVC的请求会在pod间负载均衡。
```

**小结：**

本文简单介绍了kubeadm工具原理，以及如何用它部署一个高可用的kubernetes集群。需要注意的是，kubeadm工具总体已经GA，可以在生产环境使用了。但是文中通过"kubeadm join -experimental-contaol-plane"参数增加主节点的方式，还是在alpha阶段，实际在生产环境还是用init方式来增加主节点比较稳定。kubeadm更多详细配置可以参考[官方文档](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm/)

## 参考

- https://github.com/AliyunContainerService/k8s-for-docker-desktop/
- https://minikube.sigs.k8s.io/
- https://github.com/AliyunContainerService/minikube/
- https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl-on-linux/
- https://segmentfault.com/a/1190000018741112
- https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm/

[1]: /images/k8s/k8s-installation/1.jpg
[2]: /images/k8s/k8s-installation/2.jpg
