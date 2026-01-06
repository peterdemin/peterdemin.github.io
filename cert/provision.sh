#!/usr/bin/env bash

set -e -o pipefail

NAME=peter
EMAIL=peter@demin.dev
DOMAIN=test.demin.dev

apt-mark hold google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent

mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | tee /etc/apt/sources.list.d/tailscale.list
curl -L -o /etc/apt/keyrings/syncthing-archive-keyring.gpg https://syncthing.net/release-key.gpg
echo "deb [signed-by=/etc/apt/keyrings/syncthing-archive-keyring.gpg] https://apt.syncthing.net/ syncthing stable-v2" | tee /etc/apt/sources.list.d/syncthing.list

apt-get update
apt-get install -y \
    ca-certificates \
    lsof \
    python3-venv \
    python-is-python3 \
    nginx \
    tailscale
    # default-jdk \
    # sqlite3 \
    # libsqlite3-dev \
    # erlang-p1-sqlite3 \
    # ejabberd \
    # syncthing

tailscale login

sudo useradd -rms /sbin/nologin commafeed
sudo useradd -rms /sbin/nologin syncthing
sudo usermod -aG www-data syncthing

if [ ! -e /usr/bin/certbot ]; then
    python3 -m venv /opt/certbot/
    /opt/certbot/bin/python3 -m pip install certbot certbot-nginx
    ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi

cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

/opt/certbot/bin/certbot \
    --agree-tos \
    --nginx \
    --non-interactive \
    -m $EMAIL \
    -d $DOMAIN

mv default /etc/nginx/sites-available/default

/opt/certbot/bin/certbot \
    --agree-tos \
    --nginx \
    -m $EMAIL

exit 0

systemctl restart nginx.service

chgrp -R root:ejabberd /etc/letsencrypt
chmod g+rx /etc/letsencrypt/archive
vi /etc/ejabberd/ejabberd.yml
systemctl restart ejabberd.service
read -r -s -p "Enter password for account $NAME: " password
sudo -u ejabberd ejabberdctl register $NAME demin.dev $password
