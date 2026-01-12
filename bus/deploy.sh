#!/bin/bash

set -exo pipefail

TARGET_DIR="/opt/bus/"

mkdir -p "${TARGET_DIR}"
sudo install -o root -g root -m 0755 bus/bus "${TARGET_DIR}/bus"

systemctl daemon-reload
systemctl stop bus-api.service
systemctl restart bus-api.socket
systemctl status bus-api.service || true
