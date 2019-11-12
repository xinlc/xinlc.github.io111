---
title: CentOS7 防火墙配置
date: 2019-09-14 15:00:00
categories: Linux
tags:
  - linux
  - centos7
---

鸽了……

<!--more-->

清除防火墙规则

```bash
# flush 清除所有的已定规则
iptables -F

# delete 删除所有用户“自定义”的链（tables）
iptables -X

#zero 将所有的chain的计数与流量统计都归零
iptables -Z

iptables -t nat -F
```

## 参考

- [firewall-cmd](https://wangchujiang.com/linux-command/c/firewall-cmd.html)
- [CentOS7中firewalld的安装与使用详解](https://blog.csdn.net/solaraceboy/article/details/78342360)
