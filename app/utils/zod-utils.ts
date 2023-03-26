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
