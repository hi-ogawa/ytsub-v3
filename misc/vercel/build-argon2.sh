#!/bin/bash
set -eu -o pipefail

outfile="$1"
printf "" > "$outfile"

argon2_version=$(jq -r .version node_modules/argon2/package.json)
docker-compose run --rm -v "$outfile:/output.bin" node bash -c "npm i -g 'argon2@$argon2_version' && cp /usr/local/lib/node_modules/argon2/lib/binding/napi-v3/argon2.node /output.bin"

file "$outfile" | grep ELF
