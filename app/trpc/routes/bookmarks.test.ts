import { objectPick } from "@hiogawa/utils";
import { beforeAll, describe, expect, it } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import { importSeed } from "../../misc/seed-utils";
import { useUser, useUserVideo } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { rpcRoutes } from "../server-v2";

describe(rpcRoutes.bookmarks_create.name, () => {
  const hook = useUserVideo({
    seed: __filename + "bookmarks_create",
  });

  it("basic", async () => {
    await mockRequestContext({ user: hook.user })(async () => {
      await rpcRoutes.bookmarks_create({
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
  });

  it("error-no-video", async () => {
    await mockRequestContext({ user: hook.user })(async () => {
      await expect(
        rpcRoutes.bookmarks_create({
          videoId: -1, // invalid video id
          captionEntryId: hook.captionEntries[0].id,
          text: "Bonjour à tous",
          side: 0 as const,
          offset: 8,
        })
      ).rejects.toMatchInlineSnapshot("[Error: not found]");
    });
  });

  it("error-no-user", async () => {
    await mockRequestContext()(async () => {
      await expect(
        rpcRoutes.bookmarks_create({
          videoId: -1, // invalid video id
          captionEntryId: hook.captionEntries[0].id,
          text: "Bonjour à tous",
          side: 0 as const,
          offset: 8,
        })
      ).rejects.toMatchInlineSnapshot("[Error: require user]");
    });
  });
});

describe(rpcRoutes.bookmarks_historyChart.name, () => {
  const user = useUser({
    seed: __filename,
  });

  beforeAll(async () => {
    await user.isReady;
    await importSeed(user.data.id);
  });

  it("basic", async () => {
    await mockRequestContext({ user: user.data })(async () => {
      const output = await rpcRoutes.bookmarks_historyChart({
        rangeType: "week",
        page: 3,
        __now: new Date("2023-04-11T12:00:00+09:00"),
      });
      expect(output).toMatchInlineSnapshot(`
        [
          {
            "date": "2023-03-20",
            "total": 0,
          },
          {
            "date": "2023-03-21",
            "total": 29,
          },
          {
            "date": "2023-03-22",
            "total": 37,
          },
          {
            "date": "2023-03-23",
            "total": 15,
          },
          {
            "date": "2023-03-24",
            "total": 12,
          },
          {
            "date": "2023-03-25",
            "total": 0,
          },
          {
            "date": "2023-03-26",
            "total": 14,
          },
        ]
      `);
    });
  });
});
