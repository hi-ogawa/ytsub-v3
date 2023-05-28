# skeema

we started to experiment with skeema.
we still use knex to apply migrations, but it's already useful enough during development.

## generate up/down migrations

```
# 0. update skeema/xxx.sql

# 1. diff for "up" migration
pnpm skeema diff --allow-unsafe

# 2. apply "up"
pnpm skeema push --allow-unsafe

# 3. temporary revert skeema/xxx.sql e.g. by
git checkout master

# 4. diff for "down" migration
pnpm skeema diff --allow-unsafe

# 5. apply "down"
pnpm skeema push --allow-unsafe

# 6. restore skeema/xxx.sql
git checkout -
```

## references

- https://github.com/skeema/skeema
