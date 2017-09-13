---
layout: post
title:  "Vim 配置选项"
date:   2017-09-13 15:40:00 +0800
categories: 工欲善其事必先利其器
tags:
  - vim
---

# 选项配置说明

| 选项书写格式 | 选项说明 |
| --- | --- |
| `:se[t]` | `显示所有被改动的选项` |
| `:se[t] all` | `显示所有非 termcap 选项` |
| `:se[t] termcap` | `显示所有 termcap 选项` |
| `:se[t] {option}` | `置位布尔选项(开启) 显示字符串或数值选项` |
| `:se[t] no{option}` | `复位布尔选项(关闭)` |
| `:se[t] inv{option}` | `逆转布尔选项的值` |
| `:se[t] {option}={value}` | `将 {value} 附加到字符串选项里, {value} 加到数值选项上` |
| `:se[t] {option}+={value}` | `将 {value} 附加到字符串选项里， {value} 加到数值选项上` |
| `:se[t] {option}-={value}` | `从 {value} 从字符串选项里删除 ，数值选项里减去` |
| `:se[t] {option}?` | `显示 {option} 的值` |
| `:se[t] {option}&` | `重置 {option} 为其缺省值` |
| `:setl[ocal]` | `同 ":set" ，但对局部选项只设定局部值` |
| `:setg[lobal]` | `同 ":set" ，但对局部选项设定其全局值` |
| `:fix[del]` | `根据 't_kb' 的值设置 't_kD'` |
| `:opt[ions]` | `打开一个新窗口，用来参看并设置选项，选项们以功能分组，有单行的解释，并有指向帮助的链接` |

<!--more-->

# 各选项的简短说明

### A

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `aleph` | `al` | `Aleph 字母(希伯来语) 的 ASCII 代码` |
| `allowrevins` | `ari` | `允许插入和命令行模式的 CTRL-_` |
| `altkeymap` | `akm` | `缺省的第二语言(波斯语/希伯来语)` |
| `ambiwidth` | `ambw` | `如何处理有多种宽度的 Unicode 字符` |
| `antialias` | `anti` | `Mac OS X:用平滑反锯齿的字体` |
| `autochdir` | `acd` | `根据当前窗口的文件切换目录` |
| `arabic` | `arab` | `使用阿拉伯语为缺省的第二语言` |
| `arabicshape` | `arshape` | `阿拉伯语的字型重整` |
| `autoindent` | `ai` | `根据上一行决定新行的缩进` |
| `autoread` | `ar` | `有 Vim 之外的改动时自动重读文件` |
| `autowrite` | `aw` | `有改动时自动回写文件` |
| `autowriteall` | `awa` | `类似于 'autowrite' ，但适用于更多命令` |

### B

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `background` | `bg` | `"dark" 或 "light" ，用于色彩的高亮` |
| `backspace` | `bs` | `在一行开关按退格键如何处理` |
| `backup` | `bk` | `覆盖文件时保留备份文件` |
| `backupcopy` | `bkc` | `文件备份使用复制而不是换名` |
| `backupdir` | `bdir` | `备份文件使用的目录列表` |
| `backupext` | `bex` | `备份文件使用的扩展名` |
| `backupskip` | `bsk` | `匹配这些模式的文件不予备份` |
| `balloondelay` | `bdlay` | `弹出气泡之前的延迟(以毫秒计)` |
| `ballooneval` | `beval` | `打开气泡表达式求值功能` |
| `balloonexpr` | `bexpr` | `计算气泡显示内容的表达式` |
| `binary` | `bin` | `二进制方式读/写/编辑文件` |
| `bioskey` | `biosk` | `MS-DOS ：用 bios 调用取得字符输入` |
| `bomb` |  | `文件头附加字节顺序标记(Byte Order Mark)` |
| `breakat` | `brk` | `可以在此断行的字符` |
| `brosedir` | `bsdir` | `开始浏览文件的目录` |
| `bufhidden` | `bh` | `缓冲区不再在窗口显示时的行为` |
| `buflisted` | `bl` | `缓冲区是否显示在缓冲区列表中` |
| `buftype` | `bt` | `缓冲区的特殊类型` |

