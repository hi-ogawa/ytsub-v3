import { describe, expect, it } from "vitest";
import { partitionRanges } from "./$id";

describe(partitionRanges.name, () => {
  it("basic", async () => {
    expect(
      partitionRanges(27, [
        [12, 20],
        [4, 10],
      ])
        .flat()
        .join(" ")
    ).toMatchInlineSnapshot(
      '"false 0,4 true 4,10 false 10,12 true 12,20 false 20,27"'
    );

    expect(
      partitionRanges(27, [
        [4, 10],
        [8, 12],
      ])
        .flat()
        .join(" ")
    ).toMatchInlineSnapshot(
      '"false 0,4 true 4,8 true 8,10 true 10,12 false 12,27"'
    );
  });
});
