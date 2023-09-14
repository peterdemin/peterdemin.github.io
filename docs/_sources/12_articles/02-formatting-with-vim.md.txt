# Formatting data with Vim

## Reindent JSON

One of Vim's great features is how it can integrate with external utilities.
Here are the commands that I use most.

## Prettify JSON

	:% !python -mjson.tool

Will take the current buffer text and pass it to Python's `json.tool` module and
replace buffer with results, effectively reindenting JSON document.

Alternatively, if jq is available:

	:% ! jq .

## Convert pretty JSON to a compressed one-line form

	:% ! jq -c .

## Reindent XML

	:% !xmllint --format --recover -

## Pretty print Python data structures:

    :% !python -c 'import pprint, sys; pprint.pprint(eval(sys.stdin.read()))'

## Python data structure to JSON

    :% !python -c 'import sys, json; from collections import OrderedDict; print(json.dumps(eval(sys.stdin.read()), indent=2))'

## JSON to YAML

    :% !python -c 'import sys, json, yaml; print(yaml.dump(json.load(sys.stdin), indent=2))'

## YAML to JSON

    :% !python -c 'import sys, json, yaml; print(json.dumps(yaml.safe_load(sys.stdin), indent=2))'
