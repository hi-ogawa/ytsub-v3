import { installGlobals } from "@remix-run/node";
import { beforeEach, describe, expect, it } from "vitest";
import { tables } from "../../../db/models";
import { assert } from "../../../misc/assert";
import { getSessionUser } from "../../../utils/auth";
import { getSession } from "../../../utils/session.server";
import { testLoader } from "../../__tests__/helper";
import { action } from "../register";

installGlobals();

describe("register.action", () => {
  beforeEach(async () => {
    await tables.users().delete();
  });

  describe("success", () => {
    it("basic", async () => {
      const username = "root";
      const data = {
        username,
        password: "pass",
        passwordConfirmation: "pass",
      };
      const res = await testLoader(action, { form: data });
      const found = await tables
        .users()
        .select("*")
        .where("username", data.username)
        .first();
      assert(found);
      expect(found.username).toBe(username);

      // redirect to root
      assert(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify session user
      const session = await getSession(res.headers.get("set-cookie"));
      const sessionUser = await getSessionUser(session);
      expect(sessionUser).toEqual(found);
    });
  });

  describe("error", () => {
    it("username format", async () => {
      const data = {
        username: "r@@t",
        password: "pass",
        passwordConfirmation: "pass",
      };
      const res = await testLoader(action, { form: data });
      expect(res).toMatchInlineSnapshot(`
        {
          "errors": {
            "fieldErrors": {
              "username": [
                "Invalid",
              ],
            },
            "formErrors": [],
          },
          "message": "Invalid registration",
        }
      `);
    });

    it("password confirmation", async () => {
      const data = {
        username: "root",
        password: "pass",
        passwordConfirmation: "ssap",
      };
      const res = await testLoader(action, { form: data });
      expect(res).toMatchInlineSnapshot(`
        {
          "errors": {
            "fieldErrors": {
              "passwordConfirmation": [
                "Invalid",
              ],
            },
            "formErrors": [],
          },
          "message": "Invalid registration",
        }
      `);
    });

    it("unique username", async () => {
      const data = {
        username: "root",
        password: "pass",
        passwordConfirmation: "pass",
      };
      {
        const res = await testLoader(action, { form: data });
        assert(res instanceof Response);
        expect(res.status).toBe(302);
      }
      {
        const res = await testLoader(action, { form: data });
        expect(res).toMatchInlineSnapshot(`
          {
            "message": "Username 'root' is already taken",
          }
        `);
      }
    });
  });
});
