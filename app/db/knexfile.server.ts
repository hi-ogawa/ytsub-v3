import path from "node:path";
import type { Knex } from "knex";

// TODO: move to env.server.ts

const KNEX_CONFIG: Knex.Config = {
  client: "mysql2",
  // prettier-ignore
  connection: {
    host:     process.env.APP_MYSQL_HOST     ?? "localhost",
    port:     Number(process.env.APP_MYSQL_PORT ?? "3306"),
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
    directory: path.join(__dirname, "migrations"),
    stub: path.join(__dirname, "__migration-stub.ts"),
  },
  debug: Boolean(process.env.APP_KNEX_DEBUG),
};

export default KNEX_CONFIG;
