MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
DIRNAME := $(notdir $(patsubst %/,%,$(dir $(MAKEFILE_PATH))))

.PHONY: build
build:
	gallery-build
	rm -rf ../../../build/html/18_photos/${DIRNAME}
	mkdir -p ../../../build/html/18_photos
	cp -rf public ../../../build/html/18_photos/${DIRNAME}
	rm images_data.json
	rm public/index.html
	rm -f public/images/thumbnails/*.*

.PHONY: init
init: gallery.json

index.md: gallery.json
	jq '"# " + .title' -r < gallery.json > index.md

gallery.json:
	gallery-init
