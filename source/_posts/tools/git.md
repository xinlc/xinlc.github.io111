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

Git 和 SVN 最大区别是`Git`是分布式版本控制，`SVN`是集中式版本控制。

### SVN 优缺点

- 优点：
  - 易于管理，集中式服务器更能保证安全性；
  - 代码一致性非常高；
  - 适合开发人数不多的项目开发；
- 缺点：
  - 服务器压力太大，数据库容量暴增；
  - 如果不能连接到服务器上，基本上不可以工作，如果服务器不能连接上，就不能提交，还原，对比等等；
  - 不适合开源开发（开发人数非常非常多)；

<!--more-->

### Git 优缺点

- 优点：
  - 适合分布式开发，强调个体：
  - 公共服务器压力和数据量都不会太大：
  - 速度快、灵活；
  - 任意两个开发者之间可以很容易的解决冲突；
  - 离线工作；
- 缺点:
  - 代码保密性差，一旦开发者把整个库克隆下来就可以完全公开所有代码和版本信息。

## 安装

### Mac 系统使用[Homebrew](https://brew.sh)安装

```bash
brew install git

# 安装好后查看版本: 我当前安装的版本号是 2.23.0
git --version
```

### Linux

```bash
# Fedora
sudo yum install git

# Debian
sudo apt-get install git
```

### Windows

