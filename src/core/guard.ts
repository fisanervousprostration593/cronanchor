/**
 * Generates the cron/shell guard artifacts from a normalized schedule.
 *
 * The guard counts whole calendar days from a baked-in anchor day-number and fires only
 * (a) on or after the anchor and (b) on true interval boundaries:
 *
 *   diff = today_days - ANCHOR_DAYS
 *   fire when  diff >= 0  AND  diff [ / 7 ] % N == 0
 *
 * The `diff >= 0` floor matches the preview's clamp (it never lists fires before the
 * anchor), so the generated guard fires on exactly the previewed dates — including for
 * future anchors. The floor also keeps the modulo off negative numbers, sidestepping
 * implementation-defined negative-modulo behavior.
 *
 * Two flavors:
 *  - **Portable** (`portableGuardScript`, `portableCrontabBlock`): computes today's
 *    day-number from `date +%Y/%m/%d` (universal) via the Julian Day Number, in pure POSIX
 *    shell arithmetic. No `date -d`, so it runs identically on GNU/Linux, macOS/BSD, and
 *    busybox. This is the recommended output.
 *  - **GNU compact** (`gnuCompactCrontab`): the shorter `date -u -d` one-liner — GNU
 *    coreutils only — kept as a convenience.
 *
 * `jdn - 2440588` converts a Julian Day Number to days-since-1970-01-01, matching the
 * engine's `dayNumber` (JDN of the epoch is 2440588). Leading zeros are stripped
 * (`${2#0}`) so `08`/`09` aren't parsed as invalid octal in `$(( ))`.
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

export function commandOrPlaceholder(s: NormalizedSchedule): string {
  const c = s.command.trim();
  return c.length > 0 ? c : PLACEHOLDER_COMMAND;
}

/**
 * The interval-test body for a single `[ $(( … )) -eq 0 ]` check.
 * - days: `diff % N`
 * - weeks: `diff % 7 + diff / 7 % N` — sum is 0 iff the day is on the target weekday AND
 *   on a true N-week boundary (both terms are non-negative because the caller floors at
 *   `diff >= 0` first). This makes the guard exactly equal to `isFireDate`, even if the
 *   standalone script is run off its cron/timer weekday.
 */
