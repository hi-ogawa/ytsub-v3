import * as E from "drizzle-orm/expressions";
import {
  InferModel,
  customType,
  int,
  mysqlTable,
  serial,
  text,
} from "drizzle-orm/mysql-core";
import { MySql2Database, drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import knexfile from "./knexfile.server";

//
// schema utils
//

// since drizzle is not used for migration, we just use dummy value to properly get optional value typing.
const DUMMY_DEFAULT = "__dummy" as any;

// workaround timezone issue where write/read doesn't round-trip due to truncated "Z" in `new Date`
const datetimeUtc = customType<{ data: Date; driverData: string }>({
  dataType: () => {
    return "datetime";
  },
  toDriver: (jsValue) => {
    return jsValue.toISOString().slice(0, -5);
  },
  fromDriver: (dbValue) => {
    return new Date(dbValue + ".000Z");
  },
});

//
// schema
//

const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(), // TODO: case insensitive
  passwordHash: text("passwordHash").notNull(), // TODO: reduct when responding to client
  createdAt: datetimeUtc("createdAt").notNull().default(DUMMY_DEFAULT),
  updatedAt: datetimeUtc("updatedAt").notNull().default(DUMMY_DEFAULT),
  language1: text("language1"),
  language2: text("language2"),
  timezone: text("timezone").notNull().default(DUMMY_DEFAULT),
});

export type User = InferModel<typeof users>;

const decks = mysqlTable("decks", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  // TODO
});

export type Deck = InferModel<typeof decks>;

// short accessor for tables
export const T = { users, decks };

//
// utils
//

// re-export expressions since eq, isNull etc.. sounds too general
export { E };

export async function limitOne<
  T,
  Query extends { limit: (i: number) => Promise<T[]> }
>(query: Query): Promise<T | undefined> {
  return (await query.limit(1)).at(0);
}

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
