---
title: Nginx 之 七七八八
date: 2020-05-09 17:01:00
categories: Linux
tags:
  - Nginx
---

Nginx 之 七七八八

<!--more-->

## Nginx 开启 websocket 支持

1. 编辑nginx.conf，在http区域内一定要添加下面配置：

```conf
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

map指令的作用：

该作用主要是根据客户端请求中$http_upgrade 的值，来构造改变$connection_upgrade的值，即根据变量$http_upgrade的值创建新的变量$connection_upgrade，
创建的规则就是{}里面的东西。其中的规则没有做匹配，因此使用默认的，即 $connection_upgrade 的值会一直是 upgrade。然后如果 $http_upgrade为空字符串的话，那值会是 close。

2. 编辑vhosts下虚拟主机的配置文件，在location匹配配置中添加如下内容：

```conf
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
```

示例如下：

```conf
upstream socket.kevin.com {
    hash $remote_addr consistent;
    server 10.0.12.108:9000;
    server 10.0.12.109:9000;
}

location / {
    proxy_pass http://socket.leo.com/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 300s;
}
```

### Nginx代理webSocket经常中断的解决方法（也就是如何保持长连接）

现象描述：用nginx反代代理某个业务，发现平均1分钟左右，就会出现webSocket连接中断，然后查看了一下，是nginx出现的问题。
产生原因：nginx等待第一次通讯和第二次通讯的时间差，超过了它设定的最大等待时间，简单来说就是超时！

1. 解决方法1

其实只要配置nginx.conf的对应localhost里面的这几个参数就好

```conf
proxy_connect_timeout;
proxy_read_timeout;
proxy_send_timeout;
```

2. 解决方法2

发心跳包，原理就是在有效地再读时间内进行通讯，重新刷新再读时间

配置示例：

```conf

http {
    server {
        location / {
            root   html;
            index  index.html index.htm;
            proxy_pass http://webscoket;
            proxy_http_version 1.1;
            proxy_connect_timeout 4s;                #配置点1
            proxy_read_timeout 60s;                  #配置点2，如果没效，可以考虑这个时间配置长一点
            proxy_send_timeout 12s;                  #配置点3
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "Upgrade";  
        }
    }
}
```

关于上面配置2的解释：

这个是服务器对你等待最大的时间，也就是说当你webSocket使用nginx转发的时候，用上面的配置2来说，如果60秒内没有通讯，依然是会断开的，所以，你可以按照你的需求来设定。比如说，我设置了10分钟，那么如果我10分钟内有通讯，或者10分钟内有做心跳的话，是可以保持连接不中断的，详细看个人需求

### WebSocket与Socket的关系

- Socket其实并不是一个协议，而是为了方便使用TCP或UDP而抽象出来的一层，是位于应用层和传输控制层之间的一组接口。当两台主机通信时，必须通过Socket连接，Socket则利用TCP/IP协议建立TCP连接。TCP连接则更依靠于底层的IP协议，IP协议的连接则依赖于链路层等更低层次。
- WebSocket就像HTTP一样，则是一个典型的应用层协议。
- 总的来说：Socket是传输控制层接口，WebSocket是应用层协议。

## Nginx 反向代理配置去除前缀

**方法一：加"/"**

```conf
server {
    listen              8000;
    server_name         abc.com;
    access_log  "pipe:rollback /data/log/nginx/access.log interval=1d baknum=7 maxsize=1G"  main;

    location ^~ /user/ {
        proxy_set_header Host $host;
        proxy_set_header  X-Real-IP        $remote_addr;
        proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://user-test/;
    }

    location ^~ /order/ {
        proxy_set_header Host $host;
        proxy_set_header  X-Real-IP        $remote_addr;
        proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://order/;
    }
}
```

^~/user/表示匹配前缀是user的请求，proxy_pass的结尾有/， 则会把/user/*后面的路径直接拼接到后面，即移除user。

**方法二：rewrite**

```conf
upstream user {
  server localhost:8089 weight=5;
}
upstream order {
  server localhost:8090 weight=5;
}

