import path from "node:path";
import type { Knex } from "knex";
import { initializeConfigServer, serverConfig } from "../utils/config";

export default function knexfile() {
  initializeConfigServer();

  return {
    client: "mysql2",
    connection: {
      host: serverConfig.APP_MYSQL_HOST,
      port: serverConfig.APP_MYSQL_PORT,
      user: serverConfig.APP_MYSQL_USER,
      password: serverConfig.APP_MYSQL_PASSWORD,
      database: serverConfig.APP_MYSQL_DATABASE,
      ssl: serverConfig.APP_MYSQL_SSL ? {} : undefined,
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
  } satisfies Knex.Config;
}
