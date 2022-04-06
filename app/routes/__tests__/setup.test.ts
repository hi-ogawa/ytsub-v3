import { installGlobals } from "@remix-run/node";
import { describe, expect, it } from "vitest";
import { loader } from "../setup";
import { testLoader } from "./helper";

installGlobals();

describe("setup.loader", () => {
  it("basic", async () => {
    const res = await testLoader(loader, {
      data: {
        videoId: "MoH8Fk2K9bc",
      },
    });
    expect(res.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("error", async () => {
    await testLoader(loader, { data: { videoId: "xxx" } }).catch(
      async (res: Response) => {
        await expect(res.json()).resolves.toEqual({
          message: "Invalid Video ID",
        });
      }
    );
  });
});
