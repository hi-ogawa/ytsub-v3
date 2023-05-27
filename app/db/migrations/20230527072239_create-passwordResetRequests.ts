import fs from "node:fs";
import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    await fs.promises.readFile(
      __dirname + "/raw/20230527072239_create-passwordResetRequests/up.sql",
      "utf-8"
    )
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    await fs.promises.readFile(
      __dirname + "/raw/20230527072239_create-passwordResetRequests/down.sql",
      "utf-8"
    )
  );
}
