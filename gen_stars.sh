#!/bin/sh -e


gh api --paginate \
    users/peterdemin/starred \
    --header 'Accept: application/vnd.github.star+json' \
    | jq .               \
    | tee source/12_articles/77-gh-stars.json \
    | python star2md.py  \
    > source/12_articles/77-github-stars.mdpart
