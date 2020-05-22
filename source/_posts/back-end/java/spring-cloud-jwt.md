---
title: 微服务架构之安全认证：JWT 令牌和 SSO
date: 2020-03-10 20:09:00
categories: Java
tags:
  - MicroServices
  - SpringCloud
  - Security
---

上篇介绍到令牌是 OAuth2 核心的组件，令牌其实是分类的，之前的都是透明令牌或叫引用令牌。本章将介绍另一种自包含令牌 JWT（JSON WEB TOKEN）令牌，并结合 Spring Cloud Security 来使用。

<!--more-->

## 访问令牌的类型

### By reference token (透明令牌)

随机生成的字符串标识符，无法简单猜测授权服务器如何颁发和存储资源服务器必须通过后端渠道发送回 OAuth2 授权服务器的令牌检查端点，才能校验令牌是否有效，并获取 claims/scopes 等额外信息。

### By value token (自包含令牌)

授权服务器颁发的令牌，包含关于用户或者客户的元数据和声明(claims)通过检查签名，期望的颁发者(issuer)，期望的接收人 aud(audience)，或者 scope，资源服务器可以在本地校验令牌通常实现为签名的 JSON Web Tokens(JWT)。

## JWT 简介

JWT 是 JSON WEB TOKEN 的缩写，它是基于 RFC 7519 标准定义的一种可以安全传输的的 JSON 对象，由于使用了数字签名，所以是可信任和安全的。

### JWT 的组成

![1][1]

- JWT token 的格式：header.payload.signature，可以通过 [jwt.io](https://jwt.io) 网站校验；
- header 中用于存放签名的生成算法；
- payload 中用于存放数据，比如过期时间、用户名、用户所拥有的权限等，注意不要存敏感信息，比如用户ID，密码等，如果要存最好加密；
- signature 为以 header 和 payload 生成的签名，一旦 header 和 payload 被篡改，验证将失败；

JWT Header 和 Payload 信息是公开可见的，JWT 并不保证传输信息的保密性，但是它保证信息的可依赖和不可篡改性，是通过签名来实现的。

### JWT令牌类比签名支票

![2][2]

![3][3]

JWT 令牌很像签名支票，支票上有声明是谁颁发的，颁发给谁，金额是多少，还有签名，这个签名可以校验，一般无法伪造。

### JWT 优劣

优势：

- 紧凑轻量，尤其适合无线传输的场景；
- 对 Auth Server 压力比较小，客户端获取令牌后，资源服务器可以自校验，不需要再去到 Auth Server 进行集中校验；
- 简化 AuthServer 实现，一般无需对用户会话状态维护和管理；

不足：

- 无状态和吊销无法两全，如果有人在干坏事，无法在 Auth Server 上进行统一吊销，需要等到 JWT 自然过期（技术上可以实现，比如吊销时，授权服务器发通知消息，网关订阅吊销通知，请求经过网关做令牌验证时，网关看令牌是否已经吊销）。另外如果在 Auth Server 上更新了用户信息，相关的信息也必须等到旧的 JWT 令牌自然过期；
- 传输有开销，JWT 的大小会随着 Claims 声明的增多而增大，相应网络传输开销也会增大；

## 两种 JWT 流程

### HMAC 流程

![4][4]

首先有认证服务器，客户端，还有资源服务器（微服务），HMAC 这种流程 Auth Server 和 Resource Server 需要提前商定好用于签名的和解签的一个 Secret 。这种方式 Secret 要严格保密。

流程：

1. 用户向 Auth Server 发出登录请求。
2. Auth Server 校验登录用户名和密码，校验通过，生成 JWT 数据，并采用某种 HMAC 算法加上 Secret 进行签名，颁发给用户。
3. 客户端收到 JWT 一般会做本地存储，后续向 Resource Server 发出的 API 调用请求都会带上 JWT 令牌，一般采用请求头 Authorization: Bearer + JWT 方式。
4. Resource Server 取出 JWT 令牌，采用同样的 Secret 对 JWT 进行解签和校验，校验通过执行后续操作，不通过直接打打回。

### RSA 流程

![5][5]

RSA 总体流程跟 HMAC 流程差不多，不同之处是 Auth Server 在生成 JWT 的时候使用私钥进行签名，而在 Resource Server 进行校验令牌的时候使用公钥进行解签。比 HMAC 会更安全。

## Spring Cloud Security OAuth2 结合 JWT 使用

创建 oauth2-jwt-server 模块，该模块只是对 oauth2-server 模块的扩展。

oauth2-server 是把令牌存储在内存中的，这样如果部署多个服务，就会导致无法使用令牌的问题。Spring Cloud Security 中有两种存储令牌的方式可用于解决该问题，一种是使用 Redis 来存储，另一种是使用 JWT 来存储。

### 使用 Redis 存储令牌

添加在 Redis 中存储令牌的配置：

```java
/**
 * 使用 redis 存储 token 的配置
 */
@Configuration
public class RedisTokenStoreConfig {

    @Autowired
    private RedisConnectionFactory redisConnectionFactory;

    @Bean
    public TokenStore redisTokenStore (){
        return new RedisTokenStore(redisConnectionFactory);
    }
}
```

在认证服务器配置中指定令牌的存储策略为 Redis：

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

    @Autowired
    @Qualifier("redisTokenStore")
    private TokenStore tokenStore;

    /**
     * 使用密码模式需要配置
     */
    @Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) {
        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userService)
                .tokenStore(tokenStore); //配置令牌存储策略
    }
    //省略代码...
}
```

运行项目后使用密码模式来获取令牌，访问如下地址：http://localhost:9401/oauth/token

### 使用 JWT 存储令牌

添加使用JWT存储令牌的配置：

```java
/**
 * 使用 Jwt 存储 token 的配置
 */
