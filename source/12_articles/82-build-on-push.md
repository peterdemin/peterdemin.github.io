# Building this Website on Git Push

## Preface

In the spirit of my recent fascination with self-sovereignity and decentralization I will replace the fancy friendly mature reliable GitHub Pages with a hack.

> As a side note, I like GitHub Pages, the service democratized static website hosting and made it easily approachable to many developers.
> GitHub Actions allow flexible builds outside of the default Jekyll system.
> For example, I'm using a Makefile with SphinxDocs, and quiet happy with it.
> And all of it is completely free.
> But this article is not about GitHub Pages, this is about an *alternative*.

The hack is to run a Debian VM on my home server with a git repo and post-receive hook that builds a static website.
The built artifact is then committed to another repo, which is pushed to a Cloud VPS.
I could've simplified the setup by building the website directly on the VPS, the problem is that the VPS is so tiny, I doubt it can handle the build process.

The website build process got pretty involved over the years since I'm hoarding all my petty experiments for no good reason.
The builder needs Python, graphviz, NodeJS, and customary imperial tonne of npm packages.
On the bright side, the full build process is just a single make command.

I'll keep the VM running at all times and preserve the build files so it can run incrementally.
I'll also ship the build artifact through git, which should be much faster then a complete artifact every time.

And I'll have a mirror VPS to open a can of HTTPS certificate synchronization worms.

## Virtual Machine

My favorite way of running virtual machines is with Vagrant and KVM.

`Vagrantfile`:
```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "debian/trixie64"
    config.vm.synced_folder "./", "/vagrant", type: "virtiofs"
    config.vm.provider :libvirt do |libvirt|
      libvirt.driver = "kvm"
      libvirt.uri = 'qemu:///system'
      libvirt.cpus = 2
      libvirt.memory = "2048"
      libvirt.memorybacking :access, :mode => "shared"
    end
    config.vm.provision "shell", path: "provision_builder.sh"
end
```

Upon creation (`vagrant up`) it immediately runs the provisioning script that sets everything up.
The script is reentrant, because I had to iterate a bit to polish all the kinks.

`provision_builder.sh`:
```{literalinclude} ../../scripts/provision_builder.sh
:language: bash
```

And that's how I cut my website publish time from 5 minutes down to 10 seconds.

Setting up the serving host is similar, except that instead of building, it just needs to check out.

`provision_pages.sh`:
```{literalinclude} ../../scripts/provision_mirror.sh
:language: bash
```

I added a flag to nginx to serve static precompressed gzip files to save CPU on the serving side.

Then I deployed another mirror to https://mirror.demin.dev under a separate Google Cloud Platform account.

## Infra Branch

I use a second branch, `infra`, in the same `pages.git` repo on mirrors.
It carries operational config and runtime data:

1. Primary mirror fingerprint (`infra/primary_key_fingerprint.txt`).
2. Public keys of all mirrors (`infra/mirrors/*.pub`).
3. ACME challenges (`infra/challenges/*`).
4. Encrypted cert bundles (`infra/certs/*.tar.age`).

Mirrors check out `master` into `/var/www/pages` and `infra` into `/var/lib/infra`.
A systemd `.path` unit watches `/var/lib/infra/infra/*` and runs `infra apply`
(a tiny Python CLI in `infra/cli.py`) as root on every change.

The builder VM forwards the `infra` branch to mirrors when I push it to the builder.
That keeps the laptop out of the direct mirror communication path.

## Certificates and Challenges

DNS-01 is not available to me, so I do HTTP-01 with challenge distribution.
The primary mirror runs certbot with manual hooks:

1. `infra distribute-challenge` writes the token under `infra/challenges/`
   and pushes the `infra` branch to mirrors.
2. Mirrors apply the change and copy the token into
   `/var/www/pages/.well-known/acme-challenge/`.
3. `infra cleanup-challenge` removes the token and pushes again.

Certificates are distributed via the same `infra` branch, but encrypted.
The primary packs `fullchain.pem` and `privkey.pem` into a tarball,
encrypts it with `age` for all mirror SSH public keys,
commits to `infra/certs/`, and pushes to mirrors.
Each mirror decrypts and installs the certs during `infra apply`
and reloads nginx.