server {
    listen              80;
    server_name  abc.com;
    access_log  "pipe:rollback /data/log/nginx/access.log interval=1d baknum=7 maxsize=1G"  main;

    location ^~/user/ {
        proxy_set_header Host $host;
        proxy_set_header  X-Real-IP        $remote_addr;
        proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;

        rewrite ^/user/(.*)$ /$1 break;
        proxy_pass http://user;
    }

    location ^~/order/ {
        proxy_set_header Host $host;
        proxy_set_header  X-Real-IP        $remote_addr;
        proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;

        rewrite ^/order/(.*)$ /$1 break;
        proxy_pass http://order;
    }
}
```

proxy_pass结尾没有/， rewrite重写了url。


## Nginx 之 proxy_pass 指令完全拆解

### proxy_pass的nginx官方指南

nginx中有两个模块都有proxy_pass指令。

1. `ngx_http_proxy_module的proxy_pass：`

- 语法: proxy_pass URL;
- 场景: location, if in location, limit_except
- 说明: 设置后端代理服务器的协议(protocol)和地址(address),以及location中可以匹配的一个可选的URI。协议可以是"http"或"https"。地址可以是一个域名或ip地址和端口，或者一个 unix-domain socket 路径。  
- 详见官方文档: http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass

2. `ngx_stream_proxy_module的proxy_pass：`

- 语法: proxy_pass address;
- 场景: server
- 说明: 设置后端代理服务器的地址。这个地址(address)可以是一个域名或ip地址和端口，或者一个 unix-domain socket路径。  
- 详见官方文档: http://nginx.org/en/docs/stream/ngx_stream_proxy_module.html#proxy_pass

两个proxy_pass的关系和区别：

在两个模块中，两个proxy_pass都是用来做后端代理的指令。
ngx_stream_proxy_module模块的proxy_pass指令只能在server段使用使用, 只需要提供域名或ip地址和端口。可以理解为端口转发，可以是tcp端口，也可以是udp端口。
ngx_http_proxy_module模块的proxy_pass指令需要在location段，location中的if段，limit_except段中使用，处理需要提供域名或ip地址和端口外，还需要提供协议，如"http"或"https"，还有一个可选的uri可以配置。

### proxy_pass的具体用法

ngx_stream_proxy_module模块的proxy_pass指令

```conf
server {
    listen 127.0.0.1:12345;
    proxy_pass 127.0.0.1:8080;
}

server {
    listen 12345;
    proxy_connect_timeout 1s;
    proxy_timeout 1m;
    proxy_pass example.com:12345;
}

server {
    listen 53 udp;
    proxy_responses 1;
    proxy_timeout 20s;
    proxy_pass dns.example.com:53;
}

server {
    listen [::1]:12345;
    proxy_pass unix:/tmp/stream.socket;
}
```

ngx_http_proxy_module模块的proxy_pass指令

```conf
server {
    listen      80;
    server_name www.test.com;

    # 正常代理，不修改后端url的
    location /some/path/ {
        proxy_pass http://127.0.0.1;
    }

    # 修改后端url地址的代理（本例后端地址中，最后带了一个斜线)
    location /testb {
        proxy_pass http://www.other.com:8801/;
    }

    # 使用 if in location
    location /google {
        if ( $geoip_country_code ~ (RU|CN) ) {
            proxy_pass http://www.google.hk;
        }
    }

    location /yongfu/ {
        # 没有匹配 limit_except 的，代理到 unix:/tmp/backend.socket:/uri/
        proxy_pass http://unix:/tmp/backend.socket:/uri/;;

        # 匹配到请求方法为: PUT or DELETE, 代理到9080
        limit_except PUT DELETE {
            proxy_pass http://127.0.0.1:9080;
        }
    }
}
```

### proxy_pass后，后端服务器的url(request_uri)情况分析

```conf
server {
    listen      80;
    server_name www.test.com;

    # 情形A
    # 访问 http://www.test.com/testa/aaaa
    # 后端的request_uri为: /testa/aaaa
    location ^~ /testa/ {
        proxy_pass http://127.0.0.1:8801;
    }
    
    # 情形B
    # 访问 http://www.test.com/testb/bbbb
    # 后端的request_uri为: /bbbb
    location ^~ /testb/ {
        proxy_pass http://127.0.0.1:8801/;
    }

    # 情形C
    # 下面这段location是正确的
    location ~ /testc {
        proxy_pass http://127.0.0.1:8801;
    }

    # 情形D
    # 下面这段location是错误的
    #
    # nginx -t 时，会报如下错误: 
    #
    # nginx: [emerg] "proxy_pass" cannot have URI part in location given by regular 
    # expression, or inside named location, or inside "if" statement, or inside 
    # "limit_except" block in /opt/app/nginx/conf/vhost/test.conf:17
    # 
    # 当location为正则表达式时，proxy_pass 不能包含URI部分。本例中包含了"/"
    location ~ /testd {
        proxy_pass http://127.0.0.1:8801/;   # 记住，location为正则表达式时，不能这样写！！！
    }

    # 情形E
    # 访问 http://www.test.com/ccc/bbbb
    # 后端的request_uri为: /aaa/ccc/bbbb
    location /ccc/ {
        proxy_pass http://127.0.0.1:8801/aaa$request_uri;
    }

    # 情形F
    # 访问 http://www.test.com/namea/ddd
    # 后端的request_uri为: /yongfu?namea=ddd
    location /namea/ {
        rewrite    /namea/([^/]+) /yongfu?namea=$1 break;
        proxy_pass http://127.0.0.1:8801;
    }

    # 情形G
    # 访问 http://www.test.com/nameb/eee
    # 后端的request_uri为: /yongfu?nameb=eee
    location /nameb/ {
        rewrite    /nameb/([^/]+) /yongfu?nameb=$1 break;
        proxy_pass http://127.0.0.1:8801/;
    }

    access_log /data/logs/www/www.test.com.log;
}

