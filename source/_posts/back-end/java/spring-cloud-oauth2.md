---
title: 微服务架构之安全认证：Spring Cloud Security OAuth2
date: 2020-03-08 19:49:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
  - Security
---

Spring Cloud Security 为构建安全的 SpringBoot 应用提供了一系列解决方案，结合 OAuth2 可以实现单点登录、令牌中继、令牌交换等功能。

<!--more-->

## OAuth2 提出背景

先来简单介绍一下 OAuth2 协议是基于什么背景提出来的。

### 开放系统间授权

![1][1]

最初是基于开放系统间授权提出来的，假如有这样一个场景，有个云存储服务（box）存着我们的一些照片，现在有个第三方应用云冲印服务，这个照片是我的，我是相片拥有者我有权对它操作，现在我想通过第三方的云冲印服务打印云存储上的照片，这就涉及到开发系统间授权的问题。

这里有三个概念：

- 资源拥有者：我；
- 客户应用：第三方应用（云冲印服务）；
- 受保护的资源：box；

那么我能让第三方（云冲印服务）来访问我在云存储服务上的照片呢？

### 方法一：用户名密码复制

![2][2]

我把自己的用户名和密码传给客户应用，然后它有了用户名密码就可以访问我的受保护的资源。这是最简单粗暴的办法，也是大部分场景下在公司内部的是这么做的，比如说公司内部开发了一个应用程序，公司的用户名密码一般存在 LDAP 中，那你要使用这个应用的时候输入用户名和密码，然后这个应用会去 LDAP 中校验。这是最简单的方式，但是这种方式在开发系统间是行不通的，因为这个第三方应用一般是不受信的，把用户名密码给它了有很大的安全风险。

### 方法二：万能钥匙

![3][3]

如果客户应用和受保护资源是有一种信任关系的，比如是合作商或是一个公司的两个不同的部门。这种信任一般可以来协商一个通用的万能钥匙（developer key），但是对于不授信的第三方应用来说也是不安全的，会有 `developer key` 被泄露的问题。

### 方法三：特殊令牌

![4][4]

我给受保护的资源设置一个特殊的密码或者令牌，仅能访问这个受保护的资源。这个就是很类似 OAuth2 授权了，但是怎么来管理这个令牌，怎么颁发令牌，怎么来吊销这个令牌，这里面就有很多讲究，OAuth2 的设计就是来解决这些问题的。

### 传统单块应用安全

除了开放系统间的授权问题，在微服务中还要解决什么问题？先来看一下传统的单块应用安全。

![5][5]

在传统的单块应用的安全，一般会有业务 DB 和用户 DB，一个用户登录请求过来以后，会经过一个过滤器去用户 DB 中做鉴权登录，如果通过了会在客户的浏览器中种一个 Cookie 能够记住这个用户，那么相互之间浏览器和应用服务器之间就建立了一个 Session，这是传统的单快应用安全认证的做法。

### 现代微服务安全

![6][6]

现代互联网系统一般都采用微服务架构，不是单快应用架构。有两个方面的问题，一个是服务拆分的粒度比较细，那么服务和服务之间怎么来认证鉴权；另外一个应用的形态变的多种多样，不再是简单的浏览器应用，还有单页应用、无线 App 应用、服务器端应用等等，应用的形态或设备的类型越来越多。这种情况下不但要解决应用系统内部的服务安全问题，还要对外部多种形态接入的客户端进行安全认证。

这种情况下不就不再适用传统的方式去做安全，而是会有一个独立的服务（AuthServer）把认证和授权都做成一个 Service，核心的技术点不再是原来的用户名密码和 Session，而是基于 Token 的授权。

### OAuth2 解决问题域和场景

在现实生活中我们无时无刻都在使用 OAuth2 授权，比如：大众点评App 通过微信登录；玩王者荣耀时通过微信登录；在用淘宝购物时使用新浪微博登录等等。

![7][7]

OAuth2 要解决的问题和场景，大致分为三类：

1. 开发系统间的授权
  - 社交联合登录，现在很多应用都支持微信来登录；
  - 开放API平台，如果公司发展到一定阶段，你要开放平台，那么开放的API也可通过 OAuth2 来解决。
2. 现代微服务安全
  - 企业内部微服务化后外部需要有很多场景要接入；
  - 单页 H5 应用；
  - 无线 App 应用；
  - 微服务API间调用等。
