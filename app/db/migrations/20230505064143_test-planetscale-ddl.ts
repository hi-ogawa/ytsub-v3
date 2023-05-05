import type { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw("ALTER TABLE `videos` ADD KEY `videos_language1_id` (`language1_id`), ADD KEY `videos_language1_id_translation` (`language1_translation`)");
}

export async function down(knex: Knex) {
  await knex.raw("ALTER TABLE `videos` DROP KEY `videos_language1_id`, DROP KEY `videos_language1_id_translation`");
}
