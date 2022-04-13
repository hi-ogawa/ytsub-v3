/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE bookmarkEntries (
      id                    BIGINT AUTO_INCREMENT,
      text                  TEXT NOT NULL,
      side                  INT NOT NULL,
      offset                INT NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      userId                BIGINT NOT NULL,
      videoId               BIGINT NOT NULL,
      captionEntryId        BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY bookmarkEntries_userId_key         (userId),
      KEY bookmarkEntries_videoId_key        (videoId),
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
