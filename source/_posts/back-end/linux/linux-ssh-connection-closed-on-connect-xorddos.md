---
title: 恶意程序导致 SSH 登录 CentOS7 成功后闪断
date: 2019-11-08 21:00:00
categories: Linux
tags:
  - linux
  - error
---

记录一次，排查 SSH 登录 CentOS7 闪断情况，很是奇葩！局域网服务器竟然中毒了！！！

<!--more-->

## 问题

登录成功后马上退出。

```log
$ ssh root@192.168.2.201
root@192.168.2.201's password:
Last login: Fri Nov  8 23:28:09 2019 from 192.168.2.2
Connection to 192.168.2.201 closed.
```

详细 log

```log
$ ssh -v root@192.168.2.201
OpenSSH_7.9p1, LibreSSL 2.7.3
debug1: Reading configuration data /Users/leo/.ssh/config
debug1: /Users/leo/.ssh/config line 5: Applying options for 192.168.2.201
debug1: Reading configuration data /etc/ssh/ssh_config
debug1: /etc/ssh/ssh_config line 48: Applying options for *
debug1: Connecting to 192.168.2.201 [192.168.2.201] port 22.
debug1: Connection established.
debug1: identity file /Users/leo/.ssh/lan_201 type 0
debug1: identity file /Users/leo/.ssh/lan_201-cert type -1
debug1: Local version string SSH-2.0-OpenSSH_7.9
debug1: Remote protocol version 2.0, remote software version OpenSSH_7.4
debug1: match: OpenSSH_7.4 pat OpenSSH_7.0*,OpenSSH_7.1*,OpenSSH_7.2*,OpenSSH_7.3*,OpenSSH_7.4*,OpenSSH_7.5*,OpenSSH_7.6*,OpenSSH_7.7* compat 0x04000002
debug1: Authenticating to 192.168.2.201:22 as 'root'
debug1: SSH2_MSG_KEXINIT sent
debug1: SSH2_MSG_KEXINIT received
debug1: kex: algorithm: curve25519-sha256
debug1: kex: host key algorithm: ecdsa-sha2-nistp256
debug1: kex: server->client cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: kex: client->server cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: expecting SSH2_MSG_KEX_ECDH_REPLY
debug1: Server host key: ecdsa-sha2-nistp256 SHA256:B65HccHM+Jn/biQHtyepoOO0z+IT6UkumhfWOZOKVfc
debug1: Host '192.168.2.201' is known and matches the ECDSA host key.
debug1: Found key in /Users/leo/.ssh/known_hosts:15
debug1: rekey after 134217728 blocks
debug1: SSH2_MSG_NEWKEYS sent
debug1: expecting SSH2_MSG_NEWKEYS
debug1: SSH2_MSG_NEWKEYS received
debug1: rekey after 134217728 blocks
debug1: Will attempt key: /Users/leo/.ssh/lan_201 RSA SHA256:1mROBcyDSdkam0yuvqonpViVkJjR/O+f0Ge1cWIJNgk explicit
debug1: SSH2_MSG_EXT_INFO received
debug1: kex_input_ext_info: server-sig-algs=<rsa-sha2-256,rsa-sha2-512>
debug1: SSH2_MSG_SERVICE_ACCEPT received
debug1: Authentications that can continue: publickey,gssapi-keyex,gssapi-with-mic,password
debug1: Next authentication method: publickey
debug1: Offering public key: /Users/leo/.ssh/lan_201 RSA SHA256:1mROBcyDSdkam0yuvqonpViVkJjR/O+f0Ge1cWIJNgk explicit
debug1: Authentications that can continue: publickey,gssapi-keyex,gssapi-with-mic,password
debug1: Next authentication method: password
root@192.168.2.201's password:
debug1: Authentication succeeded (password).
Authenticated to 192.168.2.201 ([192.168.2.201]:22).
debug1: channel 0: new [client-session]
debug1: Requesting no-more-sessions@openssh.com
debug1: Entering interactive session.
debug1: pledge: network
debug1: client_input_global_request: rtype hostkeys-00@openssh.com want_reply 0
debug1: Sending environment.
debug1: Sending env LC_TERMINAL_VERSION = 3.3.6
debug1: Sending env LANG = zh_CN.UTF-8
debug1: Sending env LC_TERMINAL = iTerm2
Last login: Fri Nov  8 23:25:30 2019 from 192.168.2.2
debug1: client_input_channel_req: channel 0 rtype exit-status reply 0
debug1: client_input_channel_req: channel 0 rtype eow@openssh.com reply 0
debug1: channel 0: free: client-session, nchannels 1
Connection to 192.168.2.201 closed.
Transferred: sent 2676, received 2564 bytes, in 0.3 seconds
Bytes per second: sent 8132.9, received 7792.5
debug1: Exit status 0
```

