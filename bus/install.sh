#!/bin/sh

python3.12 -m venv .venv
. .venv/bin/activate
.venv/bin/python -m pip install -r requirements.txt
