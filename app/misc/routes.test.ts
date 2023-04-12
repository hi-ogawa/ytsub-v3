import { describe, expect, it } from "vitest";
import { $R, R } from "./routes";

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

describe("RouteFormatter", () => {
  // prettier-ignore
  it("basic", () => {
    expect($R["/videos"]()).toMatchInlineSnapshot('"/videos"');
    expect($R["/videos/new"]()).toMatchInlineSnapshot('"/videos/new"');
    expect($R["/videos/new"](null, { videoId: "xxx" })).toMatchInlineSnapshot('"/videos/new?videoId=xxx"');
    expect($R["/decks/$id"]({ id: 1 }, { page: 2 })).toMatchInlineSnapshot('"/decks/1?page=2"');
  });
});
