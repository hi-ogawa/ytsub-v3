import { describe, expect, it } from "vitest";
import { users } from "../models";

describe("models", () => {
  it("basic", async () => {
    await users().truncate();
    const res = await users().select("*");
    expect(res).toMatchInlineSnapshot('[]');
  });
});
