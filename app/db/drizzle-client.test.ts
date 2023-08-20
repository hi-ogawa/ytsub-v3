import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  E,
  T,
  TT,
  __dbExtra,
  db,
  dbShowTables,
  selectMany,
  selectOne,
  toCountSql,
  toDeleteSql,
  toDeleteSqlInner,
} from "./drizzle-client.server";
import { deleteOrphans } from "./helper";

describe(toDeleteSql, () => {
  it("basic", async () => {
    const query = db
      .select()
      .from(T.videos)
      .leftJoin(T.users, E.eq(T.users.id, T.videos.userId))
      .where(
        E.and(
          sql`FALSE`,
          E.isNull(T.users.id as any),
          E.isNotNull(T.videos.userId) // not delete "anonymouse" videos
        )
      );
    const res = await toDeleteSql(query);
    expect(res[0].affectedRows).toMatchInlineSnapshot("0");

    const deleteSql = toDeleteSqlInner(query.getSQL(), "videos");
    const deleteSql2 = __dbExtra().dialect.sqlToQuery(deleteSql);
    expect(deleteSql2).toMatchInlineSnapshot(`
      {
        "params": [],
        "sql": "delete \`videos\` from \`videos\` left join \`users\` on \`users\`.\`id\` = \`videos\`.\`userId\` where (FALSE and \`users\`.\`id\` is null and \`videos\`.\`userId\` is not null)",
      }
    `);
  });
});

describe(selectMany, () => {
  it("typing", async () => {
    const rows = await selectMany(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, 0),
      E.eq(T.bookmarkEntries.userId, 0)
    );
    rows satisfies TT["bookmarkEntries"][];
  });
});

describe(selectOne, () => {
  it("typing", async () => {
    const row = await selectOne(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, 0),
      E.eq(T.bookmarkEntries.userId, 0)
    );
    row satisfies TT["bookmarkEntries"] | undefined;
  });
});

describe(toCountSql, () => {
  it("basic", async () => {
    await toCountSql(db.select().from(T.videos));
  });
});

describe(deleteOrphans, () => {
  it("basic", async () => {
    await deleteOrphans();
  });
});

describe(dbShowTables, () => {
  it("basic", async () => {
    await expect(dbShowTables()).resolves.toMatchInlineSnapshot(`
      [
        "bookmarkEntries",
        "captionEntries",
        "decks",
        "emailUpdateRequests",
        "knex_migrations",
        "knex_migrations_lock",
        "passwordResetRequests",
        "practiceActions",
        "practiceEntries",
        "users",
        "videos",
      ]
    `);
  });
});
