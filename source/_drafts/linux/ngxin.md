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

    location ^~/user/ {
        proxy_set_header Host $host;
        proxy_set_header  X-Real-IP        $remote_addr;
        proxy_set_header  X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://user/;
    }

    location ^~/order/ {
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

