import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { describe, expect, it } from "vitest";
import { getResponseSession } from "../../utils/session-utils";
import { loader } from "../setup";
import { testLoader } from "./helper";

installGlobals();

describe("setup.loader", () => {
  it("basic", async () => {
    const data = { videoId: "MoH8Fk2K9bc" };
    const res = await testLoader(loader, {
      data,
    });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("url", async () => {
    const data = { videoId: "https://www.youtube.com/watch?v=MoH8Fk2K9bc" };
    const res = await testLoader(loader, {
      data,
    });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("invalid-input", async () => {
    const data = { videoId: "xxx" };
    const res = await testLoader(loader, {
      data,
    });

    assert.ok(res instanceof Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");

    const resSession = await getResponseSession(res);
    expect(resSession.data).toMatchInlineSnapshot(`
      {
        "__flash_flashMessages__": [
          {
            "content": "Invalid input",
            "variant": "error",
          },
        ],
      }
    `);
  });
});
