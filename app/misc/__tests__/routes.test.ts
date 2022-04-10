import { describe, expect, it } from "vitest";
import { R } from "../routes";

describe("routes", () => {
  it("basic", () => {
    expect(R["/videos/new"]).toBe("/videos/new");
    expect(R["/videos/$id"](7)).toBe("/videos/7");
  });

  it("type-error", () => {
    // @ts-expect-error
    expect(R["/video/new"]).toBe(undefined);
  });
});
