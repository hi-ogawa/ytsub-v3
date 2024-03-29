import { validateFn } from "@hiogawa/tiny-rpc";
import { mapOption, tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { E, T, db, limitOne, selectOne } from "../../db/drizzle-client.server";
import { Z_DATE_RANGE_TYPE } from "../../misc/routes";
import { ctx_requireUser } from "../../server/request-context/session";
import {
  fromTemporal,
  getZonedDateRange,
  toZdt,
} from "../../utils/temporal-utils";

export const rpcRoutesBookmarks = {
  bookmarks_create: validateFn(
    z.object({
      videoId: z.number().int(),
      captionEntryId: z.number().int(),
      text: z.string().nonempty(),
      side: z.number().refine((v) => v === 0 || v === 1),
      offset: z.number().int(),
    })
  )(async (input) => {
    const user = await ctx_requireUser();
    const found = await limitOne(
      db
        .select()
        .from(T.captionEntries)
        .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
        .where(
          E.and(
            E.eq(T.captionEntries.id, input.captionEntryId),
            E.eq(T.videos.id, input.videoId),
            E.eq(T.videos.userId, user.id)
          )
        )
    );
    tinyassert(found, "not found");

    // insert with counter cache increment
    const [{ insertId }] = await db.insert(T.bookmarkEntries).values({
      ...input,
      userId: user.id,
    });
    await db
      .update(T.videos)
      .set({
        bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1`,
      })
      .where(E.eq(T.videos.id, input.videoId));

    const row = await selectOne(
      T.bookmarkEntries,
      E.eq(T.bookmarkEntries.id, insertId)
    );
    tinyassert(row);
    return row;
  }),

  bookmarks_historyChart: validateFn(
    z.object({
      rangeType: Z_DATE_RANGE_TYPE,
      page: z.coerce.number().int().optional().default(0), // 0 => this week/month, 1 => last week/month, ...
      __now: z.coerce.date().optional(), // for testing
    })
  )(async (input) => {
    const user = await ctx_requireUser();
    const timezone = user.timezone;
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
          E.eq(T.bookmarkEntries.userId, user.id),
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

  bookmarks_index: validateFn(
    z.object({
      q: z.string().optional(),
      cursor: z.number().int().default(0),
    })
  )(async (input) => {
    const user = await ctx_requireUser();
    const limit = 15;

    // deferred join
    const subQueryIds = db
      .select({ id: T.bookmarkEntries.id })
      .from(T.bookmarkEntries)
      .where(
        E.and(
          E.eq(T.bookmarkEntries.userId, user.id),
          // TODO: index
          mapOption(input.q, (v) => E.like(T.bookmarkEntries.text, `%${v}%`))
        )
      )
      .orderBy(E.desc(T.bookmarkEntries.createdAt))
      .offset(input.cursor)
      .limit(limit)
      .as("__subQueryIds");

    const rows = await db
      .select()
      .from(T.bookmarkEntries)
      .innerJoin(subQueryIds, E.eq(subQueryIds.id, T.bookmarkEntries.id))
      .innerJoin(T.videos, E.eq(T.videos.id, T.bookmarkEntries.videoId))
      .innerJoin(
        T.captionEntries,
        E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
      )
      .orderBy(E.desc(T.bookmarkEntries.createdAt));

    const nextCursor = rows.length === limit ? input.cursor + limit : null;
    return { rows, nextCursor };
  }),
};
