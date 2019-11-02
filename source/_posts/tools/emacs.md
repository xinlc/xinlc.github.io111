---
layout: post
title: Emacs 学习(一)
date: 2017-05-19 15:11:43
categories: 工欲善其事必先利其器
tags:
  - emacs
---

## 安装

- [Mac](http://emacsformacosx.com/builds)
- [Window](http://emacsbinw64.sourceforge.net/)

## 基本使用

常见符号所代表的意义如下

- `M(eta)` 在 Mac 下为 Option 键
- `s(uper)` 在 Mac 环境下为左 Command 键
- `S(Shift)`
- `C(trl)`
- `C-x` 字符扩展。 C-x 之后输入另一个字符或者组合键。
- `M-x` 命令名扩展。M-x 之后输入一个命令名。
- `C-g` 用于终端取消之前的指令

<!--more-->

光标的移动是编辑器中最常用的操作所以必须熟知。

- `C-h t` 打开 Emacs 提供的官方教程(t 在这里代表 tutorial）
- `C-f` 为前移一个字符， f 代表 forward。
- `C-b` 为后移一个字符， b 代表 backward。
- `C-p` 为上移至前一行， p 代表 previous。
- `C-n` 为上移至下一行， n 代表 next。
- `C-a` 为移至行首， a 代表 ahead。
- `C-e` 为移至行尾， e 代表 end。
- `M-a` 为移至句首
- `M-e` 为移至句尾
- `M-f` 为前移一个单词，中文移动到下一个标点符号
- `M-b` 为后移一个单词
- `C-v` 向前移动一屏
- `M-v` 向后移动一屏
- `C-l` 重绘屏幕，并将光标所在行置于屏幕的中央
- `M-<` 移动到页首
- `M->` 移动到页尾
- `C-u` 前缀参数，举例来说， C-u 8 C-f 会向前移动 8 个字符。

文本操作

- `<DEL>` 删除光标前的一个字符
- `C-d` 删除光标后的一个字符
- `M-<DEL>` 移除光标前的一个词
- `M-d` 移除光标后的一个词
- `C-k` 移除从光标到“行尾”间的字符
- `M-k` 移除从光标到“句尾”间的字符
- `C-w` 剪切需要先 Mark set
- `M-w` 复制需要先 Mark set
- `C-@,C-w` 剪切选中段，或者用`C-<SPC>`选中，一般这个键被输入法占用了
- `C-y` 召回最近一次（yank, 复制）被移除的文字
- `M-y` 按下 C-y 后, 可以连续召回前几次移除的文字
- `C-/` undo 命令，`C-/`, `C-_`, `C-x u`作用一致
- `C-s` 向前搜索
- `C-r` 向后搜索
- `M-%` 交互式替换，y or n
- `M-x repl s` `repl s<TAB>` 替换文本, 或输入`replace-string` 例如： M-x repl s<Return>changed<Return>altered<Return>。

常用的文件操作快捷键组合也必须熟记。

- `C-x C-f` 为打开目标文件， f 代表 find/file
- `C-x C-s` 为保存当前缓冲区（Buffer）， s 代表 save
- `C-x C-b` 列出缓冲区（buffer）
- `C-x b` 选中缓冲区
- `C-x s` 保存多个缓冲区

分屏操作

- `C-x 1` 仅保留当前窗口
- `C-x 2` 将当前窗口分到上边
- `C-x 3` 将当前窗口分到右边
- `C-x 0` 将当前窗口关闭
- `C-M-v` 滚动下方的窗格。（如果你并没有 META 键，用 ESC C-v 也可以。）
- `C-M-S-v` 向上滚动
- `C-x o` 将光标转移到下方的窗格。（“o”指的是“其它（other）”）
- `C-x 4 C-f` 在新窗格中打开文件
- `M-x make-frame` 打开新的窗口
- `M-x delete-frame` 关闭选中窗口

获取帮助  
Emacs 是一个富文档编辑器（Self document, extensible editor）而下面的三种方法在学 习 Emacs 的过程中也非常重要。他们分别是

- `C-h k` 寻找快捷键的帮助信息
- `C-h v` 寻找变量的帮助信息
- `C-h f` 寻找函数的帮助信息

其他

- `C-x C-c` 离开 Emacs
- `C-h m` 来显示当前所有开启 的全部 Minor Mode 的信息。
- `C-x C-e` 在代码块后面按键来编译 elisp
- `M-x eval-buffer` 编译当前文件 elisp
- `M-x recover file` 恢复你的自动保存文件
- `<ESC> <ESC> <ESC>` 退出递归编辑（RECURSIVE EDITING LEVELS）
- (define-key global-map [C-return] 'set-mark-command) 修改 mark set 快捷键为 C-return

## 学习基础 Elisp

Emacs Lisp 为一个函数式的语言，所以它全部 功能都是由函数来实现的。

- [Elisp 快速入门](https://learnxinyminutes.com/docs/zh-cn/elisp-cn/)

## 配置

Emacs 的配置文件默认保存在 ~/.emacs.d/init.el 文件中。如果其不存在可自行创建， 配置文件也可保存在 ~/.emacs 文件中

建议使用前者，因为它有下面的两个优点

- 它可以更好将所有 Emacs 相关的文件整合在一个目录内（干净的 HOME ，网盘备份等优点）
- 更好的版本控制
  _注意： 如果希望把配置放在 ~/.emacs.d/init.el 文件中，那么需要手工删除 ~/.emacs 文件。_

- [配置文件](https://github.com/xinlc/dotfiles/tree/master/mac/emacs/zlsr)

## 常用插件

- [company](http://company-mode.github.io/)
- [hungry-delete](https://github.com/nflath/hungry-delete)
- [Smex])(https://github.com/nonsequitur/smex) (如果你使用 Counsel 来增强你的 M-x ，那么就不需要再安装 Smex 了)
- [Swiper & Counsel](https://github.com/abo-abo/swiper)
- [smartparens](https://github.com/Fuco1/smartparens)

## 插件管理

- `M-x package-list-packages` 或点击 Options -> Manage Emacs Packages # 打开插件管理
- 在插件名上按 `i`标记安装, 按`u`取消
- 按 `d` 标记删除
- `U` 更新所有
- `x` 执行
- `C-s` 搜索
- `M-x package-autoremove` 删除没用的 packages

## Dired Mode

Dired Mode 是一个强大的模式它能让我们完成和文件管理相关的所有操作。

使用 C-x d 就可以进入 Dired Mode，这个模式类似于图形界面系统中的资源管理器。你 可以在其中查看文件和目录的详细信息，对他们进行各种操作，甚至复制粘贴缓冲区中的内 容。下面是一些常用的操作（下面的所有键均需在 Dired Mode 下使用），

- `+` 创建目录
- `g` 刷新目录
- `C` 拷贝
- `D` 删除
- `R` 重命名
- `d` 标记删除
- `u` 取消标记
- `x` 执行所有的标记
- `Shift + 6` 跳转到上级目录

## 参考

- [Emacs wiki](http://emacswiki.org/)
- [21 天学会 Emacs](https://zilongshanren.com/LearnEmacs/)
- [视频](http://list.youku.com/albumlist/show?id=26962151&ascending=1&page=1.html&spm=0.0.list1_1.5-3_5_A-3.I1iDe0)
- [Spacemacs Rocks 第二季](http://book.emacs-china.org)
- [Learn X in Y minutes](https://learnxinyminutes.com/)
