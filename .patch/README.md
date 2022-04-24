# patch

Use this subdirectory with plain `npm` to prepare patches since `patch-package` doesn't support `pnpm`.

## create patch

```sh
# 1. install original dependencies
npm install

# 2. manually edit e.g. node_modules/@remix-run/serve/index.js

# 3. run patch-package to generate e.g. patches/@remix-run+serve+1.4.1.patch
npx patch-package @remix-run/serve
```

## references

- https://github.com/ds300/patch-package/issues/35
- https://pnpm.io/pnpmfile#hooksreadpackagepkg-context-pkg--promisepkg
