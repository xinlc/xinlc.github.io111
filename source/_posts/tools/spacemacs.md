---
layout: post
title: Emacs 学习(二)
date: 2017-06-05 11:30:00
categories: 工欲善其事必先利其器
tags:
  - emacs
---

## 安装 Spacemacs

```bash
cd ~
mv .emacs.d .emacs.d.bak
mv .emacs .emacs.bak
git clone https://github.com/syl20bnr/spacemacs ~/.emacs.d
```

<!--more-->

在克隆完成后直接运行 Emacs. 在第一次使用 Spacemacs 时需要下载一些 Package, 然后在 Bootstrap 完成之后你需要进行如下一些配置:

1. 使用哪种编辑方式, 包括 vim 方式(默认) 以及 emacs 方式.
2. 使用哪种 Spacemacs distribution. 包括标准版(默认)以及基础版. 区别在于标准版包含非常多的功能, 而基础版只包含核心功能

在完成以上两个配置之后, 就会在 HOME 目录生成一个 ~/.spacemacs 配置文件

## 配置

- 将`~/.spacemacs` 移动到 `~/.spacemacs.d` 目录，修改为`init.el` (此操作方便管理自己的配置)

```bash
在 Spacemacs 中的操作方式如下:
按下 SPC f j 打开 dired 目录
按下按键 + , 创建 ~/.spacemacs.d 目录
将光标移动到 .spacemacs 文件上, 按下 R, 将该文件移动到 .spacemacs.d 目录中
进入 .spacemacs.d 目录, 将光标移动到 .spacemacs 文件上, 按下 R, 将该文件重命名为 init.el
按下 qq 退出 dired
```

- 修改[ELPA 镜像](https://github.com/emacs-china/elpa), 添加下面的代码到 `~/.spacemacs.d/init.el` 的 dotspacemacs/user-init()函数中

```lisp
(setq configuration-layer--elpa-archives
    '(("melpa-cn" . "http://elpa.emacs-china.org/melpa/")
      ("org-cn"   . "http://elpa.emacs-china.org/org/")
      ("gnu-cn"   . "http://elpa.emacs-china.org/gnu/")))
```

- 在 dotspacemacs-configuration-layers 中启用常用的 layer

```bash
helm -> ivy      # 用ivy
auto-completion
better-defaults
emacs-lisp
git
markdown
org
spell-checking
syntax-checking
```

- `dotspacemacs-maximized-at-startup t` 启动全屏；
- `dotspacemacs-line-numbers 'relative` 启用相对行号；
- `dotspacemacs-additional-packages '(youdao-dictionary)` 安装有道；
- 配置 customize-group, 在`dotspacemacs/user-config`中；
  如果使用 customize-group 对配置进行了修改, 你可以以下代码将生成的 custom.el 配置文件纳入 ~/.spacemacs.d 目录中进行统一管理:

```lisp
(setq custom-file (expand-file-name "custom.el" dotspacemacs-directory))
(load custom-file 'no-error 'no-message)
```

## 快捷键

### 一些 emacs 名词概念解释

| 名词    | 解释                                                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| project | 在某目录里建立一个空文件.projectile。就成功创建了一个 project 目录。可以在这个目录进行 grep 操作                             |
| window  | 窗口，可以分栏。                                                                                                             |
| frame   | 是一个 emacs 框架。可以包含多个 window                                                                                       |
| buffer  | 文件加载到 emacs 里，就称之为一个 buffer。一个 emacs 可以存在很多很多 buffer。可以在打开的多个 buffer 里搜索关键词或者文件名 |
| layout  | emacs 的窗口界面，以及 emacs 打开的 buffer 文件。作为一个 session，保存下来。                                                |

### 常用快捷键

- `ctrl-g` 命令退出。emacs 自带的；
- `,` （注意：不需要 SPC 启动）当前模式下的 lead-key 快捷键，可以显示当前模式的常用命令；
- `;` 用来注释代码的，这个可以查看一下帮助手册。各种注释操作；
- `?` 显示所有快捷键。可以 grep 关键词查找快捷键；
- `SPC !` 执行 shell 命令；
- `SPC *或者/` 在 project 里搜索关键词；
- `SPC f f` 打开文件；
- `SPC p f` 搜索文件名；
- `SPC s a p` 搜索内容；
- `SPC b k` 关闭当前 buffer；
- `SPC f t` 打开/关闭侧边栏；
- `SPC 0` 光标跳转到侧边栏（NeoTree）中；
- `SPC w s | SPC w -` 水平分割窗口；
- `SPC w v | SPC w /` 垂直分割窗口；
- `SPC w c` 关闭当前窗口；
- `SPC j =` 自动对齐，相当于 beautify；
- `SPC b b` 查找并切换到 buffer/recent-file；
- `SPC b d` 删除当前 buffer；
- `SPC a u` undo 作用。可以上下操作，是 undo 的 history 列表；
- `SPC p p` 打开或切换某个 project；
- `SPC s a p` 在 project 的所有文件里，使用 ag（因为 ag>ack>grep 的搜索速度)搜索；
- `SPC s s` 在当前 buffer 里搜索关键词；
- `SPC v` 外扩命令。就是代码不断增加选中的范围。v 是继续外扩；V 是缩小外扩；

### 文件操作

