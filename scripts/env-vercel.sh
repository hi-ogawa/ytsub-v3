#!/bin/bash
set -eu -o pipefail

# usage:
#   bash scripts/env-vercel.sh preview < .env.staging
#   grep APP_RECAPTCHA_CLIENT_KEY .env.staging | bash scripts/env-vercel.sh preview

# e.g. production, preview
environment="$1"

while read -r line; do
  if [ "${line:0:1}" != "#" ] && [ -n "$line" ]; then
    name="${line%%=*}"
    value="${line#*=}"
    if [ -z "$name" ] || [ -z "$value" ]; then
      echo "invalid line"
      echo "$line"
      exit 1
    fi
    echo ":: $line"
    echo 'y' | vercel env rm "$name" "$environment" || true
    echo -n "$value" | vercel env add "$name" "$environment"
  fi
done < /dev/stdin
