import { installGlobals } from "@remix-run/node";
import { omit } from "lodash";
import { describe, expect, it } from "vitest";
import { assert } from "../../misc/assert";
import { deserialize } from "../../utils/controller-utils";
import { loader } from "../videos/$id";
import { useVideo } from "./helper";
import { testLoader } from "./helper";

installGlobals();

describe("videos/id.loader", () => {
  const { video } = useVideo();

  it("basic", async () => {
    const res = await testLoader(loader, {
      params: { id: String(video().id) },
    });
    assert(res instanceof Response);
    const resJson = deserialize(await res.json());
    expect(resJson.video.videoId).toBe("EnPYXckiUVg");
    expect(resJson.video.title).toMatchInlineSnapshot(
      '"Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)"'
    );
    expect(resJson.captionEntries.length).toMatchInlineSnapshot("182");
    expect(
      omit(resJson.captionEntries[0], [
        "id",
        "videoId",
        "createdAt",
        "updatedAt",
      ])
    ).toMatchInlineSnapshot(`
      {
        "begin": 0.08,
        "end": 4.19,
        "text1": "Salut ! Bonjour à tous, j'espère que vous allez bien.",
        "text2": "Hello ! Hello everyone, I hope you are well.",
      }
    `);
  });
});
