---
layout: post
title: Tmux 简要说明
date: 2017-06-27 10:00:00
categories: 工欲善其事必先利其器
tags:
  - linux
---

## 简介

Tmux 是一个终端复用器（terminal multiplexer），用于在一个终端窗口中运行多个终端会话, 一个会话（Session）可以包含多个窗口，一个窗口（Window）可以包含多个窗格（Pane)。  

Tmux 使用 C/S 模型构建，主要包括以下单元模块：

- `server` 输入 tmux 命令时就开启了一个服务器（包含多个 session）；
- `session` 一个服务器可以包含多个会话；
- `window` 一个会话可以包含多个窗口；
- `pane` 一个窗口可以包含多个面板；

<!--more-->

## 会话与进程

命令行的典型使用方式是，打开一个终端窗口（terminal window，以下简称"窗口"），在里面输入命令。用户与计算机的这种临时的交互，称为一次"会话"（session） 。

会话的一个重要特点是，窗口与其中启动的进程是连在一起的。打开窗口，会话开始；关闭窗口，会话结束，会话内部的进程也会随之终止，不管有没有运行完。

一个典型的例子就是，SSH 登录远程计算机，打开一个远程窗口执行命令。这时，网络突然断线，再次登录的时候，是找不回上一次执行的命令的。因为上一次 SSH 会话已经终止了，里面的进程也随之消失了。

为了解决这个问题，会话与窗口可以"解绑"：窗口关闭时，会话并不终止，而是继续运行，等到以后需要的时候，再让会话"绑定"其他窗口。

## Tmux 的作用

Tmux 就是会话与窗口的"解绑"工具，将它们彻底分离。

1. 它允许在单个窗口中，同时访问多个会话。这对于同时运行多个命令行程序很有用。
2. 它可以让新窗口"接入"已经存在的会话。
3. 它允许每个会话有多个连接窗口，因此可以多人实时共享会话。
4. 它还支持窗口任意的垂直和水平拆分。

类似的终端复用器还有 GNU Screen。Tmux 与它功能相似，但是更易用，也更强大。

## 安装

```bash
# Ubuntu 或 Debian
sudo apt-get install tmux

# CentOS 或 Fedora
sudo yum install tmux

# Mac
brew install tmux
brew install reattach-to-user-namespace # 让 Tmux 将文本复制到系统的剪贴板。
```

## 基本用法

安装完成后，键入 `tmux` 命令，就进入了 Tmux 窗口。

```bash
# 命令会启动 Tmux 窗口，底部有一个状态栏。状态栏的左侧是窗口信息（编号和名称），右侧是系统信息。
$ tmux
```

按下 `Ctrl+d` 或者显式输入 `exit` 命令，就可以退出 Tmux 窗口。

### 前缀键

Tmux 窗口有大量的快捷键。所有快捷键都要通过前缀键唤起。默认的前缀键是`Ctrl+b`，即先按下`Ctrl+b`，快捷键才会生效。

举例来说，帮助命令的快捷键是`Ctrl+b ?`。它的用法是，在 Tmux 窗口中，先按下`Ctrl+b`，再按下`?`，就会显示帮助信息。

然后，按下 `ESC` 键或`q`键，就可以退出帮助。

## 会话管理

### 新建会话

第一个启动的 Tmux 窗口，编号是`0`，第二个窗口的编号是`1`，以此类推。这些窗口对应的会话，就是 0 号会话、1 号会话。

使用编号区分会话，不太直观，更好的方法是为会话起名。

```bash
tmux new -s <session-name>
```

上面命令新建一个指定名称的会话。

### 分离会话

在 Tmux 窗口中，按下`Ctrl+b d`或者输入`tmux detach`命令，就会将当前会话与窗口分离。

```bash
tmux detach
```

上面命令执行后，就会退出当前 Tmux 窗口，但是会话和里面的进程仍然在后台运行。

`tmux ls`命令可以查看当前所有的 Tmux 会话。

```bash
tmux ls
# or
tmux list-session
```

### 接入会话

`tmux attach`命令用于重新接入某个已存在的会话。

```bash
# 使用会话编号
tmux attach -t 0

# 使用会话名称
tmux attach -t <session-name>
```

### 杀死会话

`tmux kill-session`命令用于杀死某个会话。

