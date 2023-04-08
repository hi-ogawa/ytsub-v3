import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
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

// TODO: remove after updating unit test
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
    .set({ bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1` })
    .where(E.eq(T.videos.id, req.videoId));
  return null;
});
