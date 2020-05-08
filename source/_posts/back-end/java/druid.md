---
title: Druid 简单使用
date: 2020-05-07 18:45:00
categories: Java
tags:
	- Java
---

Druid 是一个数据库连接池，一个高性能、功能强大为监控而生的数据库连接池。

<!--more-->

## 什么是数据库连接池？

数据库连接是一种关键的有限的昂贵的资源，这一点在多用户的网页应用程序中体现得尤为突出。对数据库连接的管理能显著影响到整个应用程序的伸缩性和健壮性，影响到程序的性能指标。数据库连接池正是针对这个问题提出来的。数据库连接池负责分配、管理和释放数据库连接，它允许应用程序重复使用一个现有的数据库连接，而不是再重新建立一个；释放空闲时间超过最大空闲时间的数据库连接来避免因为没有释放数据库连接而引起的数据库连接遗漏。这项技术能明显提高对数据库操作的性能。

## 常用配置

DruidDataSource大部分属性都是参考DBCP，druid的常用配置项如下：

| 配置    | 缺省值   | 说明  |
|:---------|:---------|:--------------|
| name  | 无  | 配置这个属性的意义在于，如果存在多个数据源，监控的时候可以通过名字来区分开来。如果没有配置，将会生成一个名字，格式是： `"DataSource-" + System.identityHashCode(this)` |
| jdbcUrl | 无 | 连接数据库的url，不同数据库不一样。例如： `jdbc:mysql://localhost:3306/druid_test` |
| username  | 无  | 连接数据库的用户名  |
| password | 无 | 连接数据库的密码。如果你不希望密码直接写在配置文件中，可以使用ConfigFilter。|
| driverClassName | 根据url自动识别  | 这一项可配可不配，如果不配置druid会根据url自动识别dbType，然后选择相应的driverClassName |
| initialSize  | 0  | 初始化时建立物理连接的个数。初始化发生在显示调用init方法，或者第一次getConnection时 |
| asyncInit | false | asyncInit是1.1.4中新增加的配置，如果有initialSize数量较多时，打开会加快应用启动时间 |
| maxActive | 8  | 最大连接池数量  |
| maxIdle | 8  | 已经不再使用，配置了也没效果 |
| minIdle  | 无  | 最小连接池数量  |
| maxWait  | 无   | 获取连接时最大等待时间，单位毫秒。配置了maxWait之后，缺省启用公平锁，并发效率会有所下降，如果需要可以通过配置useUnfairLock属性为true使用非公平锁。                                                 |
| poolPreparedStatements | false | 是否缓存preparedStatement，也就是PSCache。PSCache对支持游标的数据库性能提升巨大，比如说oracle。在mysql5.5以下的版本中没有PSCache功能，建议关闭掉。5.5及以上版本有PSCache，建议开启。|
| maxOpenPreparedStatements  | -1  | 要启用PSCache，必须配置大于0，当大于0时，poolPreparedStatements自动触发修改为true。在Druid中，不会存在Oracle下PSCache占用内存过多的问题，可以把这个数值配置大一些，比如说100。|
| validationQuery | 无  | 用来检测连接是否有效的sql，要求是一个查询语句。如果validationQuery为null，testOnBorrow、testOnReturn、testWhileIdle都不会其作用。在mysql中通常为 `select 'x'` |
| testOnBorrow  | false | 申请连接时执行validationQuery检测连接是否有效，做了这个配置会降低性能。 |
| testOnReturn | false  | 归还连接时执行validationQuery检测连接是否有效，做了这个配置会降低性能。|
| testWhileIdle  | false   | 建议配置为true，不影响性能，并且保证安全性。申请连接的时候检测，如果空闲时间大于timeBetweenEvictionRunsMillis，执行validationQuery检测连接是否有效。|
| timeBetweenEvictionRunsMillis | 无  | 有两个含义：1. Destroy线程会检测连接的间隔时间。2. testWhileIdle的判断依据，详细看testWhileIdle属性的说明。|
| numTestsPerEvictionRun  | 无 | 不再使用，一个DruidDataSource只支持一个EvictionRun。 |
| minEvictableIdleTimeMillis | 无  | Destory线程中如果检测到当前连接的最后活跃时间和当前时间的差值大于minEvictableIdleTimeMillis，则关闭当前连接。 |
| connectionInitSqls | 无| 物理连接初始化的时候执行的sql。 |
| exceptionSorter | 根据dbType自动识别 | 当数据库抛出一些不可恢复的异常时，抛弃连接。|
| filters | 无  | 属性类型是字符串，通过别名的方式配置扩展插件，常用的插件有：监控统计用的filter:stat，日志用的filter:log4j，防御sql注入的filter:wall。 |
| proxyFilters  | 无 | 类型是 `List<com.alibaba.druid.filter. Filter>` ，如果同时配置了filters和proxyFilters，是组合关系，并非替换关系。 |

