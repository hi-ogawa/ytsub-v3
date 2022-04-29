const NODE_ENV = process.env.NODE_ENV ?? "development";

function env(key) {
  // return process.env[`APP_MYSQL_${key.toUpperCase()}`];
  // @ts-ignore
  return Deno.env.get(`APP_MYSQL_${key.toUpperCase()}`);
}

/** @type {import("knex").Knex.Config>} */
module.exports = {
  // statically require knex dialect so that esbuild can bundle it
  // otherwise it relies on dynamic require (https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/knex-builder/internal/config-resolver.js#L38)
  client: require("knex/lib/dialects/mysql2"),
  // prettier-ignore
  connection: {
    host:     env("host")     ?? "localhost",
    port:     env("port")     ?? "3306",
    user:     env("user")     ?? "root",
    password: env("password") ?? "password",
    database: env("database") ?? `ytsub_${NODE_ENV}`,
    ssl:      env("ssl") === "true" ? {} : undefined,
    multipleStatements: true
  },
  migrations: {
    directory: "app/db/migrations",
    stub: "misc/db/migration-stub.js",
  },
};
