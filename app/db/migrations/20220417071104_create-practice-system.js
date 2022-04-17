/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE decks (
      id                    BIGINT AUTO_INCREMENT,
      name                  TEXT NOT NULL,
      newEntriesPerDay      INT NOT NULL,
      reviewsPerDay         INT NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      userId                BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY decks_userId_key (userId)
    )
  `);
  await knex.raw(`
    CREATE TABLE practiceEntries (
      id                    BIGINT AUTO_INCREMENT,
      queueType             VARCHAR(32) NOT NULL,
      easeFactor            FLOAT NOT NULL,
      scheduledAt           DATETIME NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deckId                BIGINT NOT NULL,
      bookmarkEntryId       BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY practiceEntries_deckId_key (deckId),
      KEY practiceEntries_bookmarkEntry_key (bookmarkEntryId)
    )
  `);
  await knex.raw(`
    CREATE TABLE practiceActions (
      id                    BIGINT AUTO_INCREMENT,
      actionType            VARCHAR(32) NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      userId                BIGINT NOT NULL,
      practiceEntryId       BIGINT NOT NULL,
      PRIMARY KEY (id),
      KEY practiceActions_userId_key (userId),
      KEY practiceActions_practiceEntryId_key (practiceEntryId)
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`DROP TABLE practiceActions`);
  await knex.raw(`DROP TABLE practiceEntries`);
  await knex.raw(`DROP TABLE decks`);
};
