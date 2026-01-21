#!/usr/bin/env bash

set -eo pipefail

PROJECT=demindev
INSTANCE=demin-dev

gcloud compute instances delete "$INSTANCE" \
  --project=$PROJECT \
  --zone=us-west1-c \
  --quiet

