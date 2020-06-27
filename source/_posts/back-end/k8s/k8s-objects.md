---
title: Kubernetes 对象
date: 2020-06-06 9:00:00
categories: Kubernetes
tags:
  - Kubernetes
---

本文描述了Kubernetes对象与Kubernetes API的关系，以及您如何在 `.yaml` 格式的文件中定义Kubernetes对象。

<!--more-->

## 什么是Kubernetes对象

Kubernetes对象指的是Kubernetes系统的持久化实体，所有这些对象合起来，代表了你集群的实际情况。常规的应用里，我们把应用程序的数据存储在数据库中，Kubernetes将其数据以Kubernetes对象的形式通过 api server存储在 etcd 中。具体来说，这些数据（Kubernetes对象）描述了：
* 集群中运行了哪些容器化应用程序（以及在哪个节点上运行）
* 集群中对应用程序可用的资源
* 应用程序相关的策略定义，例如，重启策略、升级策略、容错策略
* 其他Kubernetes管理应用程序时所需要的信息

一个Kubernetes对象代表着用户的一个意图（a record of intent），一旦您创建了一个Kubernetes对象，Kubernetes将持续工作，以尽量实现此用户的意图。创建一个 Kubernetes对象，就是告诉Kubernetes，您需要的集群中的工作负载是什么（集群的 **目标状态**）。

