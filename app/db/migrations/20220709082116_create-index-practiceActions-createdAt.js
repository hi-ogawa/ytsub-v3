/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.raw(`
    ALTER TABLE practiceActions ADD KEY practiceActions_createdAt_key (createdAt)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.raw(`
    ALTER TABLE practiceActions DROP KEY practiceActions_createdAt_key
  `);
};
