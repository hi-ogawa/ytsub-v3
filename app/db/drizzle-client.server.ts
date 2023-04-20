import { once, tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import * as E from "drizzle-orm/expressions";
import {
  InferModel,
  boolean,
  customType,
  float,
  int,
  json,
  mysqlTable,
  serial,
  text,
} from "drizzle-orm/mysql-core";
import { MySql2Database, drizzle } from "drizzle-orm/mysql2";
import { SQL, noopDecoder } from "drizzle-orm/sql";
import { createConnection } from "mysql2/promise";
import { throwGetterProxy } from "../utils/misc";
import type { PaginationParams } from "../utils/pagination";
import knexfile from "./knexfile.server";
import type { PaginationMetadata } from "./models";
import type { PracticeActionType, PracticeQueueType } from "./types";

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
  username: text("username").notNull(), // TODO: case insensitive
  passwordHash: text("passwordHash").notNull(), // TODO: reduct when responding to client
  language1: text("language1"),
  language2: text("language2"),
  timezone: text("timezone").notNull().default(DUMMY_DEFAULT),
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
  newEntriesPerDay: int("newEntriesPerDay").notNull(),
  reviewsPerDay: int("reviewsPerDay").notNull(),
  easeMultiplier: float("easeMultiplier").notNull(),
  easeBonus: float("easeBonus").notNull(),
  randomMode: boolean("randomMode").notNull().default(DUMMY_DEFAULT),
  practiceEntriesCountByQueueType: json<Record<PracticeQueueType, number>>("practiceEntriesCountByQueueType").notNull().default(DUMMY_DEFAULT),
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

// short accessor for tables
export const T = {
  users,
  videos,
  captionEntries,
  bookmarkEntries,
  decks,
  practiceEntries,
  practiceActions,
};

export type TT = { [K in keyof typeof T]: InferModel<(typeof T)[K]> };

//
// utils
//

// re-export expressions since eq, isNull etc.. sounds too general
export { E };

export async function findOne<
  Q extends { limit: (i: number) => Promise<any[]> }
>(query: Q): Promise<Awaited<ReturnType<Q["limit"]>>[0] | undefined> {
  return (await query.limit(1)).at(0);
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
  const total = await toCountQuery(q);

  const pagination = {
    total,
    page,
    perPage,
    totalPage: Math.ceil(total / perPage),
  };
  return [rows, pagination];
}

export async function toCountQuery<
  Q extends { execute: () => Promise<unknown> }
>(query: Q): Promise<number> {
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

// just for experiment and not actually used yet
export function toDeleteQueryInner(sql: SQL, tableName: string): SQL {
  // replace
  //   select ... from
  // with
  //   delete from
  const [, c1, c2, c3] = sql.queryChunks;
  tinyassert(c1 === "select ");
  tinyassert(c2 instanceof SQL);
  tinyassert(c3 === " from ");
  sql.queryChunks.splice(1, 2, " delete `", tableName, "`.* ");
  sql.mapWith(noopDecoder);
  return sql;
}

export async function toDeleteQuery<Q extends { getSQL: () => SQL }>(
  select: Q
) {
  const tableName = (select as any).tableName;
  tinyassert(typeof tableName === "string");
  await db.execute(toDeleteQueryInner(select.getSQL(), tableName));
}

//
// client
//

// persist through dev auto reloading
declare let globalThis: {
  __drizzleClient: MySql2Database;
};

export let db = throwGetterProxy as typeof globalThis.__drizzleClient;

export const initializeDrizzleClient = once(async () => {
  db = globalThis.__drizzleClient ??= await inner();

  async function inner() {
    const config = knexfile();
    const connection = await createConnection(config.connection as any);
    return drizzle(connection, {
      logger: process.env["DEBUG"]?.includes("drizzle"), // enable query logging by DEBUG=drizzle
    });
  }
});

export async function finalizeDrizzleClient() {
  (db as any).session.client.destroy();
}
