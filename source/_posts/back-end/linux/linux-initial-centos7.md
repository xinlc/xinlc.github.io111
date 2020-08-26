---
title: CentOS 7 安装后的相关配置
date: 2019-09-12 19:00:00
categories: Linux
tags:
  - linux
  - centos7
---

`CentOS7` 安装参考[在 VMware ESXi 中安装 CentOS7](https://xinlichao.cn/back-end/linux/vmware-esxi-centos7/#more)

安装完 `CentOS7（Minimal Install）`操作系统后，需要对其进行初始化的配置，以增强服务器的安全性和可用性，本文记录 `CentOS7` 系统安装后需要做的初始化配置。

<!--more-->

## 配置网络

`CentOS7` 安装后一般没有网卡配置，需要自行添加网卡配置（在上一篇文章已经添加了`ens192` 网卡，如果网络好用省略此步骤）。

### 修改网卡配置文件

```bash
# 查看IP地址，MAC地址（ether）
ip addr

# 使用 nmcli con show 命令，查看网卡的UUID信息
nmcli con show

# 进入网络配置文件夹
cd /etc/sysconfig/network-scripts

# 复制 ifcfg-ens192 网卡信息
cp ifcfg-ens192 ifcfg-eth0

# 修改 enth0 网卡信息
vi ifcfg-eth0

# 重启网络服务
service network restart

# 测试网络
ping -c 4 www.baidu.com
```

网卡参数说：

- TYPE=Ethernet（设备连接类型，此处为以太网）；
- IPADDR=IP 地址（192.168.2.201）；
- NETMASK=子掩码（255.255.255.0）；
- GATEWAY=网关（192.168.2.1）；
- DNS1=DNS 地址 （114.114.114.114 或 8.8.8.8）；
- ONBOOT=yes（网卡随系统启动， 默认为 no）；
- BOOTPROTO=static (使用动态 IP 还是静态 IP，默认为 dhcp）；
- HWADDR=MAC 地址；

## 安装常用工具

由于是最小化安装系统，很多常用工具没有安装，调通网络后就可使用 yum 安装了

```bash
# 安装常用网络工具，如：ifconfig、netstat等
yum install net-tools

# 安装 vim
yum -y install vim
```

## 创建一个新用户

为了系统安全，一般我们只会用普通用户进行操作，新安装系统后添加一个普通用户。

```bash
# 添加普通用户
adduser leo

# 设置密码
passwd 123456
```

> p.s. 添加新用户或更改 root 密码，不要关闭当前窗口，新打开一个窗口进行登录测试是否好用，如果失败还可以在当前窗口继续操作，（都是泪啊……）

## 给普通用户 root 权限

我们用普通用户，进行普通的操作，但是有时我们需要更大的权限进行操作，我们一般不会使用 `root` 登进登录，一般使用 `sudo` （Super User do）命令

为了将 `sudo` 权限给普通用户，我们需要将新用户加入 `wheel` 组中，`CentOS` 默认的 `wheel` 组有运行 `sudo` 的权限。
我们使用 `root` 用户，将 `leo` 用户加入到 `wheel` 组中。

```bash
gpasswd -a leo wheel
```

或者修改 sudoers 文件提升用户权限

```bash
# 说明：格式为（用户名    网络中的主机=（执行命令的目标用户）    执行的命令范围）

vim /etc/sudoers

leo    ALL=(ALL)       ALL
```

## 只允许 wheel 用户组的用户 su 切换

```bash
vi /etc/pam.d/su
# Uncomment the following line to require a user to be in the "wheel" group.
auth            required        pam_wheel.so use_uid
```

> 其他用户切换 root，即使输对密码也会提示 su: incorrect password

## tty 登录超时设置

用户在线 5 分钟无操作则超时断开连接，在`/etc/profile`中添加：

```bash
export TMOUT=300
readonly TMOUT
```

## 限制登录失败次数并锁定

登录失败 5 次锁定 180 秒，根据需要设置是否包括 root

```bash
vim /etc/pam.d/login

# 在最后添加一行
auth required pam_tally2.so deny=6 unlock_time=180 even_deny_root root_unlock_time=180
```

## 禁止 root 使用 ssh 登录

CentOS7 默认允许任何账户通过 `ssh` 登录，为了系统安全应该禁用 `root` 账户使用 `ssh` 登录，如果想要使用 `root` 权限只需只需 `su` 或 `sudo` 获取`root` 权限即可

```bash
vim /etc/ssh/sshd_config

# PermitRootLogin yes 修改为：
PermitRootLogin no

# 保存后重启 sshd 服务
systemctl restart sshd.service
```

> 想要获取 root 权限，就要必须破解 root 和普通用户密码，提升了系统安全性。

## 登录 IP 限制

允许 ssh 的用户和来源 ip

```bash
vim /etc/ssh/sshd_config

# 只允许 leo 用户 使用 116.3.197.* ip段登录
AllowUsers leo@116.3.197.*

# 保存后重启 sshd 服务
systemctl restart sshd.service
```

## 启用公钥授权验证登入 ssh

如果客户端想访问服务端，可以使用 ssh 命令，SSH 支持用户名和密码方式，也支持公钥授权。使用密钥文件代替普通的简单密码认证也会极大的提高安全性。

在客户端生成公钥和私钥（由于我是 MacOS 有 `ssh-keygen` 工具，如果没有也可以在 `CentOS` 生成秘钥，然后把私钥下载到客户端）：

```bash
# 执行命令之后，会在 $HOME 下的 .ssh 目录下生成 2 个文件，id_rsa 为私钥，id_rsa.pub 为公钥
ssh-keygen -t rsa -b 2048

# Generating public/private rsa key pair.
# Enter file in which to save the key (/root/.ssh/id_rsa):
# Enter passphrase (empty for no passphrase):
# Enter same passphrase again:
# Your identification has been saved in /root/.ssh/id_rsa.
# Your public key has been saved in /root/.ssh/id_rsa.pub.

# 生成 SSH 密钥对之后，需要将本地（客户端）的公钥，拷贝到服务器（服务端），有如下 2 中方法
# 1. 使用 ssh-copy-id
# 这会将本地用户的公钥拷贝到服务端的 leo 用户的 .ssh/authorized_keys 文件中
ssh-copy-id leo@SERVER_IP_ADDRESS

# 2. 如果不支持 ssh-copy-id 命令，需要手动将公钥 ~/.ssh/id_ras.pub 的内容拷贝到服务端用户 leo 的 ~/.ssh/authorized_keys 文件中。
cat ~/.ssh/id_rsa.pub | ssh leo@SERVER_IP_ADDRESS "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 注意 authorized_keys 文件需要 600 或 400 权限，否则 sshd 不会读取
chmod 600 ~/.ssh/authorized_keys
```

在服务器生成秘钥命令也是一样：

```bash
# 生成公私钥
ssh-keygen -t rsa -b 2048

# 将公钥添加到 authorized_keys 文件，一行一条公钥
# 可以使用scp 将私钥下载到客户端
scp -P 22 leo@SERVER_IP_ADDRESS:~/.ssh/id_rsa ~/.ssh/
```

使用秘钥登录：

```bash
ssh -i ~/.ssh/201_id_rsa root@192.168.2.201 -p 22
```

多个`SSH`秘钥配置：

```bash
# 生成多个秘钥
ssh-keygen -t rsa -b 4096 -C xinlichao2016@gamil.com -f .ssh/201_id_rsa
ssh-keygen -t rsa -b 4096 -C xinlichao2016@gamil.com -f .ssh/202_id_rsa

# 上传
ssh-copy-id -i .ssh/201_id_rsa.pub root@192.168.2.201
ssh-copy-id -i .ssh/202_id_rsa.pub root@192.168.2.202

# 第一种 添加 ssh-key 到 ssh-agent：
ssh-add ~/.ssh/201_id_rsa
ssh-add ~/.ssh/202_id_rsa

# 其他命令
ssh-add -l # 查看
ssh-add -A # 默认添加：id_rsa
ssh-add -K ~/.ssh/201_id_rsa  # 指定添加
ssh-add -D  # 全部删除
ssh-add -d  ~/.ssh/201_id_rsa  # 指定删除

# p.s. ssh-agent 这种方式每次开机都需要添加一次，可以写进 .bashrc 或 .bash_profile

# 第二种方式配置 ssh config

# 创建 config 并 添加以下内容
vim ~/.ssh/config

Host 192.168.2.201
  IdentityFile ~/.ssh/201_id_rsa
Host 192.168.2.202
  IdentityFile ~/.ssh/202_id_rsa

# 别名方式配置
Host dev
HostName 192.168.2.202
Port 22
User root
IdentityFile ~/.ssh/202_id_rsa

# ssh 登录
ssh dev
```

> 现在就可以使用秘钥+秘钥密码登录了，不设置秘钥密码会直接登录。

## 配置只能使用密钥文件登录

```bash
vim /etc/ssh/sshd_config

# 添加或打开以下注释
RSAAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile      .ssh/authorized_keys

# 禁用密码登录，必须使用ssh密钥文件登录
PasswordAuthentication no

# 保存后重启 sshd 服务
systemctl restart sshd.service

```

## 配置双重验证

让服务器更安全，开启密码和证书双重验证：

```bash
vim /etc/ssh/sshd_config

# 开启密码登录
PasswordAuthentication yes

# 双重认证
AuthenticationMethods publickey,password

# 保存后重启 sshd 服务
systemctl restart sshd.service
```

## 修改 ssh 端口

`ssh` 默认端口为 `22` , 修改默认端口为 `1024 - 65535` 之间任意数字（注意不要和常用服务端口冲突），提高黑客破解难度。

```bash
vim /etc/ssh/sshd_config

# Port 22 修改为：其他端口

Port 1234

# 保存后，配置防火墙开发端口
firewall-cmd --zone=public --add-port=1234/tcp --permanent
firewall-cmd --reload

# 重启 sshd 服务
systemctl restart sshd.service
```

> 注意：需要配置防火墙。所有的操作，都要用新窗口登录测试，看看是否修改正确，

## firewalld 配置

`CentOS7` 的内核已经有防火墙 `netfilter`，较前版本的 `CentOS` 默认使用 `iptables`，但 `CentOS7` 开始使用配置跟简单、效能更高、稳定性更好的 `firewalld`（防火墙知识很多，有时间再开一篇写吧）若果服务器尚未安装 `firewalld`，可以使用以下指令安装

```bash
# 安装
yum install firewalld

# 启动服务
systemctl start firewalld

# 设置为开机启动
systemctl enable firewalld

# 查看防火墙开启了哪些服务和端口
firewall-cmd --list-all
```

配置 ssh 新端口允许防火墙通过：

```bash
# 复制 firewalld 有关 sshd 的设定档案：
cp /usr/lib/firewalld/services/ssh.xml /etc/firewalld/services/

# 编辑 ssh.xml
vim /etc/firewalld/services/ssh.xml

# <port protocol="tcp" port="22"/> 修改为：你设置的sshd端口号

<port protocol="tcp" port="1234"/>

# 保存 重新加载防火墙配置

firewall-cmd --reload

# 新开窗口验证登录
ssh -p 1234 leo@SERVER_IP_ADDRESS
```

> 或者直接使命令开放 sshd 端口：firewall-cmd --zone=public --add-port=1234/tcp --permanent

## 每天自动更新软件

（可选）

每一天都有成千上万的黑客在世界各地寻找 `Linux` 系统和常见软件的安全漏洞，保证软件是最新版本，可以及时修复最新漏洞，但最新的软件可能不稳定（程序员就是在制造 bug 和修复 bug 的路上……）。

```bash
# 手动更新所有软件
yum -y update

# 安装定时更新依赖
yum -y install cronie yum-cron

# Anacron 每天执行这个档案一次，它根据配置档案 /etc/yum/yum-cron.conf 来更新软件
/etc/cron.daily/0yum.cron
# 这是每天执行 yum-cron 的配置档案，默认只会下载更新的软件，并不安装，用意是让管理员检视 yum-cron 的输出，选取需要更新的软件进行手动安装。
/etc/yum/yum-cron.conf

# 自动更新并安装配置 /etc/yum/yum-cron.conf 为：
update_messages = yes, download_updates = yes, apply_updates = yes

# 重启定时更新服务
systemctl start crond
systemctl start yum-cron
```

## 系统安全加固

1. 强制用户不重用最近使用的密码，降低密码猜测攻击风险

  在 `/etc/pam.d/password-auth` 和 `/etc/pam.d/system-auth` 中 `password sufficient pam_unix.so` 这行的末尾配置 `remember` 参数为 `5-24` 之间，原来的内容不用更改, 只在末尾加了 `remember=5`。

2. 检查密码长度和密码是否使用多种字符类型

  编辑 `/etc/pam.d/password-auth` 和 `/etc/pam.d/system-auth` 配置文件中包含 `password requisite pam_cracklib.so` 这一行。增加配置 `minlen`（密码最小长度）设置为 9-32 位，`minclass`（至少包含小写字母、大写字母、数字、特殊字符等 4 类字符中等 3 类或 4 类）设置为 3 或 4。如 `password requisite pam_cracklib.so try_first_pass retry=3 minlen=11 minclass=3`

3. 确保 rsyslog 服务已启用，记录日志用于审计

  运行以下命令启用 `rsyslog`：`service rsyslog start`

4. 确保 `ssh LogLevel` 设置为 `INFO`，记录登录和注销活动

  编辑 `/etc/ssh/sshd_config` 文件以按如下方式设置参数(取消注释): `LogLevel INFO`

5. 设置较低的 `Max AuthTrimes` 参数将降低 SSH 服务器被暴力攻击成功的风险。

  在 `/etc/ssh/sshd_config` 中取消 `MaxAuthTries` 注释符号 #，设置最大密码尝试失败次数 `3-6`，建议为 4：`MaxAuthTries 4`

6. 设置 SSH 空闲超时退出时间,可降低未授权用户访问其他用户 ssh 会话的风险

  编辑 `/etc/ssh/sshd_config`，将 `ClientAliveInterval` 设置为 300 到 900，即 5-15 分钟，将 `ClientAliveCountMax` 设置为 0-3。`ClientAliveCountMax 2`

7. 设置密码失效时间，强制定期修改密码，减少密码被泄漏和猜测风险，使用非密码登陆方式(如密钥对)请忽略此项。

  使用非密码登陆方式如密钥对，请忽略此项。在 `/etc/login.defs` 中将 `PASS_MAX_DAYS` 参数设置为 60-180 之间，如 `PASS_MAX_DAYS 90`。需同时执行命令设置 root 密码失效时间： `chage --maxdays 90 root`。

8. 设置密码修改最小间隔时间，限制密码更改过于频繁

  在 `/etc/login.defs` 中将 `PASS_MIN_DAYS` 参数设置为 7-14 之间,建议为 7： PASS_MIN_DAYS 7 需同时执行命令为 root 用户设置： `chage --mindays 7 root`

9. SSHD 强制使用 V2 安全协议

  编辑 `/etc/ssh/sshd_config` 文件以按如下方式设置参数：`Protocol 2`

10. 限制ssh访问服务器的源IP

  编辑 `hosts.allow` 配置文件，追加一行内容 `echo "sshd:192.168.43.226:allow" >> /etc/hosts.allow`，编辑 `hosts.deny` 配置文件，追加一行内容 `echo "sshd:ALL" >> /etc/hosts.deny`

11. 限制ssh访问服务器的用户名

 修改sshd_config配置文件，允许leo用户ssh访问服务器（以空格分开用户；添加完允许，默认拒绝其他所有用户）, `echo "AllowUsers leo" >> /etc/ssh/sshd_config`, 重启sshd服务 `systemctl restart sshd`

12. 修改telnet ssh端口时显示的版本号

  ```bash
  #查看sshd位置
  [root@centos1 ~]# whereis sshd
  sshd: /usr/sbin/sshd /usr/share/man/man8/sshd.8.gz

  #查看SSH版本
  [root@imzcy ~]# ssh -V
  OpenSSH_7.4p1, OpenSSL 1.0.2k-fips  26 Jan 2017

  #查看sshd程序关于版本的信息
  [root@imzcy ~]# strings /usr/sbin/sshd |grep OpenSSH_7.4
  OpenSSH_7.4p1-RHEL7-7.4p1-11
  OpenSSH_7.4
  OpenSSH_7.4p1

  #使用sed替换版本（记得一定要先备份下）
  [root@imzcy ~]# cp -p /usr/sbin/sshd ./
  [root@imzcy ~]# sed -i 's/OpenSSH_7.4/OpenSSH_2.3/g' /usr/sbin/sshd

  #重启下sshd服务，没有报错即可
  [root@imzcy ~]# systemctl restart sshd

  再使用telnet连接ssh端口，显示的版本则为：SSH-2.0-OpenSSH_2.3
  ```
