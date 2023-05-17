# prisma schema

Use prisma only as a schema diff tool to auto-generate up/down migrations.

```sh
# 0. edit schema.prisma

# 1. show diff for "up" migration
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma  --script

# 2. show diff for "down" migration
npx prisma migrate diff --to-schema-datasource prisma/schema.prisma --from-schema-datamodel prisma/schema.prisma  --script
```
