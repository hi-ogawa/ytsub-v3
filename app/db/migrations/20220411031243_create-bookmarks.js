/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE bookmarkEntries (
      id                    BIGINT AUTO_INCREMENT,
      text                  TEXT NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      captionEntryId        BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY bookmarkEntries_captionEntryId_key (captionEntryId)
    );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE bookmarkEntries;
  `);
};