@Configuration
public class JwtTokenStoreConfig {
    @Bean
    public TokenStore jwtTokenStore() {
        return new JwtTokenStore(jwtAccessTokenConverter());
    }

    @Bean
    public JwtAccessTokenConverter jwtAccessTokenConverter() {
        JwtAccessTokenConverter accessTokenConverter = new JwtAccessTokenConverter();
        accessTokenConverter.setSigningKey("test_key"); // 配置JWT使用的秘钥
        return accessTokenConverter;
    }
}
```

在认证服务器配置中指定令牌的存储策略为JWT：

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

    @Autowired
    @Qualifier("jwtTokenStore")
    private TokenStore tokenStore;
    @Autowired
    private JwtAccessTokenConverter jwtAccessTokenConverter;
    @Autowired
    private JwtTokenEnhancer jwtTokenEnhancer;

    /**
     * 使用密码模式需要配置
     */
    @Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) {
        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userService)
                .tokenStore(tokenStore) //配置令牌存储策略
                .accessTokenConverter(jwtAccessTokenConverter);
    }
    //省略代码...
}
```

运行项目后使用密码模式来获取令牌，访问如下地址：http://localhost:9401/oauth/token

### 扩展JWT中存储的内容

有时候我们需要扩展JWT中存储的内容，这里我们在JWT中扩展一个key为enhance，value为enhance info的数据。

继承TokenEnhancer实现一个JWT内容增强器：

```java
/**
 * Jwt内容增强器
 */
public class JwtTokenEnhancer implements TokenEnhancer {
    @Override
    public OAuth2AccessToken enhance(OAuth2AccessToken accessToken, OAuth2Authentication authentication) {
        Map<String, Object> info = new HashMap<>();
        info.put("enhance", "enhance info");
        ((DefaultOAuth2AccessToken) accessToken).setAdditionalInformation(info);
        return accessToken;
    }
}
```

创建一个JwtTokenEnhancer实例：

```java
/**
 * 使用Jwt存储token的配置
 */
@Configuration
public class JwtTokenStoreConfig {
    //省略代码...
    @Bean
    public JwtTokenEnhancer jwtTokenEnhancer() {
        return new JwtTokenEnhancer();
    }
}
```

在认证服务器配置中配置JWT的内容增强器：

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

    @Autowired
    @Qualifier("jwtTokenStore")
    private TokenStore tokenStore;
    @Autowired
    private JwtAccessTokenConverter jwtAccessTokenConverter;
    @Autowired
    private JwtTokenEnhancer jwtTokenEnhancer;

    /**
     * 使用密码模式需要配置
     */
    @Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) {
        TokenEnhancerChain enhancerChain = new TokenEnhancerChain();
        List<TokenEnhancer> delegates = new ArrayList<>();
        delegates.add(jwtTokenEnhancer); //配置JWT的内容增强器
        delegates.add(jwtAccessTokenConverter);
        enhancerChain.setTokenEnhancers(delegates);
        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userService)
                .tokenStore(tokenStore) //配置令牌存储策略
                .accessTokenConverter(jwtAccessTokenConverter)
                .tokenEnhancer(enhancerChain);
    }

    //省略代码...
}
```

运行项目后使用密码模式来获取令牌，之后对令牌进行解析，发现已经包含扩展的内容。

### Java中解析JWT中的内容

如果我们需要获取JWT中的信息，可以使用一个叫 [jjwt](https://github.com/jwtk/jjwt/) 的工具包或者使用 [auth0](https://github.com/auth0/auth0-java/) 提供的工具包。

在 pom.xml 中添加相关依赖：

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.1</version>
</dependency>
```

