#!/bin/bash

set -exo pipefail

TARGET_DIR="/opt/reader/"
WEB_DIR="/var/www/reader/"

mkdir -p "${TARGET_DIR}"
install -o root -g root -m 0755 reader/reader "${TARGET_DIR}/reader"
cp -f reader/static/index.html "${WEB_DIR}"

systemctl daemon-reload
systemctl stop reader-api.service
systemctl restart reader-api.socket
systemctl status reader-api.service || true
