import {
  BookmarkEntryTable,
  DeckTable,
  PracticeActionType,
  PracticeEntryTable,
  PracticeQueueType,
  UserTable,
} from "../db/models";
import { TimedeltaOptions } from "./timedelta";

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

// TODO: move to `decks` table
const DECK_OPTIONS = {
  newEntriesPerDay: 50,
  reviewsPerDay: 200,
  easeMultiplier: 2,
  easeBonus: 1.5,
  timezoneOffset: 9 * 60 * 60, // +09:00 JST
};

export class PracticeSystem {
  //
  // Pubic API
  //

  constructor(private user: UserTable, private deck: DeckTable) {}

  async getNextPracticeEntry(): Promise<PracticeEntryTable | undefined> {
    DECK_OPTIONS;
    this.deck;
    return;
  }

  async createPracticeEntry(
    bookmarkEntry: BookmarkEntryTable
  ): Promise<number> {
    bookmarkEntry;
    SCHEDULE_RULES;
    return 0;
  }

  async act(
    practiceEntry: PracticeEntryTable,
    actionType: PracticeActionType
  ): Promise<void> {
    practiceEntry;
    actionType;
    QUEUE_RULES;
    this.user;
  }

  //
  // Internal API
  //
}