```bash
# 使用会话编号
tmux kill-session -t 0

# 使用会话名称
tmux kill-session -t <session-name>
```

### 切换会话

`tmux switch`命令用于切换会话。

```bash
# 使用会话编号
tmux switch -t 0

# 使用会话名称
tmux switch -t <session-name>
```

### 重命名会话

`tmux rename-session`命令用于重命名会话。

```bash
tmux rename-session -t 0 <new-name>
```

上面命令将0号会话重命名。

### 会话快捷键

下面是一些会话相关的快捷键。

- `Ctrl+b d`：分离当前会话。
- `Ctrl+b s`：列出所有会话。
- `Ctrl+b $`：重命名当前会话。

### 最简操作流程

综上所述，以下是 Tmux 的最简操作流程。

1. 新建会话`tmux new -s my_session`。
2. 在 Tmux 窗口运行所需的程序。
3. 按下快捷键`Ctrl+b d`将会话分离。
4. 下次使用时，重新连接到会话`tmux attach-session -t my_session`。

## 窗格操作

Tmux 可以将窗口分成多个窗格（pane），每个窗格运行不同的命令。以下命令都是在 Tmux 窗口中执行。

### 划分窗格

`tmux split-window`命令用来划分窗格。

```bash
# 划分上下两个窗格
tmux split-window

# 划分左右两个窗格
tmux split-window -h
```

### 移动光标

`tmux select-pane` 命令用来移动光标位置。

```bash
# 光标切换到上方窗格
tmux select-pane -U

# 光标切换到下方窗格
tmux select-pane -D

# 光标切换到左边窗格
tmux select-pane -L

# 光标切换到右边窗格
tmux select-pane -R
```

### 交换窗格位置

`tmux swap-pane`命令用来交换窗格位置。

```bash
# 当前窗格上移
tmux swap-pane -U

# 当前窗格下移
tmux swap-pane -D
```

### 窗格快捷键

下面是一些窗格操作的快捷键。

- `Ctrl+b %`：划分左右两个窗格。
- `Ctrl+b "`：划分上下两个窗格。
- `Ctrl+b <arrow key>`：光标切换到其他窗格。`<arrow key>`是指向要切换到的窗格的方向键，比如切换到下方窗格，就按方向键↓。
- `Ctrl+b ;`：光标切换到上一个窗格。
- `Ctrl+b o`：光标切换到下一个窗格。
- `Ctrl+b {`：当前窗格与上一个窗格交换位置。
- `Ctrl+b }`：当前窗格与下一个窗格交换位置。
- `Ctrl+b Ctrl+o`：所有窗格向前移动一个位置，第一个窗格变成最后一个窗格。
- `Ctrl+b Alt+o`：所有窗格向后移动一个位置，最后一个窗格变成第一个窗格。
- `Ctrl+b x`：关闭当前窗格。
- `Ctrl+b !`：将当前窗格拆分为一个独立窗口。
- `Ctrl+b z`：当前窗格全屏显示，再使用一次会变回原来大小。
- `Ctrl+b Ctrl+<arrow key>`：按箭头方向调整窗格大小。
- `Ctrl+b q`：显示窗格编号。

## 窗口管理

除了将一个窗口划分成多个窗格，Tmux 也允许新建多个窗口。

### 新建窗口

`tmux new-window` 命令用来创建新窗口。

```bash
tmux new-window

# 新建一个指定名称的窗口
tmux new-window -n <window-name>
```

### 切换窗口

`tmux select-window`命令用来切换窗口。

```bash
# 切换到指定编号的窗口
tmux select-window -t <window-number>

# 切换到指定名称的窗口
tmux select-window -t <window-name>
```

### 重命名窗口

`tmux rename-window`命令用于为当前窗口起名（或重命名）。

```bash
tmux rename-window <new-name>
```

### 窗口快捷键

下面是一些窗口操作的快捷键。

- `Ctrl+b c`：创建一个新窗口，状态栏会显示多个窗口的信息。
- `Ctrl+b p`：切换到上一个窗口（按照状态栏上的顺序）。
- `Ctrl+b n`：切换到下一个窗口。
- `Ctrl+b <number>`：切换到指定编号的窗口，其中的`<number>`是状态栏上的窗口编号。
- `Ctrl+b w`：从列表中选择窗口。
- `Ctrl+b ,`：窗口重命名。

