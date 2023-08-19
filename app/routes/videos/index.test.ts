import { tinyassert } from "@hiogawa/utils";
import { deserialize } from "superjson";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { testLoader, useUserVideo } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { loader } from "./index";

describe("videos/index.loader", () => {
  const hook = useUserVideo({
    seed: __filename,
  });

  it("basic", async () => {
    const res = await mockRequestContext({ user: hook.user })(() =>
      testLoader(loader)
    );
    tinyassert(res instanceof Response);
    const loaderData = deserialize(await res.json());

    const cleanSnapshot = z
      .object({
        videos: z
          .object({
            id: z.number().transform(() => "..."),
            userId: z.number().transform(() => "..."),
            createdAt: z.date().transform(() => "..."),
            updatedAt: z.date().transform(() => "..."),
          })
          .passthrough()
          .array(),
      })
      .passthrough();

    expect(cleanSnapshot.parse(loaderData)).toMatchInlineSnapshot(`
      {
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
            "createdAt": "...",
            "id": "...",
            "language1_id": ".fr",
            "language1_translation": null,
            "language2_id": ".en",
            "language2_translation": null,
            "title": "Are French People Really That Mean?! // French Girls React to Emily In Paris (in FR w/ FR & EN subs)",
            "updatedAt": "...",
            "userId": "...",
            "videoId": "EnPYXckiUVg",
          },
        ],
      }
    `);
  });
});
