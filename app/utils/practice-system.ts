import { tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "drizzle-orm";
import { difference, range } from "lodash";
import { E, T, db, findOne } from "../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  UserTable,
} from "../db/models";
import {
  PRACTICE_QUEUE_TYPES,
  PracticeActionType,
  PracticeQueueType,
} from "../db/types";
import { fromEntries, mapGroupBy, objectFromMap } from "./misc";
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

export type DeckPracticeStatistics = Record<
  PracticeQueueType,
  Record<"daily" | "total", number>
>;

export class PracticeSystem {
  constructor(private user: UserTable, private deck: DeckTable) {}

  async getStatistics(now: Date): Promise<DeckPracticeStatistics> {
    const deckId = this.deck.id;
    const [deck, daily] = await Promise.all([
      findOne(db.select().from(T.decks).where(E.eq(T.decks.id, deckId))), // reload deck for simplicity (TODO: don't)
      getDailyPracticeStatistics(
        this.deck.id,
        fromTemporal(toZdt(now, this.user.timezone).startOfDay())
      ),
    ]);
    tinyassert(deck);
    return fromEntries(
      PRACTICE_QUEUE_TYPES.map((type) => [
        type,
        {
          total: deck.practiceEntriesCountByQueueType[type],
          daily: daily[type] ?? 0,
        },
      ])
    );
  }

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

    if ((daily.NEW ?? 0) < this.deck.newEntriesPerDay && entries.NEW) {
      return entries.NEW;
    }

    if (entries.LEARN) {
      return entries.LEARN;
    }

    if ((daily.REVIEW ?? 0) < this.deck.reviewsPerDay && entries.REVIEW) {
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
    await updateDeckPracticeEntriesCountByQueueType(deckId, {
      NEW: newIds.length,
    });
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

    // sql: update decks.practiceEntriesCountByQueueType
    const queryUpdateDeck = updateDeckPracticeEntriesCountByQueueType(deckId, {
      [queueType]: queueType !== newQueueType ? -1 : 0,
      [newQueueType]: queueType !== newQueueType ? 1 : 0,
    });

    const [[{ insertId }]] = await Promise.all([
      queryCreatePracticeAction,
      queryUpdatePracticeEntry,
      queryUpdateDeck,
    ]);
    return insertId;
  }
}

async function updateDeckPracticeEntriesCountByQueueType(
  deckId: number,
  increments: Partial<Record<PracticeQueueType, number>>
): Promise<void> {
  const column = T.decks.practiceEntriesCountByQueueType;
  await db
    .update(T.decks)
    .set({
      // force resetting `updatedAt` even if queueType = newQueueType so that we can use it as a randomMode seed
      updatedAt: new Date(),
      // prettier-ignore
      practiceEntriesCountByQueueType: sql`
        JSON_SET(${column},
          '$."NEW"',    JSON_EXTRACT(${column}, '$."NEW"')    + ${increments.NEW ?? 0},
          '$."LEARN"',  JSON_EXTRACT(${column}, '$."LEARN"')  + ${increments.LEARN ?? 0},
          '$."REVIEW"', JSON_EXTRACT(${column}, '$."REVIEW"') + ${increments.REVIEW ?? 0}
        )
      `,
    })
    .where(E.eq(T.decks.id, deckId));
}

// used by "reset-counter-cache:decks.practiceEntriesCountByQueueType" in cli.ts
export async function queryDeckPracticeEntriesCountByQueueType(
  deckId: number
): Promise<Record<PracticeQueueType, number>> {
  const rows = await db
    .select({
      queueType: T.practiceEntries.queueType,
      count: sql<number>`COUNT(0)`,
    })
    .from(T.practiceEntries)
    .where(E.eq(T.practiceEntries.deckId, deckId))
    .groupBy(T.practiceEntries.queueType);

  return Object.fromEntries([
    ...PRACTICE_QUEUE_TYPES.map((t) => [t, 0]),
    ...mapGroupBy(
      rows,
      (row) => row.queueType,
      ([row]) => row.count
    ),
  ]);
}

async function getDailyPracticeStatistics(deckId: number, startOfDay: Date) {
  const rows = await db
    .select({
      queueType: T.practiceActions.queueType,
      count: sql<number>`COUNT(0)`,
    })
    .from(T.practiceActions)
    .where(
      E.and(
        E.eq(T.practiceActions.deckId, deckId),
        E.gte(T.practiceActions.createdAt, startOfDay)
      )
    )
    .groupBy(T.practiceActions.queueType);

  return objectFromMap(
    mapGroupBy(
      rows,
      (row) => row.queueType,
      ([row]) => row.count
    )
  );
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
        E.lt(T.practiceEntries.scheduledAt, now)
      )
    )
    .groupBy(T.practiceEntries.queueType)
    .as("__subQuery");

  const rows = await db
    .select()
    .from(T.practiceEntries)
    .innerJoin(
      subQuery,
      E.and(
        E.eq(T.practiceEntries.queueType, subQuery.queueType),
        E.eq(T.practiceEntries.scheduledAt, subQuery.minScheduledAt)
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
