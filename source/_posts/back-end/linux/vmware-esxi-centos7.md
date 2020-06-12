---
title: 在 VMware ESXi 中安装 CentOS7
date: 2019-09-07 20:02:00
categories: Linux
tags:
  - linux
  - centos7
---

记录一次在 `VMware ESXi` 上安装 `CentOS7` 系统全过程。

<!--more-->

## 什么是 vSphere?

> vSphere 是 VMware 公司在 2001 年基于云计算推出的一套企业级虚拟化解决方案、核心组件为 ESXi。如今，经历了 5 个版本的改进，已经实现了虚拟化基础架构、高可用性、集中管理、性能监控等一体化解决方案。

- [虚拟化 VMware ESXi 6.7 服务器安装配置详细步骤图文](https://idc.wanyunshuju.com/li/580.html)
- [VMware ESXi 6.7.0](https://www.vmware.com/cn.html)

## 准备工作

### 下载系统镜像

- CentOS7 系统 [官网](https://www.centos.org)
- [使用阿里云镜像下载 CentOS7.6](http://mirrors.aliyun.com/centos/7.6.1810/isos/x86_64/CentOS-7-x86_64-DVD-1810.iso)

### 将镜像上传到 VMware ESXi

![1][1]

![2][2]

选择存储，点击数据存储浏览器

![3][3]

![4][4]

点击上传，将下载好的 `CentOS7`镜像上传到根目录

![6][6]

![7][7]

![8][8]

选择客户机操作系统，注意客户机操作系统版本要一致

![9][9]

![10][10]

![11][11]

![12][12]

点击进入新创建好的虚拟机

![13][13]

编辑虚拟机配置

![14][14]

CD/DVD 驱动器 1 更改为数据存储 ISO 文件， 并点击介质浏览

![15][15]

选择刚刚上传好的 CentOS7 镜像文件

![16][16]

![19][19]

## 安装 CentOS7 操作系统

直接回车安装引导

![20][20]

选择语言

![21][21]

选择需要安装的版本，默认是最小化安装

![22][22]

这里我选择最小化默认安装，也可以选择 GUI 带桌面的系统

![23][23]

选择系统安装位置，可以在这里进行分区管理（默认会自动分区）。  
自定义分区，选择要分区的硬盘，我要配置分区，然后点击完成。

![24][24]

手动分区需要注意：

1. 三个必须建立的分区，`swap` 交换分区、`boot` 引导分区、`/` 根目录分区，也就是系统分区
2. 建立 `swap` 根据物理内存。 用于在系统运行内存不足时提供运算, 系统默认分配基本为物理内存的 `2` 倍
3. 建议 `swap` 分区设置如下：

- 小于等于 `4G` 物理内存的系统，至少设置 `2GB` 的交换分区
- `4G ～ 16G` 物理内存的系统，至少设置 `4GB` 的交换分区
- `16G ～ 64G` 物理内存的系统，至少设置 `8GB` 的交换分区
- `64G ～ 256G` 物理内存的系统，至少设置 `16GB` 的交换分区

3. `boot` 分区系统默认给 `1G`
4. `home` 目录可以创建，也可以把所以除了 `boot` 和 `swap` 之外的磁盘剩余全部划分到 `/` 根目录下

![25][25]

确定已经分配好的分区，删除旧分区格式，点击接受更改

![26][26]

网络和主机名配置

![27][27]

![28][28]

选择常规，勾选可用时自动连接到这个网络，以免重启后网卡不自动连接

![29][29]

选择 IPv4 设置，进入后选择方法, 选择手动连接。  
输入地址，子掩码，网关(可在`ESXi 网络`中查看)，然后填写 dns 服务器, 点击保存。

![30][30]

![31][31]

然后点击开始安装。 安装中要设置 root 密码，否则 root 用户不会被启用。

![32][32]

![33][33]

创建普通用户(可选)

![34][34]

![35][35]

等待安装完后，点击重启。  
直接回车，进入系统，到此 CentOS 系统安装完成。

![36][36]

## [CentOS 7 安装后的相关配置](https://xinlichao.cn/back-end/linux/linux-initial-centos7/#more)

[1]: /images/linux/vmware-esxi-centos7/1.jpg
[2]: /images/linux/vmware-esxi-centos7/2.jpg
[3]: /images/linux/vmware-esxi-centos7/3.jpg
[4]: /images/linux/vmware-esxi-centos7/4.jpg
[6]: /images/linux/vmware-esxi-centos7/6.jpg
[7]: /images/linux/vmware-esxi-centos7/7.jpg
[8]: /images/linux/vmware-esxi-centos7/8.jpg
[9]: /images/linux/vmware-esxi-centos7/9.jpg
[10]: /images/linux/vmware-esxi-centos7/10.jpg
[11]: /images/linux/vmware-esxi-centos7/11.jpg
[12]: /images/linux/vmware-esxi-centos7/12.jpg
[13]: /images/linux/vmware-esxi-centos7/13.jpg
[14]: /images/linux/vmware-esxi-centos7/14.jpg
[15]: /images/linux/vmware-esxi-centos7/15.jpg
[16]: /images/linux/vmware-esxi-centos7/16.jpg
[18]: /images/linux/vmware-esxi-centos7/18.jpg
[19]: /images/linux/vmware-esxi-centos7/19.jpg
[20]: /images/linux/vmware-esxi-centos7/20.jpg
[21]: /images/linux/vmware-esxi-centos7/21.jpg
[22]: /images/linux/vmware-esxi-centos7/22.jpg
[23]: /images/linux/vmware-esxi-centos7/23.jpg
[24]: /images/linux/vmware-esxi-centos7/24.jpg
[25]: /images/linux/vmware-esxi-centos7/25.jpg
[26]: /images/linux/vmware-esxi-centos7/26.jpg
[27]: /images/linux/vmware-esxi-centos7/27.jpg
[28]: /images/linux/vmware-esxi-centos7/28.jpg
[29]: /images/linux/vmware-esxi-centos7/29.jpg
[30]: /images/linux/vmware-esxi-centos7/30.jpg
[31]: /images/linux/vmware-esxi-centos7/31.jpg
[32]: /images/linux/vmware-esxi-centos7/32.jpg
[33]: /images/linux/vmware-esxi-centos7/33.jpg
[34]: /images/linux/vmware-esxi-centos7/34.jpg
[35]: /images/linux/vmware-esxi-centos7/35.jpg
[36]: /images/linux/vmware-esxi-centos7/36.jpg