3. 企业内部应用认证授权（IAM/SSO）
  - 企业内部也有很多应用要相互授权；
  - 比如单点登录（SSO)。

## OAuth2 定义和原理

OAuth 2.0是用于授权的行业标准协议。OAuth 2.0为简化客户端开发提供了特定的授权流，包括Web应用、桌面应用、移动端应用等。

![8][8]

### OAuth 2.0 的历史

![9][9]

### OAuth 2.0 优势

![10][10]

### OAuth 2.0 不足

![11][11]

### OAuth 2.0 主要角色

![12][12]

OAuth2 相关名词解释：

- Resource owner（资源拥有者）：拥有该资源的最终用户，他有访问资源的账号密码；
- Client（客户端）：访问资源的客户端，会使用访问令牌去获取资源服务器的资源，可以是浏览器、移动设备或者服务器；
- Resource server（资源服务器）：拥有受保护资源的服务器，如果请求包含正确的访问令牌，可以访问资源；
- Authorization server（认证服务器）：用于认证用户的服务器，如果客户端认证通过，发放访问资源服务器的令牌；
- 客户凭证（Client Credentials）：客户的clientId 和密码用于认证客户；
- 令牌（Tokens）：授权服务器在接收到客户请求后，颁发的访问令牌；
- 作用域（Scopes）：客户请求访问令牌时，由资源拥有者额外指定的细分权限（permission）；

OAuth 令牌类型：

- 访问令牌（Access Token）：用于代表一个用户或服务直接去访问受保护的资源；
- 刷新令牌（Refresh Token）：用于去授权服务器获取一个新的访问令牌；
- 授权码（Authorization Code Token）：仅用于授权码授权类型，用于交换获取访问令牌和刷新令牌；
- Bearer Token：不管谁拿到 Token 都可以访问资源，像现钞；
- Proof of Possession(PoP) Token：可以校验 client 是否对 Token 有明确的拥有权；

### OAuth 2.0 误解

![13][13]

总结：

- OAuth 本质如何获取 token 如何使用 token；
- OAuth 是一种在系统之间的代理授权（delegation authorization）协议；
- OAuth 提供一个宽泛的协议框架，具体安全场景需要定制；
- OAuth 使用代理协议的方式解决密码共享反模式问题；

## 典型 OAuth Flow 和选型

### 运行流程

```code
  +--------+                               +---------------+
  |        |--(A)- Authorization Request ->|   Resource    |
  |        |                               |     Owner     |
  |        |<-(B)-- Authorization Grant ---|               |
  |        |                               +---------------+
  |        |
  |        |                               +---------------+
  |        |--(C)-- Authorization Grant -->| Authorization |
  | Client |                               |     Server    |
  |        |<-(D)----- Access Token -------|               |
  |        |                               +---------------+
  |        |
  |        |                               +---------------+
  |        |--(E)----- Access Token ------>|    Resource   |
  |        |                               |     Server    |
  |        |<-(F)--- Protected Resource ---|               |
  +--------+                               +---------------+
```

说明：

- （A）用户打开客户端以后，客户端要求用户给予授权。
- （B）用户同意给予客户端授权。
- （C）客户端使用上一步获得的授权，向认证服务器申请令牌。
- （D）认证服务器对客户端进行认证以后，确认无误，同意发放令牌。
- （E）客户端使用令牌，向资源服务器申请获取资源。
- （F）资源服务器确认令牌无误，同意向客户端开放资源。

### 授权码模式

授权码模式（authorization code）是功能最完整、流程最严密的授权模式。它的特点就是通过客户端的后台服务器，与"服务提供商"的认证服务器进行互动。

```code
  +----------+
  | Resource |
  |   Owner  |
  |          |
  +----------+
      ^
      |
      (B)
  +----|-----+          Client Identifier      +---------------+
  |         -+----(A)-- & Redirection URI ---->|               |
  |  User-   |                                 | Authorization |
  |  Agent  -+----(B)-- User authenticates --->|     Server    |
  |          |                                 |               |
  |         -+----(C)-- Authorization Code ---<|               |
  +-|----|---+                                 +---------------+
    |    |                                         ^      v
  (A)  (C)                                         |      |
    |    |                                         |      |
    ^    v                                         |      |
  +---------+                                      |      |
  |         |>---(D)-- Authorization Code ---------'      |
  |  Client |          & Redirection URI                  |
  |         |                                             |
  |         |<---(E)----- Access Token -------------------'
  +---------+       (w/ Optional Refresh Token)
```

