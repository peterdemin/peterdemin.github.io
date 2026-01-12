#!/bin/sh

id bus || useradd -rs /sbin/nologin bus
cp -rf bus/etc/systemd/system/* /etc/systemd/system/
cp -f bus/etc/nginx/sites-available/bus /etc/nginx/sites-available/bus
ln -sf /etc/nginx/sites-available/bus /etc/nginx/sites-enabled/bus
sudo certbot --nginx -nd api.demin.dev
systemctl daemon-reload
systemctl disable bus-api.service
systemctl stop bus-api.service
systemctl enable bus-api.socket
systemctl restart bus-api.socket
systemctl restart nginx.service
