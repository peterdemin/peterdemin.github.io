#!/bin/sh

id reader || useradd -rs /sbin/nologin reader
cp -rf reader/etc/systemd/system/* /etc/systemd/system/
cp -f reader/etc/nginx/sites-available/reader /etc/nginx/sites-available/reader
ln -sf /etc/nginx/sites-available/reader /etc/nginx/sites-enabled/reader
systemctl daemon-reload
systemctl disable reader-api.service
systemctl stop reader-api.service
systemctl enable reader-api.socket
systemctl restart reader-api.socket
systemctl restart nginx.service