## Spring Boot 2 集成 Druid

添加依赖：

``` xml
<dependency>
	<groupId>com.alibaba</groupId>
	<artifactId>druid-spring-boot-starter</artifactId>
	<version>1.1.22</version>
</dependency>
```

Druid 配置：

``` java
import com.alibaba.druid.pool.DruidDataSource;
import com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceBuilder;
import com.alibaba.druid.support.http.StatViewServlet;
import com.alibaba.druid.support.http.WebStatFilter;
import com.alibaba.druid.support.spring.stat.DruidStatInterceptor;
import org.apache.ibatis.session.SqlSessionFactory;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.springframework.aop.support.DefaultPointcutAdvisor;
import org.springframework.aop.support.JdkRegexpMethodPointcut;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Scope;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import javax.servlet.Filter;
import javax.servlet.Servlet;
import javax.sql.DataSource;

/**
 * Druid 配置
 *
 * @author Leo
 * @date 2020.05.07
 */
@Configuration
@ConditionalOnProperty("spring.datasource.druid.initial-size")
public class DruidConfig {
	/**
	 * 因为默认是使用的java.sql.Datasource的类来获取属性的，有些属性datasource没有，
	 * 将所有前缀为spring.datasource下的配置项都加载DataSource中
	 */
	@Primary
	@Bean
	@ConfigurationProperties(prefix = "spring.datasource.druid")
	public DataSource druidDataSource() {
		return DruidDataSourceBuilder.create().build();
//		return new DruidDataSource();
	}

//	@Bean(name = "TransactionManager")
//	@Primary
//	public DataSourceTransactionManager dbTransactionManager() {
//		return new DataSourceTransactionManager(druidDataSource());
//	}
//
//	@Bean(name = "SqlSessionFactory")
//	@Primary
//	public SqlSessionFactory dbSqlSessionFactory(@Qualifier("druidDataSource") DataSource DataSource) throws Exception {
//		final SqlSessionFactoryBean sessionFactory = new SqlSessionFactoryBean();
//		sessionFactory.setDataSource(DataSource);
//		return sessionFactory.getObject();
//	}

	/**
	 * 配置监控服务器
	 * http://localhost:8080/druid/login.html
	 *
	 * @return 返回监控注册的servlet对象
	 */
	@Bean
	public ServletRegistrationBean<Servlet> statViewServlet() {
		// druid 监控的配置处理
		ServletRegistrationBean<Servlet> servletRegistrationBean = new ServletRegistrationBean<>(new StatViewServlet(), "/druid/*");
		// 添加IP白名单
//		servletRegistrationBean.addInitParameter("allow", "127.0.0.1");
		// 添加IP黑名单，当白名单和黑名单重复时，黑名单优先级更高
//		servletRegistrationBean.addInitParameter("deny", "127.0.0.1");
		// 添加控制台管理用户
		servletRegistrationBean.addInitParameter("loginUsername", "admin");
		servletRegistrationBean.addInitParameter("loginPassword", "admin");
		// 是否能够重置数据
		servletRegistrationBean.addInitParameter("resetEnable", "true");
		return servletRegistrationBean;
	}

	/**
	 * 配置web监控过滤器
	 *
	 * @return 返回过滤器配置对象
	 */
	@Bean
	public FilterRegistrationBean<Filter> webStatFilter() {
		FilterRegistrationBean<Filter> filterRegistrationBean = new FilterRegistrationBean<>(new WebStatFilter());
//		filterRegistrationBean.setFilter(new WebStatFilter());
		// 添加过滤规则
		// 所有请求进行监控处理
		filterRegistrationBean.addUrlPatterns("/*");

		// 忽略过滤格式
		filterRegistrationBean.addInitParameter("exclusions", "*.js,*.gif,*.jpg,*.png,*.css,*.ico,/druid/*,");

		// 配置profileEnable能够监控单个url调用的sql列表。
		filterRegistrationBean.addInitParameter("profileEnable", "true");

		// session 统计
		filterRegistrationBean.addInitParameter("sessionStatEnable", "true");
		// 配置principalSessionName，使得druid能够知道当前的session的用户是谁
		// 把其中的xxx.user修改为你user信息保存在session中的sessionName。
		filterRegistrationBean.addInitParameter("principalSessionName", "xxx.user");
//		 把其中的xxx.user修改为你user信息保存在cookie中的cookieName
		filterRegistrationBean.addInitParameter("principalCookieName", "xxx.user");
		return filterRegistrationBean;
	}

	/**
	 * 配置Druid关联spring监控 - 拦截器
	 */
	@Bean
	public DruidStatInterceptor druidStatInterceptor() {
		DruidStatInterceptor dsInterceptor = new DruidStatInterceptor();
		return dsInterceptor;
	}

	/**
	 * 配置Druid关联spring监控 - AOP 正则表达式配置切点
	 */
	@Bean
	@Scope("prototype")
	public JdkRegexpMethodPointcut druidStatPointcut() {
		JdkRegexpMethodPointcut pointcut = new JdkRegexpMethodPointcut();
//		pointcut.setPattern("com.mycompany.dao.*");
		pointcut.setPatterns("com.mycompany.service.*", "com.mycompany.*.service.*", "com.mycompany.dao.*");
		return pointcut;
	}

	/**
	 * 配置Druid关联spring监控 - AOP 通知
	 *
	 * @param druidStatInterceptor
	 * @param druidStatPointcut
	 */
	@Bean
	public DefaultPointcutAdvisor druidStatAdvisor(DruidStatInterceptor druidStatInterceptor, JdkRegexpMethodPointcut druidStatPointcut) {
		DefaultPointcutAdvisor defaultPointAdvisor = new DefaultPointcutAdvisor();
		defaultPointAdvisor.setPointcut(druidStatPointcut);
		defaultPointAdvisor.setAdvice(druidStatInterceptor);
		return defaultPointAdvisor;
	}
}
```

