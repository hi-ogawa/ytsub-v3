/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.raw(`
    UPDATE users SET settings = JSON_OBJECT() WHERE settings IS NULL
  `);
  await knex.raw(`
    ALTER TABLE users MODIFY settings JSON NOT NULL DEFAULT (JSON_OBJECT())
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.raw(`
    ALTER TABLE users MODIFY settings JSON DEFAULT NULL
  `);
};
