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
#     static/                = (remix-outdir)/public
#     functions/
#       index.func/
#         .vc-config.json
#         index.js           = (remix-outdir)/server/index.js
#

# cleanup
rm -rf build/remix/production
rm -rf build/css
rm -rf .vercel/output
mkdir -p .vercel/output/functions/index.func

# css
pnpm build:css

# remix build with custom server entry
NODE_ENV=production BUILD_VERCEL=1 npx remix build

# config.json
cp misc/vercel/config.json .vercel/output/config.json

# static
cp -r ./build/remix/production/public .vercel/output/static

# serverless
cp build/remix/production/server/index.js .vercel/output/functions/index.func
cp misc/vercel/.vc-config.json .vercel/output/functions/index.func/.vc-config.json

# output server size
ls -lh .vercel/output/functions/index.func