修改 UserController 类，使用 jjwt工具类来解析 Authorization 头中存储的JWT内容。

```java
@RestController
@RequestMapping("/user")
public class UserController {
    @GetMapping("/getCurrentUser")
    public Object getCurrentUser(Authentication authentication, HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String token = StrUtil.subAfter(header, "bearer ", false);
        return Jwts.parser()
                .setSigningKey("test_key".getBytes(StandardCharsets.UTF_8))
                .parseClaimsJws(token)
                .getBody();
    }
}
```

### 刷新令牌

在 Spring Cloud Security 中使用 OAuth2 时，如果令牌失效了，可以使用刷新令牌通过 refresh_token 的授权模式再次获取access_token。

只需修改认证服务器的配置，添加refresh_token的授权模式即可：

```java
/**
 * 认证服务器配置
 */
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig extends AuthorizationServerConfigurerAdapter {

    @Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
        clients.inMemory()
                .withClient("admin")
                .secret(passwordEncoder.encode("admin123456"))
                .accessTokenValiditySeconds(3600)
                .refreshTokenValiditySeconds(864000)
                .redirectUris("http://www.baidu.com")
                .autoApprove(true) //自动授权配置
                .scopes("all")
                .authorizedGrantTypes("authorization_code","password","refresh_token"); //添加授权模式
    }
}
```

使用刷新令牌模式来获取新的令牌，访问如下地址：http://localhost:9401/oauth/token

## Spring Cloud Security OAuth2 实现单点登录

单点登录（Single Sign On）指的是当有多个系统需要登录时，用户只需登录一个系统，就可以访问其他需要登录的系统而无需登录。

创建 oauth2-client 服务作为需要登录的客户端服务，使用 oauth2-jwt-server 服务作为认证服务，当我们在oauth2-jwt-server 服务上登录以后，就可以直接访问 oauth2-client 需要登录的接口。

在pom.xml中添加相关依赖：

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
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.9.1</version>
</dependency>
```

在application.yml中进行配置：

```yaml
server:
  port: 9501
  servlet:
    session:
      cookie:
        name: OAUTH2-CLIENT-SESSIONID #防止Cookie冲突，冲突会导致登录验证不通过
oauth2-server-url: http://localhost:9401
spring:
  application:
    name: oauth2-client
security:
  oauth2: #与oauth2-server对应的配置
    client:
      client-id: admin
      client-secret: admin123456
      user-authorization-uri: ${oauth2-server-url}/oauth/authorize
      access-token-uri: ${oauth2-server-url}/oauth/token
    resource:
      jwt:
        key-uri: ${oauth2-server-url}/oauth/token_key
