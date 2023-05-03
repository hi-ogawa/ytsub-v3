import { tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import {
  Z_DATE_RANGE_TYPE,
  fromTemporal,
  getZonedDateRange,
  toZdt,
} from "../../utils/temporal-utils";
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
        side: z.number().refine((v) => v === 0 || v === 1),
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
      const [{ insertId }] = await db.insert(T.bookmarkEntries).values({
        ...input,
        userId: ctx.user.id,
      });
      await db
        .update(T.videos)
        .set({
          bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1`,
        })
        .where(E.eq(T.videos.id, input.videoId));

      const row = await findOne(
        db
          .select()
          .from(T.bookmarkEntries)
          .where(E.eq(T.bookmarkEntries.id, insertId))
      );
      tinyassert(row);
      return row;
    }),

  bookmarks_historyChart: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        rangeType: Z_DATE_RANGE_TYPE,
        page: z.coerce.number().int().optional().default(0), // 0 => this week/month, 1 => last week/month, ...
        __now: z.coerce.date().optional(), // for testing
      })
    )
    .query(async ({ input, ctx }) => {
      const timezone = ctx.user.timezone;
      const now = input.__now ?? new Date();
      const dateRange = getZonedDateRange(
        toZdt(now, timezone),
        input.rangeType,
        input.page
      );
      const dates = dateRange.dates.map((d) => d.toPlainDate().toString());

      // aggregate in js
      const rows = await db
        .select()
        .from(T.bookmarkEntries)
        .where(
          E.and(
            E.eq(T.bookmarkEntries.userId, ctx.user.id),
            E.gt(T.bookmarkEntries.createdAt, fromTemporal(dateRange.begin)),
            E.lt(T.bookmarkEntries.createdAt, fromTemporal(dateRange.end))
          )
        );

      const countMap = Object.fromEntries(
        dates.map((date) => [date, { date, total: 0 }])
      );

      // TODO: group by video? language?
      for (const row of rows) {
        const date = toZdt(row.createdAt, timezone).toPlainDate().toString();
        countMap[date].total++;
      }

      return Object.values(countMap);
    }),
};
