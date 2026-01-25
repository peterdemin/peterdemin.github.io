# My Radicle Journey

[Radicle](https://radicle.xyz) is an open source, peer-to-peer code collaboration stack built on Git.
Unlike centralized code hosting platforms, there is no single entity controlling the network.
Repositories are replicated across peers in a decentralized manner, and users are in full control of their data and workflow.

We will initialize Radicle on MacOS building it from source.

## Rust

Radicle is written in Rust, so first we need that.
The recommended approach is to manage Rust toolchain installation through rustup.
How do you get rustup? Of course, you can do `curl | bash`, but I manage most of software on my macbook through brew, so I'll use that.
Note, however, that you should never install Rust through brew directly, as this is a recipe for disaster.

```bash
brew install rustup
```

Nothing good comes easy, we gotta update `PATH` manually:

> Please note that Rust tools like rustc and cargo are not available via $PATH by default in this rustup distribution.
> You might want to add $(brew --prefix rustup)/bin to $PATH to make them easier to access.

Add this line to `~/.zshrc`:

```bash
export PATH="/opt/homebrew/opt/rustup/bin:$PATH"
```

Open a fresh terminal to load `~/.zshrc` and install stable toolchain:

```bash
rustup toolchain install stable
cargo --version
cargo 1.93.0 (083ac5135 2025-12-15)
```

## Heartwood

Let's get the source code for radicle.
We'll use one of the official seed servers.
Apparently, the repo name is `z3gqcJUoA1n9HaHKufZs5FCSGazv5`, but we'll call it [heartwood](https://app.radicle.xyz/nodes/seed.radicle.xyz/rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5) to make life easier (because it's Radicle.)

```bash
git clone https://seed.radicle.xyz/z3gqcJUoA1n9HaHKufZs5FCSGazv5.git heartwood
cd heartwood
cargo install --path crates/radicle-cli --force --locked --root ~/.radicle
cargo install --path crates/radicle-node --force --locked --root ~/.radicle
cargo install --path crates/radicle-remote-helper --force --locked --root ~/.radicle
```

It will happily download and install whole bunch of dependencies, including `cargo` itself, which is okay, I guess, but also super confusing.
Now guess, what:

> warning: be sure to add `$HOME/.radicle/bin` to your PATH to be able to run the installed binaries

Just a quick reminder, make sure you don't forget that nothing good comes easy.
Update `~/.zshrc`, open a fresh terminal.

## Set up first node

First, we gotta create an identity:

```bash
rad auth
```

Follow the interactive wizard to complete the setup.
I just pressed Return repeatedly to pick the default option.

I wonder if it's possible and/or wise to use the same key for radicle and ssh.
But I'll use separate ones for now.

You *might* think that you're all set and can clone your first repo, but let me remind you, nothing good comes easy.
First, we gotta start the node.
On a proper Linux, we'd be using SystemD Unit to run a daemon.
But we're on MacOS.
So, let's just YOLO it for now and figure the long-term solution later:

```bash
rad node start
```

The command launches a server in the background.
And now you *might* think you're ready to go.
Since we have `rad` setup, we no longer need that silly HTTPS git repo of heartwood.
Let's replace it with a decentralized copy:

```bash
cd ..
rm -rf heartwood
rad clone rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 heartwood
```

I don't know about you, maybe it's a bad luck, but for me the result of `rad clone` is:

```bash
✓ Seeding policy updated for rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 with scope 'all'
Fetching rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from the network, found 18 potential seed(s).
✗ 0 of 2 preferred seeds, and 0 of at least 1 total seeds… [fetch z6Mkmqo…4ebScxo@rosa.radicle.xyz:8776] <canceled>
✗ Error: fetch: timed out reading from control socket
```

Let's see what's going on with the node:


```
rad node status
✓ Node is running with Node ID z6Mkno75gzNU1Y59EL9rj8nUVveBUj3kBLteVUwPvpKmx9Qi and not configured to listen for inbound connections.

╭───────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Node ID                                            Address                        ?   ⤭   Since           │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ z6Mkgytt3PK7AUpgPjsmwFQ5KfLbUuz68nfwsfPHcgdXCneY   git.jappie.dev:8776            ✓   ↗   6.58 minute(s)  │
│ z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7   irisradi…c6s5lfid.onion:8776   ✗   ↗   2.37 minute(s)  │
│ z6Mkq3tQJ6eGxUbAs5tq9zLnfjBxsaba8fTkJZn6mF6uxyCg   demo.radicle.garden:7005       ✓   ↗   10.82 minute(s) │
│ z6MkwfrBy9mKTfcVELcV4wc6zfN379FPMnAqsxnwt4j2TdQ2   radicle.jarg.io:8776           ✓   ↗   8.35 minute(s)  │
│ z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo   rosa.radicle.xyz:8776          ✓   ↗   10.97 minute(s) │
│ z6Mkhchm3ofFVSfFb4qNvvedWidgunPSz8YukMB3EiGYRZMR   demo.radicle.garden:7015       ✓   ↗   10.82 minute(s) │
│ z6MkgoE3HwG1TX9YScP71eJKVDGYCbtEdAjwm5QkAgxkGXu5   radicle.aziis98.com:8776       ✓   ↗   10.75 minute(s) │
│ z6MkqxWYd3U9YN1sD3frLE93sKfjFPCzvUsJEh1UTKRRPf2A   demo.radicle.garden:7027       ✓   ↗   9.58 minute(s)  │
│ z6Mkeqfa5JWDhS7kqVJvc8avpEbBbGVHhWjpXj1EgE9uHMWp   seed.radicle.xeppaka.cz:8776   ✓   ↗   10.82 minute(s) │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✗ Hint:
   ? … Status:
       ✓ … connected    ✗ … disconnected
       ! … attempted    • … initial
   ⤭ … Link Direction:
       ↘ … inbound      ↗ … outbound

2026-01-23T21:43:24.330-08:00 INFO  wire     Peer z6Mkeqfa5JWDhS7kqVJvc8avpEbBbGVHhWjpXj1EgE9uHMWp fetched rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 from us successfully
2026-01-23T21:44:50.642-08:00 WARN  wire     Failed to establish connection to irisradizskwweumpydlj4oammoshkxxjur3ztcmo7cou5emc6s5lfid.onion:8776: no configuration found for .onion addresses
2026-01-23T21:44:50.644-08:00 INFO  service  Disconnected from z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7 (no configuration found for .onion addresses)
2026-01-23T21:44:54.817-08:00 INFO  service  Disconnected from z6Mkf3h4S5akszuqqbmckmsSekbUgJEe1nmBxuRJP53bJAqe (connection reset)
2026-01-23T21:44:55.883-08:00 INFO  service  Connected to z6Mkgytt3PK7AUpgPjsmwFQ5KfLbUuz68nfwsfPHcgdXCneY (git.jappie.dev:8776) (Outbound)
2026-01-23T21:49:08.664-08:00 WARN  wire     Failed to establish connection to irisradizskwweumpydlj4oammoshkxxjur3ztcmo7cou5emc6s5lfid.onion:8776: no configuration found for .onion addresses
2026-01-23T21:49:08.664-08:00 INFO  service  Disconnected from z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7 (no configuration found for .onion addresses)
2026-01-23T21:51:30.633-08:00 INFO  service  Received command ListenAddrs
2026-01-23T21:51:30.634-08:00 INFO  service  Received command QueryState(..)
2026-01-23T21:51:30.634-08:00 INFO  service  Received command QueryState(..)
```

Okay, seems healthy.
I guess, there was some initial setup done on the first run.
Let's try again:

```
$ rad clone rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5 heartwood
✓ Creating checkout in ./heartwood..
✓ Remote z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT added
✓ Remote-tracking branch z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT/master created for z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT
✓ Remote z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW added
✓ Remote-tracking branch z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW/master created for z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW
✓ Remote z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM added
✓ Remote-tracking branch z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM/master created for z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM
✓ Remote z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz added
✓ Remote-tracking branch z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz/master created for z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz
✓ Remote lorenz@z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz added
✓ Remote-tracking branch lorenz@z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz/master created for z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz
✓ Repository successfully cloned under /Users/peterdemin/heartwood/
╭────────────────────────────────────╮
│ heartwood                          │
│ Radicle Heartwood Protocol & Stack │
│ 133 issues · 15 patches            │
╰────────────────────────────────────╯
Run `cd ./heartwood` to go to the repository directory.
```