```

在启动类上添加@EnableOAuth2Sso注解来启用单点登录功能：

```java
@EnableOAuth2Sso
@SpringBootApplication
public class Oauth2ClientApplication {
    public static void main(String[] args) {
        SpringApplication.run(Oauth2ClientApplication.class, args);
    }
}
```

添加接口用于获取当前登录用户信息：

```java
@RestController
@RequestMapping("/user")
public class UserController {
    @GetMapping("/getCurrentUser")
    public Object getCurrentUser(Authentication authentication) {
        return authentication;
    }
}
```

修改 oauth2-jwt-server 模块中的 AuthorizationServerConfi g类，将绑定的跳转路径为 http://localhost:9501/login，并添加获取秘钥时的身份认证：

```java
/**
 * 认证服务器配置
 */
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig extends AuthorizationServerConfigurerAdapter {
    //以上省略一堆代码...
    @Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
        clients.inMemory()
                .withClient("admin")
                .secret(passwordEncoder.encode("admin123456"))
                .accessTokenValiditySeconds(3600)
                .refreshTokenValiditySeconds(864000)
//                .redirectUris("http://www.baidu.com")
                .redirectUris("http://localhost:9501/login") //单点登录时配置
                .scopes("all")
                .authorizedGrantTypes("authorization_code","password","refresh_token");
    }

    @Override
    public void configure(AuthorizationServerSecurityConfigurer security) {
        security.tokenKeyAccess("isAuthenticated()"); // 获取密钥需要身份认证，使用单点登录时必须配置
    }
}
```

- 启动 oauth2-client 服务和 oauth2-jwt-server 服务；
- 访问客户端需要授权的接口http://localhost:9501/user/getCurrentUser会跳转到授权服务的登录界面；
- 进行登录操作后跳转到授权页面；
- 授权后会跳转到原来需要权限的接口地址，展示登录用户信息；

如果需要跳过授权操作进行自动授权可以添加autoApprove(true)配置：

```java
/**
 * 认证服务器配置
 */
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig extends AuthorizationServerConfigurerAdapter {
    //以上省略一堆代码...
    @Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
        clients.inMemory()
                .withClient("admin")
                .secret(passwordEncoder.encode("admin123456"))
                .accessTokenValiditySeconds(3600)
                .refreshTokenValiditySeconds(864000)
//                .redirectUris("http://www.baidu.com")
                .redirectUris("http://localhost:9501/login") //单点登录时配置
                .autoApprove(true) //自动授权配置
                .scopes("all")
                .authorizedGrantTypes("authorization_code","password","refresh_token");
    }
}
```

### oauth2-client 添加权限校验

添加配置开启基于方法的权限校验：

```java
/**
 * 在接口上配置权限时使用
 */
