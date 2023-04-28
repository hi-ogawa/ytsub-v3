import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./intl";
import { fromTemporal, toInstant } from "./temporal-utils";

describe("formatRelativeDate", () => {
  // prettier-ignore
  it("basic", () => {
    const now = new Date("2023-04-28T08:35:36.003Z");
    const timeZone = "Asia/Tokyo"
    expect(formatRelativeDate(now, now, timeZone)).toMatchInlineSnapshot('"today at 17:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: +40 })), now, timeZone)).toMatchInlineSnapshot('"April 30, 2023 at 09:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: +30 })), now, timeZone)).toMatchInlineSnapshot('"tomorrow at 23:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: -30 })), now, timeZone)).toMatchInlineSnapshot('"yesterday at 11:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: -50 })), now, timeZone)).toMatchInlineSnapshot('"April 26, 2023 at 15:35:36"');
  });
});
