import { describe, expect, it } from "vitest";
import { trpc } from "./client";

describe("trpc", () => {
  it("basic", async () => {
    expect(trpc.bookmarks_create.mutationKey).toMatchInlineSnapshot(
      '"bookmarks_create"'
    );

    expect(trpc.bookmarks_create.mutationOptions()).toMatchInlineSnapshot(`
      {
        "mutationFn": [Function],
        "mutationKey": [
          "bookmarks_create",
        ],
      }
    `);

    expect(trpc.decks_practiceEntriesCount.queryKey).toMatchInlineSnapshot(
      '"decks_practiceEntriesCount"'
    );

    expect(trpc.decks_practiceEntriesCount.queryOptions({ videoId: 0 }))
      .toMatchInlineSnapshot(`
      {
        "queryFn": [Function],
        "queryKey": [
          "decks_practiceEntriesCount",
          {
            "videoId": 0,
          },
        ],
      }
    `);
  });
});
