import { z } from "zod";
import { defaultObject } from "../utils/misc";

// cf. Anki's practice system
// - https://docs.ankiweb.net/studying.html
// - https://docs.ankiweb.net/deck-options.html

export const Z_PRACTICE_ACTION_TYPES = z.enum([
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
]);
export const Z_PRACTICE_QUEUE_TYPES = z.enum(["NEW", "LEARN", "REVIEW"]);

export const PRACTICE_ACTION_TYPES = Z_PRACTICE_ACTION_TYPES.options;
export const PRACTICE_QUEUE_TYPES = Z_PRACTICE_QUEUE_TYPES.options;

export type PracticeActionType = z.infer<typeof Z_PRACTICE_ACTION_TYPES>;
export type PracticeQueueType = z.infer<typeof Z_PRACTICE_QUEUE_TYPES>;

// prettier-ignore
export interface DeckCache {
  nextEntriesRandomMode: { id: number }[];
  practiceEntriesCountByQueueType: Record<PracticeQueueType, number>;
  practiceActionsCountByActionType: Record<PracticeActionType, number>;
}

export const DEFAULT_DECK_CACHE: DeckCache = {
  nextEntriesRandomMode: [],
  practiceEntriesCountByQueueType: defaultObject(PRACTICE_QUEUE_TYPES, 0),
  practiceActionsCountByActionType: defaultObject(PRACTICE_ACTION_TYPES, 0),
};
