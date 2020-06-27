---
title: Kubernetes 持久化存储
date: 2020-06-14 15:25:00
categories: Kubernetes
tags:
  - Kubernetes
---

默认情况下容器中的磁盘文件是非持久化的，对于运行在容器中的应用来说面临两个问题，第一：当容器挂掉kubelet将重启启动它时，文件将会丢失；第二：当Pod中同时运行多个容器，容器之间需要共享文件时。Kubernetes的Volume解决了这两个问题。

<!--more-->

## 背景

在Docker中也有一个docker Volume的概念 ，Docker的Volume只是磁盘中的一个目录，生命周期不受管理。当然Docker现在也提供Volume将数据持久化存储，但支持功能比较少（例如，对于Docker，每个容器只允许挂载一个Volume，并且不能将参数传递给Volume）。

另一方面，Kubernetes Volume具有明确的生命周期 - 与pod相同。因此，Volume的生命周期比Pod中运行的任何容器要持久，在容器重新启动时能可以保留数据，当然，当Pod被删除不存在时，Volume也将消失。注意，Kubernetes支持许多类型的Volume，Pod可以同时使用任意类型/数量的Volume。

内部实现中，一个Volume只是一个目录，目录中可能有一些数据，pod的容器可以访问这些数据。至于这个目录是如何产生的、支持它的介质、其中的数据内容是什么，这些都由使用的特定Volume类型来决定。

要使用Volume，pod需要指定Volume的类型和内容（spec.volumes字段），和映射到容器的位置（spec.containers.volumeMounts字段）。

## 数据卷Volume

### 数据卷概述

Kubernetes Volume（数据卷）主要解决了如下两方面问题：
* 数据持久性：通常情况下，容器运行起来之后，写入到其文件系统的文件暂时性的。当容器崩溃后，kubelet 将会重启该容器，此时原容器运行后写入的文件将丢失，因为容器将重新从镜像创建。
* 数据共享：同一个 Pod（容器组）中运行的容器之间，经常会存在共享文件/文件夹的需求

Docker 里同样也存在一个 volume（数据卷）的概念，但是 docker 对数据卷的管理相对 kubernetes 而言要更少一些。在 Docker 里，一个 Volume（数据卷）仅仅是宿主机（或另一个容器）文件系统上的一个文件夹。Docker 并不管理 Volume（数据卷）的生命周期。

在 Kubernetes 里，Volume（数据卷）存在明确的生命周期（与包含该数据卷的容器组相同）。因此，Volume（数据卷）的生命周期比同一容器组中任意容器的生命周期要更长，不管容器重启了多少次，数据都能被保留下来。当然，如果容器组退出了，数据卷也就自然退出了。此时，根据容器组所使用的 Volume（数据卷）类型不同，数据可能随数据卷的退出而删除，也可能被真正持久化，并在下次容器组重启时仍然可以使用。

从根本上来说，一个 Volume（数据卷）仅仅是一个可被容器组中的容器访问的文件目录（也许其中包含一些数据文件）。这个目录是怎么来的，取决于该数据卷的类型（不同类型的数据卷使用不同的存储介质）。

使用 Volume（数据卷）时，我们需要先在容器组中定义一个数据卷，并将其挂载到容器的挂载点上。容器中的一个进程所看到（可访问）的文件系统是由容器的 docker 镜像和容器所挂载的数据卷共同组成的。Docker 镜像将被首先加载到该容器的文件系统，任何数据卷都被在此之后挂载到指定的路径上。Volume（数据卷）不能被挂载到其他数据卷上，或者通过引用其他数据卷。同一个容器组中的不同容器各自独立地挂载数据卷，即同一个容器组中的两个容器可以将同一个数据卷挂载到各自不同的路径上。

我们现在通过下图来理解 容器组、容器、挂载点、数据卷、存储介质（nfs、PVC、ConfigMap）等几个概念之间的关系：

