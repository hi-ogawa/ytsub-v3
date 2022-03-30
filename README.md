# ytsub-v3

based on

- https://github.com/hi-ogawa/remix-netlify-manual-build
- https://github.com/hi-ogawa/ytsub-v2

```sh
# development
pnpm run install-with-patch
make docker/up db/reset
npm run dev:all

# lint
npm run lint

# deploy
netlify --version # netlify-cli/9.13.3 linux-x64 node-v16.13.2 (installed via `pnpm i -g netlify-cli`)
netlify sites:create --name ytsub-v3-hiro18181
netlify link --name ytsub-v3-hiro18181
npm run netlify:build:deploy

# testing (jest)
npm run test

# testing (playwright)
npx playwright install
npm run test:playwright
```
