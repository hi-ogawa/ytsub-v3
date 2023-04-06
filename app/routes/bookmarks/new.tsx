import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";

//
// action
//

const Z_NEW_BOOKMARK = z.object({
  videoId: z.number().int(),
  captionEntryId: z.number().int(),
  text: z.string().nonempty(),
  side: z.union([z.literal(0), z.literal(1)]),
  offset: z.number().int(),
});

type NewBookmark = z.infer<typeof Z_NEW_BOOKMARK>;

export const action = makeLoader(Controller, async function () {
  const req = Z_NEW_BOOKMARK.parse(await this.request.json());

  const user = await this.currentUser();
  tinyassert(user);

  const found = await findOne(
    db
      .select()
      .from(T.captionEntries)
      .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
      .where(
        E.and(
          E.eq(T.captionEntries.id, req.captionEntryId),
          E.eq(T.videos.id, req.videoId),
          E.eq(T.videos.userId, user.id)
        )
      )
  );
  tinyassert(found, "not found");

  // insert with counter cache increment
  await db.insert(T.bookmarkEntries).values({
    ...req,
    userId: user.id,
  });
  await db
    .update(T.videos)
    .set({ bookmarkEntriesCount: found.videos.bookmarkEntriesCount + 1 })
    .where(E.eq(T.videos.id, req.videoId));
  return null;
});

// client query
export function createNewBookmarkMutation() {
  const url = R["/bookmarks/new"];
  return {
    mutationKey: [url],
    mutationFn: async (req: NewBookmark) => {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
    },
  };
}
