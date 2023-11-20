import type { Knex } from "knex";
import { initializeConfigServer } from "../utils/config";
import { dbConfig } from "./config";

export default function knexfile() {
  initializeConfigServer();

  return {
    client: "mysql2",
    connection: dbConfig(),
    migrations: {
      directory: "migrations",
      stub: "__migration-stub.ts",
    },
  } satisfies Knex.Config;
}
