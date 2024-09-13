#!/bin/bash

set -exo pipefail

TARGET_DIR="~bus/bus"

if test -d ${TARGET_DIR}
then
    rm -rf ${TARGET_DIR}.bak
    mv ${TARGET_DIR} ${TARGET_DIR}.bak
fi
mv bus ~bus/
chown -R bus:bus ${TARGET_DIR}

systemctl daemon-reload
systemctl restart bus.service
systemctl status bus.service
