import { z } from "zod";

export const zStringToInteger = z.string().regex(/^\d+$/).transform(Number);

export const zStringToMaybeInteger = z
  .string()
  .optional()
  .transform((s) => {
    if (s) {
      const i = parseInt(s);
      if (Number.isInteger(i)) {
        return i;
      }
    }
    return;
  });

export const zStringToNumber = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .transform(Number);

// e.g. 2022-04-17T14:49:40.114Z
const ISO_STRING_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const zStringToDate = z
  .string()
  .regex(ISO_STRING_RE)
  .transform((s) => new Date(s));
