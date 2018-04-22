---
layout: post
title:  "Vim之从入门到放弃!"
date:   2017-03-12 20:00:00 +0800
categories: 工欲善其事必先利其器
tags:
	- linux
	- vim
---
## [入门](#vim理解)

## [放弃](http://vim-adventures.com/)

## 什么是 Vim？

Vim 是一个历史悠久的文本编辑器，可以追溯到 [qed](https://en.wikipedia.org/wiki/QED_(text_editor))。[Bram Moolenaar](https://en.wikipedia.org/wiki/Bram_Moolenaar) 于 1991 年发布初始版本。
该项目托管在 [vim.org](https://www.vim.org/index.php)。
获取 Vim：用包管理器安装或者直接到 `vim.org` [下载](https://www.vim.org/download.php)。

<!--more-->

## Vim 哲学

Vim 采用模式编辑的理念，即它提供了多种模式，按键在不同的模式下作用不同。你可以在 普通模式 下浏览文件，在 插入模式 下插入文本，在 可视模式 下选择行，在 命令模式 下执行命令等等。起初这听起来可能很复杂，但是这有一个很大的优点：不需要通过同时按住多个键来完成操作，大多数时候你只需要依次按下这些按键即可。越常用的操作，所需要的按键数量越少。

和模式编辑紧密相连的概念是“操作符”和“动作”。操作符 开始一些行为，例如：修改，删除，或者选择文本。之后你要用一个 动作 来指定需要操作的文本区域。比如，要改变括号内的文本，需要执行 ci( （读做 change inner parentheses）；删除整个段落的内容，需要执行 dap （读做：delete around paragraph）。

## 使用

Vim 自带一个交互式的教程，内含你需要了解的最基础的信息，你可以通过终端运行以下命令打开教程：

```bash
$ vimtutor
```

Vim帮助文档非常棒，在Vim用运行`:help`打开帮助文档，[中文帮助文档配置](https://blog.csdn.net/uhippo/article/details/8374255)

## vim理解

这部分来源 [一起来说 Vim 语](http://www.jianshu.com/p/a361ce8c97bc)，理解此部分是需要你已经了解了 Vim 的几种常用的工作模式（正常模式、插入模式、命令模式等）。

### 动词

动词代表了我们打算对文本进行什么样的操作。例如：

```bash
d # 表示删除delete
r # 表示替换replace
c # 表示修改change
y # 表示复制yank
v # 表示选取visual select
```

### 名词

名词代表了我们即将处理的文本。Vim 中有一个专门的术语叫做 [文本对象] text object，下面是一些文本对象的示例：

```bash
w # 表示一个单词word
s # 表示一个句子sentence
p # 表示一个段落paragraph
t # 表示一个 HTML 标签tag
引号或者各种括号所包含的文本称作一个文本块。
```

### 介词

介词界定了待编辑文本的范围或者位置。

```bash
i # 表示在...之内 inside
a # 表示环绕... around
t # 表示到...位置前 to
f # 表示到...位置上 forward
```

### 数词

数词指定了待编辑文本对象的数量，从这个角度而言，数词也可以看作是一种介词。引入数词之后，文本编辑命令的语法就升级成了下面这样：

```
动词 介词/数词 名词
```

下面是几个例子：

```bash
c3w  # 修改三个单词：change three words
d2w  # 删除两个单词：delete two words
```

另外，数词也可以修饰动词，表示将操作执行 n 次。于是，我们又有了下面的语法：

```
数词 动词 名词
```

请看示例：

```bash
2dw # 两次删除单词（等价于删除两个单词）: twice delete word
3x  # 三次删除字符（等价于删除三个字符）：three times delete character
```

### 组词为句

有了这些基本的语言元素，我们就可以着手构造一些简单的命令了。文本编辑命令的基本语法如下：

```
动词 介词 名词
```

下面是一些例子（如果熟悉了上面的概念，你将会看到这些例子非常容易理解），请亲自在 Vim 中试验一番。

```bash
dip # 删除一个段落: delete inside paragraph
vis # 选取一个句子: visual select inside sentence
ciw # 修改一个单词: change inside word
caw # 修改一个单词: change around word
dtx # 删除文本直到字符“x”（不包括字符“x”）: delete to x
dfx # 删除文本直到字符“x”（包括字符“x”）: delete forward x
```

![](/images/vi-vim-cheat-sheet-sch.gif)

熟练掌握Vim各种命令, 在`Normal`模式下运行。
## 进入编辑模式

```bash
a # 在光标所在字符后插入
A # 在光标所在字符尾插入
i # 在光标所在字符前插入
I # 在光标所在行行首插入
o # 在光标下插入新行
O # 在光标上插入新行
```

## 移动/定位

开启行号方便我们定位`:set number`， 取消行号 `:set nonu`。

```bash
hjkl # 前下上后

w   # 到下一个单词的开头
b   # 与w相反
e   # 到下一个单词的结尾
ge  # 与e相反

gg  # 到第一行
G   # 到最后一行
nG  # 到第n行
:n  # 到第n行
{n}% # 按百分比来跳转，例如，跳到文件的正中间，输入”50%“

0   # 到行头
^   # 到本行的第一个非blank字符
$   # 到行尾
g_  # 到本行最后一个不是blank字符的位置
fa  # 到下一个为a的字符处，你也可以fs到下一个为s的字符
t,  # 到逗号前的第一个字符。逗号可以变成其它字符
3fa # 在当前行查找第三个出现的a
F 和 T # f 和 t 一样，只不过是相反方向


( # 移到句子的开头
) # 移到句子的结尾
{ # 移到段落的开头
} # 移到下一个段落的开头

H # 光标跳转到窗口顶部
M # 光标跳转到窗口中间
L # 光标跳转到窗口底部

zz # 将当前行置于屏幕中间
zt # 将当前行置于屏幕顶端
zb # 将当前行置于屏幕底端

[z # 到当前打开折叠的开始
]z # 到当前打开折叠的结束
zj # 向下移动到下一个折叠的开始处
zk # 向上移动到上一个折叠的结束处

```

## 复制剪切

`yy` 和 p 的组合键，或者 `dd` 和 p 的组合键

```bash
yy    # 复制当前行  
y     # 复制选中字符
nyy   # n表示大于1的数字，复制n行
yw    # 从光标处复制至一个单子/单词的末尾，包括空格
ye    # 从光标处复制至一个单子/单词的末尾，不包括空格
y$    # 从当前光标复制到行末
y0    # 从当前光标位置（不包括光标位置）复制之行首
y3l   # 从光标位置（包括光标位置）向右复制3个字符
y5G   # 将当前行（包括当前行）至第5行（不包括它）复制
y3B   # 从当前光标位置（不包括光标位置）反向复制3个单词
p、P  # 粘贴在当前光标所在行或行上
3p    # 粘贴文本3次
dd    # 剪切当前行
2dd   # 删除2行
ndd   # 剪切当前行以下n 行
```

## 删除命令

```bash
x   # 向后删除字符
X   # 向前删除字符
dd  # 删除光标所在行
ndd # 删除n行
dG  # 删除光标所在行到文件末尾内容
dfa # 删除从当前光标删除到a字符
2dfa # 删除从当前光标删除到第二个a字符
D   # 删除光标所在处到行尾内容
S   # 删除当前行内容并进入编辑模式
:n1,n2d # 删除指定范围的行 如：1,2d
```

## 保存退出

```bash
:w   # 保存修改
:wq  # 保存修改并推出
ZZ   # 快捷键，保存修改并推出
:q!  # 不保存修改推出
:wq! # 保存修改并推出（文件所有者，root权限的用户）
:w filename     # 保存为指定文件
```

## 滚动

`caps lock`换成`control`，相信我你会爱上它。

```bash
ctrl + y  # 向上一行
ctrl + e  # 向下一行
ctrl + u  # 向上半屏
ctrl + d  # 向下半屏
ctrl + f  # 下一页 f 就是`forword`
ctrl + b  # 上一页 b 就是`backward`
ctrl + g  # 查看一下自己位置
20%       # 滚动百分之20
zL        # 视图向右移动半个屏幕
zH        # 视图向左移动半个屏幕
zs        # 视图移动到最左侧
ze        # 视图移动到最右侧
```

## 窗口操作

```bash
:new       # 水平切割窗口
:split     # 水平切割窗口(或者直接输入   :sp  也可以)
:vsplit    # 垂直切割( 也可以  :vs  )
:only      # 关闭其它分屏窗口
:Explore   # 文件浏览
:Sexplore! # 当前窗口 垂直分割打开文件浏览
:ls        # 显示缓冲区列表
ctrl + ww  # 移动到下一个窗口
ctrl + wj  # 移动到下方的窗口
ctrl + wk  # 移动到上方的窗口
```

## Tab操作

```bash
:tabnew file # 建立对指定文件新的tab
:tabc        # 关闭当前的tab
:tabo        # 关闭所有其他的tab
:tabs        # 查看所有打开的tab
:tabp        # 前一个
:tabn        # 后一个
tnew         # 新建tab
tn           # 后一个 tab
tp           # 前一个 tab
nw           # 窗口切换
gt , gT      # 可以直接在tab之间切换
```

## 代码折叠

```bash
zf     # 创建折叠
zd     # 删除光标下的折叠
zD     # 循环删除光标下的折叠，可视模式下删除选中区域的所有折叠
zE     # 删除页面内所有折叠
zo     # 打开光标下的折叠
zO     # 循环打开光标下的折叠
zc     # 关闭折叠
zC     # 循环关闭光标下的折叠
za     # 折叠开关
zA     # 选中区域的折叠开关
```

## Vim常用命令

```bash
dw, d2w, dtx # 删除一个单词，2个单词，删除文本到“x” 字符不包括“x”字符
c, y, v     # 修改, 复制, 选择命令同上
dd          # 删除一行
yy/Y        # 复制一行
p           # p 为将已复制的数据在光标下一行贴上(P反方向)
x           # x 为向后删除一个字符（X反方向）

w           # 到下一个单词的开头
b           # 与w相反
0           # 到行头
^           # 到本行的第一个非blank字符
$           # 到行尾
t{char}     # 跳到本行中右边字符{char}左边的位置，T(反方向)，“；”正向重复 “，”反向重复
f{char}     # 跳到本行中右边字符{char}的位置
gg          # 到第一行
G           # 到最后一行
nG          # 到第n行
H           # 光标移动到这个屏幕的最上方那一行的第一个字符
M           # 光标移动到这个屏幕的中央那一行的第一个字符
L           # 光标移动到这个屏幕的最下方那一行的第一个字符
%           # 匹配括号移动，包括 (, {, [. （需要把光标先移到括号上）
*           # 匹配光标当前所在的单词，移动光标到下一个
#           # 匹配光标当前所在的单词，移动光标到上一个

/word       # 向光标之下寻找一个名称为 word 的字符串（?word 向光标上寻找）
n           # 重复前一个搜寻的动作（N反方向）

U           # 选中变大写
u           # 选中变小写
J           # 选中多行合并
u           # 取消上一步操作
ctrl + r    # 返回上一步
.           # (小数点) 可以重复上一次的命令

gv          # 启动可视模式，并重新选中上一次的选择区, o跳到高亮文本的另一端
~           # 选中模式下，变换大小写
q:          # 调出历史命令窗口
K           # 打开光标所在单词的manpage
gf          # 在当前页面打开光标下的文件，Ctrl-O返回原始文件
gF          # 在另外一个页面打开光标下文件，Ctrl-O返回原始文件
gd          # jump to definition.
dG          # 全部删除
ggyG        # 全部复制

:%y         # 拷贝整个文件
:r !date    # 在光标处插入日期和时间，date也可以换成其它命令
:noh        # 取消搜索高亮。（nohlsearch/nohl）
:n1,n2s/word1/word2/g # n1 与 n2 为数字。在第 n1 与 n2 行之间寻找 word1 这个字符串，并将该字符串取代为 word2
:1,$s/word1/word2/g  # 从第一行到最后一行寻找 word1 字符串，并将该字符串取代为 word2

大块复制      # 光标移到结束行，输入ma, 光标移到起始行，输入y'a, 光标移到需要复制的行，输入p, 行前复制输入大写P
:5,10 copy 11  或 ：5,10 co 11 (move/m 剪切; de 删除)
```

## 常用快捷键

```bash
shift + v # 行选中模式
shift + i # 多行编辑，需要先 ctrl + v
ctrl + v  # 进入选中模式，`hjkl`方向键选择片区
ctrl + y  # 向上一行
ctrl + e  # 向下一行
ctrl + u  # 向上半屏
ctrl + d  # 向下半屏
ctrl + f  # 下一页 f 就是`forword`
ctrl + b  # 上一页 b 就是`backward`
ctrl + o  # 上一个光标的位置
ctrl + i  # 下一个光标的位置
ctrl + O    # 暂时离开插入模式并执行一次命令
```

## 参考资料
- [Vim 从入门到精通](https://github.com/wsdjeg/vim-galore-zh_cn)
- [一起来说 Vim 语](http://www.jianshu.com/p/a361ce8c97bc)
- [vi/vim使用进阶](https://blog.easwy.com/archives/advanced-vim-skills-catalog/)
- [Vim ide，教你安装配置自己的Vim](https://github.com/jaywcjlove/vim-web)
- [VimScript学会如何自定义Vim编辑器](http://learnvimscriptthehardway.onefloweroneworld.com/)
- [Vi中的正则表达式](http://tech.idv2.com/2008/07/08/vim-regexp/)
- [vim 中文手册](http://vimcdoc.sourceforge.net) <!-- https://www.vim.org -->
