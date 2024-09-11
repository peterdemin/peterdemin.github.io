#!/bin/sh

exec uvicorn checkpoint_server:app --reload
