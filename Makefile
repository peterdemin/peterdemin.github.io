# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS  ?=
SPHINXBUILD ?= sphinx-build
SOURCEDIR   = source
BUILDDIR    = build
GALLERIES = $(wildcard source/18_photos/*/gallery.json)
PHOTOS_SUBDIRS := $(patsubst %/,%,$(dir $(GALLERIES)))
APIHOST = demin-dev.tail13c89.ts.net

.DEFAULT_GOAL := help

.PHONY: help
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: clean
clean: counter_clean
	rm -rf build _docs docs

.PHONY: changelog
changelog:
	python3 gen_changelog.py

.PHONY: autogen
autogen:
	python3 gen_life.py > source/life_gd.rst

.PHONY: rss
rss:
	python3 gen_atom.py > build/html/life.xml

.PHONY: stars
stars:
	gh api --paginate \
		users/peterdemin/starred \
		--header 'Accept: application/vnd.github.star+json' \
		| jq .               \
		| tee source/12_articles/77-gh-stars.json \
		| python star2md.py  \
		> source/12_articles/77-github-stars.mdpart

.PHONY: build
build: autogen html rss counter_build race_build photos_build tree wordmix

.PHONY: lightweight
lightweight: autogen html rss tree wordmix

.PHONY: publish
publish:
	rsync -a demin.dev/var/www/html/.stfolder build/html/
	rsync -a --delete build/html/ demin.dev/var/www/html

.PHONY: p
p: lightweight publish

.PHONY: compress
compress:
	find build/html -name '*.css' -o -name '*.js' -o -name '*.html' -o -name '*.txt' | xargs gzip -fnk

.PHONY: browser
browser:
	open build/html/index.html

.PHONY: watch
watch: build browser  ## compile the docs continuously
	watch '$(MAKE) lightweight'

.PHONY: jot
jot:
	git add -A .
	git commit -am "Jot down something"
	git push

.PHONY: install
install: counter_install
	pip install -r requirements.txt

.PHONY: install_dev
install_dev:
	pip install -r requirements_dev.txt

.PHONY: gitconfig
gitconfig:
	git config user.name 'Peter Demin (bot)'
	git config user.email 'peterdemin@users.noreply.github.com'

.PHONY: export
export:
	mv build/html _docs
	cp source/favicon.ico _docs/
	cp CNAME _docs/
	touch _docs/.nojekyll
	git fetch origin gh-pages
	git checkout gh-pages
	rm -rf build docs
	mv _docs docs
	git add -A docs
	git commit -m "Update static html" --no-edit

.PHONY: push
push:
	git push -u origin +gh-pages

.PHONY: master
master:
	git checkout master

.PHONY: lock
lock:
	pip-compile-multi \
		--directory . \
		--allow-unsafe \
		--autoresolve \
		--skip-constraints \
		--no-upgrade

.PHONY: upgrade
upgrade:
	pip-compile-multi \
		--directory . \
		--autoresolve \
		--skip-constraints \
		--allow-unsafe

.PHONY: sync
sync:
	pip-sync requirements_dev.txt

## API

.PHONY: bus-test
bus-test:
	cd bus && go test .

.PHONY: bus-linux
bus-linux: bus-test
	cd bus && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o bus

.PHONY: bus
bus: bus-linux
	scp -r bus $(APIHOST):
	ssh $(APIHOST) 'sudo ./bus/install.sh && sudo ./bus/deploy.sh'

## COUNTER

.PHONY: counter_clean
counter_clean:
	$(MAKE) -C backgammon clean

.PHONY: counter_build
counter_build:
	$(MAKE) -C backgammon build
	rm -rf build/html/counter
	mv backgammon/_site build/html/counter

.PHONY: counter_install
counter_install:
	$(MAKE) -C backgammon install

## RACE

.PHONY: race_build
race_build:
	rm -rf build/html/race
	mkdir -p build/html/race
	cp race/* build/html/race

## PHOTOS

.PHONY: photos_build
photos_build: $(PHOTOS_SUBDIRS)

.PHONY: $(PHOTOS_SUBDIRS)
$(PHOTOS_SUBDIRS):
	$(MAKE) -C $@

## Prebuilt HTML:

.PHONY: tree
tree:
	cp -f source/12_articles/61-tree.html build/html/12_articles/61-tree.html

.PHONY: wordmix
wordmix:
	cp -f source/14_ideas/08-word-mix-so.html build/html/14_ideas/08-word-mix-so.html

## ENTERING
.PHONY: life
life:
	vi $$(python3 new_life_entry.py)

.PHONY: note
note:
	@python3 new_reading_note.py

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
.PHONY: Makefile
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
