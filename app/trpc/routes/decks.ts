import { validateFn } from "@hiogawa/tiny-rpc";
import { mapOption, tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  PRACTICE_HISTORY_DATASET_KEYS,
  PracticeHistoryChartDataEntry,
} from "../../components/practice-history-chart";
import {
  E,
  T,
  TT,
  db,
  limitOne,
  selectOne,
} from "../../db/drizzle-client.server";
import { DEFAULT_DECK_CACHE, Z_PRACTICE_ACTION_TYPES } from "../../db/types";
import { Z_DATE_RANGE_TYPE } from "../../misc/routes";
import { importDeckJson } from "../../misc/seed-utils";
import { ctx_requireUser } from "../../server/request-context/session";
import {
  PracticeSystem,
  getDailyPracticeStatistics,
  updateDeckCache,
} from "../../utils/practice-system";
import {
  fromTemporal,
  getZonedDateRange,
  toZdt,
} from "../../utils/temporal-utils";
import { middlewares } from "../context";
import { procedureBuilder } from "../factory";

export const trpcRoutesDecks = {
  decks_practiceEntriesCreate: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        videoId: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const rows = await db
        .select()
        .from(T.bookmarkEntries)
        .innerJoin(
          T.captionEntries,
          E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
        )
        .where(E.eq(T.bookmarkEntries.videoId, input.videoId))
        .orderBy(
          E.asc(T.captionEntries.index),
          E.asc(T.bookmarkEntries.offset)
        );
      const bookmarkEntries = rows.map((row) => row.bookmarkEntries);

      const system = new PracticeSystem(ctx.user, deck);
      const practiceEntryIds = await system.createPracticeEntries(
        bookmarkEntries,
        new Date()
      );
      return { practiceEntryIds };
    }),

  decks_practiceActionsCreate: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        practiceEntryId: z.number().int(),
        actionType: Z_PRACTICE_ACTION_TYPES,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const practiceEntry = await selectOne(
        T.practiceEntries,
        E.eq(T.practiceEntries.id, input.practiceEntryId)
      );
      tinyassert(practiceEntry);

      const system = new PracticeSystem(ctx.user, deck);
      await system.createPracticeAction(
        practiceEntry,
        input.actionType,
        new Date()
      );
    }),

  decks_create: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        name: z.string().nonempty(),
        newEntriesPerDay: z.number().int(),
        reviewsPerDay: z.number().int(),
        easeMultiplier: z.number(),
        easeBonus: z.number(),
        randomMode: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [{ insertId: deckId }] = await db.insert(T.decks).values({
        ...input,
        userId: ctx.user.id,
        cache: DEFAULT_DECK_CACHE,
      });
      return { deckId };
    }),

  decks_update: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().nonempty(),
        newEntriesPerDay: z.number().int(),
        reviewsPerDay: z.number().int(),
        randomMode: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.id,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const { id, ...rest } = input;
      await db
        .update(T.decks)
        .set(rest)
        .where(E.and(E.eq(T.decks.id, id)));
      await updateDeckCache(id, {}, {}, "clear");
    }),

  decks_destroy: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        id: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.id,
        userId: ctx.user.id,
      });
      tinyassert(deck);
      await db
        .delete(T.decks)
        .where(
          E.and(E.eq(T.decks.id, input.id), E.eq(T.decks.userId, ctx.user.id))
        );
    }),

  decks_import: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        data: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await importDeckJson(ctx.user.id, JSON.parse(input.data));
    }),

  decks_practiceEntriesCount: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        videoId: z.number().int(),
      })
    )
    .query(async ({ input, ctx }) => {
      const rows = await db
        .select({
          deckId: T.decks.id,
          practiceEntriesCount: sql<number>`COUNT(0)`,
        })
        .from(T.practiceEntries)
        .innerJoin(T.decks, E.eq(T.decks.id, T.practiceEntries.deckId))
        .innerJoin(
          T.bookmarkEntries,
          E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
        )
        .where(
          E.and(
            E.eq(T.decks.userId, ctx.user.id),
            E.eq(T.bookmarkEntries.videoId, input.videoId)
          )
        )
        .groupBy(T.decks.id);

      const decks = await db
        .select()
        .from(T.decks)
        .where(E.eq(T.decks.userId, ctx.user.id))
        .orderBy(E.desc(T.decks.createdAt));

      const results = decks.map((deck) => ({
        deck,
        practiceEntriesCount:
          rows.find((row) => row.deckId === deck.id)?.practiceEntriesCount ?? 0,
      }));

      return results;
    }),

  decks_nextPracticeEntry: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
      })
    )
    .query(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);
      const system = new PracticeSystem(ctx.user, deck);

      const now = new Date();
      const practiceEntry = await system.getNextPracticeEntry(now);
      if (!practiceEntry) {
        return { finished: true } as const;
      }

      const row = await limitOne(
        db
          .select()
          .from(T.bookmarkEntries)
          .innerJoin(
            T.captionEntries,
            E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
          )
          .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
          .where(E.eq(T.bookmarkEntries.id, practiceEntry.bookmarkEntryId))
      );
      tinyassert(row);

      return {
        finished: false,
        practiceEntry,
        bookmarkEntry: row.bookmarkEntries,
        captionEntry: row.captionEntries,
        video: row.videos,
      } as const;
    }),

  decks_practiceStatistics: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        __now: z.date().optional(), // for testing
      })
    )
    .query(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const now = input.__now ?? new Date();
      const startOfToday = fromTemporal(
        toZdt(now, ctx.user.timezone).startOfDay()
      );

      const total = {
        byActionType: deck.cache.practiceActionsCountByActionType,
        byQueueType: deck.cache.practiceEntriesCountByQueueType,
      };

      const daily = await getDailyPracticeStatistics(deck.id, startOfToday);

      return {
        total,
        daily,
      };
    }),

  decks_practiceActions: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        actionType: Z_PRACTICE_ACTION_TYPES.optional(),
        practiceEntryId: z.coerce.number().int().optional(),
        cursor: z.number().int().default(0), // TODO(perf): index cursor instead of limit/offset
      })
    )
    .query(async ({ input, ctx }) => {
      const deck = await findUserDeck({
        deckId: input.deckId,
        userId: ctx.user.id,
      });
      tinyassert(deck);

      const limit = 15;

      // deferred join
      const subQueryIds = db
        .select({ id: T.practiceActions.id })
        .from(T.practiceActions)
        .where(
          E.and(
            E.eq(T.practiceActions.deckId, deck.id),
            mapOption(input.actionType, (t) =>
              E.eq(T.practiceActions.actionType, t)
            ),
            mapOption(input.practiceEntryId, (t) =>
              E.eq(T.practiceActions.practiceEntryId, t)
            )
          )
        )
        .offset(input.cursor)
        .limit(limit)
        .orderBy(E.desc(T.practiceActions.createdAt))
        .as("__subQuery_ids");

      // TODO: sub query can include orphan data
      const rows = await db
        .select()
        .from(T.practiceActions)
        .innerJoin(subQueryIds, E.eq(subQueryIds.id, T.practiceActions.id))
        .innerJoin(
          T.practiceEntries,
          E.eq(T.practiceEntries.id, T.practiceActions.practiceEntryId)
        )
        .innerJoin(
          T.bookmarkEntries,
          E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
        )
        .innerJoin(
          T.captionEntries,
          E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
        )
        .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
        .orderBy(E.desc(T.practiceActions.createdAt));

      const nextCursor = rows.length > 0 ? input.cursor + rows.length : null;
      return { rows, nextCursor };
    }),
};

