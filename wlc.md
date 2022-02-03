# Weblate CLI (wlc) tips and tricks

## Unlock all components

    wlc --format json list-components | jq -r '.[] | .project.slug + "/" + .slug' | xargs wlc unlock

## List all .po glob patterns configured

    wlc --format json list-components | jq -r .[].filemask | grep '\.po$'

## Delete all auto-generated glossaries except one

    wlc --format json list-components | jq -r '.[] | select(.slug == "glossary" and .project.slug != "<MAIN-PROJECT>") | .project.slug + "/" + .slug' | xargs wlc delete
