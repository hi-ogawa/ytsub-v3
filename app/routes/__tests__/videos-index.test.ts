import { describe, expect, it } from "vitest";
import { assertOk } from "../../misc/assert-ok";
import { loader } from "../videos/index";
import { testLoader, useUser } from "./helper";

// TODO: use data
describe("videos/index.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await testLoader(loader, { transform: signin });
    assertOk(res instanceof Response);
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
