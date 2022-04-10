import * as assert from "assert";
import { installGlobals } from "@remix-run/node";
import { last, omit } from "lodash";
import { beforeAll, describe, expect, it } from "vitest";
import { tables } from "../../db/models";
import { getResponseSession } from "../../utils/session-utils";
import { action, loader } from "../videos/new";
import { testAction, testLoader, useUser } from "./helper";

installGlobals();

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

    assert.ok(res instanceof Response);
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
    const res = await testAction(action, { data }, signin);

    // persist video and caption entries
    const video = await tables
      .videos()
      .select("*")
      .where("userId", user().id)
      .first();
    assert.ok(video);

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
        "language1_translation": "",
        "language2_id": ".en",
        "language2_translation": "",
        "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
        "videoId": "EnPYXckiUVg",
      }
    `);
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
    expect(res.headers.get("location")).toBe(`/videos/${video.id}`);

    // calling with the same parameters doesn't create new video
    const res2 = await testAction(action, { data }, signin);
    assert.ok(res2 instanceof Response);
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
    const res = await testAction(action, { data });
    assert.ok(res instanceof Response);

    const location = res.headers.get("location");
    assert.ok(location);

    const id = last(location.split("/"));
    const video = await tables.videos().select("*").where("id", id).first();
    assert.ok(video);
    expect(video.userId).toBe(null);

    // calling with the same parameters doesn't create new video
    const res2 = await testAction(action, { data });
    assert.ok(res2 instanceof Response);
    expect(res2.headers.get("location")).toBe(`/videos/${video.id}`);
  });
});
