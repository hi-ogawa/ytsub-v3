import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `bookmarkEntries` ADD FULLTEXT KEY `text` (`text`) /*!50100 WITH PARSER `ngram` */ ;"
  );
}

export async function down(knex: Knex) {
  await knex.raw("ALTER TABLE `bookmarkEntries` DROP KEY `text`;");
}