server {
    listen      8801;
    server_name www.test.com;
    
    root        /data/www/test;
    index       index.php index.html;

    rewrite ^(.*)$ /test.php?u=$1 last;

    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass unix:/tmp/php-cgi.sock;
        fastcgi_index index.php;
        include fastcgi.conf;
    }

    access_log /data/logs/www/www.test.com.8801.log;
}
```

文件: /data/www/test/test.php

```php
<?php
echo '$_SERVER[REQUEST_URI]:' . $_SERVER['REQUEST_URI'];
```

通过查看 $_SERVER['REQUEST_URI'] 的值，我们可以看到每次请求的后端的request_uri的值，进行验证。

### 小结

情形A和情形B进行对比，可以知道proxy_pass后带一个URI,可以是斜杠(/)也可以是其他uri，对后端request_uri变量的影响。
情形D说明，当location为正则表达式时，proxy_pass不能包含URI部分。
情形E通过变量($request_uri, 也可以是其他变量)，对后端的request_uri进行改写。
情形F和情形G通过rewrite配合break标志,对url进行改写，并改写后端的request_uri。需要注意，proxy_pass地址的URI部分在情形G中无效，不管如何设置，都会被忽略。

## 隐藏版本号

第一种：

```conf
# vim /usr/local/nginx/conf/nginx.conf
http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    server_tokens off; # 隐藏版本号显示
}
```

第二种基于源代码（变更版本号和版本名使其更具有迷惑效果）：

```bash
vim /opt/nginx-1.12.0/src/core/nginx.h     //修改源码文件
define nginx_version      1012000
define NGINX_VERSION      "1.1.5"
define NGINX_VER          "IIS/" NGINX_VERSION
# 更改版本号，注意不用取消井号！
cd /opt/nginx-1.12.0/
./configure --prefix=/usr/local/nginx --user=nginx --group=nginx --with-http_stub_status_module && make && make install
# 编译安装
vim /usr/local/nginx/conf/nginx.conf     # 把之前的server_tokens off;改成on
service nginx reload              # 重启服务
curl -I http://192.168.116.133   # 检测结果
```

## 转发IP

```conf
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

**X-Forwarded-For和相关几个头部的理解：**

- $remote_addr

是nginx与客户端进行TCP连接过程中，获得的客户端真实地址. Remote Address 无法伪造，因为建立 TCP 连接需要三次握手，如果伪造了源 IP，无法建立 TCP 连接，更不会有后面的 HTTP 请求

- X-Real-IP

是一个自定义头。X-Real-Ip 通常被 HTTP 代理用来表示与它产生 TCP 连接的设备 IP，这个设备可能是其他代理，也可能是真正的请求端。需要注意的是，X-Real-Ip 目前并不属于任何标准，代理和 Web 应用之间可以约定用任何自定义头来传递这个信息

