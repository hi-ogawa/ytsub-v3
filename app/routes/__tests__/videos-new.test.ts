import { last, omit } from "lodash";
import { beforeAll, describe, expect, it } from "vitest";
import { tables } from "../../db/models";
import { assert } from "../../misc/assert";
import { getResponseSession } from "../../utils/session-utils";
import { action, loader } from "../videos/new";
import { testLoader, useUser } from "./helper";

describe("videos/new.loader", () => {
  it("basic", async () => {
    const data = { videoId: "MoH8Fk2K9bc" };
    const res = await testLoader(loader, {
      query: data,
    });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("url", async () => {
    const data = { videoId: "https://www.youtube.com/watch?v=MoH8Fk2K9bc" };
    const res = await testLoader(loader, { query: data });
    const resJson = await res.json();
    expect(resJson.videoDetails?.title).toBe(
      "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson"
    );
  });

  it("invalid-input", async () => {
    const data = { videoId: "xxx" };
    const res = await testLoader(loader, { query: data });

    assert(res instanceof Response);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");

    const resSession = await getResponseSession(res);
    expect(resSession.data).toMatchInlineSnapshot(`
      {
        "__flash_flashMessages__": [
          {
            "content": "Invalid input",
            "variant": "error",
          },
        ],
      }
    `);
  });
});

describe("videos/new.action", () => {
  const { user, signin } = useUser({ seed: __filename });

  beforeAll(async () => {
    // cleanup anonymous data
    await tables.videos().delete().where("userId", null);
  });

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
    const res = await testLoader(action, { form: data }, signin);

    // persist video and caption entries
    const video = await tables
      .videos()
      .select("*")
      .where("userId", user().id)
      .first();
    assert(video);

    const captionEntries = await tables
      .captionEntries()
      .select("*")
      .where("videoId", video.id);

    expect(omit(video, ["id", "userId", "createdAt", "updatedAt"]))
      .toMatchInlineSnapshot(`
      {
        "author": "Piece of French",
        "channelId": "UCVzyfpNuFF4ENY8zNTIW7ug",
        "language1_id": ".fr",
        "language1_translation": null,
        "language2_id": ".en",
        "language2_translation": null,
        "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
        "videoId": "EnPYXckiUVg",
      }
    `);
    expect(captionEntries.length).toMatchInlineSnapshot("182");
    expect(
      captionEntries
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

    // redirect
    assert(res instanceof Response);
    expect(res.headers.get("location")).toBe(`/videos/${video.id}`);

    // calling with the same parameters doesn't create new video
    const res2 = await testLoader(action, { form: data }, signin);
    assert(res2 instanceof Response);
    expect(res2.headers.get("location")).toBe(`/videos/${video.id}`);
  });

  it("anonymous", async () => {
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
    const res = await testLoader(action, { form: data });
    assert(res instanceof Response);

    const location = res.headers.get("location");
    assert(location);

    const id = last(location.split("/"));
    const video = await tables.videos().select("*").where("id", id).first();
    assert(video);
    expect(video.userId).toBe(null);

    // calling with the same parameters doesn't create new video
    const res2 = await testLoader(action, { form: data });
    assert(res2 instanceof Response);
    expect(res2.headers.get("location")).toBe(`/videos/${video.id}`);
  });
});
