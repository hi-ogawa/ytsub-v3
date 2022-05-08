import { difference, range } from "lodash";
import { client } from "../db/client.server";
import {
  BookmarkEntryTable,
  DeckTable,
  PRACTICE_QUEUE_TYPES,
  PracticeActionType,
  PracticeEntryTable,
  PracticeQueueType,
  Q,
  UserTable,
} from "../db/models";
import { aggregate } from "../db/utils";
import { fromEntries } from "./misc";
import { Timedelta, TimedeltaOptions } from "./timedelta";

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
  Record<PracticeActionType, TimedeltaOptions>
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
    const yesterday = Timedelta.make({ days: 1 }).rsub(now);

    const [totals, dailys] = await Promise.all([
      Q.practiceEntries()
        .select("queueType", { count: client.raw("COUNT(0)") })
        .where({ deckId })
        .groupBy("queueType"),
      Q.practiceActions()
        .select("queueType", { count: client.raw("COUNT(0)") })
        .where({ deckId })
        .where("createdAt", ">=", yesterday)
        .groupBy("queueType"),
    ]);
    const aggTotal = aggregate(totals, "queueType");
    const aggDaily = aggregate(dailys, "queueType");
    return fromEntries(
      PRACTICE_QUEUE_TYPES.map((type) => [
        type,
        {
          total: aggTotal[type]?.count ?? 0,
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
    const yesterday = Timedelta.make({ days: 1 }).rsub(now);

    if (randomMode) {
      const result: PracticeEntryTable = await Q.practiceEntries()
        .select("practiceEntries.*")
        .where("practiceEntries.deckId", deckId)
        .where("practiceEntries.scheduledAt", "<=", now)
        // Use last `practiceActions.id` as cheap random seed
        .orderByRaw(
          "RAND((select id from practiceActions order by id desc limit 1))"
        )
        .first();
      return result;
    }

    const [actions, entries] = await Promise.all([
      // TODO(refactor): copeid from `getStatistics`
      Q.practiceActions()
        .select("queueType", { count: client.raw("COUNT(0)") })
        .where({ deckId })
        .where("createdAt", ">=", yesterday)
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

    const qActions = Q.practiceActions().insert({
      queueType: queueType,
      actionType,
      userId,
      deckId,
      practiceEntryId,
    });

    // update schedule
    let delta = Timedelta.make(SCHEDULE_RULES[queueType][actionType]);
    if (queueType === "REVIEW") {
      delta = delta.mul(practiceEntry.easeFactor);
    }
    const newScheduledAt = delta.radd(now);

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

    const qEntries = Q.practiceEntries()
      .update({
        queueType: newQueueType,
        easeFactor: newEaseFactor,
        scheduledAt: newScheduledAt,
      })
      .where("id", practiceEntryId);

    const [[id]] = await Promise.all([qActions, qEntries]);
    return id;
  }
}
