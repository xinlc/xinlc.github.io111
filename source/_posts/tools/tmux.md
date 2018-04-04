---
layout: post
title: Tmux 简要说明
date: 2017-06-27 10:00:00
categories: 工欲善其事必先利其器
tags:
  - linux
---

## 简介
Tmux 是一个工具，用于在一个终端窗口中运行多个终端会话, 一个会话（Session）可以包含多个窗口，一个窗口（Window）可以包含多个窗格（Pane)。   
Tmux使用C/S模型构建，主要包括以下单元模块：
- `server`	输入tmux命令时就开启了一个服务器。
- `session` 一个服务器可以包含多个会话。
- `window` 一个会话可以包含多个窗口。
- `pane`	一个窗口可以包含多个面板。

<!--more-->

## 安装
``` bash
# Mac OS 系统
$ brew install tmux
$ brew install reattach-to-user-namespace # 让 Tmux 将文本复制到系统的剪贴板。


# ubuntu 系统
$ sudo apt-get install tmux
```

## 命令

- `tmux new -s <name-of-my-session>` 创建session, 可以指定Session名
- `tmux attach-session -t <name-of-my-session>` 重新连接此会话
- `tmux attach` 连接会话(只有一个)
- `tmux a -t 0` 连接第一个会话
- `tmux ls` or `tmux list-session` 查看已有会话列表
- `tmux detach` 分离会话
- `tmux kill-session -t` 杀掉会话
- `[PREFIX-:] new -s <name-of-my-session>` 在tmux中创建一个会话
- `[PREFIX-$]` 重命名会话
- `[PREFIX-:] kill-session` 在tmux中杀掉当前会话
- `[PREFIX-,]` 重命名一个窗口, 之后输入名字回车
- `exit` 退出窗口或pane

## 操作

为了使自身的快捷键和其他软件的快捷键互不干扰，Tmux 提供了一个快捷键前缀（Prefix）。   
当想要使用快捷键时，需要先按下快捷键前缀，然后再按下快捷键。Tmux 所使用的快捷键前缀默认是组合键 `Ctrl-b`。

### 系统操作
-	`?`	列出所有快捷键；按q返回
- `d`	脱离当前会话；这样可以暂时返回Shell界面，输入tmux attach能够重新进入之前的会话
- `D`	选择要脱离的会话；在同时开启了多个会话时使用
- `Ctrl+z`	挂起当前会话
- `r`	强制重绘未脱离的会话
- `s`	选择并切换会话；在同时开启了多个会话时使用
- `:`	进入命令行模式；此时可以输入支持的命令，例如kill-server可以关闭服务器
- `[`	进入复制模式；此时的操作与vi/emacs相同，按q/Esc退出
- `~`	列出提示信息缓存；其中包含了之前tmux返回的各种提示信息

### 窗口操作	
- `c`	创建新窗口
- `&`	关闭当前窗口
- `数字键`	切换至指定窗口
- `p`	切换至上一窗口
- `n`	切换至下一窗口
- `l`	在前后两个窗口间互相切换
- `w`	通过窗口列表切换窗口
- `,`	重命名当前窗口；这样便于识别
- `.`	修改当前窗口编号；相当于窗口重新排序
- `f`	在所有窗口中查找指定文本

### 面板操作	
- `“`	将当前面板平分为上下两块
- `%`	将当前面板平分为左右两块
- `x`	关闭当前面板
- `!`	将当前面板置于新窗口；即新建一个窗口，其中仅包含当前面板
- `Ctrl+方向键`	以1个单元格为单位移动边缘以调整当前面板大小
- `Alt+方向键`	以5个单元格为单位移动边缘以调整当前面板大小
- `Space`	在预置的面板布局中循环切换；依次包括even-horizontal、even-vertical、main-horizontal、main-vertical、tiled
- `q`	显示面板编
- `o`	在当前窗口中选择下一面板
- `方向键` 移动光标以选择面板
- `{`	向前置换当前面板
- `}`	向后置换当前面板
- `Alt+o`	逆时针旋转当前窗口的面板
- `Ctrl+o`	顺时针旋转当前窗口的面板


## 复制粘贴
- `[PREFIX-[]` 进入复制模式
- `space/v`    开始选择
- `Ctrl-v`     整块选择
- `hjkl`       方向键移动
- `w/b`        向前向后移动一个单词
- `fx/Fx`      行内移动到下一个字符位置
- `ctrl-b/f`   在缓冲区里面翻页
- `g/G`        到缓冲区最顶/底端
- `/ ?`        向下, 向上查找
- `n/N`        查找后下一个, 上一个
- `Enter/y`    复制
- `[PREFIX-]]` 粘贴

## Tmuxinator

Tmuxinator 是一个 Ruby 的 gem 包，可用于创建 Tmux 的会话。它的工作方式是先在配置文件中定义会话中的细节，然后用 1 条命令创建出这些会话。
```bash
$ gem install tmuxinator # 安装
```

### 基础设置
#### bash版
将下述文本保存为$HOME/.tmuxinator/.tmuxinator.bash，提供bash的tab键提示功能

