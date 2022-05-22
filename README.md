# ytsub-v3

```sh
# development
pnpm run install-with-patch
make docker/up db/reset db/restore  # username/password is dev/dev
npm run dev

# lint
npm run lint

# deploy (netlify)
netlify --version # netlify-cli/9.13.3 linux-x64 node-v16.15.0 (installed via `volta install netlify-cli@9.13.3`)
netlify sites:create --name ytsub-v3-hiro18181
netlify link --name ytsub-v3-hiro18181
npm run netlify:build:deploy:production

# deploy (vercel)
vercel --version # Vercel CLI 24.2.4
vercel projects add ytsub-v3-hiro18181
vercel link -p ytsub-v3-hiro18181
npm run vercel:build:deploy:production

# testing (vitest)
npm run test
npm run test:coverage # view result e.g. via `xdg-open coverage/unit/index.html`

# testing (playwright)
npx playwright install
npm run test-e2e
npm run test-e2e:coverage

# migration on production
npm run knex:production -- migrate:status
```
