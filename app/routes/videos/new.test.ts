import { tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { testLoader } from "../../misc/test-helper";
import { getResponseSession } from "../../utils/session.server";
import { loader } from "./new";

describe("videos/new.loader", () => {
  it("basic", async () => {
    const data = { videoId: "MoH8Fk2K9bc" };
    const res = await testLoader(loader, {
      query: data,
    });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("url", async () => {
    const data = { videoId: "https://www.youtube.com/watch?v=MoH8Fk2K9bc" };
    const res = await testLoader(loader, { query: data });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("invalid-input", async () => {
    const data = { videoId: "xxx" };
    const res = await testLoader(loader, { query: data });

    tinyassert(res instanceof Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");

    const resSession = await getResponseSession(res);
    expect(resSession.data).toMatchInlineSnapshot(`
      {
        "__flash_flash-messages__": [
          {
            "content": "Invalid input",
            "variant": "error",
          },
        ],
      }
    `);
  });
});
