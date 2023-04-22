#!/bin/bash
set -eux -o pipefail

# TODO: not working

rm -rf coverage/all
mkdir -p coverage/all/tmp

find coverage -type f \
  -path '*/unit/tmp/*.json' -o \
  -path '*/e2e-server/tmp/*.json' -o \
  -path '*/e2e-server/tmp/*.json' \
  -exec cp -t coverage/all/tmp {} +

shopt -u nullglob
for test_type in unit e2e-server e2e-client; do
  for filename in coverage/"$test_type"/tmp/*.json; do
    cp "$filename" "coverage/all/tmp/$test_type--$(basename "$filename")"
  done
done

npx c8 report -o coverage/all -r text -r html --all --src app --exclude build --exclude-after-remap --temp-directory coverage/all/tmp
