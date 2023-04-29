import { createIntl } from "@formatjs/intl";
import { tinyassert } from "@hiogawa/utils";
import { getSystemTimezone, toInstant, toZdt } from "./temporal-utils";

export let intl = createIntl({ locale: "en", timeZone: getSystemTimezone() });

// for testing
export function mockTimezone(timeZone: string) {
  intl = createIntl({ locale: "en", timeZone });
}

// quick wrapper to inline everything
export function intlWrapper(
  defaultMessage: string,
  values?: Record<string, any>
) {
  return intl.$t({ defaultMessage, id: defaultMessage }, values);
}

// DateTimeFormat with a special formatting for certain dates e.g. "today", "yesterday", ...
export function formatRelativeDate(
  date: Date,
  now: Date = new Date() // for testing
): string {
  tinyassert(intl.timeZone);
  const startOfToday = toZdt(now, intl.timeZone).startOfDay();
  const days = Math.floor(
    toInstant(date).since(startOfToday.toInstant()).total("days")
  );

  return [
    Math.abs(days) < 2
      ? intl.formatRelativeTime(days, "days", { numeric: "auto" })
      : intl.formatDate(date, {
          dateStyle: "medium",
          hour12: false,
        }),
    intl.formatTime(date, { timeStyle: "medium", hour12: false }),
  ].join(", ");
}