[git for windows](https://git-for-windows.github.io)

## 常用命令

```bash
git status               # 查看工作区文件状态
git add -A               # 添加工作区所有文件到暂存区
git checkout –- <file>   # 取消对文件的修改
git checkout –- .        # 取消对工作区所有文件的修改
git diff                 # 比较当前文件和暂存区文件差异
git commit -m “注释内容”  # 提交代码到本地库
git commit -am “注释内容” # 添加到暂存区并提交代码到本地库
git commit --amend       # 修改最后一次提交的注释内容
git commit --amend --reset-author # 修改最后一次提交用户
git push origin [branch][: branch]  # 提交修改到远程库
git pull origin [branch][: branch]  # 更新远程仓库代码到本地库
git merge <branch>      # 将brasnch分支合并到当前分支 加上 --no-ff 不使用Fast-Foward合并，这样可以生成merge提交
git merge <branch> --squash # 合并差异提交，需要执行commit
git merge --abort        # 取消merge
git log                  # 查看提交记录
git log -10              # 查看最近10次提交记录
git log --stat           # 查看提交统计信息
git log <file>           # 查看该文件每次提交记录
git log -p               # 查看每次详细修改内容的diff
git log --pretty=oneline # 显示成一行， 其他参数：short，full 和 fuller
git log <commit>...<commit> # 显示两个commit之间的所有记录
git reflog               # 显示操作记录（commit，reset等）
git show $id             # 显示某次提交的内容
git reset <file>         # 从暂存区恢复到工作文件
git reset --hard $id     # 恢复到$id提交，并撤销工作区所有修改
git checkout -b <branch-name> # 创建分支并切换
git branch -D <branch-name>   # 删除branch分支
git rebase -i HEAD~3     # 压缩历史/重写历 https://git-scm.com/book/zh/v2/Git-工具-重写历史
git archive              # 生成一个可供发布的压缩包
git rm -r --cached .     # 删除缓存
git help <命令>           # 查看某个子命令帮助文档
```

## 基本使用

参考阮一峰老师的 [常用 Git 命令清单](http://www.ruanyifeng.com/blog/2015/12/git-cheat-sheet.html)

![gitflow](/images/tools/git/git-flow.png)

- Workspace：工作区；
- Index / Stage：暂存区；
- Repository：仓库区（或本地仓库）；
- Remote：远程仓库；

## 新建代码库

```bash
# 在当前目录新建一个Git代码库
git init

# 新建一个目录，将其初始化为Git代码库
git init [project-name]

# 克隆一个项目和它的整个代码历史
git clone <url>

# 克隆指定分支
git clone -b <branch-name> [url]

# 在服务器上搭建 Git
# 1. 需要把现有仓库导出为裸仓库——即一个不包含当前工作目录的裸仓库，相当于 cp -Rf my_project/.git my_project.git
git clone --bare my_project my_project.git

# 2. 上传到服务器
scp -r my_project.git user@git.example.com:/opt/git

# 3. 克隆下来就可以了
git clone user@git.example.com:/opt/git/my_project.git

```

## 增加/删除文件

```bash
# 添加指定文件到暂存区
git add [file1] [file2] ...

# 添加指定目录到暂存区，包括子目录
git add <dir>

# 监控工作区的状态树，使用它会把工作时的所有变化提交到暂存区，包括文件内容修改(modified)以及新文件(new)，但不包括被删除的文件。
git add .

# 仅监控已经被add的文件（即tracked file），它会将被修改的文件提交到暂存区。add -u 不会提交新文件（untracked file）。
git add -u

# add . 和 add -u 功能的集合
git add -A

# 添加每个变化前，都会要求确认
# 对于同一个文件的多处变化，可以实现分次提交
git add -p

# 交互式暂存
git add -i

# 删除工作区文件，并且将这次删除放入暂存区
git rm <file>...

# 停止追踪指定文件，但该文件会保留在工作区
git rm --cached <file>

# 多人开发时,会出现明明在gitignore中忽略了.idea文件夹, 但是提交时仍旧会出现.idea内文件变动的情况
# idea已经被git跟踪，之后再加入.gitignore后是没有作用的
# 清除.idea的git缓存
git rm -r --cached .idea

# 改名文件，并且将这个改名放入暂存区
git mv <file-original> <file-renamed>

# 丢弃工作区的改动
git restore <file>...
git checkout -- <file>...

# 取消暂存，将暂存区文件恢复到工作区
git restore --staged <file>...
git reset HEAD <file>...

# 清理工作目录（注意：谨慎使用）
# 使用 git clean -f -d 命令来移除工作目录中所有未追踪的文件以及空的子目录。 -f 意味着 强制 或 “确定移除”
git clean -f -d

# 如果只是想要看看它会做什么，可以使用 -n 选项来运行命令
git clean -d -n

# 默认情况下，git clean 命令只会移除没有忽略的未跟踪文件 .gitignore 或其他忽略文件中的模式匹配的文件都不会被移除， 如果你也想要移除那些文件，可以给 clean 命令增加一个 -x 选项。
git clean -n -d -x

# 使用交互模式
git clean -x -i

```

## 代码提交

```bash
# 提交暂存区到仓库区
git commit -m <message>

# 提交暂存区的指定文件到仓库区
git commit [file1] [file2] ... -m [message]

# 提交工作区自上次commit之后的变化，直接到仓库区
git commit -a

# 提交时显示所有diff信息
git commit -v

# 使用一次新的commit，替代上一次提交
# 如果代码没有任何新变化，则用来改写上一次commit的提交信息
git commit --amend -m <message>

# 重做上一次commit，并包括指定文件的新变化
git commit --amend [file1] [file2] ...
```

## 查看历史 log

文件在 `git/logs/refs/`下

```bash

# 显示有变更的文件
git status

# 得到简短的状态描述
git status -s

# 显示当前分支的版本历史
git log

# 查看所有分支log
git log --all

# 查看dev分支 log
git log dev

# 显示commit历史，以及每次commit发生变更的文件
git log --stat

# 在一行显示log
git log --oneline

# 显示前5次log
git log -n5

# 搜索提交历史，根据关键词
git log -S <keyword>

# 行日志搜索
# 查看 zlib.c 文件中 `git_deflate_bound` 函数的每一次变更, Git 会尝试找出这个函数的范围，然后查找历史记录，并且显示从函数创建之后一系列变更对应的补丁
git log -L :git_deflate_bound:zlib.c

# 显示某个commit之后的所有变动，每个commit占据一行
git log [tag] HEAD --pretty=format:%s

# 显示某个commit之后的所有变动，其"提交说明"必须符合搜索条件
git log [tag] HEAD --grep feature

# 显示某个文件的版本历史，包括文件改名
git log --follow [file]

# 显示某个版本的修改详情
git whatchanged <file>

# 显示某个版本的修改的细节diff
git whatchanged -p <file>

# 显示指定文件相关的每一次diff
git log -p [file]

# 显示过去5次提交
git log -5 --pretty --oneline

# 显示与某个文件有关的所有提交记录
git log --pretty=oneline [file]
git log -p --pretty=oneline [file]

# 显示分支merge关系图
git log --graph

# 格式化 graph
git log --graph --pretty=format:'%C(bold red)%h %Creset- %C(bold yellow)%d %C(bold cyan)%s %C(bold green)[%cr] %C(bold magenta)[%cn] %C(bold green)[%ci]'

# 显示所有提交过的用户，按提交次数排序
git shortlog -sn

# 显示某次提交的元数据和内容变化
git show <commit>

# 显示某次提交发生变化的文件
git show --name-only <commit>

# 显示某次提交时，某个文件的内容
git show <commit>:<filename>

# 显示当前分支的最近几次操作，可以使用 git reset 撤回相关操作
git reflog
git reflog --all

# 以标准日志的格式输出reflog(引用_日志
git log -g [branch-name]

# 查看远程分支log
git log <remote-branch>
git log remotes/origin/master

# 查看 experiment 分支中还有哪些提交尚未被合并入 master 分支
git log master..experiment

# 查看属于mater或者experiment但是不属于他们公共分支的变化(注意是三个点)
git log master...experiment

# 显示每个提交到底处于哪一侧的分支。 这会让输出数据更加清晰
git log --left-right master...experiment

# 查看在 master 分支中而不在 experiment 分支中的提交
git log experiment..master

# 查看你即将推送到远端的内容
git log origin/master..HEAD

# 从提交历史或者工作目录中查找一个字符串或者正则表达式
# -n 输出所找到的匹配行行号
# --count 输出概述的信息
# -p 查看匹配的行是属于哪一个方法或者函数
git grep -n <pattern>

# 显示指定文件是什么人在什么时间修改过
git blame <file>

# 显示指定文件，1-10行代码 在什么时间谁修改的
git blame -L 1, 10 <file>

# 二分查找（会进行分离头指针），可以从多个提交中查找是哪个提交引入了问题
git bisect start # 启动
git bisect bad   # 标记当前commit 是坏的
git bisect good <commit> # 标记好用的哪个commit
git bisect reset # 回到原分支
```

## 比较提交 diff

```bash
# 显示暂存区和工作区的差异
git diff

# 显示暂存区和工作区某个文件的差异
git diff -- <file>...

# 显示暂存区和HEAD（上一个commit）的差异
git diff --cached [file]

# 显示工作区与当前分支最新commit之间的差异
# HEAD 指向当前分支最新的一个commit
git diff HEAD
# ^ 父commit， 等效 ~1
git diff HEAD HEAD^
git diff HEAD HEAD^^
git diff HEAD HEAD~1

# 显示两次提交之间的差异
git diff <first-branch> <second-branch>

# 比较两个分支的某些文件的差异
git diff <first-branch> <second-branch> -- <file>...

# 显示今天你写了多少行代码
git diff --shortstat "@{0 day ago}"

# 比较当前文件和暂存区文件差异
git diff [file]

# 比较两次提交之间的差异
git diff <commit> <commit>

# 比较两次提交之间某些文件的差异
git diff <commit> <commit> -- <file>...

# 比较暂存区和版本库差异
git diff --staged

# 比较暂存区和版本库差异
git diff --cached

# 仅仅比较统计信息
git diff --stat

# 打补丁
# Git 提供了两种补丁方案，一是用git diff生成的UNIX标准补丁.diff文件，二是git format-patch生成的Git专用.patch 文件。
# .diff文件只是记录文件改变的内容，不带有commit记录信息,多个commit可以合并成一个diff文件。
# .patch文件带有记录文件改变的内容，也带有commit记录信息,每个commit对应一个patch文件。

git format-patch <commit>..<commit>

git diff <commit> <commit> > patch.diff

# 检查patch/diff是否能正常打入:
git apply --check <path/to/xxx.patch>
git apply --check <path/to/xxx.diff>

# 应用补丁
git apply patch.diff
# 或者
git am <path/to/xxx.patch>

# difftool 命令来用 Araxis ，emerge 或 vimdiff 等软件输出 diff 分析结果。
git difftool

# Git 导出某两次提交之间的差异文件 使用 –name-only 参数可以只显示文件名
# 注意：执行本打包指令的时候，一定要在项目的根目录中执行，以为不论是在项目目录中的哪个位置，git diff指令输出的文件路径都是相对于项目根目录的，在非项目根目录下执行xargs tar的时候会提示找不到文件；
git diff --name-only aee3668 HEAD | xargs tar -zcvf update.tar.gz
git diff --name-only 608e120 4abe32e | xargs zip update.zip
```

## 分支操作

文件在 `.git/refs/heads/`

```bash
# 列出所有本地分支
git branch

# 列出所有远程分支
git branch -r

# 列出所有本地分支和远程分支
git branch -a

# 查看本地所有分支，并显示最后一次提交log
git branch -v
git branch -av

# 查看哪些分支已经合并到当前分支
git branch --merged

# 查看所有包含未合并工作的分支
git branch --no-merged

# 新建一个分支，但依然停留在当前分支
git branch <branch-name>

# 新建一个分支，并切换到该分支
git checkout -b <branch-name>

# 新建一个分支，指向指定commit
git branch <branch-name> <commit>

# 新建一个分支，与指定的远程分支建立追踪关系
git branch --track <branch> <remote-branch>

# 切换到指定分支，并更新工作区
git checkout <branch-name>

# 切换到上一个分支
git checkout -

# 分离头指针操作
# 可以查看、做试验性的修改及提交，并且可以在切换回一个分支时，丢弃在此状态下所做的提交而不对分支造成影响。
git checkout <commit-id>

# 可以通过创建分支来保留在分离头指针状态下所做的提交
git switch -c <new-branch-name>
# 或
git checkout -b <new-branch-name>

# 撤销分离头指针
git switch -

# 建立追踪关系，在现有分支与指定的远程分支之间
git branch --set-upstream <branch> <remote-branch>
git branch --set-upstream-to=origin/dev dev

# 修改正在跟踪的上游分支，你可以在任意时间使用 -u 或 --set-upstream-to 选项运行 git branch 来显式地设置。
git branch -u origin/serverfix

# 查看设置的所有跟踪分支
git branch -vv

# 查看merge帮助
git merge -h

# 合并指定分支到当前分支，如果没有冲突（Conflict）默认进行Fast Forward（快进，就像在一个分支提交一样），删除分之后，会丢掉分支的信息。
git merge <branch>

# 强制禁用Fast Forward模式，Git就会在merge时生成一个新的commit，这样从分支历史上就可以看出分支信息。
git merge --no-ff -m <'message'> <branch>

# 允许合并不相关的历史
git merge --allow-unrelated-histories <branch-name>

# 选择一个commit，合并进当前分支，可以理解为”挑拣”提交
git cherry-pick <commit>

# 删除分支
git branch -d <branch-name>

# 强制删除分支
git branch -D <branch-name>

# 删除远程分支
git push origin --delete <branch-name>
git push origin :<branch-name>
git branch -dr <remote/branch>

# 重命名分支
git branch -m master main
git push -u origin main
```

## 标签

文件在 `.git/refs/tags/`

```bash
# 列出所有tag
git tag

# 使用匹配模式列出 tag
git tag -l 'v1.8.5*'

# 新建一个tag在当前commit
git tag <tag-name>

# 新建一个tag在当前commit 并进入添加message
git tag -a <tag-name>

# 新建一个tag在当前commit 并添加message
git tag <tag-name> -m <'message'>

# 新建一个tag在指定commit
git tag <tag-name> <commit-id>

# 删除本地tag
git tag -d <tag-name>

# 删除远程tag
git push origin :refs/tags/<tag-name>
git push origin --delete tag <tag-name>

# 查看tag信息
git show <tag-name>

# 提交指定tag
git push <remote> <tag-name>

# 提交所有tag
git push <remote> --tags

# 新建一个分支，指向某个tag
git checkout -b <branch-name> <tag-name>
```

## 撤销

```bash

# 恢复暂存区的指定文件到工作区
git checkout <file>

# 恢复某个commit的指定文件到暂存区和工作区
git checkout <commit> <file>

# 恢复暂存区的所有文件到工作区
git checkout .

# 重置暂存区的指定文件，与上一次commit保持一致，但工作区不变
git reset <file>

# 重置暂存区与工作区，与上一次commit保持一致
git reset --hard

# 清空工作区
git reset --hard HEAD

# 重置当前分支的指针为指定commit，同时重置暂存区，但工作区不变
git reset <commit>

# 重置当前分支的HEAD为指定commit，同时重置暂存区和工作区，与指定commit一致
git reset --hard <commit>

# 重置当前HEAD为指定commit，但保持暂存区和工作区不变
git reset --keep <commit>

# 新建一个commit，用来撤销指定commit
# 后者的所有变化都将被前者抵消，并且应用到当前分支
git revert <commit>

# 暂时将未提交的变化移除，稍后再移入（场景：临时有改紧急的任务，当前的状态先放一边）
git stash       # 隐藏暂存区
git stash save "save message" # 执行存储时，添加备注，方便查找。
git stash list  # 查看列表
git stash show  # 显示做了哪些改动，默认show第一个存储,如果要显示其他存贮，后面加stash@{$num}，比如第二个 git stash show stash@{1}
git stash show -p # 显示第一个存储的改动
git stash pop   # 恢复最后一次暂存内容, 将缓存堆栈中的对应stash删除，并将对应修改应用到当前的工作目录下
git stash apply # 应用某个存储，但不会把存储从存储列表中删除，默认使用第一个存储,即stash@{0}
git stash drop  # 删除暂存区, stash@{$num}存储，从列表中删除这个存储
git stash clear # 删除所有缓存的stash
git stash branch <branch-name> # 从储藏创建一个分支
git stash --patch # 交互式地提示哪些改动想要储藏、哪些改动需要保存在工作目录中
git stash --help  # 查看更多命令
```

## 远程同步

```bash
# 下载远程仓库的所有变动
git fetch [remote]

# 显示所有远程仓库
git remote -v

# 显示远程引用的完整列表（引用（指针），包括分支、标签等等。）
git ls-remote

# 显示某个远程仓库的信息
git remote show [remote]

# 增加一个新的远程仓库，并命名
git remote add [shortname] [url]

# 取回远程仓库的变化，并与本地分支合并
git pull [remote] [branch]

# 上传本地指定分支到远程仓库
git push [remote] [branch]

# 强行推送当前分支到远程仓库，即使有冲突
git push [remote] --force

# 推送所有分支到远程仓库
git push [remote] --all

# 推送所以标签
git push [remote] --tags

# 设置 origin 默认远程
git push -u origin master
```

## [配置](https://git-scm.com/book/zh/v2/自定义-Git-配置-Git)

Git 的设置文件为 .gitconfig，它可以在用户主目录下（全局配置），也可以在项目目录下（项目配置）。

```bash
# 查看配置帮助手册
man git-config

# 三个作用域
# --local 只对仓库有效，对应 .git/config 文件
# --global 对登录用户所有仓库有效，对应 ~/.gitconfig 或 ~/.config/git/config 文件
# --system 对系统所有用户有效，不建议使用，对应 /etc/gitconfig 文件

# 显示当前的Git配置
git config --list

# 编辑Git配置文件
git config -e [--global]

# 设置提交代码时的用户信息
git config [--global] user.name "<name>"
git config [--global] user.email <email address>

# 让Git显示颜色，会让命令输出看起来更醒目
git config --global color.ui true

# 别名配置
git config --global alias.co checkout # git co
git config --global alias.ci commit   # git ci
git config --global alias.st status   # git st
git config --global alias.br branch   # git br

# 显示最后一次提交信息
git config --global alias.last 'log -1'

# 很酷
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# 可以把暂存区的修改撤销掉（unstage），重新放回工作区
git config --global alias.unstage 'reset HEAD'

# 配置全局忽略的文件
git config --global core.excludesfile '~/.gitignore'

# 设置Editor使用atom
git config --global core.editor "atom -w"

# 设置Editor使用vim
git config --global core.editor vim

# 合并冲突的默认选项 使用diff3做标记
git config --global merge.conflictstyle diff3

# 解决 git status 显示中文和解决中文乱码
git config --global core.quotepath false

# 切换成英文
echo "alias git='LANG=en_GB git'" >> ~/.bashrc

# 切换成中文
echo "alias git='LANG=zh_CN.UTF-8 git'" >> ~/.bashrc

# 在当前项目中，早先创建并已经push到远程的文件及文件夹，将名称大小写更改后，git无法检测出更改.
# 关闭git忽略大小写配置，即可检测到大小写名称更改
git config core.ignorecase false

# 记住密码, 更多参考 https://git-scm.com/book/zh/v2/Git-工具-凭证存储
git config --global credential.helper store

# 这里设置账号信息被记住7200秒，两个小时。
git config --global credential.helper 'cache --timeout 7200'

git config –-global http.emptyAuth true

# 删除保存在本地的git账户
git credential-manager uninstall

# 缓存账户
git config --global credential.helper wincred

# 删除凭证
vim ~/.git-credentials
git config --system --unset credential.helper

# 删除本地保存密码
# windows
# 控制面板 -> 用户帐户-> 管理你的凭据-> [Windows 凭据]-> 编辑->完成

# mac
# 钥匙串访问 -> 密码 -> 删除对应url的凭证，只能删除对应url的凭证

# 列举所有配置
git config -l

# 修改远程仓库地址
git remote set-url origin <url>
```

## [rebase 变基操作](https://git-scm.com/book/zh/v2/Git-工具-重写历史)

变基注意：小心使用，在自己分支操作没有问题，如果在共享分支操作会影响其他人，可能会丢失代码，团队中对于公共的分支应禁止使用变基操作。特别是主干分支应只做先进，不应有变基或 `push -f` 操作。（当然也有为了让主干 log 变的清晰，做 rebase）。

- [Git 分支 - 变基](https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%8F%98%E5%9F%BA)

> 变基的风险  
> 呃，奇妙的变基也并非完美无缺，要用它得遵守一条准则：  
> 不要对在你的仓库外有副本的分支执行变基。  
> 如果你遵循这条金科玉律，就不会出差错。 否则，人民群众会仇恨你，你的朋友和家人也会嘲笑你，唾弃你。  
> 变基操作的实质是丢弃一些现有的提交，然后相应地新建一些内容一样但实际上不同的提交。 如果你已经将提交推送至某个仓库，而其他人也已经从该仓库拉取提交并进行了后续工作，此时，如果你用 git rebase 命令重新整理了提交并再次推送，你的同伴因此将不得不再次将他们手头的工作与你的提交进行整合，如果接下来你还要拉取并整合他们修改过的提交，事情就会变得一团糟。

举个例子，如果遇到前面提到的 有人推送了经过变基的提交，并丢弃了你的本地开发所基于的一些提交 那种情境，如果我们不是执行合并，而是执行 `git fetch`，再 `git rebase teamone/master`。或者使用另一种简短方法 `git pull --rebase`（一定要通知每个人执行 `git pull --rebase` 命令）。

```bash
# 比如有commit如下
# commit1
# commit2
# commit3
# commit4

# -i 进入交互式命令，调整好策略，保存退出（:wq)

# rebase -i 交互式命令:
# p, pick <提交> = 使用提交
# r, reword <提交> = 使用提交，但修改提交说明
# e, edit <提交> = 使用提交，进入 shell 以便进行提交修补
# s, squash <提交> = 使用提交，但融合到前一个提交
# f, fixup <提交> = 类似于 "squash"，但丢弃提交说明日志
# x, exec <命令> = 使用 shell 运行命令（此行剩余部分）
# b, break = 在此处停止（使用 'git rebase --continue' 继续变基）
# d, drop <提交> = 删除提交
# l, label <label> = 为当前 HEAD 打上标记
# t, reset <label> = 重置 HEAD 到该标记
# m, merge [-C <commit> | -c <commit>] <label> [# <oneline>]
# .       创建一个合并提交，并使用原始的合并提交说明（如果没有指定
# .       原始提交，使用注释部分的 oneline 作为提交说明）。使用
# .       -c <提交> 可以编辑提交说明。

# <base-commit-id> 变基要基于一个commit进行变，所以要选择要变更的父 commit

# 常用的变基
# 1. r 修改历史 commit message
# 2. s 顺序压缩历史，必须有一个 pick, 一般选择第一个
#    比如要压缩最近三个历史，commit2、commit3 合并到 commit4，base-commit-id 为 commit1：
#    pick commit2
#    s commit3
#    s commit4
# 3. s 跨 commit 压缩历史，可以调成循序，比如把 commit2和commit4进行合并：
#    pick commit2
#    s commit4
#    pick commit3
#    保存后需要使用 git rebase --continue，如果有冲突需要先解决冲突
git rebase -i <base-commit-id>

# 修改最近三次提交信息，在 HEAD~3..HEAD 范围内的每一个提交都会被重写，无论你是否修改信息。
git rebase -i HEAD~3

# 使用 rebase 合并分支
# 这些命令会把 master 分支里的每个提交(commit)取消掉，并且把它们临时 保存为补丁(patch)(这些补丁放到".git/rebase"目录中)，然后把 master 分支更新到最新的 dev 分支，最后把保存的这些补丁应用到 master 分支上。
git checkout master
git rebase dev

# 分支开发完成后，很可能有一堆commit，但是合并到主干的时候，往往希望只有一个（或最多两三个）commit，这样不仅清晰，也容易管理。
git rebase <other-branch>   # 合并其他分支
git rebase -i origin/master # 压缩主干历史

# 另外一种合并commit的简便方法，就是先撤销过去5个commit，然后再建一个新的。
git reset HEAD~5
git add .
git commit -am "Here's the bug fix that closes #28"
git push --force

```

### rebase vs merge

在 Git 中整合来自不同分支的修改主要有两种方法：merge 以及 rebase。事实上git rebase 和git merge 做的事其实是一样的。它们都被设计来将一个分支的更改并入另一个分支，只不过方式有些不同。

例如现在有两个分支 master 和 feature, 你在 feature 分支上进行了实验，这时候有个另外的人在 master 分支上进行了新的提交。那么你需要将 master上别人的修改应用到 feature 分支上。

**方法1： merge**

```bash
git checkout feature
git merge master

# 或者直接指定两个分支：
git merge master feature
```

这样操作后会在 feature 分支上产生一个新的 commit, 这个commit就是包含了 master 分支的修改。同时历史记录中也会包含这个 commit 的信息。这样会有个好处，也会带来问题。

- 好处就是：merge 是 non-destructive 的操作，比较安全。（相对于rebase操作）
- 问题就是：如果merge频繁，那么 feature 分支的历史记录中会包含很多个由于 merge 产生的新 commit 信息。这可能不是你希望看到了…）。

![1][1]

**方法2： rebase**

```bash
git checkout feature
git rebase master # 将 master 上的修改合并到 feature 分支（当前分支）。
```

rebase 会将 feature 上的历史 commit 全部修改，并且用新的提交覆盖之（即下图中的 Brand New Commit）。

看起来就是你的 feature 分支从一个开始就是在最新的 master 上开发的( 新的master跑到了你分支的最开始处 )。

如图（注意比较与上图 merge 的差异）：

![2][2]

一个注意点就是不要将 master 分支 rebase 到其他分支上面。这样会导致该 master 分支和其他人的 master 分支的历史记录不一样。然后你还得将你的 master 分支与别人的master分支merge。

所以，在 rebase 一个分支前想一下别人有没有 watch 这个分支， 因为rebase 会将该分支的历史提交修改。

### rebase在开发中的使用场景 - 本地清理

隔一段时间执行一次交互式 rebase，你可以保证你 feature 分支中的每一个提交都是专注和有意义的。你在写代码时不用担心造成孤立的提交——因为你后面一定能修复

下面的命令对最新的 3 次提交进行了交互式 rebase：

```bash
git checkout feature
git rebase -i HEAD~3
```

你实际上没有移动分支——你只是将之后的 3 次提交合并了

交互式 rebase 是在你工作流中引入 git rebase 的的好办法，因为它只影响本地分支。其他开发者只能看到你已经完成的结果，那就是一个非常整洁、易于追踪的分支历史。

但同样的，这只能用在私有分支上。如果你在同一个 feature 分支和其他开发者合作的话，这个分支是公开的，你不能重写这个历史。

### 核武器级选项：filter-branch

> 有另一个历史改写的选项，如果想要通过脚本的方式改写大量提交的话可以使用它——例如，全局修改你的邮箱地址或从每一个提交中移除一个文件。 这个命令是 filter-branch，它可以改写历史中大量的提交，除非你的项目还没有公开并且其他人没有基于要改写的工作的提交做的工作，你不应当使用它。

```bash
# 从每一个提交移除一个文件
# --tree-filter 选项在检出项目的每一个提交后运行指定的命令然后重新提交结果。
# 从整个提交历史中移除一个叫做 passwords.txt 的文件，可以使用 --tree-filter 选项给 filter-branch：
git filter-branch --tree-filter 'rm -f passwords.txt' HEAD

# 使一个子目录做为新的根目录
# 假设已经从另一个源代码控制系统中导入，并且有几个没意义的子目录（trunk、tags 等等）。 如果想要让 trunk 子目录作为每一个提交的新的项目根目录，filter-branch 也可以帮助你那么做：
git filter-branch --subdirectory-filter trunk HEAD

# 全局修改邮箱地址
git filter-branch --commit-filter '
      if [ "$GIT_AUTHOR_EMAIL" = "leo@localhost" ];
      then
        GIT_AUTHOR_NAME="Leo";
        GIT_AUTHOR_EMAIL="leo@example.com";
        git commit-tree "$@";
      else
        git commit-tree "$@";
      fi' HEAD

```

## [子模块](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E5%AD%90%E6%A8%A1%E5%9D%97)

```bash
# 添加一个子模块，会自动生成 .gitmodules 文件。该配置文件保存了项目 URL 与已经拉取的本地目录之间的映射。
git submodule add <repo-url>

# 默认不会显示子模块跟踪信息，可以使用 --submodule 显示子模块diff
git diff --cached --submodule

# 克隆一个带子模块的项目并初始化并更新仓库中的每一个子模块。
# 如果克隆是没有加 --recursive，克隆后需要运行 git submodule init 用来初始化本地配置文件，git submodule update 从该项目中抓取所有数据并检出父项目中列出的合适的提交。
git clone --recursive <repo-url>

# 如果你不想在子目录中手动抓取与合并，那么还有种更容易的方式。
git submodule update --remote <submodule-name>

# 可以看到子模块的log提交信息
git log -p --submodule
```

## [Object 操作（不常用）](https://git-scm.com/book/zh/v2/Git-内部原理-Git-对象)

文件在 `.git/objects/`，`hash` 值前两位是文件夹名  
比如：想找一个 `commit id` 为 `f9a279f39e872a7e86048b50ec7ae43a32a57c96` 的存储位置，文件夹名 `f9` + `a279f39e872a7e86048b50ec7ae43a32a57c96`

`pack` 文件夹, git 向磁盘中存储对象使用“松散（loose）”对象格式。比如文件 a.txt 第一个版本大小是 10k，第二个版本向其中添加了一行代码，假如此时文件为 10.1k，那么第二个版本会重新产生一个 10.1k 的文件，这样会很浪费磁盘空间，所以 git 会时不时地将多个这些对象打包成一个称为“包文件（packfile）”的二进制文件，以节省空间和提高效率。在手动执行 git gc 的时候，或者向远程推送的时候，都会进行打包的操作。

git 对象存储机制：

1. 一个 `commit` 对应一个 `tree` (快照树)；
2. 一个 `tree` 对应 `blob` 和 `tree` (子树)， 如果是文件就对应 `blob` 如果是文件夹对应的是 `tree`；
3. 一个 `blob` 对应的是内容（跟文件名没关系)，git 把相同的内容视为一个 blob；

```bash
# 查看对象类型
git cat-file -t <对象ID>

# 查看对象内容
git cat-file -p <对象ID>

# 查看 HEAD 对象的 tree
git ls-tree -r HEAD

# 在索引和工作树中显示有关文件的信息
git ls-files -s

# 查看占用空间大小
git count-objects -v

# 返回分支指向的SHA-1值
git rev-parse <branch-name>
```

## 生成 SSH key

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

生成的 key 保存在`~/.ssh`目录 id_rsa（私钥）和 id_rsa.pub（公钥）两个文件

### 多个账户秘钥

```bash
# 更改公私钥文件名后，使用 ssh-add 添加到代理。这种方式每次开机都要添加，可以把命令添加到 .bashrc 文件
ssh-add ~/.ssh/xxx_rsa

# 或者使用 ./ssh/config

# 个人的
Host github.com-xinlc
  User git
  Hostname github.com
  PreferredAuthentications publickey
  IdentityFile ~/.ssh/github01_rsa

# 组织的
Host github.com-orgname
  User git
  Hostname github.com
  PreferredAuthentications publickey
  IdentityFile ~/.ssh/github02_rsa
```

## 解决冲突

`git status` 可以告诉我们冲突的文件。
打开冲突文件我们会看到 Git 用<<<<<<<，=======，>>>>>>>标记出不同分支的内容：

```java
<<<<<<<< HEAD (Current Change)

这个是你修改的，如果不是 HEAD 可以用 log 看是哪个 commit

=======

这里是远程的，用 git log --all 才能看到这个 commit

>>>>>>>> 33aabbccxxxx (Incoming Change)
```

我们修改后提交：

- `git add [file]`；
- `git commit -m "conflict fixed"`；
- 用带参数的 git log 也可以看到分支的合并情况：
  `git log --graph --pretty=oneline --abbrev-commit`

或者用 `git mergetool`

```bash
# current branch master
git merge dev
git checkout --ours xxx/A.java # 抛弃甲的版本，保留乙的, 抛弃 dev
git checkout --theirs xxx/A.java # 抛弃乙的版本，完全采用甲的, 抛弃 master 完全采用dev
git checkout --theirs . # 抛弃乙版本所有修改
```

高级合并：

```bash
# git merge 冲突后得到三个文件
# 也可以使用 ls-files -u 底层命令来得到这些文件的 Git blob 对象的实际 SHA-1 值。:1:hello.rb 只是查找那个 blob 对象 SHA-1 值的简写。
git show :1:hello.rb > hello.common.rb
git show :2:hello.rb > hello.ours.rb
git show :3:hello.rb > hello.theirs.rb

# 重新合并成一个文件
git merge-file -p \
    hello.ours.rb hello.common.rb hello.theirs.rb > hello.rb

# 要在合并前比较结果与在你的分支上的内容，换一句话说，看看合并引入了什么，可以运行
git diff --ours
# 如果我们想要查看合并的结果与他们那边有什么不同，可以运行
git diff --theirs

# 来查看文件在两边是如何改动的
git diff --base

# 一个很有用的工具是带 --conflict 选项的 git checkout。 这会重新检出文件并替换合并冲突标记。 如果想要重置标记并尝试再次解决它们的话这会很有用。
git checkout --conflict=diff3 hello.rb
```

### rebase 变基冲突

Rebase 可能会反复解决冲突，可以借助[Rerere](https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-Rerere)，正如它的名字 “reuse recorded resolution” 所指，它允许你让 Git 记住解决一个块冲突的方法，这样在下一次看到相同冲突时，Git 可以为你自动地解决它。

## 图形化

1. 使用自带的图形化工具：

```bash
# gitk 是一个历史记录的图形化查看器。 你可以把它当作是基于 git log 和 git grep 命令的一个强大的图形操作界面。
# 打开图形化界面命令
gitk

# 打开图形化界面，并显示所有 branches、ags
gitk --all

# git-gui 则主要是一个用来制作提交的工具。
git gui
```

2. 推荐使用 [SourceTree](https://www.sourcetreeapp.com)

## 参考

- [廖雪峰-Git 教程](http://www.liaoxuefeng.com/wiki/0013739516305929606dd18361248578c67b8067c8c017b000)
- [常用 Git 命令清单](http://www.ruanyifeng.com/blog/2015/12/git-cheat-sheet.html)
- [Git 工作流程](http://www.ruanyifeng.com/blog/2015/12/git-workflow.html)
- [Git 使用规范流程](http://www.ruanyifeng.com/blog/2015/08/git-use-process.html)
- [Git 远程操作详解](http://www.ruanyifeng.com/blog/2014/06/git_remote.html)
- [Commit message 和 Change log 编写指南](http://www.ruanyifeng.com/blog/2016/01/commit_message_change_log.html)
- [社区规范](https://github.com/conventional-changelog/conventional-changelog/)
- [Pro Git](http://git-scm.com/book/zh/v2)
- [Git 在线练习](http://learngitbranching.js.org)
- [Git 在线练习（英）](http://try.github.io/)
- [Git Community Book 中文版](http://gitbook.liuhui998.com/index.html)
- [git 的飞行规则](https://github.com/k88hudson/git-flight-rules)
- [gitignore 模板](https://github.com/github/gitignore)

[1]: /images/tools/git/1.jpg
[2]: /images/tools/git/2.jpg
