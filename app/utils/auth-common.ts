import { z } from "zod";

export const Z_USERNAME = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);

// TODO: increase min length (currently we use very short one for dev)
export const Z_PASSWORD = z.string().min(3).max(128);
