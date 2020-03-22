hexo clean
hexo g
cd ./public
git init
git add .
git commit -m "Update docs"
git push --force --quiet https://github.com/xinlc/xinlc.github.io.git master:master
