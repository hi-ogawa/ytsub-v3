import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { omit } from "lodash";
import { describe, expect, it } from "vitest";
import { tables } from "../../db/models";
import { action } from "../videos.new";
import { testAction, useUser } from "./helper";

installGlobals();

describe("videos.new.action", () => {
  const { user, signin } = useUser({ seed: __filename });

  it("basic", async () => {
    const data = {
      videoId: "EnPYXckiUVg",
      language1: {
        id: ".fr",
        translation: "",
      },
      language2: {
        id: ".en",
        translation: "",
      },
    };
    const res = await testAction(action, { data }, signin);

    // persist video
    const video = await tables
      .videos()
      .select("*")
      .where("userId", user().id)
      .first();
    assert.ok(video);
    expect(omit(video, ["id", "userId", "createdAt", "updatedAt"]))
      .toMatchInlineSnapshot(`
      {
        "author": "Piece of French",
        "channelId": "UCVzyfpNuFF4ENY8zNTIW7ug",
        "language1_id": ".fr",
        "language1_translation": "",
        "language2_id": ".en",
        "language2_translation": "",
        "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
        "videoId": "EnPYXckiUVg",
      }
    `);

    // persist caption entries
    const captionEntries = await tables
      .captionEntries()
      .select("*")
      .where("videoId", video.id);
    expect(captionEntries.length).toMatchInlineSnapshot("182");
    expect(omit(captionEntries[0], ["id", "videoId", "createdAt", "updatedAt"]))
      .toMatchInlineSnapshot(`
      {
        "begin": 0.08,
        "end": 4.19,
        "text1": "Salut ! Bonjour à tous, j'espère que vous allez bien.",
        "text2": "Hello ! Hello everyone, I hope you are well.",
      }
    `);

    // redirect
    assert.ok(res instanceof Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`/videos/${video.id}`);
  });
});
