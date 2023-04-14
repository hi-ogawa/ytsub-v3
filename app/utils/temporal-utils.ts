import { wrapError } from "@hiogawa/utils";
import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";

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
