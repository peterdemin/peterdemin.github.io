#!/bin/bash
set -euo pipefail

apt-get update
apt-get install -y      \
    curl                \
    build-essential     \
    git                 \
    python3-venv        \
    python-is-python3   \
    graphviz            \
    nodejs              \
    npm                 \
    rsync

tailscale status || ( \
    mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg > /usr/share/keyrings/tailscale-archive-keyring.gpg \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list > /etc/apt/sources.list.d/tailscale.list \
    && apt-get update \
    && apt-get install -y tailscale \
    && tailscale login \
    && tailscale up \
)

id builder || useradd -rms /usr/bin/git-shell builder
install -o builder -g builder -m 0700 -d ~builder/.ssh
install -o builder -g builder -m 0700 -d /var/www/site
install -o builder -g builder -m 0600 /dev/stdin ~builder/.ssh/authorized_keys <<'EOF'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDYxOnUHnt2KZ8kdjYjO/xWflaFKxXXJLv6V8/TiXgow8L+QdFmcEJ/NRdR6/LVLEwiJ5h9l26mY8XxlpVAIY43NqbhPUdBp6SoeX2tpHFQa4R1i7coO3bO1sjAVqeTmTby4iROtWZ89OEsqYnWyYco4py+sn6X+h8TDRIbrl2zYQI9IwK8O2UJTV9qT2Vy4s4fitLTeO6AI7935OsrLzXV+iaGGmhoUfpZcHZ5I9puaaTOyxuJ3q4nA0PNiZ9Lw7+TYOo73eXPA+qRrsvEy6b6x3+izyj4WX31YSklksw5CX+jjc23d7muV8cHFaoO1GkueVYyve8ncqy0dGn9CiDQudVqUyhqkF49MvWO1Hjg9SeidaKGqalh0Pv8RJquTJ8aUXcVS9GwCmYu+/JfBVcCGYKEpcwrLOt/iYa9iHCsImb/wlO08n3R+HBIF4At0Jxgd4wWM8ZhSXoA2UjCBojZwcWLPuS+S/zplFgi3stv+mkfEf9WDQo1g5bueFJ+gK8= peterdemin@MBA
EOF
test -d ~builder/repo.git || sudo -u builder -s /bin/bash -c "git init --bare ~builder/repo.git"
test -d ~builder/pages.git || sudo -u builder -s /bin/bash -c "git init --bare ~builder/pages.git && git -C ~builder/pages.git remote add origin pages@demin-dev.tail13c89.ts.net:repo.git"
test -d ~builder/venv || sudo -u builder -s /bin/bash -c "python3 -m venv ~builder/venv"
test -f ~builder/.ssh/id_ed25519 || sudo -u builder -s /bin/bash -c 'ssh-keygen -t ed25519 -f ~builder/.ssh/id_ed25519 -N ""'
echo "Copy public key to serving host:"
sudo -u builder -s /bin/bash -c 'ssh-keygen -yf ~builder/.ssh/id_ed25519'
echo

sudo -u builder /bin/bash -c 'git config --global user.email "builder@demin.dev"'
sudo -u builder /bin/bash -c 'git config --global user.name "Builder Bot"'
sudo -u builder /bin/bash -c 'git config --global init.defaultBranch master'
sudo -u builder /bin/bash -c 'ssh-keyscan -t ed25519 demin-dev.tail13c89.ts.net > ~/.ssh/known_hosts'

install -o builder -g builder -m 0700 -d ~builder/worktree
install -m 0755 /dev/stdin ~builder/repo.git/hooks/post-receive <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

HOME=/home/builder
WORK_TREE="$HOME/worktree"
LIVE_DIR="/var/www/site"

BRANCH="master"
BRANCH_REF="refs/heads/$BRANCH"

read oldrev newrev REFNAME
if [[ "$REFNAME" != "$BRANCH_REF" ]]; then
  echo "Ignoring push to $REFNAME (only deploys $BRANCH_REF)"
  exit 0
fi

git --git-dir="$HOME/repo.git" --work-tree="$WORK_TREE" checkout -f $BRANCH

cd "$WORK_TREE"
. $HOME/venv/bin/activate
make install p compress

cd build/html
git --git-dir="$HOME/pages.git" --work-tree . add -A .
git --git-dir="$HOME/pages.git" --work-tree . commit -m "Build pages"
git --git-dir="$HOME/pages.git" --work-tree . push origin master
EOF
