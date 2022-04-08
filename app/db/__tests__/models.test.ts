import * as assert from "assert";
import { omit } from "lodash";
import { beforeEach, describe, expect, it } from "vitest";
import { users } from "../models";

describe("models", () => {
  beforeEach(async () => {
    await users().truncate();
  });

  it("basic", async () => {
    const res = await users().select("*");
    expect(res).toMatchInlineSnapshot("[]");
  });

  it("insert", async () => {
    const data = {
      username: "root",
      passwordHash: "xyz",
      language1: "fr",
      language2: "en",
    };
    const [id] = await users().insert(data);
    const res = await users().select("*").where("id", id).first();
    assert.ok(res);
    assert.strict.deepEqual(omit(res, ["id", "createdAt", "updatedAt"]), data);
  });
});
