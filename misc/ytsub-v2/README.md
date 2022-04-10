# ytsub-v2

import local storage data used in [ytsub-v2](https://github.com/hi-ogawa/ytsub-v2)

```sh
jq '.historyEntries | map(.watchParameters | { videoId: .videoId, language1: { id: (.captions[0].id), translation: (.captions[0].translation?) }, language2: { id: (.captions[1].id), translation: (.captions[1].translation?) } } )' < misc/ytsub-v2/data-v2.json > misc/ytsub-v2/videos.json
npm run cli -- create-videos --username root < misc/ytsub-v2/videos.json
```