- X-Forwarded-For

X-Forwarded-For 是一个扩展头。HTTP/1.1（RFC 2616）协议并没有对它的定义，它最开始是由 Squid 这个缓存代理软件引入，用来表示 HTTP 请求端真实 IP，现在已经成为事实上的标准，被各大 HTTP 代理、负载均衡等转发服务广泛使用，并被写入 RFC 7239（Forwarded HTTP Extension）标准之中.

X-Forwarded-For请求头格式非常简单，就这样：

```bash
X-Forwarded-For:client, proxy1, proxy2
```

可以看到，XFF 的内容由「英文逗号 + 空格」隔开的多个部分组成，最开始的是离服务端最远的设备 IP，然后是每一级代理设备的 IP。

如果一个 HTTP 请求到达服务器之前，经过了三个代理 Proxy1、Proxy2、Proxy3，IP 分别为 IP1、IP2、IP3，用户真实 IP 为 IP0，那么按照 XFF 标准，服务端最终会收到以下信息：

```bash
X-Forwarded-For: IP0, IP1, IP2
```

Proxy3 直连服务器，它会给 XFF 追加 IP2，表示它是在帮 Proxy2 转发请求。列表中并没有 IP3，IP3 可以在服务端通过 remote_address 来自 TCP 连接，表示与服务端建立 TCP 连接的设备 IP，在这个例子里就是 IP3。

详细分析一下，这样的结果是经过这样的流程而形成的：

1. 用户IP0---> 代理Proxy1（IP1），Proxy1记录用户IP0，并将请求转发个Proxy2时，带上一个Http Header
X-Forwarded-For: IP0
2. Proxy2收到请求后读取到请求有 X-Forwarded-For: IP0，然后proxy2 继续把链接上来的proxy1 ip追加到 X-Forwarded-For 上面，构造出X-Forwarded-For: IP0, IP1，继续转发请求给Proxy 3
3. 同理，Proxy3 按照第二部构造出 X-Forwarded-For: IP0, IP1, IP2,转发给真正的服务器，比如NGINX，nginx收到了http请求，里面就是 X-Forwarded-For: IP0, IP1, IP2 这样的结果。所以Proxy 3 的IP3，不会出现在这里。
4. nginx 获取proxy3的IP 能通过remote_address就是真正建立TCP链接的IP，这个不能伪造，是直接产生链接的IP。$remote_address 无法伪造，因为建立 TCP 连接需要三次握手，如果伪造了源 IP，无法建立 TCP 连接，更不会有后面的 HTTP 请求。

**x-forwarded-for 实践研究：**

1. uwsgi_pass的情况下，nginx 没有设置proxy_pass x-forwarded-for: $proxy_add_x_forwarded_for;
如果请求头传了XFF，在flask里面能正常读取请求头里面的XFF,就是当是一个普通的头读出；如果header不传这个XFF的话，就读不到

2. proxy_pass 情况下

- 没有传 # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for 的话，跟上面的uwsgi_pass 一样，都是在没有设置header XFF情况下，读不到。
- 如果传了 proxy_set_header X-Forwarded-For remote_address），因为这句proxy_set_header 会让nginx追加一个$remote_address到XFF。
- header 传xff的话， 程序里面可以读到Xff 头： X-Forwarded-For: 188.103.19.120, 10.0.2.2 （第一个是我自己编的，第二个是proxy_add_x_forwarded_for 这句而追加$remote_addr到XFF。

总结：

