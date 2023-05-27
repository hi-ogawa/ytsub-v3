import { difference, once, tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import * as E from "drizzle-orm/expressions";
import {
  InferModel,
  MySqlDialect,
  boolean,
  customType,
  float,
  int,
  json,
  mysqlTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/mysql-core";
import { MySql2Database, MySql2Session, drizzle } from "drizzle-orm/mysql2";
import { SQL } from "drizzle-orm/sql";
import type { Connection } from "mysql2";
import { createConnection } from "mysql2/promise";
import { uninitialized } from "../utils/misc";
import type { PaginationMetadata, PaginationParams } from "../utils/pagination";
import knexfile from "./knexfile.server";
import type { DeckCache, PracticeActionType, PracticeQueueType } from "./types";

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
    return jsValue.toISOString().slice(0, -1);
  },
  fromDriver: (dbValue) => {
    return new Date(dbValue + "Z");
  },
});

const timestampColumns = {
  createdAt: datetimeUtc("createdAt").notNull().default(DUMMY_DEFAULT),
  updatedAt: datetimeUtc("updatedAt").notNull().default(DUMMY_DEFAULT),
};

//
// schema
//

const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  ...timestampColumns,
  //
  username: text("username").notNull(),
  passwordHash: text("passwordHash").notNull(), // TODO: reduct when responding to client
  email: text("email"),
  language1: text("language1"),
  language2: text("language2"),
  timezone: text("timezone").notNull().default(DUMMY_DEFAULT),
});

const userVerifications = mysqlTable("userVerifications", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  ...timestampColumns,
  //
  email: text("email").notNull(),
  code: text("code").notNull(),
  verifiedAt: datetimeUtc("verifiedAt"),
});

const videos = mysqlTable("videos", {
  id: serial("id").primaryKey(),
  userId: int("userId"), // `null` indicates the video is created by/for "anonymous" users
  ...timestampColumns,
  //
  videoId: text("videoId").notNull(),
  language1_id: text("language1_id").notNull(),
  language2_id: text("language2_id").notNull(),
  language1_translation: text("language1_translation"),
  language2_translation: text("language2_translation"),
  title: text("title").notNull(),
  author: text("author").notNull(),
  channelId: text("channelId").notNull(),
  bookmarkEntriesCount: int("bookmarkEntriesCount")
    .notNull()
    .default(DUMMY_DEFAULT),
});

const captionEntries = mysqlTable("captionEntries", {
  id: serial("id").primaryKey(),
  videoId: int("videoId").notNull(), // not `videos.videoId` but `videos.id`
  ...timestampColumns,
  //
  index: int("index").notNull(), // zero-based index within video's caption entries
  begin: int("begin").notNull(),
  end: int("end").notNull(),
  text1: text("text1").notNull(),
  text2: text("text2").notNull(),
});

const bookmarkEntries = mysqlTable("bookmarkEntries", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  captionEntryId: int("captionEntryId").notNull(),
  ...timestampColumns,
  //
  text: text("text").notNull(),
  side: int("side").notNull(), // 0 | 1
  offset: int("offset").notNull(),
});

// prettier-ignore
const decks = mysqlTable("decks", {
  id: serial("id").primaryKey(),
  userId: int("userId").notNull(),
  ...timestampColumns,
  //
  name: text("name").notNull(),
  newEntriesPerDay: int("newEntriesPerDay").notNull().default(DUMMY_DEFAULT),
  reviewsPerDay: int("reviewsPerDay").notNull().default(DUMMY_DEFAULT),
  easeMultiplier: float("easeMultiplier").notNull().default(DUMMY_DEFAULT),
  easeBonus: float("easeBonus").notNull().default(DUMMY_DEFAULT),
  randomMode: boolean("randomMode").notNull().default(DUMMY_DEFAULT),
  // cache various things to reduce repeating heavy SELECT queries
  cache: json<DeckCache>("cache").notNull(),
});

const practiceEntries = mysqlTable("practiceEntries", {
  id: serial("id").primaryKey(),
  deckId: int("deckId").notNull(),
  bookmarkEntryId: int("bookmarkEntryId").notNull(),
  ...timestampColumns,
  //
  queueType: text<PracticeQueueType>("queueType").notNull(),
  easeFactor: float("easeFactor").notNull(),
  scheduledAt: datetimeUtc("scheduledAt").notNull(),
  practiceActionsCount: int("practiceActionsCount").notNull(),
});

const practiceActions = mysqlTable("practiceActions", {
  id: serial("id").primaryKey(),
  deckId: int("deckId").notNull(),
  practiceEntryId: int("practiceEntryId").notNull(),
  userId: int("userId").notNull(),
  ...timestampColumns,
  //
  queueType: text<PracticeQueueType>("queueType").notNull(),
  actionType: text<PracticeActionType>("actionType").notNull(),
});

const knex_migrations = mysqlTable("knex_migrations", {
  id: serial("id").primaryKey(),
  name: text("name"),
  batch: int("batch"),
  migration_time: timestamp("migration_time"),
});

// short accessor for tables
export const T = {
  users,
  userVerifications,
  videos,
  captionEntries,
  bookmarkEntries,
  decks,
  practiceEntries,
  practiceActions,
  knex_migrations,
};

type TableName = keyof typeof T;

