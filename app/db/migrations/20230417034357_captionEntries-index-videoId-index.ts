import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(
    `ALTER TABLE captionEntries ADD KEY captionEntries_videoId_index_key (videoId, \`index\`)`
  );
}

export async function down(knex: Knex) {
  await knex.raw(
    `ALTER TABLE captionEntries DROP KEY captionEntries_videoId_index_key`
  );
}
