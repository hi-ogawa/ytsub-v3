import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesBookmarks = {
  bookmarks_create: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
        captionEntryId: z.number().int(),
        text: z.string().nonempty(),
        side: z.union([z.literal(0), z.literal(1)]),
        offset: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const found = await findOne(
        db
          .select()
          .from(T.captionEntries)
          .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
          .where(
            E.and(
              E.eq(T.captionEntries.id, input.captionEntryId),
              E.eq(T.videos.id, input.videoId),
              E.eq(T.videos.userId, ctx.user.id)
            )
          )
      );
      tinyassert(found, "not found");

      // insert with counter cache increment
      await db.insert(T.bookmarkEntries).values({
        ...input,
        userId: ctx.user.id,
      });
      await db
        .update(T.videos)
        .set({
          bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1`,
        })
        .where(E.eq(T.videos.id, input.videoId));
    }),
};
