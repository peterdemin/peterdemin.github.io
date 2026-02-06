#!/usr/bin/env bash
set -euo pipefail

# Reentrant launcher:
# - Reuses existing network resources (VCN/IGW/RouteTable/Subnet/NSG) by display-name.
# - If an instance with NAME_PREFIX exists, it deletes it (optionally with its boot volume),
#   then launches a fresh one attached to the same subnet + NSG.
#
# NOTE: If your OCI CLI has the “empty output” bug for empty lists, this script still works
#       because it deals with non-empty resources after first creation.

# ============================================================
# REQUIRED: export this before running
# ============================================================
if [[ -z "${COMPARTMENT_OCID:-}" ]]; then
  echo "ERROR: COMPARTMENT_OCID is not set."
  echo "Export it first, for example:"
  echo "  export COMPARTMENT_OCID=ocid1.tenancy.oc1..aaaa..."
  exit 1
fi

# ============================================================
# SETTINGS
# ============================================================
NAME_PREFIX="demin-dev"

# Max Always Free Ampere
OCPUS=4
MEM_GB=24

# Keep boot volume modest; Always Free pool is limited
BOOT_GB=50

# Network CIDRs (used only on first creation)
VCN_CIDR="10.0.0.0/16"
SUBNET_CIDR="10.0.1.0/24"

# Optional: lock SSH down
#   export SSH_SOURCE_CIDR="203.0.113.10/32"
SSH_SOURCE_CIDR="${SSH_SOURCE_CIDR:-0.0.0.0/0}"

# Use a normal public key line (ssh-ed25519... or ssh-rsa...)
PUBKEY_LINE="$(cat ~/.ssh/id_rsa.pub)"

# Oracle Linux default SSH user is typically "opc"
SSH_USER="opc"

# If true, terminate will delete the boot volume. If false, boot volume is preserved.
DELETE_BOOT_VOL="${DELETE_BOOT_VOL:-true}"

# Resource names (stable identifiers for reentrancy)
VCN_NAME="${NAME_PREFIX}-vcn"
IGW_NAME="${NAME_PREFIX}-igw"
RT_NAME="${NAME_PREFIX}-rt-public"
SUBNET_NAME="${NAME_PREFIX}-subnet-public"
NSG_NAME="${NAME_PREFIX}-nsg"
INSTANCE_NAME="${NAME_PREFIX}"

# ============================================================
# HELPERS
# ============================================================
raw_query() {
  # Usage: raw_query "<oci command ...>" "<jmespath>"
  # Example: raw_query "oci network vcn list --compartment-id ... " "data[0].id"
  local cmd="$1"
  local q="$2"
  # shellcheck disable=SC2086
  eval $cmd --query "$q" --raw-output 2>/dev/null || true
}

