import {
  InferModel,
  mysqlTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/mysql-core";
import { MySql2Database, drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import knexfile from "./knexfile.server";

//
// schema
//

const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(), // TODO: case insensitive
  passwordHash: text("passwordHash").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  language1: text("language1"),
  language2: text("language2"),
  timezone: text("timezone").default("+00:00").notNull(),
});

export type User = InferModel<typeof users>;

// short accessor for tables
export const T = { users };

//
// client
//

// persist through dev auto reloading
declare let globalThis: {
  __db: any;
};

export let db: MySql2Database = globalThis.__db;

export async function initializeDrizzleClient() {
  if (db) {
    return;
  }
  const config = knexfile();
  const connection = await createConnection(config.connection as any);
  db = globalThis.__db = drizzle(connection);
}
