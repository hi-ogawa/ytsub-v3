import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `bookmarkEntries` DROP KEY `bookmarkEntries_userId_key`, ADD KEY `bookmarkEntries_userId_createdAt_key` (`userId`,`createdAt`)"
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    "ALTER TABLE `bookmarkEntries` DROP KEY `bookmarkEntries_userId_createdAt_key`, ADD KEY `bookmarkEntries_userId_key` (`userId`)"
  );
}