说明：

- （A）用户访问客户端，后者将前者导向认证服务器。
- （B）用户选择是否给予客户端授权。
- （C）假设用户给予授权，认证服务器将用户导向客户端事先指定的"重定向URI"（redirection URI），同时附上一个授权码。
- （D）客户端收到授权码，附上早先的"重定向URI"，向认证服务器申请令牌。这一步是在客户端的后台的服务器上完成的，对用户不可见。
- （E）认证服务器核对了授权码和重定向URI，确认无误后，向客户端发送访问令牌（access token）和更新令牌（refresh token）。

### 简化模式

简化模式（implicit grant type）不通过第三方应用程序的服务器，直接在浏览器中向认证服务器申请令牌，跳过了"授权码"这个步骤，因此得名。所有步骤在浏览器中完成，令牌对访问者是可见的，且客户端不需要认证。

```code
  +----------+
  | Resource |
  |  Owner   |
  |          |
  +----------+
      ^
      |
      (B)
  +----|-----+          Client Identifier     +---------------+
  |         -+----(A)-- & Redirection URI --->|               |
  |  User-   |                                | Authorization |
  |  Agent  -|----(B)-- User authenticates -->|     Server    |
  |          |                                |               |
  |          |<---(C)--- Redirection URI ----<|               |
  |          |          with Access Token     +---------------+
  |          |            in Fragment
  |          |                                +---------------+
  |          |----(D)--- Redirection URI ---->|   Web-Hosted  |
  |          |          without Fragment      |     Client    |
  |          |                                |    Resource   |
  |     (F)  |<---(E)------- Script ---------<|               |
  |          |                                +---------------+
  +-|--------+
    |    |
  (A)  (G) Access Token
    |    |
    ^    v
  +---------+
  |         |
  |  Client |
  |         |
  +---------+
```

说明：

- （A）客户端将用户导向认证服务器。
- （B）用户决定是否给于客户端授权。
- （C）假设用户给予授权，认证服务器将用户导向客户端指定的"重定向URI"，并在URI的Hash部分包含了访问令牌。
- （D）浏览器向资源服务器发出请求，其中不包括上一步收到的Hash值。
- （E）资源服务器返回一个网页，其中包含的代码可以获取Hash值中的令牌。
- （F）浏览器执行上一步获得的脚本，提取出令牌。
- （G）浏览器将令牌发给客户端。

### 密码模式

密码模式（Resource Owner Password Credentials Grant）中，用户向客户端提供自己的用户名和密码。客户端使用这些信息，向"服务商提供商"索要授权。

在这种模式中，用户必须把自己的密码给客户端，但是客户端不得储存密码。这通常用在用户对客户端高度信任的情况下，比如客户端是操作系统的一部分，或者由一个著名公司出品。而认证服务器只有在其他授权模式无法执行的情况下，才能考虑使用这种模式。

```code
  +----------+
  | Resource |
  |  Owner   |
  |          |
  +----------+
      v
      |    Resource Owner
      (A) Password Credentials
      |
      v
  +---------+                                  +---------------+
  |         |>--(B)---- Resource Owner ------->|               |
  |         |         Password Credentials     | Authorization |
  | Client  |                                  |     Server    |
  |         |<--(C)---- Access Token ---------<|               |
  |         |    (w/ Optional Refresh Token)   |               |
  +---------+                                  +---------------+
```

说明：

- （A）用户向客户端提供用户名和密码。
- （B）客户端将用户名和密码发给认证服务器，向后者请求令牌。
- （C）认证服务器确认无误后，向客户端提供访问令牌。

### 客户端模式

客户端模式（Client Credentials Grant）指客户端以自己的名义，而不是以用户的名义，向"服务提供商"进行认证。严格地说，客户端模式并不属于OAuth框架所要解决的问题。在这种模式中，用户直接向客户端注册，客户端以自己的名义要求"服务提供商"提供服务，其实不存在授权问题。这种模式一般是机器对机器比如 docker client 去镜像仓库拉去镜像。

```code
  +---------+                                  +---------------+
  |         |                                  |               |
  |         |>--(A)- Client Authentication --->| Authorization |
  | Client  |                                  |     Server    |
  |         |<--(B)---- Access Token ---------<|               |
  |         |                                  |               |
  +---------+                                  +---------------+
```

