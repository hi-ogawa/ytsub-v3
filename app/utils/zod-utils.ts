import { z } from "zod";

export const zStringToInteger = z.string().regex(/^\d+$/).transform(Number);
