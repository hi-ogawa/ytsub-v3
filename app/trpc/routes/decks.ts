import { groupBy, mapValues, tinyassert } from "@hiogawa/utils";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  PRACTICE_HISTORY_DATASET_KEYS,
  PracticeHistoryChartDataEntry,
} from "../../components/practice-history-chart";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { PRACTICE_ACTION_TYPES, Z_PRACTICE_ACTION_TYPES } from "../../db/types";
import { importDeckJson } from "../../misc/seed-utils";
import { PracticeSystem } from "../../utils/practice-system";
import {
  Z_DATE_RANGE_TYPE,
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

      const practiceEntry = await findOne(
        db
          .select()
          .from(T.practiceEntries)
          .where(E.eq(T.practiceEntries.id, input.practiceEntryId))
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
      const { id, ...rest } = input;
      await db
        .update(T.decks)
        .set(rest)
        .where(E.and(E.eq(T.decks.id, id), E.eq(T.decks.userId, ctx.user.id)));
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

  decks_practiceHistoryChart: procedureBuilder
    .use(middlewares.requireUser)
    .input(
      z.object({
        deckId: z.number().int(),
        rangeType: Z_DATE_RANGE_TYPE,
        page: z.number().int().optional().default(0), // 0 => this week/month, 1 => last week/month, ...
        __now: z.date().optional(), // for testing
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
        const date = toZdt(row.createdAt, ctx.user.timezone)
          .toPlainDate()
          .toString();
        countMap[date].total++;
        countMap[date][`queue-${row.queueType}`]++;
        countMap[date][`action-${row.actionType}`]++;
      }

      return Object.values(countMap);
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

      const rowsToday = await db
        .select()
        .from(T.practiceActions)
        .where(
          E.and(
            E.eq(T.practiceActions.id, deck.id),
            E.gt(T.practiceActions.createdAt, startOfToday)
          )
        );

      const practiceActionsCountByActionTypeToday = mapGroupBy(
        rowsToday,
        (row) => row.actionType,
        (rows) => rows.length
      );

      const practiceActionsCountByQueueTypeToday = mapGroupBy(
        rowsToday,
        (row) => row.queueType,
        (rows) => rows.length
      );

      // TODO: cache counter in deck table column
      // deck.practiceActionsCountByActionType
      const rowsCountByActionType = await db
        .select({
          actionType: T.practiceActions.actionType,
          count: sql<number>`COUNT(0)`,
        })
        .from(T.practiceActions)
        .where(E.and(E.eq(T.practiceActions.id, deck.id)))
        .groupBy(T.practiceActions.actionType);

      const practiceActionsCountByActionType = mapGroupBy(
        rowsCountByActionType,
        (row) => row.actionType,
        ([row]) => row.count
      );

      return {
        practiceEntriesCountByQueueType: deck.practiceEntriesCountByQueueType,
        practiceActionsCountByActionType: toCountObject(
          practiceActionsCountByActionType,
          PRACTICE_ACTION_TYPES
        ),
        practiceActionsCountByQueueTypeToday: toCountObject(
          practiceActionsCountByQueueTypeToday,
          PRACTICE_ACTION_TYPES
        ),
        practiceActionsCountByActionTypeToday: toCountObject(
          practiceActionsCountByActionTypeToday,
          PRACTICE_ACTION_TYPES
        ),
      };
    }),
};

//
// utils
//

function findUserDeck({ deckId, userId }: { deckId: number; userId: number }) {
  return findOne(
    db
      .select()
      .from(T.decks)
      .where(E.and(E.eq(T.decks.id, deckId), E.eq(T.decks.userId, userId)))
  );
}

function mapGroupBy<T, K, V>(
  ls: T[],
  keyFn: (v: T) => K,
  valueFn: (vs: T[]) => V
) {
  return mapValues(groupBy(ls, keyFn), valueFn);
}

function objectFromMapWithDefault<K extends keyof any, V>(
  map: Map<K, V>,
  allKeys: K[],
  defaultValue: V
): Record<K, V> {
  return Object.fromEntries([
    ...allKeys.map((t) => [t, defaultValue]),
    ...map.entries(),
  ]);
}

function toCountObject<K extends keyof any>(
  map: Map<K, number>,
  allKeys: K[]
): Record<K, number> {
  return objectFromMapWithDefault(map, allKeys, 0);
}
