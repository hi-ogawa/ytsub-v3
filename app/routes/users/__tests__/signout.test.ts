import { describe, expect, it } from "vitest";
import { assert } from "../../../misc/assert";
import { getResponseSession } from "../../../utils/session-utils";
import { testLoader, useUser } from "../../__tests__/helper";
import { action } from "../signout";

describe("signout.action", () => {
  const { signin } = useUser({ seed: __filename });

  describe("success", () => {
    it("basic", async () => {
      const res = await testLoader(action, {}, signin);

      // redirect to root
      assert(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify empty session user
      const resSession = await getResponseSession(res);
      expect(resSession.data).toMatchInlineSnapshot(`
        {
          "__flash_flash-messages__": [
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
      const res = await testLoader(action, {});

      // redirect to root
      assert(res instanceof Response);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/");

      // verify empty session user
      const resSession = await getResponseSession(res);
      expect(resSession.data).toMatchInlineSnapshot(`
        {
          "__flash_flash-messages__": [
            {
              "content": "Not signed in",
              "variant": "error",
            },
          ],
        }
      `);
    });
  });
});
