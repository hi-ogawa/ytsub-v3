# ytsub-v3

```sh
# development
pnpm i
make docker/up db/reset db/seed  # username and password are both "dev"
pnpm dev

# lint
pnpm lint

# testing (vitest)
pnpm test
pnpm test-coverage # view result e.g. via `xdg-open coverage/unit/index.html`

# testing (playwright)
npx playwright install
pnpm test-e2e
pnpm test-e2e-coverage

# deploy (vercel)
vercel --version # Vercel CLI 24.2.4
vercel projects add ytsub-v3-hiro18181
vercel link -p ytsub-v3-hiro18181
pnpm build
pnpm release-production

# migration on production
pnpm knex-production -- migrate:status
```
