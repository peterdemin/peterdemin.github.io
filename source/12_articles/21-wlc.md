# Weblate CLI (wlc) tips and tricks

## Sync with upstream git repo

    COMP=<project/component>; wlc pull $COMP && wlc commit $COMP && wlc push $COMP

## Unlock all components

    wlc --format json list-components | jq -r '.[] | .project.slug + "/" + .slug' | xargs -L1 wlc unlock

## List all .po glob patterns configured

    wlc --format json list-components | jq -r .[].filemask | grep '\.po$'

## Delete all auto-generated glossaries except one

    wlc --format json list-components | jq -r '.[] | select(.slug == "glossary" and .project.slug != "<MAIN-PROJECT>") | .project.slug + "/" + .slug' | xargs -L1 wlc delete
