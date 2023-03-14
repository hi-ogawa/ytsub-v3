import { tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { loader } from "../decks/index";
import { testLoader, useUser } from "./helper";

// TODO: use data
describe("decks/index.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await testLoader(loader, { transform: signin });
    tinyassert(res instanceof Response);
    expect(await res.json()).toMatchInlineSnapshot(`
      {
        "json": {
          "decks": [],
        },
      }
    `);
  });
});
