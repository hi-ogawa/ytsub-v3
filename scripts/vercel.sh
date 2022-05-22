#!/bin/bash
set -eux -o pipefail

# cleanup
rm -rf build/remix/production
rm -rf build/tailwind/production

# tailwind
NODE_ENV=production npm run tailwind

# copy assets not managed by remix
NODE_ENV=production bash scripts/copy-assets.sh

# default "node-cjs" build with custom server main
NODE_ENV=production BUILD_VERCEL=1 npx remix build

# run esbuild again manually to bundle server app
# - skip `mysql` which appears in https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/dialects/mysql/index.js#L23
npx esbuild build/remix/production/server/index.js --outfile=build/remix/production/vercel/server/index.js \
  --bundle --platform=node \
  --define:process.env.APP_DEFINE_STAGING="'${APP_DEFINE_STAGING:-}'" \
  --external:mysql

# setup vercel-cli-deploy-able files
cp -rf vercel.json .vercel build/remix/production/public build/remix/production/vercel
