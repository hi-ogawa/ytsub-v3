import { omit } from "lodash";
import { describe, expect, it } from "vitest";
import { CaptionEntryTable, Q, VideoTable } from "../../db/models";
import { assert } from "../../misc/assert";
import { deserialize } from "../../utils/controller-utils";
import { action, loader } from "../videos/$id";
import { useUserVideo, useVideo } from "./helper";
import { testLoader } from "./helper";

describe("videos/id.loader", () => {
  const { video } = useVideo();

  it("basic", async () => {
    const res = await testLoader(loader, {
      params: { id: String(video().id) },
    });
    assert(res instanceof Response);
    const resJson: { video: VideoTable; captionEntries: CaptionEntryTable[] } =
      deserialize(await res.json());
    expect(resJson.video.videoId).toBe("EnPYXckiUVg");
    expect(resJson.video.title).toMatchInlineSnapshot(
      '"Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)"'
    );
    expect(resJson.captionEntries.length).toMatchInlineSnapshot("182");
    expect(
      resJson.captionEntries
        .slice(0, 3)
        .map((e) => omit(e, ["id", "videoId", "createdAt", "updatedAt"]))
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
          "text1": "vu dans d'autres vidéos.",
          "text2": "seen in other videos.",
        },
      ]
    `);
  });
});

describe("videos/id.action", () => {
  const { signin, user, video } = useUserVideo(2, {
    seed: __filename + "videos/id.action",
  });

  it("delete", async () => {
    const where = {
      id: video().id,
      userId: user().id,
    };
    expect(Q.videos().where(where).first()).resolves.toBeDefined();

    const res = await testLoader(action, {
      method: "DELETE",
      params: { id: String(video().id) },
      transform: signin,
    });
    const resJson = await res.json();
    expect(resJson).toMatchInlineSnapshot(`
      {
        "success": true,
        "type": "DELETE /videos/\$id",
      }
    `);

    expect(Q.videos().where(where).first()).resolves.toBe(undefined);
  });
});