- `SPC f t` 打开/关闭侧边栏；
- `SPC p f` 在当前的项目中查找文件；
- `SPC f f` 从当前目录开始查找文件；
- `SPC f L` 使用 helm-locate 来在当前系统中查找文件；
- `SPC f l` 查找文件并使用 literal 的方式来打开文件, 使用 literal 方式打开的文件不会附加编码信息, 例如 utf-8 编码中可能存在的 BOM 头信息, 使用 literal 模式即可以看到 BOM 头；
- `SPC f h` 查找文件并使用二进制的方式来打开文件, 可以使用 C-c C-c 回到之前的模式；
- `SPC f o` 使用外部程序打开文件；
- `SPC f E` 使用 sudo 来编辑文件, 当某些文件是只读的时候可以采用这种方式来编辑文件；
- `SPC f D` 删除当前的文件和 buffer；
- `SPC f j` 以当前文件的目录打开 dired buffer；
- `SPC f r` 使用 ivy 打开最近文件列表；
- `SPC f R` 重命名当前文件；
- `SPC f v` 添加 local variables, 可以通过这个功能给项目做一些特殊的设置. 例如按下 SPC f v, 然后选择 add-dir-local-variable, 选择 org-mode, 再选择 org-highlight-links 变量, 此时 emacs 会在当前文件的目录下生成一个 .dir-locals.el 文件, 内容如下:

```lisp
((org-mode
  (org-highlight-links)))
这个文件中的代码会在当前目录下的所有文件 buffer 中生效.
```

- `SPC f y` 拷贝当前文件的全路径；
- `SPC f a d` 列出最近访问的目录, 使用命令行工具 fasd 实现；
- `SPC f C d/u` 将当前文件的编码转换为 DOS/UNIX 编码；
- `SPC f e d` 打开 .spacemacs 或 .spacemacs.d/init.el 文件；
- `SPC f e i` 打开 .emacs 或 .emacs.d/init.el 文件；
- `SPC f e l` 打开系统中已经安装的 el 文件；
- `SPC f c` 复制文件；
- `SPC f b` 打开标签；
- `SPC f s/S` 保存当前 buffer 或 所有 buffer；

### buffer 相关操作

- `SPC b .` 打开 Buffer Selection Transient State, 在该模式下可以进行更多的操作, 由 hydra 提供；
- `SPC b b` 切换到已经打开的 buffer；
- `SPC b d` 关闭一个 buffer；
- `SPC b f` 在 finder 中打开当前文件, 只在 Mac 系统下生效；
- `SPC b B/i` 以类似 Dired Mode 的形式打开 buffer 列表, 在这个列表中可以执行和 Dired Mode 类似的操作；
- `SPC b h` 进入 \*spacemacs\* buffer；
- `SPC b k` 使用正则表达式来删除 buffer；
- `SPC b N` 新建一个 buffer；
- `SPC b m` 删除除当前 buffer 外的所有 buffer；
- `SPC b R` 使用 emacs 自动备份的文件恢复文件；
- `SPC b s` 跳转到 scratch buffer；
- `SPC b w` 关闭/打开 buffer 的 read-only；
- `SPC b Y` 复制整个 buffer 的内容；
- `SPC b P` 将剪切板的内容粘贴到整个 buffer；
- `SPC <tab>` 在当前 buffer 和上一个打开的 buffer 中进行切换；

### Window 相关操作

- `SPC w -` 上下拆分窗口；
- `SPC w /` 左右拆分窗口；
- `SPC w .` 显示更多的与 window micro state 的相关的命令；
- `SPC w 2/3` 左右显示 2/3 个窗口；
- `SPC w =` 将窗口均等分；
- `SPC w b` 切换到 minibuffer；
- `SPC w d` 删除当前窗口；
- `SPC w h/j/k/l` 向 左/下/上/右 移动窗口；
- `SPC w m` 最大化显示当前窗口；
- `SPC W H/J/K/L` 将当前窗口向 左/下/上/右 移动；
- `SPC w u/U` 取消/重置上次操作；
- `SPC w o` 切换到其他 frame；
- `SPC w F` 创建一个新的 frame；
- `SPC w 1/2/3/4` 切换到对应的编号的窗口；
- `SPC w w` 依次切换到其他窗口；
- `SPC w W` 使用字母标识需要跳转的窗口, 并按下字母进行跳转；
- `SPC t g` 将当前显示的窗口与其他窗口进行黄金分割显示；
- `SPC t -` 开启/关闭 将光标始终显示在中心行；

### project 相关操作

- `SPC p f` 在当前 project 中查找并打开文件；
- `SPC p b` 在当前 project 中查找打开的 buffer；
- `SPC p p` 切换到其他的 project；
- `SPC p l` 切换到其他的 project 并创建一个新的 layout；
- `find-file-in-project` 这是一个插件, 支持全平台. 目前绑定在 SUPER f 快捷键上；

### Layout 相关操作

- `SPC l L` 加载 layout 文件；
- `SPC l l` 在 layout 之间切换；
- `SPC l s` 将 layout 保存到文件, 输入 layout 的名称；
- `SPC l <tab>` 在当前 layout 和上一个 layout 之间切换；
- `SPC l o` 配置 layout；
- `SPC l R` 重命名 layout；
- `SPC l ?` 显示更多的与 layout 相关的命令；

### 其他

- `SPC f e d` 快速打开配置文件 .spacemacs；
- `SPC-f-e-R` 同步配置；
- `SPC-SPC configuration-layer/create-layer` 创建 layer；

## 参考

- [Spacemacs](https://github.com/syl20bnr/spacemacs)
- [Spacemacs rocks](https://github.com/emacs-china/Spacemacs-rocks)
- [Emacs China 论坛](https://emacs-china.org/)
- [Emacs China 社区](https://github.com/emacs-china)
- [Emacs China ELPA 镜像](https://github.com/emacs-china/elpa)
