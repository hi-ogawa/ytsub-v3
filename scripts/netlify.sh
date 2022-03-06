#!/bin/bash
set -eoux pipefail

# cleanup
rm -rf build/remix/production
rm -rf build/tailwind/production

# tailwind
pnpm run tailwind

# default "node-cjs" build with custom server main
NODE_ENV=production BUILD_NETLIFY=1 pnpx remix build

# run esbuild again manually to bundle server app
pnpx esbuild build/remix/production/server/index.js --bundle --platform=node --outfile=build/remix/production/server-bundle/index.js

# zip it as a prebuilt netlify function
mkdir -p build/remix/production/server-bundle-zip
zip -j build/remix/production/server-bundle-zip/index.zip build/remix/production/server-bundle/index.js
