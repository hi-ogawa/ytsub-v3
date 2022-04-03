import * as assert from "assert/strict";
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

  describe("settings", () => {
    it("non-empty", async () => {
      const data = {
        username: "root",
        passwordHash: "xyz",
        settings: {
          hello: "world",
          x: [0, 1, 2, "y"],
        } as any,
      };
      const [id] = await users().insert(data);
      const res = await users().select("*").where("id", id).first();
      assert.ok(res);
      assert.deepEqual(res.settings, data.settings);
    });

    it("empty", async () => {
      const data = {
        username: "root",
        passwordHash: "xyz",
      };
      const [id] = await users().insert(data);
      const res = await users().select("*").where("id", id).first();
      assert.ok(res);
      assert.deepEqual(res.settings, {});
    });
  });
});
