import { DefaultMap, tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "drizzle-orm";
import { difference, range } from "lodash";
import { client } from "../db/client.server";
import { E, T, TT, db } from "../db/drizzle-client.server";
import {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  Q,
  UserTable,
} from "../db/models";
import {
  PRACTICE_QUEUE_TYPES,
  PracticeActionType,
  PracticeQueueType,
} from "../db/types";
import { fromEntries, mapValueGroupBy } from "./misc";
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
      Q.decks().where("id", deckId).first(), // reload deck for simplicity
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
          daily: daily.get(type),
        },
      ])
    );
  }

  async getNextPracticeEntry(
    now: Date = new Date()
  ): Promise<PracticeEntryTable | undefined> {
    const {
      id: deckId,
      newEntriesPerDay,
      reviewsPerDay,
      randomMode,
    } = this.deck;

    if (randomMode) {
      const result: PracticeEntryTable = await Q.practiceEntries()
        .select("practiceEntries.*", {
          // uniform random with "id" and "updatedAt" computed by
          //   rand(hash(id) ^ hash(updatedAt) ^ seed)
          __uniform__: client.raw(
            "RAND(CAST(CONV(SUBSTRING(HEX(UNHEX(SHA1(id)) ^ UNHEX(SHA1(updatedAt)) ^ __subQuery__.__seed__), 1, 8), 16, 10) as UNSIGNED))"
          ),
        })
        .where("practiceEntries.deckId", deckId)
        .where("practiceEntries.scheduledAt", "<=", now)
        .crossJoin(
          client.raw(
            // global seed `hash(hash(max(updatedAt)))` which satisfies a desired property:
            //   a seed should be updated on each `createPracticeAction`
            "(SELECT UNHEX(SHA1(SHA1(updatedAt))) as __seed__, RAND(CAST(CONV(SUBSTRING(SHA1(updatedAt), 1, 8), 16, 10) as UNSIGNED)) as __seed_uniform__ FROM practiceEntries where deckId = ? ORDER BY updatedAt DESC LIMIT 1) as __subQuery__",
            deckId
          )
        )
        .orderByRaw(
          // tweak the distribution based on
          // - queueType
          // - scheduledAt
          client.raw(
            `
            (
              __uniform__
              + (queueType = 'NEW'   ) * -10 * (__subQuery__.__seed_uniform__ <= 0.80)
              + (queueType = 'LEARN' ) * -10 * (__subQuery__.__seed_uniform__ >  0.80) * (__subQuery__.__seed_uniform__ <= 0.95)
              + (queueType = 'REVIEW') * -10 *                                           (__subQuery__.__seed_uniform__ >  0.95)
              + LEAST(-0.5, 0.1 / (60 * 60 * 24 * 7) * (UNIX_TIMESTAMP(scheduledAt) - UNIX_TIMESTAMP(?)))
            )`,
            now
          )
        )
        .first();
      return result;
    }

    const [daily, entries] = await Promise.all([
      getDailyPracticeStatistics(
        this.deck.id,
        fromTemporal(toZdt(now, this.user.timezone).startOfDay())
      ),
      getNextScheduledPracticeEntries(this.deck.id, now),
    ]);

    if (daily.get("NEW") < newEntriesPerDay && entries.get("NEW")) {
      return entries.get("NEW");
    }

    if (entries.get("LEARN")) {
      return entries.get("LEARN");
    }

    if (daily.get("REVIEW") < reviewsPerDay && entries.get("REVIEW")) {
      return entries.get("REVIEW");
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
    const dupIds = await Q.practiceEntries()
      .pluck("bookmarkEntryId")
      .where({ deckId })
      .whereIn("bookmarkEntryId", bookmarkEntryIds);
    const newIds = difference(bookmarkEntryIds, dupIds);
    if (newIds.length === 0) {
      return [];
    }
    const [id] = await Q.practiceEntries().insert(
      newIds.map((id) => ({
        queueType: "NEW",
        easeFactor: 1,
        scheduledAt: now,
        deckId,
        bookmarkEntryId: id,
      }))
    );
    await updateDeckPracticeEntriesCountByQueueType(deckId, {
      NEW: newIds.length,
    });
    return range(id, id + newIds.length);
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
    const qActions = Q.practiceActions().insert({
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
    const qEntries = Q.practiceEntries()
      .update({
        queueType: newQueueType,
        easeFactor: newEaseFactor,
        scheduledAt: newScheduledAt,
        practiceActionsCount: client.raw("practiceActionsCount + 1"),
      })
      .where("id", practiceEntryId);

    // sql: update decks.practiceEntriesCountByQueueType
    let qDecks;
    if (queueType !== newQueueType) {
      qDecks = updateDeckPracticeEntriesCountByQueueType(deckId, {
        [queueType]: -1,
        [newQueueType]: 1,
      });
    }

    const [[id]] = await Promise.all([qActions, qEntries, qDecks]);
    return id;
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
      // prettier-ignore
      practiceEntriesCountByQueueType: sql`
        JSON_SET(${column},
          '$."NEW"',    JSON_EXTRACT(${column}, '$."NEW"')    + ${increments.NEW ?? 0},
          '$."LEARN"',  JSON_EXTRACT(${column}, '$."LEARN"')  + ${increments.LEARN ?? 0},
          '$."REVIEW"', JSON_EXTRACT(${column}, '$."REVIEW"') + ${increments.REVIEW ?? 0},
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

  const record = Object.fromEntries([
    ...PRACTICE_QUEUE_TYPES.map((t) => [t, 0]),
    ...mapValueGroupBy(rows, "queueType", (row) => row.count),
  ]);
  return record;
}

async function getDailyPracticeStatistics(
  deckId: number,
  startOfDay: Date
): Promise<DefaultMap<PracticeQueueType, number>> {
  const rows = await db
    .select({
      queueType: T.practiceEntries.queueType,
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

  return new DefaultMap(
    () => 0,
    mapValueGroupBy(rows, "queueType", (row) => row.count)
  );
}

async function getNextScheduledPracticeEntries(
  deckId: number,
  now: Date
): Promise<Map<PracticeQueueType, TT["practiceEntries"]>> {
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

  return mapValueGroupBy(
    rows.map((row) => row.practiceEntries),
    "queueType",
    (row) => row
  );
}