## 其他命令

下面是一些其他命令。

```bash
# 列出所有快捷键，及其对应的 Tmux 命令
tmux list-keys

# 列出所有 Tmux 命令及其参数
tmux list-commands

# 列出当前所有 Tmux 会话的信息
tmux info

# 重新加载当前的 Tmux 配置
tmux source-file ~/.tmux.conf
```

## 常用操作整理

### 命令

- `tmux new -s <name-of-my-session>` 创建 session, 可以指定 Session 名；
- `tmux attach-session -t <name-of-my-session>` 重新连接此会话；
- `tmux attach` 连接会话(只有一个)；
- `tmux a -t 0` 连接第一个会话；
- `tmux ls` or `tmux list-session` 查看已有会话列表；
- `tmux detach` 分离会话；
- `tmux kill-session -t` 杀掉会话；
- `<PREFIX> + : new -s <name-of-my-session>` 在 tmux 中创建一个会话；
- `<PREFIX> + $` 重命名会话；
- `<PREFIX> + : kill-session` 在 tmux 中杀掉当前会话；
- `<PREFIX> + ,` 重命名一个窗口, 之后输入名字回车；
- `exit` 退出窗口或 pane；

### 操作

为了使自身的快捷键和其他软件的快捷键互不干扰，Tmux 提供了一个快捷键前缀（Prefix）。  
当想要使用快捷键时，需要先按下快捷键前缀，然后再按下快捷键。Tmux 所使用的快捷键前缀默认是组合键 `Ctrl-b`。

#### 系统操作

- `?` 列出所有快捷键；按 q 返回；
- `d` 脱离当前会话；这样可以暂时返回 Shell 界面，输入 tmux attach 能够重新进入之前的会话；
- `D` 选择要脱离的会话；在同时开启了多个会话时使用；
- `Ctrl+z` 挂起当前会话；
- `r` 强制重绘未脱离的会话；
- `s` 选择并切换会话；在同时开启了多个会话时使用；
- `:` 进入命令行模式；此时可以输入支持的命令，例如 kill-server 可以关闭服务器；
- `[` 进入复制模式(copy-mode)；此时的操作与 vi/emacs 相同，按 q/Esc 退出；
- `~` 列出提示信息缓存；其中包含了之前 tmux 返回的各种提示信息；

#### 窗口操作

- `c` 创建新窗口；
- `&` 关闭当前窗口；
- `数字键` 切换至指定窗口；
- `p` 切换至上一窗口；
- `n` 切换至下一窗口；
- `l` 在前后两个窗口间互相切换；
- `w` 通过窗口列表切换窗口；
- `,` 重命名当前窗口；这样便于识别；
- `.` 修改当前窗口编号；相当于窗口重新排序；
- `f` 在所有窗口中查找指定文本；
- `a` 切换到最近的窗口；
- `space` 切换布局方式；

#### 面板操作

- `“` 将当前面板平分为上下两块；
- `%` 将当前面板平分为左右两块；
- `x` 关闭当前面板；
- `!` 将当前面板置于新窗口；即新建一个窗口，其中仅包含当前面板；
- `Ctrl+方向键` 以 1 个单元格为单位移动边缘以调整当前面板大小；
- `Alt+方向键` 以 5 个单元格为单位移动边缘以调整当前面板大小；
- `Space` 在预置的面板布局中循环切换；依次包括 even-horizontal、even-vertical、main-horizontal、main-vertical、tiled；
- `q` 显示面板编；
- `;` 光标切换到上一个面板；
- `o` 在当前窗口中选择下一面板；
- `方向键` 移动光标以选择面板；
- `{` 向前置换当前面板；
- `}` 向后置换当前面板；
- `Alt+o` 逆时针旋转当前窗口的面板；
- `Ctrl+o` 顺时针旋转当前窗口的面板；
- `z` 进入全屏，再按一次恢复；

### 复制粘贴

- `<PREFIX> + [` 进入复制模式；
- `space/v` 开始选择；
- `Ctrl-v` 整块选择；
- `hjkl` 方向键移动；
- `w/b` 向前向后移动一个单词；
- `fx/Fx` 行内移动到下一个字符位置；
- `ctrl-b/f` 在缓冲区里面翻页；
- `g/G` 到缓冲区最顶/底端；
- `/ ?` 向下, 向上查找；
- `n/N` 查找后下一个, 上一个；
- `Enter/y` 复制；
- `<PREFIX>> + ]` 粘贴；

