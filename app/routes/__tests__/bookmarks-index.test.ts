import { describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { loader } from "../bookmarks/index";
import { testLoader, useUser } from "./helper";

// TODO: use data
describe("bookmarks/index.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await testLoader(loader, { transform: signin });
    assert(res instanceof Response);
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "json": {
          "bookmarkEntries": [],
          "captionEntries": [],
          "page": 1,
          "perPage": 20,
          "total": 0,
          "totalPage": 0,
          "videos": [],
        },
      }
    `);
  });
});
