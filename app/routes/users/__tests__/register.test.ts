import assert = require("assert");
import { beforeEach, describe, expect, it } from "vitest";
import { installGlobals } from "@remix-run/node";
import { action } from "../register";
import { testAction } from "../../__tests__/helper";
import { users } from "../../../db/models";

installGlobals();

describe("register.action", () => {
  beforeEach(async () => {
    await users().truncate();
  });

  describe("success", () => {
    it("basic", async () => {
      const data = {
        username: "root",
        password: "pass",
        passwordConfirmation: "pass",
      };
      const res = await testAction(action, { data });
      const found = await users()
        .select("*")
        .where("username", data.username)
        .first();
      assert.ok(found);
      assert.ok(res instanceof Response);
      expect(found.username).toBe("root");
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");
    });
  });
});
