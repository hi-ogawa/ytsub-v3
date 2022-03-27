import { describe, expect, it } from "vitest";
import { installGlobals } from "@remix-run/node";
import { loader } from "../setup";
import { testLoader } from "./helper";

installGlobals();

describe("setup.loader", () => {
  it("basic", async () => {
    const res = await testLoader(loader, {
      query: {
        videoId: "MoH8Fk2K9bc",
      },
    });
    expect(res.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("error", async () => {
    await testLoader(loader, { query: { videoId: "xxx" } }).catch(
      async (res: Response) => {
        await expect(res.json()).resolves.toEqual({
          message: "Invalid Video ID",
        });
      }
    );
  });
});
