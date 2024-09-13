#!/bin/bash

set -exo pipefail

rm -rf ~bus/bus.bak
mv ~bus/bus ~bus/bus.bak
mv ~/bus ~bus/
chown -R bus:bus ~bus/bus
systemctl daemon-reload
systemctl restart bus.service
systemctl status bus.service
