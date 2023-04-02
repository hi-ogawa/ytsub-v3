# db

```sh
# download deck export samples
wget -c -P misc/db/export https://github.com/hi-ogawa/ytsub-v3/files/11132552/ytsub-deck-export--Korean.txt
wget -c -P misc/db/export https://github.com/hi-ogawa/ytsub-v3/files/11132553/ytsub-deck-export--French.txt

# load production database locally
make db/dump/production         # create dump from planetscale
make db/restore/production      # restore to local
pnpm clean-data hiroshi         # filter only 'hiroshi' data and rename to 'dev'
make db/dump                    # create dump from local (after that rename manually to `misc/db/dev.sql.gz`)
```
