#!/bin/bash
set -eoux pipefail

# cleanup
rm -rf build/remix/production
rm -rf build/tailwind/production

# tailwind
NODE_ENV=production pnpm run tailwind

# copy assets not managed by remix
NODE_ENV=production bash scripts/copy-assets.sh

# default "node-cjs" build with custom server main
NODE_ENV=production BUILD_NETLIFY=1 pnpx remix build

# build "storybook" static app
pnpx vite build --outDir build/remix/production/public/ui-dev --base ui-dev

# run esbuild again manually to bundle server app
pnpx esbuild build/remix/production/server/index.js --bundle --platform=node --outfile=build/remix/production/server-bundle/index.js

# zip it as a prebuilt netlify function
mkdir -p build/remix/production/server-bundle-zip
zip -j build/remix/production/server-bundle-zip/index.zip build/remix/production/server-bundle/index.js
