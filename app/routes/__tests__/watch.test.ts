import { describe, expect, it } from "@jest/globals";
import { installGlobals } from "@remix-run/node";
import { loader } from "../watch";
import { testLoader } from "./helper";

installGlobals();

describe("watch.loader", () => {
  it("basic", async () => {
    const query = {
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
    const res = await testLoader(loader, { query });
    const { videoMetadata, captionEntries } = res;
    expect(videoMetadata.videoDetails.videoId).toBe("EnPYXckiUVg");
    expect(videoMetadata.videoDetails.title).toBe(
      "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)"
    );
    expect(captionEntries.length).toBe(182);
    expect(captionEntries[0]).toEqual({
      begin: 0.08,
      end: 4.19,
      text1: "Salut ! Bonjour à tous, j'espère que vous allez bien.",
      text2: "Hello ! Hello everyone, I hope you are well.",
    });
  });

  it("error", async () => {
    const query = {
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
    await testLoader(loader, { query }).catch((error: any) => {
      expect(error).toBeInstanceOf(Error);
    });
  });
});
