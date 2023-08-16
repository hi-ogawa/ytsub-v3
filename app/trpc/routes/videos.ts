import { TinyRpcRoutes, validateFn } from "@hiogawa/tiny-rpc";
import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { E, T, db, limitOne, selectOne } from "../../db/drizzle-client.server";
import { filterNewVideo, insertVideoAndCaptionEntries } from "../../db/helper";
import { CACHE_CONTROL } from "../../server/request-context/response-headers";
import { getRequestContext } from "../../server/request-context/storage";
import { Z_CAPTION_ENTRY } from "../../utils/types";
import {
  Z_NEW_VIDEO,
  fetchCaptionEntries,
  fetchTtmlEntries,
  fetchVideoMetadata,
} from "../../utils/youtube";
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

  videos_createDirect: procedureBuilder
    .use(middlewares.currentUser)
    .input(
      Z_NEW_VIDEO.merge(
        z.object({
          captionEntries: Z_CAPTION_ENTRY.array(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const id = await insertVideoAndCaptionEntries(
        input,
        {
          videoMetadata: await fetchVideoMetadata(input.videoId),
          captionEntries: input.captionEntries,
        },
        ctx.user?.id
      );
      return { id };
    }),

  videos_fetchTtmlEntries: procedureBuilder
    .input(
      z.object({
        videoId: z.string(),
        language: z.object({
          id: z.string(),
          translation: z.string().optional(),
        }),
      })
    )
    .query(async ({ input }) => {
      const videoMetadata = await fetchVideoMetadata(input.videoId);
      const ttmlEntries = await fetchTtmlEntries(input.language, videoMetadata);
      return ttmlEntries;
    }),

  videos_destroy: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const video = await findUserVideo({
        videoId: input.videoId,
        userId: ctx.user.id,
      });
      tinyassert(video);

      // TODO: support deleting videos with associated bookmarkEntries and practiceEntries
      const found = await selectOne(
        T.bookmarkEntries,
        E.eq(T.bookmarkEntries.videoId, input.videoId)
      );
      tinyassert(
        !found,
        "You cannot delete a video when it has associated bookmarks."
      );

      await Promise.all([
        db.delete(T.videos).where(E.eq(T.videos.id, input.videoId)),
        db
          .delete(T.captionEntries)
          .where(E.eq(T.captionEntries.videoId, input.videoId)),
      ]);
    }),

  videos_getBookmarkEntries: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .query(async ({ input, ctx }) => {
      const video = await findUserVideo({
        videoId: input.videoId,
        userId: ctx.user.id,
      });
      tinyassert(video);

      const rows = await db
        .select()
        .from(T.bookmarkEntries)
        .where(
          E.and(
            E.eq(T.bookmarkEntries.userId, ctx.user.id),
            E.eq(T.bookmarkEntries.videoId, input.videoId)
          )
        );
      return rows;
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
      return limitOne(query);
    }),
};

export const rpcRoutesVideos = {
  videos_getCaptionEntries: validateFn(
    z.object({
      videoId: z.number().int(),
    })
  )(async (input) => {
    const video = await selectOne(T.videos, E.eq(T.videos.id, input.videoId));
    tinyassert(video);

    const rows = await db
      .select()
      .from(T.captionEntries)
      .where(E.eq(T.captionEntries.videoId, input.videoId))
      .orderBy(T.captionEntries.index);
    getRequestContext().setResponseHeader("cache-control", CACHE_CONTROL.cdn);
    return rows;
  }),
  // ts-prune-ignore-next (satisfies unsupported)
} satisfies TinyRpcRoutes;

//
// utils
//

function findUserVideo({
  videoId,
  userId,
}: {
  videoId: number;
  userId: number;
}) {
  return selectOne(
    T.videos,
    E.eq(T.videos.id, videoId),
    E.eq(T.videos.userId, userId)
  );
}
