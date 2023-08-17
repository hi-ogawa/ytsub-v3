import { z } from "zod";

// helper to snapshot non-deterministic values e.g.
//   expect(z.object({ id: zSnapshotType }).passthrough().parse(userWithId)).toMatchInlineSnapshot()
export const zSnapshotType = z.any().transform((v) => `[${prettyTypeof(v)}]`);

function prettyTypeof(v: unknown) {
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
