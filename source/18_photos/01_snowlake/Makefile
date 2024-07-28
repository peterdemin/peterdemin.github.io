.PHONY: build
build:
	gallery-build
	rm -rf ../../../build/html/18_photos/01_snowlake
	mkdir -p ../../../build/html/18_photos
	cp -rf public ../../../build/html/18_photos/01_snowlake
	rm images_data.json
	rm public/index.html
	rm -f public/images/thumbnails/*.*
