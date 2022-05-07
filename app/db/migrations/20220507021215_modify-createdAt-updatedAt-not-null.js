/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  for (const table of TABLES) {
    await knex.raw(`
      ALTER TABLE ${table} MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE ${table} MODIFY updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
    `);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  for (const table of TABLES) {
    await knex.raw(`
      ALTER TABLE ${table} MODIFY updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
      ALTER TABLE ${table} MODIFY createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;
    `);
  }
};

const TABLES = [
  "bookmarkEntries",
  "captionEntries",
  "decks",
  "practiceActions",
  "practiceEntries",
  "videos",
];
