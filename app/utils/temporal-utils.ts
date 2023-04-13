import { Temporal, toTemporalInstant } from "@js-temporal/polyfill";

// minimal wrappers to replace DIY timezone.ts and timedelta.ts

export function toZonedDateTime(
  date: Date,
  timezone: string
): Temporal.ZonedDateTime {
  return toTemporalInstant.apply(date).toZonedDateTimeISO(timezone);
}

export function fromTemporal(temporal: { epochMilliseconds: number }): Date {
  return new Date(temporal.epochMilliseconds);
}
