import { tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { AnyColumn, GetColumnData, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm/sql";
import { difference, range } from "lodash";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  UserTable,
} from "../db/models";
import {
  PRACTICE_ACTION_TYPES,
  PRACTICE_QUEUE_TYPES,
  PracticeActionType,
  PracticeQueueType,
} from "../db/types";
import { mapGroupBy, objectFromMap, objectFromMapDefault } from "./misc";
import { fromTemporal, toInstant, toZdt } from "./temporal-utils";

const QUEUE_RULES: Record<
  PracticeQueueType,
  Record<PracticeActionType, PracticeQueueType>
> = {
  NEW: {
    AGAIN: "LEARN",
    HARD: "LEARN",
    GOOD: "LEARN",
    EASY: "REVIEW",
  },
  LEARN: {
    AGAIN: "LEARN",
    HARD: "LEARN",
    GOOD: "REVIEW",
    EASY: "REVIEW",
  },
  REVIEW: {
    AGAIN: "LEARN",
    HARD: "REVIEW",
    GOOD: "REVIEW",
    EASY: "REVIEW",
  },
};

const SCHEDULE_RULES: Record<
  PracticeQueueType,
  Record<PracticeActionType, Temporal.DurationLike>
> = {
  NEW: {
    AGAIN: { minutes: 1 },
    HARD: { minutes: 5 },
    GOOD: { days: 1 },
    EASY: { days: 1 },
  },
  LEARN: {
    AGAIN: { minutes: 1 },
    HARD: { minutes: 5 },
    GOOD: { days: 1 },
    EASY: { days: 1 },
  },
  REVIEW: {
    AGAIN: { minutes: 10 },
    HARD: { hours: 1 },
    GOOD: { days: 1 },
    EASY: { days: 1 },
  },
};

export class PracticeSystem {
  constructor(private user: UserTable, private deck: DeckTable) {}

  async getNextPracticeEntry(
    now: Date = new Date()
  ): Promise<PracticeEntryTable | undefined> {
    if (this.deck.randomMode) {
      const { query } = queryNextPracticeEntryRandomMode(
        this.deck.id,
        now,
        this.deck.updatedAt.getTime()
      );
      const entry = await findOne(query);
      return entry;
    }

    const [daily, entries] = await Promise.all([
      getDailyPracticeStatistics(
        this.deck.id,
        fromTemporal(toZdt(now, this.user.timezone).startOfDay())
      ),
      getNextScheduledPracticeEntries(this.deck.id, now),
    ]);

    if (daily.byQueueType.NEW < this.deck.newEntriesPerDay && entries.NEW) {
      return entries.NEW;
    }

    if (entries.LEARN) {
      return entries.LEARN;
    }

    if (daily.byQueueType.REVIEW < this.deck.reviewsPerDay && entries.REVIEW) {
      return entries.REVIEW;
    }

    return;
  }

  async createPracticeEntries(
    bookmarkEntries: BookmarkEntryTable[],
    now: Date = new Date()
  ): Promise<number[]> {
    const deckId = this.deck.id;
    // Prevent duplicates on applicatoin level (TODO: probably looks less surprising to do this outside...)
    const bookmarkEntryIds = bookmarkEntries.map((e) => e.id);
    const rows = await db
      .select({ id: T.practiceEntries.bookmarkEntryId })
      .from(T.practiceEntries)
      .where(
        E.and(
          E.eq(T.practiceEntries.deckId, this.deck.id),
          E.inArray(T.practiceEntries.bookmarkEntryId, bookmarkEntryIds)
        )
      );
    const dupIds = rows.map((row) => row.id);
    const newIds = difference(bookmarkEntryIds, dupIds);
    if (newIds.length === 0) {
      return [];
    }
    const [{ insertId }] = await db.insert(T.practiceEntries).values(
      ...newIds.map((bookmarkEntryId) => ({
        deckId,
        bookmarkEntryId,
        queueType: "NEW" as const,
        easeFactor: 1,
        scheduledAt: now,
        practiceActionsCount: 0,
      }))
    );
    await updateDeckCache(deckId, { NEW: newIds.length }, {});
    return range(insertId, insertId + newIds.length);
  }

  async createPracticeAction(
    practiceEntry: PracticeEntryTable,
    actionType: PracticeActionType,
    now: Date = new Date()
  ): Promise<number> {
    const { easeMultiplier, easeBonus } = this.deck;
    const userId = this.user.id;
    const {
      id: practiceEntryId,
      queueType,
      easeFactor,
      deckId,
    } = practiceEntry;

    // sql: create practiceAction
    const queryCreatePracticeAction = db.insert(T.practiceActions).values({
      queueType: queueType,
      actionType,
      userId,
      deckId,
      practiceEntryId,
    });

    // update schedule
    let delta = Temporal.Duration.from(
      SCHEDULE_RULES[queueType][actionType]
    ).total({ unit: "second" });
    if (queueType === "REVIEW") {
      delta *= practiceEntry.easeFactor;
    }
    const newScheduledAt = fromTemporal(toInstant(now).add({ seconds: delta }));

    // update queue type
    const newQueueType = QUEUE_RULES[queueType][actionType];

    // update ease factor
    let newEaseFactor = easeFactor;
    if (newQueueType === "REVIEW") {
      newEaseFactor *= easeMultiplier;
      if (actionType === "EASY") {
        newEaseFactor *= easeBonus;
      }
    }
    if (actionType === "AGAIN") {
      newEaseFactor = 1;
    }

    // sql: update practiceEntry
    const queryUpdatePracticeEntry = db
      .update(T.practiceEntries)
      .set({
        queueType: newQueueType,
        easeFactor: newEaseFactor,
        scheduledAt: newScheduledAt,
        practiceActionsCount: sql<number>`${T.practiceEntries.practiceActionsCount} + 1`,
      })
      .where(E.eq(T.practiceEntries.id, practiceEntryId));

    // sql: update decks.cache
    const queryUpdateDeck = updateDeckCache(
      deckId,
      {
        [queueType]: queueType !== newQueueType ? -1 : 0,
        [newQueueType]: queueType !== newQueueType ? 1 : 0,
      },
      {
        [actionType]: 1,
      }
    );

    const [[{ insertId }]] = await Promise.all([
      queryCreatePracticeAction,
      queryUpdatePracticeEntry,
      queryUpdateDeck,
    ]);
    return insertId;
  }
}

export async function updateDeckCache(
  deckId: number,
  byQueueType: Partial<Record<PracticeQueueType, number>>,
  byActionType: Partial<Record<PracticeActionType, number>>
): Promise<void> {
  await db
    .update(T.decks)
    .set({
      cache: sqlJsonSetByExtract(
        T.decks.cache,
        ...Object.entries(byQueueType).map(
          ([k, v]) =>
            [
              `$.practiceEntriesCountByQueueType.${k}`,
              (prev: SQL) => sql`${prev} + ${v}`,
            ] as const
        ),
        ...Object.entries(byActionType).map(
          ([k, v]) =>
            [
              `$."practiceActionsCountByActionType"."${k}"`,
              (prev: SQL) => sql`${prev} + ${v}`,
            ] as const
        )
      ),
    })
    .where(E.eq(T.decks.id, deckId));
}

export async function resetDeckCache(deckId: number) {
  const rowsByQueue = await db
    .select({
      queueType: T.practiceEntries.queueType,
      count: sql<number>`COUNT(0)`,
    })
    .from(T.practiceEntries)
    .where(E.eq(T.practiceEntries.deckId, deckId))
    .groupBy(T.practiceEntries.queueType);

  const rowsByAction = await db
    .select({
      actionType: T.practiceActions.actionType,
      count: sql<number>`COUNT(0)`,
    })
    .from(T.practiceActions)
    .where(E.eq(T.practiceActions.deckId, deckId))
    .groupBy(T.practiceActions.actionType);

  await db
    .update(T.decks)
    .set({
      cache: sqlJsonSetByObject(T.decks.cache, {
        nextEntriesRandomMode: [],
        practiceEntriesCountByQueueType: objectFromMapDefault(
          mapGroupBy(
            rowsByQueue,
            (row) => row.queueType,
            ([row]) => row.count
          ),
          PRACTICE_QUEUE_TYPES,
          0
        ),
        practiceActionsCountByActionType: objectFromMapDefault(
          mapGroupBy(
            rowsByAction,
            (row) => row.actionType,
            ([row]) => row.count
          ),
          PRACTICE_ACTION_TYPES,
          0
        ),
      }),
    })
    .where(E.eq(T.decks.id, deckId));
}

// helper for typed JSON_SET(column, path, value, ...)
function sqlJsonSetByObject<Column extends AnyColumn>(
  column: Column,
  data: Partial<GetColumnData<Column>> & object
) {
  return sqlJsonSetByExtract(
    column,
    ...Object.entries(data).map(
      ([k, v]) =>
        [`$.${k}`, () => sql`CAST(${JSON.stringify(v)} AS JSON)`] as const
    )
  );
}

// helper for JSON_SET(column, path, setFn(JSON_EXTRACT(column, path)), ...)
function sqlJsonSetByExtract(
  jsonDoc: unknown,
  ...updates: (readonly [path: string, setFn: (prev: SQL) => SQL])[]
) {
  let q = sql`JSON_SET(${jsonDoc}`;
  for (const [path, setFn] of updates) {
    const jsonExtract = sql`JSON_EXTRACT(${jsonDoc}, ${path})`;
    q = sql`${q}, ${path}, ${setFn(jsonExtract)}`;
  }
  q = sql`${q})`;
  return q;
}

export async function getDailyPracticeStatistics(
  deckId: number,
  startOfToday: Date
): Promise<{
  byActionType: Record<PracticeActionType, number>;
  byQueueType: Record<PracticeQueueType, number>;
}> {
  // aggregate in js
  const rows = await db
    .select()
    .from(T.practiceActions)
    .where(
      E.and(
        E.eq(T.practiceActions.deckId, deckId),
        E.gte(T.practiceActions.createdAt, startOfToday)
      )
    );

  return {
    byActionType: objectFromMapDefault(
      mapGroupBy(
        rows,
        (row) => row.actionType,
        (rows) => rows.length
      ),
      PRACTICE_ACTION_TYPES,
      0
    ),
    byQueueType: objectFromMapDefault(
      mapGroupBy(
        rows,
        (row) => row.queueType,
        (rows) => rows.length
      ),
      PRACTICE_QUEUE_TYPES,
      0
    ),
  };
}

async function getNextScheduledPracticeEntries(deckId: number, now: Date) {
  // get minimum `scheduledAt` for each `queueType`
  const subQuery = db
    .select({
      queueType: T.practiceEntries.queueType,
      minScheduledAt: sql<Date>`MIN(${T.practiceEntries.scheduledAt})`.as(
        "__minScheduledAt"
      ),
    })
    .from(T.practiceEntries)
    .where(
      E.and(
        E.eq(T.practiceEntries.deckId, deckId),
        E.lte(T.practiceEntries.scheduledAt, now)
      )
    )
    .groupBy(T.practiceEntries.queueType)
    .as("__subQuery");

  const rows = await db
    .select({
      practiceEntries: T.practiceEntries,
    })
    .from(T.practiceEntries)
    .innerJoin(
      subQuery,
      E.and(
        E.eq(T.practiceEntries.deckId, deckId),
        E.eq(T.practiceEntries.queueType, subQuery.queueType),
        // workaround custom datetimeUtc
        sql`${T.practiceEntries.scheduledAt} = ${subQuery.minScheduledAt}`
      )
    );

  return objectFromMap(
    mapGroupBy(
      rows.map((row) => row.practiceEntries),
      (row) => row.queueType,
      ([row]) => row
    )
  );
}

export function queryNextPracticeEntryRandomMode(
  deckId: number,
  now: Date,
  seed: number
) {
  const randInt = hashInt32(seed);
  const randUniform = randInt / 2 ** 32;

  const RANDOM_MODE_SCORE_ALIAS = "randomModeScore";

  // 0.1 bonus for a week older, up to 0.2
  const SCHEDULED_AT_BONUS_SLOPE = 0.1 / (60 * 60 * 24 * 7);
  const SCHEDULED_AT_BONUS_MAX = 0.2;

  // choose queueType by a fixed probability
  const QUEUE_TYPE_WEIGHT = [90, 8, 2];
  const randQueueType =
    PRACTICE_QUEUE_TYPES[randomChoice(randUniform, QUEUE_TYPE_WEIGHT)];

  const query = db
    .select({
      ...T.practiceEntries,
      // RANDOM(HASH(practiceAction) ^ seedInt)  (in [0, 1))
      // +
      // (scheduledAt bonus)                     (in [0, SCHEDULED_AT_BONUS_MAX])
      // +
      // (queueType bonus)                       (10 if randQueueType)
      // prettier-ignore
      [RANDOM_MODE_SCORE_ALIAS]: sql<number>`(
        RAND(
          CONV(
            SUBSTRING(
              HEX(
                UNHEX(SHA1(${T.practiceEntries.id})) ^
                UNHEX(SHA1(${T.practiceEntries.updatedAt})) ^
                UNHEX(SHA1(${randInt}))
              ),
              1,
              8
            ),
            16,
            10
          )
        )
        +
        LEAST(${SCHEDULED_AT_BONUS_MAX}, (UNIX_TIMESTAMP(${now}) - UNIX_TIMESTAMP(scheduledAt)) * ${SCHEDULED_AT_BONUS_SLOPE})
        +
        10 * (${T.practiceEntries.queueType} = ${randQueueType})
      )`.as(RANDOM_MODE_SCORE_ALIAS),
    })
    .from(T.practiceEntries)
    .where(
      E.and(
        E.eq(T.practiceEntries.deckId, deckId),
        E.lt(T.practiceEntries.scheduledAt, now)
      )
    )
    .orderBy(E.desc(sql.raw(RANDOM_MODE_SCORE_ALIAS)));

  return { query, randInt, randUniform, randQueueType };
}

// https://nullprogram.com/blog/2018/07/31/
export function hashInt32(x: number) {
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad);
  x ^= x >>> 15;
  x = Math.imul(x, 0xd35a2d97);
  x ^= x >>> 15;
  return x >>> 0;
}

function randomChoice(uniform: number, weights: number[]): number {
  tinyassert(weights.length > 0);
  const cumWeights = prefixSum(weights);
  const normalized = uniform * cumWeights[weights.length];
  const found = cumWeights.slice(1).findIndex((c) => normalized < c);
  tinyassert(0 <= found && found < weights.length);
  return found;
}

function prefixSum(ls: number[]): number[] {
  const acc = [0];
  for (let i = 0; i < ls.length; i++) {
    acc.push(acc[i] + ls[i]);
  }
  return acc;
}