```bash
#!/usr/bin/env bash

_tmuxinator() {
    COMPREPLY=()
    local word
    word="${COMP_WORDS[COMP_CWORD]}"

    if [ "$COMP_CWORD" -eq 1 ]; then
        local commands="$(compgen -W "$(tmuxinator commands)" -- "$word")"
        local projects="$(compgen -W "$(tmuxinator completions start)" -- "$word")"

        COMPREPLY=( $commands $projects )
    elif [ "$COMP_CWORD" -eq 2 ]; then
        local words
        words=("${COMP_WORDS[@]}")
        unset words[0]
        unset words[$COMP_CWORD]
        local completions
        completions=$(tmuxinator completions "${words[@]}")
        COMPREPLY=( $(compgen -W "$completions" -- "$word") )
    fi
}

complete -F _tmuxinator tmuxinator mux
alias mux="tmuxinator"
```
$HOME/.bashrc下增加下述内容：
```bash
source $HOME/.tmuxinator/.tmuxinator.bash
export EDITOR='vim'
```
source $HOME/.bashrc使其生效。

#### zsh版
将下述文本保存为$HOME/.tmuxinator/.tmuxinator.zsh，提供zsh的tab键提示功能
```bash
_tmuxinator() {
  local commands projects
  commands=(${(f)"$(tmuxinator commands zsh)"})
  projects=(${(f)"$(tmuxinator completions start)"})

  if (( CURRENT == 2 )); then
    _describe -t commands "tmuxinator subcommands" commands
    _describe -t projects "tmuxinator projects" projects
  elif (( CURRENT == 3)); then
    case $words[2] in
      copy|debug|delete|open|start)
        _arguments '*:projects:($projects)'
      ;;
    esac
  fi

  return
}

compdef _tmuxinator tmuxinator mux
alias mux="tmuxinator"
```
$HOME/.zshrc下增加下述内容：
```bash
source $HOME/.tmuxinator/.tmuxinator.zsh
export EDITOR='vim'
```
source $HOME/.zshrc使其生效。

### 常用命令
Tmuxinator的一个工程(Project)对应tmux的一个session。   
tmuxinator命令已alias为mux。   
new简写为n，open简写为o，edit简写为e，list简写为l，copy简写为c，delete简写为d。
```bash
$ mux n ws      # 创建工程ws
$ mux o ws      # 打开工程ws的配置文件
$ mux e ws      # 同上
$ mux c ws ws1  # 复制ws工程到ws1
$ mux d ws      # 删除ws工程
$ mux l         # 显示所有工程
$ mux ws        # 开启ws工程
```

### 配置
当new一个工程后，会出现如下信息(省略注释)。
```yaml
name: ws # session名称
root: ~/ # 工程根目录，活动Pane会首先cd到此目录

windows:
  - editor: # 第1个名为Editor的Window
      layout: main-vertical # Pane的布局
      panes: # 各个Pane
        - vim # 第一个Pane运行vim命令
        - guard # 第二个Pane运行guard命令
  - server: bundle exec rails s # 第2个名为server的Window，运行命令为bundle
  - logs: tail -f log/development.log # 第3个名为logs的Window，运行命令为tail
```

### 自定义layout
工程配置中的layout项，有5个默认的值。
- even-horizontal
- even-vertical
- main-horizontal
- main-vertical
- tiled
开启tmux后，可以使用快捷键prefix space切换layout，建议开启4个Pane进行测试。例如：
```yaml
panes:
- top
- top
- vim .
- vim .
```
如果不满足layout默认值，layout项可以自定义值。    
首先调整好窗口的Pane，prefix d关闭Session。    
```bash
$ tmux list-windows
1: bash* (4 panes) [211x47] [layout 9a0a,211x47,0,0{110x47,0,0,12,100x47,111,0[100x23,111,0,13,100x23,111,24{49x23,111,24,14,50x23,161,24,15}]}
```

将上述layout之后的信息(到最后一个]前)，复制到工程配置中的layout项即可。注意pane的个数必须与执行命令的个数对应。
```yaml
windows:
  - editor:
      layout: 9a0a,211x47,0,0{110x47,0,0,12,100x47,111,0[100x23,111,0,13,100x23,111,24{49x23,111,24,14,50x23,161,24,15}]}
        - # empty
        - # empty
        - # empty
        - # empty
```

### 多命令
当某个Pane需要执行多命令时，官方不推荐使用&&或;的形式。可以采用如下方式发送命令。
```yaml
windows:
  - editor:
      layout: main-vertical
      panes:
        - list: # 多命令方式
          - cd ~/temp
          - ls -la
        - # empty
```

### vim 插件
```
christoomey/vim-tmux-navigator, 安装更便捷的导航跳转
```

### Tmate
Tmate 是一个 Tmux 的管理工具，使用它不但能够轻松地创建 Tmux 会话而且还能够通过互联网把该会话共享给其他人

#### 安装和使用
```bash
# 安装
$ brew install mate

# 使用 Tmate 开启一个新的 session，从 Tmux 的会话中复制由 Tmate 产生的 SSH URL，其他人可以使用SSH访问 session
$ tmate
```

## 配置
- [k-tmux](https://github.com/wklken/k-tmux)
- [我的TMUX配置及说明](http://www.wklken.me/posts/2015/08/06/linux-tmux.html)


## 参考资料
- [Tmux 速成教程：技巧和调整](http://blog.jobbole.com/87584/)
- [使用tmux](https://wiki.freebsdchina.org/software/t/tmux)
- [tmux进阶之tmuxinator](http://blog.csdn.net/u014717036/article/details/60139776)
- [A Quick and Easy Guide to tmux](http://www.hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/)
- [A tmux Crash Course](https://robots.thoughtbot.com/a-tmux-crash-course)