* 一个容器组可以包含多个数据卷、多个容器
* 一个容器通过挂载点决定某一个数据卷被挂载到容器中的什么路径
* 不同类型的数据卷对应不同的存储介质（图中列出了 nfs、PVC、ConfigMap 三种存储介质，接下来将介绍更多）

![1][1]

### 数据卷的类型

Kubernetes 目前支持多达 28 种数据卷类型（其中大部分特定于具体的云环境如 GCE/AWS/Azure 等），如需查阅所有的数据卷类型，请查阅 Kubernetes 官方文档 [Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)

本文针对自建 Kubernetes 时，经常使用的数据卷的类型描述如下：

#### emptyDir

* **描述**
  emptyDir类型的数据卷在容器组被创建时分配给该容器组，并且直到容器组被移除，该数据卷才被释放。该数据卷初始分配时，始终是一个空目录。同一容器组中的不同容器都可以对该目录执行读写操作，并且共享其中的数据，（尽管不同的容器可能将该数据卷挂载到容器中的不同路径）。当容器组被移除时，emptyDir数据卷中的数据将被永久删除

  > 容器崩溃时，kubelet 并不会删除容器组，而仅仅是将容器重启，因此 emptyDir 中的数据在容器崩溃并重启后，仍然是存在的。

* **适用场景**
  * 空白的初始空间，例如合并/排序算法中，临时将数据存在磁盘上
  * 长时间计算中存储检查点（中间结果），以便容器崩溃时，可以从上一次存储的检查点（中间结果）继续进行，而不是从头开始
  * 作为两个容器的共享存储，使得第一个内容管理的容器可以将生成的页面存入其中，同时由一个 webserver 容器对外提供这些页面
  * 默认情况下，emptyDir 数据卷被存储在 node（节点）的存储介质（机械硬盘、SSD、或者网络存储）上。此外，您可以设置 emptyDir.medium 字段为 "Memory"，此时 Kubernetes 将挂载一个 tmpfs（基于 RAM 的文件系统）。tmpfs 的读写速度非常快，但是与磁盘不一样，tmpfs 在节点重启后将被清空，且您向该 emptyDir 写入文件时，将消耗对应容器的内存限制。

* **Pod 示例**

  ```yaml
  apiVersion: v1
  kind: Pod
  metadata:
    name: test-pd
  spec:
    containers:
    - image: k8s.gcr.io/test-webserver
      name: test-container
      volumeMounts:
      - mountPath: /cache
        name: cache-volume
    volumes:
    - name: cache-volume
      emptyDir: {}
  ```

#### nfs

* **描述**

  nfs 类型的数据卷可以加载 NFS（Network File System）到您的容器组/容器。容器组被移除时，将仅仅 umount（卸载）NFS 数据卷，NFS 中的数据仍将被保留。

  * 可以在加载 NFS 数据卷前就在其中准备好数据；
  * 可以在不同容器组之间共享数据；
  * 可以被多个容器组加载并同时读写；

* **适用场景**

  * 存储日志文件
  * MySQL的data目录（建议只在测试环境中）
  * 用户上传的临时文件