### C

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `casemap` | `cmp` | `指定字母大小写如何改变` |
| `cdpath` | `cd` | `":cd" 搜索的目录列表` |
| `cedit` |  | `打开命令行窗口的键` |
| `charconvert` | `ccv` | `完成字符编码转换的表达式` |
| `cindent` | `cin` | `实现 C 程序的缩进` |
| `cinkeys` | `cink` | `设置 'cindent' 时启动缩进的键` |
| `cinoptions` | `cino` | `设置 'cindent' 时如何缩进` |
| `cinwords` | `cinw` | `'si' 和 'cin' 在这些词后加入额外的缩进` |
| `clipboard` | `cb` | `使用剪贴板作为无名的寄存器` |
| `cmdheight` | `ch` | `命令行使用的行数` |
| `cmdwinheight` | `cwh` | `命令行窗口的高度` |
| `colorcolumn` | `cc` | `高亮指定列` |
| `columns` | `co` | `显示屏幕的列数` |
| `comments` | `com` | `可以开始注释行的模式` |
| `commentstring` | `cms` | `注释的样板：用于折叠的标志` |
| `compatible` | `cp` | `尽可能做到与 Vi 兼容` |
| `complete` | `cpt` | `指定插入模式的自动补全如何工作` |
| `completefunc` | `cfu` | `插入模式补全使用函数` |
| `completeopt` | `cot` | `插入模式补全使用的选项` |
| `concealcursor` | `cocu` | `是否隐藏光标所有行的可隐藏文本` |
| `conceallevel` | `cole` | `是否显示可隐藏文本` |
| `confirm` | `cf` | `询问如何处理未保存/只读的文件` |
| `conskey` | `consk` | `直接从控制台读入键击(只限于 MS-DOS)` |
| `copyindent` | `ci` | `使得 'autoindent' 使用已有的缩进结构` |
| `cpoptions` | `cpo` | `设定 Vi-兼容的行为` |
| `cryptmethod` | `cm` | `文件写入时所用的加密方法` |
| `cscopepathcomp` | `cspc` | `显示路径多少部分` |
| `cscopeprg` | `csprg` | `执行 cscope 的命令` |
| `cscopequickfix` | `csqf` | `用 quickfix 窗口得到 cscope 的结果` |
| `cscoperelative` | `csre` | `用 cscope.out 路径目录名作为前缀` |
| `cscopetag` | `cst` | `用 cscope 处理标签命令` |
| `cscopetagorder` | `csto` | `决定 ":cstag" 的搜索顺序` |
| `cscopeverbose` | `csverb` | `增加 cscope 数据库时给出消息` |
| `cursorbind` | `crb` | `光标移动时同时在其他窗口移动` |
| `sursorcolumn` | `cuc` | `高亮光标所在屏幕列` |
| `cursorline` | `cul` | `高亮光标所在屏幕行` |

### D

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `debug` |  | `设为 "msg" 可以看到所有错误消息` |
| `define` | `def` | `查找宏定义所使用的模式` |
| `delcombine` | `deco` | `在单独使用时删除组合用字符` |
| `dictionary` | `dict` | `关键字自动补全所用的文件名` |
| `diff` |  | `当前窗口使用 diff 模式` |
| `diffexpr` | `dex` | `得到 diff 文件所用的表达式` |
| `diffopt` | `dip` | `使用 diff 模式的选项` |
| `digraph` | `dg` | `允许插入模式时输入二合字母` |
| `directory` | `dir` | `交换文件所用的目录名列表` |
| `display` | `dy` | `如何显示文本的标志位列表` |

### E

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `eadirection` | `ead` | `'equalalways' 工作的方向` |
| `edcompatible` | `ed` | `切换 ":subsitute" 命令的标志位` |
| `encoding` | `enc` | `内部使用的编码方式` |
| `endofline` | `eol` | `文件最后一行写入换行符 <EOL>` |
| `equalalways` | `ea` | `自动使所有窗口大小相同` |
| `equalprg` | `ep` | `"=" 命令使用的外部命令` |
| `errorbells` | `eb` | `有错误信息时响铃` |
| `errorfile` | `ef` | `QuickFix 模式的错误文件名` |
| `errorformat` | `efm` | `错误文件行格式的描述` |
| `esckeys` | `ek` | `插入模式下识别功能键` |
| `eventignore` | `ei` | `忽略的自动命令事件` |
| `expandtab` | `et` | `键入 <Tab> 时使用空格` |
| `exrc` | `ex` | `在当前目录里读入 .vimrc 和.exrc` |

