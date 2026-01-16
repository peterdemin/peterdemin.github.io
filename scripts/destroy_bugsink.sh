#!/usr/bin/env bash

set -eo pipefail

PROJECT=demindev
INSTANCE=bugsink

gcloud compute instances delete "$INSTANCE" \
  --project=$PROJECT \
  --zone=us-west1-c \
  --quiet
