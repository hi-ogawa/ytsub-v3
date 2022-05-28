import { assert } from "../misc/assert";
import { Timedelta } from "./timedelta";

export const TIMEZONE_RE = /^[+-]\d{2}:\d{2}$/;

export function getTimezone(): string {
  const offset = new Date().getTimezoneOffset();
  const sign = Math.sign(offset);
  const abs = Math.abs(offset);
  const h = abs / 60;
  const m = abs % 60;
  const s = sign > 0 ? "-" : "+"; // perspective is reversed

  function pad(x: number): string {
    return String(Math.floor(x)).padStart(2, "0");
  }

  return `${s}${pad(h)}:${pad(m)}`;
}

export function getMinutesOffset(timezone: string): number {
  assert(timezone.match(TIMEZONE_RE));
  const sign = timezone[0] === "+" ? 1 : -1;
  const [h, m] = timezone.slice(1).split(":").map(Number);
  return sign * (h * 60 + m);
}

export function formatYmd(date: Date, timezone: string): string {
  // date +%Y-%m-%d
  // => 2022-05-14
  const offset = getMinutesOffset(timezone);
  const adjusted = Timedelta.make({ minutes: offset }).radd(date);
  return adjusted.toISOString().slice(0, 10);
}

export function getStartOfDay(date: Date, timezone: string): Date {
  const ymd = formatYmd(date, timezone);
  return new Date(`${ymd}T00:00:00${timezone}`);
}
