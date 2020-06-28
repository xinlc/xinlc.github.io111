---
title: Kubernetes 配置
date: 2020-06-20 10:20:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubernetes 配置

<!--more-->

## ConfigMap

Kubernetes ConfigMap 可以将配置信息和容器镜像解耦，以使得容器化的应用程序可移植。

ConfigMap 是k8s的一个配置管理组件，可以将配置以key-value的形式传递，通常用来保存不需要加密的配置信息，加密信息则需用到Secret，主要用来应对以下场景：

- 使用k8s部署应用，当你将应用配置写进代码中，就会存在一个问题，更新配置时也需要打包镜像，ConfigMap可以将配置信息和docker镜像解耦。
- 使用微服务架构的话，存在多个服务共用配置的情况，如果每个服务中单独一份配置的话，那么更新配置就很麻烦，使用ConfigMap可以友好的进行配置共享。

其次，ConfigMap可以用来保存单个属性，也可以用来保存配置文件。

ConfigMap在容器使用的典型用法如下：

- 将配置项设置为容器内的环境变量。
- 将启动参数设置为环境变量。
- 以Volume的形式挂载到容器内部的文件或目录。

> ConfigMap 用于保存配置数据的键值对，可以用来保存单个属性，也可以用来保存配置文件。ConfigMap 跟 secret 很类似，但它可以更方便地处理不包含敏感信息的字符串。

### 创建ConfigMap

系统中可以通过YAML配置文件或者直接使用`kubectl create configmap`命令行的方式来创建ConfigMap，下面将详细介绍这两种方式的操作流程。

### 通过YAML配置文件方式创建

创建YAML文件appvar.yaml，其中描述将应用所需的变量定义为ConfigMap的用法，key为配置文件的别名，value表示是配置文件的全部文本内容。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-demo
data:
  # 类属性键；每一个键都映射到一个简单的值
  player_initial_lives: 3
  ui_properties_file_name: "user-interface.properties"
  # 类文件键
  game.properties: |
    enemy.types=aliens,monsters
    player.maximum-lives=5
  user-interface.properties: |
    color.good=purple
    color.bad=yellow
    allow.textmode=true
```

> ConfigMap中的每个data项都会成为一个新文件。

- data一栏包括了配置数据，ConfigMap可以被用来保存单个属性，也可以用来保存一个配置文件。
- 配置数据可以通过很多种方式在Pods里被使用。
- ConfigMaps可以被用来：
  - 设置环境变量的值
  - 在容器里设置命令行参数
  - 在数据卷里面创建config文件
  - 用户和系统组件两者都可以在ConfigMap里面存储配置数据。

## 通过kubectl命令行方式创建

在kubectl create configmap命令种使用参数–from-file或–from-literal指定文件、目录或者文本，也可以创建一个或者多个ConfigMap参数。

- 指定文件，语句格式如下：

```bash
Kubectl create connfigmap NAME --from-file=[key= ] source --from-file=[key= ] source
# kubectl create configmap game-config-1 --from-file=docs/user-guide/configmap/kubectl/game.properties
```

- 指定目录，语句格式如下：
需要注意，目录中的每个配置文件名都被会被设置为key，文件中的内容将被设置为value，语法为：

```bash
Kubectl create connfigmap NAME --from-file=config-files-dir
# kubectl create configmap game-config-2 --from-file=docs/user-guide/configmap/kubectl
```

- 指定文本，语句格式如下：
此方式将直接指定key:value，语法为：

```bash
Kubectl create connfigmap NAME --from-literal=key1=value1  --from-literal=key2=value2
```

这是一个 Pod 的示例，它通过使用 game-demo 中的值来配置一个 Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: configmap-demo-pod
spec:
  containers:
    - name: demo
      image: game.example/demo-game
      env:
        # 定义环境变量
        - name: PLAYER_INITIAL_LIVES # 请注意这里和 ConfigMap 中的键名是不一样的
          valueFrom:
            configMapKeyRef:
              name: game-demo           # 这个值来自 ConfigMap
              key: player_initial_lives # 需要取值的键
        - name: UI_PROPERTIES_FILE_NAME
          valueFrom:
            configMapKeyRef:
              name: game-demo
              key: ui_properties_file_name
      volumeMounts:
      - name: config
        mountPath: "/config"
        readOnly: true
  volumes:
    # 您可以在 Pod 级别设置卷，然后将其挂载到 Pod 内的容器中
    - name: config
      configMap:
        # 提供你想要挂载的 ConfigMap 的名字
        name: game-demo
```

ConfigMap 不会区分单行属性值和多行类似文件的值，重要的是 Pods 和其他对象如何使用这些值。比如，定义一个卷，并将它作为 /config 文件夹安装到 demo 容器内，并创建四个文件：

- /config/player_initial_lives
- /config/ui_properties_file_name
- /config/game.properties
- /config/user-interface.properties

如果您要确保 /config 只包含带有 .properties 扩展名的文件，可以使用两个不同的 ConfigMaps，并在 spec 中同时引用这两个 ConfigMaps 来创建 Pod。第一个 ConfigMap 定义了 player_initial_lives 和 ui_properties_file_name，第二个 ConfigMap 定义了 kubelet 放进 /config 的文件。

## 使用ConfigMap

### 通过环境变量方式使用ConfigMap

以创建的ConfigMap“appvar.yaml”为例：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: appvar
data:
  apploglevel: info
  appdatadir: /var/data
```

创建Pod，以便于使用ConfitgMap中的内容，指令操作如下所示。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-test
spec:
  containers:
  - name: test
    image: busybox
    command: [ "/bin/sh", "-c", "env | grep APP" ]
    env:
    - name: APPLOG                             # 定义环境变量APPLOG
      valueFrom: 
        configMapkeyRef:
          name: appvar                         # 指定config
          key: apploglevel                     # 指定config中的key
    - name: APPDIR                             # 定义环境变量APPDIR
      valueFrom:
        configMapkeyRef:
          name: appvar
          key: appdatadir
  restartPolicy: Never
```

在上面Pod代码的定义中，将ConfigMap“appvar”中定义的内容以环境变量（APPLOGLEVEL和APPDATADIR）方式设置为容器内部的环境变量，在容器的启动命令中将会显示这两个环境变量的值（“env | grep APP”）。
使用kubectl create -f命令创建该Pod，由于是测试Pod，所以该Pod在执行完启动命令后将会退出，并且不会被系统自动重（restartPolicy=Never）。

### 通过VolumeMount使用ConfigMap

cm-apache.yaml：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cm-apache
data:
  html: hello world
  path: /var/www/html
```

创建YAML文件“pod-volume-test.yaml”，并在配置中加入Volume信息，代码如下所示。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-volume-test
spec:
  containers:
    - name: apache
      image: httpd
      ports:
        - containerPort: 80
      volumeMounts:
        - name: volume-test
          mountPath: /var/www/html
  volumes:
    - name: volume-test
      configMap:
        name: cm-apache
        items:
          - key: html
            path: main.html
          - key: path
            path: path.txt
```

```bash
root@pod-volume-test:/# cd /var/www/html/
root@pod-volume-test:/var/www/html# ls
main.html  path.txt
root@pod-volume-test:/var/www/html# cat main.html
hello world
root@pod-volume-test:/var/www/html# cat path.txt
/var/www/html
```

### 使用ConfigMap的限制条件

使用ConfigMap的限制条件如下：

- ConfigMap必须在Pod之前创建。
- ConfigMap受Namespace限制，只有处于相同Namespace中的Pod才可以引用它。
- ConfigMap中的配额管理还未能实现。
- kubelet只支持可以被API Server管理的Pod使用ConfigMap。kubelet在本Node上通过 --manifest-url或–config自动创建的静态Pod将无法引用ConfigMap。
- 在Pod对ConfigMap进行挂载（volumeMount）操作时，在容器内部只能挂载为“目录”，无法挂载为“文件”。在挂载到容器内部后，在目录下将包含ConfigMap定义的每个item，如果在该目录下原来还有其他文件，则容器内的该目录将被挂载的ConfigMap覆盖。如果应用程序需要保留原来的其他文件，则需要进行额外的处理。可以将ConfigMap挂载到容器内部的临时目录，再通过启动脚本将配置文件复制或者链接到（cp或link命令）应用所用的实际配置目录下。