Nice, it even explained to me how to change directory.

If you're wondering what was that remote-tracking output, it actually configured all those remotes in the git repo, using `rad://` protocol.

```
heartwood $ git remote -v
lorenz@z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz (fetch)
lorenz@z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkkPvBfjP4bQmco5Dm7UGsX2ruDBieEHi8n9DVJWX5sTEz (push)
rad	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5 (fetch)
rad	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6Mkno75gzNU1Y59EL9rj8nUVveBUj3kBLteVUwPvpKmx9Qi (push)
z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz (fetch)
z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkgFq6z5fkF2hioLLSNu1zP2qEL1aHXHZzGH1FLFGAnBGz (push)
z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM (fetch)
z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MkireRatUThvd3qzfKht1S44wpm4FEWSSa4PRMTSQZ3voM (push)
z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT (fetch)
z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MksFqXN3Yhqk8pTJdUGLwATkRfQvwZXPqR2qMEhbS9wzpT (push)
z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW (fetch)
z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW	rad://z3gqcJUoA1n9HaHKufZs5FCSGazv5/z6MktaNvN1KVFMkSRAiN4qK5yvX1zuEEaseeX5sffhzPZRZW (push)
```

## Publish a repo

Let's add an existing repo to the radicle network.
I'll use this website's repo as an example.

```bash
$ rad init

Initializing radicle 👾 repository in /Users/peterdemin/peterdemin.github.io..

✓ Name peter.demin.dev
✓ Description Peter Demin
✓ Default branch master
✓ Visibility public
✓ Repository peter.demin.dev created.

Your Repository ID (RID) is rad:zb9rTT3zoR5aD1svmWYW25yc5kVe.
You can show it any time by running `rad .` from this directory.

✓ Repository successfully announced to the network.

Your repository has been announced to the network and is now discoverable by peers.
You can check for any nodes that have replicated your repository by running `rad sync status`.

To push changes, run `git push rad master`.
```

While it was running, it showed a countdown of announcements, and if I'm not mistaken, the repo was announced to four peers.
Let's see if they are gonna show up in remotes:

```
$ git remote -v
origin	git@github.com:peterdemin/peterdemin.github.io.git (fetch)
origin	git@github.com:peterdemin/peterdemin.github.io.git (push)
rad	rad://zb9rTT3zoR5aD1svmWYW25yc5kVe (fetch)
rad	rad://zb9rTT3zoR5aD1svmWYW25yc5kVe/z6Mkno75gzNU1Y59EL9rj8nUVveBUj3kBLteVUwPvpKmx9Qi (push)
```

Hmm... Nope, there's just one. And it's `<this repo ID>/<this node ID>`.
Looks like my only upstream is myself.
But you know what, there's this magic sync command, let's try that.

```bash
$ rad sync --inventory
✓ Announcing inventory to 8 peers..
```

I'm sure pretty good at announcing inventory. Who knew, I'm a natural.
Fine, let's try the other one:

```bash
$ rad sync status
✗ Hint:
   ? … Status:
       ✓ … in sync          ✗ … out of sync
       ! … not announced    • … unknown
```

Huh, I could've sworn, I saw something about replication and announcements.
How about we push things a little:

```bash
$ git push rad master
Everything up-to-date
```

Wow, immediately returning up-to-date response.
Maybe, because it's pushing to itself?..

## Set up another node

At this point, the peer node of radicle network is up and running, announcing it's presence, and serving a repo.

Let's see how we can use this network to get the repo from another node.

I repeated the setup on a Debian Trixie VM using Vagrant:

`Vagrantfile`:
```
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
    config.vm.box = "debian/trixie64"
    config.vm.network "private_network", ip: "192.168.56.57"
    config.vm.synced_folder "./", "/vagrant", type: "virtiofs"
    config.vm.provider :libvirt do |libvirt|
      libvirt.memory = "4096"
      libvirt.driver = "kvm"
      libvirt.uri = 'qemu:///system'
      libvirt.cpus = 4
      libvirt.numa_nodes = [{ :cpus => "0-3", :memory => 8192, :memAccess => "shared" }]
      libvirt.memorybacking :access, :mode => "shared"
    end
    config.vm.provision "shell", path: "build-radicle.sh"
end
```

