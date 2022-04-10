import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { beforeAll, describe, expect, it } from "vitest";
import { UserTable, tables } from "../../../db/models";
import { getSessionUser, register } from "../../../utils/auth";
import { getSession } from "../../../utils/session.server";
import { testLoader } from "../../__tests__/helper";
import { action } from "../signin";

installGlobals();

describe("signin.action", () => {
  let user: UserTable;
  const credentials = { username: "root", password: "pass" };

  beforeAll(async () => {
    await tables.users().delete();
    user = await register(credentials);
  });

  describe("success", () => {
    it("basic", async () => {
      const res = await testLoader(action, { form: credentials });

      // redirect to root
      assert.ok(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify session user
      const session = await getSession(res.headers.get("set-cookie"));
      const sessionUser = await getSessionUser(session);
      expect(sessionUser).toEqual(user);
    });
  });

  describe("error", () => {
    it("format", async () => {
      const data = {
        username: "r@@t",
        password: "pass",
      };
      const res = await testLoader(action, { form: data });
      expect(res).toMatchInlineSnapshot(`
        {
          "message": "Invalid sign in",
          "success": false,
        }
      `);
    });

    it("not-found", async () => {
      const data = {
        ...credentials,
        username: "no-such-root",
      };
      const res = await testLoader(action, { form: data });
      expect(res).toMatchInlineSnapshot(`
        {
          "message": "Invalid username or password",
          "success": false,
        }
      `);
    });

    it("wonrg-password", async () => {
      const data = {
        ...credentials,
        password: "no-such-pass",
      };
      const res = await testLoader(action, { form: data });
      expect(res).toMatchInlineSnapshot(`
        {
          "message": "Invalid username or password",
          "success": false,
        }
      `);
    });
  });
});
