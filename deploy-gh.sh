# version 1.0
# hexo clean
# hexo g
# cd ./public
# git init
# git add .
# git commit -m "Update docs"
# # git push --force --quiet https://github.com/xinlc/xinlc.github.io.git master:master
# git push --force https://github.com/xinlc/xinlc.github.io.git master:master

# version 2.0
hexo clean
hexo g
cd ./public
git init
git remote add origin https://github.com/xinlc/xinlc.github.io.git
git add .
git commit -m "Update docs"
# git push --force --quiet https://github.com/xinlc/xinlc.github.io.git master:master
# git pull --rebase origin master
# git push -u origin master
git push -f origin master
