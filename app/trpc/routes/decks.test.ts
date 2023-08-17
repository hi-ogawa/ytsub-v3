import { objectPick } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import { importSeed } from "../../misc/seed-utils";
import { useUser, useUserVideo } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { trpc } from "../client";
import { rpcRoutes } from "../server-v2";
import { testTrpcClient } from "../test-helper";

describe(trpc.decks_practiceEntriesCount.queryKey, () => {
  const hook = useUserVideo({
    seed: __filename + "bookmarks_create",
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
    await expect(
      trpc.bookmarks_create({
        videoId: -1, // invalid video id
        captionEntryId: hook.captionEntries[0].id,
        text: "Bonjour à tous",
        side: 0 as const,
        offset: 8,
      })
    ).rejects.toMatchInlineSnapshot("[TRPCError: not found]");
  });

  it("error-no-user", async () => {
    const trpc = await testTrpcClient();
    await expect(
      trpc.bookmarks_create({
        videoId: -1, // invalid video id
        captionEntryId: hook.captionEntries[0].id,
        text: "Bonjour à tous",
        side: 0 as const,
        offset: 8,
      })
    ).rejects.toMatchInlineSnapshot("[TRPCError: require user]");
  });
});

describe(rpcRoutes.decks_practiceHistoryChart.name, () => {
  const user = useUser({
    seed: __filename,
  });
  let deckId: number;

  beforeAll(async () => {
    await user.isReady;
    deckId = await importSeed(user.data.id);
  });

  it("week", async () => {
    await mockRequestContext({ user: user.data })(async () => {
      const output = await rpcRoutes.decks_practiceHistoryChart({
        deckId,
        rangeType: "week",
        page: 3,
        __now: new Date("2023-04-11T12:00:00+09:00"),
      });
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "action-AGAIN": 7,
            "action-EASY": 0,
            "action-GOOD": 1,
            "action-HARD": 1,
            "date": "2023-03-20",
            "queue-LEARN": 4,
            "queue-NEW": 4,
            "queue-REVIEW": 1,
            "total": 9,
          },
          {
            "action-AGAIN": 13,
            "action-EASY": 0,
            "action-GOOD": 3,
            "action-HARD": 6,
            "date": "2023-03-21",
            "queue-LEARN": 2,
            "queue-NEW": 20,
            "queue-REVIEW": 0,
            "total": 22,
          },
          {
            "action-AGAIN": 0,
            "action-EASY": 0,
            "action-GOOD": 0,
            "action-HARD": 0,
            "date": "2023-03-22",
            "queue-LEARN": 0,
            "queue-NEW": 0,
            "queue-REVIEW": 0,
            "total": 0,
          },
          {
            "action-AGAIN": 17,
            "action-EASY": 0,
            "action-GOOD": 7,
            "action-HARD": 6,
            "date": "2023-03-23",
            "queue-LEARN": 8,
            "queue-NEW": 19,
            "queue-REVIEW": 3,
            "total": 30,
          },
          {
            "action-AGAIN": 0,
            "action-EASY": 0,
            "action-GOOD": 0,
            "action-HARD": 0,
            "date": "2023-03-24",
            "queue-LEARN": 0,
            "queue-NEW": 0,
            "queue-REVIEW": 0,
            "total": 0,
          },
          {
            "action-AGAIN": 10,
            "action-EASY": 0,
            "action-GOOD": 7,
            "action-HARD": 6,
            "date": "2023-03-25",
            "queue-LEARN": 1,
            "queue-NEW": 21,
            "queue-REVIEW": 1,
            "total": 23,
          },
          {
            "action-AGAIN": 12,
            "action-EASY": 0,
            "action-GOOD": 9,
            "action-HARD": 5,
            "date": "2023-03-26",
            "queue-LEARN": 2,
            "queue-NEW": 24,
            "queue-REVIEW": 0,
            "total": 26,
          },
        ]
      `);
    });
  });

  it("month", async () => {
    await mockRequestContext({ user: user.data })(async () => {
      const output = await rpcRoutes.decks_practiceHistoryChart({
        deckId,
        rangeType: "month",
        page: 1,
        __now: new Date("2023-04-11T12:00:00+09:00"),
      });
      expect(output.length).toMatchInlineSnapshot("31");
      expect(output.slice(0, 2)).toMatchInlineSnapshot(`
        [
          {
            "action-AGAIN": 0,
            "action-EASY": 0,
            "action-GOOD": 0,
            "action-HARD": 0,
            "date": "2023-03-01",
            "queue-LEARN": 0,
            "queue-NEW": 0,
            "queue-REVIEW": 0,
            "total": 0,
          },
          {
            "action-AGAIN": 0,
            "action-EASY": 0,
            "action-GOOD": 0,
            "action-HARD": 0,
            "date": "2023-03-02",
            "queue-LEARN": 0,
            "queue-NEW": 0,
            "queue-REVIEW": 0,
            "total": 0,
          },
        ]
      `);
      expect(output.slice(-2)).toMatchInlineSnapshot(`
        [
          {
            "action-AGAIN": 13,
            "action-EASY": 0,
            "action-GOOD": 4,
            "action-HARD": 3,
            "date": "2023-03-30",
            "queue-LEARN": 2,
            "queue-NEW": 18,
            "queue-REVIEW": 0,
            "total": 20,
          },
          {
            "action-AGAIN": 8,
            "action-EASY": 0,
            "action-GOOD": 3,
            "action-HARD": 2,
            "date": "2023-03-31",
            "queue-LEARN": 1,
            "queue-NEW": 10,
            "queue-REVIEW": 2,
            "total": 13,
          },
        ]
      `);
    });
  });
});
