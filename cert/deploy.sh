#!/bin/bash

set -exo pipefail

IP=$1

scp cert/provision.sh etc/nginx/sites-available/default "${IP}:"
ssh "${IP}" -- "chmod +x provision.sh && sudo ./provision.sh"