### F

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `fileencoding` | `fenc` | `多字节文本的文件编码` |
| `fileencodings` | `fencs` | `参与自动检测的字符编码` |
| `fileformat` | `ff` | `文件输入输出使用的格式` |
| `fileformats` | `ffs` | `参与自动检测的 'fileformat' 的格式` |
| `fileignorecase` | `fic` | `使用文件名时忽略大小写` |
| `filetype` | `ft` | `自动命令使用的文件类型` |
| `fillchars` | `fcs` | `显示特殊项目所使用的字符` |
| `fkmap` | `fk` | `波斯键盘映射` |
| `foldclose` | `fcl` | `当光标离开时关闭折叠` |
| `foldcolumn` | `fdc` | `设定指示折叠的列宽度` |
| `foldenable` | `fen` | `设置为显示所用打开的折叠` |
| `foldexpr` | `fde` | `当 'foldmethod' 为 "expr" 时使用的表达式` |
| `foldignore` | `fdi` | `当 'foldmethod' 为 "indent" 时忽略的行` |
| `foldlevel` | `fdl` | `当折叠级别高于此值时关闭折叠` |
| `foldlevelstart` | `fdls` | `开始编辑文件的 'foldlevel'` |
| `foldmarker` | `fmr` | `当 'foldmethod' 为 "marker" 时的标志` |
| `foldmethod` | `fdm` | `折叠的类型` |
| `foldminlines` | `fml` | `折叠关闭所需的最少行数` |
| `foldnestmax` | `fdn` | `最大折叠深度` |
| `foldopen` | `fdo` | `打开折叠所使用的命令` |
| `foldtext` | `fdt` | `显示关闭的折叠所用的表达式` |
| `formatlistpat` | `flp` | `识别列表头部的模式` |
| `formatoptions` | `fo` | `自动排版完成的方式` |
| `formatprg` | `fp` | `"gq" 命令使用的外部程序` |
| `formatexpr` | `fex` | `"gp" 命令使用的表达式` |
| `fsync` | `fs` | `文件写回后是否激活 fsync()` |

### G

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `gdefault` | `gd` | `缺省打开 ":substitute" 的 'g' 标志` |
| `grepformat` | `gfm` | `'grepprg' 的输出格式` |
| `grepprg` | `gp` | `":grep" 使用的程序` |
| `guicursor` | `gcr` | `GUI: 光标形状和闪烁的设置` |
| `guifont` | `gfn` | `GUI: 使用的字体名` |
| `guifontset` | `gfs` | `GUI: 使用的多字节字体名` |
| `guifontwide` | `gfw` | `双倍宽度字符的字体名列表` |
| `guiheadroom` | `ghr` | `GUI: 用于窗口装饰的像素空间` |
| `guioptions` | `go` | `GUI: 使用的部件和选项` |
| `guipty` |  | `GUI: ":!" 命令尝试仿终端` |
| `guitablabel` | `gtl` | `GUI: 标签页定制的标签` |
| `guitabtooltip` | `gtt` | `GUI: 标签页定制的工具提示` |

### H

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `helpfile` | `hf` | `主帮助文件的完整路径名` |
| `helpheight` | `hh` | `新帮助窗口的最小高度` |
| `helplang` | `hlg` | `首选帮助语言` |
| `hidden` | `hid` | `当缓冲区被放弃 (|abandon|) 时不挂载之` |
| `highlight` | `hl` | `设置若干场合下的高亮模式` |
| `hlsearch` | `hls` | `高亮最近的匹配搜索模式` |
| `history` | `hi` | `记住的命令行的行数` |
| `hkmap` | `hk` | `希伯来语的键盘映射` |
| `hkmapp` | `hkp` | `希伯来语的音节 (phonetic) 键盘映射` |

