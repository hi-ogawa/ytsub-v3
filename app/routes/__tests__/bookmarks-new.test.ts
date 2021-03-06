import { describe, expect, it } from "vitest";
import { Q } from "../../db/models";
import { assert } from "../../misc/assert";
import { AppError } from "../../utils/errors";
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
    const res = await testLoader(action, { form: data, transform: signin });
    assert(res instanceof Response);

    const resJson = await res.json();
    expect(resJson.success).toBe(true);

    const id = resJson.data.id;
    assert(typeof id === "number");
    {
      const found = await Q.bookmarkEntries().where("id", id).first();
      assert(found);
      expect(found.text).toBe(data.text);
    }
    {
      const found = await Q.videos().where("id", data.videoId).first();
      assert(found);
      expect(found.bookmarkEntriesCount).toBe(1);
    }
  });

  it("error", async () => {
    const data = {
      videoId: -1, // video not found
      captionEntryId: captionEntries()[0].id,
      text: "Bonjour à tous",
      side: 0,
      offset: 8,
    };
    await expect(
      testLoader(action, { form: data, transform: signin })
    ).rejects.toBeInstanceOf(AppError);
  });
});
