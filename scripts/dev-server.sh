#!/bin/bash
set -eu -o pipefail

server_entry="./build/remix/${NODE_ENV:-development}/server/index.js"

bash scripts/wait-for.sh test -f "$server_entry"

entry_dev_cmd=(node -r esbuild-register ./app/server/entry-dev.ts "$server_entry")

if [ -n "${E2E_COVERAGE_SERVER:-}" ]; then
  exec npx c8 -o coverage/e2e-server -r text -r html --exclude build --exclude-after-remap "${entry_dev_cmd[@]}"
else
  exec "${entry_dev_cmd[@]}"
fi
