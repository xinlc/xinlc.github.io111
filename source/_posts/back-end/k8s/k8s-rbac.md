---
title: Kubernetes RBAC
date: 2020-06-26 20:00:00
categories: Kubernetes
tags:
  - Kubernetes
---

Kubernetes RBAC 授权

<!--more-->

## 什么是 Kubernetes RBAC

`基于角色的访问控制（Role-Based Access Control, 即 "RBAC"）`：使用 “rbac.authorization.k8s.io” API Group 实现授权决策，允许管理员通过 Kubernetes API 动态配置策略。

RBAC 从 `Kubernetes v1.6 处于beta版本`，从 `v1.8 开始`，RBAC已作为 `稳定的功能`。启用 RBAC，请使用 `--authorization-mode=RBAC` 启动 API Server。

> 使用 kubeadm 安装 kubernetes 后，启动 API Server 的参数有 `--authorization-mode=Node,RBAC`，同时激活了 [Node Authorization](https://kubernetes.io/docs/reference/access-authn-authz/node/) 和 RBAC Authorization。

## RBAC 简易概览图

<p style="max-width: 640px;">
  <img src="/images/k8s/k8s-rbac/640.jpeg" alt="Kubernetes RBAC"></img>
</p>

## RBAC 授权接口

RBAC API 声明了四种顶级（top-level）Kubernetes 对象类型，管理员可以使用 kubectl、API接口调用等方式操作这四种类型的对象。在阅读本系列 RBAC 文档时，您可以使用 `kubectl apply -f (resource).yaml` 直接执行并尝试其效果。

## Role和ClusterRole

在 RBAC API 中，角色包含了一组授权规则。此处的授权规则是纯粹的“授予”规则（没有“否定”规则）。角色可以用以下两种形式定义：
* 名称空间中的 `Role`
* 集群范围内的 `ClusterRole`

`Role` 只能用来授权访问单个名称空间内部的资源。下面的例子中定义的 `Role` 授权读取 `default` 名称空间中的 Pod：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-reader
rules:
- apiGroups: [""] # "" indicates the core API group
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

`ClusterRole` 可以用来授予与 `Role` 相同的权限，但是由于 `ClusterRole` 是集群范围内的，也可以用来授权访问如下资源：
* 集群范围内的资源（例如节点）
* 非资源性质的端口（例如 "/healthz"）
* 所有名称空间内的资源（例如 Pod，授权后可以使用这类语句 `kubectl get pods --all-namespaces`）

下面的 `ClusterRole` 可以授权读取任意特定名称空间的 secrets，或所有名称空间的 secrets（取决于如何 [绑定](#RoleBinding和ClusterRoleBinding)）：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  # "namespace" omitted since ClusterRoles are not namespaced
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
```

## RoleBinding和ClusterRoleBinding

角色绑定将角色中定义的权限授予给一个用户或者一组用户。角色绑定包含了一个被授权对象的列表（user、group、service account），以及一个被授予的角色的引用。角色绑定有如下两种定义方式：
* 名称空间内的 `RoleBinding`
* 集群范围内的 `ClusterRoleBinding`

`RoleBinding` 可以引用同名称空间下的 `Role`。下面的 `RoleBinding` 将 “default” 名称空间中的角色 “pod-reader” 授予给用户 “jane”，此时 “jane” 可以读取 “default” 名称空间中的 pod。

* `roleRef`：引用被授予的角色
  * `kind` 可以是 `Role` 或者 `ClusterRole`
  * `name` 是被引用的 `Role` 或者 `ClusterRole` 的名称

此例中的 RoleBinding 使用 `roleRef` 将用户 “jane” 绑定到上面创建的 `pod-reader` 这个 `Role`

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
# This role binding allows "jane" to read pods in the "default" namespace.
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane # Name is case sensitive
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role #this must be Role or ClusterRole
  name: pod-reader # this must match the name of the Role or ClusterRole you wish to bind to
  apiGroup: rbac.authorization.k8s.io
```

`RoleBinding` 也可以引用一个 `ClusterRole`，用来授予 `RoleBinding` 所在名称空间中的对象的访问权限。这样，管理员可以在集群内定义一组通用的角色，并且在不同的名称空间中重用这些角色。

例如，尽管下面的 `RoleBinding` 引用了 `ClusterRole`，“dave”（被授权的用户，大小写敏感）将只能够读取 “development” 名称空间（`RoleBinding`所在的名称空间）中的 secrets 对象。

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
# This role binding allows "dave" to read secrets in the "development" namespace.
kind: RoleBinding
metadata:
  name: read-secrets
  namespace: development # This only grants permissions within the "development" namespace.
subjects:
- kind: User
  name: dave # Name is case sensitive
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

`ClusterRoleBinding` 可以被用来授权访问集群级别的资源，以及所有名称空间中的资源。下面的 `ClusterRoleBinding` 允许 “manager” 用户组中的用户读取任何名称空间中的 secrets：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
# This cluster role binding allows anyone in the "manager" group to read secrets in any namespace.
kind: ClusterRoleBinding
metadata:
  name: read-secrets-global
subjects:
- kind: Group
  name: manager # Name is case sensitive
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

`RoleBinding`、`ClusterRoleBinding` 创建后，其 `roleRef` 字段不可修改，如果尝试修改则会报错。如果需要修改 `roleRef` 字段，必须将 `RoleBinding` 或 `ClusterRoleBinding` 删除后重新创建。这样做的主要原因有如下两点：
1. `roleRef` 不同的话，本质上是完全不同的绑定关系。要求删除并重建 `RoleBinding` 或 `ClusterRoleBinding` 以修改 `roleRef` 字段，可以确保列表中的被授权的对象（用户、用户组、Service Account）都是经过考虑的（如果直接修改 `roleRef` 字段，用户将不会核对列表中的用户、用户组、Service Account是否应该被授予新的角色）
2. 不允许修改 `roleRef` 字段的情况下，可以将修改 `RoleBinding`、`ClusterRoleBinding` 的权限授予给某个用户，使其可以管理其中的被授权对象列表（用户、用户组、Service Account），但是不能够修改对应的角色（权限）。

`kubectl auth reconcile` 命令行工具可以创建或更新包含 RBAC 对象的描述文件，删除、重新创建 `RoleBinding`、`ClusterRoleBinding`。

## Referring to Resources

大多数的资源都以其名称作为标识，例如 “pods”，与其 API 的 URL 路径中的标识相同。某些 Kubernetes API 也包含了 “subresource 子资源”，例如 pod 的 logs。其 API 的 URL 如下所示：

``` 
GET /api/v1/namespaces/{namespace}/pods/{name}/log
```

此时， “pods” 是名称空间中的资源，“log” 是 pod 的子资源。在 RBAC 的 role 中，通过 `/` 来分隔资源和子资源。例如，下面的 yaml 可以授权读取 pod 和 pod 的 log：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: pod-and-pod-logs-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
```

对于某些请求，也可以使用 `resourceNames` 列表来引用其实例。此时，可以限定被访问的单个对象实例
。例如，下面的 yaml 可以授权对单个 configmap 进行 “get” 和 “update” 操作：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: default
  name: configmap-updater
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["my-configmap"]
  verbs: ["update", "get"]
```

> * “create” 操作不能通过 resourceName 来限定，因为该对象的名字在授权的时候还不存在
> * “deletecollection” 操作也不能通过 resourceName 来限定

## Aggregated ClusterRoles

KUbernetes 1.9 开始，可以使用 `aggregationRule` 来将 ClusterRole 与其他的 ClusterRole 合并。Aggregated ClusterRole 的权限由控制器管理，是所有与其 label selector 匹配的 ClusterRole 中所定义权限的并集。下面是一个 aggregated ClusterRole 的例子：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-monitoring: "true"
rules: [] # Rules are automatically filled in by the controller manager.
```

创建一个与 aggregated ClusterRole 的 label selector 匹配的 ClusterRole 时，将会向该 aggregated ClusterRole 添加规则。在上面的例子中，可以向通过创建另外一个包含标签 `rbac.example.com/aggregate-to-monitoring: true` 的 ClusterRole 向名称为 “monitoring” 的 ClusterRole 添加规则：

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-endpoints
  labels:
    rbac.example.com/aggregate-to-monitoring: "true"
# These rules will be added to the "monitoring" role.
rules:
- apiGroups: [""]
  resources: ["services", "endpoints", "pods"]
  verbs: ["get", "list", "watch"]
```

默认的面向用户的角色是 aggregated ClusterRole。这样，管理员就可以为默认角色添加 custom resource 的规则，例如 CustomResourceDefinition。

例如，下面的 ClusterRole 允许 “admin” 和 “edit” 这两个默认角色管理 custom resource “CronTabs”，而 “view” 角色则只能读取这些资源。

``` yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: aggregate-cron-tabs-edit
  labels:
    # Add these permissions to the "admin" and "edit" default roles.
    rbac.authorization.k8s.io/aggregate-to-admin: "true"
    rbac.authorization.k8s.io/aggregate-to-edit: "true"
rules:
- apiGroups: ["stable.example.com"]
  resources: ["crontabs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: aggregate-cron-tabs-view
  labels:
    # Add these permissions to the "view" default role.
    rbac.authorization.k8s.io/aggregate-to-view: "true"
rules:
- apiGroups: ["stable.example.com"]
  resources: ["crontabs"]
  verbs: ["get", "list", "watch"]
```

### Role Examples

> 例子中只展示了 `rules` 这一部分。

允许读取 core [API Group](https://kubernetes.io/docs/concepts/overview/kubernetes-api/#api-groups) 中的 “pods”：

``` yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
```

允许 读取/写入 “extensions” 和 “apps” API Group 中的 “deployments”：

``` yaml
rules:
- apiGroups: ["extensions", "apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

允许读取 “pods”、读取/写入 “jobs”：

``` yaml
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch", "extensions"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

允许读取名为 “my-config” 的 ConfigMap（必须绑定到某个名称空间中的 `RoleBinding`）：

``` yaml
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["my-config"]
  verbs: ["get"]
```

允许读取 core API Group 中的 “nodes” （由于节点时集群级别的对象，此规则必须定义在 `ClusterRole` 中，也不惜绑定到一个 `ClusterRoleBinding`）：

``` yaml
rules:
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "list", "watch"]
```

允许对非资源型的端口 “/healthz”（及其所有子路径）执行 “GET” 和 “POST” 请求（此规则必须定义在 `ClusterRole` 中，也不惜绑定到一个 `ClusterRoleBinding`）：

``` yaml
rules:
- nonResourceURLs: ["/healthz", "/healthz/*"] # '*' in a nonResourceURL is a suffix glob match
  verbs: ["get", "post"]
```

## Referring to Subjects

`RoleBinding`、`ClusterRoleBinding` 将角色绑定到被授权主体。被授权主体可以是 group、user、service account。

User 通过 string 来标识，可以是普通的 username，例如 “alice”，email风格的名称，例如“bob@example.com”，或者以字符数形式定义的数字ID。由集群管理员通过配置 [authentication modules](https://kubernetes.io/docs/reference/access-authn-authz/authentication/) 来决定产生何种格式的 username，RBAC 授权系统对此做限定。但是，`system:` 前缀是被 Kubernetes 系统预留的，管理员应该确保 username 不包含这一前缀。

KUbernetes 中的 Group 信息由 Authenticator 模块提供。与 user 一样，group 也使用 string 来标识，`system:` 前缀也是被预留的，但是没有格式要求。

[Service Account](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/) 使用 `system:serviceaccount:` 前缀的 username，并且属于 `system:serviceaccounts:` 前缀的 group。

### Role Binding Examples

下面的例子中只显示了 `RoleBinding`、`ClusterRoleBinding` 的 `subjects` 部分。

绑定 user “alice@example.com”：

``` yaml
subjects:
- kind: User
  name: "alice@example.com"
  apiGroup: rbac.authorization.k8s.io
```

绑定 group “frontend-admins”：

``` yaml
subjects:
- kind: Group
  name: "frontend-admins"
  apiGroup: rbac.authorization.k8s.io
```

绑定 kube-system 名称空间中的 default service account：

``` yaml
subjects:
- kind: ServiceAccount
  name: default
  namespace: kube-system
```

绑定 qa 名称空间中的所有 service account：

``` yaml
subjects:
- kind: Group
  name: system:serviceaccounts:qa
  apiGroup: rbac.authorization.k8s.io
```

绑定任意 service account：

``` yaml
subjects:
- kind: Group
  name: system:serviceaccounts
  apiGroup: rbac.authorization.k8s.io
```

绑定所有已认证的用户（kubernetes 1.5+）：
``` yaml
subjects:
- kind: Group
  name: system:authenticated
  apiGroup: rbac.authorization.k8s.io
```

绑定所有未认证用户（kubernetes 1.5+）：

``` yaml
subjects:
- kind: Group
  name: system:unauthenticated
  apiGroup: rbac.authorization.k8s.io
```

绑定所有用户（kubernetes 1.5+）：
``` yaml
subjects:
- kind: Group
  name: system:authenticated
  apiGroup: rbac.authorization.k8s.io
- kind: Group
  name: system:unauthenticated
  apiGroup: rbac.authorization.k8s.io
```

## RBAC Example

本节将介绍`RBAC API`所定义的`四种顶级类型`。用户可以像使用其他Kubernetes API资源一样 （例如通过kubectl、API调用等）与这些资源进行交互。例如，命令 `kubectl create -f (resource).yml` 可以被用于以下所有的例子，当然，读者在尝试前可能需要先阅读以下相关章节的内容。

### ClusterRole 与 Role 

```
Role（角色）`：是一系列权限的集合，例如一个角色可以包含读取 Pod 的权限和列出 Pod 的权限。Role `只能用来给某个特定 namespace 中的资源作鉴权`。对 namespace 、集群级资源 和 非资源类的 API（如 /healthz）使用 `ClusterRole
```

`ClusterRole`：对象可以授予与 Role 对象相同的权限，但由于它们属于集群范围对象，也可以使用它们授予对以下几种资源的访问权限：

- 集群范围资源（例如节点，即 node）
- 非资源类型 endpoint（例如 /healthz）
- 授权多个 Namespace

下面例子描述了 default namespace 中的一个 Role 对象的定义，用于授予对 pod 的读访问权限

``` yaml
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  namespace: default
  name: demo-role
rules:
- apiGroups: [""] # 空字符串""表明使用 core API group
  resources: ["pods"]
  verbs: ["get", "watch", "list", "create", "delete"]
```

下面例子中 ClusterRole 定义可用于授予用户对`某一个 namespace`，或者 `所有 namespace`的 secret（取决于其绑定方式）的读访问权限

```yaml
kind: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  # ClusterRole 是集群范围对象，没有 "namespace" 区分
  name: demo-clusterrole
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list", "create", "delete"]
```

### ClusterRoleBinding 与 RoleBinding

`RoleBinding`：把 Role 或 ClusterRole 中定义的各种权限映射到 User，Service Account 或者 Group，从而让这些用户继承角色在 namespace 中的权限。

`ClusterRoleBinding`：让用户继承 ClusterRole 在整个集群中的权限。

`RoleBinding` 可以引用在同一命名空间内定义的Role对象。

```yaml
# 以下角色绑定定义将允许用户 "jane" 从 "default" 命名空间中读取pod
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

`RoleBinding` 对象也可以引用一个 `ClusterRole` 对象用于在 `RoleBinding` 所在的命名空间内授予用户对所引用的`ClusterRole` 中定义的命名空间资源的访问权限。这一点允许管理员在整个集群范围内首先定义一组通用的角色，然后再在不同的命名空间中复用这些角色。

例如，尽管下面示例中的 RoleBinding 引用的是一个 ClusterRole 对象，但是用户”dave”（即角色绑定主体）还是只能读取”development” 命名空间中的 secret（即RoleBinding所在的命名空间）

```yaml
# 以下角色绑定允许用户"dave"读取"development"命名空间中的secret。
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: read-secrets
  namespace: development # 这里表明仅授权读取"development"命名空间中的资源。
subjects:
- kind: User
  name: dave
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

最后，可以使用 `ClusterRoleBinding` 在集群级别和所有命名空间中授予权限。下面示例中所定义的 `ClusterRoleBinding` 允许在用户组 ”manager” 中的任何用户都可以读取集群中任何命名空间中的 secret 。

```yaml
# 以下`ClusterRoleBinding`对象允许在用户组"manager"中的任何用户都可以读取集群中任何命名空间中的secret。
kind: ClusterRoleBinding
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  name: read-secrets-global
subjects:
- kind: Group
  name: manager
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### 对资源的引用

大多数资源由代表其名字的字符串表示，例如 ”pods”，就像它们出现在相关API endpoint 的URL中一样。然而，有一些Kubernetes API还 包含了”子资源”，比如 `pod` 的 `logs`。在Kubernetes中，pod logs endpoint的URL格式为：

```
GET /api/v1/namespaces/{namespace}/pods/{name}/log
```

在这种情况下，”pods”是命名空间资源，而”log”是pods的子资源。为了在RBAC角色中表示出这一点，我们需要使用斜线来划分资源 与子资源。如果需要角色绑定主体读取pods以及pod log，您需要定义以下角色：

```yaml
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  namespace: default
  name: pod-and-pod-logs-reader
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
```

通过 `resourceNames` 列表，角色可以针对不同种类的请求根据资源名引用资源实例。当指定了 `resourceNames` 列表时，不同动作 种类的请求的权限，如使用 ”get”、”delete”、”update”以及”patch”等动词的请求，将被限定到资源列表中所包含的资源实例上。例如，如果需要限定一个角色绑定主体只能 ”get” 或者 ”update” 一个 `configmap` 时，您可以定义以下角色：

```yaml
kind: Role
apiVersion: rbac.authorization.k8s.io/v1beta1
metadata:
  namespace: default
  name: configmap-updater
rules:
- apiGroups: [""]
  resources: ["configmap"]
  resourceNames: ["my-configmap"]
  verbs: ["update", "get"]
```

值得注意的是，如果设置了 `resourceNames`，则请求所使用的动词不能是 `list、watch、create或者deletecollection`。由于资源名不会出现在 `create、list、watch和deletecollection` 等API请求的URL中，所以这些请求动词不会被设置了`resourceNames` 的规则所允许，因为规则中的 `resourceNames` 部分不会匹配这些请求。

### 例子

- 绑定用户能查看所有 namespace

  ```yaml
  apiVersion: rbac.authorization.k8s.io/v1
  kind: ClusterRole
  metadata:
    # 鉴于ClusterRole是集群范围对象，所以这里不需要定 义"namespace"字段
    name: view-namespace-clusterrole
  rules:
  - apiGroups:
    - ""
    resources:
    - namespaces
    - namespaces/status
    verbs:
    - get
    - list
    - watch
  ```

- 定义 `develop-role` 用户对 `default` 命名空间详细权限

  ```yaml
  apiVersion: rbac.authorization.k8s.io/v1
  kind: Role
  metadata:
    name: develop-role
    namespace: default
  rules:
  - apiGroups:
    - ""
    resources:
    - endpoints
    - serviceaccounts
    - configmaps
    - persistentvolumeclaims
    - persistentvolumes
    - services
    - replicationcontrollers
    - replicationcontrollers/scale
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - ""
    resources:
    - pods
    - pods/log
    - pods/status
    - pods/exec
    verbs:
    - create
    - delete
    - deletecollection
    - patch
    - update
    - get
    - list
    - watch
  - apiGroups:
    - ""
    resources:
    - bindings
    - events
    - limitranges
    - namespaces/status
    - replicationcontrollers/status
    - resourcequotas
    - resourcequotas/status
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - ""
    resources:
    - namespaces
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - apps
    resources:
    - daemonsets
    - statefulsets
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - apps
    resources:
    - deployments
    - deployments/scale
    - replicasets
    - replicasets/scale
    verbs:
    - get
    - list
    - watch
    - update
  - apiGroups:
    - autoscaling
    resources:
    - horizontalpodautoscalers
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - batch
    resources:
    - cronjobs
    - jobs
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - extensions
    resources:
    - daemonsets
    - statefulsets
    - ingresses
    - networkpolicies
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - extensions
    resources:
    - deployments
    - deployments/scale
    - replicasets
    - replicasets/scale
    - replicationcontrollers/scale
    verbs:
    - get
    - list
    - watch
    - update
  - apiGroups:
    - policy
    resources:
    - poddisruptionbudgets
    verbs:
    - get
    - list
    - watch
  - apiGroups:
    - networking.k8s.io
    resources:
    - networkpolicies
    verbs:
    - get
    - list
    - watch
  ```

### 默认角色 与 默认角色绑定

`API Server` 会创建一组默认的 `ClusterRole` 和 `ClusterRoleBinding` 对象。这些默认对象中有许多包含 `system:` 前缀，表明这些资源由 `Kubernetes基础组件”拥有”`。对这些资源的修改可能`导致非功能性集群`（non-functional cluster）。一个例子是 `system:node ClusterRole` 对象。这个角色定义了 `kubelet` 的权限。如果这个角色被修改，可能会导致`kubelet` 无法正常工作。

所有默认的 `ClusterRole` 和 `ClusterRoleBinding` 对象都会被标记为 `kubernetes.io/bootstrapping=rbac-defaults`。

### 面向用户的角色

通过命令 `kubectl get clusterrole` 查看到并不是所有都是以 `system:前缀`，它们是`面向用户的角色`。这些角色包含`超级用户角色（cluster-admin`），即旨在利用 `ClusterRoleBinding（cluster-status）`在集群范围内授权的角色， 以及那些使用 `RoleBinding（admin、edit和view）`在特定命名空间中授权的角色。

- `cluster-admin`：`超级用户权限`，允许对任何资源执行任何操作。在 ClusterRoleBinding 中使用时，可以完全控制集群和所有命名空间中的所有资源。在 RoleBinding 中使用时，可以完全控制 RoleBinding 所在命名空间中的所有资源，包括命名空间自己。
- `admin`：`管理员权限`，利用 RoleBinding 在某一命名空间内部授予。在 RoleBinding 中使用时，允许针对命名空间内大部分资源的读写访问， 包括在命名空间内创建角色与角色绑定的能力。但`不允许对资源配额（resource quota）`或者`命名空间本身`的`写访问`。
- `edit`：允许对某一个命名空间内大部分对象的读写访问，但不允许查看或者修改角色或者角色绑定。
- `view`：允许对某一个命名空间内大部分对象的只读访问。不允许查看角色或者角色绑定。由于可扩散性等原因，`不允许查看 secret 资源`。

> 核心组件角色、其它组件角色 和 控制器（Controller）角色 这里不在一一列出。具体见 [参考链接](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#controller-roles)。

### Permissive RBAC

所谓 `Permissive RBAC` 是指授权给所有的 `Service Accounts` 管理员权限。`不推荐的配置`

```sh
$ kubectl create clusterrolebinding permissive-binding \
  --clusterrole=cluster-admin \
  --user=admin \
  --user=kubelet \
  --group=system:serviceaccounts
```

> 上面的 policy 允许 所有 的 Service Account 扮演集群管理员的角色。在 Kubernetes 中，任何容器化应用都将自动分配一个 Service Account，即，在此情况下，任何应用程序都可以对 API Server 执行任何操作，包括查看 Secret 和修改权限。因此，这个做法是不被推荐的。

### Service Account Permissions

> 参考文档：[Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

默认的 RBAC 策略为 control-plane 组件、节点还有控制器授予对应范围内的权限，但是并不为 `kube-system` 名称空间之外的 Service Account 授予任何权限（除了所有已认证用户都被授予的 discovery 权限）。

用户可以按照需要为特定的 service account 指定特定的角色。细粒度的角色绑定方式可以提高整体的安全性，但是带来了更多的管理负担。粗粒度的授权策略可能为 service account 授予了额外的不需要的 API 访问权限（存在越权的风险），但是更容易管理。

从最高的安全到最低的安全性，本文罗列了为 Service Account 授权的如下五种方式：

* 为每个应用程序的 Service Account 绑定一个角色（最佳实践）
   
  要求应用程序在其 podSpec 中指定 `serviceAccountName`，并未为其创建对应的 Service Account（通过 API、yaml 文件、`kubectl create serviceaccount` 等）

  例如，授予名称空间 “my-namespace” 中名为 “my-sa” 的 Service Account 只读权限：

  ``` sh
    kubectl create rolebinding my-sa-view \
    --clusterrole=view \
    --serviceaccount=my-namespace:my-sa \
    --namespace=my-namespace
  ```

* 为名称空间中的 “default” Service Account 绑定一个角色

  如果应用程序不指定 `serviceAccountName`，将使用 “default” Service Account。

  > 注意：“default” Service Account 中的权限将被应用到同名称空间中所有不指定 `serviceAccountName` 的 Pod 中。

  例如，为名称空间 “my-namespace” 中的 “default” Service Account 收取 只读权限：
  ``` sh
  kubectl create rolebinding default-view \
    --clusterrole=view \
    --serviceaccount=my-namespace:default \
    --namespace=my-namespace
  ```

  许多 [add-on](https://kubernetes.io/docs/concepts/cluster-administration/addons/) 当前都在`kube-system` 名称空间中运行并使用该名称空间中的 “default” Service Account。为 `kube-system` 名称空间中的 “default” Service Account 授予 cluster-admin 权限，将使这些 add-on 获得超级用户的访问权限。

  ``` sh
  kubectl create clusterrolebinding add-on-cluster-admin \
    --clusterrole=cluster-admin \
    --serviceaccount=kube-system:default
  ```

* 为名称空间中的所有 Service Account 绑定一个角色

  如果想要让某个名称空间中所有的应用程序都共有一个角色（无论应用程序使用哪个Service Account），可以为名称空间中的 Service Account Group 授予角色。

  例如，为名称空间 “my-namespace” 中所有的 Service Account 授予同名称空间下的只读权限：

  ``` sh
  kubectl create rolebinding serviceaccounts-view \
    --clusterrole=view \
    --group=system:serviceaccounts:my-namespace \
    --namespace=my-namespace
  ```

* 为集群内所有的 Service Account 绑定一个有限权限的角色（不推荐）

  如果不想按名称空间管理权限，可以在集群级别为所有 Service Account 授予一个角色。

  例如，为集群内所有的 Service Account 授予针对所有名称空间的只读权限：

  ``` sh
  kubectl create clusterrolebinding serviceaccounts-view \
    --clusterrole=view \
    --group=system:serviceaccounts
  ```

* 为集群内所有的 Service Account 绑定一个超级用户的角色（强烈不推荐）

  如果您完全不想考虑划分权限的事情，可以为所有的 Service Account 授予超级用户的访问权限。

  ::: danger 警告
  这将允许任何用户读取 secret 或创建以超级用户身份运行的 Pod。
  :::

  ``` sh
  kubectl create clusterrolebinding serviceaccounts-cluster-admin \
    --clusterrole=cluster-admin \
    --group=system:serviceaccounts
  ```

### 创建用户 shell 脚本

```sh
#!/usr/bin/env bash
# 注意修改KUBE_APISERVER为你的API Server的地址

KUBE_APISERVER=$1
USER=$2
USER_SA=system:serviceaccount:default:${USER}
Authorization=$3
USAGE="USAGE: create-user.sh <api_server> <username> <clusterrole authorization>\n
Example: https://192.168.1.2:6443 brand"
CSR=`pwd`/user-csr.json
SSL_PATH="/opt/kubernetes/ssl"
USER_SSL_PATH="/opt/kubernetes/create-user"
SSL_FILES=(ca-key.pem ca.pem ca-config.json)
CERT_FILES=(${USER}.csr $USER-key.pem ${USER}.pem)

if [[ $KUBE_APISERVER == "" ]]; then
   echo -e $USAGE
   exit 1
fi
if [[ $USER == "" ]];then
    echo -e $USAGE
    exit 1
fi

if [[ $Authorization == "" ]];then
    echo -e $USAGE
    exit 1
fi

# 创建用户的csr文件
function createCSR(){
cat>$CSR<<EOF
{
  "CN": "USER",
  "hosts": [],
  "key": {
    "algo": "rsa",
    "size": 2048
  },
  "names": [
    {
      "C": "CN",
      "ST": "BeiJing",
      "L": "BeiJing",
      "O": "k8s",
      "OU": "System"
    }
  ]
}
EOF

# 替换csr文件中的用户名
sed -i "s/USER/$USER_SA/g" $CSR
}

function ifExist(){
if [ ! -f "$SSL_PATH/$1" ]; then
    echo "$SSL_PATH/$1 not found."
    exit 1
fi
}

function ifClusterrole(){
kubectl get clusterrole ${Authorization} &> /dev/null
if (( $? !=0 ));then
   echo "${Authorization} clusterrole there is no"
   exit 1
fi
}

# 判断clusterrole授权是否存在
ifClusterrole

# 判断证书文件是否存在
for f in ${SSL_FILES[@]};
do
    echo "Check if ssl file $f exist..."
    ifExist $f
    echo "OK"
done

echo "Create CSR file..."
createCSR
echo "$CSR created"
echo "Create user's certificates and keys..."
cd $USER_SSL_PATH
cfssl gencert -ca=${SSL_PATH}/ca.pem -ca-key=${SSL_PATH}/ca-key.pem -config=${SSL_PATH}/ca-config.json -profile=kubernetes $CSR| cfssljson -bare $USER_SA

# 创建 sa
kubectl create sa ${USER} -n default

# 设置集群参数
kubectl config set-cluster kubernetes \
--certificate-authority=${SSL_PATH}/ca.pem \
--embed-certs=true \
--server=${KUBE_APISERVER} \
--kubeconfig=${USER}.kubeconfig

# 设置客户端认证参数
kubectl config set-credentials ${USER_SA} \
--client-certificate=${USER_SSL_PATH}/${USER_SA}.pem \
--client-key=${USER_SSL_PATH}/${USER_SA}-key.pem \
--embed-certs=true \
--kubeconfig=${USER}.kubeconfig

# 设置上下文参数
kubectl config set-context kubernetes \
--cluster=kubernetes \
--user=${USER_SA} \
--namespace=development \
--kubeconfig=${USER}.kubeconfig

# 设置默认上下文
kubectl config use-context kubernetes --kubeconfig=${USER}.kubeconfig

# 创建 namespace
# kubectl create ns $USER

# 绑定角色
# kubectl create rolebinding ${USER}-admin-binding --clusterrole=admin --user=$USER --namespace=$USER --serviceaccount=$USER:default
kubectl create clusterrolebinding ${USER}-binding --clusterrole=${Authorization} --user=${USER_SA}

# kubectl config get-contexts

echo "Congratulations!"
echo "Your kubeconfig file is ${USER}.kubeconfig"
```

## RBAC 命令行工具

### kubectl create role

创建一个 `Role` 对象以在某个名称空间内定义权限。例子：

* 创建一个名为 “pod-reader” 的 `Role` 对象，允许用户执行 “get”、“watch”、“list” 操作：

  ``` sh
  kubectl create role pod-reader --verb=get --verb=list --verb=watch --resource=pods
  ```

* 创建一个名为 “pod-reader” 的 `Role` 对象并指定 resourceName：

  ``` sh
  kubectl create role pod-reader --verb=get --resource=pods --resource-name=readablepod --resource-name=anotherpod
  ```

* 创建一个名为 “foo” 的 `Role` 对象并指定 apiGroups：

  ``` sh
  kubectl create role foo --verb=get,list,watch --resource=replicasets.apps
  ```

* 创建一个名为 “foo” 的 `Role` 对象并指定 subresource 权限：

  ``` sh
  kubectl create role foo --verb=get,list,watch --resource=pods,pods/status
  ```

* 创建一个名为 “my-component-lease-holder” 的 `Role` 对象并指定可以 查看/更新 特定名称的资源：

  ``` sh
  kubectl create role my-component-lease-holder --verb=get,list,watch,update --resource=lease --resource-name=my-component
  ```

### kubectl create clusterrole

创建 `ClusterRole` 对象的例子：

* 创建一个名为 “pod-reader” 的 `ClusterRole` 对象，允许用户对 Pod 执行 “get”、“watch”、“list” 操作：

  ``` sh
  kubectl create clusterrole pod-reader --verb=get,list,watch --resource=pods
  ```

* 创建一个名为 “pod-reader” 的 `ClusterRole` 对象，并指定 resourceName：

  ``` sh
  kubectl create clusterrole pod-reader --verb=get --resource=pods --resource-name=readablepod --resource-name=anotherpod
  ```

* 创建一个名为 “foo” 的 `ClusterRole` 对象，并指定 apiGroup：

  ``` sh
  kubectl create clusterrole foo --verb=get,list,watch --resource=replicasets.apps
  ```

* 创建一个名为 “foo” 的 `ClusterRole` 对象，并指定 subresource 权限：

  ``` sh
  kubectl create clusterrole foo --verb=get,list,watch --resource=pods,pods/status
  ```

* 创建一个名为 “foo” 的 `ClusterRole` 对象，并指定 nonResourceURL：

  ``` sh
  kubectl create clusterrole "foo" --verb=get --non-resource-url=/logs/*
  ```

* 创建一个名为 “monitoring” 的 `ClusterRole` 对象，并指定 aggregationRule：

  ``` sh
  kubectl create clusterrole monitoring --aggregation-rule="rbac.example.com/aggregate-to-monitoring=true"
  ```

### kubectl create rolebinding

创建 RoleBinding，在某个名称空间内为被授权主体绑定 `Role` 或 `ClusterRole`。例子：

* 在名称空间 “acme” 中，将名称为 `admin` 的 `ClusterRole` 的权限授予给用户 “bob” ：

  ``` sh
  kubectl create rolebinding bob-admin-binding --clusterrole=admin --user=bob --namespace=acme
  ```

* 在名称空间 “acme” 中，将名称为 `view` 的 `ClusterRole` 的权限授予给名称空间 “acme” 中名称为 “myapp” 的 service account ：

  ``` sh
  kubectl create rolebinding myapp-view-binding --clusterrole=view --serviceaccount=acme:myapp --namespace=acme
  ```

* 在名称空间 “acme” 中，将名称为 `view` 的 `ClusterRole` 的权限授予给名称空间 “myappnamespace” 中名称为 “myapp” 的 service account ：

  ``` sh
  kubectl create rolebinding myappnamespace-myapp-view-binding --clusterrole=view --serviceaccount=myappnamespace:myapp --namespace=acme
  ```

### kubectl create clusterrolebinding

在集群范围内（包括所有名称空间）授权 `ClusterRole`。例子：

* 在集群范围内，将名称为 `cluster-admin` 的 `ClusterRole` 的权限授予给用户 “root”：

  ``` sh
  kubectl create clusterrolebinding root-cluster-admin-binding --clusterrole=cluster-admin --user=root
  ```

* 在集群范围内，将名称为 `system:node-proxier` 的 `ClusterRole` 的权限授予给用户 “system:kube-proxy”：

  ``` sh
  kubectl create clusterrolebinding kube-proxy-binding --clusterrole=system:node-proxier --user=system:kube-proxy
  ```

* 在集群范围内，将名称为 `view` 的 `ClusterRole` 的权限授予给名称空间 “acme” 中的 service account “myapp”：

  ``` sh
  kubectl create clusterrolebinding myapp-view-binding --clusterrole=view --serviceaccount=acme:myapp
  ```

### kubectl auth reconcile

从描述文件创建或更新 `rbac.authorization.k8s.io/v1` API 对象。

* 描述文件中有，API Server中不存在的对象将被创建（如果对应的名称空间不存在，自动创建名称空间）。

* 描述文件中有，API Server中已存在的对象将被更新，以包含描述文件中定义的权限（如果指定了 `--remove-extra-permissions` 参数，描述文件中未定义的额外的权限将被删除）。

* 描述文件中有，API Server中已存在的绑定对象将被更新，以包含描述文件中定义的被授权主体（如果指定了 `--remove-extra-subjects` 参数，描述文件中未定义的额外的被授权主体将被删除）。

例子：

* 测试描述文件中的 RBAC 对象，并显示将要执行的变更：

  ``` sh
  kubectl auth reconcile -f my-rbac-rules.yaml --dry-run
  ```

* 应用描述文件中的 RBAC 对象，保留额外的权限（角色中）和额外的被授权主体（绑定中）：

  ``` sh
  kubectl auth reconcile -f my-rbac-rules.yaml
  ```

* 应用描述文件中的 RBAC 对象，删除额外的权限（角色中）和额外的被授权主体（绑定中）：

  ``` sh
  kubectl auth reconcile -f my-rbac-rules.yaml --remove-extra-subjects --remove-extra-permissions
  ```

## 参考

* [Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
* https://kuboard.cn/