### I

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `icon` |  | `让 Vim 设定窗口图标的文本` |
| `iconstring` |  | `Vim 图标文本所用的字符串` |
| `ignorecase` | `ic` | `搜索模式时忽略大小写` |
| `imactivatekey` | `imak` | `激活 X 输入方法 (X input method) 的键击` |
| `imactivatefunc` | `imaf` | `激活/关闭 X 输入方法的函数` |
| `imcmdline` | `imc` | `开始编辑命令行时使用 IM` |
| `imdisable` | `imd` | `任何模式下不使用 IM` |
| `iminsert` | `imi` | `插入模式下使用 :lmap 或 IM` |
| `imsearch` | `ims` | `输入搜索模式时使用 :lmap 或 IM` |
| `imstatusfunc` | `imsf` | `获得 X 输入方法的状态的函数` |
| `include` | `inc` | `查找包含文件所使用的模式` |
| `includeexpr` | `inex` | `处理包含文件行所使用的表达式` |
| `incsearch` | `is` | `输入搜索模式时同时高亮部分的匹配` |
| `indentexpr` | `inde` | `得到一行的缩进位置的表达多` |
| `indentkeys` | `indk` | `使用 'indentexpr' 时启动缩进的键` |
| `infercase` | `inf` | `关键字自动补全的匹配调整大小写` |
| `insertmode` | `im` | `开始编辑文件时进入插入模式` |
| `isfname` | `isf` | `文件和路径名可用的字符` |
| `isident` | `isi` | `标识符可用的字符` |
| `iskeyword` | `isk` | `关键字可用的字符` |
| `isprint` | `isp` | `可显示的字符` |

### J

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `joinspaces` | `js` | `连接命令在句号之后加两个空格` |

### K

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `key` |  | `加密密钥` |
| `keymap` | `kmp` | `键盘映射名` |
| `keymodel` | `km` | `允许用键击开始/停止选择` |
| `keywordprg` | `kp` | `"K" 命令所使用的程序` |

### L

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `langmap` | `lmap` | `其他语言模式用的字母表字符` |
| `langmenu` | `lm` | `菜单使用的语言` |
| `laststatus` | `ls` | `当最近的窗口有状态行时提示` |
| `lazyredraw` | `lz` | `执行宏时不重画` |
| `linebreak` | `lbr` | `在空白处回绕长行` |
| `lines` |  | `显示屏幕的行数` |
| `linespace` | `lsp` | `字符之间的像素行数` |
| `lisp` |  | `自动 lisp 缩进` |
| `lispwords` | `lw` | `改变 lisp 缩进方式的单词` |
| `list` |  | `显示 <Tab> 和 <EOL>` |
| `listchars` | `lcs` | `list 模式下显示用的字符` |
| `loadplugins` | `lpl` | `启动时调入插件脚本` |

### M

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `macatsui` |  | `Mac GUI: 使用 ATSUI 文本绘制` |
| `magic` |  | `改变搜索模式所用的特殊字符` |
| `makeef` | `mef` | `":make" 所用的错误文件名` |
| `makeprg` | `mp` | `":make" 命令所用的程序` |
| `matchpairs` | `mps` | `"%" 能匹配的字符对` |
| `matchtime` | `mat` | `显示匹配括号的时间 (以十分之一秒计)` |
| `maxcombine` | `mco` | `显示的最大组合用字符数` |
| `maxfuncdepth` | `mfd` | `用户函数的最大递归深度` |
| `maxmapdepth` | `mmd` | `映射的最大递归深度` |
| `maxmem` | `mm` | `单个缓冲区可用的最大内存 (以千字节计)` |
| `maxmempattern` | `mmp` | `模式匹配使用的最大内存 (以千字节计)` |
| `maxmemtot` | `mmt` | `所有缓冲区可用的最大内存 (以千字节计)` |
| `menuitems` | `mis` | `菜单可用的最大项目数` |
| `mkspellmem` | `msm` | `在 |:mkspell| 压缩树前可用的内存` |
| `modeline` | `ml` | `在文件开头或结尾识别模式行` |
| `modelines` | `mls` | `模式行的检查行数` |
| `modifiable` | `ma` | `可否修改文本` |
| `modified` | `mod` | `缓冲区已被修改` |
| `more` |  | `全屏显示时暂停列表` |
| `mouse` |  | `允许使用鼠标` |
| `mousefocus` | `mousef` | `键盘焦点追随鼠标点击` |
| `mousehide` | `mh` | `输入时隐藏鼠标指针` |
| `mousemodel` | `mousem` | `改变鼠标按钮的含义` |
| `mouseshape` | `mouses` | `不同模式下改变鼠标指针的形状` |
| `mousetime` | `moukset` | `鼠标双击之间的最大时间` |
| `mzquantum` | `mzq` | `MzScheme 线程的轮询间隔` |