1. 只要nginx前端（例如lvs， varnish）转发请求给nginx的时候，带了x-forwarded-for ,那么程序就一定能读到这个字段，如果nginx还设置了proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for， 那么程序能读到XFF是：ip0, ip1 (客户端Ip，lvs或者varnishIP)。 如果nginx没有设置，那么nginx还是会原样把http头传给程序，也就是说程序也能读到XFF，而且XFF就是ip0 客户端IP。
2. proxy_pass 设置这个头 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; 是站在一个作为代理的角度把。能继续传输多级代理的头。
3. nginx的日志格式写了$http_x_forwared_for 说明前端（lvs）确实传了这个头过来。所以是程序是读取到的
4. uwsgi_pass 不能设置 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; 这个头，是因为这个头是对http代理来说，用来传递IP的，uwsgi 不可能充当一个代理。
5. nginx->程序，这里其实有两个链接过程，其他IP与nginx的TCP链接， nginx与程序的TCP链接。所以$remote_addr都是对各自来说的。
程序的remote_addr: remote_addr 127.0.0.1 (跟它链接的是nginx 内网127.0.0.1)
nginx的remote_addr : X-Real-Ip: 10.0.2.2 （跟它链接的是我的电脑，IP 10.0.2.2）
6. 对程序来说，读取的request.remote_addr 也永远是直接跟他链接的ip， 也就是反向代理nginx
7. The access_route attribute uses the X-Forwarded-For header, falling back to the REMOTE_ADDRWSGI variable; 也就是说access_route默认读取XFF头，如果没有，降级读取WSGI的REMOTE_ADDR变量,这个 WSGI的REMOTE_ADDR变量 就是 $remote_addr
8. request.envron 是WSGI的变量，都是wsgi server转过来的，普通的头都是加了HTTP_前缀的 ，包括proxy_set_header Host  proxy_add_x_forwarded_for;
添加的头都会出现在处理，因为他们就是普通的http头
9. LVS->nginx的情况下， 请求的时候主动加XFF，程序读取的时候没显示。因为LVS设置XFF的时候，直接把直连的IP赋值给LVS，忽略掉所有本来有的XFF，要从LVS这里开始。 所以程序读到的XFF是 ：XFF headers 218.107.55.254, 10.120.214.252
前面的是我的IP， 后面的是LVS的IP

```json
{
  "wsgi.multiprocess": "False",
  "SERVER_SOFTWARE": "Werkzeug/0.11.10",
  "SCRIPT_NAME": "",
  "REQUEST_METHOD": "GET",
  "PATH_INFO": "/api/get_agreement_url/",
  "SERVER_PROTOCOL": "HTTP/1.0",
  "QUERY_STRING": "",
  "werkzeug.server.shutdown": "<function shutdown_server at 0x7f4a2f4e5488>",
  "CONTENT_LENGTH": "",
  "SERVER_NAME": "127.0.0.1",
  "REMOTE_PORT": 58284,
  "werkzeug.request": "",
  "wsgi.url_scheme": "http",
  "SERVER_PORT": "6000",
  "HTTP_POSTMAN_TOKEN": "666cfd97-585b-c342-f0bd-5c785dfff27d",
  "wsgi.input": "",
  "wsgi.multithread": "False",
  "HTTP_CACHE_CONTROL": "no-cache",
  "HTTP_ACCEPT": "*/*",
  "wsgi.version": "(1, 0)",
  "wsgi.run_once": "False",
  "wsgi.errors": "",
  "CONTENT_TYPE": "",
  "REMOTE_ADDR": "127.0.0.1",

  "HTTP_CONNECTION": "close",
  "HTTP_USER_AGENT": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
  "HTTP_ACCEPT_LANGUAGE": "zh-CN,zh;q=0.8,en;q=0.6",
  "HTTP_X_FORWARDED_FOR": "10.0.2.2",
  "HTTP_ACCEPT_ENCODING": "gzip, deflate, sdch",
  "HTTP_HOST": "[test.mumu.nie.netease.com:8000](http://test.mumu.nie.netease.com:8000/)",
}
```

proxy_add_x_forwarded_for; nginx的这个变量含义就是，每次都追加remote_address 到 xff头，如果xff头不存在，那么xff就被设置成跟$remote_address 一样了。如果本来就存在，就追加了 ip1, ip2这样的形式

## 设置IP黑白名单

**方式一：**

```conf
server {
    # include allow_deny_ip.conf
    deny  192.168.1.1;
    allow 192.168.1.0/24;
    allow 10.1.1.0/16;
    allow 2001:0db8::/32;
    deny  all;
}
```

**方式二：**

只允许11.1.12.222访问

```conf
server {
    listen       80;
    server_name  leo.com;

    resolver 8.8.8.8;
    location / {
        proxy_pass $scheme://$host$request_uri;
        if ( $remote_addr !~* "11.1.12.222") {
            return 403;
        }
        root   /usr/local/nginx/html;
    }
}
```

