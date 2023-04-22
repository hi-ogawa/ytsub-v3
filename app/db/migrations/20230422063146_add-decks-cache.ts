import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `decks` ADD COLUMN `cache` json NOT NULL DEFAULT (json_object());"
  );
}

export async function down(knex: Knex) {
  await knex.raw("ALTER TABLE `decks` DROP COLUMN `cache`;");
}
