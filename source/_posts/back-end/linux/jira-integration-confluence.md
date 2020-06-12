---
title: Jira Software 和 Confluence 集成
date: 2019-09-27 19:50:00
categories: Linux
tags:
  - jira
  - confluence
---

继上一篇 [使用 Docker 安装 Jira Software 和 Confluence](https://xinlichao.cn/back-end/linux/docker-jira-confluence/)，配置 `Jira` 集成 `Confluence`

<!--more-->

## 配置 Jira

1. 在你的 Jira 应用中，点击设置 > 用户管理（User Management）> 输入管理员密码 > Jira 用户服务器（Jira User Server）

![1][1]

2. 点击添加应用程序
3. 输入程序名、密码、ip 地址（ip 为 docker atlassian_atlassian-net 地址）

![2][2]

你以为就这么简单？真这么简单我也不会记下来, 坑来了！坑来了！它带着 bug 走来了！

连接测试失败。来自服务器的响应:
java.net.NoRouteToHostException: Host is unreachable (Host unreachable)

连接测试失败。来自服务器的响应:
com.atlassian.crowd.exception.ApplicationPermissionException: Forbidden (403) 加载页面时发生 "403 - Forbidden" 错误 client.forbidden.exception 转换到 Jira 主页

解决：

```bash
# 查看网络
docker network ls

# 查看 atlassian_atlassian-net
docker inspect atlassian_atlassian-net
```

记下 ip

```json
"IPAM": {
  "Config": [
    {
      "Subnet": "192.168.48.0/20",
      "Gateway": "192.168.48.1"
    }
  ]
}
```

配置防火墙：

```bash
firewall-cmd --zone=trusted --add-source=192.168.48.1/20 --permanent
firewall-cmd --reload
```

4. 为了可以使用 Confluence，用户必须是 confluence-users 用户组的成员，或者具有 Confluence 的可以使用（can use）的权限。下面的步骤是在你的 Jira 应用中配置 Confluence 用户组的步骤：
1. 在你的 Jira 应用中添加 confluence-users 和 confluence-administrators 用户组。
1. 在上面的用户组中添加你自己的用户名来作为一个组成员。
1. 选择下面的方法来让你 Jira 中的用户能够访问 Confluence：
   - 方法 1：在你的 Jira 应用中，找到这些用户所属的用户组，然后将这个用户组添加为上面 2 个 Confluence 用户组的成员。这里等于用户组嵌套的关系。
   - 方法 2：使用你的 Jira 账号登录 Confluence，然后进入 Confluence 的 管理员控制台（Administration Console）界面。单击 全局属性（Global Permissions），然后将 可以使用（can use）权限指派给你 Jira 中希望使用 Confluence 的用户组

## 配置 Confluence

1. 在你的 Confluence 应用中，点击设置 > 一般设置 （General Configuration） > 输入管理员密码
2. 在左侧边栏中单击 用户目录（User Directories）。
3. 添加（Add）一个目录，然后选择类型 Atlassian Jira。
4. 输入下面描述的设置。当设置中询问应用名称（application name）和 密码（password）的时候，输入在 Jira 中定义 Confluence 连锁需要的用户名和密码。

![3][3]

5. 保存后，点击右侧同步
6. 可以去用户里查看是否有同步了用户
7. 如果没有成功，请确定你已经添加了你的 Confluence 应用的 URL 到 Jira 的白名单列表中（我没有做这一步也是好用的）。在 Jira 应用中，设置 > 系统 > 安全 > 白名单, 参考：[Configuring the whitelist](https://www.cwiki.us/display/CONF6EN/Configuring+the+Whitelist)
8. 在 用户目录（User Directories）界面中，通过单击目录前面的上下移动按钮，定义目录序列（directory order）。
   这里是有关目录顺序如何影响处理流程：
9. 目录中的顺序是被用来如何查找用户和组的顺序。
10. 修改用户和用户组将会仅仅应用到应用程序具有修改权限的第一个目录中。
11. 有关的更多细节，请参考页面：[Managing Multiple Directories](https://www.cwiki.us/display/CONFLUENCEWIKI/Managing+Multiple+Directories)

## 集成应用程序

1. 在 Jira 应用中，点击 设置 > 应用程序 > 集成 > 应用程序连接
2. 输入应用程序 URL：http://192.168.2.202:9006
3. 创建连接，会来回跳转授权。配置好后就可以在左上角切换应用了。

[1]: /images/linux/jira-integration-confluence/1.jpg
[2]: /images/linux/jira-integration-confluence/2.jpg
[3]: /images/linux/jira-integration-confluence/3.jpg

## 参考

- [Atlassian](https://www.atlassian.com/)
