# Reindenting JSON and XML with vim

One of vim's great feature is how it can integrate with external utilities.
Here are commands that I use most:

	:% !python -mjson.tool

Will take current buffer text, pass it to Python's json.tool module and
replace buffer with results effectively reindenting JSON document.

Same trick for XML documents is archived with command:

	:% !xmllint --format --recover -

This one is longer, but still envocation is obvious.

And finally pretty printing Python structures:

    % !python -c 'import pprint, sys; pprint.pprint(eval(sys.stdin.read()))'

The last one is so long, it deserves it's own nnoremap.

Also I want to mention [janko-m/vim-test] which starts testing framework.

I believe it is the simpliest extension interface among all editors I ever used.

[janko-m/vim-test]: https://github.com/janko-m/vim-test
