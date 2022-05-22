/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  if (process.env.MIGRATION_UNIT_TEST) await testUp.before(knex);

  await knex.raw(`
    ALTER TABLE users ADD language1 VARCHAR(32) DEFAULT NULL;
    ALTER TABLE users ADD language2 VARCHAR(32) DEFAULT NULL;
    UPDATE users SET
      language1 = settings->>"$.language1",
      language2 = settings->>"$.language2";
    ALTER TABLE users DROP settings;
  `);

  if (process.env.MIGRATION_UNIT_TEST) await testUp.after(knex);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  if (process.env.MIGRATION_UNIT_TEST) await testDown.before(knex);

  await knex.raw(`
    ALTER TABLE users ADD settings JSON NOT NULL DEFAULT (JSON_OBJECT());
    UPDATE users SET
      settings = JSON_OBJECT('language1', language1, 'language2', language2);
    ALTER TABLE users DROP language2;
    ALTER TABLE users DROP language1;
  `);

  if (process.env.MIGRATION_UNIT_TEST) await testDown.after(knex);
};

const testUp = {
  before: async function (knex) {
    await knex.raw(`
      INSERT INTO users (username, passwordHash, settings) VALUE
        ('user0', 'x', DEFAULT),
        ('user1', 'x', '{"language1": "fr"}'),
        ('user2', 'x', '{"language1": "fr", "language2": "en"}');
    `);
  },
  after: async function (knex) {
    const assert = await import("assert/strict");
    const [rows] = await knex.raw(
      `SELECT language1, language2 FROM users ORDER BY username`
    );
    assert.deepEqual(rows, [
      { language1: null, language2: null },
      { language1: "fr", language2: null },
      { language1: "fr", language2: "en" },
    ]);
    await knex.raw(`DELETE FROM users`);
  },
};

const testDown = {
  before: async function (knex) {
    await knex.raw(`
      INSERT INTO users (username, passwordHash, language1, language2) VALUE
        ('user0', 'x', DEFAULT, DEFAULT),
        ('user1', 'x', 'fr', DEFAULT),
        ('user2', 'x', 'fr', 'en');
    `);
  },
  after: async function (knex) {
    const assert = await import("assert/strict");
    const [rows] = await knex.raw(
      `SELECT settings FROM users ORDER BY username`
    );
    assert.deepEqual(rows, [
      { settings: { language1: null, language2: null } },
      { settings: { language1: "fr", language2: null } },
      { settings: { language1: "fr", language2: "en" } },
    ]);
    await knex.raw(`DELETE FROM users`);
  },
};
