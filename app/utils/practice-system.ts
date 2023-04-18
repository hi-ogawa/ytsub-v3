import { tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { sql } from "drizzle-orm";
import { difference, range } from "lodash";
import { client } from "../db/client.server";
import { E, T, db, findOne } from "../db/drizzle-client.server";
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
import { aggregate } from "../db/utils";
import { fromEntries } from "./misc";
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
    const today = fromTemporal(toZdt(now, this.user.timezone).startOfDay());
    const [deck, daily] = await Promise.all([
      Q.decks().where("id", deckId).first(), // reload deck for simplicity
      Q.practiceActions()
        .select("queueType", { count: client.raw("COUNT(0)") })
        .where({ deckId })
        .where("createdAt", ">=", today)
        .groupBy("queueType"),
    ]);
    tinyassert(deck);
    const aggDaily = aggregate(daily, "queueType");
    return fromEntries(
      PRACTICE_QUEUE_TYPES.map((type) => [
        type,
        {
          total: deck.practiceEntriesCountByQueueType[type],
          daily: aggDaily[type]?.count ?? 0,
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
      const query = queryNextPracticeEntryRandomMode(
        this.deck.id,
        now,
        this.deck.updatedAt.getTime()
      );
      const entry = await findOne(query);
      return entry;
    }

    const today = fromTemporal(toZdt(now, this.user.timezone).startOfDay());
    const [actions, entries] = await Promise.all([
      // TODO(refactor): copeid from `getStatistics`
      Q.practiceActions()
        .select("queueType", { count: client.raw("COUNT(0)") })
        .where({ deckId })
        .where("createdAt", ">=", today)
        .groupBy("queueType"),
      // select `practiceEntries` with minimum `scheduledAt` for each `queueType`
      Q.practiceEntries()
        .select("practiceEntries.*")
        .join(
          Q.practiceEntries()
            .select(
              "queueType",
              client.raw("MIN(scheduledAt) as minScheduledAt")
            )
            .where({ deckId })
            .where("scheduledAt", "<=", now)
            .groupBy("queueType")
            .as("subQuery"),
          function () {
            this.on("subQuery.queueType", "practiceEntries.queueType").on(
              "subQuery.minScheduledAt",
              "practiceEntries.scheduledAt"
            );
          }
        ) as Promise<PracticeEntryTable[]>,
    ]);
    const aggActions = aggregate(actions, "queueType");
    const aggEntries = aggregate(entries, "queueType");

    if ((aggActions.NEW?.count ?? 0) < newEntriesPerDay && aggEntries.NEW) {
      return aggEntries.NEW;
    }

    if (aggEntries.LEARN) {
      return aggEntries.LEARN;
    }

    if ((aggActions.REVIEW?.count ?? 0) < reviewsPerDay && aggEntries.REVIEW) {
      return aggEntries.REVIEW;
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
  await Q.decks()
    .where("id", deckId)
    .update(
      "practiceEntriesCountByQueueType",
      client.raw(
        `JSON_SET(:column:,
          '$."NEW"',    JSON_EXTRACT(:column:, '$."NEW"')    + ${
            increments.NEW ?? 0
          },
          '$."LEARN"',  JSON_EXTRACT(:column:, '$."LEARN"')  + ${
            increments.LEARN ?? 0
          },
          '$."REVIEW"', JSON_EXTRACT(:column:, '$."REVIEW"') + ${
            increments.REVIEW ?? 0
          }
         )`,
        {
          column: "practiceEntriesCountByQueueType",
        }
      )
    );
}

// used by "reset-counter-cache:decks.practiceEntriesCountByQueueType" in cli.ts
export async function queryDeckPracticeEntriesCountByQueueType(
  deckId: number
): Promise<Record<PracticeQueueType, number>> {
  const query = await Q.practiceEntries()
    .select("queueType", { count: client.raw("COUNT(0)") })
    .where({ deckId })
    .groupBy("queueType");
  const aggregated = aggregate(query, "queueType");
  return Object.fromEntries(
    PRACTICE_QUEUE_TYPES.map((type) => [type, aggregated[type]?.count ?? 0])
  ) as any;
}

export function queryNextPracticeEntryRandomMode(
  deckId: number,
  now: Date,
  seed: number
) {
  const randInt = hashInt32(seed);
  const randUniform = randInt / 2 ** 32;

  // choose queueType by a fixed probability (0.85, 0.1, 0.05)
  const randQueueType =
    randUniform <= 0.85 ? "NEW" : randUniform <= 0.95 ? "LEARN" : "REVIEW";

  const query = db
    .select({
      ...T.practiceEntries,
      // RANDOM(HASH(practiceAction) ^ seedInt)  (in [0, 1))
      // +
      // (scheduledAt bonus)                     (in [0, 0.5])
      randomModeScore: sql<number>`(
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
        LEAST(0.5, 0.1 / (60 * 60 * 24 * 7) * (UNIX_TIMESTAMP(${now}) - UNIX_TIMESTAMP(scheduledAt)))
      )`.as("randomModeScore"),
    })
    .from(T.practiceEntries)
    .where(
      E.and(
        E.eq(T.practiceEntries.deckId, deckId),
        E.lt(T.practiceEntries.scheduledAt, now)
      )
    )
    .orderBy(
      // choose queueType (but can fallback if such queue is empty)
      E.desc(sql`(${T.practiceEntries.queueType} = ${randQueueType})`),
      // take the maximum of randomModeScore
      E.desc(sql`randomModeScore`)
    );

  return query;
}

// https://nullprogram.com/blog/2018/07/31/
function hashInt32(x: number) {
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0aaad);
  x ^= x >>> 15;
  x = Math.imul(x, 0xd35a2d97);
  x ^= x >>> 15;
  return x >>> 0;
}
