# Formatting data with Vim

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

    :% !python -c 'import sys, json; print(json.dumps(eval(sys.stdin.read()), indent=2))'

## JSON to YAML

    :% !python -c 'import sys, json, yaml; print(yaml.dump(json.load(sys.stdin), indent=2))'

## YAML to JSON

    :% !python -c 'import sys, json, yaml; print(json.dumps(yaml.safe_load(sys.stdin), indent=2))'

## CSV column to txt

    :% !python -c 'import sys, csv; print("\n".join(row[0] for row in csv.reader(sys.stdin)))'

## Txt to single-column CSV

    :% !python -c 'import sys, csv; csv.writer(sys.stdout).writerows([line.strip()] for line in sys.stdin)'