## 使用私有仓库中的docker镜像

企业通常会因为如下几个原因，需要搭建自己的私有 docker registry：
* 限制 docker 镜像的分发范围，例如：只允许在内网分发，或者只允许被授权的用户获取 docker 镜像
* 提高推送 docker 镜像以及抓取 docker 镜像时的网络传输速度

在这种情况下，您需要在 Kubernetes 中使用私有 docker registry 中的 docker 镜像。

### 前提假设

假设您已经搭建了自己的私有 docker registry，并成功向其中推送了一个 docker 镜像，其主要参数如下：

| 参数名称       | 参数值                  | 备注           |
| -------------- | ----------------------- | -------------- |
| registry地址   | my-registry.example.com | 推荐使用域名，也可以是 ip 地址       |
| registry端口   | 5000                    | 必须支持 HTTPS |
| registry用户名 | myusername              |                |
| registry密码   | mypassowrd              |                |
| repository名字 | example                 |                |
| image名字      | web-example             |                |
| image标签      | v1.0.1                  |                |

并且，您可以在 kubernetes 集群中的任意节点通过如下 docker 命令成功抓取该 docker 镜像

``` sh
docker login my-registry.example.com:5000
# username:  提示 username 时，输入：myusername
# password:  提示 password 时，输入：mypassword
docker pull my-registry.example.com:5000/example/web-example:v1.0.1
```

::: tip