kubectl 通过调用 [kubernetes API](https://kubernetes.io/docs/concepts/overview/kubernetes-api/) 来实现对 Kubernetes 对象的操作。您也可以直接在自己的程序中调用 Kubernetes API，此时您可能要有用到 [Client Libraries](https://kubernetes.io/docs/reference/using-api/client-libraries/)

### 对象的spec和status

每一个 Kubernetes 对象都包含了两个重要的字段：
* `spec` 必须由您来提供，描述了您对该对象所期望的 **目标状态**
* `status` 只能由 Kubernetes 系统来修改，描述了该对象在 Kubernetes 系统中的 **实际状态**

Kubernetes通过对应的[控制器](#控制器)，不断地使实际状态趋向于您期望的目标状态。

例如，一个 Kubernetes Deployment 对象可以代表一个应用程序在集群中的运行状态。当您创建 Deployment 对象时，您可以通过 Deployment 的 spec 字段指定需要运行应用程序副本数（假设为3）。Kubernetes 从 Deployment 的 spec 中读取这些信息，并为您创建指定容器化应用程序的 3 个副本，再将实际的状态更新到 Deployment 的 status 字段。Kubernetes 系统将不断地比较 **实际状态** staus 和 **目标状态** spec 之间的差异，并根据差异做出对应的调整。例如，如果任何一个副本运行失败了，Kubernetes 将启动一个新的副本，以替代失败的副本。

### 描述Kubernetes对象

当您在 Kubernetes 中创建一个对象时，您必须提供
* 该对象的 spec 字段，通过该字段描述您期望的 **目标状态**
* 该对象的一些基本信息，例如名字

下面是一个 kubectl 可以使用的 `.yaml` 文件：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2 # 运行 2 个容器化应用程序副本
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.7.9
        ports:
        - containerPort: 80

```

使用 kube apply 命令可以创建该 `.yaml` 文件中的 Deployment 对象：

``` sh
kubectl apply -f deployment.yaml
```

输出结果如下所示：
```
deployment.apps/nginx-deployment created
```

使用 kubectl delete 命令可以删除该 `.yaml` 文件中的 Deployment 对象：

``` sh
kubectl delete -f deployment.yaml
```

### 必填字段

在上述的 `.yaml` 文件中，如下字段是必须填写的：

* **apiVersion** 用来创建对象时所使用的Kubernetes API版本
* **kind** 被创建对象的类型
* **metadata** 用于唯一确定该对象的元数据：包括 `name` 和 `namespace`，如果 `namespace` 为空，则默认值为 `default`
* **spec** 描述您对该对象的期望状态

不同类型的 Kubernetes，其 `spec` 对象的格式不同（含有不同的内嵌字段），通过 [API 手册](https://kubernetes.io/docs/reference/#api-reference) 可以查看 Kubernetes 对象的字段和描述。例如，假设您想了解 Pod 的 `spec` 定义，可以在 [这里](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#podspec-v1-core)找到，Deployment 的 `spec` 定义可以在 [这里](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#deploymentspec-v1-apps) 找到。

## 控制器

在机器人技术和自动化技术中，**控制循环** 是一个控制系统状态的无限循环。房间里的恒温器就是**控制循环**的一个例子

* 在恒温器上设定好目标温度，就是在告诉该 **控制循环** 你想要的 ***目标状态***。
* 房间里的实际温度，是 ***当前状态***
* 恒温器通过打开或关闭加热装置，不断地使 ***当前状态*** 接近于 ***目标状态***

在 Kubernetes 中，**控制器** 就是上面所说的 **控制循环**，它不断监控着集群的状态，并对集群做出对应的变更调整。每一个控制器都不断地尝试着将 ***当前状态*** 调整到 ***目标状态***。

### 控制器模式

在 Kubernetes 中，每个控制器至少追踪一种类型的资源。这些资源对象中有一个 `spec` 字段代表了目标状态。资源对象对应的控制器负责不断地将当前状态调整到目标状态。

理论上，控制器可以自己直接执行调整动作，然而，在Kubernetes 中，更普遍的做法是，控制器发送消息到 API Server，而不是直接自己执行调整动作。

#### 通过APIServer进行控制

以 Kubernetes 中自带的一个控制器 Job Controller 为例。Kubernetes 自带的控制器都是通过与集群中 API Server 交互来达到调整状态的目的。

Job 是一种 Kubernetes API 对象，一个 Job 将运行一个（或多个）Pod，执行一项任务，然后停止。当新的 Job 对象被创建时，Job Controller 将确保集群中有合适数量的节点上的 kubelet 启动了指定个数的 Pod，以完成 Job 的执行任务。Job Controller 自己并不执行任何 Pod 或容器，而是发消息给 API Server，由其他的控制组件配合 API Server，以执行创建或删除 Pod 的实际动作。

当新的 Job 对象被创建时，目标状态是指定的任务被执行完成。Job Controller 调整集群的当前状态以达到目标状态：创建 Pod 以执行 Job 中指定的任务

控制器同样也会更新其关注的 API 对象。例如：一旦 Job 的任务执行结束，Job Controller 将更新 Job 的 API 对象，将其标注为 `Finished`。（这有点儿像是恒温器将指示灯关闭，以表示房间里的温度已经到达指定温度。）

#### 直接控制

某些特殊的控制器需要对集群外部的东西做调整。例如，您想用一个控制器确保集群中有足够的节点，此时控制器需要调用云供应商的接口以创建新的节点或移除旧的节点。这类控制器将从 API Server 中读取关于目标状态的信息，并直接调用外部接口以实现调整目标。

Kubernetes中，真的提供了一个控制器可以水平伸缩集群中的节点。请参考 [Cluster autoscaling](https://kubernetes.io/docs/tasks/administer-cluster/cluster-management/#cluster-autoscaling)

### 目标状态 vs 当前状态

Kubernetes 使用了 `云原生`（cloud-native）的视角来看待系统，并且可以持续应对变化。您的集群在运行的过程中，任何时候都有可能发生突发事件，而控制器则自动地修正这些问题。这就意味着，本质上，您的集群永远不会达到一个稳定不变的状态。

这种通过控制器监控集群状态并利用负反馈原理不断接近目标状态的系统，相较于那种完成安装后就不再改变的系统，是一种更高级的系统形态，尤其是在您将运行一个大规模的复杂集群的情况下。

### 设计

作为一个底层设计原则，Kubernetes使用了大量的控制器，每个控制器都用来管理集群状态的某一个方面。普遍来说，任何一个特定的控制器都使用一种 API 对象作为其目标状态，并使用和管理多种类型的资源，以达到目标状态。

使用许多个简单的控制器比使用一个全能的控制器要更加有优势。控制器可能会出故障，而这也是在设计 Kubernetes 时要考虑到的事情。

::: tip
可能存在多种控制器可以创建或更新相同类型的 API 对象。为了避免混淆，Kubernetes 控制器在创建新的 API 对象时，会将该对象与对应的控制 API 对象关联，并且只关注与控制对象关联的那些对象。
* 例如，Deployment 和 Job，这两类控制器都创建 Pod。Job Controller 不会删除 Deployment Controller 创建的 Pod，因为控制器可以通过标签信息区分哪些 Pod 是它创建的。
:::

### 运行控制器的方式

Kubernetes 在 kube-controller-manager 中运行了大量的内建控制器（例如，Deployment Controller、Job Controller、StatefulSet Controller、DaemonSet Controller 等）。这些内建控制器提供了 Kubernetes 非常重要的核心功能。Kubernetes 可以运行一个 master 集群，以实现内建控制器的高可用。

您也可以安装一些运行在 kube-controller-manager 之外的控制器，这些控制器通常是对 Kubernetes 已有功能的一些扩展。或者，在必要的情况下，您也可以自己编写自己需要的控制器，将其部署为一组 Pod，或者在 Kubernetes 集群之外部署。如何选择，取决于您想要用这个控制器做什么。参考 [Extending your Kubernetes Cluster](https://kubernetes.io/docs/concepts/extend-kubernetes/extend-cluster/)

## 名称

Kubernetes REST API 中，所有的对象都是通过 `name` 和 `UID` 唯一性确定。查看文档 [identifiers design doc](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/architecture/identifiers.md) 可了解更多关于 `name` 和 `UID` 的规则。

* [Names](#Names)
* [UIDs](#UIDs)

### Names

可以通过 `namespace` + `name` 唯一性地确定一个 RESTFUL 对象，例如：

`/api/v1/namespaces/{namespace}/pods/{name}`

同一个名称空间下，同一个类型的对象，可以通过 `name` 唯一性确定。如果删除该对象之后，可以再重新创建一个同名对象。

依据命名规则，Kubernetes对象的名字应该：
* 最长不超过 253个字符
* 必须由小写字母、数字、减号 `-`、小数点 `.` 组成
* 某些资源类型有更具体的要求

例如，下面的配置文件定义了一个 name 为 `nginx-demo` 的 Pod，该 Pod 包含一个 name 为 `nginx` 的容器：

``` yaml {4,7}
apiVersion: v1
kind: Pod
metadata:
  name: nginx-demo
spec:
  containers:
  - name: nginx
    image: nginx:1.7.9
    ports:
    - containerPort: 80
```

### UIDs

UID 是由 Kubernetes 系统生成的，唯一标识某个 Kubernetes 对象的字符串。

Kubernetes集群中，每创建一个对象，都有一个唯一的 UID。用于区分多次创建的同名对象（如前所述，按照名字删除对象后，重新再创建同名对象时，两次创建的对象 name 相同，但是 UID 不同。）

## 名称空间

Kubernetes通过名称空间（namespace）在同一个物理集群上支持多个虚拟集群。

### 何时使用名称空间

名称空间的用途是，为不同团队的用户（或项目）提供虚拟的集群空间，也可以用来区分开发环境/测试环境、准上线环境/生产环境。

名称空间为 [名称](#names) 提供了作用域。名称空间内部的同类型对象不能重名，但是跨名称空间可以有同名同类型对象。名称空间不可以嵌套，任何一个Kubernetes对象只能在一个名称空间中。

名称空间可以用来在不同的团队（用户）之间划分集群的资源。

在 Kubernetes 将来的版本中，同名称空间下的对象将默认使用相同的访问控制策略。

当KUbernetes对象之间的差异不大时，无需使用名称空间来区分，例如，同一个软件的不同版本，只需要使用 [labels](#labels) 来区分即可。

### 如何使用名称空间

参考 [管理名称空间](#管理名称空间) 了解如何创建和删除名称空间。

### 查看名称空间

执行命令 `kubectl get namespaces` 可以查看名称空间，输出结果如下所示：

``` 
NAME          STATUS    AGE
default       Active    1d
kube-system   Active    1d
kube-public   Active    1d
```

Kubernetes 安装成功后，默认有初始化了三个名称空间：
* **default** 默认名称空间，如果 Kubernetes 对象中不定义 `metadata.namespace` 字段，该对象将放在此名称空间下
* **kube-system** Kubernetes系统创建的对象放在此名称空间下
* **kube-public** 此名称空间自动在安装集群是自动创建，并且所有用户都是可以读取的（即使是那些未登录的用户）。主要是为集群预留的，例如，某些情况下，某些Kubernetes对象应该被所有集群用户看到。

#### 在执行请求时设定namespace

执行 kubectl 命令时，可以使用 `--namespace` 参数指定名称空间，例如：

``` sh
kubectl run nginx --image=nginx --namespace=<您的名称空间>
kubectl get pods --namespace=<您的名称空间>
```

#### 设置名称空间偏好

可以通过 `set-context` 命令改变当前kubectl 上下文的名称空间，后续所有命令都默认在此名称空间下执行。

``` sh
kubectl config set-context --current --namespace=<您的名称空间>
# 验证结果
kubectl config view --minify | grep namespace:
```

### 名称空间与DNS

当您创建一个 Service 时，Kubernetes 为其创建一个对应的DNS 条目。该 DNS 记录的格式为 `<service-name>.<namespace-name>.svc.cluster.local`，也就是说，如果在容器中只使用 `<service-name>`，其DNS将解析到同名称空间下的 Service。这个特点在多环境的情况下非常有用，例如将开发环境、测试环境、生产环境部署在不同的名称空间下，应用程序只需要使用 `<service-name>` 即可进行服务发现，无需为不同的环境修改配置。如果您想跨名称空间访问服务，则必须使用完整的域名（fully qualified domain name，FQDN）。

### 并非所有对象都在名称空间里

大部分的 Kubernetes 对象（例如，Pod、Service、Deployment、StatefulSet等）都必须在名称空间里。但是某些更低层级的对象，是不在任何名称空间中的，例如 nodes、persistentVolumes、storageClass 等

执行一下命令可查看哪些 Kubernetes 对象在名称空间里，哪些不在：

``` sh
# 在名称空间里
kubectl api-resources --namespaced=true

# 不在名称空间里
kubectl api-resources --namespaced=false
```

### 管理名称空间

#### 查看名称空间

查看集群中的名称空间列表：

``` sh
kubectl get namespaces
```
输出结果如下所示：
```
NAME          STATUS    AGE
default       Active    11d
kube-system   Active    11d
kube-public   Active    11d
```

Kubernetes 安装成功后，默认有初始化了三个名称空间：
* **default** 默认名称空间，如果 Kubernetes 对象中不定义 `metadata.namespace` 字段，该对象将放在此名称空间下
* **kube-system** Kubernetes系统创建的对象放在此名称空间下
* **kube-public** 此名称空间自动在安装集群是自动创建，并且所有用户都是可以读取的（即使是那些未登录的用户）。主要是为集群预留的，例如，某些情况下，某些Kubernetes对象应该被所有集群用户看到。

查看名称空间的概要信息：
``` sh
kubectl describe namespaces <name>
```
输出结果如下所示：

```
Name:           default
Labels:         <none>
Annotations:    <none>
Status:         Active

No resource quota.

Resource Limits
 Type       Resource    Min Max Default
 ----               --------    --- --- ---
 Container          cpu         -   -   100m
```

* Resource quota 汇总了名称空间中使用的资源总量，并指定了集群管理员定义该名称空间最多可以使用的资源量
* Limit range 定义了名称空间中某种具体的资源类型的最大、最小值

名称空间可能有两种状态（phase）：
* **Active** 名称空间正在使用中
* **Termining** 名称空间正在被删除，不能再向其中创建新的对象

更多信息请参考 [phases](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/architecture/namespaces.md#phases)

#### 创建名称空间

使用 kubectl 有两种方式可以创建名称空间
* 通过 yaml 文件，创建文件 `my-namespace.yaml` 内容如下：
  ``` yaml
  apiVersion: v1
  kind: Namespace
  metadata:
    name: <名称空间的名字>
  ```
  执行命令
  ```sh
  kubectl create -f ./my-namespace.yaml
  ```
* 直接使用命令创建名称空间：
  ``` sh
  kubectl create namespace <名称空间的名字>
  ```

::: tip
名称空间的名字必须与 DNS 兼容：
* 不能带小数点 `.`
* 不能带下划线 `_`
* 使用数字、小写字母和减号 `-` 组成的字符串
:::

名称空间可以定义一个可选项字段 `finalizers`，在名称空间被删除时，用来清理相关的资源。
更多信息请参考 [Finalizers](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/architecture/namespaces.md#finalizers)
::: danger
如果您定义了一个不存在的 `finalizer`，您仍然可以成功创建名称空间，但是当您删除该名称空间时，将卡在 `Terminating` 状态。
:::

#### 删除名称空间

执行如下命令可删除名称空间：
``` sh
kubectl delete namespaces <名称空间的名字>
```

> 该操作将删除名称空间中的所有内容

此删除操作是异步的，您可能会观察到名称空间停留会在 `Terminating` 状态停留一段时间。

#### 使用名称空间切分集群

##### 理解 `default` 名称空间

  默认情况下，安装Kubernetes集群时，会初始化一个 `default` 名称空间，用来将承载那些未指定名称空间的 Pod、Service、Deployment等对象

##### 创建新的名称空间
  
在此练习中，我们将创建两个 Kubernetes 名称空间。

假设企业使用同一个集群作为开发环境和生产环境（注意：通常开发环境和生产环境是物理隔绝的）：
* 开发团队期望有一个集群中的空间，以便他们可以查看查看和使用他们创建的 Pod、Service、Deployment等。在此空间中，Kubernetes对象被创建又被删除，为了适应敏捷开发的过程，团队中的许多人都可以在此空间内做他们想做的事情。
* 运维团队也期望有一个集群中的空间，在这里，将有严格的流程控制谁可以操作 Pod、Service、Deployment等对象，因为这些对象都直接服务于生产环境。

此时，该企业可以将一个Kubernetes集群切分成两个名称空间：`development` 和 `production`。创建名称空间的 yaml 文件如下所示：

```bash
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    name: development
```

执行命令以创建 `development` 名称空间：
```sh
kubectl create -f dev.yaml
```
执行命令以创建 `production` 名称空间：
``` sh
kubectl create -f prod.yaml
```
执行命令查看已创建的名称空间
``` sh
kubectl get namespaces --show-labels
```
输出结果如下所示
```
NAME          STATUS    AGE       LABELS
default       Active    32m       <none>
development   Active    29s       name=development
production    Active    23s       name=production
```

##### 在每个名称空间中创建 Pod

Kubernetes名称空间为集群中的 Pod、Service、Deployment 提供了一个作用域。可以限定使用某个名称空间的用户不能看到另外一个名称空间中的内容。我们可以在 `development` 名称空间中创建一个简单的 Deployment 和 Pod 来演示这个特性。

* 首先，执行命令以检查当前的 kubectl 上下文
  ``` sh
  kubectl config view
  ```
  输出结果如下所示：
  ```
  apiVersion: v1
  clusters:
  - cluster:
      certificate-authority-data: REDACTED
      server: https://130.211.122.180
    name: lithe-cocoa-92103_kubernetes
  contexts:
  - context:
      cluster: lithe-cocoa-92103_kubernetes
      user: lithe-cocoa-92103_kubernetes
    name: lithe-cocoa-92103_kubernetes
  current-context: lithe-cocoa-92103_kubernetes
  kind: Config
  preferences: {}
  users:
  - name: lithe-cocoa-92103_kubernetes
    user:
      client-certificate-data: REDACTED
      client-key-data: REDACTED
      token: 65rZW78y8HbwXXtSXuUw9DbP4FLjHi4b
  - name: lithe-cocoa-92103_kubernetes-basic-auth
    user:
      password: h5M0FtUUIflBSdI7
      username: admin
  ```
  执行命令
  ``` sh
  kubectl config current-context
  ```
  输出结果如下所示
  ```
  lithe-cocoa-92103_kubernetes
  ```

* 接下来，为 kubectl 定义一个上下文，以便在不同的名称空间中工作。`cluster` 和 `user` 字段的取值从前面的 current context 复制过来：
  ``` sh
  kubectl config set-context dev --namespace=development --cluster=lithe-cocoa-92103_kubernetes --user=lithe-cocoa-92103_kubernetes
  kubectl config set-context prod --namespace=production --cluster=lithe-cocoa-92103_kubernetes --user=lithe-cocoa-92103_kubernetes
  ```
  上面的命令创建了两个 kubectl 的上下文，使得您可以在两个不同的名称空间中工作：

* 切换到 `development` 名称空间：
  ``` sh
  kubectl config use-context dev
  ```
  验证
  ``` sh
  kubectl config current-context
  dev
  ```
  此时，通过 kubectl 向 Kubernetes 集群发出的所有指令都限定在名称空间 `development` 里
  
  创建一个 nginx
  ``` sh
  kubectl run snowflake --image=nginx:1.7.9 --replicas=2
  ```
  刚刚创建的 Deployment 副本数为 2，运行了一个 nginx 容器。
  ```sh
  kubectl get deployment
  ```
  输出结果如下
  ```
  NAME        DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
  snowflake   2         2         2            2           2m
  ```
  执行命令
  ``` sh
  kubectl get pods -l run=snowflake
  ```
  输出结果如下
  ```
  NAME                         READY     STATUS    RESTARTS   AGE
  snowflake-3968820950-9dgr8   1/1       Running   0          2m
  snowflake-3968820950-vgc4n   1/1       Running   0          2m
  ```

  此时，开发人员可以做任何他想要做的操作，所有操作都限定在名称空间 `development` 里，而无需担心影响到 `production` 名称空间中的内容。

* 切换到 `production` 名称空间：
  ```sh
  kubectl config use-context prod
  ```
  `production` 名称空间应该是空的，下面两个命令将返回的结果都应该为空：
  ``` sh
  kubectl get deployment
  kubectl get pods
  ```
  此时，我们在 production 名称空间运行另一个 deployment：
  ``` sh
  kubectl run cattle --image=nginx:1.7.9 --replicas=5
  kubectl get deployment
  ```
  输出结果如下所示：
  ```
  NAME      DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
  cattle    5         5         5            5           10s
  ```
  执行命令
  ``` sh
  kubectl get pods -l run=cattle
  ```
  输出结果如下所示：
  ```
  NAME                      READY     STATUS    RESTARTS   AGE
  cattle-2263376956-41xy6   1/1       Running   0          34s
  cattle-2263376956-kw466   1/1       Running   0          34s
  cattle-2263376956-n4v97   1/1       Running   0          34s
  cattle-2263376956-p5p3i   1/1       Running   0          34s
  cattle-2263376956-sxpth   1/1       Running   0          34s
  ```
  至此，我们可以了解到，用户在一个名称空间创建的内容对于另外一个名称空间来说是不可见的。

  也可以为不同的名称空间定义不同的访问权限控制。敬请期待后续更新。

#### 为什么需要名称空间

一个Kubernetes集群应该可以满足多组用户的不同需要。Kubernetes名称空间可以使不同的项目、团队或客户共享同一个 Kubernetes 集群。实现的方式是，提供：
* [名称](#names) 的作用域
* 为不同的名称空间定义不同的授权方式和资源分配策略 [Resource Quota](https://kubernetes.io/docs/concepts/policy/resource-quotas/) 和 [resource limit range](https://kubernetes.io/docs/concepts/policy/limit-range/)

每一个用户组都期望独立于其他用户组进行工作。通过名称空间，每个用户组拥有自己的：
* Kubernetes 对象（Pod、Service、Deployment等）
* 授权（谁可以在该名称空间中执行操作）
* 资源分配（该用户组或名称空间可以使用集群中的多少计算资源）

可能的使用情况有：
* 集群管理员通过一个Kubernetes集群支持多个用户组
* 集群管理员将集群中某个名称空间的权限分配给用户组中的受信任的成员
* 集群管理员可以限定某一个用户组可以消耗的资源数量，以避免其他用户组受到影响
* 集群用户可以使用自己的Kubernetes对象，而不会与集群中的其他用户组相互干扰

## 标签和选择器

标签（Label）是附加在Kubernetes对象上的一组名值对，其意图是按照对用户有意义的方式来标识Kubernetes对象，同时，又不对Kubernetes的核心逻辑产生影响。标签可以用来组织和选择一组Kubernetes对象。您可以在创建Kubernetes对象时为其添加标签，也可以在创建以后再为其添加标签。每个Kubernetes对象可以有多个标签，同一个对象的标签的 Key 必须唯一，例如：

``` yaml
metadata:
  labels:
    key1: value1
    key2: value2
```

使用标签（Label）可以高效地查询和监听Kubernetes对象，在Kubernetes界面工具（如 Kubenetes Dashboard）和 kubectl 中，标签的使用非常普遍。那些非标识性的信息应该记录在[注解（annotation）](#注解annotation)

### 为什么要使用标签

使用标签，用户可以按照自己期望的形式组织 Kubernetes 对象之间的结构，而无需对 Kubernetes 有任何修改。

应用程序的部署或者批处理程序的部署通常都是多维度的（例如，多个高可用分区、多个程序版本、多个微服务分层）。管理这些对象时，很多时候要针对某一个维度的条件做整体操作，例如，将某个版本的程序整体删除，这种情况下，如果用户能够事先规划好标签的使用，再通过标签进行选择，就会非常地便捷。

标签的例子有：

* `release: stable`、`release: canary`
* `environment: dev`、`environment: qa`、`environment: production`
* `tier: frontend`、`tier: backend`、`tier: cache`
* `partition: customerA`、`partition: customerB`
* `track: daily`、`track: weekly`

上面只是一些使用比较普遍的标签，您可以根据您自己的情况建立合适的使用标签的约定。

### 句法和字符集

标签是一组名值对（key/value pair）。标签的 key 可以有两个部分：可选的前缀和标签名，通过 `/` 分隔。
* 标签名：
  * 标签名部分是必须的
  * 不能多于 63 个字符
  * 必须由字母、数字开始和结尾
  * 可以包含字母、数字、减号`-`、下划线`_`、小数点`.`
* 标签前缀：
  * 标签前缀部分是可选的
  * 如果指定，必须是一个DNS的子域名
  * 不能多于 253 个字符
  * 使用 `/` 和标签名分隔

如果省略标签前缀，则标签的 key 将被认为是专属于用户的。Kubernetes的系统组件（例如，kube-scheduler、kube-controller-manager、kube-apiserver、kubectl 或其他第三方组件）向用户的Kubernetes对象添加标签时，必须指定一个前缀。

`kubernetes.io/` 和 `k8s.io/` 这两个前缀是 Kubernetes 核心组件预留的。

标签的 value 必须：
* 不能多于 63 个字符
* 可以为空字符串
* 如果不为空，则
  * 必须由字母、数字开始和结尾
  * 可以包含字母、数字、减号`-`、下划线`_`、小数点`.`

例如，下面的例子中的Pod包含两个标签 `environment: production` 和 `app:nginx`

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: label-demo
  labels:
    environment: production
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.7.9
    ports:
    - containerPort: 80
```

### 标签选择器

与 [name 和 UID](#names) 不同，标签不一定是唯一的。通常来讲，会有多个Kubernetes对象包含相同的标签。通过使用标签选择器（label selector），用户/客户端可以选择一组对象。标签选择器（label selector）是 Kubernetes 中最主要的分类和筛选手段。

Kubernetes api server支持两种形式的标签选择器，`equality-based 基于等式的` 和 `set-based 基于集合的`。标签选择器可以包含多个条件，并使用逗号分隔，此时只有满足所有条件的 Kubernetes 对象才会被选中。

如果使用空的标签选择器或者不指定选择器，其含义由具体的 API 接口决定。

#### 基于等式的选择方式

Equality- 或者 inequality-based 选择器可以使用标签的名和值来执行过滤选择。只有匹配所有条件的对象才被选中（被选中的对象可以包含未指定的标签）。可以使用三种操作符 `=`、`==`、`!=`。前两个操作符含义是一样的，都代表相等，后一个操作符代表不相等。例如：
``` sh
# 选择了标签名为 `environment` 且 标签值为 `production` 的Kubernetes对象
environment = production
# 选择了标签名为 `tier` 且标签值不等于 `frontend` 的对象，以及不包含标签 `tier` 的对象
tier != frontend
```
也可以使用逗号分隔的两个等式 `environment=production,tier!=frontend`，此时将选中所有 `environment` 为 `production` 且 `tier` 不为 `frontend` 的对象。

以Pod 的节点选择器为例，下面的 Pod 可以被调度到包含标签 `accelerator=nvidia-tesla-p100` 的节点上：

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: cuda-test
spec:
  containers:
    - name: cuda-test
      image: "k8s.gcr.io/cuda-vector-add:v0.1"
      resources:
        limits:
          nvidia.com/gpu: 1
  nodeSelector:
    accelerator: nvidia-tesla-p100
```

#### 基于集合的选择方式

Set-based 标签选择器可以根据标签名的一组值进行筛选。支持的操作符有三种：`in`、`notin`、`exists`。例如：
``` sh
# 选择所有的包含 `environment` 标签且值为 `production` 或 `qa` 的对象
environment in (production, qa)
# 选择所有的 `tier` 标签不为 `frontend` 和 `backend`的对象，或不含 `tier` 标签的对象
tier notin (frontend, backend)
# 选择所有包含 `partition` 标签的对象
partition
# 选择所有不包含 `partition` 标签的对象
!partition
```

可以组合多个选择器，用 `,` 分隔，`,` 相当于 `AND` 操作符。例如：
``` sh
# 选择包含 `partition` 标签（不检查标签值）且 `environment` 不是 `qa` 的对象
partition,environment notin (qa)
```

基于集合的选择方式是一个更宽泛的基于等式的选择方式，例如，`environment=production` 等价于 `environment in (production)`；`environment!=production` 等价于 `environment notin (production)`。

基于集合的选择方式可以和基于等式的选择方式可以混合使用，例如：
`partition in (customerA, customerB),environment!=qa`

### API

#### 查询条件

LIST 和 WATCH 操作时，可指定标签选择器作为查询条件，以筛选指定的对象集合。两种选择方式都可以使用，但是要符合 URL 编码，例如：
* 基于等式的选择方式： `?labelSelector=environment%3Dproduction,tier%3Dfrontend`
* 基于集合的选择方式： `?labelSelector=environment+in+%28production%2Cqa%29%2Ctier+in+%28frontend%29`

两种选择方式都可以在 kubectl 的 list 和 watch 命令中使用，例如：
* 使用基于等式的选择方式
  ``` sh
  kubectl get pods -l environment=production,tier=frontend
  ```
* 使用基于集合的选择方式
  ``` sh
  kubectl get pods -l 'environment in (production),tier in (frontend)'
  ```

#### Kubernetes对象引用

某些 Kubernetes 对象中（例如，Service和Deployment），使用标签选择器指定一组其他类型的 Kubernetes 对象（例如，Pod）

##### Service

Service 中通过 `spec.selector` 字段来选择一组 Pod，并将服务请求转发到选中的 Pod 上。

在 yaml 或 json 文件中，标签选择器用一个 map 来定义，且支持基于等式的选择方式，例如：

``` json
"selector": {
  "component" : "redis",
}
```
或
``` yaml
selector:
  component: redis
```
上面的例子中定义的标签选择器等价于 `component=redis` 或 `component in (redis)`

##### 有些对象支持基于集合的选择方式

`Job`、`Deployment`、`ReplicaSet` 和 `DaemonSet` 同时支持基于等式的选择方式和基于集合的选择方式。例如：

``` yaml
selector:
  matchLabels:
    component: redis
  matchExpressions:
    - {key: tier, operator: In, values: [cache]}
    - {key: environment, operator: NotIn, values: [dev]}
```

`matchLabels` 是一个 {key,value} 组成的 map。map 中的一个 {key,value} 条目相当于 `matchExpressions` 中的一个元素，其 `key` 为 map 的 key，`operator` 为 `In`， `values` 数组则只包含 `value` 一个元素。`matchExpression` 等价于基于集合的选择方式，支持的 `operator` 有 `In`、`NotIn`、`Exists` 和 `DoesNotExist`。当 `operator` 为 `In` 或 `NotIn` 时，`values` 数组不能为空。所有的选择条件都以 AND 的形式合并计算，即所有的条件都满足才可以算是匹配。

##### 引用一组节点

可以通过标签选择器将 Pod 调度到指定的节点上。

## 注解annotation

注解（annotation）可以用来向 Kubernetes 对象的 `metadata.annotations` 字段添加任意的信息。Kubernetes 的客户端或者自动化工具可以存取这些信息以实现其自定义的逻辑。

### 向Kubernetes对象添加注解

Kubernetes 对象的 `metadata` 字段可以添加自定义的标签（label）或者注解（annotation）。标签用来选择对象或者用来查找符合指定条件的一组对象。与此相对，注解不是用来标记对象或者选择对象的。`metadata` 中的注解可以很大，也可以很小；可以是结构化的，也可以是非结构化的；还可以包括标签中不允许出现的字符。

与标签相似，注解也是 key/value map，例如：
``` yaml
metadata:
  annotations:
    key1: value1
    key2: value2
```

类似于下面的信息可以记录在注解中：
* 声明式配置层用到的状态信息。
* Build、release、image信息，例如 timestamp、release ID、git branch、PR number、image hash、registry address
* 日志、监控、分析、审计系统的参数
* 第三方工具所需要的信息，例如 name、version、build information、URL
* 轻量级的发布工具用到的信息，例如，config、checkpoint
* 负责人的联系方式，例如，电话号码、网址、电子信箱
* 用户用来记录备忘信息的说明，例如，对标准镜像做了什么样的修改、维护过程中有什么特殊信息需要记住

下面是一个来自于实际 Deployment 的注解：
``` yaml
metadata:
  annotations:
    deployment.kubernetes.io/revision: 7  # 由Deployment控制器添加，用于记录当前发布的修改次数
```

除了使用注解，您也可以将这类信息存放在一个外部的数据库，然而，在使用、分享这些信息的时候，可能会变得难以管理。

### 句法和字符集

注解是一组名值对。

注解的 key 有两个部分：可选的前缀和标签名，通过 `/` 分隔。
* 注解名：
  * 标签名部分是必须的
  * 不能多于 63 个字符
  * 必须由字母、数字开始和结尾
  * 可以包含字母、数字、减号`-`、下划线`_`、小数点`.`
* 注解前缀：
  * 注解前缀部分是可选的
  * 如果指定，必须是一个DNS的子域名
  * 不能多于 253 个字符
  * 使用 `/` 和标签名分隔

如果省略注解前缀，则注解的 key 将被认为是专属于用户的。Kubernetes的系统组件（例如，kube-scheduler、kube-controller-manager、kube-apiserver、kubectl 或其他第三方组件）向用户的Kubernetes对象添加注解时，必须指定一个前缀。

`kubernetes.io/` 和 `k8s.io/` 这两个前缀是 Kubernetes 核心组件预留的。

下面的例子中，Pod包含一个注解 `imageregistry: https://hub.docker.com/`
``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: annotations-demo
  annotations:
    imageregistry: "https://hub.docker.com/"
spec:
  containers:
  - name: nginx
    image: nginx:1.7.9
    ports:
    - containerPort: 80
```

## 字段选择器

### 概述

字段选择器（Field Selector）可以用来基于的一个或多个字段的取值来选取一组Kubernetes对象。下面有一些示例性的字段选择器：

* `metadata.name=my-service`
* `metadata.namespace!=default`
* `status.phase=Pending`

下面的 `kubectl` 命令选择了所有字段 `status.phase` 的取值为 `Running` 的 Pod：

``` sh
kubectl get pods --field-selector status.phase=Running
```

::: tip
字段选择器本质上是一个 `filter`。默认情况下，没有添加 selector/filter 时，代表着指定资源类型的所有对象都被选中。下面个两个 kubectl 查询时等价的：

``` sh
kubectl get pods
kubectl get pods --field-selector ""
```
:::

### 支持的字段

不同的 Kubernetes 对象类型，可以用来查询的字段不一样。所有的对象类型都支持的两个字段是 `metadata.name` 和 `metadata.namespace`。在字段选择器中使用不支持的字段，将报错。例如：

``` sh
kubectl get ingress --field-selector foo.bar=baz
```

输出结果为：

```
Error from server (BadRequest): Unable to find "ingresses" that match label selector "", field selector "foo.bar=baz": "foo.bar" is not a known field selector: only "metadata.name", "metadata.namespace"
```

### 支持的操作符

字段选择器中可以使用的操作符有 `=`、`==`、`!=` （`=` 和 `==` 含义相同）。例如，下面的 `kubectl` 命令，查询不在 `default` 名称空间中的 Service：

``` sh
kubectl get services  --all-namespaces --field-selector metadata.namespace!=default
```

### 多选择器

可以指定多个字段选择器，用逗号 `,` 分隔。下面的 `kubectl` 命令查询所有的 `status.phase` 不等于 `Running` 且 `spec.restartPolicy` 等于 `Always` 的 Pod：

``` sh
kubectl get pods --field-selector=status.phase!=Running,spec.restartPolicy=Always
```

### 多种对象类型

字段选择器可以跨资源类型使用。下面的 `kubectl` 命令查询所有的不在 `default` 名称空间的 StatefulSet 和 Service：
``` sh
kubectl get statefulsets,services --all-namespaces --field-selector metadata.namespace!=default
```

## 参考

- https://kubernetes.io/docs/concepts/overview/working-with-objects/
- https://kuboard.cn/
