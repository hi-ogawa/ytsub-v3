import { tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { testLoader, useUser } from "../../misc/test-helper";
import { loader } from "./index";

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
          "pagination": {
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
          "rows": [],
        },
      }
    `);
  });
});
