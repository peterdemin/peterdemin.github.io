#!/bin/bash

set -eo pipefail

brew install oci-cli
mkdir -p ~/.oci
cd ~/.oci

openssl genrsa -out oci_api_key.pem 2048
chmod 600 oci_api_key.pem

openssl rsa -pubout -in oci_api_key.pem -out oci_api_key_public.pem
