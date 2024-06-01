#!/bin/sh

python3 -m venv .venv
. .venv/bin/activate
.venv/bin/python -m pip install -r requirements.txt
