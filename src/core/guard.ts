/**
 * Generates the shell guard and the full crontab block from a normalized schedule.
 *
 * The guard counts whole calendar days from a baked-in anchor day-number and fires only
 * (a) on or after the anchor and (b) on true interval boundaries. It mirrors the app's
 * own date math exactly:
 *
 *   today_days = $(date -u -d "$(TZ=<zone> date +%F)" +%s) / 86400
 *   diff       = today_days - ANCHOR_DAYS
 *   fire when  diff >= 0  AND  diff [ / 7 ] % N == 0
 *
 * The `diff >= 0` floor matches the preview's clamp (it never lists fires before the
 * anchor), so the generated guard fires on exactly the previewed dates — including for
 * future anchors. Without it, C-style modulo would wrongly fire on interval-aligned
 * dates *before* a future anchor.
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

/** `today_days` arithmetic, with `percent` = "%" (script) or "\\%" (crontab). */
function todayDaysExpr(s: NormalizedSchedule, percent: string): string {
  return `$(date -u -d "$(TZ='${s.timezone}' date +${percent}F)" +${percent}s) / 86400`;
}

/** The modulo body operating on a `diff` variable: `diff % N` or `diff / 7 % N`. */
function moduloBody(s: NormalizedSchedule, varName: string, percent: string): string {
  const weekDiv = s.isWeekly ? " / 7" : "";
  return `${varName}${weekDiv} ${percent} ${s.interval}`;
}

/** The gating frequency in words, for comments ("every day" / "every Monday"). */
function gatingFrequency(s: NormalizedSchedule): string {
  return s.isWeekly ? `every ${weekdayName(s.weekday)}` : "every day";
}

const intervalNoteLines = (s: NormalizedSchedule): string[] =>
  s.interval === 1
    ? [
        "# Note: interval is 1, so only the anchor start-date floor applies (the interval check is always true).",
      ]
    : [];

/**
 * A complete, ready-to-paste `crontab -e` block: a `CRON_TZ` line plus the gating cron
 * line whose command computes the day difference once, applies the anchor floor and the
 * interval test, then runs the command. All `%` are escaped for crontab.
 */
export function crontabBlock(s: NormalizedSchedule): string {
  const command = escapePercentForCrontab(commandOrPlaceholder(s));
  const diff = `$(( ${todayDaysExpr(s, "\\%")} - ${s.effectiveAnchorDayNumber} ))`;
  const guarded =
    `d=${diff}; ` +
    `[ "$d" -ge 0 ] && ` +
    `[ $(( ${moduloBody(s, "d", "\\%")} )) -eq 0 ] && ` +
    command;
  const lines = [
    `# CronAnchor: ${describeSchedule(s)}`,
    "# Requires GNU coreutils `date`. Runs only on/after the anchor, on true interval boundaries.",
    ...intervalNoteLines(s),
    `CRON_TZ=${s.timezone}`,
    `${cronLine(s)} ${guarded}`,
  ];
  return lines.join("\n");
}

/**
 * A standalone POSIX shell script alternative: cron calls this at the gating frequency
 * and the script self-exits unless today is on/after the anchor and a real interval
 * boundary. Uses plain `%`.
 */
export function shellGuardScript(s: NormalizedSchedule): string {
  const command = commandOrPlaceholder(s);
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
    `today_days=$(( ${todayDaysExpr(s, "%")} ))`,
    "",
    `# Run only on/after the anchor, on a true ${describeInterval(s)} boundary.`,
    `[ "$today_days" -ge "$anchor_days" ] || exit 0`,
    `[ $(( ${moduloBody(s, "(today_days - anchor_days)", "%")} )) -eq 0 ] || exit 0`,
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
