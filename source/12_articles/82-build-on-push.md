# Building this Website on Git Push

## Preface
I really like GitHub Pages, the service democratized static website hosting and made it easily approachable to many developers.
GitHub Actions allow flexible builds outside of the default Jekyll system.
For example, I'm using a Makefile with SphinxDocs, and quiet happy with it.
And all of it is completely free.

But this article is not about GitHub Pages.
In the spirit of my recent fascination with self-sovereignity and decentralization I will replace this fancy friendly mature reliable system with a hack.

The hack is to run a Debian VM on my home server with a git repo and post-receive hook that builds and publishes a static website.
One upside I expect from it is fast incremental builds.
I'll keep the VM running at all times and keep the build files instead of running builds in a fresh container and rebuilding everything from scratch every time. 

The website build process got pretty involved over the years since I'm hoarding all my petty experiments for no good reason.
It needs Python with a few dependencies, graphviz, NodeJS, npm, and customary imperial tonne of npm packages.

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
```{include} ../../scripts/provision_builder.sh
```
