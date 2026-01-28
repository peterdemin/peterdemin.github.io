# FedUp - Minimal Federated CDN

## High-level

FedUp is a federated CDN that operates within clusters of peers.
Each peer serves content for every peer in the cluster.
Cluster membership is defined by peers of the cluster.

User pushes their content to peer node they own, which we'll call *hub*.
*Hub* distributes the content to all other peers, that we'll call *spokes*.

## Less-high level

1. Users install `fedup` binary on their machine.
2. Configure `fedup` with cluster ID, machine's IP address, and domain name.
3. Cluster ID can be existing or a new one.
4. `fedup` joins the cluster.
5. Each machine in the cluster serves content from all other machines in the cluster.
6. Content distribution is done through direct `git+ssh` connections.
7. Each user has a private key that allows them to push changes to their own machine (hub).
8. The hub distributes the changes to all other machines (spokes).
9. Cluster membership is decided through a quorum of users of the cluster.
10. Users point their DNS record to their hub and all the spokes of the cluster.
11. `fedup` configures each machine's nginx to serve content for every domain from respective directory.

## Low level

### Node initialization

`fedup` initialization has following steps:

1. Create hub user account and generate a hub's private key.
2. Initialize a bare git repo and configure post-receive hook that calls back to `fedup distribute`.
3. Add owner's public key to authorized keys for this user.

### Cluster membership

Cluster ID is defined as a concatenation of peer domains using "`:`" as a separator,
for example: `alice.com:bob.me:peter.demin.dev`.
The order of peers doesn't matter, neither is completeness of the list.
But at least one of the peers must be reachable.
Each domain points to public IP addresses of all peers in the cluster.

To join a cluster, a new node announce (through magic) its credentials to all peers.
Announcement includes:

1. Domain.
2. Public IP address.
3. Public Key.

Each peer accepts the new node (through magic).

Accepting a peer means:

1. Create a new user account.
2. Initialize a bare git repo, and configure a post-receive hook that updates the HTML contents through `fedup deploy`.
3. Add peer's public key to the authorized keys for this user account.

Once accepted, hub can push content to this spoke for replication.
Domain's owner can add a new spoke to his DNS records.

### HTTPS certificates

Hub issues the certificates using DNS-01 challenge, and copies them to spokes.
If using Let's Encrypt this is either manual, or requires a Domain provider with API access.

Or we figure out how to perform HTTP-01 with a short pause to distribute `.well-known/acme-challenge`.

Copying certificates to spokes poses some security risk, but not more than trusting spokes to serve hub's content.

## Wiggle room

I used specific products such as nginx, git, and Let's Encrypt as examples, each part can be replaced.

It doesn't matter if content is served through Caddy, and files copied through `rsync`.

The essence of this setup is that cluster users trust each other to run their peer node faithfully.
If the trust is broken, a bad node can be unfederated by deleting a directory and removing IP address from hub's DNS records.
If a node is compromised, the blast radius is three-fold:
1. The websites served through the IP address of the compromised node contain malicious content.
2. All nodes that replicate content from compromised node, serve malicious content of the compromised website's domain.
3. SSL certificate is compromised.
