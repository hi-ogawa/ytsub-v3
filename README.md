# ytsub-v3

```sh
# development (see https://github.com/hi-ogawa/ytsub-v3/wiki/development)
pnpm run install-with-patch
make docker/up db/reset db/seed
npm run dev

# lint
npm run lint

# deploy
netlify --version # netlify-cli/9.13.3 linux-x64 node-v16.13.2 (installed via `pnpm i -g netlify-cli`)
netlify sites:create --name ytsub-v3-hiro18181
netlify link --name ytsub-v3-hiro18181
npm run netlify:build:deploy

# testing (vitest)
npm run test

# testing (playwright)
npx playwright install
npm run test-e2e

# migration on production
npm run knex:production -- migrate:status
```
