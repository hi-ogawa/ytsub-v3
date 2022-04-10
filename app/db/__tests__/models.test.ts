import { omit } from "lodash";
import { beforeEach, describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { tables } from "../models";

describe("models", () => {
  beforeEach(async () => {
    await tables.users().delete();
  });

  it("basic", async () => {
    const res = await tables.users().select("*");
    expect(res).toMatchInlineSnapshot("[]");
  });

  it("insert-single", async () => {
    const data = {
      username: "root",
      passwordHash: "xyz",
      language1: "fr",
      language2: "en",
    };
    const [id] = await tables.users().insert(data);
    const res = await tables.users().select("*").where("id", id).first();
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
    const ids = await tables.users().insert(data);
    expect(ids.length).toBe(1);

    const res = await tables
      .users()
      .select("*")
      .whereIn("id", [ids[0], ids[0] + 1]);
    expect(res[0]).toEqual(expect.objectContaining(data[0]));
    expect(res[1]).toEqual(expect.objectContaining(data[1]));
  });
});
