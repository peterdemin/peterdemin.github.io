# Collecte - self-hosted open source email collector

Collect emails on your static website into your private git repo.
The solution is targeted at people who already have a Linux server and domain,
or don't mind to get one.
You have to be familiar with basics of operating a web server.
No Python knowledge is required, but service is going to use it.

## Prerequisites

* You'll need to host a Linux server somewhere.
* You'll need a domain to serve the API requests.
* It can be a tiny virtual machine, like Google's free tier f1-micro.
* It can be a Heroku node, which will save a few minutes configuring nginx.
* You'll need to be familiar with shell to install and configure service.
* The page with the email signup form can be hosted anywhere, for example on GitHub pages.

## What you get

Python service running on a virtual machine using systemd unit.
Nginx serving a single API endpoint.
Private git repository, that stores all submitted emails into a plain text file.

## How it works

* Service accepts POST requests at `/singup`.
* Appends the received email to `emails.txt`.
* Commits changes.
* Pushes the commit to the upstream.
* Redirects user to "thanks" page.

## How to install

Instruction are written for Ubuntu Linux, but can be applied to any other Linux distribution.

1. Create a system user to run the service. `sudo adduser --system collecte --home /var/lib/collecte`
2. Setup git repo for saving emails. `cd /var/lib/collecte && sudo -u collecte git init .`
3. Create an SSH key pair to push the repo. `sudo -u collecte ssh-keygen`
4. Make sure the public key is accepted at the upstream git repo.
5. Install collecte inside of a virtualenv.
   ```
   sudo su collecte
   python3 -m venv /var/lib/collecte/.venv
   source /var/lib/collecte/.venv/bin/activate
   pip install collecte
   exit
   ```
6. Create systemd unit.
   ```
   sudo cat >/etc/systemd/system/collecte.service <<EOF
   [Unit]
   Description=collecte HTTP API
   After=network.target
   StartLimitIntervalSec=0
   Environment="PORT=7777"
   Environment="REDIRECT_URL=https://your-static-website.com/thanks"

   [Service]
   Type=simple
   User=collecte
   ExecStart=/var/lib/collecte/.venv/bin/collecte

   [Install]
   WantedBy=multi-user.target
   ```
7. Enable and start the service.
   ```
   sudo systemctl daemon-reload
   sudo systemctl enable collecte.service
   sudo systemctl start collecte.service
   ```
8. Install nginx. `sudo apt install nginx`
9. Configure nginx to proxy pass requests to the collecte service.
   Edit `/etc/nginx/sites-available/default` to have the following section.
   ```
   location /signup {
       proxy_pass http://127.0.0.1:7777;
   }
   ```
10. Ensure nginx configuration is valid and restart nginx.
   ```
   sudo nginx -t && sudo systemctl restart nginx.service
   ```
