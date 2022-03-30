import { describe, expect, it } from "vitest";
import { client } from "../client.server";

describe("client", () => {
  it("basic", async () => {
    const [res] = await client.raw("select 1 + 1");
    expect(res).toMatchInlineSnapshot(`
      [
        {
          "1 + 1": 2,
        },
      ]
    `);
  });
});
