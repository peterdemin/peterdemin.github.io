# How much can Google Cloud Platform free-tier Virtual Machine serve

Google Cloud Platform generously offers a tiny Virtual Machine instance for [free](https://docs.cloud.google.com/free/docs/free-cloud-features#compute) per account.
The [e2-micro](https://docs.cloud.google.com/compute/docs/general-purpose-machines#e2-shared-core) is not exactly a power house: 0.25 CPU, 1 GB RAM, and 30 GB HDD (not SSD).
But don't be discouraged, as you'll see how much we can pack on it.
Of course, everyone has an opinion on what should be hosted on a personal VM in the cloud, but here's my take, and I hope someone can pick up something useful.
Also, a disclaimer, while the hosting part is free, a nice domain name is not.
I used to use Google Domains, but they moved their business to SquareSpace.
I pay $12/year for demin.dev.

My choice of services to run:

- VPN using `tailscale`.
- Folder synchronization with `syncthing`.
- Static website and reverse proxy using `nginx`.
- XMPP server using `ejabberd`.
- Mailbox using `postfix`.
- RSS reader using `commafeed`.

This setup provides me these enjoyable, free, and open-source things:

1. Email and XMPP accounts: peter@demin.dev.
2. Personal static website at peter.demin.dev.
3. Personal RSS reader at feed.demin.dev.
4. VPN exit node, that makes me look like a Google Cloud server 🤪
5. Cloud backup server (the unreliable kind, because there's no redundancy).

In the interest of efficiency, we won't be using containerization or nested virtualization (sorry, no [PaaS](/12_articles/51-self-hosted-paas.html) preaching here), which means extra fuss for installing each separate piece.
But you'll see that the setup has the same steps for many parts, and it's a good opportunity to learn about the Linux fundamentals: managing packages, users, configuration files, and SystemD units.

## Install GCloud CLI

I prefer scriptable solutions to clicking around in a Web UI, so we'll be using [Google Cloud command-line interface](https://docs.cloud.google.com/sdk/docs/install-sdk).
There are many ways to install `gcloud`, my favorite is to use `pip`.
With a modern Python (3.12+ at the moment of writing), create a virtualenv and run `pip install gcloud`.

After installation, authenticate the CLI under your Google account: `gcloud auth login`.

## Create a VM

I extracted the parts that you most likely want to change as variables.
I'm using domain name demin.dev, and my user name is peterdemin:

```bash
PROJECT=demindev
ACCOUNT=763427644786
USERNAME=peter
PUBKEY=$(ssh-keygen -yf ~/.ssh/id_rsa)
INSTANCE=demin-dev
DOMAIN=demin.dev

gcloud compute instances create $INSTANCE \
    --project=$PROJECT \
    --zone=us-west1-c \
    --machine-type=e2-micro \
    --network-interface=network-tier=STANDARD,stack-type=IPV4_ONLY,subnet=default \
    --tags=http-server,https-server,jabber-server \
    --public-ptr \
    --public-ptr-domain="${DOMAIN}." \
    --metadata="ssh-keys=${USERNAME}:${PUBKEY}" \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --service-account="${ACCOUNT}-compute@developer.gserviceaccount.com" \
    --scopes=https://www.googleapis.com/auth/devstorage.read_only,https://www.googleapis.com/auth/logging.write,https://www.googleapis.com/auth/monitoring.write,https://www.googleapis.com/auth/service.management.readonly,https://www.googleapis.com/auth/servicecontrol,https://www.googleapis.com/auth/trace.append \
    --create-disk=auto-delete=yes,boot=yes,device-name=$INSTANCE,image=projects/debian-cloud/global/images/debian-13-trixie-v20251014,mode=rw,size=10,type=pd-standard \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=goog-ec-src=vm_add-gcloud \
    --reservation-affinity=any
```

I'm using the latest stable Debian release that happens to be 13 Trixie.
I'm a long time fan of Ubuntu, but I found that Ubuntu server is a bit too heavy for the e2-micro size, while Debian provides a similar experience.

The command will output something like this:

```
NAME            ZONE        MACHINE_TYPE  PREEMPTIBLE  INTERNAL_IP  EXTERNAL_IP   STATUS
demin-dev       us-west1-c  e2-micro                   10.138.0.4   35.212.175.9  RUNNING
```

It'll take a second to start the VM.
Use this time to update the DNS settings for the domain with the new `EXTERNAL_IP`.
Don't worry that the address is "ephemeral", in my experience Google doesn't change IP addresses of running VMs.
In opposite, it actually tends to reuse the same IPv4 address if you delete/recreate a VM.
The jabber subdomains (conference.demin.dev and pubsub.demin.dev) can be `A` records with the same IP, or a `CNAME`, it doesn't matter.

## Configure Firewall

Make sure we have HTTP/HTTPS rules, and add Jabber ports:

```bash
gcloud compute firewall-rules create default-allow-http \
    --project=$PROJECT \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server \
    || true
gcloud compute firewall-rules create default-allow-https \
    --project=$PROJECT \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=https-server \
    || true
gcloud compute firewall-rules create jabber \
    --project=$PROJECT \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:5222,tcp:5223,tcp:5269,tcp:5443,tcp:5280,tcp:1883,udp:5478 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=jabber-server \
    || true
```

## Provision

Personally, I put all VM setup code in a shell script, so my workflow looks like this:

```bash
scp provision.sh "${IP}:"
ssh "${IP}" -- "chmod +x provision.sh && sudo ./provision.sh"
```

For the sake of the guideline, I'll split the steps, so it's easier to follow and adjust.
Login to the instance is become root:

```bash
ssh $IP
sudo su
```

All further instructions assume you're running as root on the VM.

For the email server instructions please refer to [](/12_articles/45-minimal-linux-email-box.md).
The instructions for the RSS header are in [](/12_articles/71-rss-feed.md).

### Clean up Google cruft

Google preinstalls its CLI to the VM cloud images. I find it unnecessary and wasteful, so the first step is to clean up:

```bash
apt remove -y google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent
apt autoremove
```

This operation is crazy slow (about 10 minutes), mostly because Google decided to delete the package files one-by-one, instead of in bulk. Keeping packages would most likely mean upgrading them, which takes same crazy amount of time.

If you want the life of this VM to be snappy, the alternative is to put these packages on hold:

```bash
apt-mark hold google-cloud-cli google-cloud-cli-anthoscli google-guest-agent google-osconfig-agent
```

### Install Tailscale

I like to start with tailscale, because that allows me to disable public SSH access to the instance as soon as possible.

First we need to add tailscale's Debian package repo:

```bash
mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.noarmor.gpg > /usr/share/keyrings/tailscale-archive-keyring.gpg
curl -fsSL https://pkgs.tailscale.com/stable/debian/trixie.tailscale-keyring.list > /etc/apt/sources.list.d/tailscale.list
```

Refresh packages list and install:

```bash
apt-get update
apt-get install -y tailscale
```

Tailscale authentication is done by following the link from this command:

```bash
tailscale login
```

Now you can logout from SSH session, disable allow-ssh firewall rule and connect back on the tailscale host that would looks something like `demin-dev.tail6f730.ts.net`.
While at it, you might also want to disable RDP and internal traffic rules as well.

If you designate this server as an exit node, you can use it for security on public WiFi.
You'll need to apply [extra configuration](https://tailscale.com/kb/1019/subnets?tab=linux#enable-ip-forwarding), though:

```bash
cat | sudo tee /etc/sysctl.d/99-tailscale.conf <<EOF
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF
sysctl -p /etc/sysctl.d/99-tailscale.conf
tailscale up --advertise-exit-node
```

Then open [Tailscale](https://tailscale.com) admin console, open the machine page, and choose Exit Node: Allowed under Routing Settings.

To verify, enable the new Exit Node on your laptop and open [](https://whatismyipaddress.com/), it should show something like this:

```
ISP:      Google LLC
Services: Data Center/Transit
City:     The Dalles
Region:   Oregon
Country:  United States
```

### Folder synchronization with Syncthing

The steps to install Syncthing from package maintainer's repo are similar:

```
curl -L -o /etc/apt/keyrings/syncthing-archive-keyring.gpg https://syncthing.net/release-key.gpg
echo "deb [signed-by=/etc/apt/keyrings/syncthing-archive-keyring.gpg] https://apt.syncthing.net/ syncthing stable-v2" > /etc/apt/sources.list.d/syncthing.list
apt-get update
apt-get install -y syncthing
```

Syncthing uses per-user SystemD units. Let's make a separate system user for it and launch:

```bash
useradd -rms /sbin/nologin syncthing
systemctl enable syncthing@syncthing.service
systemctl start syncthing@syncthing.service
```

Then you can open Web UI on port `8384` on the tailscale's host and finish the setup in the browser:

https://demin-dev.tail6f730.ts.net:8384/

One cool thing to do is to share `/var/www/html` with your laptop for a seemless website deployment experience.

### Nginx and HTTPS

The domain needs TLS certificates to serve HTTPS and XMPP traffic.
Certbot recommends to use snap installation, because they don't have the time to support everyone who can't figure out Python installation.
But it's more efficient to install from pip. Here are the steps.

First, let's make sure we have nginx and Python installed:

```bash
apt-get install -y nginx ca-certificates python3-venv python-is-python3
```

Now, we'll create a virtualenv for certbot and install it system-wide:

```bash
python3 -m venv /opt/certbot/
/opt/certbot/bin/python3 -m pip install certbot certbot-nginx
ln -s /opt/certbot/bin/certbot /usr/bin/certbot
```

This is not ideal, because we're not using the system the package manager.
So it won't get automatic updates for the certbot, and removing has to be done "manually".
For this particular case, I think, it's fine, though.
In case you want to upgrade it later, run:

```bash
/opt/certbot/bin/python3 -m pip install -U certbot certbot-nginx
```

Let's configure nginx. Make sure you include jabber subdomains:

```
server {
    server_name www.demin.dev demin.dev conference.demin.dev pubsub.demin.dev;
    root /var/www/html;
    index index.html index.htm;
    location / {
        # Serve static files, or return 404 if not found
        try_files $uri $uri/ =404;
    }
}

server {
    server_name feed.demin.dev;

    location / {
      proxy_pass http://127.0.0.1:8082;
      proxy_set_header  X-Forwarded-Proto https;
      proxy_set_header Host $http_host;
    }
}
```

Generate the certificates and setup automatic renewal as per [official docs](https://eff-certbot.readthedocs.io/en/latest/using.html#setting-up-automated-renewal):

```bash
certbot --agree-tos --nginx -m $EMAIL
SLEEPTIME=$(awk 'BEGIN{srand(); print int(rand()*(3600+1))}'); echo "0 0,12 * * * root sleep $SLEEPTIME && certbot renew -q" >> /etc/crontab
```

This command will pick the subdomains from the nginx config, and update it to include the HTTPS-related details.

## Ejabberd

I was inspired to set up an XMPP server after reading about [FreeBSD setup from マリウス](https://マリウス.com/run-your-own-instant-messaging-service-on-freebsd/).
There are a few differences with my setup, though.
Using default mnesia database will cause frequent crashes due to running out of 1GB of memory so we'll switch to the second easiest option, SQLite.

Install ejabberd with SQLite support:

```bash
apt-get install -y ejabberd sqlite3 libsqlite3-dev erlang-p1-sqlite3
```

Update `/etc/ejabberd/ejabberd.yml` to configure host, TLS, and database:

```bash
hosts:
  - demin.dev

certfiles:
  # - "/etc/ejabberd/ejabberd.pem"
  - /etc/letsencrypt/live/demin.dev/fullchain.pem
  - /etc/letsencrypt/live/demin.dev/privkey.pem

sql_type: sqlite
sql_database: "/var/lib/ejabberd/ejabberd.db"
auth_method: sql
default_db: sql

...

modules:

  ...

  mod_mam:
    db_type: sql
```

To allow ejabberd share the certificates with nginx, change the group ownership and permissions:

```bash
chgrp -R ejabberd /etc/letsencrypt
chmod g+rx /etc/letsencrypt/archive
```

Start service and register the first user:

```bash
systemctl start ejabberd.service
read -rsp "Enter password for account $NAME: " password
sudo -u ejabberd ejabberdctl register $NAME $DOMAIN $password
```