## Tmuxinator

Tmuxinator 是一个 Ruby 的 gem 包，可用于创建 Tmux 的会话。它的工作方式是先在配置文件中定义会话中的细节，然后用 1 条命令创建出这些会话。

```bash
gem install tmuxinator # 安装
```

### 基础设置

#### bash 版

将下述文本保存为\$HOME/.tmuxinator/.tmuxinator.bash，提供 bash 的 tab 键提示功能

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

\$HOME/.bashrc 下增加下述内容：

```bash
source $HOME/.tmuxinator/.tmuxinator.bash
export EDITOR='vim'
```

source \$HOME/.bashrc 使其生效。

#### zsh 版

将下述文本保存为\$HOME/.tmuxinator/.tmuxinator.zsh，提供 zsh 的 tab 键提示功能

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

\$HOME/.zshrc 下增加下述内容：

```bash
source $HOME/.tmuxinator/.tmuxinator.zsh
export EDITOR='vim'
```

source \$HOME/.zshrc 使其生效。

### 常用命令

Tmuxinator 的一个工程(Project)对应 tmux 的一个 session。  
tmuxinator 命令已 alias 为 mux。  
new 简写为 n，open 简写为 o，edit 简写为 e，list 简写为 l，copy 简写为 c，delete 简写为 d。

```bash
mux n ws      # 创建工程ws
mux o ws      # 打开工程ws的配置文件
mux e ws      # 同上
mux c ws ws1  # 复制ws工程到ws1
mux d ws      # 删除ws工程
mux l         # 显示所有工程
mux ws        # 开启ws工程
```

### 配置

当 new 一个工程后，会出现如下信息(省略注释)。

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

### 自定义 layout

工程配置中的 layout 项，有 5 个默认的值。

- even-horizontal
- even-vertical
- main-horizontal
- main-vertical
- tiled
  开启 tmux 后，可以使用快捷键 prefix space 切换 layout，建议开启 4 个 Pane 进行测试。例如：

```yaml
panes:
  - top
  - top
  - vim .
  - vim .
```

如果不满足 layout 默认值，layout 项可以自定义值。  
首先调整好窗口的 Pane，prefix d 关闭 Session。

```bash
$ tmux list-windows
1: bash* (4 panes) [211x47] [layout 9a0a,211x47,0,0{110x47,0,0,12,100x47,111,0[100x23,111,0,13,100x23,111,24{49x23,111,24,14,50x23,161,24,15}]}
```

将上述 layout 之后的信息(到最后一个]前)，复制到工程配置中的 layout 项即可。注意 pane 的个数必须与执行命令的个数对应。

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

当某个 Pane 需要执行多命令时，官方不推荐使用&&或;的形式。可以采用如下方式发送命令。

```yaml
windows:
  - editor:
      layout: main-vertical
      panes:
        - list: # 多命令方式
            - cd ~/temp
            - ls -la
        -  # empty
```

### vim 插件

```bash
christoomey/vim-tmux-navigator, 安装更便捷的导航跳转
```

## Tmate

Tmate 是一个 Tmux 的管理工具，使用它不但能够轻松地创建 Tmux 会话而且还能够通过互联网把该会话共享给其他人

### 安装和使用

```bash
# 安装
$ brew install mate

# 使用 Tmate 开启一个新的 session，从 Tmux 的会话中复制由 Tmate 产生的 SSH URL，其他人可以使用SSH访问 session
$ tmate
```

## 我的配置

- [我的配置文件](https://github.com/xinlc/dotfiles/blob/master/mac/macbook/.tmux.conf)

## 参考

- [tmux](https://github.com/tmux/tmux)
- [tmuxinator](https://github.com/tmuxinator/tmuxinator)
- [Tmux 使用教程](http://www.ruanyifeng.com/blog/2019/10/tmux.html)
- [tmux 进阶之 tmuxinator](http://blog.csdn.net/u014717036/article/details/60139776)
- [A Quick and Easy Guide to tmux](http://www.hamvocke.com/blog/a-quick-and-easy-guide-to-tmux/)
- [A tmux Crash Course](https://robots.thoughtbot.com/a-tmux-crash-course)
