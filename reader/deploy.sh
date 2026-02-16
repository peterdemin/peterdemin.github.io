#!/bin/bash

set -exo pipefail

TARGET_DIR="/opt/reader/"
WEB_DIR="/var/www/reader/"

mkdir -p "${TARGET_DIR}"
install -o root -g root -m 0755 reader/reader "${TARGET_DIR}/reader"
install -d -o root -g root -m 0755 "${WEB_DIR}"
install -d -o reader -g reader -m 0755 "${WEB_DIR}p"
cp -f reader/static/index.html "${WEB_DIR}"

systemctl daemon-reload
systemctl stop reader-api.service
systemctl restart reader-api.socket
systemctl status reader-api.service || true
