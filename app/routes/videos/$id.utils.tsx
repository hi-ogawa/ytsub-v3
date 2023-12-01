import { sortBy, uniq, zip } from "@hiogawa/utils";

export function partitionRanges(
  total: number,
  ranges: [number, number][]
): [boolean, [number, number]][] {
  const boundaries = uniq(sortBy(ranges.flat().concat([0, total]), (x) => x));
  return zip(boundaries, boundaries.slice(1)).map((a) => [
    ranges.some((b) => b[0] <= a[0] && a[1] <= b[1]),
    a,
  ]);
}
