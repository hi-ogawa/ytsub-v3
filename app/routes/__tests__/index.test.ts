import { tinyassert } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { testLoader } from "../../misc/test-helper";
import { loader } from "../index";

// TODO: use data
describe("index.loader", () => {
  beforeAll(async () => {
    await Q.videos().delete();
  });

  it("basic", async () => {
    const res = await testLoader(loader);
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
          "videos": [],
        },
      }
    `);
  });
});
