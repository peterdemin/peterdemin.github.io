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

## Building from source

The 6.0.0 version had a bug that broke scrolling posts on Safari, the author fixed the issue promptly but wasn't eager to publish a new release.
I figured I can use keyboard to scroll up and down until one day that stopped working as well.
So then I thought, let's see if the new version fixes the issue.
I didn't want to bother Jérémie with the release, so I decided to build it myself.

I've never built standalone Java programs (or used maven for that matter) and the README was a bit shallow on how to build it from source, so I vibed a builder script, that runs in a VM with Vagrant.

`Vagrantfile`:
```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "debian/trixie64"
    config.vm.network "private_network", ip: "192.168.56.57"
    config.vm.synced_folder "./", "/vagrant", type: "virtiofs"
    config.vm.provider :libvirt do |libvirt|
      libvirt.driver = "kvm"
      libvirt.uri = 'qemu:///system'
      libvirt.cpus = 4
      libvirt.memory = "16384"
      libvirt.memorybacking :access, :mode => "shared"
    end
    config.vm.provision "shell", path: "build.sh"
end
```

`build.sh`:
```bash
#!/bin/bash

set -eo pipefail

sudo apt-get update
sudo apt-get install -y git maven build-essential zlib1g-dev curl zip unzip
curl -s "https://get.sdkman.io" | bash
source "/root/.sdkman/bin/sdkman-init.sh"
sdk install java 25-graal
sdk use java 25-graal
test -d commafeed || git clone https://github.com/Athou/commafeed.git
cd commafeed
export NODE_OPTIONS="--max-old-space-size=6144"
mvn -DskipTests -Pnative -Ph2 clean package -Dquarkus.native.native-image-xmx=14g
sudo cp commafeed-server/target/commafeed-*-h2-linux-x86_64-runner /vagrant/commafeed
```

Note the setting of 6 GB RAM for NodeJS and 14 GB for Java.
I kept doubling it until it stopped running out of memory.

The resulting binary is 163 MB, same as in the official release.

For what it worth, I deployed it and reloaded the page, but the bug is still there.
Whoops... But at least I'm running my own build now.
And it works in Firefox just fine.
