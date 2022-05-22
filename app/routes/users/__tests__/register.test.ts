import { cloneDeep } from "lodash";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Q } from "../../../db/models";
import { assertOk } from "../../../misc/assert-ok";
import type * as env from "../../../misc/env.server";
import { getSessionUser } from "../../../utils/auth";
import { getSession } from "../../../utils/session.server";
import { testLoader } from "../../__tests__/helper";
import { action } from "../register";

// disable recaptcha during this tests
vi.mock("../../../misc/env.server", async () => {
  let actual: typeof env = await vi.importActual("../../../misc/env.server");
  actual = cloneDeep(actual);
  actual.PUBLIC.APP_RECAPTCHA_DISABLED = "1";
  return actual;
});

describe("register.action", () => {
  beforeEach(async () => {
    await Q.users().delete();
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
      const found = await Q.users().where("username", data.username).first();
      assertOk(found);
      expect(found.username).toBe(username);

      // redirect to root
      assertOk(res instanceof Response);
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
        assertOk(res instanceof Response);
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
