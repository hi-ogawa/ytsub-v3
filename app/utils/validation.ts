import { z } from "zod";

export const zStringToNumber = z.string().regex(/^\d+$/).transform(Number);
