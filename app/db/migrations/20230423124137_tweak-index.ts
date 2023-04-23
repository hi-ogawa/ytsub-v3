import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `practiceEntries` DROP KEY `practiceEntries_deckId_key`, ADD KEY `practiceEntries_deckId_scheduledAt_key` (`deckId`,`scheduledAt`);"
  );
  await knex.raw(
    "ALTER TABLE `practiceActions` DROP KEY `practiceActions_deckId_key`, DROP KEY `practiceActions_createdAt_key`, ADD KEY `practiceActions_deckId_createdAt_key` (`deckId`,`createdAt`);"
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `practiceEntries` DROP KEY `practiceEntries_deckId_scheduledAt_key`, ADD KEY `practiceEntries_deckId_key` (`deckId`);"
  );
  await knex.raw(
    "ALTER TABLE `practiceActions` DROP KEY `practiceActions_deckId_createdAt_key`, ADD KEY `practiceActions_deckId_key` (`deckId`), ADD KEY `practiceActions_createdAt_key` (`createdAt`);"
  );
}
