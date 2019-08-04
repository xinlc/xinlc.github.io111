---
title: 第一个Linux命令
date: 2018-03-23 10:24:00
categories: Linux
tags: 
  - linux
  - command

---
man命令是Linux下的帮助指令，通过man指令可以查看Linux中的指令帮助、配置文件帮助和编程帮助等信息。

## 命令格式
> 命令名称 [命令参数] [命令对象]   

注意：命令名称、命令参数、命令对象之间请用空格键分隔。
命令参数可以用长格式（完整的选项名称），也可以用短格式（单个字母的缩写），两者分别用--与-作为前缀。

<!--more-->

## 帮助命令
```bash
$ man man
```
选项
```
-a：在所有的man帮助手册中搜索；
-f：等价于whatis指令，显示给定关键字的简短描述信息；
-P：指定内容时使用分页程序；
-M：指定man手册搜索的路径。
```

man命令帮助信息的结构以及意义

|结构名称 |	代表意义|
|:------- |:-------|
|NAME	| 命令的名称|
|SYNOPSIS	| 参数的大致使用方法|
|DESCRIPTION |	介绍说明|
|EXAMPLES |	演示（附带简单说明）|
|OVERVIEW |	概述|
|DEFAULTS |	默认的功能|
|OPTIONS |	具体的可用选项（带介绍）|
|ENVIRONMENT	| 环境变量|
|FILES	 | 用到的文件|
|SEE ALSO |	相关的资料|
|HISTORY |	维护历史与联系方式|