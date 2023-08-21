import { createJsonExtra, defineJsonExtraExtension } from "@hiogawa/json-extra";
import { ZodError } from "zod";

export const JSON_EXTRA = createJsonExtra({
  builtins: ["undefined", "Date"],
  extensions: {
    ZodError: defineJsonExtraExtension<ZodError>({
      is: (v) => v instanceof ZodError,
      replacer: (v) => v.issues,
      reviver: (v) => new ZodError(v as any),
    }),
  },
});
