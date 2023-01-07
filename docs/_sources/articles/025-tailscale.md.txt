# Personal VPN: tailscale with headscale

## Background

I've been using different types of VPN for many years, for several reasons:

1. Public WiFi security. 
2. Geo-IP block sidestepping.
3. Secure access to remote devices.

My current tools of choice:

1. [NordVPN](https://nordvpn.com/) - paid service with good reliability and UI.
2. [Algo](https://github.com/trailofbits/algo) - set of scripts automating secure VPN server creation.

Recently, I was scrolling my GitHub feed and discovered
[headscale](https://github.com/juanfont/headscale) - open-source alternative
to the proprietary Tailscale control center for personal self-hosted use.

Which made me curious enough to finally try [Tailscale](https://tailscale.com/) itself.

## Installing Tailscale

I quickly registered using Google account, and added two devices - all in about five minutes - impressive!

Tailscale tracks Google account and IP addresses to provide network connectivity,
which is extremely user-friendly, but leaves a weird feeling of half-way private solution.
So, naturally, the next step is to replace third-party proprietary control center with the self-hosted open-source alternative.

## Installing Headscale 

Headscale provides binary releases (current version is [0.17.1](https://github.com/juanfont/headscale/releases/tag/v0.17.1))
but I don't like the experience of downloading and upgrading of GitHub releases, so I thought I better build it from sources.

I cloned the repo:

```
git clone git@github.com:juanfont/headscale.git
cd headscale
```

And quickly realized that the build instructions assume I'm an experienced [Nix](https://nixos.org/) user.

## Installing Nix

I've heard good things about Nix (mostly from [Xe's blog](https://xeiaso.net/blog)), so I thought it's a good opportunity to poke it.

I fruitlessly searched for a way to install Nix build system as an Ubuntu package, but it seems, that running shell scripts from the internet with `sudo` is the only supported way of installing it right now.
I hesitated a bit, but not for too long and gave it a try:

```
sh <(curl -L https://nixos.org/nix/install) --daemon
```

The installation script is pretty friendly and does a good job establishing trust with the user.

The next step was to set up development environment for the headscale.

Headscale's README mentiones running `nix develop` which seems sensible and harmless.
But turns out, on the (default?) installation it won't work.

Instead I had to activate two experimental features:

```
nix develop --extra-experimental-features nix-command --extra-experimental-features flakes
```

Once it finished, I proceeded to `make build` which expectedly failed with the same error, so here's the build command:

```
nix build --extra-experimental-features nix-command --extra-experimental-features flakes
```

After a few minutes of running tests, it finished with no other output.
I noticed a new `result` symlink in the repo directory. Inside of it I found the binaries:

```
$ tree result/
result/
└── bin
    └── headscale

1 directory, 1 file

$ ll -h result/bin/*
-r-xr-xr-x 1 root root 25M Dec 31  1969 result/bin/headscale*

$ sha256sum result/bin/headscale
273e4c4cd13c5903d8dd5611a8f6a43434b34e58c01a6682341370418b0fb837  result/bin/headscale
```

SHA sum doesn't match the one from official release (`e8d3d74b040bd2e3e9f049d95e4f4b759160518a1cf682ec0bb76f2fed7d77cf`), but whatever.

Let's see what it does:

```
$ result/bin/headscale --help

headscale is an open source implementation of the Tailscale control server

https://github.com/juanfont/headscale

Usage:
  headscale [command]

Available Commands:
  apikeys     Handle the Api keys in Headscale
  completion  Generate the autocompletion script for the specified shell
  debug       debug and testing commands
  generate    Generate commands
  help        Help about any command
  mockoidc    Runs a mock OIDC server for testing
  namespaces  Manage the namespaces of Headscale
  nodes       Manage the nodes of Headscale
  preauthkeys Handle the preauthkeys in Headscale
  routes      Manage the routes of Headscale
  serve       Launches the headscale server
  version     Print the version.

Flags:
  -c, --config string   config file (default is /etc/headscale/config.yaml)
      --force           Disable prompts and forces the execution
  -h, --help            help for headscale
  -o, --output string   Output format. Empty for human-readable, 'json', 'json-line' or 'yaml'

Use "headscale [command] --help" for more information about a command.

$ result/bin/headscale version
v422d124

$ result/bin/headscale help
2023-01-06T20:23:04-05:00 WRN Failed to read configuration from disk error="Config File \"config\" Not Found in \"[/etc/headscale ~/.headscale ~/headscale]\""
2023-01-06T20:23:04-05:00 FTL github.com/juanfont/headscale/cmd/headscale/cli/root.go:43 > Error loading config error="fatal error reading config file: Config File \"config\" Not Found in \"[/etc/headscale ~/.headscale ~/headscale]\""
```

Hmm... Okay, it needs to have a config file. In the middle of the README I found a link to [docs](https://github.com/juanfont/headscale/blob/main/docs/running-headscale-linux.md).

```
sudo mkdir -p /etc/headscale
sudo useradd \
    --create-home \
    --home-dir /var/lib/headscale/ \
    --system \
    --user-group \
    --shell /usr/bin/nologin \
    headscale
sudo touch /var/lib/headscale/db.sqlite
sudo chown headscale:headscale /var/lib/headscale/db.sqlite
sudo cp config-example.yaml /etc/headscale/config.yaml
sudo chown headscale:headscale /etc/headscale/config.yaml
```