application.yml 配置：

``` yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/test?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=GMT%2B8&allowMultiQueries=true
    username: root
    password: root
    platform: mysql
    # 下面为连接池的补充设置，应用到上面所有数据源中
    type: com.alibaba.druid.pool.DruidDataSource
    # 初始化大小，最小，最大
    druid:
      initial-size: 1
      min-idle: 3
      max-active: 20
      # 配置获取连接等待超时的时间
      max-wait: 60000
      # 配置间隔多久才进行一次检测，检测需要关闭的空闲连接，单位是毫秒
      time-between-eviction-runs-millis: 60000
      # 配置一个连接在池中最小生存的时间，单位是毫秒
      min-evictable-idle-time-millis: 30000
      test-while-idle: true
      test-on-borrow: false
      test-on-return: false
      validation-query: SELECT 1
      # 打开PSCache，并且指定每个连接上PSCache的大小
      pool-prepared-statements: true
      max-pool-prepared-statement-per-connection-size: 20
      # 合并多个DruidDataSource的监控数据
      use-global-data-source-stat: true
      # 定期把监控数据输出到日志中
      # time-between-log-stats-millis: 300000
      # 配置监控过滤器
      filter:
        stat:
          enabled: true
          log-slow-sql: true
          slow-sql-millis: 500
          merge-sql: true
        wall:
         enabled: true
        slf4j:
          enabled: true
          statement-executable-sql-log-enable: true
      # 配置监控统计拦截的filters，去掉后监控界面sql无法统计，'wall'用于防火墙
      filters: stat,wall,slf4j
      # 通过connectProperties属性来打开mergeSql功能；慢SQL记录
      connection-properties: druid.stat.mergeSql=true;druid.stat.slowSqlMillis=2000
      # 是否启用StatFilter默认值true
#      aop-patterns=.*service.*
#       web-stat-filter:
#         enabled: true
#         url-pattern: /*
#         exclusions: "*.js,*.gif,*.jpg,*.png,*.css,*.ico,/druid/*"
#         session-stat-enable=false
#         principal-session-name=principal
#         principal-cookie-name=principal
#         session-stat-max-count: 1000
#         profile-enable: true
#       stat-view-servlet:
#         enabled: true
#         url-pattern: /druid/*
#         # IP 白名单，没有配置或者为空，则允许所有访问
#         allow: 127.0.0.1
#         # IP 黑名单，若白名单也存在，则优先使用
# #        deny: 127.0.0.1
#         # 允许清空统计数据
#         reset-enable:  true
#         login-username: admin
#         login-password: admin


logging:
  level:
    root: info
    org.springframework.boot.autoconfigure: error
    druid.sql.Statement: debug
```

访问：http://localhost:8080/druid/index.html 查看监控

## 参考

- [Druid 常见问题](https://github.com/alibaba/druid/wiki/%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)
- [DruidDataSource配置](https://github.com/alibaba/druid/wiki/DruidDataSource%E9%85%8D%E7%BD%AE)
- [Druid Spring Boot Starter](https://github.com/alibaba/druid/tree/master/druid-spring-boot-starter)
- [sql 防火墙配置](https://github.com/alibaba/druid/wiki/%E9%85%8D%E7%BD%AE-wallfilter)
- [日志配置](https://github.com/alibaba/druid/wiki/%E9%85%8D%E7%BD%AE_LogFilter)
