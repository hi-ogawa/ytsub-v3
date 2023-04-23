import type { Knex } from "knex";

export async function up(knex: Knex) {
  // ensures default value by application logic
  await knex.raw(
    "ALTER TABLE `decks` DROP COLUMN `practiceEntriesCountByQueueType`, ADD COLUMN `cache` json NOT NULL DEFAULT (json_object())"
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `decks` ADD COLUMN `practiceEntriesCountByQueueType` json NOT NULL DEFAULT (json_object(_utf8mb4'NEW',0,_utf8mb4'LEARN',0,_utf8mb4'REVIEW',0)) AFTER `randomMode`"
  );
}
