# skeema

we started to experiment with skeema.
we still use knex to apply migrations, but it's already useful enough for development.

```sh
# update skeema/*.sql based on development db
pnpm skeema pull

# diff between skeema/*.sql and development db
pnpm skeema diff
```

- https://github.com/skeema/skeema
