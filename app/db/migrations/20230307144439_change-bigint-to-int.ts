import { Knex } from "knex";

export async function up(knex: Knex) {
  await knex.raw(`
    ALTER TABLE users MODIFY id INT UNSIGNED;
    ALTER TABLE users DROP PRIMARY KEY;
    ALTER TABLE users MODIFY id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT;
`);
}

export async function down(knex: Knex) {
  await knex.raw(`
    ALTER TABLE users MODIFY id BIGINT;
    ALTER TABLE users DROP PRIMARY KEY;
    ALTER TABLE users MODIFY id BIGINT PRIMARY KEY AUTO_INCREMENT;
`);
}
