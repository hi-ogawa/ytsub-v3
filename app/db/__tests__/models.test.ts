import { omit } from "lodash";
import { beforeEach, describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { Q } from "../models";

describe("models", () => {
  beforeEach(async () => {
    await Q.users().delete();
  });

  it("basic", async () => {
    const res = await Q.users();
    expect(res).toMatchInlineSnapshot("[]");
  });

  it("insert-single", async () => {
    const data = {
      username: "root",
      passwordHash: "xyz",
      language1: "fr",
      language2: "en",
    };
    const [id] = await Q.users().insert(data);
    const res = await Q.users().where("id", id).first();
    assert(res);
    expect(omit(res, ["id", "createdAt", "updatedAt"])).toEqual(data);
  });

  // cf.
  // https://dev.mysql.com/doc/refman/8.0/en/example-auto-increment.html
  // https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
  it("insert-multiple", async () => {
    const data = [
      {
        username: "user0",
        passwordHash: "x",
      },
      {
        username: "user1",
        passwordHash: "y",
      },
    ];
    const ids = await Q.users().insert(data);
    expect(ids.length).toBe(1);

    const res = await Q.users().whereIn("id", [ids[0], ids[0] + 1]);
    expect(res).toMatchObject(data);
  });

  it("count", async () => {
    const query = Q.users().count({ total: 0 }).first();
    expect(query.toSQL().sql).toMatchInlineSnapshot(
      '"select count(0) as `total` from `users` limit ?"'
    );
    const res = await query;
    assert(res);
    assert(typeof res.total === "number");
  });
});
