import { objectPick, tinyassert, wrapPromise } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import { action } from "../bookmarks/new";
import { testLoader, useUserVideo } from "./helper";

describe("bookmarks/new.action", () => {
  const { signin, video, captionEntries } = useUserVideo(2, {
    seed: __filename,
  });

  it("basic", async () => {
    const data = {
      videoId: video().id,
      captionEntryId: captionEntries()[0].id,
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
    };
    const res = await testLoader(action, { json: data, transform: signin });
    tinyassert(res instanceof Response);
    tinyassert(res.ok);

    const rows = await db
      .select()
      .from(T.bookmarkEntries)
      .innerJoin(T.videos, E.eq(T.videos.id, T.bookmarkEntries.videoId))
      .where(E.eq(T.videos.id, video().id));
    expect(
      rows.map((row) =>
        objectPick(row.bookmarkEntries, ["text", "side", "offset"])
      )
    ).toMatchInlineSnapshot(`
      [
        {
          "offset": 8,
          "side": 0,
          "text": "Bonjour à tous",
        },
      ]
    `);
  });

  it("error", async () => {
    const data = {
      videoId: -1, // video not found
      captionEntryId: captionEntries()[0].id,
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
    };
    expect(
      await wrapPromise(testLoader(action, { json: data, transform: signin }))
    ).toMatchInlineSnapshot(`
      {
        "ok": false,
        "value": [Error: not found],
      }
    `);
  });
});
