DIRNAME := 04_multnomah

.PHONY: build
build:
	gallery-build
	rm -rf ../../../build/html/18_photos/${DIRNAME}
	mkdir -p ../../../build/html/18_photos
	cp -rf public ../../../build/html/18_photos/${DIRNAME}
	rm images_data.json
	rm public/index.html
	rm -f public/images/thumbnails/*.*