说明：

- （A）客户端向认证服务器进行身份认证，并要求一个访问令牌。
- （B）认证服务器确认无误后，向客户端提供访问令牌。

### 刷新令牌

```code
  +--------+                                           +---------------+
  |        |--(A)------- Authorization Grant --------->|               |
  |        |                                           |               |
  |        |<-(B)----------- Access Token -------------|               |
  |        |               & Refresh Token             |               |
  |        |                                           |               |
  |        |                            +----------+   |               |
  |        |--(C)---- Access Token ---->|          |   |               |
  |        |                            |          |   |               |
  |        |<-(D)- Protected Resource --| Resource |   | Authorization |
  | Client |                            |  Server  |   |     Server    |
  |        |--(E)---- Access Token ---->|          |   |               |
  |        |                            |          |   |               |
  |        |<-(F)- Invalid Token Error -|          |   |               |
  |        |                            +----------+   |               |
  |        |                                           |               |
  |        |--(G)----------- Refresh Token ----------->|               |
  |        |                                           |               |
  |        |<-(H)----------- Access Token -------------|               |
  +--------+           & Optional Refresh Token        +---------------+
```

说明：

- （A）通过一种授权的方式，一般是授权码模式。
- （B）通过授权服务器获取 Access Token 和 Refresh Token。
- （C）客户端带上 Access Token 去访问资源。
- （D）Access Token 在正常的有效期内可以拿到受保护的资源。
- （E）过了一段时间 Access Token 失效了，去访问资源。
- （F）资源服务验证 Token 过期了就返回验证错误。
- （G）客户端发现错误后，可以把刷新令牌发送到授权服务器，请求刷新。
- （H）返回新的 Access Token，也可以返回新的刷新令牌。

### 授权流程渠道(channels)

![14][14]

渠道划分：

1. 没有资源服务器参与的称为前端渠道。
2. 没有资源拥有者参与的称为后端渠道。

### 客户应用类型

![15][15]

大致分为两类：

1. 公开应用：主要针对单页SAP，原生APP，这种场景就不能把客户的凭证信息存在着上面，比如客户的密码，一般只存公开的标识。
2. 私密应用：服务器端的应用，比较安全是私密的，这里就能存储比较私密的信息。

### 四种OAuth 2.0授权类型(Flows)总结

#### 授权码 Authorization Code

- 通过前端渠道客户获取授权码；
- 通过后端渠道，客户使用 authorization；
- code去交换access Token和可选的refresh token；
- 假定资源拥有者和客户在不同的设备上；
- 最安全的流程，因为令牌不会传递经过user-agent；

#### 简化Implicit

- 适用于公开的浏览器单页应用；
- Access Token直接从授权服务器返回（只有前端渠道）；
- 不支持refresh tokens；
- 假定资源所有者和公开客户应用在同一个设备上；
- 最容易受安全攻击；

#### 用户名密码Resource Owner Credentials

- 使用用户名密码登录的应用，例如桌面App；
- 使用用户名/密码作为授权方式从授权服务器上获取access token；
- 一般不支持refresh tokens；
- 假定资源拥有者和公开客户在相同设备上；

#### 客户端凭证Client Credentials

- 适用于服务器间通信场景，机密客户代表它自己或者一个用户；
- 只有后端渠道，使用客户凭证获取一个access token；
- 因为客户凭证可以使用对称或者非对称加密，该方式支持共享密码或者证书；

### 授权类型选择流程

![16][16]

### 授权服务器组成

![17][17]

主要是由四个端点组成：

1. 授权端点：客户拿到 Token 之前需要授权。
2. Token 端点：经过授权以后，可以通过 Token 端点拿到 Token。
3. 校验端点：主要是资源服务器，拿到 Token 后要校验是否合法。
4. 吊销端点：有时候需要显示的去吊销 Token，比如发现这个用户在干坏事情。

## Spring Security OAuth2架构

- http://terasolunaorg.github.io/guideline/5.3.0.RELEASE/en/Security/OAuth.html

![18][18]

## 环境

- JDK：1.8
- Spring Boot：2.2.4 RELEASE
- Spring Cloud：Hoxton.SR

## 创建 oauth2-server 模块

oauth2-server 模块作为认证服务器来使用，在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-oauth2</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

在 application.yml 中进行配置：

```yaml
server:
  port: 9401
spring:
  application:
    name: oauth2-service
```

