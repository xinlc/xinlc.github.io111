#!/bin/bash

# https://www.algolia.com/apps/3ZZ8ITB7HE/api-keys/restricted

hexo clean
# export HEXO_ALGOLIA_INDEXING_KEY=80a55499
hexo algolia
hexo deploy