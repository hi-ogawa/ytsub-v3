import { capitalize } from "lodash";
import { toInstant, toZdt } from "./temporal-utils";

// TODO(refactor)
// should do something with temporal-utils (e.g. dealing with default/system timezone)
// or probably just use format-js

export const dtf = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "long",
  hour12: false,
});

export const dtfDateOnly = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});

export const rtf = new Intl.RelativeTimeFormat("en-US");

// DateTimeFormat with a special formatting for certain dates e.g. "today", "yesterday", ...
export function formatRelativeDate(
  date: Date,
  // for testing
  now: Date = new Date(),
  timeZone?: string
): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "medium",
    hour12: false,
    timeZone,
  });
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  const startOfToday = toZdt(now, dtf.resolvedOptions().timeZone).startOfDay();
  const days = toInstant(date).since(startOfToday.toInstant()).total("days");
  const daysIntegral = Math.floor(days);

  let result = dtf.format(date);
  if (Math.abs(daysIntegral) < 2) {
    result = result.replace(
      /^.*at/,
      capitalize(rtf.format(daysIntegral, "days")) + " at"
    );
  }
  return result;
}
