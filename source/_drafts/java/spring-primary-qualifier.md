---
title: Spring的@Primary和@Qualifier注解解决一个接口多个实现的注入问题
date: 2020-03-03 13:46:00
categories: Java
tags:
  - Java
  - Spring
---

Spring中提供了@Primary和@Qualifier注解来解决一个接口多个实现的注入问题。

<!--more-->

## @Primary注解

Spring中有提供一个@Primary注解，具体的作用是在一个接口有多个实现类的情况下，会默认选择其中一种实现，帮助Spring对象的正常注入。

比如说现在有一个接口UserService，它有两个实现类UserServiceImpl1和UserServiceImpl2，根据依赖倒置的原则，在Spring中注入的对象应该是接口，由接口去调用具体的实现。

```java
// 接口
public interface UserService {
    String getUserName();
}
```

```java
// 实现1
@Service("userServiceImpl1")
public class UserServiceImpl1 implements UserService{
    public String getUserName() {
        return "张三";
    }
}
```

```java
// 实现2
@Service("userServiceImpl2")
public class UserServiceImpl1 implements UserService {
    public String getUserName() {
        return "李四";
    }
}
```

```java
// 调用者注入接口对象
@Service("loginServiceImpl")
public class LoginServiceImpl implements LoginService {
    @Autowired
    private userService; // 通过接口注入实现

    public void getLoginUser() {
        System.out.pringln("当前登录的用户是：" + userSerivce.getUserName());
    }
}
```

那么现在就有一个问题，因为Spring注入对象的时候默认是根据类型Type来自动注入的，在有两个实现的情况下，Spring无法根据类型选择到底注入哪一个，即接口不知道该调用哪个实现，就会产生检查异常，导致编译不通过。这时候就可以用@Primary来解决这个问题。

```java
// 实现2
@Primary
@Service("userServiceImpl2")
public class UserServiceImpl1 implements UserService {
    public String getUserName() {
        return "李四";
    }
}
```

用@Primary注解来告诉Spring在不知道该选哪一个具体实现的时候选哪一个。

这个注解可以用在模块拆分的场景。比如说有一个模块A，有一个模块B，模块A和模块B之间通过接口模块进行交互。通过在接口模块中定义接口，模块B实现这个接口，模块A调用这个接口（注入）。这时候，如果把B模块要拆掉不要，那么A模块中注入的时候就找不到具体的实现，就会报检查异常。这时候，可以在接口模块中添加默认实现类，然后在B模块的真正实现类上添加@Primary注解，那么当有B模块的时候就会调用B模块中的实现，没有的话就调用接口模块中的默认实现，也就实现了模块之间的解耦。

## @Qualifier注解

Spring也提供一个@Qualifier注解来解决实现冲突的问题。

```java
// 实现1
@Service("userServiceImpl1")
@Qualifier("userServiceImpl1")
public class UserServiceImpl1 implements UserService{
    public String getUserName() {
        return "张三";
    }
}
```

```java
// 实现2
@Service("userServiceImpl2")
@Qualifier("userServiceImpl2")
public class UserServiceImpl1 implements UserService {
    public String getUserName() {
        return "李四";
    }
}
```

```java
// 调用者注入接口对象
@Service("loginServiceImpl")
public class LoginServiceImpl implements LoginService {
    @Autowired
    @Qualifier("userServiceImpl2")
    private userService; // 通过接口注入实现
    
    public void getLoginUser() {
        System.out.pringln("当前登录的用户是：" + userSerivce.getUserName());
    }
}
``

通过在实现类和注入调用上使用@Qualifier注解可以调用到具体实现，相当于一种标识机制。
