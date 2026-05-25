# Install Bugsink on Google Cloud Platform

[Bugsink](https://github.com/bugsink/bugsink/) is a lightweight self-hosted error tracking service written in Python/Django.
It's compatible with Sentry Client SDK, so migration means just changing a DSN URL.

Bugsink can be sensibly scaled according to usage.
In my case, I went with minimal configuration - a single gunicorn process.
I tested the setup, and it's fast enough for my needs.
On the server it takes little less than 200MB.

The deployment is semi-automatic, because I need to update DNS records for the newly created VM,
and enter login/password for the superuser.

Deployment takes less than 10 minutes.
At which point I can sign in, create a project and copy the DSN URL to plug into my service.

I've split it into two files:
1. Create a virtual machine and set up firewall rules.
2. Provisioning script that runs on the newly created VM as root.

`scripts/create_bugsink.sh`:

```{literalinclude} ../../scripts/create_bugsink.sh
:language: bash
```

`scripts/provision_bugsink.sh`:

```{literalinclude} ../../scripts/provision_bugsink.sh
:language: bash
```

Once you're done playing with it, here's how you can destroy the VM:

```{literalinclude} ../../scripts/destroy_bugsink.sh
:language: bash
```
