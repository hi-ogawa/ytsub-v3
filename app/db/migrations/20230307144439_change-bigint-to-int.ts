import { Knex } from "knex";

const ENTRIES = [
  {
    table: "bookmarkEntries",
    columns: ["id", "userId", "videoId", "captionEntryId"],
  },
  {
    table: "captionEntries",
    columns: ["id", "videoId"],
  },
  {
    table: "decks",
    columns: ["id", "userId"],
  },
  {
    table: "practiceActions",
    columns: ["id", "userId", "deckId", "practiceEntryId"],
  },
  {
    table: "practiceEntries",
    columns: ["id", "deckId", "bookmarkEntryId"],
  },
  {
    table: "users",
    columns: ["id"],
  },
  {
    table: "videos",
    columns: ["id"],
  },
];

export async function up(knex: Knex) {
  for (const { table, columns } of ENTRIES) {
    for (const column of columns) {
      await knex.raw(`
        ALTER TABLE ${table} MODIFY ${column} INT UNSIGNED NOT NULL;
      `);
      if (column === "id") {
        await knex.raw(`
          ALTER TABLE ${table} DROP PRIMARY KEY;
          ALTER TABLE ${table} MODIFY ${column} INT UNSIGNED PRIMARY KEY AUTO_INCREMENT;
        `);
      }
    }
  }
  await knex.raw(`
    ALTER TABLE videos MODIFY userId INT UNSIGNED;
  `);
}

export async function down(knex: Knex) {
  for (const { table, columns } of ENTRIES) {
    for (const column of columns) {
      await knex.raw(`
        ALTER TABLE ${table} MODIFY ${column} BIGINT NOT NULL;
      `);
      if (column === "id") {
        await knex.raw(`
          ALTER TABLE ${table} DROP PRIMARY KEY;
          ALTER TABLE ${table} MODIFY ${column} BIGINT PRIMARY KEY AUTO_INCREMENT;
        `);
      }
    }
  }
  await knex.raw(`
    ALTER TABLE videos MODIFY userId BIGINT;
  `);
}
