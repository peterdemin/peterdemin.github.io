#!/usr/bin/env bash

set -eo pipefail

PROJECT=demindev
ACCOUNT=119300227062
USERNAME=peter
PUBKEY=$(ssh-keygen -yf ~/.ssh/id_rsa)
INSTANCE=test-demin-dev
DOMAIN=test.demin.dev

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

echo "Update DNS to point jabber, conference.jabber, and pubsub.jabber subdomains to this IP address"
echo "Then run cert/deploy.sh <IP-address>"
echo "Attempting to set up firewall rules, it's okay to fail if they already exist"

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
