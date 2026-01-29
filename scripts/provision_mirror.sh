#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y git

id pages || useradd -rms /usr/bin/git-shell pages
install -o pages -g pages -m 0700 -d ~pages/.ssh
install -o pages -g www-data -m 0750 -d /var/www/pages
install -o pages -g pages -m 0600 /dev/stdin ~pages/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILG64GMcBIxl4rGuRum2n07Kf7dE9CUlzLl84e/TWvTM builder@trixie
EOF
test -d ~pages/repo.git || sudo -u pages /bin/bash -c "git init --bare ~pages/repo.git"
install -m 0755 /dev/stdin ~pages/repo.git/hooks/post-receive <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

git --git-dir="/home/pages/repo.git" --work-tree="/var/www/pages" checkout -f master
EOF

# 8< - - - - - Abort if nginx config already exist - - - - -
test -f /etc/nginx/sites-available/pages && exit 0

cat > /etc/nginx/sites-available/pages <<'EOF'
server {
    server_name pages.demin.dev;
    root /var/www/pages;
    index index.html index.htm;
    location / {
		gzip_static on;
        try_files $uri $uri/ =404;
    }
}
EOF
ln -fs /etc/nginx/sites-available/pages /etc/nginx/sites-enabled/pages
certbot --agree-tos --nginx -m peter@demin.dev --non-interactive -d pages.demin.dev
systemctl restart nginx.service
