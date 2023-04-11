import { z } from "zod";

// cf. Anki's practice system
// - https://docs.ankiweb.net/studying.html
// - https://docs.ankiweb.net/deck-options.html

export const Z_PRACTICE_ACTION_TYPES = z.enum([
  "AGAIN",
  "HARD",
  "GOOD",
  "EASY",
]);
const Z_PRACTICE_QUEUE_TYPES = z.enum(["NEW", "LEARN", "REVIEW"]);

export const PRACTICE_ACTION_TYPES = Z_PRACTICE_ACTION_TYPES.options;
export const PRACTICE_QUEUE_TYPES = Z_PRACTICE_QUEUE_TYPES.options;

export type PracticeActionType = z.infer<typeof Z_PRACTICE_ACTION_TYPES>;
export type PracticeQueueType = z.infer<typeof Z_PRACTICE_QUEUE_TYPES>;
