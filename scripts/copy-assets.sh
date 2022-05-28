#!/bin/bash
set -eux -o pipefail

dest_dir="build/remix/${NODE_ENV:-"development"}/public"

rm -rf "$dest_dir/_copy"
mkdir -p "$dest_dir/_copy"
cp app/assets/{icon-192.png,icon-512.png,manifest.json} "$dest_dir/_copy"
cp -f app/assets/service-worker.js "$dest_dir"
