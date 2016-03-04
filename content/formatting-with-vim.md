Title: Profiling django requests
Date: 2016-03-04 15:38
Category: Python

I like how vim can integrate with external utilities. Here are commands that I use:

	:% !python -mjson.tool

Will take current buffer text, pass it to Python's json.tool module and
replace buffer with results effectively reindenting JSON document.

Same trick for XML documents is archived with command:

	:% !xmllint --format --recover -

This one is longer, but still envocation is obvious.

Also I want to mention [janko-m/vim-test] which starts testing framework.

I believe it is the simpliest extension interface for among all editors I ever used.

[janko-m/vim-test]: https://github.com/janko-m/vim-test
