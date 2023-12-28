import { beforeAll, describe, expect, it } from "vitest";
import { formatRelativeDate, mockTimezone } from "#utils/intl";
import { fromTemporal, toInstant } from "#utils/temporal-utils";

beforeAll(() => {
  mockTimezone("Asia/Tokyo");
});

describe("formatRelativeDate", () => {
  // prettier-ignore
  it("basic", () => {
    const now = new Date("2023-04-28T08:35:36.003Z");
    expect(formatRelativeDate(now, now)).toMatchInlineSnapshot('"today, 17:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: +40 })), now)).toMatchInlineSnapshot('"Apr 30, 2023, 09:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: +30 })), now)).toMatchInlineSnapshot('"tomorrow, 23:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours:  +6 })), now)).toMatchInlineSnapshot('"today, 23:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: -16 })), now)).toMatchInlineSnapshot('"today, 01:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: -30 })), now)).toMatchInlineSnapshot('"yesterday, 11:35:36"');
    expect(formatRelativeDate(fromTemporal(toInstant(now).add({ hours: -50 })), now)).toMatchInlineSnapshot('"Apr 26, 2023, 15:35:36"');
  });
});
