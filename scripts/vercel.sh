#!/bin/bash
set -eux -o pipefail

# cleanup
rm -rf build/remix/production
rm -rf build/tailwind/production

# tailwind
NODE_ENV=production npm run tailwind

# copy assets not managed by remix
NODE_ENV=production bash scripts/copy-assets.sh

# build "storybook" static app
if [ -n "${BUILD_UI_DEV:-}" ]; then
  npx vite build --outDir build/remix/production/public/ui-dev --base /ui-dev/
fi

# default "node-cjs" build with custom server main
NODE_ENV=production BUILD_VERCEL=1 npx remix build

# run esbuild again manually to bundle server app
# - skip `mysql` which appears in https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/dialects/mysql/index.js#L23
npx esbuild build/remix/production/server/index.js --outfile=build/remix/production/server/index-bundled.js \
  --bundle --platform=node \
  --external:mysql \
  --external:sqlite3 \
  --external:better-sqlite3 \
  --external:tedious \
  --external:pg \
  --external:oracledb \
  --external:pg-query-stream

#
# setup files for `vercel deploy --prebuilt`
#   https://vercel.com/docs/build-output-api/v3#vercel-primitives/static-files
#   https://vercel.com/docs/build-output-api/v3#vercel-primitives/serverless-functions
#
# vercel.json
# .vercel/
#   project.json
#   output/
#     config.json
#     static/
#       public/
#     functions/
#       server/
#         index.func/
#           .vc-config.json
#           index-bundled.js
#

deploy_dir=build/remix/production/deploy
mkdir -p "$deploy_dir/.vercel/output/static"
mkdir -p "$deploy_dir/.vercel/output/functions/server/index.func"
cp -r build/remix/production/public "$deploy_dir/.vercel/output/static"
cp build/remix/production/server/index-bundled.js "$deploy_dir/.vercel/output/functions/server/index.func"

# copy runtime library files (cf. https://github.com/prisma/prisma/blob/98eb6ed30dd41d2978142f704b8caa4a0ed412f6/packages/engine-core/src/library/LibraryEngine.ts#L63)
# PRISMA_QUERY_ENGINE_LIBRARY=./libquery_engine.so.node
cp node_modules/.pnpm/@prisma+client@4.11.0_prisma@4.11.0/node_modules/.prisma/client/libquery_engine-rhel-openssl-1.0.x.so.node "$deploy_dir/.vercel/output/functions/server/index.func/libquery_engine.so.node"
cp node_modules/.pnpm/@prisma+client@4.11.0_prisma@4.11.0/node_modules/.prisma/client/schema.prisma "$deploy_dir/.vercel/output/functions/server/index.func"

cat > "$deploy_dir/.vercel/output/config.json" << "EOF"
{
  "version": 3,
  "routes": [
    {
      "src": "^/build/(.*)$",
      "headers": {
        "Cache-Control": "public, max-age=31536000"
      },
      "continue": true
    },
    {
      "src": "^/(.*)$",
      "dest": "/public/$1",
      "check": true
    },
    {
      "src": "^/(.*)$",
      "dest": "/server",
      "check": true
    }
  ]
}
EOF
cat > "$deploy_dir/.vercel/output/functions/server/index.func/.vc-config.json" <<EOF
{
  "runtime": "nodejs16.x",
  "handler": "index-bundled.js",
  "launcherType": "Nodejs",
  "regions": ["hnd1"]
}
EOF
if [ -f .vercel/project.json ]; then
  cp .vercel/project.json "$deploy_dir/.vercel"  # skip on CI
fi
