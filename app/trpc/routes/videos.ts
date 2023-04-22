import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { filterNewVideo, insertVideoAndCaptionEntries } from "../../db/models";
import { Z_NEW_VIDEO, fetchCaptionEntries } from "../../utils/youtube";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesVideos = {
  videos_create: procedureBuilder
    .use(middlewares.currentUser)
    .input(Z_NEW_VIDEO)
    .mutation(async ({ input, ctx }) => {
      const [found] = await filterNewVideo(input, ctx.user?.id);
      if (found) {
        return { id: found.id, created: false };
      }
      const data = await fetchCaptionEntries(input);
      const id = await insertVideoAndCaptionEntries(input, data, ctx.user?.id);
      return { id, created: true };
    }),

  videos_destroy: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = input.videoId;
      const userId = ctx.user.id;

      const video = await findOne(
        db
          .select()
          .from(T.videos)
          .where(E.and(E.eq(T.videos.id, id), E.eq(T.videos.userId, userId)))
      );
      tinyassert(video);

      await Promise.all([
        db.delete(T.videos).where(E.eq(T.videos.id, id)),
        db.delete(T.captionEntries).where(E.eq(T.captionEntries.videoId, id)),
        db.delete(T.bookmarkEntries).where(E.eq(T.bookmarkEntries.videoId, id)),
      ]);
    }),

  videos_getCaptionEntries: procedureBuilder
    .input(
      z.object({
        videoId: z.number().int(),
        index: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const found = await findOne(
        db
          .select()
          .from(T.captionEntries)
          .where(
            E.and(
              E.eq(T.captionEntries.videoId, input.videoId),
              E.eq(T.captionEntries.index, input.index)
            )
          )
      );
      tinyassert(found);
      return found;
    }),

  videos_getLastBookmark: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const query = db
        .select()
        .from(T.bookmarkEntries)
        .innerJoin(
          T.captionEntries,
          E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
        )
        .where(
          E.and(
            E.eq(T.bookmarkEntries.videoId, input.videoId),
            E.eq(T.bookmarkEntries.userId, ctx.user.id)
          )
        )
        // TODO: also probably fine to just use E.desc(T.bookmarkEntries.createdAt)
        .orderBy(E.desc(T.captionEntries.index));
      return findOne(query);
    }),
};
