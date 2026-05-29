/**
 * Core domain types for CronAnchor.
 *
 * Everything here is data — no behavior, no mutation. Configs flow in as immutable
 * objects; functions return new objects.
 */

/** The three cadence modes the tool supports. */
export type CadenceMode =
  /** Run every N days from the anchor date. */
  | "everyNDays"
  /** Run every N weeks on a chosen weekday; the anchor sets which week is "week 0". */
  | "everyNWeeksWeekday"
  /** Run every N weeks; the weekday is derived from the anchor date itself. */
  | "everyNWeeksAnchored";

/** Cron day-of-week numbering: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Raw, user-facing configuration (as captured from the UI / URL). */
export interface ScheduleConfig {
  readonly mode: CadenceMode;
  /** Interval N (integer ≥ 1). */
  readonly interval: number;
  /** Weekday for `everyNWeeksWeekday` (ignored/derived otherwise). */
  readonly weekday: Weekday;
  /** Hour of day, 0–23 (local to `timezone`). */
  readonly hour: number;
  /** Minute of hour, 0–59. */
  readonly minute: number;
  /** Anchor start date as an ISO civil date string, "YYYY-MM-DD". */
  readonly anchorDate: string;
  /** IANA timezone, e.g. "UTC" or "America/New_York". */
  readonly timezone: string;
  /** The command cron should run. */
  readonly command: string;
}

/** A single validation problem tied to a specific field. */
export interface FieldError {
  readonly field: keyof ScheduleConfig;
  readonly message: string;
}

/** Whole-number day count from the Unix epoch (DST-immune; see `core/dates.ts`). */
export type DayNumber = number;