export const rpcRoutesDecks = {
  decks_practiceStatistics: validateFn(
    z.object({
      deckId: z.number().int(),
      __now: z.date().optional(), // for testing
    })
  )(async (input) => {
    const user = await ctx_requireUser();
    const now = input.__now ?? new Date();
    return getUserDeckPracticeStatistics(user, input.deckId, now);
  }),

  decks_practiceHistoryChart: validateFn(
    z.object({
      deckId: z.number().int(),
      rangeType: Z_DATE_RANGE_TYPE,
      page: z.number().int().optional().default(0), // 0 => this week/month, 1 => last week/month, ...
      __now: z.date().optional(), // for testing
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

    // aggregate count in js
    const rows = await db
      .select()
      .from(T.practiceActions)
      .where(
        E.and(
          E.eq(T.practiceActions.deckId, input.deckId),
          E.gt(T.practiceActions.createdAt, fromTemporal(dateRange.begin)),
          E.lt(T.practiceActions.createdAt, fromTemporal(dateRange.end))
        )
      );

    const countMap = Object.fromEntries(
      dates.map((date) => [date, { date }])
    ) as Record<string, PracticeHistoryChartDataEntry>;

    for (const v of Object.values(countMap)) {
      for (const k of PRACTICE_HISTORY_DATASET_KEYS) {
        v[k] = 0;
      }
    }

    for (const row of rows) {
      const date = toZdt(row.createdAt, user.timezone).toPlainDate().toString();
      countMap[date].total++;
      countMap[date][`queue-${row.queueType}`]++;
      countMap[date][`action-${row.actionType}`]++;
    }

    return Object.values(countMap);
  }),
};

//
// utils
//

function findUserDeck({ deckId, userId }: { deckId: number; userId: number }) {
  return selectOne(
    T.decks,
    E.eq(T.decks.id, deckId),
    E.eq(T.decks.userId, userId)
  );
}

// also used for testing
export async function getUserDeckPracticeStatistics(
  user: Pick<TT["users"], "id" | "timezone">,
  deckId: number,
  now: Date
) {
  const deck = await findUserDeck({
    deckId,
    userId: user.id,
  });
  tinyassert(deck);

  const startOfToday = fromTemporal(toZdt(now, user.timezone).startOfDay());

  const total = {
    byActionType: deck.cache.practiceActionsCountByActionType,
    byQueueType: deck.cache.practiceEntriesCountByQueueType,
  };

  const daily = await getDailyPracticeStatistics(deck.id, startOfToday);

  return {
    total,
    daily,
  };
}
