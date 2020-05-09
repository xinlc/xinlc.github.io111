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

## linux 下改变文件的编码格式

```bash
# 1. 在Vim中直接进行转换文件编码,比如将一个文件转换成utf-8格式
:set fileencoding=utf-8

# 2. enconv 转换文件编码，比如要将一个GBK编码的文件转换成UTF-8编码，操作如下
enconv -L zh_CN -x UTF-8 filename

# 3. iconv 转换，iconv的命令格式如下：
iconv -f encoding -t encoding inputfile
# 比如将一个 GBK 编码的文件转换成 UTF-8 编码
iconv -f GBK -t UTF-8 file1 -o file2

# 查看文件编码file命令
file ip.txt
# ip.txt: UTF-8 Unicode text, with escape sequences
```

### iconv 命令详解

对于给定文件把它的内容从一种编码转换成另一种编码

```bash
# 使用参数
# -f encoding :把字符从encoding编码开始转换
# -t encoding :把字符转换到encoding编码
# -l :列出已知的编码字符集合
# -o file :指定输出文件
# -c :忽略输出的非法字符
# -s :禁止警告信息，但不是错误信息
# --verbose :显示进度信息
# -f和-t所能指定的合法字符在-l选项的命令里面都列出来了

# 将文件file1转码,转后文件输出到fil2中：
# 没-o那么会输出到标准输出.
iconv -f EUC-JP-MS -t UTF-8 file1 -o file2


# 实际需求，从hive中取出的数据是utf8的，要load到mysql中，gbk编码。所以在load之前要先对文件进行转码。
mysql_cmd = "iconv -c -f utf-8 -t gbk ./data/al_ver_" + yesterday_time + ".xls -o ./data/GBK_al_ver_" + yesterday_time + ".xls "
print(mysql_cmd)
os.system(mysql_cmd)
 
mysql_cmd = "mysql -h60.28.200.78 -uroot -pyeelion -A LogStat_RT  -e \"load data local  infile \'./data/GBK_al_ver_" + yesterday_time + ".xls ' into table HiveData_508\""
print(mysql_cmd)
os.system(mysql_cmd)
```

## 传文件

```bash
# 上传文件
scp ./aa.txt root@remoteIP:/data/

# 下载文件
scp root@remoteIP:/data/aa.txt .
```

## curl

```bash
# get 请求
curl --location --request GET 'http://localhost:8080/v1/user/info?searchKey=11' \
--header 'Content-Type: application/json' \
--header 'x-authorization: cetRcUGyuqs9GGjPLo5Q795GyicSkIcLFV51F9sQRs06qiFOw' \
--data-raw ''

# post 请求
curl --location --request POST 'http://localhost:8080/v1/userAuth/login' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer 323423' \
--header 'Content-Type: text/plain' \
--data-raw '{
  "userName": "leo",
  "password": "123456"
}'

# 请求 websocket
curl --include \
     --no-buffer \
     --header "Connection: Upgrade" \
     --header "Upgrade: websocket" \
     --header "Host: example.com:80" \
     --header "Origin: http://example.com:80" \
     --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     --header "Sec-WebSocket-Version: 13" \
     http://example.com:80/
```
