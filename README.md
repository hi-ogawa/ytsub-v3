# ytsub-v3

based on

- https://github.com/hi-ogawa/remix-netlify-manual-build
- https://github.com/hi-ogawa/ytsub-v2

```sh
# development
pnpm install
pnpm run dev  # start remix app
pnpm run dev:tsc  # type check
pnpm run dev:tailwind  # generate tailwind css

# lint
pnpm run lint

# deploy
pnpx netlify sites:create --name ytsub-v3-hiro18181
pnpx netlify link --name ytsub-v3-hiro18181
pnpm run netlify:build:deploy

# testing (jest)
pnpm run test

# testing (playwright)
pnpx playwright install
pnpm run test:playwright
```
