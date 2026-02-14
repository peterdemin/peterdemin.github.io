#!/bin/bash

set -exo pipefail

TARGET_DIR="/opt/reader/"

mkdir -p "${TARGET_DIR}"
sudo install -o root -g root -m 0755 reader/reader "${TARGET_DIR}/reader"

systemctl daemon-reload
systemctl stop reader-api.service
systemctl restart reader-api.socket
systemctl status reader-api.service || true
