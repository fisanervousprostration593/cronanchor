/**
 * Turns a validated cadence into a normalized schedule, the gating cron line, and the
 * real sequence of fire dates. Pure and deterministic — no DOM, no clock unless passed.
 */

import {
  type CivilDate,
  addDays,
  civilFromDayNumber,
  dayNumber,
  formatCivilDate,
  weekdayOf,
  weekdayName,
} from "./dates";
import type { CadenceMode } from "./types";

/** Validated, ready-to-render schedule. The anchor is already parsed and resolved. */
export interface NormalizedSchedule {
  readonly mode: CadenceMode;
  readonly interval: number;
  readonly hour: number;
  readonly minute: number;
  readonly timezone: string;
  readonly command: string;
  /** The anchor date the user entered. */
  readonly anchor: CivilDate;
  /** The first actual fire date (anchor advanced to the target weekday for week modes). */
  readonly effectiveAnchor: CivilDate;
  readonly effectiveAnchorDayNumber: number;
  /** Cron day-of-week (0–6). Used in the cron line for week modes. */
  readonly weekday: number;
  /** Whether cron gates on a weekday (week modes) vs. fires daily (days mode). */
  readonly isWeekly: boolean;
  /** Calendar days between consecutive fires: N (days mode) or 7·N (week modes). */
  readonly periodDays: number;
}

/** Primitive, already-validated inputs used to build a schedule. */
export interface ScheduleParts {
  readonly mode: CadenceMode;
  readonly interval: number;
  readonly weekday: number;
  readonly hour: number;
  readonly minute: number;
  readonly anchor: CivilDate;
  readonly timezone: string;
  readonly command: string;
}

/** One scheduled execution in the preview. */
export interface FireDate {
  readonly date: CivilDate;
  readonly dayNumber: number;
  readonly weekday: number;
  /** Calendar days since the previous fire in the sequence; `null` for the first. */
  readonly gapDays: number | null;
}

/** Build a normalized schedule from validated parts. */
export function buildSchedule(parts: ScheduleParts): NormalizedSchedule {
  const { mode, interval, anchor } = parts;

  if (mode === "everyNDays") {
    return {
      ...common(parts),
      anchor,
      effectiveAnchor: anchor,
      effectiveAnchorDayNumber: dayNumber(anchor),
      weekday: weekdayOf(anchor),
      isWeekly: false,
      periodDays: interval,
    };
  }

  // Week modes: determine the target weekday, then advance the anchor to it.
  const targetWeekday =
    mode === "everyNWeeksAnchored" ? weekdayOf(anchor) : parts.weekday;
  const delta = (((targetWeekday - weekdayOf(anchor)) % 7) + 7) % 7;
  const effectiveAnchor = addDays(anchor, delta);

  return {
    ...common(parts),
    anchor,
    effectiveAnchor,
    effectiveAnchorDayNumber: dayNumber(effectiveAnchor),
    weekday: targetWeekday,
    isWeekly: true,
    periodDays: 7 * interval,
  };
}

function common(parts: ScheduleParts) {
  return {
    mode: parts.mode,
    interval: parts.interval,
    hour: parts.hour,
    minute: parts.minute,
    timezone: parts.timezone,
    command: parts.command,
  };
}

/** The gating cron line (5-field). Daily for days mode, weekday-gated for week modes. */
export function cronLine(s: NormalizedSchedule): string {
  const dow = s.isWeekly ? String(s.weekday) : "*";
  return `${s.minute} ${s.hour} * * ${dow}`;
}

/**
 * The next `count` real fire dates at or after `from`, never before the effective anchor.
 * Each is spaced by exactly `periodDays`, so the sequence is true N-day / N-week cadence.
 */
export function nextFireDates(
  s: NormalizedSchedule,
  count: number,
  from: CivilDate,
): FireDate[] {
  const start = Math.max(dayNumber(from), s.effectiveAnchorDayNumber);
  const jumps = Math.max(
    0,
    Math.ceil((start - s.effectiveAnchorDayNumber) / s.periodDays),
  );

  const out: FireDate[] = [];
  let previous: number | null = null;
  for (let i = 0; i < count; i++) {
    const dn = s.effectiveAnchorDayNumber + (jumps + i) * s.periodDays;
    const date = civilFromDayNumber(dn);
    out.push({
      date,
      dayNumber: dn,
      weekday: weekdayOf(date),
      gapDays: previous === null ? null : dn - previous,
    });
    previous = dn;
  }
  return out;
}

/**
 * Whether `date` is a real fire date for this schedule — on/after the effective anchor
 * and on a true interval boundary (and on the right weekday for week modes). Mirrors the
 * generated guard exactly. Used by the "would it run on date X?" checker.
 */
export function isFireDate(s: NormalizedSchedule, date: CivilDate): boolean {
  const diff = dayNumber(date) - s.effectiveAnchorDayNumber;
  if (diff < 0) return false;
  if (s.isWeekly) return diff % 7 === 0 && (diff / 7) % s.interval === 0;
  return diff % s.interval === 0;
}

/** Zero-padded "HH:MM" for the schedule's time of day. */
export function formatTime(s: { hour: number; minute: number }): string {
  return `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`;
}

/** A one-line, plain-English description of the cadence. */
export function describeSchedule(s: NormalizedSchedule): string {
  const time = `${formatTime(s)} (${s.timezone})`;
  const start = `starting ${formatCivilDate(s.effectiveAnchor)}`;
  if (!s.isWeekly) {
    const every = s.interval === 1 ? "every day" : `every ${s.interval} days`;
    return `Run ${every} at ${time}, ${start}.`;
  }
  const every = s.interval === 1 ? "every week" : `every ${s.interval} weeks`;
  return `Run ${every} on ${weekdayName(s.weekday)} at ${time}, ${start}.`;
}
