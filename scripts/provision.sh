#!/usr/bin/env bash

set -eo pipefail

EMAIL=peter@demin.dev

apt-mark hold google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent

mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg > /usr/share/keyrings/tailscale-archive-keyring.gpg
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list > /etc/apt/sources.list.d/tailscale.list
curl -sLo /etc/apt/keyrings/syncthing-archive-keyring.gpg https://syncthing.net/release-key.gpg
echo "deb [signed-by=/etc/apt/keyrings/syncthing-archive-keyring.gpg] https://apt.syncthing.net/ syncthing stable-v2" > /etc/apt/sources.list.d/syncthing.list

apt-get update
apt-get install -y      \
    ca-certificates     \
    screen              \
    lsof                \
    python3-venv        \
    python-is-python3   \
    nginx               \
    tailscale           \
    sqlite3             \
    libsqlite3-dev      \
    erlang-p1-sqlite3   \
    ejabberd            \
    postfix             \
    mutt                \
    syncthing

# Copy custom configs:
cp -rf etc /
systemctl daemon-reload

# Tailscale:
echo "Log in to your Tailscale account to add a new instance. Then disable SSH access"
tailscale login
sysctl -p /etc/sysctl.d/99-tailscale.conf
tailscale up --advertise-exit-node

# All system users:
useradd -rms /sbin/nologin commafeed
useradd -rms /sbin/nologin syncthing
usermod -aG www-data syncthing

# Syncthing:
systemctl enable syncthing@syncthing.service
systemctl start syncthing@syncthing.service

# Postfix:
newaliases
systemctl start postfix

# Nginx+certbot:
if [ ! -e /usr/bin/certbot ]; then
    python3 -m venv /opt/certbot/
    /opt/certbot/bin/python3 -m pip install certbot certbot-nginx
    ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi
rm /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/demin-dev /etc/nginx/sites-enabled/demin-dev
/opt/certbot/bin/certbot --agree-tos --nginx -m $EMAIL
chmod u+x /etc/cron.weekly/certbot-renew
systemctl restart nginx.service

# Commafeed
sudo -u commafeed \
    wget -O /home/commafeed/commafeed \
        https://github.com/Athou/commafeed/releases/download/5.12.1/commafeed-5.12.1-h2-linux-x86_64-runner
chmod +x /home/commafeed/commafeed
echo "Register an account at https://feed.demin.dev/ and Press Ctrl+C to stop the service"
sudo -u commafeed /bin/sh -c 'cd ~commafeed; COMMAFEED_USERS_ALLOW_REGISTRATIONS=true ./commafeed' || true

systemctl enable commafeed.service
systemctl start commafeed.service

# Ejabberd
chgrp -R ejabberd /etc/letsencrypt
chmod g+rx /etc/letsencrypt/archive
chmod g+r /etc/letsencrypt/archive/demin.dev/privkey*.pem
systemctl restart ejabberd.service

# Remove Google cruft in background
screen -dm /bin/sh -c "apt remove --allow-change-held-packages -y google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent"
