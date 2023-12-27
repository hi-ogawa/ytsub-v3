/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.raw(`
    ALTER TABLE users MODIFY createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
  await knex.raw(`
    ALTER TABLE users MODIFY updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.raw(`
    ALTER TABLE users MODIFY updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  `);
  await knex.raw(`
    ALTER TABLE users MODIFY createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  `);
};