### N

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `nrformats` | `nf` | `CTRL-A 命令识别的数字格式` |
| `number` | `nu` | `行前显示行号` |
| `numberwidth` | `nuw` | `行号使用的列数` |

### O

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `omnifunc` | `ofu` | `文件类型特定补全使用的函数` |
| `opendevice` | `odev` | `MS-Windows 上允许读/写设备` |
| `operatorfunc` | `opfunc` | `|go@| 操作符调用的函数` |
| `osfiletype` | `oft` | `不再支持` |

### P

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `paragraphs` | `para` | `分隔段落的 nroff 宏` |
| `paste` |  | `允许粘贴文本` |
| `pastetoggle` | `pt` | `切换 'paste' 的键盘代码` |
| `patchexpr` | `pex` | `用于给文件打补丁的表达式` |
| `patchmode` | `pm` | `保留文件最老的版本` |
| `path` | `pa` | `"gf" 等命令搜索用的目录列表` |
| `preserveindent` | `pi` | `重排时保持原有的缩进结构` |
| `previewheight` | `pvh` | `预览窗口的高度` |
| `previewwindow` | `pvw` | `标识预览窗口` |
| `printdevice` | `pdev` | `用于 :hardcopy 的打印机名` |
| `printencoding` | `penc` | `用于打印的编码方式` |
| `printexpr` | `pexpr` | `用于 :hardcopy 打印 PostScript 的表达式` |
| `printfont` | `pfn` | `用于 :hardcopy 的字体名` |
| `printheader` | `pheader` | `用于 :hardcopy 的页眉格式` |
| `printmbcharset` | `pmbcs` | `用于 :hardcopy 的 CJK 字符集` |
| `printmbfont` | `pmbfn` | `用于 :hardcopy 的 CJK 输出的字体名` |
| `printoptions` | `popt` | `控制 :hardcopy 输出格式` |
| `pumheight` | `ph` | `弹出窗口的最大高度` |

### Q

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `quoteescape` | `qe` | `字符串里使用的转义字符` |

### R

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `readonly` | `ro` | `禁止写入缓冲区` |
| `redrawtime` | `rdt` | `'hlsearch' 和 |:match| 高度的超时` |
| `regexpengine` | `re` | `使用的缺省正规表达式引擎` |
| `relativenumber` | `rnu` | `每行前显示相对行号` |
| `remap` |  | `允许映射可以递归调用` |
| `report` |  | `报告行改变的行数下限` |
| `restorescreen` | `rs` | `Win32: 退出时恢复屏幕` |
| `revins` | `ri` | `字符插入会反向进行` |
| `rightleft` | `rl` | `窗口为从右到左模式` |
| `rightleftcmd` | `rlc` | `从右到左模式工作的编辑命令` |
| `ruler` | `ru` | `标尺，在状态行里显示光标的行号和列号` |
| `rulerformat` | `ruf` | `定制标尺格式` |
| `runtimepath` | `rtp` | `用于运行时文件的目录列表` |

