import { describe, expect, it } from "vitest";
import { exec } from "./node.server";
import { TIMEZONE_RE, getMinutesOffset, getTimezone } from "./timezone";

describe("getTimezone", () => {
  it("basic", async () => {
    const timezone = getTimezone();
    expect(timezone).match(TIMEZONE_RE);

    const { stdout } = await exec("date +%:z");
    expect(timezone).toBe(stdout.trim());
  });
});

describe("getMinutesOffset", () => {
  it("basic", () => {
    expect(getMinutesOffset("+09:00")).toBe(540);
  });
});
