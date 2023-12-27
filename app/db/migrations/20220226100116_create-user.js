/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async function (knex) {
  await knex.raw(`
    CREATE TABLE users (
      id           BIGINT AUTO_INCREMENT,
      username     VARCHAR(128) NOT NULL,
      passwordHash VARCHAR(128) NOT NULL,
      createdAt    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX (username)
    );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async function (knex) {
  await knex.raw(`
    DROP TABLE users;
  `);
};
