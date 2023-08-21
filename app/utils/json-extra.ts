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

// TODO: json-extra only provides `unknown` <-> `string` conversion
export function jsonExtraSerialize(data: unknown) {
  return JSON.parse(JSON_EXTRA.stringify(data));
}

export function jsonExtraDeserialize(data: unknown) {
  return JSON_EXTRA.parse(JSON.stringify(data));
}