添加 UserService 实现 UserDetailsService 接口，用于加载用户信息：

```java
@Service
public class UserService implements UserDetailsService {
    private List<User> userList;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostConstruct
    public void initData() {
        String password = passwordEncoder.encode("123456");
        userList = new ArrayList<>();
        userList.add(new User("leo", password, AuthorityUtils.commaSeparatedStringToAuthorityList("admin")));
        userList.add(new User("leo2", password, AuthorityUtils.commaSeparatedStringToAuthorityList("client")));
        userList.add(new User("leo3", password, AuthorityUtils.commaSeparatedStringToAuthorityList("client")));
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        List<User> findUserList = userList.stream().filter(user -> user.getUsername().equals(username)).collect(Collectors.toList());
        if (!CollectionUtils.isEmpty(findUserList)) {
            return findUserList.get(0);
        } else {
            throw new UsernameNotFoundException("用户名或密码错误");
        }
    }
}
```

添加认证服务器配置，使用 @EnableAuthorizationServer 注解开启：

```java
/**
 * 认证服务器配置
 */
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig extends AuthorizationServerConfigurerAdapter {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    /**
     * 使用密码模式需要配置
     */
    @Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) {
        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userService);
    }

    @Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
        clients.inMemory()
                .withClient("admin")//配置client_id
                .secret(passwordEncoder.encode("admin123456"))//配置client_secret
                .accessTokenValiditySeconds(3600)//配置访问token的有效期
                .refreshTokenValiditySeconds(864000)//配置刷新token的有效期
                .redirectUris("http://www.baidu.com")//配置redirect_uri，用于授权成功后跳转
                .scopes("all")//配置申请的权限范围
                .authorizedGrantTypes("authorization_code","password");//配置grant_type，表示授权类型
    }
}
```

添加资源服务器配置，使用 @EnableResourceServer 注解开启：

```java
/**
 * 资源服务器配置
 */
@Configuration
@EnableResourceServer
public class ResourceServerConfig extends ResourceServerConfigurerAdapter {

    @Override
    public void configure(HttpSecurity http) throws Exception {
        http.authorizeRequests()
                .anyRequest()
                .authenticated()
                .and()
                .requestMatchers()
                .antMatchers("/user/**");//配置需要保护的资源路径
    }
}
```

添加 SpringSecurity 配置，允许认证相关路径的访问及表单登录：

```java
/**
 * SpringSecurity配置
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    @Override
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }

    @Override
    public void configure(HttpSecurity http) throws Exception {
        http.csrf()
                .disable()
                .authorizeRequests()
                .antMatchers("/oauth/**", "/login/**", "/logout/**")
                .permitAll()
                .anyRequest()
                .authenticated()
                .and()
                .formLogin()
                .permitAll();
    }
}
```

添加需要登录的接口用于测试：

```java
@RestController
@RequestMapping("/user")
public class UserController {
    @GetMapping("/getCurrentUser")
    public Object getCurrentUser(Authentication authentication) {
        return authentication.getPrincipal();
    }
}
```

授权码模式使用：

1. 启动oauth2-server服务；
2. 在浏览器访问该地址进行登录授权：http://localhost:9401/oauth/authorize?response_type=code&client_id=admin&redirect_uri=http://www.baidu.com&scope=all&state=normal
3. 输入账号密码进行登录操作；
4. 登录后进行授权操作；
5. 之后浏览器会带着授权码跳转到我们指定的路径：https://www.baidu.com/?code=aTbEUP&state=normal
6. 使用授权码请求该地址获取访问令牌：http://localhost:9401/oauth/token

```bash
curl -X POST -u admin:admin123456 http://localhost:9401/oauth/token -H
"content-type: application/x-www-form-urlencoded" -d
"code=aTbEUP&grant_type=authorization_code&redirect_uri=http://www.baidu.com&scope=all"
```

案例响应：

```json
{
  "access_token": "f991749b-0e68-4908-a8f4-52d39a285ddb",
  "token_type": "bearer",
  "expires_in": 43199,
  "scope": "all"
}
```

7. 调用 API

```bash
curl -X GET http://localhost:9401/user/getCurrentUser -H "authorization: Bearer f991749b-0e68-4908-a8f4-52d39a285ddb"
```

密码模式使用：

使用密码请求该地址获取访问令牌：http://localhost:9401/oauth/token

