#!/bin/sh -e

curl -s "https://feed.demin.dev/rest/feed/export?apiKey=$COMMAFEED_API_KEY" \
    | tee source/12_articles/71-opml.xml \
    | ./gen_subscriptions.py \
    > source/12_articles/71-subscriptions.mdpart
