/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE users ADD language1 VARCHAR(32) DEFAULT NULL;
    ALTER TABLE users ADD language2 VARCHAR(32) DEFAULT NULL;
    UPDATE users SET
      language1 = JSON_EXTRACT(settings, '$.language1'),
      language2 = JSON_EXTRACT(settings, '$.language2');
    ALTER TABLE users DROP settings;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE users ADD settings JSON NOT NULL DEFAULT (JSON_OBJECT());
    UPDATE users SET
      settings = JSON_OBJECT('language1', language1, 'language2', language2);
    ALTER TABLE users DROP language2;
    ALTER TABLE users DROP language1;
  `);
};
