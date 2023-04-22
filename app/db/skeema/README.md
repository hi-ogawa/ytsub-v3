# skeema

we started to experiment with skeema.
we still use knex to apply migrations, but it's already useful enough during development.

## generate knex migrations

```
# 0. generate empty knex migration
pnpm knex migrate:make some-migration

# 1. update skeema/some-table.sql

# 2. diff for `up` knex migration
pnpm skeema diff

# 3. temporary revert skeema/some-table.sql
git stash

# 4. diff for `down` knex migration
pnpm skeema diff

# 5. restore skeema/yyy.sql
git stash pop
```

## references

- https://github.com/skeema/skeema
