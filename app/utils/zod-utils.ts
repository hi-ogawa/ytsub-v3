import { z } from "zod";

export const zStringToInteger = z.coerce.number().int();
