#!/bin/bash
set -eu -o pipefail

server_entry="./build/remix/${NODE_ENV:-development}/server/index.js"

bash scripts/wait-for.sh test -f "$server_entry"

exec nodemon --enable-source-maps "$server_entry" --watch "$server_entry"
