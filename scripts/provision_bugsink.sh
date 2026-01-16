#!/usr/bin/env bash
set -euo pipefail

# Bugsink single-server production installer (Ubuntu 24.04-style)
# Docs: https://www.bugsink.com/docs/single-server-production/

HOST=bugsink.demin.dev
EMAIL=peter@demin.dev   # used for Let's Encrypt via certbot (recommended)

if [[ $EUID -ne 0 ]]; then
  echo "ERROR: Run this script as root (sudo -i)."
  exit 1
fi

log() { printf "\n[%s] %s\n" "$(date -Is)" "$*"; }

run_as_bugsink() {
  # Run a command as the bugsink user, in /home/bugsink, with bash -lc so venv activation works.
  su - bugsink -c "bash -lc 'cd /home/bugsink && $*'"
}

write_file_root() {
  # write_file_root /path/to/file "content..."
  local path="$1"
  shift
  install -d -m 0755 "$(dirname "$path")"
  cat >"$path" <<'EOF'
EOF
  # Replace file content with provided stdin after this function returns? Not needed.
}

apt-mark hold google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent

log "1) System packages: python3/pip/venv + nginx + curl"
export DEBIAN_FRONTEND=noninteractive
apt update
apt -y upgrade
apt -y install python3 python3-pip python3-venv nginx curl

log "2) Create non-root user: bugsink (if missing)"
if ! id -u bugsink >/dev/null 2>&1; then
  adduser bugsink --disabled-password --gecos ""
fi

log "3) Create/activate venv and install/upgrade Bugsink"
run_as_bugsink 'python3 -m venv venv'
run_as_bugsink '. venv/bin/activate && python3 -m pip install --upgrade pip'
run_as_bugsink '. venv/bin/activate && python3 -m pip install --upgrade bugsink'
run_as_bugsink '. venv/bin/activate && bugsink-show-version'

log "4) Generate production config: bugsink_conf.py (template=singleserver)"
# If config exists, we keep it (idempotent-ish)
if [[ ! -f /home/bugsink/bugsink_conf.py ]]; then
  run_as_bugsink ". venv/bin/activate && bugsink-create-conf --template=singleserver --host='${HOST}'"
else
  log "   /home/bugsink/bugsink_conf.py already exists; leaving it unchanged."
fi

log "5) Initialize DBs (migrate main + snappea queue DB)"
run_as_bugsink ". venv/bin/activate && bugsink-manage migrate"
run_as_bugsink ". venv/bin/activate && bugsink-manage migrate snappea --database=snappea"

log "6) Create the superuser"
echo
echo ">>> You will now be prompted to create the Bugsink superuser (per the docs)."
echo ">>> Use an email address as username if you like."
echo
run_as_bugsink ". venv/bin/activate && bugsink-manage createsuperuser"

log "7) Sanity checks"
run_as_bugsink ". venv/bin/activate && bugsink-manage check_migrations"
run_as_bugsink ". venv/bin/activate && bugsink-manage check --deploy --fail-level WARNING"

log "8) systemd: gunicorn.service"
cat >/etc/systemd/system/gunicorn.service <<EOF
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
Restart=always
Type=notify
User=bugsink
Group=bugsink
Environment="PYTHONUNBUFFERED=1"
WorkingDirectory=/home/bugsink
ExecStart=/home/bugsink/venv/bin/gunicorn \\
    --bind="127.0.0.1:8000" \\
    --workers=2 \\
    --timeout=6 \\
    --access-logfile - \\
    --max-requests=1000 \\
    --max-requests-jitter=100 \\
    bugsink.wsgi
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gunicorn.service

log "10) nginx: initial HTTP config on :80 (needed for certbot domain validation)"
rm -f /etc/nginx/sites-enabled/default || true

cat >/etc/nginx/sites-available/bugsink <<EOF
server {
    server_name ${HOST};
    client_max_body_size 20M;
    access_log /var/log/nginx/bugsink.access.log;
    error_log /var/log/nginx/bugsink.error.log;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Strict-Transport-Security "max-age=31536000; preload" always;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bugsink /etc/nginx/sites-enabled/bugsink
service nginx configtest
systemctl restart nginx

log "11) SSL via certbot (snap), then final nginx hardening config"
# Install certbot as snap + symlink
if [ ! -e /usr/bin/certbot ]; then
    python3 -m venv /opt/certbot/
    /opt/certbot/bin/python3 -m pip install certbot certbot-nginx
    ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi
/opt/certbot/bin/certbot --agree-tos --nginx -m $EMAIL
# TODO:
# chmod u+x /etc/cron.weekly/certbot-renew
service nginx configtest
systemctl restart nginx.service

log "12) systemd: snappea.service"
cat >/etc/systemd/system/snappea.service <<'EOF'
[Unit]
Description=snappea daemon

[Service]
Restart=always
User=bugsink
Group=bugsink
Environment="PYTHONUNBUFFERED=1"
WorkingDirectory=/home/bugsink
ExecStart=/home/bugsink/venv/bin/bugsink-runsnappea
KillMode=mixed
TimeoutStopSec=5
RuntimeMaxSec=1d

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now snappea.service

log "13) Optional: verify snappea picks up a task"
run_as_bugsink ". venv/bin/activate && bugsink-manage checksnappea" || true

# Remove Google cruft in background
screen -dm /bin/sh -c "apt remove --allow-change-held-packages -y google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent"

echo
log "DONE. Memory usage:"
free -h
echo "Open: https://${HOST}"
echo
echo "Useful checks:"
echo "  systemctl status gunicorn.service"
echo "  systemctl status snappea.service"
echo "  journalctl -u snappea.service"
echo "  tail -n 200 /var/log/nginx/bugsink.error.log"
