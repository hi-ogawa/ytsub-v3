import { tinyassert } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { T, db } from "../../db/drizzle-client.server";
import type { UserTable } from "../../db/models";
import { testLoader } from "../../misc/test-helper";
import { getSessionUser, register } from "../../utils/auth";
import { getResponseSession } from "../../utils/session.server";
import { action } from "./signin";

describe("signin.action", () => {
  let user: UserTable;
  const credentials = { username: "root", password: "pass" };

  beforeAll(async () => {
    await db.delete(T.users);
    user = await register(credentials);
  });

  describe("success", () => {
    it("basic", async () => {
      const res = await testLoader(action, { form: credentials });

      // redirect to root
      tinyassert(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify session user
      const session = await getResponseSession(res);
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
      const resJson = await res.json();
      expect(resJson).toMatchInlineSnapshot(`
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
      const resJson = await res.json();
      expect(resJson).toMatchInlineSnapshot(`
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
      const resJson = await res.json();
      expect(resJson).toMatchInlineSnapshot(`
        {
          "message": "Invalid username or password",
          "success": false,
        }
      `);
    });
  });
});
