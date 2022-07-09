/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE decks ADD practiceEntriesCountByQueueType JSON NOT NULL DEFAULT (JSON_OBJECT('NEW', 0, 'LEARN', 0, 'REVIEW', 0))
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE decks DROP practiceEntriesCountByQueueType
  `);
};
