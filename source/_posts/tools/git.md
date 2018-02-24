---
layout: post
title: Git 常用命令
date: 2017-05-13 17:07:21
categories: 工欲善其事必先利其器
tags:
  - linux
  - git
---

## Git vs SVN
Git和SVN最大区别是`Git`是分布式版本控制，`SVN`是集中式版本控制。

### SVN优缺点
1. 优点:
  1. 易于管理，集中式服务器更能保证安全性。 
  2. 代码一致性非常高。 
  3. 适合开发人数不多的项目开发。 
2. 缺点:
  1. 服务器压力太大，数据库容量暴增。 
  2. 如果不能连接到服务器上，基本上不可以工作，如果服务器不能连接上，就不能提交，还原，对比等等。 
  3. 不适合开源开发（开发人数非常非常多)。
<!--more-->
### Git优缺点
1. 优点:
  1. 适合分布式开发，强调个体。 
  2. 公共服务器压力和数据量都不会太大。 
  3. 速度快、灵活。 
  4. 任意两个开发者之间可以很容易的解决冲突。 
  5. 离线工作。 
2. 缺点:
  1. 代码保密性差，一旦开发者把整个库克隆下来就可以完全公开所有代码和版本信息。

## 安装

### Mac系统使用[Homebrew](https://brew.sh)安装
```bash
brew install git
```
### Linux
```bash
sudo apt-get install git
```
### Windows
[git for windows](https://git-for-windows.github.io)

## 常用命令
```bash
$ git status               # 查看工作区文件状态
$ git add -A               # 添加工作区所有文件到暂存区
$ git checkout –- [file]   # 取消对文件的修改
$ git diff                 # 比较当前文件和暂存区文件差异 
$ git commit -m “注释内容”  # 提交代码到本地库
$ git commit --amend       # 修改最后一次提交的注释内容
$ git push origin [branch][: branch]  # 提交修改到远程库 
$ git pull origin [branch][: branch]  # 更新远程仓库代码到本地库
$ git merge [branch]      # 将brasnch分支合并到当前分支 加上 --no-ff 不使用Fast-Foward合并，这样可以生成merge提交
$ git merge [branch] --squash # 合并差异提交，需要执行commit
$ git merge --abort        # 取消merge
$ git log                  # 查看提交记录
$ git log -10              # 查看最近10次提交记录
$ git log --stat           # 查看提交统计信息
$ git log [file]           # 查看该文件每次提交记录
$ git log -p               # 查看每次详细修改内容的diff 
$ git reflog               # 显示操作记录（commit，reset等）
$ git show $id             # 显示某次提交的内容
$ git reset [file]         # 从暂存区恢复到工作文件
$ git reset --hard $id     # 恢复到$id提交，并撤销工作区所有修改
$ git checkout -b [branch] # 创建分支并切换
$ git branch -D [branch]   # 删除branch分支
$ git rebase -i HEAD~3     # 压缩历史/重写历 https://git-scm.com/book/zh/v2/Git-工具-重写历史
$ git archive              # 生成一个可供发布的压缩包
```

## 基本使用
大部分命令整理来自[阮一峰老师](http://www.ruanyifeng.com/blog/2015/12/git-cheat-sheet.html)
![](/images/tools/git/git-flow.png)
- Workspace：工作区
- Index / Stage：暂存区
- Repository：仓库区（或本地仓库）
- Remote：远程仓库

## 新建代码库
```bash
# 在当前目录新建一个Git代码库
$ git init

# 新建一个目录，将其初始化为Git代码库
$ git init [project-name]

# 下载一个项目和它的整个代码历史
$ git clone [url]
```

## 增加/删除文件
```bash
# 添加指定文件到暂存区
$ git add [file1] [file2] ...

# 添加指定目录到暂存区，包括子目录
$ git add [dir]

# 添加当前目录的所有文件到暂存区
$ git add .

# 添加每个变化前，都会要求确认
# 对于同一个文件的多处变化，可以实现分次提交
$ git add -p

# 删除工作区文件，并且将这次删除放入暂存区
$ git rm [file1] [file2] ...

# 停止追踪指定文件，但该文件会保留在工作区
$ git rm --cached [file]

# 改名文件，并且将这个改名放入暂存区
$ git mv [file-original] [file-renamed]
```

## 代码提交
```bash
# 提交暂存区到仓库区
$ git commit -m [message]

# 提交暂存区的指定文件到仓库区
$ git commit [file1] [file2] ... -m [message]

# 提交工作区自上次commit之后的变化，直接到仓库区
$ git commit -a

# 提交时显示所有diff信息
$ git commit -v

# 使用一次新的commit，替代上一次提交
# 如果代码没有任何新变化，则用来改写上一次commit的提交信息
$ git commit --amend -m [message]

# 重做上一次commit，并包括指定文件的新变化
$ git commit --amend [file1] [file2] ...
```

## 查看信息
```bash

# 显示有变更的文件
$ git status

# 显示当前分支的版本历史
$ git log

# 显示commit历史，以及每次commit发生变更的文件
$ git log --stat

# 搜索提交历史，根据关键词
$ git log -S [keyword]

# 显示某个commit之后的所有变动，每个commit占据一行
$ git log [tag] HEAD --pretty=format:%s

# 显示某个commit之后的所有变动，其"提交说明"必须符合搜索条件
$ git log [tag] HEAD --grep feature

# 显示某个文件的版本历史，包括文件改名
$ git log --follow [file]
$ git whatchanged [file]

# 显示指定文件相关的每一次diff
$ git log -p [file]

# 显示过去5次提交
$ git log -5 --pretty --oneline

# 显示分支merge关系图
$ git log --graph

# 显示所有提交过的用户，按提交次数排序
$ git shortlog -sn

# 显示指定文件是什么人在什么时间修改过
$ git blame [file]

# 显示暂存区和工作区的差异
$ git diff

# 显示暂存区和上一个commit的差异
$ git diff --cached [file]

# 显示工作区与当前分支最新commit之间的差异
$ git diff HEAD

# 显示两次提交之间的差异
$ git diff [first-branch]...[second-branch]

# 显示今天你写了多少行代码
$ git diff --shortstat "@{0 day ago}"

# 比较当前文件和暂存区文件差异
$ git diff [file]

 # 比较两次提交之间的差异
$ git diff [$id1] [$id2]

# 比较暂存区和版本库差异
$ git diff --staged

# 比较暂存区和版本库差异
$ git diff --cached

# 仅仅比较统计信息
$ git diff --stat

# 显示某次提交的元数据和内容变化
$ git show [commit]

# 显示某次提交发生变化的文件
$ git show --name-only [commit]

# 显示某次提交时，某个文件的内容
$ git show [commit]:[filename]

# 显示当前分支的最近几次提交
$ git reflog
```

## 分支操作
```bash
# 列出所有本地分支
$ git branch

# 列出所有远程分支
$ git branch -r

# 列出所有本地分支和远程分支
$ git branch -a

# 新建一个分支，但依然停留在当前分支
$ git branch [branch-name]

# 新建一个分支，并切换到该分支
$ git checkout -b [branch]

# 新建一个分支，指向指定commit
$ git branch [branch] [commit]

# 新建一个分支，与指定的远程分支建立追踪关系
$ git branch --track [branch] [remote-branch]

# 切换到指定分支，并更新工作区
$ git checkout [branch-name]

# 切换到上一个分支
$ git checkout -

# 建立追踪关系，在现有分支与指定的远程分支之间
$ git branch --set-upstream [branch] [remote-branch]

# 合并指定分支到当前分支
$ git merge [branch]

# 选择一个commit，合并进当前分支
$ git cherry-pick [commit]

# 删除分支
$ git branch -d [branch-name]

# 删除远程分支
$ git push origin --delete [branch-name]
$ git branch -dr [remote/branch]
```

## 标签
```bash
# 列出所有tag
$ git tag

# 新建一个tag在当前commit
$ git tag [tag]

# 新建一个tag在指定commit
$ git tag [tag] [commit]

# 删除本地tag
$ git tag -d [tag]

# 删除远程tag
$ git push origin :refs/tags/[tagName]

# 查看tag信息
$ git show [tag]

# 提交指定tag
$ git push [remote] [tag]

# 提交所有tag
$ git push [remote] --tags

# 新建一个分支，指向某个tag
$ git checkout -b [branch] [tag]
```

## 撤销
```bash

# 恢复暂存区的指定文件到工作区
$ git checkout [file]

# 恢复某个commit的指定文件到暂存区和工作区
$ git checkout [commit] [file]

# 恢复暂存区的所有文件到工作区
$ git checkout .

# 重置暂存区的指定文件，与上一次commit保持一致，但工作区不变
$ git reset [file]

# 重置暂存区与工作区，与上一次commit保持一致
$ git reset --hard

# 重置当前分支的指针为指定commit，同时重置暂存区，但工作区不变
$ git reset [commit]

# 重置当前分支的HEAD为指定commit，同时重置暂存区和工作区，与指定commit一致
$ git reset --hard [commit]

# 重置当前HEAD为指定commit，但保持暂存区和工作区不变
$ git reset --keep [commit]

# 新建一个commit，用来撤销指定commit
# 后者的所有变化都将被前者抵消，并且应用到当前分支
$ git revert [commit]

# 暂时将未提交的变化移除，稍后再移入
$ git stash       # 隐藏暂存区
$ git stash pop   # 恢复最后一次暂存内容
$ git stash list  # 查看列表
$ git stash apply # 恢复暂存的内容
$ git stash drop  # 删除暂存区
```

## 远程同步
```bash
# 下载远程仓库的所有变动
$ git fetch [remote]

# 显示所有远程仓库
$ git remote -v

# 显示某个远程仓库的信息
$ git remote show [remote]

# 增加一个新的远程仓库，并命名
$ git remote add [shortname] [url]

# 取回远程仓库的变化，并与本地分支合并
$ git pull [remote] [branch]

# 上传本地指定分支到远程仓库
$ git push [remote] [branch]

# 强行推送当前分支到远程仓库，即使有冲突
$ git push [remote] --force

# 推送所有分支到远程仓库
$ git push [remote] --all
```

## 配置
Git的设置文件为.gitconfig，它可以在用户主目录下（全局配置），也可以在项目目录下（项目配置）。
```bash
# 显示当前的Git配置
$ git config --list

# 编辑Git配置文件
$ git config -e [--global]

# 设置提交代码时的用户信息
$ git config [--global] user.name "[name]"
$ git config [--global] user.email "[email address]"

# 让Git显示颜色，会让命令输出看起来更醒目
$ git config --global color.ui true

# 别名配置
$ git config --global alias.co checkout # git co
$ git config --global alias.ci commit   # git ci
$ git config --global alias.st status   # git st
$ git config --global alias.br branch   # git br

# 显示最后一次提交信息
$ git config --global alias.last 'log -1'

# 很酷
$ git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# 可以把暂存区的修改撤销掉（unstage），重新放回工作区
$ git config --global alias.unstage 'reset HEAD' 

# 配置全局忽略的文件
$ git config --global core.excludesfile '~/.gitignore'

# 设置Editor使用atom
$ git config --global core.editor "atom -w"

# 设置Editor使用vim
$ git config --global core.editor vim

# 列举所有配置
$ git config -l  
```

## 生成SSH key
```
ssh-keygen -t rsa -C "youremail@example.com"
```
生成的key保存在`~/.ssh`目录id_rsa（私钥）和id_rsa.pub（公钥）两个文件

## 解决冲突
`git status`可以告诉我们冲突的文件。
打开冲突文件我们会看到Git用<<<<<<<，=======，>>>>>>>标记出不同分支的内容，我们修改后提交：
`git add [file]`
`git commit -m "conflict fixed"`
用带参数的git log也可以看到分支的合并情况：
`git log --graph --pretty=oneline --abbrev-commit`

或者用`git mergetool`

## 参考和学习资料
- [廖雪峰-Git教程](http://www.liaoxuefeng.com/wiki/0013739516305929606dd18361248578c67b8067c8c017b000)
- [常用 Git 命令清单](http://www.ruanyifeng.com/blog/2015/12/git-cheat-sheet.html)
- [Git 工作流程](http://www.ruanyifeng.com/blog/2015/12/git-workflow.html)
- [Git 使用规范流程](http://www.ruanyifeng.com/blog/2015/08/git-use-process.html)
- [Git远程操作详解](http://www.ruanyifeng.com/blog/2014/06/git_remote.html)
- [Pro Git](http://git-scm.com/book/zh/v2)
- [Git 在线练习](http://learngitbranching.js.org)
- [Git 在线练习（英）](http://try.github.io/)
- [Git Community Book 中文版](http://gitbook.liuhui998.com/index.html)