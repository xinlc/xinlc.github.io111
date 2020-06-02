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

## shell 数组(含"map")操作

字符 | 含义 | 举例
---|---|---
| # | 个数相关 | $#：shell的参数个数, ${#̲array[@]}/{#array[*]}: 数组个数 | 
| @、* | 所有元素 | $@ $: shell的所有参数列表 array[@]/{array[@]}/array[@]/array[]: 数组的所有元素 |

数组操作命令 | 含义
---|---
`${#array[@]}` | 取数组元素的个数
`${#array[*]}` | 取数组元素的个数
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
