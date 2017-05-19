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


光标的移动是编辑器中最常用的操作所以必须熟知。
- `C-h t` 打开 Emacs 提供的官方教程(t 在这里代表 tutorial）
- `C-f` 为前移一个字符， f 代表 forward。
- `C-b` 为后移一个字符， b 代表 backward。
- `C-p` 为上移至前一行， p 代表 previous。
- `C-n` 为上移至下一行， n 代表 next。
- `C-a` 为移至行首， a 代表 ahead。
- `C-e` 为移至行尾， e 代表 end。
<!--more-->
常用的文件操作快捷键组合也必须熟记。

- `C-x C-f` 为打开目标文件， f 代表 find/file
- `C-x C-s` 为保存当前缓冲区（Buffer）， s 代表 save
- `C-x` 是 Emacs 的快捷键中常用的前缀命令。这些前缀命令常常代表了一系列有关联的指令
- `C-g` 用于终端取消之前的指令


分屏操作
- `C-x 1` 仅保留当前窗口
- `C-x 2` 将当前窗口分到上边
- `C-x 3` 将当前窗口分到右边

获取帮助   
Emacs 是一个富文档编辑器（Self document, extensible editor）而下面的三种方法在学 习 Emacs 的过程中也非常重要。他们分别是
- `C-h k` 寻找快捷键的帮助信息
- `C-h v` 寻找变量的帮助信息
- `C-h f` 寻找函数的帮助信息

其他
- `C-h m` 来显示当前所有开启 的全部 Minor Mode 的信息。

## 学习基础 Elisp
Emacs Lisp 为一个函数式的语言，所以它全部 功能都是由函数来实现的。
- [Elisp快速入门](https://learnxinyminutes.com/docs/zh-cn/elisp-cn/)

## 配置
Emacs 的配置文件默认保存在 ~/.emacs.d/init.el 文件中。如果其不存在可自行创建， 配置文件也可保存在 ~/.emacs 文件中

建议使用前者，因为它有下面的两个优点
- 它可以更好将所有 Emacs 相关的文件整合在一个目录内（干净的 HOME ，网盘备份等优点）
- 更好的版本控制
*注意： 如果希望把配置放在 ~/.emacs.d/init.el 文件中，那么需要手工删除 ~/.emacs 文件。*

```lisp

;; =======配置 MELPA =========

(when (>= emacs-major-version 24)
     (require 'package)
     (package-initialize)
     (setq package-archives '(("gnu"   . "http://elpa.emacs-china.org/gnu/")
		      ("melpa" . "http://elpa.emacs-china.org/melpa/"))))

;; 注意 elpa.emacs-china.org 是 Emacs China 中文社区在国内搭建的一个 ELPA 镜像

 ;; cl - Common Lisp Extension
 (require 'cl)

 ;; Add Packages
(defvar my/packages '(
		evil
		;; --- Auto-completion ---
		company
		;; --- Better Editor ---
		hungry-delete
		swiper
		counsel
		smartparens
		;; --- Major Mode ---
		js2-mode
		;; --- Minor Mode ---
		nodejs-repl
		exec-path-from-shell
		;; --- Themes ---
		monokai-theme
		;; solarized-theme
		) "Default packages")

 (setq package-selected-packages my/packages)

 (defun my/packages-installed-p ()
     (loop for pkg in my/packages
	   when (not (package-installed-p pkg)) do (return nil)
	   finally (return t)))

 (unless (my/packages-installed-p)
     (message "%s" "Refreshing package database...")
     (package-refresh-contents)
     (dolist (pkg my/packages)
       (when (not (package-installed-p pkg))
	 (package-install pkg))))

 ;; Find Executable Path on OS X
 (when (memq window-system '(mac ns))
   (exec-path-from-shell-initialize))


;; =============插件配置============

;; 开启全局 Company 补全
(global-company-mode 1)

;; 每次打开编辑器时加载主题
(load-theme 'monokai 1)

;; Emacs 提供的默认 JavaScript Major Mode 并不是非常好用。
;; 所以我们可以将默认的模式 替换成 js2-mode 一个比默认模式好用的 Major Mode。
;; 我们可以通过 MELPA 来下载它，然 后用下面的代码将其启用。
(setq auto-mode-alist
      (append
       '(("\\.js\\'" . js2-mode))
       auto-mode-alist))

;; 激活evil
(evil-mode 1)

;; ================其他配置==========

;; 关闭工具栏，tool-bar-mode 即为一个 Minor Mode
(tool-bar-mode -1)

;; 关闭文件滑动控件
(scroll-bar-mode -1)

;; 显示行号
(global-linum-mode 1)

;; 更改光标的样式（不能生效，解决方案见第二集）
;;(setq cursor-type 'bar)
(setq-default cursor-type 'bar)

;; 关闭启动帮助画面
(setq inhibit-splash-screen 1)

;; 关闭缩进 (第二天中被去除)
;; (electric-indent-mode -1)

;; 关闭备份文件 xxx~
(setq make-backup-files nil)

;; 更改显示字体大小 16pt
;; http://stackoverflow.com/questions/294664/how-to-set-the-font-size-in-emacs
(set-face-attribute 'default nil :height 160)

;; 快速打开配置文件
(defun open-init-file()
  (interactive)
  (find-file "~/.emacs.d/init.el"))

;; 这一行代码，将函数 open-init-file 绑定到 <f2> 键上
(global-set-key (kbd "<f2>") 'open-init-file)

;; 最近 编辑过的文件。
(require 'recentf)
(recentf-mode 1)
(setq recentf-max-menu-item 10)

;; 这个快捷键绑定可以用之后的插件 counsel 代替
;; (global-set-key (kbd "C-x C-r") 'recentf-open-files)

;; 当你选中一段文字 之后输入一个字符会替换掉你选中部分的文字。
(delete-selection-mode 1)

;; 将 Emacs 设置为开启默认全屏
(setq initial-frame-alist (quote ((fullscreen . maximized))))

;; 启用自动括号匹配（Highlight Matching Parenthesis）
(add-hook 'emacs-lisp-mode-hook 'show-paren-mode)

;; 高亮当前行，当文本内容很多时可以很容易找到光标的位置。
(global-hl-line-mode 1)


(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(evil-want-C-u-scroll t))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )

```

## 常用插件
- [company](http://company-mode.github.io/)
- [hungry-delete](https://github.com/nflath/hungry-delete)
- [Smex])(https://github.com/nonsequitur/smex) (如果你使用 Counsel 来增强你的 M-x ，那么就不需要再安装 Smex 了)
- [Swiper & Counsel](https://github.com/abo-abo/swiper)
- [smartparens](https://github.com/Fuco1/smartparens)

## 参考资料

- [Emacs wiki](http://emacswiki.org/)
- [21 天学会 Emacs](https://zilongshanren.com/LearnEmacs/)
- [视频](http://list.youku.com/albumlist/show?id=26962151&ascending=1&page=1.html&spm=0.0.list1_1.5-3_5_A-3.I1iDe0)
- [Spacemacs Rocks 第二季](http://book.emacs-china.org)
- [Learn X in Y minutes](https://learnxinyminutes.com/)