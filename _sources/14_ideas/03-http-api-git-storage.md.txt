# HTTP API for append-only Git repositories

Service allows adding text and file attachments to a git repository.
Every change is synchronized with upstream using `git push`.


## Download public SSH key

`GET /key/`

Retrieve personal public SSH key that must be granted access to original repository.


## Create repository

`POST /repos/$username/`

*Args*:

* `origin`: upstream ssh+git URL
* `name`: repository name


## Append text to README.md

`POST /repos/$username/$repo/`

*Args*:

* `text`: plain text to append to the end of the file.
* `file`: file attachment.