```bash
curl -X POST -u admin:admin123456 http://localhost:9401/oauth/token -H
"content-type: application/x-www-form-urlencoded" -d
"grant_type=password&username=leo&password=123456&scope=all"
```

## 扩展

### 常见OAuth 2.0安全问题

![19][19]

### 跨站请求伪造 CSRF（Cross-site request forgery）

![20][20]

Spring Security 通过添加 State 参数来解决。

### OpenId Connect 简介

![21][21]

### 下一代微服务安全架构

#### 方案一

![22][22]

客户应用要访问微服务，要通过网关，网关有个 OAuth 过滤器，如果说你没有经过授权，会先把你导向到授权服务器上去登录获取 Access Token。

拿到 Access Token 后在访问微服务，经过网关，网关去授权服务器进行校验。校验成功后这里会转成JWT的 Token，因为 Access Token 是透明的不含任何信息的，为了缓解后面的微服务不需要再去授权服务器进行校验，这里换成支持自校验的JWT传递到后面的微服务。有些公司经过网关校验后其实到后台都不进行校验了。

#### 方案二

![23][23]

全程通过JWT进行无状态自校验，不需要通过授权服务集中校验，JWT中的一些敏感信息进行加密。但是这种方式缺少了集中式校验，不能进行吊销，需要等到JWT自然过期。

#### 方案三

![24][24]

这种方式用的比较多，给用户的还是 Access Token，网关会做 Access Token 跟JWT 的转换，但是中间会加入 Redis 缓存，来缓解授权服务器压力。那其实到后面并不一定要用JWT，可以直接传递用户的信息如用户ID到后面的微服务。

### 生产级部署

![25][25]

### OAuth2/OIDC开源产品

- Redhat Keycloak（Java）http://www.keycloak.org/
- Apereo CAS（Java）https://www.apereo.org/projects/cas/
- OpenId-Connect-Java-Spring-Server https://github.com/mitreid-connect/OpenID-Connect-Java-Spring-Server/
- OAuth2全家桶项目 https://github.com/newnil/oauth2-family-barrel
- Apache Oltu+Shiro实现OAuth2服务器 https://github.com/monkeyk/oauth2-shiro
- Using JWT with Spring Security OAuth https://github.com/Baeldung/spring-security-oauth

## 参考

- https://cloud.spring.io/spring-cloud-static/spring-cloud-security/2.2.1.RELEASE/reference/html/
- https://juejin.im/post/5dc013bae51d456e817cec30/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- https://www.manning.com/books/oauth-2-in-action/
- https://tools.ietf.org/html/rfc6749/
- https://medium.com/@darutk/the-simplest-guide-to-oauth-2-0-8c71bd9a15bb/
- http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html/

[1]: /images/java/spring-cloud-oauth2/1.jpg
[2]: /images/java/spring-cloud-oauth2/2.jpg
[3]: /images/java/spring-cloud-oauth2/3.jpg
[4]: /images/java/spring-cloud-oauth2/4.jpg
[5]: /images/java/spring-cloud-oauth2/5.jpg
[6]: /images/java/spring-cloud-oauth2/6.jpg
[7]: /images/java/spring-cloud-oauth2/7.jpg
[8]: /images/java/spring-cloud-oauth2/8.jpg
[9]: /images/java/spring-cloud-oauth2/9.jpg
[10]: /images/java/spring-cloud-oauth2/10.jpg
[11]: /images/java/spring-cloud-oauth2/11.jpg
[12]: /images/java/spring-cloud-oauth2/12.jpg
[13]: /images/java/spring-cloud-oauth2/13.jpg
[14]: /images/java/spring-cloud-oauth2/14.jpg
[15]: /images/java/spring-cloud-oauth2/15.jpg
[16]: /images/java/spring-cloud-oauth2/16.jpg
[17]: /images/java/spring-cloud-oauth2/17.jpg
[18]: /images/java/spring-cloud-oauth2/18.jpg
[19]: /images/java/spring-cloud-oauth2/19.jpg
[20]: /images/java/spring-cloud-oauth2/20.jpg
[21]: /images/java/spring-cloud-oauth2/21.jpg
[22]: /images/java/spring-cloud-oauth2/22.jpg
[23]: /images/java/spring-cloud-oauth2/23.jpg
[24]: /images/java/spring-cloud-oauth2/24.jpg
[25]: /images/java/spring-cloud-oauth2/25.jpg
