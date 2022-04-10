# demo

collect demo data for production use

```sh
python -c 'import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin)))' < misc/demo/videos.yml | npm run cli -- create-videos
python -c 'import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin)))' < misc/demo/videos.yml | npm run cli:production -- create-videos
```