### S

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `scroll` | `scr` | `用 CTRL-U 和 CTRL-O 滚动的行数` |
| `scrollbind` | `scb` | `其他窗口滚动时滚动当前窗口` |
| `scrolljump` | `sj` | `滚动所需的最少行数` |
| `scrolloff` | `so` | `光标上下的最少行数` |
| `scrollopt` | `sbo` | `'scrollbind' 的行为方式` |
| `sections` | `sect` | `分隔小节的 nroff 宏` |
| `secure` |  | `在当前目录下以安全模式读入 .vimrc` |
| `selection` | `sel` | `使用何种选择方式` |
| `selectmode` | `slm` | `何时使用选择模式而不是可视模式` |
| `sessionoptions` | `ssop` | `:mksession 的选项` |
| `shell` | `sh` | `使用外部命令的 shell 程序名字` |
| `shellcmdflag` | `shcf` | `执行命令所使用的 shell 的参数` |
| `shellpipe` | `sp` | `把 :make 结果输出到错误文件的字符串` |
| `shellquote` | `shq` | `括起 shell 命令的字符` |
| `shellredir` | `srr` | `把过滤命脉的输出存到暂时文件的字符串` |
| `shellslash` | `ssl` | `shell 文件名使用正斜杠` |
| `shelltemp` | `stmp` | `shell 命令是否使用临时文件` |
| `shelltype` | `st` | `Amiga: 影响如何使用 shell` |
| `shellxescape` | `sxe` | `'shellxquote' 为 ( 时使用的转义字符` |
| `shellxquote` | `sxq` | `类似于 'shellquote'，但包括重定向` |
| `shiftround` | `sr` | `缩进列数对齐到 shiftwidth 的整数倍` |
| `shiftwidth` | `sw` | `(自动) 缩进使用的步进单位，以空白数目计` |
| `shortmess` | `shm` | `缩短消息长度的标志位列表` |
| `shortname` | `sn` | `非 MS-DOS: 文件名假定为 8.3字符` |
| `showbreak` | `sbr` | `用于提示回绕行开始的字符串` |
| `showcmd` | `sc` | `在状态行里显示 (部分) 命令` |
| `showfulltag` | `sft` | `自动补全标签时显示完整的标签匹配模式` |
| `showmatch` | `sm` | `插入括号时短暂跳转到匹配的括号` |
| `showmode` | `smd` | `在状态行上显示当前模式的消息` |
| `showtabline` | `stal` | `是否显示标签页行` |
| `sidescroll` | `ss` | `横向滚动的最少列数` |
| `sidescrolloff` | `siso` | `在光标左右最少出现列数` |
| `smartcase` | `scs` | `模式中有大写字母时不忽略大小写` |
| `smartindent` | `si` | `C 程序智能自动缩进` |
| `smarttab` | `sta` | `插入 <Tab> 时使用 'shiftwidth'` |
| `softtabstop` | `sts` | `编辑时 <Tab> 使用的空格数` |
| `spell` |  | `打开拼写检查` |
| `spellcapcheck` | `spc` | `定位句子尾部的模式` |
| `spellfile` | `spf` | `|zg| 和 |zw| 保存单词的文件` |
| `spelllang` | `spl` | `拼写检查使用的语言` |
| `spellsuggest` | `sps` | `提供拼写校正建议的方法` |
| `splitbelow` | `sb` | `分割窗口时新窗口在当前窗口之下` |
| `splitright` | `spr` | `新窗口在当前窗口之右` |
| `startofline` | `sol` | `命令移动光标到行的第一个非空白` |
| `statusline` | `stl` | `状态行的定制格式` |
| `suffixes` | `su` | `多个匹配所忽略的后缀` |
| `suffixesadd` | `sua` | `搜索文件时附加的后缀` |
| `swapfile` | `swf` | `缓冲区是否使用交换文件` |
| `swapsync` | `sws` | `和交换文件同步的方式` |
| `switchbuf` | `swb` | `设置切换到别的缓冲区时的行为` |
| `synmaxcol` | `smc` | `寻找语法项目的最大列数` |
| `syntax` | `syn` | `读入当前缓冲区的语法` |

### T

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `tabstop` | `ts` | `<Tab> 在文件里使用的空格数` |
| `tabline` | `tal` | `终端标签页行的定制格式` |
| `tabpagemax` | `tpm` | `|-p| 和 "tab all" 的最大标签页数` |
| `tagbsearch` | `tbs` | `标签文件里用二分法查找` |
| `taglength` | `tl` | `标签里的有效字符数` |
| `tagrelative` | `tr` | `标签文件里的文件名是相对路径` |
| `tags` | `tag` | `标签命令使用的文件名列表` |
| `tagstack` | `tgst` | `把标签推入标签栈` |
| `term` |  | `终端名` |
| `termbidi` | `tbidi` | `终端支持双向文本` |
| `termencoding` | `tenc` | `终端使用的编码方式` |
| `terse` |  | `简化部分消息` |
| `textauto` | `ta` | `废止，用 'fileformats'` |
| `textmode` | `tx` | `废止，用 'fileformat'` |
| `textwidth` | `tw` | `插入文本的最大宽度` |
| `thesaurus` | `tsr` | `关键字自动补全手忙脚乱的同义词字典` |
| `tildeop` | `top` | `波浪命令 "~" 以操作符方式工作` |
| `timeout` | `to` | `映射和键盘代码等待超时` |
| `timeoutlen` | `tm` | `超时时间 (以毫秒计)` |
| `title` |  | `让 Vim 设置窗口标题` |
| `titlelen` |  | `用于窗口标题 'columns' 比例` |
| `titleold` |  | `旧的标题，用于退出时恢复` |
| `titlestring` |  | `用于 Vim 窗口标题的字符串` |
| `toolbar` | `tb` | `GUI: 工具栏显示何种项目` |
| `toolbariconsize` | `tbis` | `工具栏图标的大小 (只适用于 GTK 2)` |
| `ttimeout` |  | `映射等待超时` |
| `ttimeoutlen` | `ttm` | `键盘代码超时时间 (以毫秒计)` |
| `ttybuiltin` | `tbi` | `在外部 termcap 之前先用内建的 termcap` |
| `ttyfast` | `tf` | `指示一个快速的终端链接` |
| `ttymouse` | `ttym` | `鼠标产生代码的类型` |
| `ttyscroll` | `tsl` | `滚动的最大行数` |
| `ttytype` | `tty` | `'term' 的别名` |

