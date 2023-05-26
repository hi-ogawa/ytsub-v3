#!/bin/bash
set -eu -o pipefail

# usage
#   bash scripts/wait-for.sh test -f build/test/server/index.js

for ((i=0; ;i++)); do
  echo "[wait-for:$i] ${*}"
  sleep "$i"
  if "${@}"; then
    echo "[wait-for:$i:success] ${*}"
    break;
  fi
done