@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true)
@Order(101)
public class SecurityConfig extends WebSecurityConfigurerAdapter {
}
```

在 UserController 中添加需要 admin 权限的接口：

```java
@RestController
@RequestMapping("/user")
public class UserController {
    @PreAuthorize("hasAuthority('admin')")
    @GetMapping("/auth/admin")
    public Object adminAuth() {
        return "Has admin auth!";
    }
}
```

- 访问需要admin权限的接口：http://localhost:9501/user/auth/admin
- 使用没有admin权限的帐号，比如leo2:123456获取令牌后访问该接口，会发现没有权限访问。

## 扩展

### SSO和CAS

单点登录（Single Sign On），简称为 SSO，是目前比较流行的企业业务整合的解决方案之一。SSO的定义是在多个应用系统中，用户只需要登录一次就可以访问所有相互信任的应用系统。为了解决第一个问题，即实现各信息系统之间的全面整合，集团公司引进了企业信息门户(EIP)，即将各种应用系统(诸如ERP、BPM、HR、OA、企业邮局等)、数据资源和互联网资源统一集到企业信息门户之下,根据每个用户使用特点和角色的不同,形成个性化的应用界面，并通过对事件和消息的处理、传输把用户有机地联系在一起。

CAS是Central Authentication Service的首字母缩写，Apereo CAS 是由耶鲁大学实验室2002年出的一个开源的统一认证服务。

刚开始名字叫Yale CAS。Yale CAS 1.0的目标只是一个单点登录的系统，随着慢慢用开，功能就越来越多了，2.0就提供了多种认证的方式。目前版本为6.0

2004年12月，CAS转成JASIG(Java Administration Special Interesting Group)的一个项目，项目也随着改名为 JASIG CAS，这就是为什么现在有些CAS的链接还是有jasig的字样。

2012年，JASIG跟Sakai基金会合并，改名为Apereo基金会，所有CAS也随着改名为Apereo CAS.

CAS Enterprise Single Sign-On：

- Spring Webflow/Spring Boot Java server component.
- 可拔插认证支持 (LDAP, Database, X.509, SPNEGO, JAAS, JWT, RADIUS, MongoDb, etc)
- 多种协议支持 (CAS, SAML, WS-Federation, OAuth2, OpenID, OpenID Connect, REST)
- 通过各种提供商支持多因素身份验证 (Duo Security, FIDO U2F, YubiKey, Google Authenticator, Microsoft Azure, Authy etc)
- 支持外部提供者的委托认证，例如： ADFS, Facebook, Twitter, SAML2 IdPs, etc.
- Built-in support for password management, notifications, terms of use and impersonation.
- Support for attribute release including user consent.
- 实时监控和跟踪应用程序行为，统计信息和日志。
- 用特定的认证策略管理和注册客户端应用程序和服务。
- 跨平台的客户端支持 (Java, .Net, PHP, Perl, Apache, etc).
- Integrations with InCommon, Box, Office365, ServiceNow, Salesforce, Workday, WebAdvisor, Drupal, Blackboard, Moodle, Google Apps, etc.

从结构上看，CAS 包含两个部分： CAS Server 和 CAS Client。CAS Server 需要独立部署，主要负责对用户的认证工作（登录）；CAS Client 负责处理对客户端受保护资源的访问请求，需要登录时，重定向到 CAS Server。

SSO 仅仅是一种架构，一种设计，而 CAS 则是实现 SSO 的一种手段。两者是抽象与具体的关系。当然，除了 CAS 之外，实现 SSO 还有其他手段，比如简单的 cookie 、JWT等。

- https://github.com/apereo/cas

### CAS的单点登录和OAuth2的最大区别

CAS的单点登录时保障客户端的用户资源的安全  
oauth2则是保障服务端的用户资源的安全  

CAS客户端要获取的最终信息是，这个用户到底有没有权限访问我（CAS客户端）的资源。  
oauth2获取的最终信息是，我（oauth2服务提供方）的用户的资源到底能不能让你（oauth2的客户端）访问  

CAS的单点登录，资源都在客户端这边，不在CAS的服务器那一方。  
用户在给CAS服务端提供了用户名密码后，作为CAS客户端并不知道这件事。  
随便给客户端个ST，那么客户端是不能确定这个ST是用户伪造还是真的有效，所以要拿着这个ST去服务端再问一下，这个用户给我的是有效的ST还是无效的ST，是有效的我才能让这个用户访问。  

oauth2认证，资源都在oauth2服务提供者那一方，客户端是想索取用户的资源。  
所以在最安全的模式下，用户授权之后，服务端并不能直接返回token，通过重定向送给客户端，因为这个token有可能被黑客截获，如果黑客截获了这个token，那用户的资源也就暴露在这个黑客之下了。  
于是聪明的服务端发送了一个认证code给客户端（通过重定向），客户端在后台，通过https的方式，用这个code，以及另一串客户端和服务端预先商量好的密码，才能获取到token和刷新token，这个过程是非常安全的。  
如果黑客截获了code，他没有那串预先商量好的密码，他也是无法获取token的。这样oauth2就能保证请求资源这件事，是用户同意的，客户端也是被认可的，可以放心的把资源发给这个客户端了。  

所以cas登录和oauth2在流程上的最大区别就是，通过ST或者code去认证的时候，需不需要预先商量好的密码。

- OAuth2: 解决的是不同的企业之间的登录，本质是授权（当然它也能实现SSO，不需要资源服务器就可以了）。  
- SSO: 是解决企业内部的一系列产品登录问题。

### 网站安全认证架构演进

这里以假想的 MyStore 互联网公司来介绍网站安全认证架构是如何演进的，以及面向微服务安全认证是如何演进的。

安全认证基本概念：

- Authentication（认证）：识别你是谁，在网站上识别某个用户是否是注册过的合法用户；
- Authorization（授权）：授权你能做什么，具有什么权限，比如网站有 admin 和 普通 user 两种角色，那网站管理的功能只有 admin 能做，一般的用户不能做。授权一般在认证之后进行。
- Session （会话）：是用户登录状态的一种存储机制，由于HTTP协议是无状态的，一个请求和下一个请求是相互独立互不关联的，如何能实现下一个请求认识是这次用户发起的呢？这个就需要服务器端的 Session 和浏览器端的 Cookie 来共同实现。

#### Auth V1 认证阶段

![6][6]

我们把时间推回大致 2006 年左右，假设有 MyStore 互联网电商初创公司。这个时间点公司的主要目标是快速上线 V1 版本的网站，快速抢占市场和验证业务模式，V1 版本的安全认证就如图上所示。

V1 是经典的单块架构，传统的安全认证是基于服务器端的 Session 和浏览器端的 Cookie 来共同实现。用户登录成功后，服务器会将用户信息存储到 Session（可以理解为 Hash 表）中添加一条记录，Session ID 和对应的用户信息。返回成功信息给浏览器，同时会把 Session ID 以 Cookie 的形式种到客户端浏览器当中。

#### Auth V1 访问阶段

![7][7]

当用户登录完，访问服务的时候，浏览器会自动将 Session ID 以 Cookie 的形式发送到服务器端，服务就可以通过 Session ID 获取对应的用户信息，进行安全认证。

#### Auth V1.1 Sticky Session

![8][8]

网站不断业务不断扩大，这个时候架构改为集群模式。集群模式中 V1 版本会有一个 Bug，就是用户会间歇性掉线，经过调试分析发现用户的 Session 信息只在登录过的服务器存在，其他服务器没有。由于是集群模式，前置会有个负载均衡器，同一个用户的请求有可能落到不同的服务器上，这就导致了用户会间歇性掉线。

针对这个问题解决办法是 Sticky Session（粘性会话），顾名思义就是把一个用户的会话黏住在一台服务器上，粘性会话一般通过负载均衡器来实现，原理就是负载截获用户的请求，并且记录 Session ID 和后台服务器的映射关联，保证某个用户在会话有效期间和一个后台服务器绑定。

三年过去了，时间来到了 2009 年，MyStore 的用户量的不断增长，逐渐暴露出了 V1.1 版本的稳定性和扩展性的问题，这些问题还是由粘性会话造成的。

稳定性问题：粘性会话会将用户绑定到某个服务器上，如果我们要对这个服务器进行正常的升级或部署，或者这个服务器本身出现了问题宕机，对于绑定到这台服务器上的用户会话都会瞬间消失，必须重新登录，造成用户体验差。实际还存在一个问题，一小波用户反映网站响应慢，原因是这个台服务器慢，导致这波用户响应时间都慢。

扩展性问题：粘性会话在负载和服务器上都保存了状态，整体是一种有状态的架构，随着流量的增长，这些状态会给负载和服务器带来一些压力。和无状态系统相比，这种比较难以扩展。

#### Auth V1.5 Centralized Session

![9][9]

基于V1.1问题，有几种解决方案：

会话同步复制：让会话数据在服务器之间进行同步复制，每个服务器上的会话都会实时复制到集群中的其他服务器上。这个技术可以解决稳定性问题，也不需要用粘性会话，但是会带来复杂性，整个服务器集群之间需要引入复杂的状态同步协议，整体性能和扩展性反而会降低。

无状态会话：Session 用户数据不存在服务器上，存在客户端上。但是这种不能存敏感信息，而且客户端 Cookie 是有大小限制的（一般是 4KB）。

第三种方案 V1.5 架构集中状态会话存储，一般采用高性能的 Redis 缓存。这种方案不需要粘性会话，服务器也不需要存储 Session，负载和服务器都可以水平扩展。Redis 也支持集群扩展 HA 高可用。

这种方案虽然是单块时代发展出来的技术，但是这些背后的思想是后面微服务安全认证的基础。

#### 微服务认证授权挑战

![10][10]

一晃五年时间过去了，时间来到了 2014 年，这期间 MyStore 的业务量经历了爆发式的增长，原来的单块架构已经跟不上业务和团队规模扩张的节奏了，期间互联网技术也发生了很大的变化，一方面微服务架构开始兴起，另一方面应用的形态开始变的多样化，无线应用，H5 应用等。

架构师团队决定对传统的单块应用进行解耦拆分，逐步改造成能为能够支持业务更加灵活扩展的微服务架构，同时能够支持前端的各种形态。安全认证架构的改造是微服务的基础，但是微服务的颗粒度很细给安全认证带来了一些挑战如下：

第一个：后台应用和服务众多，如何对每个应用进行认证和鉴权，传统的用户名密码和 Session 机制已经不适用于微服务机构。  
第二个：前端的形态很多，如果每个都搞一套登录认证显然成本高难以扩展。
第三个：为了避免不必要的重复登录，提升用户体验，需要考虑单点登录（SSO），这是微服务的需求。

#### Auth V3.0 Auth Service + Token

![11][11]

V3.0 最大的变化是把登录和认证抽取出一个独立的服务 Auth Service，这个服务统一处理登录和认证。另外还引入令牌（Token）作为服务调用和认证的主要凭证，V3.0 设计中采用了透明令牌或引用令牌（无意义的随机字符串）跟 Session ID 类似。

V3.0 把登录认证、会话管理、令牌颁发、校验这些职责统统封装在这个独立的 Auth Service 当中，其他所有的服务都共用这个服务，不需要单独开发登录认证功能，经过扩展还能实现 SSO。但是这种架构也会有一个问题，就是每个微服务都会实现部分认证鉴权的逻辑，主要在第四步，后台服务会去 Auth Service 发起验证 Token 的请求，如果通过继续执行，否则会做拒绝的业务处理。这就给微服务的开发方引入复杂性，使得无法聚焦于业务逻辑的开发，另叫如果叫鉴权逻辑分散在每个微服务当中，一方面会带来不规范很容易出错，另一方面也有潜在的安全风险，比方说有些开发人员忽略了令牌的校验，或者使用了老版本有漏洞的认证库，不容易规范容易出错。

#### Auth V3.5 Token + Gateway

![12][12]

为了解决以上问题，同时考虑到 MyStore 正在进行解耦拆分和微服务改造，正好要引入微服务网关。于是架构团队决定将认证鉴权的逻辑集中到网关上去做，V3.5 架构。

#### Auth V3.6 JWT + Gateway

![13][13]

V3.5 架构本身是一种集中状态的架构，是比较重的，客户端每次的请求打到网关上，都会去 Auth Service 进行认证。这种架构比较适合严格的安全认证场景，但是这种架构当网站访问量大的时候，对 Auth Service 的压力会较大，Auth Service 可能会成为性能瓶颈，需要严格的监控，做好 HA 并且需要按需扩容，成本比较高。业界还有一种比较轻量级的做法是基于 JWT 的方式无状态认证鉴权架构。

V3.6 架构和 V3.5 主要区别是 Auth Service 颁发出的令牌不是透明令牌，是 JWT 令牌自包含数据和签名的。因为 JWT 能自校验，所以在网关上不需要去 Auth Service 校验。这种架构性能比较高适用于大部分安全要求不太敏感的场景。

#### RBAC 参考权限模型

![14][14]

权限模式在不同的企业当中或业务中做法各不相同，这个是设计比较有特色可以参考。

这个模型实体有 User、App、Role、Group，另外两个是关联的。在这个模型中角色是挂在 App 上的，因为现在企业中的应用会很多，不同的 App 可能会有不同的角色。一个用户可不可以用某个 App 需要进行注册，通过 UserRegistration 进行关联，对于注册哪些 App 有哪些角色可以做哪些操作。用户也可以住在一个组里面 GroupMember，组也关联了 App 和 Role。

#### Auth 3.7 JWT + RBAC

![15][15]

Auth Service 在生成令牌的时候就可以问 RBAC Service 这个用户关联了哪些 App 或者哪些组，有哪些角色这些信息可以填充到 JWT 中。网关做初步的校验，到后面的微服务可以做进一步细致的鉴权的动作。

## 参考

- https://tools.ieft.org/html/rfc7519.html
- https://cloud.spring.io/spring-cloud-static/spring-cloud-security/2.2.1.RELEASE/reference/html/
- https://juejin.im/post/5dc2bec6f265da4d4f65bebe/
- https://www.manning.com/books/oauth-2-in-action/
- https://medium.com/@darutk/the-simplest-guide-to-oauth-2-0-8c71bd9a15bb/
- http://www.ruanyifeng.com/blog/2014/05/oauth_2_0.html/
- 《微服务架构实战》
- 《Spring Boot & Kubernetes 云原生微服务实践》
- 《从0开始学微服务》
- 《微服务设计》

[1]: /images/java/spring-cloud-jwt/1.jpg
[2]: /images/java/spring-cloud-jwt/2.jpg
[3]: /images/java/spring-cloud-jwt/3.jpg
[4]: /images/java/spring-cloud-jwt/4.jpg
[5]: /images/java/spring-cloud-jwt/5.jpg
[6]: /images/java/spring-cloud-jwt/6.jpg
[7]: /images/java/spring-cloud-jwt/7.jpg
[8]: /images/java/spring-cloud-jwt/8.jpg
[9]: /images/java/spring-cloud-jwt/9.jpg
[10]: /images/java/spring-cloud-jwt/10.jpg
[11]: /images/java/spring-cloud-jwt/11.jpg
[12]: /images/java/spring-cloud-jwt/12.jpg
[13]: /images/java/spring-cloud-jwt/13.jpg
[14]: /images/java/spring-cloud-jwt/14.jpg
[15]: /images/java/spring-cloud-jwt/15.jpg