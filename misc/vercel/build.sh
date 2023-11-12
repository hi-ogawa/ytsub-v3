#!/bin/bash
set -eu -o pipefail

#
# generate files for `vercel deploy --prebuilt` (aka build output api V3)
#   https://vercel.com/docs/build-output-api/v3#vercel-primitives/static-files
#   https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions
#
# .vercel/
#   project.json
#   output/
#     config.json
#     static/                = (remix-outdir)/public + (project)/public
#     functions/
#       index.func/
#         .vc-config.json
#         index.js           = (remix-outdir)/server/index.js
#

this_dir="$(dirname "${BASH_SOURCE[0]}")"

# cleanup
rm -rf .vercel/output
mkdir -p .vercel/output

mkdir -p .vercel/output/functions/index.func

# serverless
mkdir -p .vercel/output/functions/index.func
cp "$this_dir/.vc-config.json" .vercel/output/functions/index.func/.vc-config.json
npx esbuild dist/server/index.js \
  --outfile=.vercel/output/functions/index.func/index.js \
  --metafile=dist/server/esbuild-metafile.json \
  --bundle --format=cjs --platform=node \
  --external:node:async_hooks

# config.json
cp "$this_dir/config.json" .vercel/output/config.json

# static
mkdir -p .vercel/output/static
cp -r dist/client/assets .vercel/output/static/assets

# output server size
echo "* Serverless files"
ls -lhA .vercel/output/functions/index.func