export function moduloBody(
  s: NormalizedSchedule,
  varName: string,
  percent: string,
): string {
  if (s.isWeekly) {
    return `${varName} ${percent} 7 + ${varName} / 7 ${percent} ${s.interval}`;
  }
  return `${varName} ${percent} ${s.interval}`;
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

function describeInterval(s: NormalizedSchedule): string {
  if (!s.isWeekly) return s.interval === 1 ? "daily" : `${s.interval}-day`;
  return s.interval === 1 ? "weekly" : `${s.interval}-week`;
}

/**
 * Shell statements that leave today's day-number (days since 1970-01-01) in `today_days`,
 * using only portable `date` + arithmetic. `percent` is "%" (script), "\\%" (crontab), or
 * "%%" (systemd unit). `tzQuote` wraps the TZ value — "'" for cron/script, "" for a
 * command already inside `sh -c '...'` (validated IANA zones have no shell-special chars).
 */
export function portableDayNumberStatements(
  s: NormalizedSchedule,
  percent: string,
  tzQuote = "'",
): string[] {
  const tz = `TZ=${tzQuote}${s.timezone}${tzQuote}`;
  // Three single-specifier `date` calls (no spaces/quotes in the format) so the statements
  // compose cleanly inside a `sh -c '...'` wrapper too.
  return [
    `Y=$(${tz} date +${percent}Y)`,
    `M=$(${tz} date +${percent}m)`,
    `D=$(${tz} date +${percent}d)`,
    "M=${M#0}; D=${D#0}",
    "a=$(( (14 - M) / 12 ))",
    "y=$(( Y + 4800 - a ))",
    "m=$(( M + 12 * a - 3 ))",
    "jdn=$(( D + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045 ))",
    "today_days=$(( jdn - 2440588 ))",
  ];
}

/** `today_days` via GNU `date -u -d` (one expression). GNU coreutils only. */
function gnuTodayDaysExpr(s: NormalizedSchedule, percent: string): string {
  return `$(date -u -d "$(TZ='${s.timezone}' date +${percent}F)" +${percent}s) / 86400`;
}

/**
 * Standalone portable POSIX guard script. cron calls it at the gating frequency; it
 * self-exits unless today is on/after the anchor and a true interval boundary. Plain `%`.
 * Runs on GNU/Linux, macOS/BSD, and busybox.
 */
export function portableGuardScript(s: NormalizedSchedule): string {
  const lines = [
    "#!/usr/bin/env sh",
    `# CronAnchor guard: ${describeSchedule(s)}`,
    "# Portable: only POSIX `date` (+%Y/%m/%d) and shell arithmetic, so it runs on",
    "# GNU/Linux, macOS/BSD, and busybox alike — no `date -d` required.",
    `# Have cron call this ${gatingFrequency(s)} at ${formatTime(s)} (${s.timezone}):`,
    `#   CRON_TZ=${s.timezone}`,
    `#   ${cronLine(s)} /path/to/this-script.sh`,
    ...intervalNoteLines(s),
    "set -eu",
    "",
    `# Today's date in ${s.timezone} as integers (strip leading zeros to avoid octal).`,
    ...portableDayNumberStatements(s, "%"),
    "",
    `anchor_days=${s.effectiveAnchorDayNumber}   # day-number of ${formatCivilDate(s.effectiveAnchor)}`,
    "diff=$(( today_days - anchor_days ))",
    "",
    `# Run only on/after the anchor, on a true ${describeInterval(s)} boundary.`,
    `[ "$diff" -ge 0 ] || exit 0`,
    `[ $(( ${moduloBody(s, "diff", "%")} )) -eq 0 ] || exit 0`,
    "",
    "# ----- your job below -----",
    commandOrPlaceholder(s),
    "",
  ];
  return lines.join("\n");
}

/**
 * A complete, ready-to-paste `crontab -e` block using the portable guard inline. A
 * `CRON_TZ` line + the gating cron line whose command computes the day-number, applies the
 * anchor floor and the interval test, then runs the command. All `%` escaped for crontab.
 */
export function portableCrontabBlock(s: NormalizedSchedule): string {
  const command = escapePercentForCrontab(commandOrPlaceholder(s));
  const stmts = portableDayNumberStatements(s, "\\%").join("; ");
  const guarded =
    `${stmts}; ` +
    `diff=$(( today_days - ${s.effectiveAnchorDayNumber} )); ` +
    `[ "$diff" -ge 0 ] && ` +
    `[ $(( ${moduloBody(s, "diff", "\\%")} )) -eq 0 ] && ` +
    command;
  const lines = [
    `# CronAnchor: ${describeSchedule(s)}`,
    "# Portable POSIX guard — runs on GNU/Linux, macOS/BSD, and busybox (no `date -d`).",
    ...intervalNoteLines(s),
    `CRON_TZ=${s.timezone}`,
    `${cronLine(s)} ${guarded}`,
  ];
  return lines.join("\n");
}

/**
 * The compact GNU-only crontab one-liner (`date -u -d`). Shorter than the portable form,
 * but requires GNU coreutils `date`. Kept as a convenience.
 */
export function gnuCompactCrontab(s: NormalizedSchedule): string {
  const command = escapePercentForCrontab(commandOrPlaceholder(s));
  const diff = `$(( ${gnuTodayDaysExpr(s, "\\%")} - ${s.effectiveAnchorDayNumber} ))`;
  const guarded =
    `d=${diff}; ` +
    `[ "$d" -ge 0 ] && ` +
    `[ $(( ${moduloBody(s, "d", "\\%")} )) -eq 0 ] && ` +
    command;
  const lines = [
    `# CronAnchor (compact — GNU coreutils \`date\` only): ${describeSchedule(s)}`,
    `CRON_TZ=${s.timezone}`,
    `${cronLine(s)} ${guarded}`,
  ];
  return lines.join("\n");
}
