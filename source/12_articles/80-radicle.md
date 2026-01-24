# Set up Radicle on MacOS

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

## rad

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
