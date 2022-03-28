const env = require("./app/env.js");

/** @type {import("knex").Knex.Config>} */
module.exports = {
  // statically require knex dialect so that esbuild can bundle it
  // otherwise it relies on dynamic require (https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/knex-builder/internal/config-resolver.js#L38)
  client: require("knex/lib/dialects/mysql2"),
  connection: {
    host: env.APP_MYSQL_HOST,
    port: Number(env.APP_MYSQL_PORT),
    user: env.APP_MYSQL_USER,
    password: env.APP_MYSQL_PASSWORD,
    database: env.APP_MYSQL_DATABASE,
    ssl: env.APP_MYSQL_SSL === "true" ? {} : undefined,
  },
  migrations: {
    directory: "app/db/migrations",
    extension: "js",
  },
};
