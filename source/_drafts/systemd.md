# 配置一个自定义脚本服务

```bash

#!/bin/bash
#chkconfig: 2345 38 46

. /etc/init.d/functions
if [ $# -ne 1 ]
then
 echo "usage: $0 {start|stop|status}"
 exit 1
fi
case "$1" in
start)
 if [ -e "/var/run/inotify.pid" ]
 then
    action "inotify service start fail" /bin/false
    echo "sync server is running......"
    sleep 1
    exit 1
 fi
 /bin/bash /server/scripts/inotify.sh &
 `ps -ef|grep "inotifywait"|grep -v "grep"|awk '{print $2}'` >/var/run/inotify.pid
 if [ `ps -ef|grep inotify|wc -l` -gt 2 ]
 then
    action "inotify service is started" /bin/true
 else
    action "inotify service is started" /bin/false
 fi
 ;;
stop)
 if [ `ps -ef|grep inotify|grep -v grep|wc -l` -a -e "/var/run/inotify.pid" ]
 then
    rm -f /var/run/inotify.pid >/dev/null 2>&1
    pkill inotifywait
 else
    action "inotify service stop fail" /bin/false
    echo "sync server is not running"
    sleep 1
    exit 1
 fi
 sleep 1
 if [ `ps -ef|grep inotify|grep -v grep|wc -l` -eq 0 -a ! -e "/var/run/inotify.pid" ]
 then
    action "inotify service is stoped" /bin/true
 else
    action "inotify service is stoped" /bin/false
 fi
 ;;
status)
 if [ `ps -ef|grep inotify|wc -l` -gt 2 ]
 then
    action "inotify service is running"
 else
    action "inotify service is stoped"
 fi
 ;;
*)
 echo "usage: $0 {start|stop|status}"
 exit 1
esac

```

添加注册脚本服务文件(vim /usr/lib/systemd/system/syncd.service)，文件内容如下

```bash
[Unit]
Description="这是rsync+inotify实时同步服务"
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
ExecStart=/bin/sh /server/scripts/sync.sh start
ExecReload=/bin/sh /server/scripts/sync.sh restart
ExecStop=/bin/sh /server/scripts/sync.sh stop
KillSignal=SIGQUIT
TimeoutStopSec=5
KillMode=process
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
systemctl start syncd
```

## 参考

- [Systemd 入门教程：命令篇](http://www.ruanyifeng.com/blog/2016/03/systemd-tutorial-commands.html)
- [CentOS7 添加自定义脚本服务](https://www.cnblogs.com/wutao666/p/9781567.html)