Provisining script in `build-radicle.sh`:
```bash
#!/bin/bash

set -eo pipefail

sudo apt-get update
sudo apt-get install -y rustup build-essential git
rustup toolchain install stable
git clone https://seed.radicle.xyz/z3gqcJUoA1n9HaHKufZs5FCSGazv5.git heartwood
cd heartwood
cargo install --path crates/radicle-cli --force --locked --root ~/.radicle
cargo install --path crates/radicle-node --force --locked --root ~/.radicle
cargo install --path crates/radicle-remote-helper --force --locked --root ~/.radicle
sudo cp ~/.radicle/bin/* /usr/bin/
```

Create a node identifier:
```
$ rad auth

Initializing your radicle 👾 identity

✓ Enter your alias: demin.dev
✓ Enter a passphrase: ********
✓ Creating your Ed25519 keypair...
✓ Your Radicle DID is did:key:z6MkpA56z2R7powZHMdCJ6PsecwMgTnmVCXtn3h1LiPBtrMd. This identifies your device. Run `rad self` to show it at all times.
✓ You're all set.

To create a Radicle repository, run `rad init` from a Git repository with at least one commit.
To clone a repository, run `rad clone <rid>`. For example, `rad clone rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5` clones the Radicle 'heartwood' repository.
To get a list of all commands, run `rad`.

$ rad node start
✓ Node started (105073)
To stay in sync with the network, leave the node running in the background.
To learn more, run `rad node --help`.

$ rad clone rad:zb9rTT3zoR5aD1svmWYW25yc5kVe
✓ Seeding policy updated for rad:zb9rTT3zoR5aD1svmWYW25yc5kVe with scope 'all'
Fetching rad:zb9rTT3zoR5aD1svmWYW25yc5kVe from the network, found 2 potential seed(s).
✗ Target not met: could not fetch from [z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo, z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7], and required 1 more seed(s)
! Warning: Failed to fetch from 2 seed(s).
! Warning: z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo: an I/O error occurred during the fetch handshake (error reading from stream: channel timed out)
! Warning: z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7: Could not connect. No addresses known.
✗ Error: no seeds found for rad:zb9rTT3zoR5aD1svmWYW25yc5kVe
```

Whoops! Looks like my first peer node is not as peer as the two servers owned by Radicle team...

```
$ rad node status
✓ Node is running with Node ID z6MkpA56z2R7powZHMdCJ6PsecwMgTnmVCXtn3h1LiPBtrMd and not configured to listen for inbound connections.

╭──────────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ Node ID                                            Address                          ?   ⤭   Since            │
├──────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ z6Mkr5ad8ZN5tyJygyp7wgujJLSykAvXznQyUtV3kh8CsTyd   radicle.qmooku.com:8776          ✓   ↗   32.933 second(s) │
│ z6MkwfrBy9mKTfcVELcV4wc6zfN379FPMnAqsxnwt4j2TdQ2   radicle.jarg.io:8776             ✓   ↗   28.933 second(s) │
│ z6MkmWBnyEnoQSWEuvukXPPzPtQNPoBZ66c4aRVz2d39Escp   rad.daidalos.xyz:8776            ✓   ↗   29.933 second(s) │
│ z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo   rosa.radicle.xyz:8776            ✓   ↗   40.933 second(s) │
│ z6MkrNbURE9T9GQ3CpAYHGyXfEvSqMe6SczFDwHddt1jcabR   rad.glyphs.tech:7114             !   ↗                    │
│ z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7   irisradi…c6s5lfid.onion:8776     ✗   ↗   6.933 second(s)  │
│ z6MkidNH5DAvU3woJsXdFwfSTVT32iYQCAYep8emjCqVJyz5   radicle-seed.29051830.xyz:8776   ✓   ↗   32.933 second(s) │
│ z6MkmNgM276APif8WG2sp9bS82rJwg9JCpdk3xv53kTc9KYj   radicle.schuppentier.org:8776    !   ↗                    │
│ z6Mkh3MbEZxUvVrCDJ2rJ23V33ptNgJTjm3ChumQSewJb454   pool.net.eu.org:8776             ✓   ↗   27.933 second(s) │
╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
✗ Hint:
   ? … Status:
       ✓ … connected    ✗ … disconnected
       ! … attempted    • … initial
   ⤭ … Link Direction:
       ↘ … inbound      ↗ … outbound

2026-01-24T22:12:08.105Z INFO  service  Received command Seeds(rad:zb9rTT3zoR5aD1svmWYW25yc5kVe)
2026-01-24T22:12:08.107Z INFO  service  Received command QueryState(..)
2026-01-24T22:12:08.107Z INFO  service  Received command Fetch(rad:zb9rTT3zoR5aD1svmWYW25yc5kVe, z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo)
2026-01-24T22:12:15.169Z WARN  wire     Failed to establish connection to irisradizskwweumpydlj4oammoshkxxjur3ztcmo7cou5emc6s5lfid.onion:8776: no configuration found for .onion addresses
2026-01-24T22:12:15.169Z INFO  service  Disconnected from z6MkrLMMsiPWUcNPHcRajuMi9mDfYckSoJyPwwnknocNYPm7 (no configuration found for .onion addresses)
2026-01-24T22:12:17.111Z WARN  service  Fetch failed for rad:zb9rTT3zoR5aD1svmWYW25yc5kVe from z6Mkmqogy2qEM2ummccUthFEaaHvyYmYBYh3dbe9W4ebScxo: an I/O error occurred during the fetch handshake (error reading from stream: channel timed out)
2026-01-24T22:12:17.112Z INFO  service  Received command QueryState(..)
2026-01-24T22:12:21.888Z INFO  service  Received command ListenAddrs
2026-01-24T22:12:21.888Z INFO  service  Received command QueryState(..)
2026-01-24T22:12:21.889Z INFO  service  Received command QueryState(..)
```

