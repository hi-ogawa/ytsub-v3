import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import {
  fromTemporal,
  getZonedDateRange,
  isValidTimezone,
  toZdt,
} from "#utils/temporal-utils";

describe("isValidTimezone", () => {
  it("basic", () => {
    expect(isValidTimezone("hello")).toMatchInlineSnapshot("false");
    expect(isValidTimezone("+09:00")).toMatchInlineSnapshot("true");
  });

  it("now", () => {
    expect(
      isValidTimezone(Temporal.Now.zonedDateTimeISO().offset)
    ).toMatchInlineSnapshot("true");
  });
});

describe("toZdt", () => {
  it("basic", () => {
    const date = new Date("2023-04-14T22:23:49.708Z");
    const timezone = "+09:00";
    const zdt = toZdt(date, timezone);
    expect(zdt.toPlainDate().toString()).toMatchInlineSnapshot('"2023-04-15"');
    expect(fromTemporal(zdt)).toEqual(date);
  });
});

describe("getZonedDateRange", () => {
  it("basic", () => {
    const date = new Date("2023-04-14T22:23:49.708Z");
    const timezone = "+09:00";
    const zdt = toZdt(date, timezone);
    const { begin, end, dates } = getZonedDateRange(zdt, "week", 2);
    expect([begin, end].map(String)).toMatchInlineSnapshot(`
      [
        "2023-03-27T00:00:00+09:00[+09:00]",
        "2023-04-03T00:00:00+09:00[+09:00]",
      ]
    `);
    expect(dates.map(String)).toMatchInlineSnapshot(`
      [
        "2023-03-27T00:00:00+09:00[+09:00]",
        "2023-03-28T00:00:00+09:00[+09:00]",
        "2023-03-29T00:00:00+09:00[+09:00]",
        "2023-03-30T00:00:00+09:00[+09:00]",
        "2023-03-31T00:00:00+09:00[+09:00]",
        "2023-04-01T00:00:00+09:00[+09:00]",
        "2023-04-02T00:00:00+09:00[+09:00]",
      ]
    `);
  });
});
