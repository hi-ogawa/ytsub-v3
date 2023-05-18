# prisma schema

Use prisma only as a schema diff tool to auto-generate up/down migrations.

```sh
# 0. edit schema.prisma

# 1. show diff for "up" migration
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma  --script

# 2. show diff for "down" migration
npx prisma migrate diff --to-schema-datasource prisma/schema.prisma --from-schema-datamodel prisma/schema.prisma  --script
```

## baseline

```sh
# add baseline migration
mkdir -p prisma/migrations/0-baseline
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0-baseline/migration.sql
npx prisma migrate resolve --applied 0-baseline
```