I'm not an expert, but by matching the hashes to hosts, I see that `rad clone` command attempted to clone my repo from `rosa.radicle.xyz:8776` and `iris.radicle.xyz` node served through `.onion` address.
The error print `channel timed out`, while it should have been more like `repo not found`.

Decentralize my ass.

Rad has an option to force cloning from a particular node:

```bash
$ rad seed rad:zb9rTT3zoR5aD1svmWYW25yc5kVe --from z6Mkno75gzNU1Y59EL9rj8nUVveBUj3kBLteVUwPvpKmx9Qi
✓ Seeding policy exists for rad:zb9rTT3zoR5aD1svmWYW25yc5kVe with scope 'all'
Fetching rad:zb9rTT3zoR5aD1svmWYW25yc5kVe from the network, found 1 potential seed(s).
✗ Target not met: could not fetch from [z6Mkno75gzNU1Y59EL9rj8nUVveBUj3kBLteVUwPvpKmx9Qi], and required 1 more seed(s)
```

No dice, I can't fetch from my laptop.

## Parting thoughts

I poked around for a few hours trying to figure out how to synchronize code between my two radicle nodes, and ultimately failed.
I tried to get a better understanding of the system by reading the [user guide](https://radicle.xyz/guides/user), but the page has too much unrelated information and not enough answers.

I feel like giving up on radicle.

Nothing good comes easy, but sometimes nothing comes at all.
Ah, well, at least I poked cargo a bit, that was fun.

Going through the troubles of setting up decentralized forge made we question the premise.
What is missing from the existing `tailscale+git+ssh` combination to make decentralized collaboration possible.

Create a decentralized replica of a repo:

```bash
ssh server.tail1234.ts.net 'git init --bare repo'
git remote add server server.tail1234.ts.net:repo
git push server master
```

The identity, authentication, and authorization already covered by `ssh`.
Access provided by `tailscale`.
Content synchronization done by `git`.
What else do you want? Collaboration through issues and patches?
Don't put those in git, they don't belong in version control system.
Run a mailing list, a forum, an XMPP chat room, or a Zulip instance.
Run Gerrit, or one of many alternatives for code reviews.
Or maybe consider [Fossil](https://www2.fossil-scm.org/home/doc/trunk/www/index.wiki).

To add another maintainer, share your server through Tailscale, and add their public key to authorized keys.

There's many ways to shave a cat and it doesn't matter which one you pick.
Sometimes, it's best to use GitHub, and maybe that's why most big projects do.
Sure, GitHub is proprietary, centralized, governed by an organization with values that might not align with yours.
But does it really matter?
