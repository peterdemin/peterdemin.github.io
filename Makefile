# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS  ?=
SPHINXBUILD ?= sphinx-build
SOURCEDIR   = source
BUILDDIR    = build
PHOTOS_SUBDIRS = $(wildcard source/18_photos/*)


.DEFAULT_GOAL := help

# Put it first so that "make" without argument is like "make help".
.PHONY: help
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: clean
clean: counter_clean
	rm -rf build _docs docs

.PHONY: autogen
autogen:
	python3 gen_life.py > source/life_gd.rst

.PHONY: build
build: autogen html counter_build photos_build tree

.PHONY: browser
browser:
	open build/html/index.html

.PHONY: watch
watch: build browser  ## compile the docs watching for changes
	watch '$(MAKE) html'

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

.PHONY: $(PHOTOS_SUBDIRS)
$(PHOTOS_SUBDIRS):
	$(MAKE) -C $@

.PHONY: photos_build
photos_build: $(PHOTOS_SUBDIRS)

.PHONY: tree
tree:
	cp -f source/12_articles/61-tree.html build/html/12_articles/61-tree.html


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
