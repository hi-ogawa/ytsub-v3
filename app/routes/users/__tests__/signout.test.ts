import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { describe, expect, it } from "vitest";
import { getResponseSession } from "../../../utils/session-utils";
import { testAction, useUser } from "../../__tests__/helper";
import { action } from "../signout";

installGlobals();

describe("signout.action", () => {
  const { signin } = useUser({ seed: __filename });

  describe("success", () => {
    it("basic", async () => {
      const res = await testAction(action, {}, signin);

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
