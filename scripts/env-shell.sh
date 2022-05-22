#!/bin/bash
set -eu -o pipefail

# usage:
#   eval $(bash scripts/env-shell.sh < .env.staging)

while read -r line; do
  if [ "${line:0:1}" != "#" ] && [ -n "$line" ]; then
    echo "export $line"
  fi
done < /dev/stdin
