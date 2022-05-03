# db

create dump for development and testing

```sh
make db/dump/production         # create dump from planetscale
make db/restore/production      # restore to local
npm run cli clean-data hiroshi  # filter only 'hiroshi' data and rename to 'dev'
make db/dump                    # create dump from local
```
