#!/bin/bash
set -euo pipefail

scp scripts/provision_builder.sh msi:builder/ && ssh msi 'cd builder && vagrant provision'
