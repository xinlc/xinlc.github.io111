---
layout: post
title: Mac Terminal 配置
date: 2017-07-03 15:30:00 +0800
categories: 工欲善其事必先利其器
tags:
  - linux
---

## [iTerm2](https://iterm2.com)

iTerm2 + Oh My Zsh 打造舒适终端体验。

iTerm2是默认终端的替代品，也是目前Mac系统下最好用的终端工具，集颜值和效率于一身。

## 安装iTerm2

- https://www.iterm2.com/downloads.html

### 迁移配置

导入配置

> Preferences -> Profiles -> Other Actions -> import JSON Profiles，然后设置为默认配置。

### 调整 Status Bar

将 iTerm2 自带 theme 修改为 `Minimal` 以达到顶栏沉浸式的效果

> Preferences -> Appearance -> General -> Theme

可以在Profiles选项卡，Session页面最底部看到开启选项。Status bar enabled 选项，勾选上即可打开。点击右边的 Configure Status Bar 按钮可设置显示的内容。

可以看到能显示的内容非常多，把上方要显示的内容拖动到下方 Active Components 区域即添加。

在Preference页面中点击Appearance选项卡，可以设置Status bar的位置，修改 Status bar location，我这里改到Bottom底部。

## 安装 zsh

```bash
brew install zsh

zsh --version

# 将zsh设置为默认的Shell。
chsh -s /bin/zsh
```

### 安装 oh my zsh

```bash
# 安装
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

# 卸载
uninstall_oh_my_zsh
```

### 参考配置

- [安装 zsh](https://github.com/xinlc/dotfiles/blob/master/mac/README.md#%E5%AE%89%E8%A3%85-zsh)

### 更多主题

- https://github.com/mbadolato/iTerm2-Color-Schemes

> 推荐 Solarized Dark Higher Contrast

## 常用快捷键

- `Ctrl + a`：移到命令行首；
- `Ctrl + e`：移到命令行尾；
- `Ctrl + f`：按字符前移（右向）；
- `Ctrl + b`：按字符后移（左向）；
- `Alt + f`：按单词前移（右向）；
- `Alt + b`：按单词后移（左向）；
- `Ctrl + p`：历史中的上一条命令, 或者 文本中移动到上一行；
- `Ctrl + n`：历史中的下一条命令,或者 文本中移动到下一行；
- `Ctrl + r`：往后搜索历史命令，输入关键字，重复按 Ctrl + r 将会继续反向搜索；
- `Ctrl + s`：往前搜索历史命令；
- `Ctrl + g`：从历史搜索模式退出；
- `Alt + .`：使用上一条命令的最后一个参数；
- `Ctrl + xx`：在命令行首和光标之间移动；
- `Ctrl + t`：将光标位置的字符和前一个字符进行位置交换；
- `Ctrl + d`：删除一个字符,删除一个字符，相当于通常的 Delete 键；
- `Ctrl + h`：退格删除一个字符，相当于通常的 Backspace 键；
- `Ctrl + w`：从光标处删除至字首；
- `Ctrl + u`：从光标处删除至命令行首；
- `Ctrl + k`：从光标处删除至命令行尾；
- `Ctrl + l`：清屏, 类似 clear 命令效果；或 `command + r`
- `Alt + d`：从光标处删除至字尾；
- `Ctrl + d`：删除光标处的字符；
- `Ctrl + y`：粘贴由 Ctrl+u ， Ctrl+d ， Ctrl+w 删除的单词；
- `Ctrl + &`：恢复 ctrl+h 或者 ctrl+d 或者 ctrl+w 删除的内容；
- `Ctrl + c`：终止进程/命令；
- `Alt + c`：从光标处更改为首字母大写的单词；
- `Ctrl + z`：挂起命令，用bg命令放到后台继续运行；
- `Ctrl + s`：挂起当前的标准输入（stdin）, 用 `Ctrl + q` 恢复（等价于XON字符）；
- `Ctrl + q`：继续当前的标准输入，之前在 `Ctrl + s` 后的输入会恢复（等价于XOFF字符）；
- `Alt + u`：从光标处更改为全部大写的单词；
- `Alt + l`：从光标处更改为全部小写的单词；
- `Ctrl + t`：交换光标处和之前的字符；
- `Alt + t`：交换光标处和之前的单词；
- `Alt + Backspace`：与 `Ctrl + w` 相同，分隔符有些差别；
- `Ctrl + o`：执行当前命令，并选择上一条命令；
- `Ctrl + j`：跳转到新一行，类似回车；
- `Ctrl + m`：回车；

## iterm2 常用快捷键

**标签：**

- `command + t`：新建标签
- `command + w`：关闭标签
- `command + 数字 / command + 左右方向键`：切换标签
- `command + enter`：切换全屏
- `command + f`：查找

**分屏：**

- `command + d`：垂直分屏
- `command + shift + d`：水平分屏
- `command + option + 方向键 command + [ 或 command + ]`：切换屏幕
- `command + ;`：查看历史命令
- `command + shift + h`：查看剪贴板历史

## Bang (!) 命令

- `!!`：执行上一条命令；
- `!blah`：执行最近的以 blah 开头的命令，如 `!ls`；
- `!blah:p`：仅打印输出，而不执行；
- `!$`：上一条命令的最后一个参数，与 Alt + . 相同；
- `!$:p`：打印输出 !$ 的内容；
- `!*`：上一条命令的所有参数；
- `!*:p`：打印输出 !* 的内容；
- `^blah`：删除上一条命令中的 blah；
- `^blah^foo`：将上一条命令中的 blah 替换为 foo；
- `^blah^foo^`：将上一条命令中所有的 blah 都替换为 foo；

## 其他终端

- [hyper](https://github.com/vercel/hyper)
  - Hyper 使用 Electron 框架，这让它可以变得很漂亮、酷炫，但也带来了速度慢、体积大的缺点。它的插件和主题非常丰富，见 awesome-hyper，可以说是最多的。如果你不在乎性能，那 Hyper 也是不错的选择。它支持 Windows, Linux 和 MacOS。
- [Terminus](https://github.com/Eugeny/terminus)
  - Terminus 是一个高度定制化的终端模拟器，同样使用了 Electron，并可以设置成 Fluent Design 风格的背景，和 Windows 10 很搭配。它集成了 SSH 客户端和连接管理器，完全支持 Unicode，包括全角字符，拥有图形界面的设置页面。支持 Windows, Linux 和 MacOS。Terminus 同样有一些插件和主题。
- [Alacritty](https://github.com/alacritty/alacritty)
  - Alacritty 使用 Rust 开发，追求简单和性能。号称是现有最快的终端模拟器，使用了 GPU 渲染。支持 macOS，Linux，BSD 和 Windows。
  - 经实测，Alacritty 的打开速度可谓“秒开”，比 [Windows Terminal](https://github.com/microsoft/terminal) 还要快不少。
