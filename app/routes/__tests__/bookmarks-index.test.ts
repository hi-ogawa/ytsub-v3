import { describe, expect, it } from "vitest";
import { tinyassert } from "../../misc/tinyassert";
import { loader } from "../bookmarks/index";
import { testLoader, useUser } from "./helper";

// TODO: use data
describe("bookmarks/index.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await testLoader(loader, { transform: signin });
    tinyassert(res instanceof Response);
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "json": {
          "captionEntries": [],
          "pagination": {
            "data": [],
            "page": 1,
            "perPage": 20,
            "total": 0,
            "totalPage": 0,
          },
          "request": {
            "order": "createdAt",
            "page": 1,
            "perPage": 20,
          },
          "videos": [],
        },
      }
    `);
  });
});
