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

参考阮一峰老师 curl 的用法指南：http://www.ruanyifeng.com/blog/2019/09/curl-reference.html

curl 是常用的命令行工具，用来请求 Web 服务器。它的名字就是客户端（client）的 URL 工具的意思。它的功能非常强大，命令行参数多达几十种。如果熟练的话，完全可以取代 Postman 这一类的图形界面工具。

```bash

# -A参数指定客户端的用户代理标头，即User-Agent。curl 的默认用户代理字符串是curl/[version]。
# 将User-Agent改成 Chrome 浏览器。
curl -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36' https://google.com

# -b参数用来向服务器发送 Cookie。
# 生成一个标头Cookie: foo=bar，向服务器发送一个名为foo、值为bar的 Cookie。
curl -b 'foo=bar' https://google.com

# 发送两个 Cookie。
curl -b 'foo1=bar;foo2=bar2' https://google.com

# 读取本地文件cookies.txt，里面是服务器设置的 Cookie（参见-c参数），将其发送到服务器。
curl -b cookies.txt https://www.google.com

# -c参数将服务器设置的 Cookie 写入一个文件。
# 将服务器的 HTTP 回应所设置 Cookie 写入文本文件cookies.txt。
curl -c cookies.txt https://www.google.com

# -d参数用于发送 POST 请求的数据体。
curl -d'login=emma＆password=123'-X POST https://google.com/login
# 或者
curl -d 'login=emma' -d 'password=123' -X POST  https://google.com/login

# 使用-d参数以后，HTTP 请求会自动加上标头Content-Type : application/x-www-form-urlencoded。并且会自动将请求转为 POST 方法，因此可以省略-X POST。
# -d参数可以读取本地文本文件的数据，向服务器发送。读取data.txt文件的内容，作为数据体向服务器发送。
curl -d '@data.txt' https://google.com/login

# --data-urlencode参数等同于-d，发送 POST 请求的数据体，区别在于会自动将发送的数据进行 URL 编码。
# 发送的数据hello world之间有一个空格，需要进行 URL 编码。
curl --data-urlencode 'comment=hello world' https://google.com/login

# -e参数用来设置 HTTP 的标头Referer，表示请求的来源。
# 将Referer标头设为https://google.com?q=example。
curl -e 'https://google.com?q=example' https://www.example.com

# -H参数可以通过直接添加标头Referer，达到同样效果。
curl -H 'Referer: https://google.com?q=example' https://www.example.com

# -F参数用来向服务器上传二进制文件。给 HTTP 请求加上标头Content-Type: multipart/form-data，然后将文件photo.png作为file字段上传。
curl -F 'file=@photo.png' https://google.com/profile

# -F参数可以指定 MIME 类型。指定 MIME 类型为image/png，否则 curl 会把 MIME 类型设为application/octet-stream。
curl -F 'file=@photo.png;type=image/png' https://google.com/profile

# -F参数也可以指定文件名。原始文件名为photo.png，但是服务器接收到的文件名为me.png。
curl -F 'file=@photo.png;filename=me.png' https://google.com/profile

# -G参数用来构造 URL 的查询字符串。发出一个 GET 请求，实际请求的 URL 为https://google.com/search?q=kitties&count=20。如果省略--G，会发出一个 POST 请求。
curl -G -d 'q=kitties' -d 'count=20' https://google.com/search

# 如果数据需要 URL 编码，可以结合--data--urlencode参数。
curl -G --data-urlencode 'comment=hello world' https://www.example.com

# -H参数添加 HTTP 请求的标头。
curl -H 'Accept-Language: en-US' https://google.com

# 添加两个 HTTP 标头。
curl -H 'Accept-Language: en-US' -H 'Secret-Message: xyzzy' https://google.com

# 添加 HTTP 请求的标头是Content-Type: application/json，然后用-d参数发送 JSON 数据。
curl -d '{"login": "emma", "pass": "123"}' -H 'Content-Type: application/json' https://google.com/login

# -i参数打印出服务器回应的 HTTP 标头。收到服务器回应后，先输出服务器回应的标头，然后空一行，再输出网页的源码。
curl -i https://www.example.com

# -I参数向服务器发出 HEAD 请求，然会将服务器返回的 HTTP 标头打印出来。
# 输出服务器对 HEAD 请求的回应。--head参数等同于-I。
curl -I https://www.example.com

# -k参数指定跳过 SSL 检测。
curl -k https://www.example.com

# -L参数会让 HTTP 请求跟随服务器的重定向。curl 默认不跟随重定向。
curl -L -d 'tweet=hi' https://api.twitter.com/tweet

# --limit-rate用来限制 HTTP 请求和回应的带宽，模拟慢网速的环境。将带宽限制在每秒 200K 字节。
curl --limit-rate 200k https://google.com

# -o参数将服务器的回应保存成文件，等同于wget命令。将www.example.com保存成example.html。
curl -o example.html https://www.example.com

# -O参数将服务器回应保存成文件，并将 URL 的最后部分当作文件名。将服务器回应保存成文件，文件名为bar.html。
curl -O https://www.example.com/foo/bar.html

# -s参数将不输出错误和进度信息。一旦发生错误，不会显示错误信息。不发生错误的话，会正常显示运行结果。
curl -s https://www.example.com

# 如果想让 curl 不产生任何输出，可以使用下面的命令。
curl -s -o /dev/null https://google.com

# -S参数指定只输出错误信息，通常与-s一起使用。命令没有任何输出，除非发生错误。
curl -s -o /dev/null https://google.com

# -u参数用来设置服务器认证的用户名和密码。只设置了用户名，执行后，curl 会提示用户输入密码。
curl -u 'bob:12345' https://google.com/login

# curl 能够识别 URL 里面的用户名和密码。识别 URL 里面的用户名和密码，将其转为上个例子里面的 HTTP 标头。
curl https://bob:12345@google.com/login

# 只设置了用户名，执行后，curl 会提示用户输入密码。
curl -u 'bob' https://google.com/login

# -v参数输出通信的整个过程，用于调试。
curl -v https://www.example.com

# --trace参数也可以用于调试，还会输出原始的二进制数据。
curl --trace - https://www.example.com

# -x参数指定 HTTP 请求的代理。指定 HTTP 请求通过myproxy.com:8080的 socks5 代理发出。
curl -x socks5://james:cats@myproxy.com:8080 https://www.example.com

# 如果没有指定代理协议，默认为 HTTP。请求的代理使用 HTTP 协议。
curl -x james:cats@myproxy.com:8080 https://www.example.com

# -X参数指定 HTTP 请求的方法。 对https://www.example.com发出 POST 请求。
curl -X POST https://www.example.com

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

## shell 数组(含"map")操作

字符 | 含义 | 举例
---|---|---
| # | 个数相关 | $#：shell的参数个数, `${#̲array[@]}/{#array[*]}`: 数组个数 |
| @、* | 所有元素 | $@ $: shell的所有参数列表 array[@]/{array[@]}/array[@]/array[]: 数组的所有元素 |

数组操作命令 | 含义
---|---
```${#array[@]}``` | 取数组元素的个数    <!-- 在内容里#不要与{紧挨着:{#内容}, hexo会报Error: expected end of comment, got end of file -->
```${#array[*]}``` | 取数组元素的个数
`${array[*]}` | 取所有数组的元素
`${array[@]}` | 取所有数组的元素
`${!array[@]}` | 取数组下标的值
`${array[@]:n:m}` | 从数组n位置开始取m个元素
`array_new=(${array1[@]} ${array2[@]})` | 数组合并:将array1和array2合并然后赋值给array_new
`array=($(echo ${ayyary[@]} | sed ‘s/ /\n/g’ |sort )) | uniq` | 对数组进行去重排序，详细解释
`if echo “${array[@]}” | grep -w “item_1” &>/dev/null; then echo "Found" fi`| 判断item_1是否在array中

示例：

```bash
#!/bin/bash
array1=(6 5 4 3)
array2=(3 2 1)
# 合并数组
array3=(${array1[@]} ${array2[@]})
# 排序去重
array4=($(echo ${array3[@]} | sed 's/ /\n/g'| sort | uniq))

echo "array1 size: "${#array1[@]}
echo "array2 size: "${#array2[@]}
echo "array1 all element is: "${array1[*]}
echo "array2 all element is: "${array2[@]}
echo "array1 all index is: "${!array1[*]}
echo "array2 all index is: "${!array2[*]}
echo "array1 2-4 element is: "${array1[@]:2:4}
echo "array1 && array2 union is: "${array3[@]}
echo "array && array2 union sort && uniq is: "${array4[@]}
```

运行结果：

```bash
array1 size: 4
array2 size: 3
array1 all element is: 6 5 4 3
array2 all element is: 3 2 1
array1 all index is: 0 1 2 3
array2 all index is: 0 1 2
array1 2-4 element is: 4 3
array1 && array2 union is: 6 5 4 3 3 2 1
array && array2 union sort && uniq is: 1 2 3 4 5 6
```

shell中的关联数组，也就是类似的“MAP”

由于shell的的数组只支持一维数组,并且并没有map这种数据结构也。我们使用关联数组来模拟map的效果。

首先定义关联数组(可以以字符串为下标): delcare -A xxx (注意：bash版本需要 >= 4)

delcare 的使用：

选项 | 含义
---|---
`-a name` | 声明变量为普通数组。
`-A name` | 声明变量为关联数组（支持索引下标为字符串）。
`-f [name]` | 列出之前由用户在脚本中定义的函数名称和函数体。
`-F [name]` | 仅列出自定义函数名称。
`-g name` | 在 Shell 函数内部创建全局变量。
`-p [name]` | 显示指定变量的属性和值。
`-i name` | 将变量定义为整数型。
`-r name[=value]` | 将变量定义为只读（不可修改和删除），等价于 readonly name。
`-x name[=value]` | 将变量设置为环境变量，等价于 export name[=value]。

示例:

```bash
#!/bin/bash
declare -A map

map["key1"]="value1"
map["key2"]="value2"
map["key3"]="value3"

# 遍历map,此map其实就是数组，其相关操作同上面数组的操作
for key in ${!map[@]};do
    echo "key: "${key}" value:"${map[${key}]}
done
```

## 生成随机码

```bash
# 生成16位随机token
head -c 16 /dev/urandom | od -An -t x | tr -d ' '

# 使用SHA算法来加密日期，并输出结果的前10个字符
date +%s | sha256sum | base64 | head -c 10 ;echo

# tr参数
# -c或——complerment：取代所有不属于第一字符集的字符；
# -d或——delete：删除所有属于第一字符集的字符；
# 生成10个小写字母
< /dev/urandom tr -dc a-z|head -c ${1:-10};echo

# 生成10个大写字母
< /dev/urandom tr -dc A-Z|head -c ${1:-10};echo

# 生成10个数字
< /dev/urandom tr -dc 0-9|head -c ${1:-10};echo

# 生成10个数字和大写字母的组合字符串
< /dev/urandom tr -dc 0-9-A-Z|head -c ${1:-10};echo

# 生成10个随机字符（包含数字，大写字母，小写字母）
< /dev/urandom tr -dc 0-9-A-Z-a-z|head -c ${1:-10};echo

# 生成10个随机字符（包含数字，大写字母，小写字母）
< /dev/urandom tr -dc 0-9-A-Z-a-z-|head -c ${1:-10};echo

# 生成10个随机字符（包含数字，大写字母，小写字母，特殊字符）
< /dev/urandom tr -dc 0-9-A-Z-a-z-/|head -c ${1:-10};echo

# 使用openssl的随机函数
openssl rand -base64 10
openssl rand -base64 10|tr A-Z a-z
openssl rand -base64 32|tr A-Z a-z|cut -c 1-10

# 这种方法类似于之前的urandom，但它是反向工作的。
tr -cd '[:alnum:]' </dev/urandom |fold -w32|head -n1         ##-w32表示生成32个字符的宽度字符
tr -cd '[:alnum:]' </dev/urandom |fold -w10|head -n1

# 使用string命令，它从一个文件中输出可打印的字符串
strings /dev/urandom | grep -o '[[:alnum:]]' | head -n 32 | tr -d '\n'; echo

# 这是使用urandom的一个更简单的版本
</dev/urandom tr -dc _A-Z-a-z-0-9|head -c32;echo
</dev/urandom tr -dc a-z-0-9|head -c32;echo
</dev/urandom tr -dc a-z-0-9|head -c10;echo

# 使用非常有用的dd命令
dd if=/dev/urandom bs=1 count=32 2>/dev/null | base64 -w 0 | rev | cut -b 2- | rev
dd if=/dev/urandom bs=1 count=10 2>/dev/null | base64 -w 0 | rev | cut -b 2- | rev

# 你甚至可以生成一个只用左手便可以输入的密码
</dev/urandom tr -dc '12345!@#$%qwertQWERTasdfgASDFGzxcvbZXCVB' | head -c32; echo
</dev/urandom tr -dc '12345!@#$%qwertQWERTasdfgASDFGzxcvbZXCVB' | head -c10; echo
```

## linux环境下nohup的执行jar

```bash

# 命令结尾没有 “&” ，则变成 “java -jar XXX.jar ” ，表示在当前ssh窗口，可按CTRL + C打断程序运行，或者直接关闭窗口，则程序直接退出
# 命令结尾添加 “&” ，则变成 “java -jar XXX.jar &” ，表示在当窗口关闭时，程序才会中止运行。&代表让该命令在后台执行。
java -jar XXX.jar &

# 命令 "nohup java -jar XXX.jar &" 部分，表示不挂断运行命令,当账户退出或终端关闭时,程序仍然运行。注意，该作业的所有输出被重定向到nohup.out的文件中。
# 命令 "nohup java -jar XXX.jar > Log.log &" 部分，表示不挂断运行命令,当账户退出或终端关闭时,程序仍然运行，并且该作业的所有输出被重定向到Log.log的文件中。“ > Log.log ” 该命令就是指定日志输出的文件。
# ">>"表示将输出以追加的方式重定向到Log.log中。
nohup java -jar XXX.jar > Log.log &
# 或者
nohup java -jar XXX.jar >> Log.log &

# 标准输入文件(stdin)：stdin的文件描述符为0，Unix程序默认从stdin读取数据。
# 标准输出文件(stdout)：stdout 的文件描述符为1，Unix程序默认向stdout输出数据。
# 标准错误文件(stderr)：stderr的文件描述符为2，Unix程序会向stderr流中写入错误信息。
# 屏蔽输出，起到禁止输出作用：/dev/null 是一个特殊的文件，写入到它的内容都会被丢弃；如果尝试从该文件读取内容，那么什么也读不到。但是 /dev/null 文件非常有用，将命令的输出重定向到它，会起到"禁止输出"的效果。
# “> Log.log 2>&1” ：表示将 stdout 和 stderr 合并后重定向到 Log.log
nohup java -jar XXX.jar > Log.log 2>&1 &
# 或者
nohup java -jar XXX.jar >> Log.log 2>&1 &
# 或者
nohup java -jar XXX.jar > /dev/null 2>&1 &

# 备注：输出之后，可以使用“jobs”查看一下后台运行的任务。
```

## 测试端口是否可用方式

**CentOS7 防火墙开放端口：**

```bash
# 开放
firewall-cmd --zone=public --add-port=80/tcp --permanent
firewall-cmd --zone=public --add-port=53/udp --permanent
firewall-cmd --reload

# 删除
firewall-cmd --zone=public --remove-port=80/tcp --permanent
firewall-cmd --reload
```

**telnet 方式：**

```bash
telnet ip port

# telnet 10.25.5.13 22 Trying 10.25.5.13... Connected to 10.25.5.13.  //端口通 Escape character is '^]'. 退出使用 quit

# telnet 10.25.5.13 80 Trying 10.25.5.13... telnet:connect to address 10.25.5.13: Connection refused  //端口不通

# UDP 端口测试
# 例如测试告警信息通过syslog发送到某IP端口 nc -vuz 10.25.5.62 514 Connection to 10.25.5.62 514 port [udp/syslog] succeeded! //端口通

ssh -v -p port aliyunzixun@xxx.com
```

**ssh 方式：**

```bash
ssh -v -p port root@ip
# 说明:
# -v 调试模式(会打印日志).
# -p 指定端口
# username:远程主机的登录用户
# ip:远程主机

# 返回下面日志为端口通
debug1: Connection established.

# 返回下面日志为端口不通
debug1: connect to address xx.xx.xx.xx port 80: Connection refused
```

**curl 方式：**

```bash
curl ip:port

如果端口通一般都会返回内容
```

**wget 方式：**

```bash
wget ip:port

如果远程主机不存在端口则会一直提示连接主机。
```