* [详细信息，请参阅NFS示例](https://github.com/kubernetes/examples/tree/master/staging/volumes/nfs)

#### cephfs

* **描述**

  cephfs 数据卷使得您可以挂载一个外部 CephFS 卷到您的容器组中。对于 kubernetes 而言，cephfs 与 nfs 的管理方式和行为完全相似，适用场景也相同。不同的仅仅是背后的存储介质。

* **适用场景**

  同 nfs 数据卷

* [详细信息，请参阅CephFS示例](https://github.com/kubernetes/examples/tree/master/volumes/cephfs/)

#### hostPath

* **描述**

  hostPath 类型的数据卷将 Pod（容器组）所在节点的文件系统上某一个文件或文件夹挂载进容器组（容器）。

  除了为 hostPath 指定 path 字段以外，您还可以为其指定 type 字段，可选的 type 字段描述如下：

  | Type字段取值          | 描述                                                         |
  | --------------------- | ------------------------------------------------------------ |
  |                       | 空字符串（default）用于向后兼容，此时，kubernetes 在挂载 hostPath 数据卷前不会执行任何检查 |
  | **DirectoryOrCreate** | 如果指定的 hostPath 路径不存在，kubernetes 将在节点的该路径上创建一个空文件夹，权限设置为 0755，与 kubelet 进程具备相同的 group 和 ownership |
  | **Directory**         | 指定 hostPath 路径必须存在，且是一个文件夹                   |
  | **FileOrCreate**      | 如果指定的 hostPath 路径不存在，kubernetes 将在节点的该路径上创建一个空的文件，权限设置为 0644，与 kubelet 进程具备相同的 group 和 ownership |
  | **File**              | 指定 hostPath 路径必须存在，且是一个文件                     |
  | **Socket**            | 指定 hostPath 路径必须存在，且是一个 Unix Socket             |
  | **CharDevice**        | 指定 hostPath 路径必须存在，且是一个 character device        |
  | **BlockDevice**       | 指定 hostPath 路径必须存在，且是一个 block device            |

  ::: danger 警告

  使用 hostPath 数据卷时，必须十分小心，因为：

  * 不同节点上配置完全相同的容器组（例如同一个Deployment的容器组）可能执行结果不一样，因为不同节点上 hostPath 所对应的文件内容不同；
  * Kubernetes 计划增加基于资源的调度，但这个特性将不会考虑对 hostPath 的支持
  * hostPath 对应的文件/文件夹只有 root 可以写入。您要么在  [privileged Container](https://kubernetes.io/docs/user-guide/security-context) 以 root 身份运行您的进程，要么修改与 hostPath 数据卷对应的节点上的文件/文件夹的权限，

  :::

* **适用场景**

  绝大多数容器组并不需要使用 hostPath 数据卷，但是少数情况下，hostPath 数据卷非常有用：
  * 某容器需要访问 Docker，可使用 hostPath 挂载宿主节点的 /var/lib/docker
  * 在容器中运行 cAdvisor，使用 hostPath 挂载宿主节点的 /sys

* **Pod 示例**

  ```yaml
  apiVersion: v1
  kind: Pod
  metadata:
    name: test-pd
  spec:
    containers:
    - image: k8s.gcr.io/test-webserver
      name: test-container
      volumeMounts:
      - mountPath: /test-pd
        name: test-volume
    volumes:
    - name: test-volume
      hostPath:
        # directory location on host
        path: /data
        # this field is optional
        type: Directory
  ```

#### configMap

* **描述**

  ConfigMap 提供了一种向容器组注入配置信息的途径。ConfigMap 中的数据可以被 Pod（容器组）中的容器作为一个数据卷挂载。

  在数据卷中引用 ConfigMap 时：

  * 您可以直接引用整个 ConfigMap 到数据卷，此时 ConfigMap 中的每一个 key 对应一个文件名，value 对应该文件的内容
  * 您也可以只引用 ConfigMap 中的某一个名值对，此时可以将 key 映射成一个新的文件名

  ::: tip
  将 ConfigMap 数据卷挂载到容器时，如果该挂载点指定了 ***数据卷内子路径*** （subPath），则该 ConfigMap 被改变后，该容器挂载的内容仍然不变。
  :::

* **适用场景**

  * 使用 ConfigMap 中的某一 key 作为文件名，对应 value 作为文件内容，替换 nginx 容器中的 /etc/nginx/conf.d/default.conf 配置文件。

* **Pod 示例**

  ```yaml
  apiVersion: v1
  kind: Pod
  metadata:
    name: configmap-pod
  spec:
    containers:
      - name: test
        image: busybox
        volumeMounts:
          - name: config-vol
            mountPath: /etc/config
    volumes:
      - name: config-vol
        configMap:
          name: log-config
          items:
            - key: log_level
              path: log_level
  ```

#### secret

* **描述**

  secret 数据卷可以用来注入敏感信息（例如密码）到容器组。您可以将敏感信息存入 kubernetes secret 对象，并通过 Volume（数据卷）以文件的形式挂载到容器组（或容器）。secret 数据卷使用 tmpfs（基于 RAM 的文件系统）挂载。

  ::: tip
  将 Secret 数据卷挂载到容器时，如果该挂载点指定了 ***数据卷内子路径*** （subPath），则该 Secret 被改变后，该容器挂载的内容仍然不变。
  :::
  
* **适用场景**

  * 将 `HTTPS` 证书存入 `kubernets secret`，并挂载到 `/etc/nginx/conf.d/myhost.crt`、`/etc/nginx/conf.d/myhost.pem` 路径，用来配置 nginx 的 HTTPS 证书

* [Secret 的更多详情请参考这里](https://kubernetes.io/docs/concepts/configuration/secret/)

#### persistentVolumeClaim

* **描述**

  persistentVolumeClaim 数据卷用来挂载 PersistentVolume 存储卷。PersistentVolume 存储卷为用户提供了一种在无需关心具体所在云环境的情况下”声明“ 所需持久化存储的方式。

* [更多详细信息，请参阅PersistentVolumes示例](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

#### downwardAPI

通过环境变量的方式告诉容器Pod的信息

[更多详细信息，请参见downwardAPI卷示例](https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/)

## 数据卷-挂载

挂载是指将定义在 Pod 中的数据卷关联到容器，同一个 Pod 中的同一个数据卷可以被挂载到该 Pod 中的多个容器上。

### 数据卷内子路径

有时候我们需要在同一个 Pod 的不同容器间共享数据卷。使用 `volumeMounts.subPath` 属性，可以使容器在挂载数据卷时指向数据卷内部的一个子路径，而不是直接指向数据卷的根路径。

下面的例子中，一个 LAMP（Linux Apache Mysql PHP）应用的 Pod 使用了一个共享数据卷，HTML 内容映射到数据卷的 `html` 目录，数据库的内容映射到了 `mysql` 目录：

``` yaml {15,22}
apiVersion: v1
kind: Pod
metadata:
  name: my-lamp-site
spec:
    containers:
    - name: mysql
      image: mysql
      env:
      - name: MYSQL_ROOT_PASSWORD
        value: "rootpasswd"
      volumeMounts:
      - mountPath: /var/lib/mysql
        name: site-data
        subPath: mysql
        readOnly: false
    - name: php
      image: php:7.0-apache
      volumeMounts:
      - mountPath: /var/www/html
        name: site-data
        subPath: html
        readOnly: false
    volumes:
    - name: site-data
      persistentVolumeClaim:
        claimName: my-lamp-site-data
```

#### 通过环境变量指定数据卷内子路径

使用 `volumeMounts.subPathExpr` 字段，可以通过容器的环境变量指定容器内路径。使用此特性时，必须启用 `VolumeSubpathEnvExpansion` [feature gate](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/) （自 Kubernetes v1.15 开始，是默认启用的。）

同一个 volumeMounts 中 `subPath` 字段和 `subPathExpr` 字段不能同时使用。

如下面的例子，该 Pod 使用 `subPathExpr` 在 hostPath 数据卷 `/var/log/pods` 中创建了一个目录 `pod1`（该参数来自于Pod的名字）。此时，宿主机目录 `/var/log/pods/pod1` 挂载到了容器的 `/logs` 路径：

``` yaml {9,19}
apiVersion: v1
kind: Pod
metadata:
  name: pod1
spec:
  containers:
  - name: container1
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          apiVersion: v1
          fieldPath: metadata.name
    image: busybox
    command: [ "sh", "-c", "while [ true ]; do echo 'Hello'; sleep 10; done | tee -a /logs/hello.txt" ]
    volumeMounts:
    - name: workdir1
      mountPath: /logs
      subPathExpr: $(POD_NAME)
      readOnly: false
  restartPolicy: Never
  volumes:
  - name: workdir1
    hostPath:
      path: /var/log/pods
```

### 容器内路径

`mountPath` 数据卷被挂载到容器的路径，不能包含 `:`

### 权限

容器对挂载的数据卷是否具备读写权限，如果 `readOnly` 为 `true`，则只读，否则可以读写（为 `false` 或者不指定）。默认为 `false`

### 挂载传播

数据卷的挂载传播（Mount Propagation）由 Pod 的 `spec.containers[*].volumeMounts.mountPropagation` 字段控制。可选的取值有：

* **None**： 默认值。在数据卷被挂载到容器之后，此数据卷不会再接受任何后续宿主机或其他容器挂载到该数据卷对应目录下的子目录的挂载。同样的，在容器中向该数据卷对应目录挂载新目录时，宿主机也不能看到。对应 Linux 的 `private` mount propagation 选项 [Linux内核文档](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt)

* **HostToContainer**：在数据卷被挂载到容器之后，宿主机向该数据卷对应目录添加挂载时，对容器是可见的。对应 Linux 的 `rslave` mount propagation 选项 [Linux内核文档](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt)

* **Bidirectional**：在数据卷被挂载到容器之后，宿主机向该数据卷对应目录添加挂载时，对容器是可见的；同时，从容器中向该数据卷创建挂载，同样也对宿主机可见。对应 Linux 的 `rshared` mount propagation 选项 [Linux内核文档](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt)

::: danger
**Bidirectional** mount propagation 选项隐藏风险。如果在容器内进行不合适的挂载，可能影响宿主机的操作系统正常执行，因此，只有 privileged 容器才可以使用该选项。使用此选项时，建议对 Linux 内核的行为有所熟悉。此外，使用 Bidirectional 选项时，任何由 Pod 中容器在对应数据卷目录创建的挂载必须在容器终止时销毁（umounted）。
:::

#### 额外配置

在部分系统中（CoreOS、RedHat/Centos、Ubuntu），Docker 的 mount share 选项必须事先配置好，步骤如下：

* **编辑 Docker 的 `systemd` service 文件**，将 `MountFlags` 设定如下：

  ```
  MountFlags=shared
  ```

  **或者移除 `MountFlags=slave`**

* 重启 Docker 守护进程：

  ``` sh
  sudo systemctl daemon-reload
  sudo systemctl restart docker
  ```

## 存储卷PersistentVolume

### 概述

与管理计算资源相比，管理存储资源是一个完全不同的问题。为了更好的管理存储，Kubernetes 引入了 PersistentVolume 和 PersistentVolumeClaim 两个概念，将存储管理抽象成如何提供存储以及如何使用存储两个关注点。

::: tip 关注点分离

通过 PersistentVolume 和 PersistentVolumeClaim，Kubernetes 分离了提供存储和使用存储着两个关注点：
* PersistentVolumeClaim 必须定义在与应用程序相同的名称空间中，关注应用程序如何使用存储，通常由应用程序管理员或开发人员负责
* PersistentVolume 只能定义在集群层面，关注集群如何提供存储，通常由集群管理员或者运维人员负责

:::

PersistentVolume（PV 存储卷）是集群中的一块存储空间，由集群管理员管理、或者由 Storage Class（存储类）自动管理。PV（存储卷）和 node（节点）一样，是集群中的资源（kubernetes 集群由存储资源和计算资源组成）。PersistentVolumeClaim（存储卷声明）是一种类型的 Volume（数据卷），PersistentVolumeClaim（存储卷声明）引用的 PersistentVolume（存储卷）有自己的生命周期，该生命周期独立于任何使用它的容器组。PersistentVolume（存储卷）描述了如何提供存储的细节信息（NFS、cephfs等存储的具体参数）。

PersistentVolumeClaim（PVC 存储卷声明）代表用户使用存储的请求。Pod 容器组消耗 node 计算资源，PVC 存储卷声明消耗 PersistentVolume 存储资源。Pod 容器组可以请求特定数量的计算资源（CPU / 内存）；PersistentVolumeClaim 可以请求特定大小/特定访问模式（只能被单节点读写/可被多节点只读/可被多节点读写）的存储资源。

根据应用程序的特点不同，其所需要的存储资源也存在不同的要求，例如读写性能等。集群管理员必须能够提供关于 PersistentVolume（存储卷）的更多选择，无需用户关心存储卷背后的实现细节。为了解决这个问题，Kubernetes 引入了 StorageClass（存储类）的概念

### 存储卷和存储卷声明的关系

存储卷和存储卷声明的关系如下图所示：

* PersistentVolume 是集群中的存储资源，通常由集群管理员创建和管理
* StorageClass 用于对 PersistentVolume 进行分类，如果正确配置，StorageClass 也可以根据 PersistentVolumeClaim 的请求动态创建 Persistent Volume
* PersistentVolumeClaim 是使用该资源的请求，通常由应用程序提出请求，并指定对应的 StorageClass 和需求的空间大小
* PersistentVolumeClaim 可以做为数据卷的一种，被挂载到容器组/容器中使用

![2][2]

### 存储卷声明的管理过程

PersistantVolume 和 PersistantVolumeClaim 的管理过程描述如下：

> 下图主要描述的是 PV 和 PVC 的管理过程，因为绘制空间的问题，将挂载点与Pod关联了，实际结构应该如上图所示：
> * Pod 中添加数据卷，数据卷关联PVC
> * Pod 中包含容器，容器挂载数据卷

![3][3]

#### 提供 Provisioning

有两种方式为 PersistentVolumeClaim 提供 PersistentVolume : 静态、动态

* **静态提供 Static**
  
  集群管理员实现创建好一系列 PersistentVolume，它们包含了可供集群中应用程序使用的关于实际存储的具体信息。

  ![4][4]
  
* **动态提供 Dynamic**

  在配置有合适的 StorageClass（存储类）且 PersistentVolumeClaim 关联了该 StorageClass 的情况下，kubernetes 集群可以为应用程序动态创建 PersistentVolume。

  ![5][5]

#### 绑定 Binding

假设用户创建了一个 PersistentVolumeClaim 存储卷声明，并指定了需求的存储空间大小以及访问模式。Kubernets master 将立刻为其匹配一个 PersistentVolume 存储卷，并将存储卷声明和存储卷绑定到一起。如果一个 PersistentVolume 是动态提供给一个新的 PersistentVolumeClaim，Kubernetes master 会始终将其绑定到该 PersistentVolumeClaim。除此之外，应用程序将被绑定一个不小于（可能大于）其 PersistentVolumeClaim 中请求的存储空间大小的 PersistentVolume。一旦绑定，PersistentVolumeClaim 将拒绝其他 PersistentVolume 的绑定关系。PVC 与 PV 之间的绑定关系是一对一的映射。

PersistentVolumeClaim 将始终停留在 ***未绑定 unbound*** 状态，直到有合适的 PersistentVolume 可用。举个例子：集群中已经存在一个 50Gi 的 PersistentVolume，同时有一个 100Gi 的 PersistentVolumeClaim，在这种情况下，该 PVC 将一直处于 ***未绑定 unbound*** 状态，直到管理员向集群中添加了一个 100Gi 的 PersistentVolume。

#### 使用 Using

对于 Pod 容器组来说，PersistentVolumeClaim 存储卷声明是一种类型的 Volume 数据卷。Kubernetes 集群将 PersistentVolumeClaim 所绑定的 PersistentVolume 挂载到容器组供其使用。

#### 使用中保护 Storage Object in Use Protection

* 使用中保护（Storage Object in Use Protection）的目的是确保正在被容器组使用的 PersistentVolumeClaim 以及其绑定的 PersistentVolume 不能被系统删除，以避免可能的数据丢失。
* 如果用户删除一个正在使用中的 PersistentVolumeClaim，则该 PVC 不会立即被移除掉，而是推迟到该 PVC 不在被任何容器组使用时才移除；同样的如果管理员删除了一个已经绑定到 PVC 的 PersistentVolume，则该 PV 也不会立刻被移除掉，而是推迟到其绑定的 PVC 被删除后才移除掉。

#### 回收 Reclaiming

当用户不在需要其数据卷时，可以删除掉其 PersistentVolumeClaim，此时其对应的 PersistentVolume 将被集群回收并再利用。Kubernetes 集群根据 PersistentVolume 中的 reclaim policy（回收策略）决定在其被回收时做对应的处理。当前支持的回收策略有：Retained（保留）、Recycled（重复利用）、Deleted（删除）

* **保留 Retain**

  保留策略需要集群管理员手工回收该资源。当绑定的 PersistentVolumeClaim 被删除后，PersistentVolume 仍然存在，并被认为是”已释放“。但是此时该存储卷仍然不能被其他 PersistentVolumeClaim 绑定，因为前一个绑定的 PersistentVolumeClaim 对应容器组的数据还在其中。集群管理员可以通过如下步骤回收该 PersistentVolume：
  * 删除该 PersistentVolume。PV 删除后，其数据仍然存在于对应的外部存储介质中（nfs、cefpfs、glusterfs 等）
  * 手工删除对应存储介质上的数据
  * 手工删除对应的存储介质，您也可以创建一个新的 PersistentVolume 并再次使用该存储介质

* **删除 Delete**
  
  删除策略将从 kubernete 集群移除 PersistentVolume 以及其关联的外部存储介质（云环境中的 AWA EBS、GCE PD、Azure Disk 或 Cinder volume）。

* **再利用 Recycle**

  * 再利用策略将在 PersistentVolume 回收时，执行一个基本的清除操作（rm -rf /thevolume/*），并使其可以再次被新的 PersistentVolumeClaim 绑定。
  * 集群管理员也可以自定义一个 recycler pod template，用于执行清除操作。请参考 [Recycle](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#recycle)

::: tip
动态提供的 PersistentVolume 将从其对应的 StorageClass 继承回收策略的属性。
:::

#### 扩展 Expanding Persistent Volumes Claims

  Kubernetes 中，该特性处于 beta 状态
  该特性只针对极少数的 PersistentVolume 类型有效。请参考 [Expanding Persistent Volumes Claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims)

### 存储卷类型

Kubernetes 支持 20 种存储卷类型（可参考 [Types of Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#types-of-persistent-volumes)），如下所示：

* 非持久性存储
  * emptyDir
  * HostPath (只在单节点集群上用做测试目的)
* 网络连接性存储
  * SAN：iSCSI、ScaleIO Volumes、FC (Fibre Channel)
  * NFS：nfs，cfs
* 分布式存储
  * Glusterfs
  * RBD (Ceph Block Device)
  * CephFS
  * Portworx Volumes
  * Quobyte Volumes
* 云端存储
  * GCEPersistentDisk
  * AWSElasticBlockStore
  * AzureFile
  * AzureDisk
  * Cinder (OpenStack block storage)
  * VsphereVolume
  * StorageOS
* 自定义存储
  * FlexVolume
* 不推荐
  * Flocker (最近更新2016年 https://github.com/ClusterHQ/flocker/)

针对自建 Kubernetes 集群的情况，建议使用如下几种存储卷类型：
  * NFS
  * CephFS

## 存储类StorageClass

### 存储类概述

StorageClass 存储类用于描述集群中可以提供的存储的类型。不同的存储类可能对应着不同的：
* 服务等级（quality-of-service level）
* 备份策略
* 集群管理员自定义的策略

Kubernetes 自身对存储类所代表的含义并无感知，由集群管理员自行约定。

### 存储类的种类

参考 [Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)，Kubernetes 提供 19 种存储类 Provisioner，但是绝大多数与具体的云环境相关，如 AWSElasticBlockStore / AzureFile / AzureDisk / GCEPersistentDisk 等。

## 搭建NFS Server

### 背景

Kubernetes 对 Pod 进行调度时，以当时集群中各节点的可用资源作为主要依据，自动选择某一个可用的节点，并将 Pod 分配到该节点上。在这种情况下，Pod 中容器数据的持久化如果存储在所在节点的磁盘上，就会产生不可预知的问题，例如，当 Pod 出现故障，Kubernetes 重新调度之后，Pod 所在的新节点上，并不存在上一次 Pod 运行时所在节点上的数据。

为了使 Pod 在任何节点上都能够使用同一份持久化存储数据，我们需要使用网络存储的解决方案为 Pod 提供数据卷。常用的网络存储方案有：NFS/cephfs/glusterfs。

本文介绍一种使用 centos 搭建 nfs 服务器的方法。此方法<font color="red">仅用于测试目的</font>，请根据您生产环境的实际情况，选择合适的 NFS 服务。

### 配置要求

* 两台 linux 服务器，centos 7
  * 一台用作 nfs server
  * 另一台用作 nfs 客户端

### 配置NFS服务器

> 本章节中所有命令都以 root 身份执行

* 执行以下命令安装 nfs 服务器所需的软件包
  ``` sh
  yum install -y nfs-utils
  ```
* 执行命令 `vim /etc/exports`，创建 exports 文件，文件内容如下：
  ```
  /root/nfs_root/ *(insecure,rw,sync,no_root_squash)
  ```
* 执行以下命令，启动 nfs 服务
  ```sh
  # 创建共享目录，如果要使用自己的目录，请替换本文档中所有的 /root/nfs_root/
  mkdir /root/nfs_root

  systemctl enable rpcbind
  systemctl enable nfs-server

  systemctl start rpcbind
  systemctl start nfs-server
  exportfs -r
  ```
* 检查配置是否生效
  ```sh
  exportfs
  # 输出结果如下所示
  /root/nfs_root /root/nfs_root
  ```

### 在客户端测试nfs

> * 本章节中所有命令都以 root 身份执行
> * 服务器端防火墙开放111、662、875、892、2049的 tcp / udp 允许，否则远端客户无法连接。

* 执行以下命令安装 nfs 客户端所需的软件包
  ``` sh
  yum install -y nfs-utils
  ```

* 执行以下命令检查 nfs 服务器端是否有设置共享目录
  ``` sh
  # showmount -e $(nfs服务器的IP)
  showmount -e 172.17.216.82
  # 输出结果如下所示
  Export list for 172.17.216.82:
  /root/nfs_root *
  ```
* 执行以下命令挂载 nfs 服务器上的共享目录到本机路径 `/root/nfsmount`
  ``` sh
  mkdir /root/nfsmount
  # mount -t nfs $(nfs服务器的IP):/root/nfs_root /root/nfsmount
  mount -t nfs 172.17.216.82:/root/nfs_root /root/nfsmount
  # 写入一个测试文件
  echo "hello nfs server" > /root/nfsmount/test.txt
  ```
* 在 nfs 服务器上执行以下命令，验证文件写入成功
  ``` sh
  cat /root/nfs_root/test.txt
  ```

## 参考

- https://kubernetes.io/docs/concepts/storage/
- https://kuboard.cn/

[1]: /images/k8s/k8s-persistent-storage/1.jpg
[2]: /images/k8s/k8s-persistent-storage/2.jpg
[3]: /images/k8s/k8s-persistent-storage/3.jpg
[4]: /images/k8s/k8s-persistent-storage/4.jpg
[5]: /images/k8s/k8s-persistent-storage/5.jpg
