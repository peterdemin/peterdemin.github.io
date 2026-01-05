#!/bin/sh

sudo useradd -rms /sbin/nologin bus
sudo cp bus/etc/systemd/system/bus.service /etc/systemd/system/bus.service
sudo systemctl daemon-reload
sudo systemctl enable bus.service
