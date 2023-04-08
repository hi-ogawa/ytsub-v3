import { z } from "zod";

// TODO: organize client code

const Z_PRACTICE_ACTION_TYPES = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);
const Z_PRACTICE_QUEUE_TYPES = z.enum(["NEW", "LEARN", "REVIEW"]);
export const PRACTICE_ACTION_TYPES = Z_PRACTICE_ACTION_TYPES.options;
export const PRACTICE_QUEUE_TYPES = Z_PRACTICE_QUEUE_TYPES.options;
