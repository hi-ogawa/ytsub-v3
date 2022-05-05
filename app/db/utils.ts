import { first, groupBy, mapValues } from "lodash";

// utility to convert results of GROUP BY e.g.
/*
  [
    { c1: "x", c2: "hello" },
    { c1: "y", c2: "world" }
  ]
    ⇓  aggregate(..., "c1")
  {
    x: { c1: "x", c2: 0 },
    y: { c1: "y", c2: 1 },
  }
*/
export function aggregate<T extends Record<string, any>>(
  rows: T[],
  column: string
): Partial<Record<string, T>> {
  return mapValues(
    groupBy(rows, (row) => row[column]),
    first
  ) as any;
}
