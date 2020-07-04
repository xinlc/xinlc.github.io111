
## Nginx之生产环境配置案例

```conf
user                              nobody nobody;   ## 指定运行用户和组
worker_processes                  4;			   ## 指定worker数量，建议此处auto
worker_rlimit_nofile              51200;		   ## 最大打开文件描述符

error_log                         logs/error.log  notice;

pid                               /var/run/nginx.pid;

events {
  use                             epoll;			## 使用epoll事件驱动模型
  worker_connections              51200;			## 一个worker能处理的最大并发
}

http {
  server_tokens                   off;				## 隐藏nginx版本
  include                         mime.types;		

  # server_name_in_redirect on; # URL 重定向为： server_name 中的第一个域名 + 目录名 + /；
  server_name_in_redirect off; # URL 重定向为： 原 URL 中的域名 + 目录名 + /。(自动加斜杠)
  port_in_redirect off; # 不携带内网端口
  proxy_redirect                off;				## 关闭代理重定向
  proxy_set_header              Host $host;			
  proxy_set_header              X-Real-IP $remote_addr;
  proxy_set_header              X-Forwarded-For $proxy_add_x_forwarded_for;
  client_max_body_size          20m;			## 设置客户端请求body的最大允许大小
  client_body_buffer_size       256k;			## 设置客户端请求body的缓冲区大小
  proxy_connect_timeout         90;				## 与后端服务器连接的超时时长
  proxy_send_timeout            90;				## 把请求发送给后端服务器的超时时长
  proxy_read_timeout            90;				## 等待后端服务器发送响应报文的超时时长
  proxy_buffer_size             128k;			## 从代理服务器接收的响应的第一部分缓冲区
  proxy_buffers                 4 64k;			## 从代理服务器读取响应的缓冲区number和size
  proxy_busy_buffers_size       128k;			## 限制size在响应尚未完全读取时可能忙于向客户端发送响应的缓冲区总数
  proxy_temp_file_write_size    128k;			## 该指令设置缓冲临时文件的最大值

  default_type                    application/octet-stream;
  charset                         utf-8;		## 字符集
  
  client_body_temp_path           /var/tmp/client_body_temp 1 2;  ## 请求body临时目录
  proxy_temp_path                 /var/tmp/proxy_temp 1 2;	## 代理服务器接受数据临时目录
  fastcgi_temp_path               /var/tmp/fastcgi_temp 1 2; ## FastCGI服务器接收临时目录 
  uwsgi_temp_path                 /var/tmp/uwsgi_temp 1 2; ## uwsgi 服务器接收临时目录
  scgi_temp_path                  /var/tmp/scgi_temp 1 2; ##scgi服务器接收临时目录

  ignore_invalid_headers          on;		## 开启控制忽略具有无效名称的标头字段
  server_names_hash_max_size      256;		## 服务器名称哈希表的最大值
  server_names_hash_bucket_size   64;		## 服务器名称哈希表存储bucket大小
  client_header_buffer_size       8k;		## 设置缓冲区以读取客户端请求标头
  large_client_header_buffers     4 32k;	## 设置缓冲区以读取客户端请求标头最大值number和size
  connection_pool_size            256;		## 允许精确调整每个连接的内存分配
  request_pool_size               64k;		## 允许精确调整每个请求的内存分配

  output_buffers                  2 128k;	## 设置用于从磁盘读取响应的缓冲区number和size
  postpone_output                 1460;		## 客户端数据的传输最小值，单位字节

  client_header_timeout           1m;		## 定义读取客户端请求标头的超时时长
  client_body_timeout             3m;		## 定义读取客户端请求主体的超时时长
  send_timeout                    3m;		## 设置将响应传输到客户端的超时时长


  log_format main                 '$server_addr $remote_addr [$time_local] $msec+$connection '
                                  '"$request" $status $connection $request_time $body_bytes_sent "$http_referer" '
                                  '"$http_user_agent" "$http_x_forwarded_for"';

  open_log_file_cache               max=1000 inactive=20s min_uses=1 valid=1m;

  access_log                      logs/access.log      main;
  log_not_found                   on;


  sendfile                        on;			
  tcp_nodelay                     on;		## 启用长连接马上响应，提高性能
  tcp_nopush                      off;		## 关闭套接字选项

  reset_timedout_connection       on;		## 启用重置超时连接
  keepalive_timeout               10 5;		## 第一个参数设置长连接超时时长，第二个浏览器识别为keep-alive:timeout=5
  keepalive_requests              100;		## 设置可通过一个保持活动连接提供的最大请求数


  gzip                            on;		## 开启压缩
  gzip_http_version               1.1;		## 启用压缩时协议最小版本
  gzip_vary                       on;		 
  gzip_proxied                    any;		## 为所有代理请求启用压缩
  gzip_min_length                 1024;		## 设置将被gzip压缩的响应的最小长度
  gzip_comp_level                 6;		## 设置压缩等级
  gzip_buffers                    16 8k;	## 设置用于压缩响应的缓冲区number和size
  gzip_proxied                    expired no-cache no-store private auth no_last_modified no_etag;
  gzip_types                      text/plain application/x-javascript text/css application/xml application/json;
  gzip_disable                    "MSIE [1-6]\.(?!.*SV1)";


  upstream tomcat8080 {
    ip_hash;

    server                        172.16.100.103:8080 weight=1 max_fails=2;
    server                        172.16.100.104:8080 weight=1 max_fails=2;
    server                        172.16.100.105:8080 weight=1 max_fails=2;
  }

  server {
    listen                        80;
    server_name                   www.chan.com;
    # config_apps_begin
    root                          /data/webapps/htdocs;
    access_log                    /var/logs/webapp.access.log     main;
    error_log                     /var/logs/webapp.error.log      notice;

    location / {
    
      location ~* ^.*/favicon.ico$ {
        root                      /data/webapps;
        expires                   180d;		## 缓存180天
        break;
      }
    
      if ( !-f $request_filename ) {
        proxy_pass                http://tomcat8080;
        break;
      }
    }

    error_page                    500 502 503 504  /50x.html;
      location = /50x.html {
      root                        html;
    }
  }

  server {
    listen                        8088;
    server_name                   nginx_status;

      location / {
          access_log                  off;
          deny                        all;
          return                      503;
      }

      location /status {
          stub_status                 on;
          access_log                  off;
          allow                       127.0.0.1;
          allow                       172.16.100.71;
          deny                        all;
      }
  }

}
```
