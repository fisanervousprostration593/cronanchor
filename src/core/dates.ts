/**
 * Pure, DST-immune civil-date arithmetic — the heart of CronAnchor's correctness.
 *
 * The cornerstone is the **day number**: the count of whole calendar days from the Unix
 * epoch for a civil (calendar) date, computed by reinterpreting that date at UTC
 * midnight. Because `Date.UTC` ignores DST and local offsets, the difference between two
 * day numbers is the exact number of calendar days between the two dates — immune to DST
 * and to whatever timezone a machine runs in.
 *
 * The generated shell guard mirrors this exactly with
 * `date -u -d "$(TZ=zone date +%F)" +%s) / 86400`, so the preview and the guard agree by
 * construction.
 *
 * No third-party date library is used on purpose: depending on one would mean inheriting
 * its bugs in the exact domain where we promise correctness.
 */

import type { DayNumber } from "./types";

const MS_PER_DAY = 86_400_000;

/** A civil (calendar) date with no time or timezone. `month` is 1–12. */
export interface CivilDate {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number; // 1–31
}

/**
 * Whole days from the Unix epoch for a civil date, via UTC reinterpretation.
 * `dayNumber({year:1970,month:1,day:1})` is 0.
 */
export function dayNumber(d: CivilDate): DayNumber {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / MS_PER_DAY);
}

/** Inverse of {@link dayNumber}: the civil date `n` whole days after the epoch. */
export function civilFromDayNumber(n: DayNumber): CivilDate {
  const date = new Date(n * MS_PER_DAY);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Weekday for a civil date: 0 = Sunday … 6 = Saturday (matches cron day-of-week). */
export function weekdayOf(d: CivilDate): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

/** A new civil date `days` calendar days after `d` (negative goes back). */
export function addDays(d: CivilDate, days: number): CivilDate {
  return civilFromDayNumber(dayNumber(d) + days);
}

/**
 * Parse a strict "YYYY-MM-DD" civil date. Returns `null` for malformed strings or
 * impossible calendar dates (e.g. "2025-02-30", "2025-13-01"). The round-trip check
 * rejects rollovers that `Date.UTC` would otherwise silently normalize.
 */
export function parseCivilDate(s: string): CivilDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const candidate: CivilDate = { year, month, day };
  const roundTrip = civilFromDayNumber(dayNumber(candidate));
  if (roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day) {
    return null;
  }
  return candidate;
}

/** Format a civil date as a zero-padded "YYYY-MM-DD" string. */
export function formatCivilDate(d: CivilDate): string {
  const mm = String(d.month).padStart(2, "0");
  const dd = String(d.day).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
}

/**
 * The current civil date in a given IANA timezone. Uses `Intl` so it reflects the
 * calendar date a server in `timezone` would see — the same date the generated guard
 * computes with `TZ=<zone> date +%F`.
 *
 * @throws if `timezone` is not a valid IANA zone.
 */
export function todayInZone(timezone: string, now: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (type: string): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Could not read ${type} for timezone "${timezone}"`);
    return Number(part.value);
  };
  return { year: pick("year"), month: pick("month"), day: pick("day") };
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Full weekday name for a 0–6 index (0 = Sunday). */
export function weekdayName(index: number): string {
  return WEEKDAY_NAMES[((index % 7) + 7) % 7] as string;
}

/** Short weekday name for a 0–6 index (0 = Sun). */
export function weekdayNameShort(index: number): string {
  return WEEKDAY_NAMES_SHORT[((index % 7) + 7) % 7] as string;
}
