import { tinyassert } from "@hiogawa/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { T, db } from "../../db/drizzle-client.server";
import { testLoader } from "../../misc/test-helper";
import { findByUsername, getSessionUser } from "../../utils/auth";
import { getResponseSession } from "../../utils/session.server";
import { action } from "./register";

describe("register.action", () => {
  beforeEach(async () => {
    await db.delete(T.users);
  });

  describe("success", () => {
    it("basic", async () => {
      const username = "root";
      const data = {
        username,
        password: "pass",
        passwordConfirmation: "pass",
        recaptchaToken: "",
      };
      const res = await testLoader(action, { form: data });
      const found = await findByUsername(data.username);
      tinyassert(found);
      expect(found.username).toBe(username);
      expect(found.timezone).toBe("+00:00");
      expect(found.createdAt).toEqual(found.updatedAt);
      expect(Math.abs(found.createdAt.getTime() - Date.now())).toBeLessThan(
        // ci flaky if 1000
        5000
      );

      // redirect to root
      tinyassert(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify session user
      const session = await getResponseSession(res);
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
        recaptchaToken: "",
      };
      const res = await testLoader(action, { form: data });
      const resJson = await res.json();
      expect(resJson).toMatchInlineSnapshot(`
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
        recaptchaToken: "",
      };
      const res = await testLoader(action, { form: data });
      const resJson = await res.json();
      expect(resJson).toMatchInlineSnapshot(`
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
        recaptchaToken: "",
      };
      {
        const res = await testLoader(action, { form: data });
        tinyassert(res instanceof Response);
        expect(res.status).toBe(302);
      }
      {
        const res = await testLoader(action, { form: data });
        const resJson = await res.json();
        expect(resJson).toMatchInlineSnapshot(`
          {
            "message": "Username 'root' is already taken",
          }
        `);
      }
    });
  });
});
