import { objectOmit, objectPick, tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import type { CaptionEntryTable, VideoTable } from "../../db/models";
import { useVideo } from "../../misc/test-helper";
import { testLoader } from "../../misc/test-helper";
import { deserialize } from "../../utils/controller-utils";
import { loader } from "../videos/$id";

describe("videos/id.loader", () => {
  const videoHook = useVideo();

  it("basic", async () => {
    const res = await testLoader(loader, {
      params: { id: String(videoHook.video.id) },
    });
    tinyassert(res instanceof Response);
    tinyassert(res.ok);

    const resJson: { video: VideoTable; captionEntries: CaptionEntryTable[] } =
      deserialize(await res.json());

    expect(objectPick(resJson.video, ["videoId", "title"]))
      .toMatchInlineSnapshot(`
      {
        "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
        "videoId": "EnPYXckiUVg",
      }
    `);

    expect(
      resJson.captionEntries
        .slice(0, 3)
        .map((e) => objectOmit(e, ["id", "videoId", "createdAt", "updatedAt"]))
    ).toMatchInlineSnapshot(`
      [
        {
          "begin": 0.08,
          "end": 4.19,
          "index": 0,
          "text1": "Salut ! Bonjour à tous, j'espère que vous allez bien.",
          "text2": "Hello ! Hello everyone, I hope you are well.",
        },
        {
          "begin": 4.19,
          "end": 9.93,
          "index": 1,
          "text1": "Aujourd'hui, je vous retrouve pour une nouvelle vidéo avec ma sœur Inès que vous avez déjà",
          "text2": "Today, I am meeting you for a new video with my sister Inès that you have already",
        },
        {
          "begin": 9.93,
          "end": 11.67,
          "index": 2,
          "text1": "vue dans d'autres vidéos.",
          "text2": "seen in other videos.",
        },
      ]
    `);
  });
});
