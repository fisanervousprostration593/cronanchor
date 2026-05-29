/**
 * Generates a systemd timer + service pair equivalent to the cron guard.
 *
 * systemd `OnCalendar` can't express true biweekly either, so we use the same two-part
 * strategy as cron: the **timer** fires at the gating frequency (daily, or weekly on the
 * weekday), and the **service** runs the interval test as `ExecCondition=` — which, on a
 * non-zero exit, *cleanly skips* the run (not a failure). The condition uses the same
 * portable Julian-Day math as the cron guard, with `TZ` pinned to the chosen zone so the
 * day arithmetic is zone-correct regardless of the host timezone.
 *
 * In unit files a literal `%` must be written `%%` (systemd treats `%` as a specifier
 * introducer), so the embedded shell uses `%%`.
 */

import { formatCivilDate } from "./dates";
import { commandOrPlaceholder, moduloBody, portableDayNumberStatements } from "./guard";
import { describeSchedule, formatTime, type NormalizedSchedule } from "./schedule";

const SYSTEMD_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** The OnCalendar expression. Trailing IANA timezone needs systemd >= v252. */
function onCalendar(s: NormalizedSchedule): string {
  const time = `${formatTime(s)}:00`;
  const day = s.isWeekly ? `${SYSTEMD_DOW[s.weekday] ?? "Mon"} ` : "";
  return `${day}*-*-* ${time} ${s.timezone}`;
}

/** Wrap a command as a single-quoted `sh` argument, escaping embedded single quotes. */
function shSingleQuote(text: string): string {
  return `'${text.replace(/'/g, "'\\''")}'`;
}

/** Escape `%` for a systemd unit file (literal percent is `%%`). */
function systemdPercent(text: string): string {
  return text.replace(/%/g, "%%");
}

/** The `ExecCondition=` line: exit 0 to run, non-zero to skip. Portable, `%%`-escaped. */
function execConditionTest(s: NormalizedSchedule): string {
  const stmts = portableDayNumberStatements(s, "%%", "").join("; ");
  return (
    `${stmts}; ` +
    `diff=$(( today_days - ${s.effectiveAnchorDayNumber} )); ` +
    `[ "$diff" -ge 0 ] && [ $(( ${moduloBody(s, "diff", "%%")} )) -eq 0 ]`
  );
}

export interface SystemdUnits {
  readonly timer: string;
  readonly service: string;
  readonly install: string;
}

/** The `.timer`, `.service`, and an install-notes comment block. */
export function systemdUnits(s: NormalizedSchedule): SystemdUnits {
  const desc = describeSchedule(s);
  const intervalNote =
    s.interval === 1
      ? "\n# Note: interval is 1, so the ExecCondition only enforces the anchor start date."
      : "";

  const timer = [
    `# CronAnchor timer: ${desc}`,
    "# The trailing timezone in OnCalendar requires systemd >= v252.",
    "[Unit]",
    `Description=CronAnchor: ${desc}`,
    "",
    "[Timer]",
    `OnCalendar=${onCalendar(s)}`,
    "Persistent=true",
    "",
    "[Install]",
    "WantedBy=timers.target",
    "",
  ].join("\n");

  const service = [
    `# CronAnchor service: runs only on true interval boundaries via ExecCondition.${intervalNote}`,
    "[Unit]",
    `Description=CronAnchor job: ${desc}`,
    "",
    "[Service]",
    "Type=oneshot",
    `ExecCondition=/bin/sh -c ${shSingleQuote(execConditionTest(s))}`,
    `ExecStart=/bin/sh -c ${shSingleQuote(systemdPercent(commandOrPlaceholder(s)))}`,
    "",
  ].join("\n");

  const install = [
    "# Save the two blocks above as:",
    "#   ~/.config/systemd/user/cronanchor.timer",
    "#   ~/.config/systemd/user/cronanchor.service",
    "# then enable:",
    "#   systemctl --user daemon-reload",
    "#   systemctl --user enable --now cronanchor.timer",
    `# First run: ${formatCivilDate(s.effectiveAnchor)}. ExecStart is wrapped in 'sh -c' —`,
    "# adjust it if your command needs a login shell or a specific working directory.",
    "# Persistent=true recovers a run missed while powered off only if boot lands on a true",
    "# interval boundary (the ExecCondition still gates by date); off-boundary boots are skipped.",
  ].join("\n");

  return { timer, service, install };
}
