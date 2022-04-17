import { describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { loader } from "../videos/index";
import { testLoader, useUser } from "./helper";

// TODO: use data
describe("videos/index.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await testLoader(loader, { transform: signin });
    assert(res instanceof Response);
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "json": {
          "videos": [],
        },
      }
    `);
  });
});
