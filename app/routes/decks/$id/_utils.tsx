import { PracticeActionType, PracticeQueueType } from "#db/types";

export const PRACTICE_QUEUE_TYPE_TO_COLOR = {
  NEW: "text-colorWarningText",
  LEARN: "text-colorSuccessText",
  REVIEW: "text-colorInfoText",
} satisfies Record<PracticeQueueType, string>;

export const PRACTICE_QUEUE_TYPE_TO_ICON = {
  NEW: "i-ri-checkbox-blank-circle-line",
  LEARN: "i-ri-focus-line",
  REVIEW: "i-ri-checkbox-circle-line",
} satisfies Record<PracticeQueueType, string>;

export const PRACTICE_ACTION_TYPE_TO_COLOR = {
  AGAIN: "text-colorErrorText",
  HARD: "text-colorWarningText",
  GOOD: "text-colorSuccessText",
  EASY: "text-colorInfoText",
} satisfies Record<PracticeActionType, string>;
