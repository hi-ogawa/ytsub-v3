import { tinyassert } from "@hiogawa/utils";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { testLoader, useUserVideo } from "../../misc/test-helper";
import { zSnapshotType } from "../../misc/test-helper-snapshot";
import { mockRequestContext } from "../../server/request-context/mock";
import { JSON_EXTRA } from "../../utils/json-extra";
import { wrapLoaderV2 } from "../../utils/loader-utils.server";
import { loader } from "./index";

describe("videos/index.loader", () => {
  const hook = useUserVideo({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await mockRequestContext({ user: hook.user })(() =>
      testLoader(wrapLoaderV2(loader))
    );
    tinyassert(res instanceof Response);
    const loaderData = JSON_EXTRA.deserialize(await res.json());

    expect(
      z
        .object({
          currentUser: zSnapshotType,
          videos: z
            .object({
              id: zSnapshotType,
              userId: zSnapshotType,
              createdAt: zSnapshotType,
              updatedAt: zSnapshotType,
            })
            .passthrough()
            .array(),
        })
        .passthrough()
        .parse(loaderData)
    ).toMatchInlineSnapshot(`
      {
        "currentUser": "[Object]",
        "pagination": {
          "page": 1,
          "perPage": 20,
          "total": 1,
          "totalPage": 1,
        },
        "videos": [
          {
            "author": "Piece of French",
            "bookmarkEntriesCount": 0,
            "channelId": "UCVzyfpNuFF4ENY8zNTIW7ug",
            "createdAt": "[Date]",
            "id": "[number]",
            "language1_id": ".fr",
            "language1_translation": null,
            "language2_id": ".en",
            "language2_translation": null,
            "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
            "updatedAt": "[Date]",
            "userId": "[number]",
            "videoId": "EnPYXckiUVg",
          },
        ],
      }
    `);
  });
});
