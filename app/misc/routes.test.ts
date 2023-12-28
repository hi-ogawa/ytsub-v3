import { describe, expect, it } from "vitest";
import { $R } from "#misc/routes";

describe("RouteFormatter", () => {
  // prettier-ignore
  it("basic", () => {
    expect($R["/videos"]()).toMatchInlineSnapshot('"/videos"');
    expect($R["/videos/new"]()).toMatchInlineSnapshot('"/videos/new"');
    expect($R["/videos/new"](null, { videoId: "xxx" })).toMatchInlineSnapshot('"/videos/new?videoId=xxx"');
    expect($R["/decks/$id"]({ id: 1 }, { page: 2 })).toMatchInlineSnapshot('"/decks/1?page=2"');
  });
});
