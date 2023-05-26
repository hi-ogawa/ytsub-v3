#!/bin/bash
set -eu -o pipefail

server_entry="./build/remix/${NODE_ENV:-development}/server/index.js"

# TODO: wait for "$server_entry" to be created
exec nodemon --enable-source-maps "$server_entry" --watch "$server_entry"
