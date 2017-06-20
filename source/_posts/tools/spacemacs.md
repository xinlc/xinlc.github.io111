---
layout: post
title: Emacs 学习(二)
date: 2017-06-05 11:30:00
categories: 工欲善其事必先利其器
tags:
  - emacs
---

[Spacemacs](https://github.com/syl20bnr/spacemacs)
---

## 安装 Spacemacs
```bash
cd ~
mv .emacs.d .emacs.d.bak
mv .emacs .emacs.bak
git clone https://github.com/syl20bnr/spacemacs ~/.emacs.d
```
在克隆完成后直接运行 Emacs. 在第一次使用 Spacemacs 时需要下载一些 Package, 然后在 Bootstrap 完成之后你需要进行如下一些配置:

1. 使用哪种编辑方式, 包括 vim 方式(默认) 以及 emacs 方式.
2. 使用哪种 Spacemacs distribution. 包括标准版(默认)以及基础版. 区别在于标准版包含非常多的功能, 而基础版只包含核心功能

在完成以上两个配置之后, 就会在 HOME 目录生成一个 ~/.spacemacs 配置文件

## 配置

- 将`~/.spacemacs` 移动到 `~/.spacemacs.d` 目录，修改为`init.el` (此操作方便管理自己的配置)
```
在 Spacemacs 中的操作方式如下:
按下 SPC f j 打开 dired 目录
按下按键 + , 创建 ~/.spacemacs.d 目录
将光标移动到 .spacemacs 文件上, 按下 R, 将该文件移动到 .spacemacs.d 目录中
进入 .spacemacs.d 目录, 将光标移动到 .spacemacs 文件上, 按下 R, 将该文件重命名为 init.el
按下 qq 退出 dired
```

- 修改[ELPA镜像](https://github.com/emacs-china/elpa), 添加下面的代码到 `~/.spacemacs.d/init.el` 的 dotspacemacs/user-init()函数中
```lisp
(setq configuration-layer--elpa-archives
    '(("melpa-cn" . "http://elpa.emacs-china.org/melpa/")
      ("org-cn"   . "http://elpa.emacs-china.org/org/")
      ("gnu-cn"   . "http://elpa.emacs-china.org/gnu/")))
```
- 在dotspacemacs-configuration-layers中启用常用的layer
```
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

- `dotspacemacs-maximized-at-startup t`  启动全屏
- `dotspacemacs-line-numbers 'relative `  启用相对行号
- `dotspacemacs-additional-packages '(youdao-dictionary)` 安装有道
- 配置 customize-group, 在`dotspacemacs/user-config`中
如果使用 customize-group 对配置进行了修改, 你可以以下代码将生成的 custom.el 配置文件纳入 ~/.spacemacs.d 目录中进行统一管理:
```lisp
(setq custom-file (expand-file-name "custom.el" dotspacemacs-directory))
(load custom-file 'no-error 'no-message)
```

## 快捷键
- `SPC-f-e-R`  同步配置
- `SPC-SPC configuration-layer/create-layer` 创建layer


## 参考资料

- [Spacemacs](https://github.com/syl20bnr/spacemacs)
- [Spacemacs rocks](https://github.com/emacs-china/Spacemacs-rocks)
- [Emacs China论坛](https://emacs-china.org/)
- [Emacs China社区](https://github.com/emacs-china)
- [Emacs China ELPA 镜像](https://github.com/emacs-china/elpa)

