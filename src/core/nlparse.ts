/**
 * Parses a small, defined grammar of natural-language schedule phrases into a partial
 * config that patches the form. Deterministic and dependency-free — NOT open-ended NLP.
 *
 * Recognized (case-insensitive):
 *   - "every day" / "daily" / "every N days" / "every other day"
 *   - "weekly" / "every week" / "biweekly" / "fortnightly" / "every other week"
 *   - "every N weeks [on <weekday>]" / "every <weekday>" / "every other <weekday>"
 *   - optional "at H[:MM][am|pm]"   and   "starting|from|on YYYY-MM-DD"
 *
 * Ambiguous or unsupported phrasings (multiple weekdays, day-of-month "on the 3rd",
 * unparseable/invalid times or dates) return `{ ok: false }` with a hint rather than
 * silently producing a wrong schedule.
 */

import { parseCivilDate } from "./dates";
import type { CadenceMode, ScheduleConfig, Weekday } from "./types";

const WEEKDAYS: Readonly<Record<string, number>> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tues: 2,
  tue: 2,
  wednesday: 3,
  weds: 3,
  wed: 3,
  thursday: 4,
  thurs: 4,
  thur: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export const NL_HINT =
  'Try: "every 14 days", "every other Tuesday at 9am", "biweekly on Friday", or "every 3 weeks starting 2025-06-02" (one weekday per job).';

export type NlResult =
  | { readonly ok: true; readonly patch: Partial<ScheduleConfig> }
  | { readonly ok: false; readonly hint: string };

/** Distinct weekday indices mentioned in the text (so multi-weekday phrases can be rejected). */
function weekdaysIn(text: string): number[] {
  const found = new Set<number>();
  for (const name of Object.keys(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) found.add(WEEKDAYS[name] as number);
  }
  return [...found];
}

type TimeResult = { hour: number; minute: number } | "invalid" | undefined;

/** Parse an optional "at …" clause. Returns undefined if absent, "invalid" if present but bad. */
function parseTime(text: string): TimeResult {
  const at = /\bat\s+([0-9:]+)\s*(am|pm)?\b/.exec(text);
  if (!at) {
    // an "at" clause that isn't a numeric time (e.g. "at noon") is unsupported
    return /\bat\s+\S/.test(text) ? "invalid" : undefined;
  }
  const token = at[1] ?? "";
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(token); // strict: the whole token must be H or H:MM
  if (!m) return "invalid";
  let hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  const mer = at[2];
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "invalid";
  return { hour, minute };
}

export function parseNaturalSchedule(input: string): NlResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, hint: NL_HINT };
  const text = ` ${trimmed.toLowerCase()} `;

  // Day-of-month ("on the 3rd") is a cadence this tool can't express — reject explicitly.
  if (/\bon\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)\b/.test(text)) {
    return { ok: false, hint: NL_HINT };
  }

  const weekdays = weekdaysIn(text);
  if (weekdays.length > 1) return { ok: false, hint: NL_HINT }; // one weekday per job
  const weekday = weekdays[0];

  let interval: number | undefined;
  let unit: "day" | "week" | undefined;

  const num = /\bevery (\d+)\s*(day|week)s?\b/.exec(text);
  const everyOther = /\bevery other\b/.test(text);

  if (num) {
    interval = Number(num[1]);
    unit = num[2] === "day" ? "day" : "week";
  } else if (/\bevery other days?\b/.test(text)) {
    interval = 2;
    unit = "day";
  } else if (everyOther) {
    // "every other week" / "every other <weekday>" (the day case is handled above)
    interval = 2;
    unit = "week";
  } else if (/\b(biweekly|fortnightly|fortnight)\b/.test(text)) {
    interval = 2;
    unit = "week";
  } else if (/\bdaily\b/.test(text) || /\bevery day\b/.test(text)) {
    interval = 1;
    unit = "day";
  } else if (/\bweekly\b/.test(text) || /\bevery week\b/.test(text)) {
    interval = 1;
    unit = "week";
  } else if (weekday !== undefined && /\bevery\b/.test(text)) {
    interval = 1;
    unit = "week";
  }

  if (interval === undefined || unit === undefined) {
    return { ok: false, hint: NL_HINT };
  }

  const patch: { -readonly [K in keyof ScheduleConfig]?: ScheduleConfig[K] } = {
    interval,
  };
  if (unit === "day") {
    patch.mode = "everyNDays" satisfies CadenceMode;
  } else if (weekday !== undefined) {
    patch.mode = "everyNWeeksWeekday" satisfies CadenceMode;
    patch.weekday = weekday as Weekday;
  } else {
    patch.mode = "everyNWeeksAnchored" satisfies CadenceMode;
  }

  const time = parseTime(text);
  if (time === "invalid") return { ok: false, hint: NL_HINT };
  if (time) {
    patch.hour = time.hour;
    patch.minute = time.minute;
  }

  const date = /\b(?:starting|start|from|on)\s+(\d{4}-\d{2}-\d{2})\b/.exec(text);
  if (date && date[1]) {
    if (!parseCivilDate(date[1])) return { ok: false, hint: NL_HINT }; // impossible date
    patch.anchorDate = date[1];
  }

  return { ok: true, patch };
}
