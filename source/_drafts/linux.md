# linux

## 其他

```bash
有关Linux忘记root密码的解决方法

1. 重启系统，出现系统选择界面时按下向下方向键，防止系统直接启动。
2. 把光标移到第一行，按「e」键编辑启动项。
3. 把光标定到linux16这行，找到 ro ，改为 rw init=/sysroot/bin/bash。
4. 按ctrl+x进入emergency模式。
5. 执行chroot /sysroot/ 切换到原始系统。
6. 输入passwd命令修改密码。
7. 执行touch /.autorelabel 让新密码生效。
8. ctrl+d，然后reboot。
```

## 获取进程号

```bash
# Shell最后运行的后台PID(后台运行的最后一个进程的进程ID号)
# ./xxx.sh &
# nohup ./xxx.sh &
echo $!

# Shell本身的PID（即脚本运行的当前进程ID号
echo $$
```
