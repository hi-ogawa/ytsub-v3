import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  E,
  T,
  TT,
  __dbExtra,
  db,
  selectMany,
  selectOne,
  toDeleteSql,
  toDeleteSqlInner,
} from "./drizzle-client.server";
import { deleteOrphans } from "./models";

describe(toDeleteSql.name, () => {
  it.only("basic", async () => {
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
    expect(res[0]).toMatchInlineSnapshot(`
      ResultSetHeader {
        "affectedRows": 0,
        "fieldCount": 0,
        "info": "",
        "insertId": 0,
        "serverStatus": 2,
        "warningStatus": 0,
      }
    `);

    const deleteSql = toDeleteSqlInner(query.getSQL(), "videos");
    const deleteSql2 = __dbExtra().dialect.sqlToQuery(deleteSql);
    expect(deleteSql2).toMatchInlineSnapshot(`
      {
        "params": [],
        "sql": " delete \`videos\`  from \`videos\` left join \`users\`  on \`users\`.\`id\` = \`videos\`.\`userId\` where (FALSE and \`users\`.\`id\` is null and \`videos\`.\`userId\` is not null)",
        "typings": [],
      }
    `);
  });
});

describe(selectMany.name, () => {
  it("typing", async () => {
    const rows = await selectMany(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, 0),
      E.eq(T.bookmarkEntries.userId, 0)
    );
    rows satisfies TT["bookmarkEntries"][];
  });
});

describe(selectOne.name, () => {
  it("typing", async () => {
    const row = await selectOne(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, 0),
      E.eq(T.bookmarkEntries.userId, 0)
    );
    row satisfies TT["bookmarkEntries"] | undefined;
  });
});

describe(deleteOrphans.name, () => {
  it("basic", async () => {
    await deleteOrphans();
  });
});
