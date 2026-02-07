#!/bin/bash
set -euo pipefail

EMAIL=peter@demin.dev

apt-mark hold google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent

mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg > /usr/share/keyrings/tailscale-archive-keyring.gpg
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list > /etc/apt/sources.list.d/tailscale.list

apt-get update
apt-get install -y      \
    ca-certificates     \
    screen              \
    lsof                \
    python3-venv        \
    python-is-python3   \
    nginx               \
    git                 \
    age                 \
    tailscale

tailscale status || tailscale login

if [ ! -e /usr/bin/certbot ]; then
    python3 -m venv /opt/certbot/
    /opt/certbot/bin/python3 -m pip install certbot certbot-nginx
    ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi

id pages || useradd -rms /usr/bin/git-shell pages
install -o pages -g www-data -m 0750 -d /var/www/pages
install -o pages -g pages -m 0755 -d /var/lib/infra
install -o pages -g pages -m 0700 -d ~pages/.ssh
install -o pages -g pages -m 0600 /dev/stdin ~pages/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILG64GMcBIxl4rGuRum2n07Kf7dE9CUlzLl84e/TWvTM builder@trixie
EOF
test -f ~pages/.ssh/id_ed25519 || sudo -u pages /bin/bash -c 'ssh-keygen -t ed25519 -f ~pages/.ssh/id_ed25519 -N ""'

echo "Copy public key to infra/keys/ directory:"
sudo -u pages /bin/bash -c 'ssh-keygen -yf ~pages/.ssh/id_ed25519'
echo

test -d ~pages/pages.git || sudo -u pages /bin/bash -c "git init --bare ~pages/pages.git"
install -m 0755 /dev/stdin ~pages/pages.git/hooks/post-receive <<'EOF'
#!/bin/bash
exec git --git-dir="/home/pages/pages.git" --work-tree="/var/www/pages" checkout -f master
EOF

test -d ~pages/infra.git || sudo -u pages /bin/bash -c "git init --bare ~pages/infra.git"
install -m 0755 /dev/stdin ~pages/infra.git/hooks/post-receive <<'EOF'
#!/bin/bash
exec git --git-dir="/home/pages/infra.git" --work-tree="/var/lib/infra" checkout -f master
EOF

install -m 0644 /dev/stdin /etc/systemd/system/infra-apply.path <<'EOF'
[Unit]
Description=Watch infra checkout for changes

[Path]
PathChanged=/var/lib/infra/keys/primary.pub
PathChanged=/var/lib/infra/keys
PathChanged=/var/lib/infra/challenges
PathChanged=/var/lib/infra/certs

[Install]
WantedBy=multi-user.target
EOF

install -m 0644 /dev/stdin /etc/systemd/system/infra-apply.service <<'EOF'
[Unit]
Description=Apply infra config

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /var/lib/infra/cli.py apply
EOF

systemctl daemon-reload
systemctl enable --now infra-apply.path

# 8< - - - - - Abort if nginx config already exist - - - - -
test -f /etc/nginx/sites-available/pages && exit 0

rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-available/pages <<'EOF'
server {
    server_name mirror.demin.dev;
    root /var/www/pages;
    index index.html index.htm;
    location / {
		gzip_static on;
        try_files $uri $uri/ =404;
    }
}
EOF
ln -fs /etc/nginx/sites-available/pages /etc/nginx/sites-enabled/pages
certbot --agree-tos --nginx -m peter@demin.dev --non-interactive -d mirror.demin.dev
systemctl restart nginx.service

screen -dm /bin/sh -c "apt remove --allow-change-held-packages -y google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent"