* 您的私有 docker registry 必须支持 HTTPS
* 如果搭建私有的 docker registry，推荐 vmware 开源的 [Harbor](https://github.com/goharbor/harbor)
* 您也可以使用任何其他 docker registry，只要您能够在 kubernetes 集群的任意节点通过上面的 docker pull 命令成功抓取到该 docker registry 中的镜像

:::

**创建 Secrets：**

kind 为 docker-registry

```bash
kubectl create secret docker-registry registry-key \
--docker-server=registry.cn-beijing.aliyuncs.com/leo \
--docker-username=xxx \
--docker-password=xxx \
--docker-email=xinlichao2016@gmail.com
```

**使用：**

```yaml
apiVersion: apps/v1 # 与k8s集群版本有关，使用 kubectl api-versions 即可查看当前集群支持的版本
kind: Deployment # 该配置的类型，我们使用的是 Deployment
metadata: # 元数据，即 Deployment 的一些基本属性和信息
  name: demo-deployment # Deployment 的名称
  labels: # 标签，可以灵活定位一个或多个资源，其中key和value均可自定义，可以定义多组
    app: demo # 为该Deployment设置key为app，value为nginx的标签
spec: # 这是关于该Deployment的描述，可以理解为你期待该Deployment在k8s中如何使用
  replicas: 3 # 使用该Deployment创建一个应用程序实例
  selector: # 标签选择器，与上面的标签共同作用
    matchLabels: # 选择包含标签app:nginx的资源
      app: demo
  template: # 这是选择或创建的Pod的模板
    metadata: # Pod的元数据
      labels: # Pod的标签，上面的selector即选择包含标签app:nginx的Pod
        app: demo
    spec: # 期望Pod实现的功能（即在pod中部署）
      imagePullSecrets: # 私有镜像
      - name: registry-key
      containers: # 生成container，与docker中的container是同一种
      - name: demo-web # container的名称
        image: registry.cn-beijing.aliyuncs.com/leo/demo-web:1.0.0-release # 使用镜像nginx:1.7.9创建container，该container默认80端口可访问

---

apiVersion: v1
kind: Service
metadata:
  name: demo-service # Service 的名称
  labels: # Service 自己的标签
    app: demo # 为该 Service 设置 key 为 app，value 为 nginx 的标签
spec: # 这是关于该 Service 的定义，描述了 Service 如何选择 Pod，如何被访问
  selector: # 标签选择器
    app: demo # 选择包含标签 app:nginx 的 Pod
  ports:
  - name: demo-port # 端口的名字
    protocol: TCP # 协议类型 TCP/UDP
    port: 80 # 集群内的其他容器组可通过 80 端口访问 Service
    nodePort: 32600 # 通过任意节点的 32600 端口访问 Service
    targetPort: 80 # 将请求转发到匹配 Pod 的 80 端口
  type: NodePort # Serive的类型，ClusterIP/NodePort/LoaderBalancer
```

## 亲和性与反亲和性

`nodeSelector` 提供了一个非常简单的方式，将 Pod 限定到包含特定标签的节点上。亲和性与反亲和性（affinity / anti-affinity）特性则极大地扩展了限定的表达方式。主要的增强点在于：
1. 表达方式更加有效（不仅仅是多个精确匹配表达式的“和”关系）
2. 可以标识该规则为“soft” / “preference” （软性的、偏好的）而不是 hard requirement（必须的），此时，如果调度器发现该规则不能被满足，Pod 仍然可以被调度
3. 可以对比节点上（或其他拓扑域 topological domain）已运行的其他 Pod 的标签，而不仅仅是节点自己的标签，此时，可以定义类似这样的规则：某两类 Pod 不能在同一个节点（或拓扑域）上共存

### 节点亲和性

节点亲和性（node affinity）的概念与 `nodeSelector` 相似，可以基于节点的标签来限定 Pod 可以被调度到哪些节点上。

当前支持两种类型的节点亲和性， `requiredDuringSchedulingIgnoredDuringExecution` （hard，目标节点必须满足此条件） 以及 `preferredDuringSchedulingIgnoredDuringExecution` （soft，目标节点最好能满足此条件）。名字中 `IgnoredDuringExecution` 意味着：如果 Pod 已经调度到节点上以后，节点的标签发生改变，使得节点已经不再匹配该亲和性规则了，Pod 仍将继续在节点上执行（这一点与 `nodeSelector` 相似）。将来，Kubernetes 将会提供 `requiredDuringSchedulingRequiredDuringExecution` 这个选项，该选项与 `requiredDuringSchedulingIgnoredDuringExecution` 相似，不同的是，当节点的标签不在匹配亲和性规则之后，Pod 将被从节点上驱逐。

`requiredDuringSchedulingIgnoredDuringExecution` 的一个例子是，`只在 Intel CPU 上运行该 Pod`，`preferredDuringSchedulingIgnoredDuringExecution` 的一个例子是，`尽量在高可用区 XYZ 中运行这个 Pod，但是如果做不到，也可以在其他地方运行该 Pod`。

PodSpec 中通过 `affinity.nodeAffinity` 字段来定义节点亲和性，示例文件如下：

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-node-affinity
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: kubernetes.io/e2e-az-name
            operator: In
            values:
            - e2e-az1
            - e2e-az2
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 1
        preference:
          matchExpressions:
          - key: another-node-label-key
            operator: In
            values:
            - another-node-label-value
  containers:
  - name: with-node-affinity
    image: k8s.gcr.io/pause:2.0
```

此处的亲和性规则表明，该 Pod 只能被调度到包含 key 为 `kubernetes.io/e2e-az-name` 且 value 为 `e2e-az1` 或 `e2e-az2` 的标签的节点上。此外，如果节点已经满足了前述条件，将优先选择包含 key 为 `another-node-label-key` 且 value 为 `another-node-label-value` 的标签的节点。

例子中使用了操作符 `In`。节点亲和性支持如下操作符：`In`、`NotIn`、`Exists`、`DoesNotExist`、`Gt`、`Lt`。使用 `NotIn` 和 `DoesNotExist` 可以实现节点反亲和性（node anti-affinity）的效果，或者也可以使用 `污点` 为节点排斥某类 Pod。

如果某个 Pod 同时指定了 `nodeSelector` 和 `nodeAffinity`，则目标节点必须同时满足两个条件，才能将 Pod 调度到该节点上。

如果为 `nodeAffinity` 指定多个 `nodeSelectorTerms`，则目标节点只需要满足任意一个 `nodeSelectorTerms` 的要求，就可以将 Pod 调度到该节点上。

如果为 `nodeSelectorTerms` 指定多个 `matchExpressions`，则目标节点必须满足所有的 `matchExpressions` 的要求，才能将 Pod 调度到该节点上。

当 Pod 被调度到某节点上之后，如果移除或者修改节点的标签，Pod 将仍然继续在节点上运行。换句话说，节点亲和性规则只在调度该 Pod 时发生作用。

`preferredDuringSchedulingIgnoredDuringExecution` 中的 `weight` 字段取值范围为 1-100。对于每一个满足调度要求的节点（资源请求、亲和性/反亲和性规则，等），调度器将遍历该节点匹配的 `preferredDuringSchedulingIgnoredDuringExecution` 中所有的`weight` 并求和。此求和结果将与节点的其他优先级计算的得分合并。得分最高的节点被优先选择。

### Pod亲和性与反亲和性

Pod之间的亲和性与反亲和性（inter-pod affinity and anti-affinity）可以基于已经运行在节点上的 Pod 的标签（而不是节点的标签）来限定 Pod 可以被调度到哪个节点上。此类规则的表现形式是：
* 当 X 已经运行了一个或者多个满足规则 Y 的 Pod 时，待调度的 Pod 应该（或者不应该 - 反亲和性）在 X 上运行
  * 规则 Y 以 LabelSelector 的形式表述，附带一个可选的名称空间列表
    
    > 与节点不一样，Pod 是在名称空间中的（因此，Pod的标签是在名称空间中的），针对 Pod 的 LabelSelector 必须同时指定对应的名称空间
  * X 是一个拓扑域的概念，例如节点、机柜、云供应商可用区、云供应商地域，等。X 以 `topologyKey` 的形式表达，该 Key代表了节点上代表拓扑域（topology domain）的一个标签。

#### pod affinity 的一个例子

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-pod-affinity
spec:
  affinity:
    podAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: security
            operator: In
            values:
            - S1
        topologyKey: failure-domain.beta.kubernetes.io/zone
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: security
              operator: In
              values:
              - S2
          topologyKey: failure-domain.beta.kubernetes.io/zone
  containers:
  - name: with-pod-affinity
    image: k8s.gcr.io/pause:2.0
```

该 Pod 的 `affinity` 定义了一个 Pod 亲和性规则和一个 Pod 反亲和性规则，例子中， `podAffinity` 是 `requiredDuringSchedulingIgnoredDuringExecution`，而 `podAntiAffinity` 则是 `preferredDuringSchedulingIgnoredDuringExecution`。
* Pod 亲和性规则要求，该 Pod 可以被调度到的节点所在的可用区 `zone` 必须已经有一个已经运行的 Pod 包含标签 key=security，value=S1，或者更准确地说，节点必须满足如下条件：
  * 节点包含 key 为 `failure-domain.beta.kubernetes.io/zone` 的标签，假设该标签的值为 `V`
  * 至少有一个包含 key 为 `failure-domain.beta.kubernetes.io/zone` 且 value 为 `V` 的标签的节点已经运行了一个包含标签 key 为 `security` 且 value 为 `S1` 的 Pod

* Pod 反亲和性规则要求，该 Pod 最好不要被调度到已经运行了包含 key 为 `security` 且 value 为 `S2` 的标签的 Pod 的节点上，或者更准确地说，必须满足如下条件：
  * 如果 `topologyKey` 是 `failure-domain.beta.kubernetes.io/zone`，则，Pod不能被调度到同一个 zone 中的已经运行了包含标签 `security: S2` 的节点上

参考 [design doc](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/scheduling/podaffinity.md) 可以了解更多 Pod 亲和性与反亲和性的例子。

原则上， `topologyKey` 可以是任何合法的标签 key。然而，处于性能和安全的考虑，仍然对 `topologyKey` 有如下限制：
1. 对亲和性以及 `requiredDuringSchedulingIgnoredDuringExecution` Pod 反亲和性，`topologyKey` 不能为空
2. 对 `requiredDuringSchedulingIgnoredDuringExecution` Pod 反亲和性，管理控制器 `LimitPodHardAntiAffinityTopology` 被用来限制 `topologyKey` 必须为 `kubernetes.io/hostname`。如果想要使用其他的自定义 topology，必须修改该管理控制器，或者将其禁用
3. 对 `preferredDuringSchedulingIgnoredDuringExecution` Pod 反亲和性，如果 `topologyKey` 为空，则代表所有的 topology （此时，不局限于 `kubernetes.io/hostname`、`failure-domain.beta.kubernetes.io/zone` 和 `failure-domain.beta.kubernetes.io/region` 的组合）
4. 除了上述的情形以外，`topologyKey` 可以是任何合法的标签 Key

除了 `labelSelector` 和 `topologyKey` 以外，还可以指定一个 `namespaces` 的列表，用作 `labelSelector` 的作用范围（与 `labelSelector` 和 `topologyKey` 的定义为同一个级别）。如果不定义或者该字段为空，默认为 Pod 所在的名称空间。

所有与 `requiredDuringSchedulingIgnoredDuringExecution` 亲和性和反亲和性关联的 `matchExpressions` 必须被满足，Pod 才能被调度到目标节点。

#### 更多实用的例子

Pod 亲和性与反亲和性结合高级别控制器（例如 ReplicaSet、StatefulSet、Deployment 等）一起使用时，可以非常实用。此时可以很容易的将一组工作复杂调度到同一个 topology，例如，同一个节点。

##### 始终在同一个节点

在一个三节点的集群中，部署一个使用 redis 的 web 应用程序，并期望 web-server 尽可能与 redis 在同一个节点上。

下面是 redis deployment 的 yaml 片段，包含三个副本以及 `app=store` 标签选择器。Deployment 中配置了 `PodAntiAffinity`，确保调度器不会将三个副本调度到一个节点上：

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
spec:
  selector:
    matchLabels:
      app: store
  replicas: 3
  template:
    metadata:
      labels:
        app: store
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - store
            topologyKey: "kubernetes.io/hostname"
      containers:
      - name: redis-server
        image: redis:3.2-alpine
```

下面是 webserver deployment 的 yaml 片段，配置了 `podAntiAffinity` 以及 `podAffinity`。要求将其副本与 包含 `app=store` 标签的 Pod 放在同一个节点上；同时也要求 web-server 的副本不被调度到同一个节点上。

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  selector:
    matchLabels:
      app: web-store
  replicas: 3
  template:
    metadata:
      labels:
        app: web-store
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web-store
            topologyKey: "kubernetes.io/hostname"
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - store
            topologyKey: "kubernetes.io/hostname"
      containers:
      - name: web-app
        image: nginx:1.12-alpine
```

如果创建上述两个 deployment，集群将如下所示：

| Node-1       | Node-2      | Node-3      |
| ------------ | ----------- | ----------- |
| web-server-1 | webserver-2 | webserver-3 |
| cache-1      | cache-2     | cache-3     |

`web-server` 的三个副本都自动与 cach 的副本运行在相同的节点上。

```sh
kubectl get pods -o wide
```

输出结果如下所示
```
NAME                           READY     STATUS    RESTARTS   AGE       IP           NODE
redis-cache-1450370735-6dzlj   1/1       Running   0          8m        10.192.4.2   kube-node-3
redis-cache-1450370735-j2j96   1/1       Running   0          8m        10.192.2.2   kube-node-1
redis-cache-1450370735-z73mh   1/1       Running   0          8m        10.192.3.1   kube-node-2
web-server-1287567482-5d4dz    1/1       Running   0          7m        10.192.2.3   kube-node-1
web-server-1287567482-6f7v5    1/1       Running   0          7m        10.192.4.3   kube-node-3
web-server-1287567482-s330j    1/1       Running   0          7m        10.192.3.2   kube-node-2
```

##### 始终不在相同的节点上

上面的例子使用了 `PodAntiAffinity` 规则与 `topologyKey: "kubernetes.io/hostname"` 来部署 redis 集群，因此没有任何两个副本被调度到同一个节点上。参考 [ZooKeeper tutorial](https://kubernetes.io/docs/tutorials/stateful-application/zookeeper/#tolerating-node-failure) 了解如何使用相同的方式为 StatefulSet 配置反亲和性以实现高可用。

## 污点和容忍

### 概述

Pod 中存在属性 Node selector / Node affinity，用于将 Pod 指定到合适的节点。

相对的，节点中存在属性 `污点 taints`，使得节点可以排斥某些 Pod。

污点和容忍（taints and tolerations）成对工作，以确保 Pod 不会被调度到不合适的节点上。
* 可以为节点增加污点（taints，一个节点可以有 0-N 个污点）
* 可以为 Pod 增加容忍（toleration，一个 Pod 可以有 0-N 个容忍）
* 如果节点上存在污点，则该节点不会接受任何不能容忍（tolerate）该污点的 Pod。

#### 向节点添加污点

* 执行 `kubectl taint` 命令，可向节点添加污点，如下所示：

  ``` sh
  kubectl taint nodes node1 key=value:NoSchedule
  ```
  该命令为节点 `node1` 添加了一个污点。污点是一个键值对，在本例中，污点的键为 `key`，值为 `value`，污点效果为 `NoSchedule`。此污点意味着 Kubernetes 不会向该节点调度任何 Pod，除非该 Pod 有一个匹配的容忍（toleration）

* 执行如下命令可以将本例中的污点移除：

  ``` sh
  kubectl taint nodes node1 key:NoSchedule-
  ```

#### 向 Pod 添加容忍

PodSpec 中有一个 `tolerations` 字段，可用于向 Pod 添加容忍。下面的两个例子中定义的容忍都可以匹配上例中的污点，包含这些容忍的 Pod 也都可以被调度到 `node1` 节点上：

* 容忍1：
  ``` yaml
  tolerations:
  - key: "key"
    operator: "Equal"
    value: "value"
    effect: "NoSchedule"
  ```
* 容忍2：
  ``` yaml
  tolerations:
  - key: "key"
    operator: "Exists"
    effect: "NoSchedule"
  ```

下面这个 Pod 的例子中，使用了容忍：

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    env: test
spec:
  containers:
  - name: nginx
    image: nginx
    imagePullPolicy: IfNotPresent
  tolerations:
  - key: "example-key"
    operator: "Exists"
    effect: "NoSchedule"
```

#### 污点与容忍的匹配

当满足如下条件时，Kubernetes 认为容忍和污点匹配：
* 键（key）相同
* 效果（effect）相同
* 污点的 `operator` 为：
  * `Exists` （此时污点中不应该指定 `value`）
  * 或者 `Equal` （此时容忍的 `value` 应与污点的 `value` 相同）

如果不指定 `operator`，则其默认为 `Equal`


::: tip 特殊情况

存在如下两种特殊情况：
* 容忍中未定义 `key` 但是定义了 operator 为 `Exists`，Kubernetes 认为此容忍匹配所有的污点，如下所示：

  ```yaml
  tolerations:
  - operator: "Exists"
  ```
* 容忍中未定义 `effect` 但是定义了 `key`，Kubernetes 认为此容忍匹配所有 `effect`，如下所示：

  ``` yaml
  tolerations:
  - key: "key"
    operator: "Exists"
  ```

:::

支持的效果 `effect` 有：
* **`NoSchedule`**
* **`PreferNoSchedule`** 比 `NoSchedule` 更宽容一些，Kubernetes 将尽量避免将没有匹配容忍的 Pod 调度到该节点上，但是并不是不可以
* **`NoExecute`** 不能在节点上运行（如果已经运行，将被驱逐）

一个节点上可以有多个污点，同时一个 Pod 上可以有多个容忍。Kubernetes 使用一种类似于过滤器的方法来处理多个节点和容忍：
* 对于节点的所有污点，检查 Pod 上是否有匹配的容忍，如果存在匹配的容忍，则忽略该污点；
* 剩下的不可忽略的污点将对该 Pod 起作用

例如：
* 如果存在至少一个不可忽略的污点带有效果 `NoSchedule`，则 Kubernetes 不会将 Pod 调度到该节点上
* 如果没有不可忽略的污点带有效果 `NoSchedule`，但是至少存在一个不可忽略的污点带有效果 `PreferNoSchedule`，则 Kubernetes 将尽量避免将该 Pod 调度到此节点
* 如果存在至少一个忽略的污点带有效果 `NoExecute`，则：
  * 假设 Pod 已经在该节点上运行，Kubernetes 将从该节点上驱逐（evict）该 Pod
  * 假设 Pod 尚未在该节点上运行，Kubernetes 将不会把 Pod 调度到该节点

例如，假设您给一个节点添加了三个污点：
``` sh
kubectl taint nodes node1 key1=value1:NoSchedule
kubectl taint nodes node1 key1=value1:NoExecute
kubectl taint nodes node1 key2=value2:NoSchedule
```
同时，有一个 Pod 带有两个容忍：
``` yaml
tolerations:
- key: "key1"
  operator: "Equal"
  value: "value1"
  effect: "NoSchedule"
- key: "key1"
  operator: "Equal"
  value: "value1"
  effect: "NoExecute"
```

在这个案例中，Pod 上有两个容忍，匹配了节点的前两个污点，只有节点的第三个污点对该 Pod 来说不可忽略，该污点的效果为 `NoSchedule`：
* Kubernetes 不会将此 Pod 调度到该节点上
* 如果 Kubernetes 先将 Pod 调度到了该节点，后向该节点添加了第三个污点，则 Pod 将继续在该节点上运行而不会被驱逐（节点上带有 `NoExecute` 效果的污点已被 Pod 上的第二个容忍匹配，因此被忽略）

通常，在带有效果 `NoExecute` 的污点被添加到节点时，节点上任何不容忍该污点的 Pod 将被立刻驱逐，而容忍该污点的 Pod 则不会被驱逐。

此外，带有效果 `NoExecute` 的污点还可以指定一个可选字段 `tolerationSeconds`，该字段指定了 Pod 在多长时间后被驱逐，例如：

``` yaml
tolerations:
- key: "key1"
  operator: "Equal"
  value: "value1"
  effect: "NoExecute"
  tolerationSeconds: 3600
```

此例子中，如果 Pod 已经运行在节点上，再向节点增加此污点时，Pod 将在该节点上继续运行 3600 秒，然后才被驱逐。如果污点在此之间被移除，则 Pod 将不会被驱逐。

### 使用案例

污点和容忍使用起来非常灵活，可以用于：
* 避免 Pod 被调度到某些特定的节点
* 从节点上驱逐本不应该在该节点运行的 Pod

具体的场景可能有：

* **专属的节点：** 如果您想将一组节点专门用于特定的场景，您可以为这些节点添加污点（例如 `kubectl taint nodes nodename dedicated=groupName:NoSchedule`）然后向对应的 Pod 添加容忍。带有这些容忍的 Pod 将可以使用这一组专属节点，同时也可以使用集群中的其他节点。如果您想进一步限制这些 Pod 只能使用这一组节点，那么您应该为这一组节点添加一个标签（例如 dedicated=groupName），并为这一组 Pod 添加 node affinity（或 node selector）以限制这些 Pod 只能调度到这一组节点上。
* **带有特殊硬件的节点：** 集群中，如果某一组节点具备特殊的硬件（例如 GPU），此时非常有必要将那些不需要这类硬件的 Pod 从这组节点上排除掉，以便需要这类硬件的 Pod 可以得到资源。此时您可以为这类节点添加污点（例如：`kubectl taint nodes nodename special=true:NoSchedule` 或者 `kubectl taint nodes nodename special=true:PreferNoSchedule`）并为需要这类硬件的 Pod 添加匹配的容忍。
* **基于污点的驱逐** 当节点出现问题时，可以使用污点以 Pod 为单位从节点上驱逐 Pod。

#### 基于污点的驱逐（TaintBasedEviction）

在前面的章节中，我们描述了 [NoExecute](#污点与容忍的匹配)，该效果将对已经运行在节点上的 Pod 施加如下影响：
* 不容忍该污点的 Pod 将立刻被驱逐
* 容忍该污点的 Pod 在未指定 `tolerationSeconds` 的情况下，将继续在该节点上运行
* 容忍该污点的 Pod 在指定了 `tolerationSeconds` 的情况下，将在指定时间超过时从节点上驱逐

::: tip
`tolerationSeconds` 字段可以理解为 Pod 容忍该污点的 `耐心`：
* 超过指定的时间，则达到 Pod 忍耐的极限，Pod 离开所在节点
* 不指定 `tolerationSeconds`，则认为 Pod 对该污点的容忍是无期限的
:::

此外，自 kubernetes 1.6 以来，kubernetes 的节点控制器在碰到某些特定的条件时，将自动为节点添加污点。这类污点有：
* `node.kubernetes.io/not-ready`： 节点未就绪。对应着 NodeCondition `Ready` 为 `False` 的情况
* `node.kubernetes.io/unreachable`： 节点不可触达。对应着 NodeCondition `Ready` 为 `Unknown` 的情况
* `node.kubernetes.io/out-of-disk`：节点磁盘空间已满
* `node.kubernetes.io/memory-pressure`：节点内存吃紧
* `node.kubernetes.io/disk-pressure`：节点磁盘吃紧
* `node.kubernetes.io/network-unavailable`：节点网络不可用
* `node.kubernetes.io/unschedulable`：节点不可调度
* `node.cloudprovider.kubernetes.io/uninitialized`：如果 kubelet 是由 "外部" 云服务商启动的，该污点用来标识某个节点当前为不可用的状态。在“云控制器”（cloud-controller-manager）初始化这个节点以后，kubelet将此污点移除

自 kubernetes 1.13 开始，上述特性被默认启用。

例如，某一个包含了大量本地状态的应用，在网络断开时，可能仍然想要在节点上停留比较长的时间，以等待网络能够恢复，而避免从节点上驱逐。此时，该 Pod 的容忍可能如下所示：

``` yaml
tolerations:
- key: "node.kubernetes.io/unreachable"
  operator: "Exists"
  effect: "NoExecute"
  tolerationSeconds: 6000
```

如果 Pod 没有 `node.kubernetes.io/not-ready` 容忍，
Kubernetes 将自动为 Pod 添加一个 `tolerationSeconds=300` 的 `node.kubernetes.io/not-ready` 容忍。同样的，如果 Pod 没有 `node.kubernetes.io/unreachable` 容忍，Kubernetes 将自动为 Pod 添加一个 `tolerationSeconds=300` 的 `node.kubernetes.io/unreachable` 容忍

这类自动添加的容忍确保了 Pod 在节点发生 `not-ready` 和 `unreachable` 问题时，仍然在节点上保留 5 分钟。

DaemonSet Pod 相对特殊一些，他们在创建时就添加了不带 `tolerationSeconds` 的 `NoExecute` 效果的容忍，适用的污点有：
* `node.kubernetes.io/unreachable`
* `node.kubernetes.io/not-ready`

这将确保 DaemonSet Pod 始终不会被驱逐。

### 条件化的污点（TaintNodesByCondition）

自 Kubernetes 1.12 开始，`TaintNodesByCondition` 这个特性进入 beta 阶段，此时节点控制器自动根据 Node Condition 为节点创建对应的污点。调度器则不去检查 Node conditions，而是检查节点的污点，因此 Node Condition 不再直接影响到调度程序。用户通过为 Pod 添加容忍，可以选择性地忽略节点的某些问题（以 Node Condition 呈现的问题）。

`TaintNodesByCondition` 这个特性只会为节点添加 `NoSchedule` 效果的污点。`TaintBasedEviction` （Kubernetes 1.13 开始默认生效）则为节点添加 `NoExecute` 效果的污点。

自 Kubernetes 1.8 开始，DaemonSet Controller 自动为所有的 DaemonSet Pod 添加如下 `NoSchedule` 效果的容忍，以防止 DaemonSet 不能正常工作：

* `node.kubernetes.io/memory-pressure`
* `node.kubernetes.io/disk-pressure`
* `node.kubernetes.io/out-of-disk`（只对关键 Pod 生效）
* `node.kubernetes.io/unschedulable`（不低于 Kubernetes 1.10）
* `node.kubernetes.io/network-unavailable`（只对 host network 生效）

## Secret

### Secret概述

Kubernetes `Secret` 对象可以用来储存敏感信息，例如：密码、OAuth token、ssh 密钥等。如果不使用 `Secret`，此类信息可能被放置在 Pod 定义中或者容器镜像中。将此类敏感信息存储到 `Secret` 中，可以更好地：
* 控制其使用
* 降低信息泄露的风险

用户可以直接创建 Secret，Kubernetes 系统也会创建一些 Secret。

Secret有如下几种使用方式：
* 作为 Pod 的数据卷挂载
* 作为 Pod 的环境变量
* kubelet 在抓取容器镜像时，作为 docker 镜像仓库的用户名密码

#### 内建Secret

Service Account 将自动创建 Secret

Kubernetes 自动创建包含访问 Kubernetes APIServer 身份信息的 Secret，并自动修改 Pod 使其引用这类 Secret。

如果需要，可以禁用或者自定义自动创建并使用 Kubernetes APIServer 身份信息的特性。然而，如果您期望安全地访问 Kubernetes APIServer，您应该使用默认的 Secret 创建使用过程。

如需了解更多细节，参考 [Configure Service Accounts for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)

#### 解码和编辑

Kubenetes 中，Secret 使用 base64 编码存储，您可以将其 [解码](#解码) 获得对应信息的原文，创建 Secret 之后，您也可以再次 [编辑](#编辑) Secret

### 创建Secret（使用kubectl）

假设某个 Pod 需要访问数据库。在您执行 kubectl 命令所在机器的当前目录，创建文件 `./username.txt` 文件和 `./password.txt` 暂存数据库的用户名和密码，后续我们根据这两个文件配置 kubernetes secrets。

```sh
echo -n 'admin' > ./username.txt
echo -n '1f2d1e2e67df' > ./password.txt
```

执行命令 `kubectl create secret generic db-user-pass --from-file=./username.txt --from-file=./password.txt` 在 Kubernetes APIServer 中创建 Secret 对象，并将这两个文件中的内容存储到该 Secret 对象中，输出结果如下所示：

```
secret "db-user-pass" created
```

::: tip
* 上述命令的执行效果与此命令执行效果相同：
  `kubectl create secret generic db-user-pass –from-literal=username=admin –from-literal=password=1f2d1e2e67df`
* 如果您的密码中包含特殊字符需要转码（例如 `$`、`*`、`\`、`!`），请使用 `\` 进行转码。例如：实际密码为 `S!B\*d$zDsb`，kubectl 命令应该写成 `kubectl create secret generic dev-db-secret –from-literal=username=devuser –from-literal=password=S\!B\\*d\$zDsb`。如果通过文件创建（--from-file），则无需对文件中的密码进行转码。
:::

执行命令 `kubectl get secrets`，检查 Secret 的创建结果，输出信息如下所示：

```
NAME                  TYPE                                  DATA      AGE
db-user-pass          Opaque                                2         51s
```

执行命令 `kubectl describe secrets/db-user-pass`，查看 Secret 详情，输出信息如下所示：

```
Name:            db-user-pass
Namespace:       default
Labels:          <none>
Annotations:     <none>

Type:            Opaque

Data
====
password.txt:    12 bytes
username.txt:    5 bytes
```

> 默认情况下，`kubectl get` 和 `kubectl describe` 命令都避免展示 Secret 的内容。这种做法可以避免密码被偷窥，或者被存储到终端的日志中

### 创建Secret（手动）

和创建其他类型的 API 对象（Pod、Deployment、StatefulSet、ConfigMap 等）一样，您也可以先在 yaml 文件中定义好 Secret，然后通过 `kubectl apply -f` 命令创建。此时，您可以通过如下两种方式在 yaml 文件中定义 Secret：
* **data**：使用 data 字段时，取值的内容必须是 base64 编码的
* **stringData**：使用 stringData 时，更为方便，您可以直接将取值以明文的方式写在 yaml 文件中

#### 在 yaml 中定义 data

* 假设您要保存 `username=admin` 和 `password=1f2d1e2e67df` 到 Secret 中，请先将数据的值转化为 base64 编码，执行如下命令：
  ```sh
  echo -n 'admin' | base64
  YWRtaW4=
  echo -n '1f2d1e2e67df' | base64
  MWYyZDFlMmU2N2Rm
  ```
* 创建 secret.yaml 文件，内容如下所示：
  ``` yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: mysecret
  type: Opaque
  data:
    username: YWRtaW4=
    password: MWYyZDFlMmU2N2Rm
  ```
* 执行命令 `kubectl apply -f ./secret.yaml` 输出结果如下所示：
  ```
  secret "mysecret" created
  ```
  此时 Secret 创建成功

#### 在 yaml 中定义 stringData

有时，您并不想先将用户名和密码转换为 base64 编码之后再创建 Secret，则，您可以通过定义 stringData 来达成，此时 stringData 中的取值部分将被 apiserver 自动进行 base64 编码之后再保存。

* 创建文件 secret.yaml，内容如下所示：
  ``` yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: mysecret
  type: Opaque
  stringData:
    username: admin
    password: 1f2d1e2e67df
  ```
* 执行命令 `kubectl apply -f ./secret.yaml` 输出结果如下所示：
  ```
  secret "mysecret" created
  ```
  此时 Secret 创建成功

* 执行命令 `kubectl get -f ./secret.yaml -o yaml` 输出结果如下所示：
  ``` yaml
  apiVersion: v1
  data:
    password: MWYyZDFlMmU2N2Rm
    username: YWRtaW4=
  kind: Secret
  metadata:
    annotations:
      kubectl.kubernetes.io/last-applied-configuration: |
        {"apiVersion":"v1","kind":"Secret","metadata":{"annotations":{},"name":"mysecret","namespace":"default"},"stringData":{"password":"1f2d1e2e67df","username":"admin"},"type":"Opaque"}
    creationTimestamp: "2019-09-23T14:16:56Z"
    name: mysecret
    namespace: default
    resourceVersion: "10318365"
    selfLink: /api/v1/namespaces/default/secrets/mysecret
    uid: 24602031-e18d-467a-b7fe-0962af8ec8b8
  type: Opaque
  ```
  ::: tip 注意
  * 此时 annotation 中可以看到 password 的明文，这也许并不是您所期望的
  * 输出的 Secret 对象中，stringData 字段不再出现
  :::

#### 同时定义了 data 和 stringData

::: tip
如果您同时定义了 data 和 stringData，对于两个对象中 key 重复的字段，最终将采纳 stringData 中的 value
:::

* 创建文件 secret.yaml，该文件同时定义了 data 和 stringData，内容如下所示：
  ``` yaml
  apiVersion: v1
  kind: Secret
  metadata:
    name: mysecret
  type: Opaque
  data:
    username: YWRtaW4=
  stringData:
    username: administrator
  ```
* 执行命令 `kubectl apply -f ./secret.yaml` 输出结果如下所示：
  ```
  secret "mysecret" created
  ```
  此时 Secret 创建成功

* 执行命令 `kubectl get -f ./secret.yaml -o yaml` 输出结果如下所示：
  ``` yaml
  apiVersion: v1
  kind: Secret
  metadata:
    creationTimestamp: 2018-11-15T20:46:46Z
    name: mysecret
    namespace: default
    resourceVersion: "7579"
    uid: 91460ecb-e917-11e8-98f2-025000000001
  type: Opaque
  data:
    username: YWRtaW5pc3RyYXRvcg==
  ```
  > 此处 `YWRtaW5pc3RyYXRvcg==` 解码后的值是 `administrator`

#### 将配置文件存入 Secret

假设您的某个应用程序需要从一个配置文件中读取敏感信息，此时，您可以将该文件的内容存入 Secret，再通过数据卷的形式挂载到容器。[挂载方式未完待续]

例如，您的应用程序需要读取如下配置文件内容：

```
apiUrl: "https://my.api.com/api/v1"
username: user
password: password
```

您可以使用下面的 secret.yaml 创建 Secret

``` yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysecret
type: Opaque
stringData:
  config.yaml: |-
    apiUrl: "https://my.api.com/api/v1"
    username: user
    password: password
```

* 执行命令 `kubectl apply -f ./secret.yaml` 输出结果如下所示：
  ```
  secret "mysecret" created
  ```
  此时 Secret 创建成功

* 执行命令 `kubectl get -f ./secret.yaml -o yaml` 输出结果如下所示：
  ``` yaml
  apiVersion: v1
  kind: Secret
  metadata:
    creationTimestamp: 2018-11-15T20:40:59Z
    name: mysecret
    namespace: default
    resourceVersion: "7225"
    uid: c280ad2e-e916-11e8-98f2-025000000001
  type: Opaque
  data:
    config.yaml: YXBpVXJsOiAiaHR0cHM6Ly9teS5hcGkuY29tL2FwaS92MSIKdXNlcm5hbWU6IHt7dXNlcm5hbWV9fQpwYXNzd29yZDoge3twYXNzd29yZH19
  ```

### 创建Secret（使用Generator）

从 kubernetes v1.14 开始，kubectl 集成了 [Kustomize](https://kustomize.io/)。通过 Kustomize，您可以使用 generator（Kustomize 的概念）创建 Secret，并保存到 API Server。Generator 必须在 `kustomization.yaml` 文件中指定。

#### 从文件生成 Secret

例如，如果想从 `./username.txt` 和 `./password.txt` 文件生成（generate）一个 Secret，则可以：

* 执行如下指令创建 `kustomization.yaml` 文件

``` sh
# Create a kustomization.yaml file with SecretGenerator
cat <<EOF >./kustomization.yaml
secretGenerator:
- name: db-user-pass
  files:
  - username.txt
  - password.txt
EOF
```

* 执行指令 `kubectl apply -k .` 以创建 Secret 对象，输出结果如下所示：

  ```
  secret/db-user-pass-96mffmfh4k created
  ```

* 执行指令 `kubectl get secrets` 以检查创建结果，输出结果如下所示：

  ```
  NAME                             TYPE                                  DATA      AGE
  db-user-pass-96mffmfh4k          Opaque                                2         51s
  ```

* 执行指令 `kubectl describe secrets/db-user-pass-96mffmfh4k` 以查看 Secret 详情（请使用您自己的 Secret 名字），输出结果如下所示：

  ```
  Name:            db-user-pass
  Namespace:       default
  Labels:          <none>
  Annotations:     <none>

  Type:            Opaque

  Data
  ====
  password.txt:    12 bytes
  username.txt:    5 bytes
  ```
  ::: tip
  生成的 Secret 的名字包含一个 hash 值（Secret 内容的 hash）做为后缀，这种做法可以确保每次修改 Secret 的内容时，都将产生新的 Secret 对象
  :::

#### 从明文生成 Secret

例如，如果要从明文 `username=admin` 和 `password=secret`，您可以：

* 通过如下指令创建 secret generator 的 `kustomization.yaml` 文件：

  ``` sh
  # Create a kustomization.yaml file with SecretGenerator
  cat <<EOF >./kustomization.yaml
  secretGenerator:
  - name: db-user-pass
    literals:
    - username=admin
    - password=secret
  EOF
  ```

* 然后执行指令 `kubectl apply -k .` 创建 Secret 对象，输出结果如下所示：

  ```
  secret/db-user-pass-dddghtt9b5 created
  ```

### 解码和编辑Secret

#### 解码Secret

Secret 中的信息可以通过 `kubectl get secret` 命令获取。例如，执行命令 `kubectl get secret mysecret -o yaml
` 可获取前面章节中所创建的 Secret，输出信息如下：

``` yaml
apiVersion: v1
kind: Secret
metadata:
  creationTimestamp: 2016-01-22T18:41:56Z
  name: mysecret
  namespace: default
  resourceVersion: "164619"
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
data:
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm
```

执行命令 `echo 'MWYyZDFlMmU2N2Rm' | base64 --decode` 可解码密码字段，输出结果如下：

```
1f2d1e2e67df
```

执行命令 `echo 'YWRtaW4=' | base64 --decode` 可解码用户名字段，输出结果如下：

```
admin
```

#### 编辑Secret

执行命令 `kubectl edit secrets mysecret` 可以编辑已经创建的 Secret，该命令将打开一个类似于 `vi` 的文本编辑器，您可以直接编辑已经进行 base64 编码的字段，如下所示：

``` yaml {7,8}
# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
apiVersion: v1
data:
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm
kind: Secret
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: { ... }
  creationTimestamp: 2016-01-22T18:41:56Z
  name: mysecret
  namespace: default
  resourceVersion: "164619"
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
```

## Security Context

### 概述

> 参考文档：Kubernetes 官网文档 [Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#assign-selinux-labels-to-a-container)

Security Context（安全上下文）用来限制容器对宿主节点的可访问范围，以避免容器非法操作宿主节点的系统级别的内容，使得节点的系统或者节点上其他容器组受到影响。

Security Context可以按照如下几种方式设定：

* 访问权限控制：是否可以访问某个对象（例如文件）是基于 [userID（UID）和 groupID（GID）](https://wiki.archlinux.org/index.php/users_and_groups) 的
* [Security Enhanced Linux (SELinux)](https://en.wikipedia.org/wiki/Security-Enhanced_Linux)：为对象分配Security标签
* 以 privileged（特权）模式运行
* [Linux Capabilities](https://linux-audit.com/linux-capabilities-hardening-linux-binaries-by-removing-setuid/)：为容器组（或容器）分配一部分特权，而不是 root 用户的所有特权
* [AppArmor](https://kubernetes.io/docs/tutorials/clusters/apparmor/)：自 Kubernetes v1.4 以来，一直处于 beta 状态
* [Seccomp](https://docs.docker.com/engine/security/seccomp/)：过滤容器中进程的系统调用（system call）
* AllowPrivilegeEscalation（允许特权扩大）：此项配置是一个布尔值，定义了一个进程是否可以比其父进程获得更多的特权，直接效果是，容器的进程上是否被设置 [no_new_privs](https://www.kernel.org/doc/Documentation/prctl/no_new_privs.txt) 标记。当出现如下情况时，AllowPrivilegeEscalation 的值始终为 true：
  * 容器以 privileged 模式运行
  * 容器拥有 CAP_SYS_ADMIN 的 Linux Capability

如需要了解更多关于 Linux 安全机制方面的信息，请参考 [Overview Of Linux Kernel Security Features](https://www.linux.com/tutorials/overview-linux-kernel-security-features/)

### 为Pod设置Security Context

在 Pod 的定义中增加 `securityContext` 字段，即可为 Pod 指定 Security 相关的设定。 `securityContext` 字段是一个`PodSecurityContext`对象。通过该字段指定的内容将对该 Pod 中所有的容器生效。

## Pod示例

以下面的 Pod 为例：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  volumes:
  - name: sec-ctx-vol
    emptyDir: {}
  containers:
  - name: sec-ctx-demo
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    volumeMounts:
    - name: sec-ctx-vol
      mountPath: /data/demo
    securityContext:
      allowPrivilegeEscalation: false
```

在上面的例子中：
* `spec.securityContext.runAsUser` 字段指定了该 Pod 中所有容器的进程都以UserID `1000` 的身份运行，`spec.securityContext.runAsGroup` 字段指定了该 Pod 中所有容器的进程都以GroupID `3000` 的身份运行
  * 如果该字段被省略，容器进程的GroupID为 root(0)
  * 容器中创建的文件，其所有者为 userID 1000，groupID 3000
* `spec.securityContext.fsGroup` 字段指定了该 Pod 的 fsGroup 为 2000
  * 数据卷 （本例中，对应挂载点 `/data/demo` 的数据卷为 `sec-ctx-demo`） 的所有者以及在该数据卷下创建的任何文件，其 GroupID 为 2000

## 执行Pod示例

* 创建 Pod
  ```sh
  kubectl apply -f security-context-1.yaml
  ```
* 验证 Pod 已运行
  ```sh
  kubectl get pod security-context-demo
  ```
* 进入容器的命令行界面
  ```sh
  kubectl exec -it security-context-demo -- sh
  ```
* 在该命令行界面中，查看正在运行的进程
  ```sh
  ps
  ```
  请注意，所有的进程都以 user 1000 的身份运行（由 runAsUser 指定），输出结果如下所示：
  ```
  PID   USER     TIME  COMMAND
      1 1000      0:00 sleep 1h
      6 1000      0:00 sh
  ...
  ```
* 在命令行界面中，切换到目录 `/data`，并查看目录中的文件列表
  ```sh
  cd /data
  ls -l
  ```
  请注意，`/data/demo` 目录的 groupID 为 2000（由 fsGroup 指定），输出结果如下所示：
  ```
  drwxrwsrwx    2 root     2000          4096 Oct  4 05:08 demo
  ```
* 在命令行界面中，切换到目录 `/data/demo`，并创建一个文件
  ``` sh
  cd /data/demo
  echo hello > testfile
  ls -l
  ```
  请注意，`testfile` 的 groupID 为 2000 （由 FSGroup 指定），输出结果如下所示：
  ```
  -rw-r--r--    1 1000     2000             6 Oct  4 05:09 testfile
  ```
* 在命令行界面中执行 `id` 命令，输出结果如下所示：
  ``` sh
  $ id
  uid=1000 gid=3000 groups=2000
  ```
  请注意：
  * gid 为 3000，与 `runAsGroup` 字段所指定的一致
  * 如果 `runAsGroup` 字段被省略，则 gid 取值为 0（即 root），此时容器中的进程将可以操作 root Group 的文件

* 执行 `exit` 退出命令行界面

### 为容器设置Security Context

容器的定义中包含 `securityContext` 字段，该字段接受 [SecurityContext](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#securitycontext-v1-core) 对象。通过指定该字段，可以为容器设定安全相关的配置，当该字段的配置与 Pod 级别的 `securityContext` 配置相冲突时，容器级别的配置将覆盖 Pod 级别的配置。容器级别的 `securityContext` 不影响 Pod 中的数据卷。

下面的示例中的 Pod 包含一个 Container，且 Pod 和 Container 都有定义 `securityContext` 字段：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo-2
spec:
  securityContext:
    runAsUser: 1000
  containers:
  - name: sec-ctx-demo-2
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    securityContext:
      runAsUser: 2000
      allowPrivilegeEscalation: false
```

* 执行命令以创建 Pod
  ``` sh
  kubectl apply -f security-context-2.yaml
  ```
* 执行命令以验证容器已运行
  ``` sh
  kubectl get pod security-context-demo-2
  ```
* 执行命令进入容器的命令行界面：
  ``` sh
  kubectl exec -it security-context-demo-2 -- sh
  ```
* 在命令行界面中查看所有的进程
  ```sh
  ps aux
  ```
  请注意，容器的进程以 userID 2000 的身份运行。该取值由 `spec.containers[*].securityContext.runAsUser` 容器组中的字段定义。Pod 中定义的 `spec.securityContext.runAsUser` 取值 1000 被覆盖。输出结果如下所示：
  ```
  PID   USER      TIME  COMMAND
    1   2000      0:00  sleep 1h
    6   2000      0:00  sh
   11   2000      0:00  ps aux
  ...
  ```
* 执行命令 `exit` 退出命令行界面


### 为容器设置Linux Capabilities

使用 [Linux Capabilities](http://man7.org/linux/man-pages/man7/capabilities.7.html) 可以为容器内的进程授予某些特定的权限（而不是 root 用户的所有权限）。在容器定义的 `securityContext` 中添加 `capabilities` 字段，可以向容器添加或删除 Linux Capability。

本文后续章节中，先运行一个不包含 `capabilities` 字段的容器，观察容器内进程的 linux capabilities 位图的情况；然后在运行一个包含 `capabilities` 字段的容器，比较其 linux capabilities 位图与前者的不同。

#### 无capabilities字段时

我们先确认在没有 `capabilities` 字段时，容器的行为是怎样的。下面的例子中包含一个容器，我们没有为其添加或删除任何 Linux capability。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo-3
spec:
  containers:
  - name: sec-ctx-demo-3
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
```

* 执行命令以创建 Pod
  ``` sh
  kubectl apply -f security-context-3.yaml
  ```
* 执行命令以验证容器正在运行
  ``` sh
  kubectl get pod security-context-demo-3
  ```
* 执行命令以进入容器的命令行界面
  ``` sh
  kubectl exec -it security-context-demo-3 -- sh
  ```
* 在容器的命令行界面中查看正在运行的进程
  ``` sh
  ps aux
  ```
  输出结果中展示了容器中进程的 process ID（PID），如下所示：
  ```
  PID   USER     TIME  COMMAND
    1   root     0:00  sleep 1h
    6   root     0:00  sh
   11   root     0:00  ps aux
  ```
* 在容器的命令行界面中查看 process 1 的状态
  ``` sh
  cd /proc/1
  cat status
  ```
  输出结果中展示了该进程 Linux Capabilities 的位图，如下所示：
  ``` {2,3}
  ...
  CapPrm: 00000000a80425fb
  CapEff: 00000000a80425fb
  ...
  ```
* 记录下该进程的位图，然后执行命令 `exit` 退出重启的命令行界面

#### 有capabilities字段时

接下来，我们运行同样的一个容器，不同的是，这次为其设置了 `capabilities` 字段。下面是 yaml 配置文件，该配置中为进程添加了两个 Linux Capability： `CAP_NET_ADMIN` 和 `CAP_SYS_TIME`：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo-4
spec:
  containers:
  - name: sec-ctx-demo-4
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    securityContext:
      capabilities:
        add: ["NET_ADMIN", "SYS_TIME"]
```

* 执行命令以创建 Pod
  ``` sh
  kubectl apply -f security-context-4.yaml
  ```
* 执行命令以验证容器正在运行
  ``` sh
  kubectl get pod security-context-demo-4
  ```
* 执行命令以进入容器的命令行界面
  ``` sh
  kubectl exec -it security-context-demo-4 -- sh
  ```
* 在容器的命令行界面中查看正在运行的进程
  ``` sh
  ps aux
  ```
  输出结果中展示了容器中进程的 process ID（PID），如下所示：
  ```
  PID   USER     TIME  COMMAND
    1   root     0:00  sleep 1h
    6   root     0:00  sh
   11   root     0:00  ps aux
  ```
* 在容器的命令行界面中查看 process 1 的状态
  ``` sh
  cd /proc/1
  cat status
  ```
  输出结果中展示了该进程 Linux Capabilities 的位图，如下所示：
  ``` {2,3}
  ...
  CapPrm: 00000000aa0435fb
  CapEff: 00000000aa0435fb
  ...
  ```
* 记录下该进程的位图，然后执行命令 `exit` 退出重启的命令行界面

* 比较两次运行，进程的 Linux Capabilities 位图的差异：
  ```
  第一次运行：00000000a80425fb
  第二次运行：00000000aa0435fb
  ```
  第一次运行时，位图的 12 位和 25 为是 0。第二次运行时，12 位和 25 位是 1.查看 Linux Capabilities 的常量定义文件 [capability.h](https://github.com/torvalds/linux/blob/master/include/uapi/linux/capability.h) 可知：12 位代表 `CAP_NET_ADMIN`，25 位代表 `CAP_SYS_TIME`。

::: tip LinuxCapability常量
Linux Capabilities 常量格式为 `CAP_XXX`。然而，在容器定义中添加或删除 Linux Capabilities 时，必须去除常量的前缀 `CAP_`。例如：向容器中添加 `CAP_SYS_TIME` 时，只需要填写 `SYS_TIME`。
:::


### 为容器设置SELinux标签

Pod 或容器定义的 `securityContext` 中 `seLinuxOptions` 字段是一个 [SELinuxOptions](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.16/#selinuxoptions-v1-core) 对象，该字段可用于为容器指定 SELinux 标签。如下所示：

``` yaml
securityContext:
  seLinuxOptions:
    level: "s0:c123,c456"
```

> 为容器指定 SELinux 标签时，宿主节点的 SELinux 模块必须加载。

### 关于数据卷

Pod 的 securityContext 作用于 Pod 中所有的容器，同时对 Pod 的数据卷也同样生效。具体来说，`fsGroup` 和 `seLinuxOptions` 将被按照如下方式应用到 Pod 中的数据卷：
* `fsGroup`：对于支持 ownership 管理的数据卷，通过 `fsGroup` 指定的 GID 将被设置为该数据卷的 owner，并且可被 `fsGroup` 写入。更多细节请参考 [Ownership Management design document](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/storage/volume-ownership-management.md)
* `seLinuxOptions`：对于支持 SELinux 标签的数据卷，将按照 `seLinuxOptions` 的设定重新打标签，以使 Pod 可以访问数据卷内容。通常您只需要设置 `seLinuxOptions` 中 `level` 这一部分内容。该设定为 Pod 中所有容器及数据卷设置 [Multi-Category Security (MCS)](https://selinuxproject.org/page/NB_MLS) 标签。
`

## Pod 优先权

> 参考文档：[Pod Priority and Preemption](https://kubernetes.io/docs/concepts/configuration/pod-priority-preemption/)

Pod 中可以定义 优先级 `priority`，用于标识该 Pod 相对于其他 Pod 的重要程度。当存在 Pod 等待调度时（处于 Pending 状态），调度器将尝试抢占（preempt 或 驱逐 evict）低优先级（priority）的 Pod，以便调度 Pending 中的 Pod。

自 Kubernetes 1.9 开始，Priority 也会对如下两个场景产生影响：
* Pod 的调度顺序
* 资源耗尽时，从节点上驱逐 Pod 的顺序

Pod 优先权（priority and preemption）的特性在 Kubernetes 1.11 中是 beta状态，并默认激活，在1.14 中是 GA（Generally Available 正式发布）状态。如下表所示：

| Kubernetes Version | Priority and Preemption State | Enabled by default |
| ------------------ | ----------------------------- | ------------------ |
| 1.8                | alpha                         | no                 |
| 1.9                | alpha                         | no                 |
| 1.10               | alpha                         | no                 |
| 1.11               | beta                          | yes                |
| 1.14               | stable                        | yes                |

::: danger 警告
如果集群中的用户并不是全部可信，可能会出现一些恶意的用户，创建最高优先级的 Pod，使得其他的 Pod 被驱逐或者不能正常调度。可以通过在 `ResourceQuota` 中指定 priority 来解决此问题。
:::

### 使用Pod优先权

在 Kubernetes v1.11 及以后的版本中，参考下面的步骤启用Pod优先权（Pod priority and preemption）：

1. 添加一个或多个 `PriorityClass`
2. 创建Pod时指定 `priorityClassName` 为其中一个 PriorityClass。（通常在 Deployment/StatefulSet等 的 `spec.template.spec.priorityClassName` 中指定，而不是直接创建 Pod）

如果你尝试过该特性之后，想要将其禁用，你必须在 API Server 和 Scheduler 的命令行启动参数中移除 `PodPriority` 参数，或者将其设置为 `false`。禁用该特性之后：
* 已经创建的 Pod 将保留 priority 字段，但是抢占行为（preemption)被禁用了，且 priority 字段也将被忽略
* 新创建的 Pod 将不能在设置 `priorityClassName` 字段

### 如何禁用 preemtion

> preemption，英文愿意为先买权，此处可以理解为抢占行为
> 在 Kubernetes 1.12+，当前集群资源不足时，关键的 Pod 将依赖于抢占权才能被调度。因此，并不建议禁用 preemption
> 在 Kubernetes 1.15+，如果 `NonPreemptingPriority` 被启用了，PriorityClass 可以设置为 `preemptionPolicy: Never`，此时，该 PriorityClass 的所有 Pod 将不会抢占（preempty）其他 Pod 的资源

在 Kubernetes 1.11+，preemption 由 kube-scheduler 的参数 `disablePreemption` 设置，默认为 `false`。如果在您已经知晓上面的提示的情况下，仍然要禁用 preemption，可以将 `disablePreemption` 参数设置为 `true`。

该参数需要通过 YAML 文件配置，而不能通过命令行参数设定。示例配置如下所示：

``` yaml {8}
apiVersion: kubescheduler.config.k8s.io/v1alpha1
kind: KubeSchedulerConfiguration
algorithmSource:
  provider: DefaultProvider

...

disablePreemption: true
```

## 参考

- https://kubernetes.io/docs/concepts/configuration/overview/
- https://kuboard.cn/