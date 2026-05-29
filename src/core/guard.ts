/**
 * Generates the shell guard and the full crontab block from a normalized schedule.
 *
 * The guard counts whole calendar days from a baked-in anchor day-number and fires only
 * on true interval boundaries. It mirrors the app's own date math exactly:
 *
 *   today_days = $(date -u -d "$(TZ=<zone> date +%F)" +%s) / 86400
 *   fire when (today_days - ANCHOR_DAYS) [ / 7 ] % N == 0
 *
 * Reinterpreting the zone's civil date at UTC midnight makes day differences exact
 * multiples of 86400 — DST-immune and independent of the server's own timezone. We avoid
 * the popular `date +%s / 604800 % 2` epoch-week-parity trick, which drifts across DST
 * and depends on the locale week start.
 *
 * Target: GNU coreutils `date` (for `date -u -d`). BSD/macOS/busybox `date` differ.
 */

import { formatCivilDate, weekdayName } from "./dates";
import {
  cronLine,
  describeSchedule,
  formatTime,
  type NormalizedSchedule,
} from "./schedule";

/** Escape `%` for use inside a crontab line (cron treats a bare `%` as a newline). */
function escapePercentForCrontab(text: string): string {
  return text.replace(/%/g, "\\%");
}

const PLACEHOLDER_COMMAND = "your-command-here";

function commandOrPlaceholder(s: NormalizedSchedule): string {
  const c = s.command.trim();
  return c.length > 0 ? c : PLACEHOLDER_COMMAND;
}

/**
 * The core guard test, e.g. `[ $(( (today - ANCHOR) % 14 )) -eq 0 ]`.
 * @param percent the literal percent token to emit: `"%"` for a script, `"\\%"` for cron.
 */
export function guardTest(s: NormalizedSchedule, percent: string): string {
  const today = `$(date -u -d "$(TZ='${s.timezone}' date +${percent}F)" +${percent}s) / 86400`;
  const weekDiv = s.isWeekly ? " / 7" : "";
  const expr = `(${today} - ${s.effectiveAnchorDayNumber})${weekDiv} ${percent} ${s.interval}`;
  return `[ $(( ${expr} )) -eq 0 ]`;
}

/** The gating frequency in words, for comments ("every day" / "every Monday"). */
function gatingFrequency(s: NormalizedSchedule): string {
  return s.isWeekly ? `every ${weekdayName(s.weekday)}` : "every day";
}

const intervalNoteLines = (s: NormalizedSchedule): string[] =>
  s.interval === 1
    ? [
        "# Note: interval is 1, so the cron line alone suffices; the guard is a harmless no-op.",
      ]
    : [];

/**
 * A complete, ready-to-paste `crontab -e` block: a `CRON_TZ` line plus the gating cron
 * line with the guard inlined before the command. All `%` are escaped for crontab.
 */
export function crontabBlock(s: NormalizedSchedule): string {
  const command = escapePercentForCrontab(commandOrPlaceholder(s));
  const guard = guardTest(s, "\\%");
  const lines = [
    `# CronAnchor: ${describeSchedule(s)}`,
    "# Requires GNU coreutils `date`. Runs only on true interval boundaries.",
    ...intervalNoteLines(s),
    `CRON_TZ=${s.timezone}`,
    `${cronLine(s)} ${guard} && ${command}`,
  ];
  return lines.join("\n");
}

/**
 * A standalone POSIX shell script alternative: cron calls this at the gating frequency
 * and the script self-exits unless today is a real interval boundary. Uses plain `%`.
 */
export function shellGuardScript(s: NormalizedSchedule): string {
  const command = commandOrPlaceholder(s);
  const guard = guardTest(s, "%");
  const cronHint = `${cronLine(s)} /path/to/this-script.sh`;
  const lines = [
    "#!/usr/bin/env sh",
    `# CronAnchor guard: ${describeSchedule(s)}`,
    "# Requires GNU coreutils `date`.",
    `# Have cron call this ${gatingFrequency(s)} at ${formatTime(s)} (${s.timezone}):`,
    `#   CRON_TZ=${s.timezone}`,
    `#   ${cronHint}`,
    ...intervalNoteLines(s),
    "set -eu",
    "",
    `anchor_days=${s.effectiveAnchorDayNumber}   # day-number of ${formatCivilDate(s.effectiveAnchor)}`,
    `today_days=$(( $(date -u -d "$(TZ='${s.timezone}' date +%F)" +%s) / 86400 ))`,
    "",
    `# Exit unless today is a true ${describeInterval(s)} boundary from the anchor.`,
    `${guard} || exit 0`,
    "",
    "# ----- your job below -----",
    command,
    "",
  ];
  return lines.join("\n");
}

function describeInterval(s: NormalizedSchedule): string {
  if (!s.isWeekly) return s.interval === 1 ? "daily" : `${s.interval}-day`;
  return s.interval === 1 ? "weekly" : `${s.interval}-week`;
}
