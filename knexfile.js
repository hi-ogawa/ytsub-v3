/** @type {import("knex").Knex.Config>} */
module.exports = {
  // statically require knex dialect so that esbuild can bundle it
  // otherwise it relies on dynamic require (https://github.com/knex/knex/blob/3616791ac2a6d17d55b29feed6a503a793d7c488/lib/knex-builder/internal/config-resolver.js#L38)
  client: require("knex/lib/dialects/mysql2"),
  // prettier-ignore
  connection: {
    host:     process.env.APP_MYSQL_HOST     ?? "localhost",
    port:     process.env.APP_MYSQL_PORT     ?? "3306",
    user:     process.env.APP_MYSQL_USER     ?? "root",
    password: process.env.APP_MYSQL_PASSWORD ?? "password",
    database: process.env.APP_MYSQL_DATABASE ?? `ytsub_${process.env.NODE_ENV ?? "development"}`,
    ssl:      process.env.APP_MYSQL_SSL === "true" ? {} : undefined,
    multipleStatements: true,
    timezone: "+00:00", // planetscale and development mysql image have UTC localtime
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: "app/db/migrations",
    stub: "misc/db/migration-stub.js",
  },
  debug: Boolean(process.env.APP_KNEX_DEBUG),
};
