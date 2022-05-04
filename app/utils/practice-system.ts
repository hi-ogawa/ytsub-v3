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
  toCount,
} from "../db/models";
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

// // TODO: move to `decks` table
// const DECK_OPTIONS = {
//   newEntriesPerDay: 50,
//   reviewsPerDay: 200,
//   easeMultiplier: 2,
//   easeBonus: 1.5,
// };

export type DeckPracticeStatistics = Record<
  PracticeQueueType,
  Record<"daily" | "total", number>
>;

// TODO(perf)
// - db queries in parallel (Promise.all)
// - cache counters
// - jitter something?
//   - must be deterministic
//   - which queue to pick in `getNextPracticeEntry`
//   - `sheduledAt` in `createPracticeEntries`

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

    return fromEntries(
      PRACTICE_QUEUE_TYPES.map((type) => [
        type,
        {
          total: totals.find((s) => s.queueType === type)?.count ?? 0,
          daily: dailys.find((s) => s.queueType === type)?.count ?? 0,
        },
      ])
    );
  }

  async getNextPracticeEntry(
    now: Date = new Date()
  ): Promise<PracticeEntryTable | undefined> {
    const { id: deckId, newEntriesPerDay, reviewsPerDay } = this.deck;
    const yesterday = Timedelta.make({ days: 1 }).rsub(now);

    const qActions = Q.practiceActions()
      .where({ deckId })
      .where("createdAt", ">=", yesterday);
    const qEntries = Q.practiceEntries()
      .where({ deckId })
      .where("scheduledAt", "<=", now)
      .orderBy("scheduledAt");

    // NEW queue
    if (
      (await toCount(qActions.clone().where({ queueType: "NEW" }))) <
      newEntriesPerDay
    ) {
      const found = await qEntries.clone().where({ queueType: "NEW" }).first();
      if (found) return found;
    }

    // LEARN queue
    {
      const found = await qEntries
        .clone()
        .where({ queueType: "LEARN" })
        .first();
      if (found) return found;
    }

    // REVIEW queue
    if (
      (await toCount(qActions.clone().where({ queueType: "REVIEW" }))) <
      reviewsPerDay
    ) {
      const found = await qEntries
        .clone()
        .where({ queueType: "REVIEW" })
        .first();
      if (found) return found;
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
