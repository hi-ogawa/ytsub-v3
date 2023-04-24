# skeema

we started to experiment with skeema.
we still use knex to apply migrations, but it's already useful enough during development.

## generate knex migrations

```
# 0. update skeema/some-table.sql

# 1. generate empty knex migration
pnpm knex migrate:make some-migration

# 2. diff for `up` knex migration
pnpm skeema diff --allow-unsafe

# 3. apply knex migration
pnpm knex migrate:up

# 4. temporary revert skeema/some-table.sql
git stash

# 5. diff for `down` knex migration
pnpm skeema diff --allow-unsafe

# 6. restore skeema/yyy.sql
git stash pop
```

## references

- https://github.com/skeema/skeema