type Table = (typeof T)[TableName];

export type TT = { [K in keyof typeof T]: InferModel<(typeof T)[K]> };

//
// utils (TODO: move to db/helper.ts?)
//

// re-export expressions since eq, isNull etc.. sounds too general
export { E };

export async function limitOne<
  Q extends { limit: (i: number) => Promise<any[]> }
>(query: Q): Promise<Awaited<ReturnType<Q["limit"]>>[0] | undefined> {
  return (await query.limit(1)).at(0);
}

export async function selectMany<SomeTable extends Table>(
  table: SomeTable,
  ...whereClauses: SQL[]
) {
  return db
    .select()
    .from(table)
    .where(E.and(...whereClauses));
}

export async function selectOne<SomeTable extends Table>(
  table: SomeTable,
  ...whereClauses: SQL[]
) {
  return limitOne(
    db
      .select()
      .from(table)
      .where(E.and(...whereClauses))
  );
}

export async function toPaginationResult<
  Q extends { execute: () => Promise<unknown> }
>(
  query: Q,
  { page, perPage }: PaginationParams
): Promise<[Awaited<ReturnType<Q["execute"]>>, PaginationMetadata]> {
  // hack "select config" directly
  // https://github.com/drizzle-team/drizzle-orm/blob/ffdf7d06a02afbd724eadfb61fe5b6996345d5be/drizzle-orm/src/mysql-core/dialect.ts#L186
  const q = query as any;

  // select rows
  q.config.limit = perPage;
  q.config.offset = (page - 1) * perPage;
  const rows = await q.execute();

  // aggregate count
  delete q.config.limit;
  delete q.config.offset;
  const total = await toCountSql(q);

  const pagination = {
    total,
    page,
    perPage,
    totalPage: Math.ceil(total / perPage),
  };
  return [rows, pagination];
}

export async function toCountSql<Q extends { execute: () => Promise<unknown> }>(
  query: Q
): Promise<number> {
  const q = query as any;
  q.config.fieldsList = [
    {
      path: ["count"],
      field: sql`COUNT(0)`,
    },
  ];
  const [{ count }] = await q.execute();
  tinyassert(typeof count === "number");
  return count;
}

// a little hack to make DELETE query based on SELECT since drizzle doesn't support complicated DELETE query with JOIN.
export function toDeleteSqlInner(sql: SQL, tableName: string): SQL {
  // replace
  //   select ... from
  // with
  //   delete from
  const [, c1, c2, c3] = sql.queryChunks;
  tinyassert(c1 === "select ");
  tinyassert(c2 instanceof SQL);
  tinyassert(c3 === " from ");
  sql.queryChunks.splice(1, 2, " delete `", tableName, "` ");
  return sql;
}

export async function toDeleteSql<Q extends { getSQL: () => SQL }>(select: Q) {
  const tableName = (select as any).tableName;
  tinyassert(typeof tableName === "string");
  return await db.execute(toDeleteSqlInner(select.getSQL(), tableName));
}

export function dbRaw(...args: Parameters<typeof sql>) {
  return db.execute(sql(...args));
}

export async function dbShowTables(): Promise<string[]> {
  const [rows]: any = await dbRaw`SHOW TABLES`;
  return rows.map((row: any) => Object.values(row)[0]);
}

// used to check knex migrations up/down reversibility
export async function dbGetSchema(): Promise<Record<string, any>> {
  const names = await dbShowTables();
  const result: Record<string, any> = {};
  for (const name of names) {
    const [fields]: any = await dbRaw`DESCRIBE ${sql.raw(name)}`;
    const [indices]: any = await dbRaw`SHOW INDEX FROM ${sql.raw(name)}`;
    result[name] = {
      describe: Object.fromEntries(fields.map((row: any) => [row.Field, row])),
      index: Object.fromEntries(indices.map((row: any) => [row.Key_name, row])),
    };
  }
  return result;
}

// equilvalent of `knex migrate:status` cli
export async function dbGetMigrationStatus() {
  const rows = await db.select().from(T.knex_migrations);

  const fs = await import("fs");
  const config = knexfile();
  const files = await fs.promises.readdir(config.migrations.directory);
  files.sort();

  const completedFiles = rows.map((row) => row.name);
  const pendingFiles = difference(files, completedFiles);
  const brokenFiles = difference(completedFiles, files);

  return {
    rows,
    completedFiles,
    pendingFiles,
    brokenFiles,
  };
}

//
// client
//

// persist through dev auto reloading
declare let globalThis: {
  __drizzleClient: MySql2Database;
};

export let db = uninitialized as typeof globalThis.__drizzleClient;

export const initializeDrizzleClient = once(async () => {
  db = globalThis.__drizzleClient ??= await inner();

  async function inner() {
    const config = knexfile();
    const connection = await createConnection(config.connection);
    return drizzle(connection, {
      logger: process.env["DEBUG"]?.includes("drizzle"), // enable query logging by DEBUG=drizzle
    });
  }
});

export async function finalizeDrizzleClient() {
  __dbExtra().connection.destroy();
}

export function __dbExtra() {
  return {
    connection: (db as any).session.client as Connection,
    session: (db as any).session as MySql2Session,
    dialect: (db as any).dialect as MySqlDialect,
  };
}
