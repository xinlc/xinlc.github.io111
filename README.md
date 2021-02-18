# Richard Xin's Blog

## [Hexo Commands](https://hexo.io/zh-cn/docs/commands.html)

```bash
npm config set registry "https://registry.npm.taobao.org" #设置为淘宝镜像站
npm install -g hexo-cli   #安装
npm install --registry=https://registry.npm.taobao.org
hexo help                 #查看帮助
hexo init                 #初始化一个目录
hexo new "postName"       #新建文章
hexo new page "pageName"  #新建页面
hexo generate             #生成网页，可以在 public 目录查看整个网站的文件
  -d, --deploy            #文件生成后立即部署网站
  -w, --watch	            #监视文件变动
hexo server               #本地预览，’Ctrl+
  -p, --port	            #重设端口
  -s, --static	          #只使用静态文件
  -l, --log	              #启动日记记录，使用覆盖记录格式
  --debug                 #调试错误
hexo deploy               #部署.deploy目录
hexo clean                #清除缓存，**强烈建议每次执行命令前先清理缓存，每次部署前先删除 .deploy
hexo algolia              #在站点根目录下执行 hexo algolia 来更新 Algolia Index

简写：
hexo n == hexo new
hexo g == hexo generate
hexo s == hexo server
hexo d == hexo deploy
```

## [travis](https://www.travis-ci.org/)
