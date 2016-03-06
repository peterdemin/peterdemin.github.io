#!/bin/sh

git checkout master
find . -maxdepth 1 -mindepth 1 -name '*' | grep -ve '\./\.' -e 'output' | xargs rm -rf
mv output/* ./
rmdir output
git add *
git commit -am "Generated pelican site"
git push
git checkout -
