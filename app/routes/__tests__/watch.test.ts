import { describe, expect, it } from "vitest";
import { installGlobals } from "@remix-run/node";
import { loader } from "../watch";
import { testLoader } from "./helper";

installGlobals();

describe("watch.loader", () => {
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
    const res = await testLoader(loader, { data });
    const { videoMetadata, captionEntries } = res;
    expect(videoMetadata.videoDetails.videoId).toBe("EnPYXckiUVg");
    expect(videoMetadata.videoDetails.title).toMatchInlineSnapshot(
      '"Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)"'
    );
    expect(captionEntries.length).toMatchInlineSnapshot("182");
    expect(captionEntries[0]).toMatchInlineSnapshot(`
      {
        "begin": 0.08,
        "end": 4.19,
        "text1": "Salut ! Bonjour à tous, j'espère que vous allez bien.",
        "text2": "Hello ! Hello everyone, I hope you are well.",
      }
    `);
  });

  it("error", async () => {
    const data = {
      videoId: "EnPYXckiUVg",
      language1: {
        id: ".frxxx", // non-existant language id
        translation: "",
      },
      language2: {
        id: ".en",
        translation: "",
      },
    };
    await testLoader(loader, { data }).catch(async (res: Response) => {
      await expect(res.json()).resolves.toEqual({
        message: "Invalid parameters",
      });
    });
  });
});
