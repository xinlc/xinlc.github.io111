---
title: 【异常】解决 java 读取 resource 目录下 excel 文件异常
date: 2020-01-09 09:17:00
categories: Java
tags:
  - java
  - exception
---


解决 java 读取 classpath 中的 resource 目录下的 excel 文件异常，classpath 之外的目录文件没有问题。

<!--more-->

## 环境

- spring-boot:2.2.2.RELEASE
- maven:3.6
- spring-boot-maven-plugin:2.1.6.RELEASE

## 异常

```java
com.alibaba.excel.exception.ExcelGenerateException: Create workbook failure
 at com.alibaba.excel.context.WriteContextImpl.<init>(WriteContextImpl.java:85)
 at com.alibaba.excel.write.ExcelBuilderImpl.<init>(ExcelBuilderImpl.java:35)
 at com.alibaba.excel.ExcelWriter.<init>(ExcelWriter.java:47)
 at com.alibaba.excel.write.builder.ExcelWriterBuilder.build(ExcelWriterBuilder.java:257)
 at com.zkyc.school.controller.storage.StorageController.writeExcel(StorageController.java:48)
 at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
 at sun.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
 at sun.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
 at java.lang.reflect.Method.invoke(Method.java:498)
 at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(InvocableHandlerMethod.java:190)
 at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:138)
 at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:104)
 at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandlerMethod(RequestMappingHandlerAdapter.java:892)
 at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:797)
 at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:87)
 at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:1039)
 at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:942)
 at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1005)
 at org.springframework.web.servlet.FrameworkServlet.doGet(FrameworkServlet.java:897)
 at javax.servlet.http.HttpServlet.service(HttpServlet.java:634)
```

```java
org.apache.poi.openxml4j.exceptions.NotOfficeXmlFileException: No valid entries or contents found, this is not a valid OOXML (Office Open XML) file
```

## 原因

maven 会对 resource 下的配置文件进行一次 filter 并重新编码, 就是这个过程导致了 excel 文件损坏, 只要将指定配置文件配置为不需要进行filter 重编码即可。

## 解决

### 使用 spring-boot-maven-plugin 插件解决如下

```xml
<build>
      <finalName>${project.artifactId}</finalName>
      <plugins>
          <plugin>
              <groupId>org.springframework.boot</groupId>
              <artifactId>spring-boot-maven-plugin</artifactId>
              <version>2.1.6.RELEASE</version>
              <executions>
                  <execution>
                      <goals>
                          <goal>repackage</goal>
                      </goals>
                  </execution>
              </executions>
          </plugin>
      </plugins>
      <resources>
          <resource>
              <directory>src/main/java</directory>
              <includes>
                  <include>**/*.xml</include>
              </includes>
          </resource>
          <resource>
              <directory>src/main/resources</directory>
              <includes>
                  <include>**/*.yml</include>
                  <include>**/*.properties</include>
              </includes>
              <filtering>true</filtering>
          </resource>
          <resource>
              <directory>src/main/resources</directory>
              <includes>
                  <include>**/*.xlsx</include>
                  <include>**/*.xls</include>
              </includes>
              <filtering>false</filtering>
          </resource>
      </resources>
  </build>
```

### 使用 maven-resources-plugin 插件解决如下

```xml
<build>
 <plugins>
  <plugin>
   <groupId>org.apache.maven.plugins</groupId>
   <artifactId>maven-resources-plugin</artifactId>
   <configuration>
    <nonFilteredFileExtensions>
     <nonFilteredFileExtension>xlsx</nonFilteredFileExtension>
     <nonFilteredFileExtension>xls</nonFilteredFileExtension>
     <nonFilteredFileExtension>zip</nonFilteredFileExtension>
     <nonFilteredFileExtension>eot</nonFilteredFileExtension>
     <nonFilteredFileExtension>svg</nonFilteredFileExtension>
     <nonFilteredFileExtension>ttf</nonFilteredFileExtension>
     <nonFilteredFileExtension>woff</nonFilteredFileExtension>
     <nonFilteredFileExtension>woff2</nonFilteredFileExtension>
    </nonFilteredFileExtensions>
   </configuration>
  </plugin>
 </plugins>
<build>
```

## SpringBoot读取Resource下文件的几种方式

```java
// 第一种
ClassPathResource classPathResource = new ClassPathResource("excleTemplate/test.xlsx");
InputStream inputStream =classPathResource.getInputStream();

// 第二种
InputStream inputStream = Thread.currentThread().getContextClassLoader().getResourceAsStream("excleTemplate/test.xlsx");

// 第三种
InputStream inputStream = this.getClass().getResourceAsStream("/excleTemplate/test.xlsx");

// 第四种
File file = ResourceUtils.getFile("classpath:excleTemplate/test.xlsx");
InputStream inputStream = new FileInputStream(file);

```

前三种方法在开发环境(IDE中)和生产环境(linux部署成jar包)都可以读取到，第四种只有开发环境 时可以读取到，生产环境读取失败。

推测主要原因是springboot内置tomcat，打包后是一个jar包，因此通过文件读取获取流的方式行不通，因为无法直接读取压缩包中的文件，读取只能通过类加载器读取。

前三种都可以读取到其实殊途同归，直接查看底层代码都是通过类加载器读取文件流，类加载器可以读取jar包中的编译后的class文件，当然也是可以读取jar包中的文件流了。

## 参考

- [FileInputStream vs ClassPathResource vs getResourceAsStream and file integrity](https://stackoverflow.com/questions/9840631/fileinputstream-vs-classpathresource-vs-getresourceasstream-and-file-integrity)
- [Maven Filtering](http://maven.apache.org/plugins/maven-resources-plugin/examples/filter.html)
- [SpringBoot读取Resource下文件的几种方式](https://www.jianshu.com/p/7d7e5e4e8ae3)
