---
title: SpringBoot 之 Validator
date: 2019-12-21 11:27:00
categories: Java
tags:
  - java
  - validator
  - springBoot
---

## 什么是 Validator

`Bean Validation` 是 Java 定义的一套基于注解的数据校验规范，目前已经从`JSR 303`的1.0版本升级到`JSR 349`的1.1版本，再到`JSR 380`的2.0版本（2.0完成于2017.08），已经经历了三个版本 。在 `SpringBoot` 中已经集成在 `starter-web` 中，所以无需在添加其他依赖。

<!--more-->

## 注解介绍

### validator内置注解

|注解 | 详细信息 |
| :-------------- | :----------- |
|@Null | 被注释的元素必须为 null |
|@NotNull | 被注释的元素必须不为 null |
|@AssertTrue | 被注释的元素必须为 true|
|@AssertFalse | 被注释的元素必须为 false|
|@Min(value) | 被注释的元素必须是一个数字，其值必须大于等于指定的最小值|
|@Max(value) | 被注释的元素必须是一个数字，其值必须小于等于指定的最大值|
|@DecimalMin(value) | 被注释的元素必须是一个数字，其值必须大于等于指定的最小值|
|@DecimalMax(value) | 被注释的元素必须是一个数字，其值必须小于等于指定的最大值|
|@Size(max, min) | 被注释的元素的大小必须在指定的范围内|
|@Digits (integer, fraction) | 被注释的元素必须是一个数字，其值必须在可接受的范围内|
|@Past | 被注释的元素必须是一个过去的日期|
|@Future | 被注释的元素必须是一个将来的日期|
|@Pattern(value) | 被注释的元素必须符合指定的正则表达式|

### Hibernate Validator 附加的 constraint

|注解 | 详细信息 |
| :-------------- | :----------- |
|@Email | 被注释的元素必须是电子邮箱地址|
|@Length |被注释的字符串的大小必须在指定的范围内|
|@NotEmpty | 被注释的字符串的必须非空|
|@Range | 被注释的元素必须在合适的范围内|
|@NotBlank | 验证字符串非null，且长度必须大于0|

### 注意

* @NotNull 适用于任何类型被注解的元素必须不能与NULL
* @NotEmpty 适用于String Map或者数组不能为Null且长度必须大于0
* @NotBlank 只能用于String上面 不能为null, 调用trim()后，长度必须大于0

