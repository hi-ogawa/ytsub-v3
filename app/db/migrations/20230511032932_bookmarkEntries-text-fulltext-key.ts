import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `bookmarkEntries` ADD COLUMN `textCharacters` json NOT NULL DEFAULT (json_array()) AFTER `text`, ADD KEY `bookmarkEntries_textCharacters_key` ((cast(`textCharacters` as char(1) array))), ADD FULLTEXT KEY `text` (`text`) /*!50100 WITH PARSER `ngram` */ ;"
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `bookmarkEntries` DROP COLUMN `textCharacters`, DROP KEY `bookmarkEntries_textCharacters_key`, DROP KEY `text`;"
  );
}
