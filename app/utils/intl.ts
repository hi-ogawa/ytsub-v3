import { createIntl, createIntlCache } from "@formatjs/intl";

// https://formatjs.io/docs/intl/
export const intl = createIntl({ locale: "en" }, createIntlCache());

// export function format(defaultMessage: string, values?: Record<string, any>) {
//   return intl.formatMessage({ defaultMessage, id: defaultMessage }, values);
// }

// TODO: hydration mismatch
export const dtf = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "long",
  hour12: false,
});

export const dtfDateOnly = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});

export const rtf = new Intl.RelativeTimeFormat("en-US");
