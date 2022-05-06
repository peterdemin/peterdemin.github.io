# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line, and also
# from the environment for the first two.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR     = source
BUILDDIR      = build

.DEFAULT_GOAL := help

# Put it first so that "make" without argument is like "make help".
.PHONY: help
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: clean
clean:
	rm -rf build

.PHONY: browser
browser:
	open build/html/index.html

.PHONY: watch
watch: html browser  ## compile the docs watching for changes
	watch '$(MAKE) html'

.PHONY: release
release: clean html
	mv build/html _docs
	cp source/favicon.ico _docs/
	cp CNAME _docs/
	git checkout gh-pages
	rm -rf docs
	mv _docs docs
	git add -A docs
	git commit --amend --no-edit
	# git push -u origin +gh-pages

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
.PHONY: Makefile
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
