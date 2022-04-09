/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw(`
    CREATE TABLE videos (
      id                    BIGINT AUTO_INCREMENT,
      videoId               VARCHAR(32) NOT NULL,
      language1_id          VARCHAR(32) NOT NULL,
      language1_translation VARCHAR(32) NOT NULL,
      language2_id          VARCHAR(32) NOT NULL,
      language2_translation VARCHAR(32) NOT NULL,
      title                 TEXT NOT NULL,
      author                TEXT NOT NULL,
      channelId             VARCHAR(32) NOT NULL,
      createdAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      userId                BIGINT DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE INDEX (videoId, language1_id, language1_translation, language2_id, language2_translation, userId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await knex.raw(`
    CREATE TABLE captionEntries (
      id        BIGINT AUTO_INCREMENT,
      begin     FLOAT NOT NULL,
      end       FLOAT NOT NULL,
      text1     TEXT NOT NULL,
      text2     TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      videoId   BIGINT NOT NULL,
      PRIMARY KEY (id),
      FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE
    );
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.raw(`
    DROP TABLE captionEntries;
  `);
  await knex.raw(`
    DROP TABLE videos;
  `);
};
