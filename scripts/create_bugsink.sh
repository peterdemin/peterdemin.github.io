#!/usr/bin/env bash

set -eo pipefail

PROJECT=demindev
ACCOUNT=119300227062
USERNAME=peterdemin
PUBKEY=$(ssh-keygen -yf ~/.ssh/id_rsa)
INSTANCE=bugsink
DOMAIN=bugsink.demin.dev

gcloud compute instances create $INSTANCE \
    --project=$PROJECT \
    --zone=us-west1-c \
    --machine-type=e2-micro \
    --network-interface=network-tier=STANDARD,stack-type=IPV4_ONLY,subnet=default \
    --tags=http-server,https-server \
    --public-ptr \
    --public-ptr-domain="${DOMAIN}." \
    --metadata="ssh-keys=${USERNAME}:${PUBKEY}" \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --service-account="${ACCOUNT}-compute@developer.gserviceaccount.com" \
    --create-disk=auto-delete=yes,boot=yes,device-name=$INSTANCE,image=projects/debian-cloud/global/images/debian-13-trixie-v20251014,mode=rw,size=10,type=pd-standard \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=goog-ec-src=vm_add-gcloud \
    --reservation-affinity=any

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

echo "Update DNS to point bugsink subdomain to the EXTERNAL IP address"

ssh-keygen -R $DOMAIN || true
until ssh $DOMAIN 'echo up'; do sleep 1; done

scp -rC scripts/provision_bugsink.sh "${DOMAIN}:"
ssh -t $DOMAIN -- "chmod +x provision_bugsink.sh && sudo ./provision_bugsink.sh"
