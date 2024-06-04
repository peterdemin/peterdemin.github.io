#!/bin/sh

. .venv/bin/activate
.venv/bin/uvicorn bus:app --uds /tmp/bus.sock