再详细一点

```log
$ ssh -vvv root@192.168.2.201
OpenSSH_7.9p1, LibreSSL 2.7.3
debug1: Reading configuration data /Users/leo/.ssh/config
debug1: /Users/leo/.ssh/config line 5: Applying options for 192.168.2.201
debug1: Reading configuration data /etc/ssh/ssh_config
debug1: /etc/ssh/ssh_config line 48: Applying options for *
debug2: resolve_canonicalize: hostname 192.168.2.201 is address
debug2: ssh_connect_direct
debug1: Connecting to 192.168.2.201 [192.168.2.201] port 22.
debug1: Connection established.
debug1: identity file /Users/leo/.ssh/lan_201 type 0
debug1: identity file /Users/leo/.ssh/lan_201-cert type -1
debug1: Local version string SSH-2.0-OpenSSH_7.9
debug1: Remote protocol version 2.0, remote software version OpenSSH_7.4
debug1: match: OpenSSH_7.4 pat OpenSSH_7.0*,OpenSSH_7.1*,OpenSSH_7.2*,OpenSSH_7.3*,OpenSSH_7.4*,OpenSSH_7.5*,OpenSSH_7.6*,OpenSSH_7.7* compat 0x04000002
debug2: fd 3 setting O_NONBLOCK
debug1: Authenticating to 192.168.2.201:22 as 'root'
debug3: hostkeys_foreach: reading file "/Users/leo/.ssh/known_hosts"
debug3: record_hostkey: found key type ECDSA in file /Users/leo/.ssh/known_hosts:15
debug3: load_hostkeys: loaded 1 keys from 192.168.2.201
debug3: order_hostkeyalgs: prefer hostkeyalgs: ecdsa-sha2-nistp256-cert-v01@openssh.com,ecdsa-sha2-nistp384-cert-v01@openssh.com,ecdsa-sha2-nistp521-cert-v01@openssh.com,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521
debug3: send packet: type 20
debug1: SSH2_MSG_KEXINIT sent
debug3: receive packet: type 20
debug1: SSH2_MSG_KEXINIT received
debug2: local client KEXINIT proposal
debug2: KEX algorithms: curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,ext-info-c
debug2: host key algorithms: ecdsa-sha2-nistp256-cert-v01@openssh.com,ecdsa-sha2-nistp384-cert-v01@openssh.com,ecdsa-sha2-nistp521-cert-v01@openssh.com,ecdsa-sha2-nistp256,ecdsa-sha2-nistp384,ecdsa-sha2-nistp521,ssh-ed25519-cert-v01@openssh.com,rsa-sha2-512-cert-v01@openssh.com,rsa-sha2-256-cert-v01@openssh.com,ssh-rsa-cert-v01@openssh.com,ssh-ed25519,rsa-sha2-512,rsa-sha2-256,ssh-rsa
debug2: ciphers ctos: chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com
debug2: ciphers stoc: chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com
debug2: MACs ctos: umac-64-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha1-etm@openssh.com,umac-64@openssh.com,umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512,hmac-sha1
debug2: MACs stoc: umac-64-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha1-etm@openssh.com,umac-64@openssh.com,umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512,hmac-sha1
debug2: compression ctos: none,zlib@openssh.com,zlib
debug2: compression stoc: none,zlib@openssh.com,zlib
debug2: languages ctos:
debug2: languages stoc:
debug2: first_kex_follows 0
debug2: reserved 0
debug2: peer server KEXINIT proposal
debug2: KEX algorithms: curve25519-sha256,curve25519-sha256@libssh.org,ecdh-sha2-nistp256,ecdh-sha2-nistp384,ecdh-sha2-nistp521,diffie-hellman-group-exchange-sha256,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512,diffie-hellman-group-exchange-sha1,diffie-hellman-group14-sha256,diffie-hellman-group14-sha1,diffie-hellman-group1-sha1
debug2: host key algorithms: ssh-rsa,rsa-sha2-512,rsa-sha2-256,ecdsa-sha2-nistp256,ssh-ed25519
debug2: ciphers ctos: chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com,aes128-cbc,aes192-cbc,aes256-cbc,blowfish-cbc,cast128-cbc,3des-cbc
debug2: ciphers stoc: chacha20-poly1305@openssh.com,aes128-ctr,aes192-ctr,aes256-ctr,aes128-gcm@openssh.com,aes256-gcm@openssh.com,aes128-cbc,aes192-cbc,aes256-cbc,blowfish-cbc,cast128-cbc,3des-cbc
debug2: MACs ctos: umac-64-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha1-etm@openssh.com,umac-64@openssh.com,umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512,hmac-sha1
debug2: MACs stoc: umac-64-etm@openssh.com,umac-128-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha1-etm@openssh.com,umac-64@openssh.com,umac-128@openssh.com,hmac-sha2-256,hmac-sha2-512,hmac-sha1
debug2: compression ctos: none,zlib@openssh.com
debug2: compression stoc: none,zlib@openssh.com
debug2: languages ctos:
debug2: languages stoc:
debug2: first_kex_follows 0
debug2: reserved 0
debug1: kex: algorithm: curve25519-sha256
debug1: kex: host key algorithm: ecdsa-sha2-nistp256
debug1: kex: server->client cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug1: kex: client->server cipher: chacha20-poly1305@openssh.com MAC: <implicit> compression: none
debug3: send packet: type 30
debug1: expecting SSH2_MSG_KEX_ECDH_REPLY
debug3: receive packet: type 31
debug1: Server host key: ecdsa-sha2-nistp256 SHA256:B65HccHM+Jn/biQHtyepoOO0z+IT6UkumhfWOZOKVfc
debug3: hostkeys_foreach: reading file "/Users/leo/.ssh/known_hosts"
debug3: record_hostkey: found key type ECDSA in file /Users/leo/.ssh/known_hosts:15
debug3: load_hostkeys: loaded 1 keys from 192.168.2.201
debug1: Host '192.168.2.201' is known and matches the ECDSA host key.
debug1: Found key in /Users/leo/.ssh/known_hosts:15
debug3: send packet: type 21
debug2: set_newkeys: mode 1
debug1: rekey after 134217728 blocks
debug1: SSH2_MSG_NEWKEYS sent
debug1: expecting SSH2_MSG_NEWKEYS
debug3: receive packet: type 21
debug1: SSH2_MSG_NEWKEYS received
debug2: set_newkeys: mode 0
debug1: rekey after 134217728 blocks
debug1: Will attempt key: /Users/leo/.ssh/lan_201 RSA SHA256:1mROBcyDSdkam0yuvqonpViVkJjR/O+f0Ge1cWIJNgk explicit
debug2: pubkey_prepare: done
debug3: send packet: type 5
debug3: receive packet: type 7
debug1: SSH2_MSG_EXT_INFO received
debug1: kex_input_ext_info: server-sig-algs=<rsa-sha2-256,rsa-sha2-512>
debug3: receive packet: type 6
debug2: service_accept: ssh-userauth
debug1: SSH2_MSG_SERVICE_ACCEPT received
debug3: send packet: type 50
debug3: receive packet: type 51
debug1: Authentications that can continue: publickey,gssapi-keyex,gssapi-with-mic,password
debug3: start over, passed a different list publickey,gssapi-keyex,gssapi-with-mic,password
debug3: preferred publickey,keyboard-interactive,password
debug3: authmethod_lookup publickey
debug3: remaining preferred: keyboard-interactive,password
debug3: authmethod_is_enabled publickey
debug1: Next authentication method: publickey
debug1: Offering public key: /Users/leo/.ssh/lan_201 RSA SHA256:1mROBcyDSdkam0yuvqonpViVkJjR/O+f0Ge1cWIJNgk explicit
debug3: send packet: type 50
debug2: we sent a publickey packet, wait for reply
debug3: receive packet: type 51
debug1: Authentications that can continue: publickey,gssapi-keyex,gssapi-with-mic,password
debug2: we did not send a packet, disable method
debug3: authmethod_lookup password
debug3: remaining preferred: ,password
debug3: authmethod_is_enabled password
debug1: Next authentication method: password
root@192.168.2.201's password:
debug3: send packet: type 50
debug2: we sent a password packet, wait for reply
debug3: receive packet: type 52
debug1: Authentication succeeded (password).
Authenticated to 192.168.2.201 ([192.168.2.201]:22).
debug1: channel 0: new [client-session]
debug3: ssh_session2_open: channel_new: 0
debug2: channel 0: send open
debug3: send packet: type 90
debug1: Requesting no-more-sessions@openssh.com
debug3: send packet: type 80
debug1: Entering interactive session.
debug1: pledge: network
debug3: receive packet: type 80
debug1: client_input_global_request: rtype hostkeys-00@openssh.com want_reply 0
debug3: receive packet: type 91
debug2: channel_input_open_confirmation: channel 0: callback start
debug2: fd 3 setting TCP_NODELAY
debug3: ssh_packet_set_tos: set IP_TOS 0x48
debug2: client_session2_setup: id 0
debug2: channel 0: request pty-req confirm 1
debug3: send packet: type 98
debug1: Sending environment.
debug3: Ignored env TERM_SESSION_ID
debug3: Ignored env SSH_AUTH_SOCK
debug1: Sending env LC_TERMINAL_VERSION = 3.3.6
debug2: channel 0: request env confirm 0
debug3: send packet: type 98
debug3: Ignored env Apple_PubSub_Socket_Render
debug3: Ignored env COLORFGBG
debug3: Ignored env ITERM_PROFILE
debug3: Ignored env XPC_FLAGS
debug1: Sending env LANG = zh_CN.UTF-8
debug2: channel 0: request env confirm 0
debug3: send packet: type 98
debug3: Ignored env PWD
debug3: Ignored env SHELL
debug3: Ignored env SECURITYSESSIONID
debug3: Ignored env TERM_PROGRAM_VERSION
debug3: Ignored env TERM_PROGRAM
debug3: Ignored env PATH
debug1: Sending env LC_TERMINAL = iTerm2
debug2: channel 0: request env confirm 0
debug3: send packet: type 98
debug3: Ignored env COLORTERM
debug3: Ignored env COMMAND_MODE
debug3: Ignored env TERM
debug3: Ignored env HOME
debug3: Ignored env TMPDIR
debug3: Ignored env USER
debug3: Ignored env XPC_SERVICE_NAME
debug3: Ignored env LOGNAME
debug3: Ignored env __CF_USER_TEXT_ENCODING
debug3: Ignored env ITERM_SESSION_ID
debug3: Ignored env SHLVL
debug3: Ignored env OLDPWD
debug3: Ignored env ZSH
debug3: Ignored env PAGER
debug3: Ignored env LESS
debug3: Ignored env LSCOLORS
debug3: Ignored env NVM_DIR
debug3: Ignored env NVM_CD_FLAGS
debug3: Ignored env NVM_BIN
debug3: Ignored env AUTOJUMP_SOURCED
debug3: Ignored env AUTOJUMP_ERROR_PATH
debug3: Ignored env ANDROID_HOME
debug3: Ignored env PUB_HOSTED_URL
debug3: Ignored env FLUTTER_STORAGE_BASE_URL
debug3: Ignored env FLUTTER_HOME
debug3: Ignored env _
debug2: channel 0: request shell confirm 1
debug3: send packet: type 98
debug2: channel_input_open_confirmation: channel 0: callback done
debug2: channel 0: open confirm rwindow 0 rmax 32768
debug3: receive packet: type 99
debug2: channel_input_status_confirm: type 99 id 0
debug2: PTY allocation request accepted on channel 0
debug2: channel 0: rcvd adjust 2097152
debug3: receive packet: type 99
debug2: channel_input_status_confirm: type 99 id 0
debug2: shell request accepted on channel 0
Last login: Fri Nov  8 23:26:15 2019 from 192.168.2.2
debug3: receive packet: type 98
debug1: client_input_channel_req: channel 0 rtype exit-status reply 0
debug3: receive packet: type 98
debug1: client_input_channel_req: channel 0 rtype eow@openssh.com reply 0
debug2: channel 0: rcvd eow
debug2: channel 0: chan_shutdown_read (i0 o0 sock -1 wfd 4 efd 6 [write])
debug2: channel 0: input open -> closed
debug3: receive packet: type 96
debug2: channel 0: rcvd eof
debug2: channel 0: output open -> drain
debug2: channel 0: obuf empty
debug2: channel 0: chan_shutdown_write (i3 o1 sock -1 wfd 5 efd 6 [write])
debug2: channel 0: output drain -> closed
debug3: receive packet: type 97
debug2: channel 0: rcvd close
debug3: channel 0: will not send data after close
debug2: channel 0: almost dead
debug2: channel 0: gc: notify user
debug2: channel 0: gc: user detached
debug2: channel 0: send close
debug3: send packet: type 97
debug2: channel 0: is dead
debug2: channel 0: garbage collecting
debug1: channel 0: free: client-session, nchannels 1
debug3: channel 0: status: The following connections are open:
  #0 client-session (t4 r0 i3/0 o3/0 e[write]/0 fd -1/-1/6 sock -1 cc -1)

debug3: send packet: type 1
debug3: fd 1 is not O_NONBLOCK
Connection to 192.168.2.201 closed.
Transferred: sent 2676, received 2564 bytes, in 0.3 seconds
Bytes per second: sent 8108.9, received 7769.5
debug1: Exit status 0
```

