/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE decks
      ADD newEntriesPerDay INTEGER DEFAULT 50,
      ADD reviewsPerDay    INTEGER DEFAULT 200,
      ADD easeMultiplier   FLOAT   DEFAULT 2,
      ADD easeBonus        FLOAT   DEFAULT 1.5;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE decks
      DROP newEntriesPerDay,
      DROP reviewsPerDay,
      DROP easeMultiplier,
      DROP easeBonus;
  `);
};
