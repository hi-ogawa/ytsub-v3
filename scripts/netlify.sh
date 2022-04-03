#!/bin/bash
set -eoux pipefail

# cleanup
rm -rf build/remix/production
rm -rf build/tailwind/production

# tailwind
NODE_ENV=production npm run tailwind

# copy assets not managed by remix
NODE_ENV=production bash scripts/copy-assets.sh

# default "node-cjs" build with custom server main
NODE_ENV=production BUILD_NETLIFY=1 npx remix build

# build "storybook" static app
npx vite build --outDir build/remix/production/public/ui-dev --base /ui-dev/

# run esbuild again manually to bundle server app
# - skip `mysql` which appears in https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/dialects/mysql/index.js#L23
npx esbuild build/remix/production/server/index.js --outfile=build/remix/production/server-bundle/index.js \
  --bundle --platform=node \
  --external:mysql

# zip it as a prebuilt netlify function
mkdir -p build/remix/production/server-bundle-zip
zip -j build/remix/production/server-bundle-zip/index.zip build/remix/production/server-bundle/index.js
