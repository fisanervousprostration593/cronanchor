/**
 * Validate a raw config and, when valid, build the normalized schedule. Validation
 * happens at the system boundary: never trust the inputs, fail fast with clear,
 * field-specific messages, and never produce wrong output from bad input.
 */

import { parseCivilDate } from "./dates";
import { buildSchedule, type NormalizedSchedule } from "./schedule";
import { isValidTimezone } from "./timezones";
import type { FieldError, ScheduleConfig } from "./types";

/** Upper bound on the interval — generous, but blocks absurd/overflowing input. */
export const MAX_INTERVAL = 3650;

export type ValidationResult =
  | { readonly ok: true; readonly schedule: NormalizedSchedule }
  | { readonly ok: false; readonly errors: readonly FieldError[] };

export function validateConfig(c: ScheduleConfig): ValidationResult {
  const errors: FieldError[] = [];

  if (!Number.isInteger(c.interval) || c.interval < 1) {
    errors.push({
      field: "interval",
      message: "Interval must be a whole number of 1 or more.",
    });
  } else if (c.interval > MAX_INTERVAL) {
    errors.push({
      field: "interval",
      message: `Interval is unusually large; keep it at ${MAX_INTERVAL} or fewer.`,
    });
  }

  if (c.mode === "everyNWeeksWeekday") {
    if (!Number.isInteger(c.weekday) || c.weekday < 0 || c.weekday > 6) {
      errors.push({ field: "weekday", message: "Choose a weekday." });
    }
  }

  if (!Number.isInteger(c.hour) || c.hour < 0 || c.hour > 23) {
    errors.push({ field: "hour", message: "Hour must be between 0 and 23." });
  }
  if (!Number.isInteger(c.minute) || c.minute < 0 || c.minute > 59) {
    errors.push({ field: "minute", message: "Minute must be between 0 and 59." });
  }

  const anchor = parseCivilDate(c.anchorDate);
  if (!anchor) {
    errors.push({
      field: "anchorDate",
      message: "Enter a real calendar date (YYYY-MM-DD).",
    });
  }

  if (!isValidTimezone(c.timezone)) {
    errors.push({ field: "timezone", message: "Choose a valid IANA timezone." });
  }

  if (c.command.trim().length === 0) {
    errors.push({ field: "command", message: "Enter the command cron should run." });
  }

  if (errors.length > 0 || !anchor) {
    return { ok: false, errors };
  }

  const schedule = buildSchedule({
    mode: c.mode,
    interval: c.interval,
    weekday: c.weekday,
    hour: c.hour,
    minute: c.minute,
    anchor,
    timezone: c.timezone,
    command: c.command,
  });
  return { ok: true, schedule };
}
