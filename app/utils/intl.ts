export const dtf = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "long",
  hour12: false,
});
export const dtfDateOnly = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
});
export const rtf = new Intl.RelativeTimeFormat("en-US");