并没有看出什么门道来，尝试用另一个普通用户登录是好用的 emmmmm……

网上查询的结果大部分都是 把 `/etc/ssh/sshd_config` 中 `UsePAM yes` 改为 `UsePAM no`, 然后重启 sshd 服务 `systemctl restart sshd` （不好用！）

由于是普通用户没有权限修改 `sshd_config`，先进入单用户模式给普通用户超级用户权限。

## CentOS7 进入单用户模式

我这里是在 `VMware ESXi` 中安装的虚拟机。

### 单用户模式并获取 root 权限修改系统文件

1. 重启系统

看到这个界面按 `e`

![1][1]

往下翻，找到出现 `ro` 的一行将 `ro` 替换成 `rw init=/sysroot/bin/sh` 或在行尾添加 `rw init=/sysroot/bin/sh` 后按 `Ctrl + x` 执行，进入单用户模式

![2][2]

执行 `chroot /sysroot` 获取 `root` 权限

![3][3]

修改 `vim /etc/sudoers` 文件提升普通用户权限，`wq!` 保存退出。

```bash
# 说明：格式为（用户名    网络中的主机=（执行命令的目标用户）    执行的命令范围）
admin    ALL=(ALL)       ALL
```

重启系统用 `admin` 用户登录，修改 `sudo vim /etc/ssh/sshd_config` 文件，前面说过了并不好用。