**方式三：**

有个需求，需要特定的2个ip才能访问指定域名，但是使用私有云的slb负载后透过的ip，指向nginx反向代理后，使用nginx的ip限制无法控制ip访问。使用下面方式可以：

```conf
server {
    listen       80;
    server_name   xxx.xxx.xxx;

    set $x $remote_addr;
    if ($http_ali_cdn_real_ip) {
        set $x $http_ali_cdn_real_ip;
    }
    # cms
    location ^~ /cms {
        proxy_pass http://pool_yyyy_8000/;
        proxy_set_header  Host  $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header REMOTE-HOST $remote_addr;
        client_max_body_size    100m;
        set $allow true;
        if ($http_x_forwarded_for !~ "xxx.xxx.xxx.xxx|yyy.yyy.yyy.yyy") {
            set $allow false;
        }
        if ($allow = false) {
            return 403;
        }
    }
}
```

## 禁止ip访问，只能域名访问

```conf
server{
    listen 80 default_server;
    server_name _;
    return 500;
}
```

## 关于Nginx反向代理DDNS的DNS缓存问题

在使用nginx做反向代理的，将请求发送到一个动态DDNS域名的时候，该动态DDNS域名对应的IP是A ，刚开始运行一切正常，但是当运行了一段时间以后，该动态DDNS域名对应的IP变了之后(例如对应的IP由A变为B)，nginx的转发仍然还在向原先的IP A发送请求，导致反向代理中断，此时reload nginx后才会重新恢复正常，且日志显示数据转发到新的IP B了，请问如何让nginx自动去重新解析域名，而不用每次出现问题了人工去reload？

造成这个问题的主要原因是，在Nginx启动的时候会做域名解析，然后把IP缓存起来以后会一直使用解析到的IP并且不会再更改，除非重新启动Nginx，Nginx才会重新解析域名。

利用nginx的resolver：

1. 默认nginx会通过操作系统设置的DNS服务器(/etc/resolv.conf)去解析域名
2. 其实nginx还可以通过自身设置DNS服务器，而不用去找操作系统的DNS
3. 下面来讲一个这个resolver示例配置如下：

```conf
server {
    listen 8080;
    server_name localhost;
    resolver 114.114.114.114 223.5.5.5 valid=3600s;
    resolver_timeout 3s;
    location / {
        proxy_pass http://mydomain.com;
    }
}


# 第二种，用变量
server {
    listen 80;
    server_name staging.leo.com dev.api.leo.com;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';

    resolver 114.114.114.114 223.5.5.5 valid=30s ipv6=off;
    set $mydomainurl "http://intranet.leo.com:8800"; # 通过变量来解决不重新解析问题，注意set好像不支持变量名中带下划线或其它特殊字符
    location / {
        proxy_pass $mydomainurl;
    }
}

# 在这个配置中，resolver 是 DNS 服务器地址, valid 设定 DNS 刷新频率。需要特别注意的一点是 set 语句不能写到 location 里面，否则不会生效。
server {
    listen 80;
    server_name xxx.xxx.com;
    resolver 127.0.0.11 valid=5s; # docker 引擎内置 DNS
    resolver_timeout 3s;
    set $service_lb xxxxxx;

    location / {
        proxy_pass http://$service_lb;
    }
}
```

参数说明：

- resolver 可以在http全局设定，也可在server里面设定
- resolver 后面指定DNS服务器，可以指定多个，空格隔开
- valid设置DNS缓存失效时间，自己根据情况判断，建议600以上
- resolver_timeout 指定解析域名时，DNS服务器的超时时间，建议3秒左右

> 注意：当resolver 后面跟多个DNS服务器时，一定要保证这些DNS服务器都是有效的，因为这种是负载均衡模式的，当DNS记录失效了(超过valid时间)，首先由第一个DNS服务器(114.114.114.114)去解析，下一次继续失效时由第二个DNS服务器(223.5.5.5)去解析，亲自测试的，如有任何一个DNS服务器是坏的，那么这一次的解析会一直持续到resolver_timeout ，然后解析失败，且日志报错解析不了域名，通过页面抛出502错误。
