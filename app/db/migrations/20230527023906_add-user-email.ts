import fs from "node:fs";
import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    await fs.promises.readFile(
      "app/db/migrations/raw/20230527023906_add-user-email/up.sql",
      "utf-8"
    )
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    await fs.promises.readFile(
      "app/db/migrations/raw/20230527023906_add-user-email/down.sql",
      "utf-8"
    )
  );
}
