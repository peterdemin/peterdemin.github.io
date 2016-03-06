#!/bin/sh -e

SOURCE_COMMIT=$(git log -1 --format='%H')
pelican content
git checkout master
git fetch origin
git reset --hard origin/master
find . -maxdepth 1 -mindepth 1 -name '*' | grep -ve '\./\.' -e 'output' | xargs rm -rf
mv output/* ./
rmdir output
git add --all *
git commit -m "Generated pelican site from ${SOURCE_COMMIT}"
git push
git checkout -
