import { z } from "zod";

export const zSnapshotType = z.any().transform((v) => `[${toPrettyType(v)}]`);

function toPrettyType(v: unknown) {
  if (
    ["undefined", "boolean", "number", "string", "function"].includes(typeof v)
  ) {
    return typeof v;
  }
  if (v === null) {
    return "null";
  }
  if (
    v &&
    typeof v === "object" &&
    "constructor" in v &&
    typeof v.constructor === "function" &&
    v.constructor.name
  ) {
    return v.constructor.name;
  }
  return "unknown";
}
