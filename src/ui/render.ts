/** Pure HTML builders for the output blocks, preview, jobs list, and states. */

import {
  formatCivilDate,
  weekdayName,
  weekdayNameShort,
  weekdayOf,
  type CivilDate,
} from "../core/dates";
import {
  gnuCompactCrontab,
  portableCrontabBlock,
  portableGuardScript,
} from "../core/guard";
import { combinedCrontabFile } from "../core/jobs";
import {
  cronLine,
  describeSchedule,
  formatTime,
  isFireDate,
  nextFireDates,
  type FireDate,
  type NormalizedSchedule,
} from "../core/schedule";
import { systemdUnits } from "../core/systemd";
import type { FieldError, ScheduleConfig } from "../core/types";
import { validateConfig } from "../core/validate";
import { escapeHtml } from "./dom";
import { clipboardIcon } from "./icons";

function outputBlock(id: string, label: string, sublabel: string, code: string): string {
  return `
    <div class="output-block">
      <div class="output-head">
        <div><span class="label">${escapeHtml(label)}</span> <span class="sublabel">${escapeHtml(sublabel)}</span></div>
        <button class="btn" type="button" data-copy="${id}" aria-label="Copy ${escapeHtml(label)}">
          ${clipboardIcon}<span class="btn-label">Copy</span>
        </button>
      </div>
      <pre class="code" data-code="${id}">${escapeHtml(code)}</pre>
    </div>`;
}

/** Render the generated output: portable crontab + cron line + script + GNU + systemd. */
export function renderOutputs(s: NormalizedSchedule): string {
  const units = systemdUnits(s);
  return [
    `<p class="preview-desc">${escapeHtml(describeSchedule(s))}</p>`,
    outputBlock(
      "crontab",
      "Full crontab block",
      "portable — paste into `crontab -e`",
      portableCrontabBlock(s),
    ),
    outputBlock("cron", "Cron line only", "the gating frequency", cronLine(s)),
    outputBlock(
      "guard",
      "Shell guard script",
      "portable .sh — have cron call it",
      portableGuardScript(s),
    ),
    `<details class="output-details">
      <summary>Compact crontab line — GNU coreutils <code>date</code> only</summary>
      ${outputBlock("gnu", "Compact crontab (GNU only)", "shorter, needs GNU date", gnuCompactCrontab(s))}
    </details>`,
    `<div class="systemd-section">
      <h3>systemd timer <span class="sublabel">— alternative to cron</span></h3>
      ${outputBlock("timer", "cronanchor.timer", "the schedule unit", units.timer)}
      ${outputBlock("service", "cronanchor.service", "interval gate via ExecCondition", units.service)}
      <pre class="code note">${escapeHtml(units.install)}</pre>
    </div>`,
  ].join("\n");
}

/** Render the next-fire-date preview list. */
export function renderPreview(s: NormalizedSchedule, fires: FireDate[]): string {
  if (fires.length === 0) {
    return `<p class="placeholder">No upcoming fire dates to show.</p>`;
  }
  const time = formatTime(s);
  const rows = fires
    .map((f) => {
      const gap =
        f.gapDays === null
          ? `<span class="pv-gap">start</span>`
          : `<span class="pv-gap">+${f.gapDays}d</span>`;
      return `<li>
        <span class="tick" aria-hidden="true"></span>
        <span class="pv-weekday">${weekdayNameShort(f.weekday)}</span>
        <span class="pv-date">${formatCivilDate(f.date)}</span>
        <span class="pv-time">${time}</span>
        ${gap}
      </li>`;
    })
    .join("");
  return `<ol class="preview-list">${rows}</ol>`;
}

/** Render the "would it run on date X?" result for a valid schedule. */
export function renderDateCheck(s: NormalizedSchedule, date: CivilDate): string {
  const time = formatTime(s);
  if (isFireDate(s, date)) {
    const when = `${weekdayName(weekdayOf(date))} ${formatCivilDate(date)} at ${time}`;
    return `<p class="check-result check-yes">✓ Yes — runs on ${escapeHtml(when)}</p>`;
  }
  const next = nextFireDates(s, 1, date)[0];
  const nextStr = next
    ? `${weekdayName(next.weekday)} ${formatCivilDate(next.date)} at ${time}`
    : "—";
  return `<p class="check-result check-no">✗ No run on ${formatCivilDate(date)} — next run is ${escapeHtml(nextStr)}</p>`;
}

/** Render the saved-jobs list + the combined crontab-file export. */
export function renderJobs(jobs: readonly ScheduleConfig[]): string {
  if (jobs.length === 0) {
    return `<p class="placeholder">No jobs added yet. Configure a schedule above, then “Add to crontab file”.</p>`;
  }
  const items = jobs
    .map((c, i) => {
      const r = validateConfig(c);
      const label = r.ok
        ? describeSchedule(r.schedule)
        : "(invalid schedule — skipped in export)";
      return `<li class="job-item">
        <span class="job-desc">${escapeHtml(label)}</span>
        <button class="btn" type="button" data-remove-job="${i}" aria-label="Remove job ${i + 1}">Remove</button>
      </li>`;
    })
    .join("");
  const count = jobs.length;
  return [
    `<ol class="job-list">${items}</ol>`,
    outputBlock(
      "jobsfile",
      "Combined crontab file",
      `${count} job${count === 1 ? "" : "s"}`,
      combinedCrontabFile(jobs),
    ),
    `<div class="btn-row"><button class="btn" type="button" id="download-jobs">Download .cron</button></div>`,
  ].join("\n");
}

/** Render a blocking error summary when the configuration is invalid. */
export function renderErrorBlock(errors: readonly FieldError[]): string {
  const items = errors.map((e) => `<li>${escapeHtml(e.message)}</li>`).join("");
  return `<div class="block-error" role="alert">
      <strong>Fix these to generate a schedule:</strong>
      <ul>${items}</ul>
    </div>`;
}

/** The calm empty state shown before any valid input. */
export function renderEmpty(): string {
  return `<p class="placeholder">Set a cadence and an anchor date to generate your schedule.</p>`;
}