### 普通单用户模式修改密码

1. 重启系统

看到这个界面按 `e`

![1][1]

往下翻，在行尾添加 `init=/bin/sh` 后按 `Ctrl + x` 执行，进入单用户模式

![4][4]

默认修改 `root` 密码，也可以修改其他用户的密码, 执行 `exec /sbin/init` 即可退出单用户模式

## 查看系统 log

```bash
sudo tail -100f /var/log/messages
```

![5][5]

```bash
sudo tail -100f /var/log/secure
```

![6][6]

log 也只显示登录成功就关闭，不解不解……

## 老问题还没解决，又出新问题

多次登录尝试出现不能连接服务器，被服务器加入黑名单了。

```log
$ ssh root@192.168.2.201
ssh_exchange_identification: read: Connection reset by peer
```

ip 被封了只能从 `VMware ESXi` 中使用 admin 进入服务器。

```bash
# 删除 hosts.deny 中的 `sshd:ip`

sudo vim /etc/hosts.deny
```

## 解决root登录

多次 Google 发现 [ssh connection closed on connect](https://stackoverflow.com/questions/40867440/ssh-connection-closed-on-connect)

> Verify that the user (e.g. login) you are using has permissions to access ssh over the server.
> Its also possible that there is an exit 0 in your .bash_profile. This will cause the session to close immediately after logging in. You can try this command to remove the it: ssh david@0.0.0.1 sed -i '/exit\ 0/d' .bashrc .bash_profile .profile .login

尝试看下 `root` 用户下的 `.bashrc`

```log
[admin@centos01 ~]$ sudo cat /root/.bashrc
exit
```

。。。。。。

删除 `exit`，还原 `.bashrc`

```bashrc
alias rm='rm -i'
alias cp='cp -i'
alias mv='mv -i'

# Source global definitions
if [ -f /etc/bashrc ]; then
  . /etc/bashrc
fi
```

## 中毒

用 root 登录后……

![7][7]

```log
[root@centos01 ~]# cat /etc/rc.local
#!/bin/bash
# THIS FILE IS ADDED FOR COMPATIBILITY PURPOSES
#
# It is highly advisable to create own systemd services or udev rules
# to run scripts during boot instead of using this file.
#
# In contrast to previous versions due to parallel execution during boot
# this script will NOT be run after all other services.
#
# Please note that you must run 'chmod +x /etc/rc.d/rc.local' to ensure
# that this script will be executed during boot.

touch /var/lock/subsys/local
"/root/pty"
```

```log
[root@centos01 ~]# cat /etc/crontab
*/3 * * * * root /etc/cron.hourly/gcc4.sh
```

```log
[root@centos01 ~]# cat /etc/cron.hourly/gcc4.sh
#!/bin/sh
PATH=/bin:/sbin:/usr/bin:/usr/sbin:/usr/local/bin:/usr/local/sbin:/usr/X11R6/bin
cp /lib/libudev4.so /lib/libudev4.so.6
/lib/libudev4.so.6
```

卧槽！局域网服务器竟然中毒了…… 貌似是 XordDos 木马

再看 `/var/log/messages` 发现每分钟都在执行这个 pty （SSH 爆破程序）

![8][8]

查看定时任务 log，分析了下大概什么时候执行的

```bash
more /var/log/cron log
```

测试服务器，不杀毒了，重做系统。

## 参考

- [ssh connection closed on connect](https://stackoverflow.com/questions/40867440/ssh-connection-closed-on-connect)
- [ssh connection closed right after login exit status 1](https://askubuntu.com/questions/715219/ssh-connection-closed-right-after-login-exit-status-1)
- [Linux下XordDos木马的清除](https://www.cnblogs.com/tssc/p/9265528.html)

[1]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/1.jpg
[2]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/2.jpg
[3]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/3.jpg
[4]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/4.jpg
[5]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/5.jpg
[6]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/6.jpg
[7]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/7.jpg
[8]: /images/linux/linux-ssh-connection-closed-on-connect-xorddos/8.jpg