ensure_nsg_rule_tcp() {
  local nsg_id="$1"
  local port="$2"
  local source="$3"

  # Check existing rules (ingress TCP with this port + source)
  local exists
  exists="$(oci network nsg security-rule list \
    --nsg-id "$nsg_id" \
    --all \
    --query "length(data[?direction=='INGRESS' && protocol=='6' && source=='${source}' && tcp-options.destination-port-range.min==\`${port}\` && tcp-options.destination-port-range.max==\`${port}\`])" \
    --raw-output 2>/dev/null || true)"

  if [[ "${exists}" == "0" || -z "${exists}" || "${exists}" == "null" ]]; then
    oci network nsg security-rule add \
      --nsg-id "$nsg_id" \
      --direction INGRESS \
      --protocol TCP \
      --source "$source" \
      --tcp-options "{\"destinationPortRange\":{\"min\":${port},\"max\":${port}}}" \
      >/dev/null
  fi
}

# ============================================================
# PICK AVAILABILITY DOMAIN
# ============================================================
AD="$(oci iam availability-domain list \
  --compartment-id "$COMPARTMENT_OCID" \
  --query 'data[0].name' \
  --raw-output)"

# ============================================================
# ORACLE LINUX 10 AARCH64 IMAGE
# ============================================================
IMAGE_OCID="$(oci compute image list \
  --compartment-id "$COMPARTMENT_OCID" \
  --operating-system "Oracle Linux" \
  --operating-system-version "10" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query 'data[?contains("display-name", `aarch64`)] | [0].id' \
  --raw-output)"

if [[ -z "$IMAGE_OCID" || "$IMAGE_OCID" == "null" ]]; then
  echo "ERROR: No aarch64 Oracle Linux 10 image found."
  exit 1
fi

# ============================================================
# FIND OR CREATE VCN
# ============================================================
VCN_ID="$(oci network vcn list \
  --compartment-id "$COMPARTMENT_OCID" \
  --all \
  --query "data[?\"display-name\"=='${VCN_NAME}'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -z "$VCN_ID" || "$VCN_ID" == "null" ]]; then
  VCN_ID="$(oci network vcn create \
    --compartment-id "$COMPARTMENT_OCID" \
    --display-name "$VCN_NAME" \
    --cidr-block "$VCN_CIDR" \
    --dns-label "demindev" \
    --query 'data.id' \
    --raw-output)"
  echo "Created VCN: $VCN_ID"
else
  echo "Reusing VCN: $VCN_ID"
fi

# ============================================================
# FIND OR CREATE INTERNET GATEWAY
# ============================================================
IGW_ID="$(oci network internet-gateway list \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_ID" \
  --all \
  --query "data[?\"display-name\"=='${IGW_NAME}'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -z "$IGW_ID" || "$IGW_ID" == "null" ]]; then
  IGW_ID="$(oci network internet-gateway create \
    --compartment-id "$COMPARTMENT_OCID" \
    --vcn-id "$VCN_ID" \
    --is-enabled true \
    --display-name "$IGW_NAME" \
    --query 'data.id' \
    --raw-output)"
  echo "Created IGW: $IGW_ID"
else
  echo "Reusing IGW: $IGW_ID"
fi

# ============================================================
# FIND OR CREATE ROUTE TABLE (ensure default route)
# ============================================================
RT_ID="$(oci network route-table list \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_ID" \
  --all \
  --query "data[?\"display-name\"=='${RT_NAME}'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -z "$RT_ID" || "$RT_ID" == "null" ]]; then
  RT_ID="$(oci network route-table create \
    --compartment-id "$COMPARTMENT_OCID" \
    --vcn-id "$VCN_ID" \
    --display-name "$RT_NAME" \
    --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW_ID\"}]" \
    --query 'data.id' \
    --raw-output)"
  echo "Created Route Table: $RT_ID"
else
  echo "Reusing Route Table: $RT_ID"
  # Make sure it has 0.0.0.0/0 -> IGW
  has_default="$(oci network route-table get \
    --rt-id "$RT_ID" \
    --query "length(data.\"route-rules\"[?destination=='0.0.0.0/0' && destination-type=='CIDR_BLOCK' && network-entity-id=='${IGW_ID}'])" \
    --raw-output 2>/dev/null || true)"
  if [[ "$has_default" == "0" || -z "$has_default" || "$has_default" == "null" ]]; then
    oci network route-table update \
      --force \
      --rt-id "$RT_ID" \
      --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW_ID\"}]" \
      >/dev/null
    echo "Updated Route Table default route."
  fi
fi

# ============================================================
# FIND OR CREATE PUBLIC SUBNET
# ============================================================
SUBNET_ID="$(oci network subnet list \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_ID" \
  --all \
  --query "data[?\"display-name\"=='${SUBNET_NAME}'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -z "$SUBNET_ID" || "$SUBNET_ID" == "null" ]]; then
  SUBNET_ID="$(oci network subnet create \
    --compartment-id "$COMPARTMENT_OCID" \
    --vcn-id "$VCN_ID" \
    --display-name "$SUBNET_NAME" \
    --cidr-block "$SUBNET_CIDR" \
    --dns-label "public1" \
    --route-table-id "$RT_ID" \
    --prohibit-public-ip-on-vnic false \
    --query 'data.id' \
    --raw-output)"
  echo "Created Subnet: $SUBNET_ID"
else
  echo "Reusing Subnet: $SUBNET_ID"
fi

# ============================================================
# FIND OR CREATE NSG
# ============================================================
NSG_ID="$(oci network nsg list \
  --compartment-id "$COMPARTMENT_OCID" \
  --vcn-id "$VCN_ID" \
  --all \
  --query "data[?\"display-name\"=='${NSG_NAME}'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -z "$NSG_ID" || "$NSG_ID" == "null" ]]; then
  NSG_ID="$(oci network nsg create \
    --compartment-id "$COMPARTMENT_OCID" \
    --vcn-id "$VCN_ID" \
    --display-name "$NSG_NAME" \
    --query 'data.id' \
    --raw-output)"
  echo "Created NSG: $NSG_ID"
else
  echo "Reusing NSG: $NSG_ID"
fi

# Ensure required NSG ingress rules exist (idempotent)
ensure_nsg_rule_tcp "$NSG_ID" 22  "$SSH_SOURCE_CIDR"
ensure_nsg_rule_tcp "$NSG_ID" 80  "0.0.0.0/0"
ensure_nsg_rule_tcp "$NSG_ID" 443 "0.0.0.0/0"

# ============================================================
# DELETE EXISTING INSTANCE (IF ANY), THEN RECREATE
# ============================================================
EXISTING_INSTANCE_ID="$(oci compute instance list \
  --compartment-id "$COMPARTMENT_OCID" \
  --all \
  --query "data[?\"display-name\"=='${INSTANCE_NAME}' && \"lifecycle-state\"!='TERMINATED'].id | [0]" \
  --raw-output 2>/dev/null || true)"

if [[ -n "${EXISTING_INSTANCE_ID}" && "${EXISTING_INSTANCE_ID}" != "null" ]]; then
  echo "Found existing instance: $EXISTING_INSTANCE_ID"
  echo "Terminating it (preserve boot volume: $([[ "$DELETE_BOOT_VOL" == "true" ]] && echo "no" || echo "yes")) ..."

  # --preserve-boot-volume takes boolean; preserve=true means DO NOT delete.
  if [[ "$DELETE_BOOT_VOL" == "true" ]]; then
    oci compute instance terminate \
      --instance-id "$EXISTING_INSTANCE_ID" \
      --preserve-boot-volume false \
      --wait-for-state TERMINATED \
      >/dev/null
  else
    oci compute instance terminate \
      --instance-id "$EXISTING_INSTANCE_ID" \
      --preserve-boot-volume true \
      --wait-for-state TERMINATED \
      >/dev/null
  fi
fi

# ============================================================
# LAUNCH NEW AMPERE A1 FLEX INSTANCE (MAX ALWAYS FREE)
# ============================================================
LAUNCH_JSON="$(oci compute instance launch \
  --availability-domain "$AD" \
  --compartment-id "$COMPARTMENT_OCID" \
  --display-name "$INSTANCE_NAME" \
  --shape "VM.Standard.A1.Flex" \
  --shape-config "{\"ocpus\":${OCPUS},\"memoryInGBs\":${MEM_GB}}" \
  --subnet-id "$SUBNET_ID" \
  --nsg-ids "[\"$NSG_ID\"]" \
  --assign-public-ip true \
  --image-id "$IMAGE_OCID" \
  --boot-volume-size-in-gbs "$BOOT_GB" \
  --metadata "{\"ssh_authorized_keys\":\"${PUBKEY_LINE}\"}" \
  --wait-for-state RUNNING)"

INSTANCE_ID="$(printf '%s' "$LAUNCH_JSON" | oci --output json --raw-output --query 'data.id')"

# ============================================================
# FETCH PUBLIC IP
# ============================================================
VNIC_ID="$(oci compute vnic-attachment list \
  --compartment-id "$COMPARTMENT_OCID" \
  --instance-id "$INSTANCE_ID" \
  --query 'data[0]."vnic-id"' \
  --raw-output)"

PUBLIC_IP="$(oci network vnic get \
  --vnic-id "$VNIC_ID" \
  --query 'data."public-ip"' \
  --raw-output)"

echo
echo "Instance ID : $INSTANCE_ID"
echo "Public IP   : $PUBLIC_IP"
echo "SSH         : ssh ${SSH_USER}@${PUBLIC_IP}"
echo
