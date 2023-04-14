import { wrapError } from "@hiogawa/utils";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";

export function toZdt(date: Date, timezone: string): Temporal.ZonedDateTime {
  return toTemporalInstant.apply(date).toZonedDateTimeISO(timezone);
}

export function fromZdt(zdt: Temporal.ZonedDateTime): Date {
  return new Date(zdt.epochMilliseconds);
}

export function isValidTimezone(timezone: string) {
  return wrapError(() => Temporal.Now.zonedDateTimeISO(timezone)).ok;
}
