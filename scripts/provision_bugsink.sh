#!/usr/bin/env bash
set -euo pipefail

# Bugsink single-server production installer (Ubuntu 24.04-style)
# Docs: https://www.bugsink.com/docs/single-server-production/

HOST=bugsink.demin.dev
EMAIL=peter@demin.dev

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

mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg > /usr/share/keyrings/tailscale-archive-keyring.gpg
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list > /etc/apt/sources.list.d/tailscale.list

log "Install packages"
export DEBIAN_FRONTEND=noninteractive
apt update
apt -y upgrade
apt -y install      \
    python3         \
    python3-pip     \
    python3-venv    \
    nginx           \
    curl            \
    tailscale

log "Login to tailscale"
echo "Log in to your Tailscale account to add a new instance. Then disable SSH access"
tailscale login

log "Create non-root user: bugsink (if missing)"
if ! id -u bugsink >/dev/null 2>&1; then
  adduser bugsink --disabled-password --gecos ""
fi

log "Create/activate venv and install/upgrade Bugsink"
run_as_bugsink 'python3 -m venv venv'
run_as_bugsink '. venv/bin/activate && python3 -m pip install --upgrade pip'
run_as_bugsink '. venv/bin/activate && python3 -m pip install --upgrade bugsink'
run_as_bugsink '. venv/bin/activate && bugsink-show-version'

log "Generate production config: bugsink_conf.py (template=singleserver)"
# If config exists, we keep it (idempotent-ish)
if [[ ! -f /home/bugsink/bugsink_conf.py ]]; then
  run_as_bugsink ". venv/bin/activate && bugsink-create-conf --template=singleserver --host='${HOST}'"
else
  log "   /home/bugsink/bugsink_conf.py already exists; leaving it unchanged."
fi

log "Initialize DBs (migrate main + snappea queue DB)"
run_as_bugsink ". venv/bin/activate && bugsink-manage migrate"
run_as_bugsink ". venv/bin/activate && bugsink-manage migrate snappea --database=snappea"

log "Create the superuser"
echo
echo ">>> You will now be prompted to create the Bugsink superuser (per the docs)."
echo ">>> Use an email address as username if you like."
echo
run_as_bugsink ". venv/bin/activate && bugsink-manage createsuperuser"

log "Sanity checks"
run_as_bugsink ". venv/bin/activate && bugsink-manage check_migrations"
run_as_bugsink ". venv/bin/activate && bugsink-manage check --deploy --fail-level WARNING"

log "systemd: gunicorn.service"
cat >/etc/systemd/system/gunicorn.service <<EOF
[Unit]
Description=gunicorn daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=bugsink
Group=bugsink
Environment="PYTHONUNBUFFERED=1"
WorkingDirectory=/home/bugsink
UMask=0077

ExecStart=/home/bugsink/venv/bin/gunicorn \\
    --bind="127.0.0.1:8000" \\
    --workers=1 \\
    --timeout=60 \\
    --access-logfile - \\
    --max-requests=1000 \\
    --max-requests-jitter=100 \\
    bugsink.wsgi
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=on-failure
RestartSec=3s
KillMode=mixed
TimeoutStartSec=30s
TimeoutStopSec=10s

# ---- Hardening Controls ----

# Prevent privilege escalation
NoNewPrivileges=yes

# Isolate filesystem
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=read-only

# Allow writes only where needed
ReadWritePaths=/home/bugsink

# Kernel surface reduction
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes

# Process namespace cleanup
ProtectProc=invisible
ProcSubset=pid
RemoveIPC=yes

# Capabilities cleanup
CapabilityBoundingSet=
AmbientCapabilities=

# Syscall restrictions
SystemCallArchitectures=native
SystemCallFilter=@system-service @network-io
SystemCallErrorNumber=EPERM

# Network controls
IPAddressDeny=any
IPAddressAllow=127.0.0.1/8
IPAddressAllow=::1/128

# Limits
TasksMax=200
LimitNOFILE=65536

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now gunicorn.service

log "nginx"
rm -f /etc/nginx/sites-enabled/default || true

cat >/etc/nginx/sites-available/bugsink <<EOF
upstream bugsink_upstream {
  server 127.0.0.1:8000;
  keepalive 32;
}

limit_req_zone \$binary_remote_addr zone=bugsink_req:10m rate=10r/s;
limit_conn_zone \$binary_remote_addr zone=bugsink_conn:10m;

server {
    server_name ${HOST};
    client_max_body_size 20M;
    access_log /var/log/nginx/bugsink.access.log;
    error_log /var/log/nginx/bugsink.error.log;
    limit_conn bugsink_conn 30;
    limit_req zone=bugsink_req burst=20 nodelay;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Strict-Transport-Security "max-age=31536000; preload" always;
        proxy_redirect off;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bugsink /etc/nginx/sites-enabled/bugsink
service nginx configtest
systemctl restart nginx.service

log "SSL via certbot"
if [ ! -e /usr/bin/certbot ]; then
    python3 -m venv /opt/certbot/
    /opt/certbot/bin/python3 -m pip install certbot certbot-nginx
    ln -s /opt/certbot/bin/certbot /usr/bin/certbot
fi
/opt/certbot/bin/certbot --agree-tos --nginx -m $EMAIL
install -m 0744 /dev/stdin /etc/cron.weekly/certbot-renew <<'EOF'
#!/bin/sh
certbot renew -q
EOF

service nginx configtest
systemctl restart nginx.service

log "systemd: snappea.service"
cat >/etc/systemd/system/snappea.service <<'EOF'
[Unit]
Description=Bugsink snappea worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bugsink
Group=bugsink
WorkingDirectory=/home/bugsink

Environment="PYTHONUNBUFFERED=1"
Environment="PHONEHOME=False"
UMask=0077

ExecStart=/home/bugsink/venv/bin/bugsink-runsnappea

Restart=on-failure
RestartSec=3s
KillMode=mixed
TimeoutStartSec=30s
TimeoutStopSec=10s
RuntimeMaxSec=1d

# Hardening: privileges
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
RestrictSUIDSGID=yes
RestrictRealtime=yes
LockPersonality=yes

# Hardening: filesystem
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=read-only

# Allow writes only where Bugsink needs them.
ReadWritePaths=/home/bugsink

# Hardening: kernel + proc
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
ProtectProc=invisible
ProcSubset=pid
RemoveIPC=yes

# Hardening: syscalls
SystemCallArchitectures=native
SystemCallFilter=@system-service @network-io
SystemCallErrorNumber=EPERM

# Network controls
IPAddressDeny=any
IPAddressAllow=127.0.0.1/8
IPAddressAllow=::1/128

# Resource limits
TasksMax=200
LimitNOFILE=65536

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now snappea.service

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
