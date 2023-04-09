import { objectPick, wrapPromise } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { E, T, db } from "../db/drizzle-client.server";
import { useUserVideo } from "../routes/__tests__/helper";
import { testTrpcClient } from "./test-helper";

describe("createBookmark", () => {
  const hook = useUserVideo({
    seed: __filename,
  });

  it("basic", async () => {
    const trpc = await testTrpcClient({ user: hook.user });
    await trpc.bookmarks_create({
      videoId: hook.video.id,
      captionEntryId: hook.captionEntries[0].id,
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
    });

    const rows = await db
      .select()
      .from(T.bookmarkEntries)
      .innerJoin(T.videos, E.eq(T.videos.id, T.bookmarkEntries.videoId))
      .where(E.eq(T.videos.id, hook.video.id));
    expect(
      rows.map((row) => [
        row.videos.bookmarkEntriesCount,
        objectPick(row.bookmarkEntries, ["text", "side", "offset"]),
      ])
    ).toMatchInlineSnapshot(`
      [
        [
          1,
          {
            "offset": 8,
            "side": 0,
            "text": "Bonjour à tous",
          },
        ],
      ]
    `);
  });

  it("error-no-video", async () => {
    const trpc = await testTrpcClient({ user: hook.user });
    const result = await wrapPromise(
      trpc.bookmarks_create({
        videoId: -1, // invalid video id
        captionEntryId: hook.captionEntries[0].id,
        text: "Bonjour à tous",
        side: 0 as const,
        offset: 8,
      })
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "ok": false,
        "value": [TRPCError: not found],
      }
    `);
  });

  it("error-no-user", async () => {
    const trpc = await testTrpcClient();
    const result = await wrapPromise(
      trpc.bookmarks_create({
        videoId: -1, // invalid video id
        captionEntryId: hook.captionEntries[0].id,
        text: "Bonjour à tous",
        side: 0 as const,
        offset: 8,
      })
    );
    expect(result).toMatchInlineSnapshot(`
      {
        "ok": false,
        "value": [TRPCError: require user],
      }
    `);
  });
});
