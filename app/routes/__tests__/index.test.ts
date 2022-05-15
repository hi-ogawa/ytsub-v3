import { beforeAll, describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { tinyassert } from "../../misc/tinyassert";
import { loader } from "../index";
import { testLoader } from "./helper";

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
            "data": [],
            "page": 1,
            "perPage": 20,
            "total": 0,
            "totalPage": 0,
          },
        },
      }
    `);
  });
});
