import { describe, expect, it } from "@jest/globals";
import { installGlobals } from "@remix-run/node";
import { loader } from "../setup";

installGlobals();

const DUMMY_URL = "http://localhost:3000";

describe("setup.loader", () => {
  it("basic", async () => {
    const res = await loader({
      request: new Request(DUMMY_URL + "/?videoId=MoH8Fk2K9bc"),
      context: {},
      params: {},
    });
    expect(res.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });
});
