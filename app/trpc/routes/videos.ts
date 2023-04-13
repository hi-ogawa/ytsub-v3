import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import {
  Q,
  filterNewVideo,
  insertVideoAndCaptionEntries,
} from "../../db/models";
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

      const video = await Q.videos().where({ id, userId }).first();
      tinyassert(video);

      await Promise.all([
        Q.videos().delete().where({ id, userId }),
        Q.captionEntries().delete().where("videoId", id),
        Q.bookmarkEntries().delete().where("videoId", id),
      ]);
    }),
};
