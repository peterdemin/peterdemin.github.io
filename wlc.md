# Weblate CLI (wlc) tips and tricks

## Unlock all components

    wlc --format json list-components | jq -r '.[] | .project.slug + "/" + .slug' | xargs wlc unlock

## List all .po glob patterns configured

    wlc --format json list-components | jq -r .[].filemask | grep '\.po$'

