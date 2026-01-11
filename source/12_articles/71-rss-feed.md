# My RSS feed reader setup

I run a [CommaFeed](https://github.com/Athou/commafeed) instance on a free-tier Google Cloud Platform virtual machine.
It's a Google Reader-inspired self-hosted personal RSS reader.

I'm not using Docker, in part because the VM has only 0.25 CPU and, in part, because I like simple things.

## Installation

CommaFeed service runs under a SystemD Unit using a separate system user with a home directory:

```
sudo useradd -rms /sbin/nologin commafeed
sudo -u commafeed wget -O /home/commafeed/commafeed \
    https://github.com/Athou/commafeed/releases/download/5.12.1/commafeed-5.12.1-h2-linux-x86_64-runner
sudo chmod +x /home/commafeed/commafeed
```

(Check the [releases page](https://github.com/Athou/commafeed/releases/latest) to get the latest native binary for your operating system).

## SystemD Unit

Create a Systemd Unit:

`/etc/systemd/system/commafeed.service`:

```systemd
[Unit]
Description=A bloat-free feed reader
After=local-fs.target network.target

[Service]
User=commafeed
Group=commafeed
WorkingDirectory=/home/commafeed
ExecStart=/home/commafeed/commafeed
SyslogIdentifier=commafeed
Restart=always

[Install]
WantedBy=multi-user.target
```

(Check out the hardened version below.)

To launch the Commafeed service, run:

```bash
sudo systemctl daemon-reload
sudo systemctl enable commafeed.service
sudo systemctl start commafeed.service
```

## Reverse proxy

Nginx has a section dedicated to proxy pass `feed` subdomain to a localhost port:

`/etc/nginx/sites-available/commafeed`:

```{literalinclude} ../../etc/nginx/sites-available/commafeed
:language: nginx
```

Configure TLS certificates (using certbot, for example).

```bash
ln -sf /etc/nginx/sites-available/commafeed /etc/nginx/sites-enabled/commafeed
```

## User registration

CommaFeed comes with an `admin` account with password `admin`.

Once you have the service running, you've got to be quick to log in to it before any hackers do.
Open the CommaFeed Web UI in your browser (in my case, https://feed.demin.dev) and log in as `admin:admin`.
Open the Profile/User management, and create an account for yourself (and maybe delete the admin account for good).

## Backup

I wouldn't want to lose the extensive library of feeds I aggregated over many years.
My solution is to export the [OPML file](./71-opml.xml) whenever I think about how I don't want to lose it.
That's a standard format that is easy to inspect and migrate to another service.

CommaFeed provides a REST API for the export.
You'll need to generate an API key to use it.
It's available on the profile page.

Export your OPML file via the [REST API](https://www.commafeed.com/api-documentation/#/Feeds/get_rest_feed_export)
(append `?apiKey=<your key>` at the end of the URL).

Here's how I do it:

```{literalinclude} ../../export_opml.sh
:language: bash
:start-at: curl
```

## The treasure

Here's the list of feeds from the OPML file in alphabetical order:

```{include} ./71-subscriptions.mdpart
:language: md
```

## Hardened SystemD Unit

As a usual best practice, we should apply the principle of least privilege.
The hardened version, which won't let CommaFeed process do any harm even if it gets hacked:

```{literalinclude} ../../etc/systemd/system/commafeed.service
:language: systemd
```

## OPML to Markdown script

`opml2md.py`:

```{literalinclude} ../../opml2md.py
:language: python
```
