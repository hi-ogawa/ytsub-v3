import { Temporal } from "@js-temporal/polyfill";

// minimal wrappers to replace DIY timezone.ts and timedelta.ts

function toInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export function toZonedDateTime(
  date: Date,
  timezone: string
): Temporal.ZonedDateTime {
  return toInstant(date).toZonedDateTimeISO(timezone);
}

export function fromTemporal(temporal: { epochMilliseconds: number }): Date {
  return new Date(temporal.epochMilliseconds);
}
