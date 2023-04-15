import { tinyassert, wrapError } from "@hiogawa/utils";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";
import { z } from "zod";
import { assertUnreachable } from "./misc";

export function toZdt(date: Date, timezone: string): Temporal.ZonedDateTime {
  return toTemporalInstant.apply(date).toZonedDateTimeISO(timezone);
}

export function toInstant(date: Date): Temporal.Instant {
  return toTemporalInstant.apply(date);
}

export function fromTemporal(t: { epochMilliseconds: number }): Date {
  return new Date(t.epochMilliseconds);
}

export function isValidTimezone(timezone: string) {
  return wrapError(() => Temporal.Now.zonedDateTimeISO(timezone)).ok;
}

export const Z_DATE_RANGE_TYPE = z.enum(["week", "month"]);
type DateRangeType = z.infer<typeof Z_DATE_RANGE_TYPE>;

export function getZonedDateRange(
  now: Temporal.ZonedDateTime,
  type: DateRangeType,
  page: number
) {
  const { begin, end } = getZonedDateRangeInner(now, type, page);
  const dates = getZonedDatesBetween(begin, end);
  return { begin, end, dates };
}

function getZonedDateRangeInner(
  now: Temporal.ZonedDateTime,
  type: DateRangeType,
  page: number
) {
  const today = now.startOfDay();
  if (type === "week") {
    const thisWeek = today.subtract({ days: today.dayOfWeek - 1 });
    const begin = thisWeek.add({ weeks: -page });
    const end = begin.add({ weeks: 1 });
    return { begin, end };
  }
  if (type === "month") {
    const thisMonth = today.subtract({ days: today.day - 1 });
    const begin = thisMonth.add({ months: -page });
    const end = begin.add({ months: 1 });
    return { begin, end };
  }
  return assertUnreachable(type);
}

function getZonedDatesBetween(
  begin: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime
): Temporal.ZonedDateTime[] {
  const result: Temporal.ZonedDateTime[] = [];
  for (let i = 0; Temporal.ZonedDateTime.compare(begin, end) < 0; i++) {
    // bound loop just in case
    tinyassert(i < 1000, "bound loop");
    result.push(begin);
    begin = begin.add({ days: 1 });
  }
  return result;
}

export function formatDateRange(type: DateRangeType, page: number): string {
  if (page === 0) return `this ${type}`;
  if (page === 1) return `last ${type}`;
  return `${page} ${type}s ago`;
}
