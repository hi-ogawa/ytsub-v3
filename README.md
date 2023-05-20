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

# deploy (see also misc/vercel/README.md)
pnpm build
pnpm release-production

# migration on production
pnpm knex-production -- migrate:status
```
