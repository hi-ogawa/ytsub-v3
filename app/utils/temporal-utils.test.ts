import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { fromTemporal, isValidTimezone, toZdt } from "./temporal-utils";

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