### U

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `undodir` | `udir` | `保存撤销文件的位置` |
| `undofile` | `udf` | `把撤销信息写入一个文件里` |
| `undolevels` | `ul` | `最多可以撤销的改变个数` |
| `undoreload` | `ur` | `保存缓冲区重载撤销的最大行数` |
| `updatecount` | `uc` | `刷新交换文件所需的字符数` |
| `updatetime` | `ut` | `刷新交换文件所需的毫秒数` |

### V

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `verbose` | `vbs` | `给出详细信息` |
| `verbosefile` | `vfile` | `消息写入的文件` |
| `viewdir` | `vdir` | `:mkview 存储文件的所在目录` |
| `viewoptions` | `vop` | `指定 :mkview 保存的内容` |
| `viminfo` | `vi` | `启动和退出时使用 .viminfo 文件` |
| `virtualedit` | `ve` | `何时使用虚拟编辑` |
| `visualbell` | `vb` | `使用可视铃声而不是响铃` |

### W

| 选项全称 | 选项简称 | 选项说明 |
| --- | --- | --- |
| `warn` |  | `当缓冲区改变时，对 shell 命令给出警告` |
| `weirdinvert` | `wiv` | `用于有特殊反转方法的终端` |
| `whichwrap` | `ww` | `允许指定键跨越行边界` |
| `wildchar` | `wc` | `用于符扩展的命令行字符` |
| `wildcharm` | `wcm` | `同 'wildchar'，但对映射情况也适用` |
| `wildignore` | `wig` | `匹配这些模式的文件不会参与自动补全` |
| `wildignorecase` | `wic` | `匹配文件名时忽略大小写` |
| `wildmenu` | `wmnu` | `命令行自动补全所使用的菜单` |
| `wildmode` | `wim` | `'wildchar' 命令行扩展所用的模式` |
| `wildoptions` | `wop` | `指定如何完成命令行补全` |
| `winaltkeys` | `wak` | `休时窗口系统处理 ALT 键` |
| `window` | `wi` | `CTRL-F 和 CTRL-B 滚动的行数` |
| `winheight` | `wh` | `当前窗口的最少行数` |
| `winfixheight` | `wfh` | `打开/关闭窗口时保持窗口高度` |
| `winfixwidth` | `wfw` | `打开/关闭窗口时保持窗口宽度` |
| `winminheight` | `wmh` | `任何窗口的最少行数` |
| `winminwidth` | `wmw` | `任何窗口的最少列数` |
| `winwidth` | `wiw` | `当前窗口的最少列数` |
| `wrap` |  | `长行回绕并在下一行继续` |
| `wrapmargin` | `wm` | `使 (硬) 回绕开始的从右侧起算的字符数` |
| `wrapscan` | `ws` | `搜索在文件尾折回文件头` |
| `write` |  | `允许写入文件` |
| `writeany` | `wa` | `写入文件不需 "!" 强制` |
| `writebackup` | `wb` | `覆盖文件时建立备份` |
| `writedelay` | `wd` | `每个字符延迟 (以毫秒计) (用于调试)` |



> 转：http://blog.csdn.net/shuimengzhilong/article/details/45340361