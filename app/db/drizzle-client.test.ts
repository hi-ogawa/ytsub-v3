import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  E,
  T,
  db,
  toDeleteQuery,
  toDeleteQueryInner,
} from "./drizzle-client.server";

describe("toDeleteQueryInner", () => {
  it("basic", async () => {
    const query = db
      .select()
      .from(T.videos)
      .leftJoin(T.users, E.eq(T.users.id, T.videos.userId))
      .where(
        E.and(
          sql`FALSE`,
          // @ts-expect-error nullable sincee leftJoin
          E.isNull(T.users.id),
          E.isNotNull(T.videos.userId) // not delete "anonymouse" videos
        )
      );
    const res = await toDeleteQuery(query);
    expect(res).toMatchInlineSnapshot("undefined");

    const deleteSql = toDeleteQueryInner(query.getSQL(), "videos");
    expect((db as any).dialect.sqlToQuery(deleteSql)).toMatchInlineSnapshot(`
      {
        "params": [],
        "sql": " delete \`videos\`.*  from \`videos\` left join \`users\`  on \`users\`.\`id\` = \`videos\`.\`userId\` where (FALSE and \`users\`.\`id\` is null and \`videos\`.\`userId\` is not null)",
        "typings": [],
      }
    `);
  });
});
