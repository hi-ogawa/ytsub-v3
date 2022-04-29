experiment with netlify edge (https://github.com/hi-ogawa/ytsub-v3/issues/54)

```sh
# create new site
netlify sites:create --name ytsub-v3-edge-hiro18181
netlify link --name ytsub-v3-edge-hiro18181

# run server
netlify dev

# build
netlify build

# deploy
netlify deploy --prod
```

build manually

```sh
.netlify/edge-functions/manifest.json
```
