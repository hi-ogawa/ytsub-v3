import { beforeAll, describe, expect, it } from "vitest";
import { tables } from "../../db/models";
import { assert } from "../../misc/assert";
import { loader } from "../index";
import { testLoader } from "./helper";

// TODO: use data
describe("index.loader", () => {
  beforeAll(async () => {
    await tables.videos().delete();
  });

  it("basic", async () => {
    const res = await testLoader(loader);
    assert(res instanceof Response);
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
