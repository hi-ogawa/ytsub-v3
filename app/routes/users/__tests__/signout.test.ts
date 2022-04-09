import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { Session } from "@remix-run/server-runtime";
import { beforeAll, describe, expect, it } from "vitest";
import { UserTable, tables } from "../../../db/models";
import { register, signinSession } from "../../../utils/auth";
import { getResponseSession } from "../../../utils/session-utils";
import { commitSession, getSession } from "../../../utils/session.server";
import { testAction } from "../../__tests__/helper";
import { action } from "../signout";

installGlobals();

describe("signout.action", () => {
  // TODO: use `useUser`
  let user: UserTable;
  let userSession: Session;
  const credentials = { username: "root", password: "pass" };

  beforeAll(async () => {
    await tables.users().delete();
    user = await register(credentials);
    userSession = await getSession();
    signinSession(userSession, user);
  });

  describe("success", () => {
    it("basic", async () => {
      const headers = { cookie: await commitSession(userSession) };
      const res = await testAction(action, { headers });

      // redirect to root
      assert.ok(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify empty session user
      const resSession = await getResponseSession(res);
      expect(resSession.data).toMatchInlineSnapshot(`
        {
          "__flash_flashMessages__": [
            {
              "content": "Signed out successfuly",
              "variant": "success",
            },
          ],
        }
      `);
    });
  });

  describe("error", () => {
    it("no-session-user", async () => {
      const res = await testAction(action, {});
      expect(res).toMatchInlineSnapshot(`
        {
          "message": "Invalid sign out",
        }
      `);
    });
  });
});
