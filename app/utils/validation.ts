import { z } from "zod";

// TODO: rename to `zStringToInteger`
export const zStringToNumber = z.string().regex(/^\d+$/).transform(Number);
