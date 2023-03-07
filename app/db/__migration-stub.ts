import { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(`SELECT 1 + 1`);
}

export async function down(knex: Knex) {
  await knex.raw(`SELECT 1 + 1`);
}
