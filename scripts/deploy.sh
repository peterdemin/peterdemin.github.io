#!/bin/bash

set -eo pipefail

IP=$1
NAME=peter
DOMAIN=demin.dev

scp -rC scripts/provision.sh etc "${IP}:"
ssh "${IP}" -- "chmod +x provision.sh && sudo ./provision.sh"

read -rsp "Enter password for jabber account $NAME: " PASSWORD
ssh "${IP}" -- "sudo -u ejabberd ejabberdctl register $NAME $DOMAIN $PASSWORD"
