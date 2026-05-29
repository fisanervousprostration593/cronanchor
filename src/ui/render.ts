/** Pure HTML builders for the output blocks, the preview, and error states. */

import { formatCivilDate, weekdayNameShort } from "../core/dates";
import { crontabBlock, shellGuardScript } from "../core/guard";
import {
  cronLine,
  describeSchedule,
  formatTime,
  type FireDate,
  type NormalizedSchedule,
} from "../core/schedule";
import type { FieldError } from "../core/types";
import { escapeHtml } from "./dom";
import { clipboardIcon } from "./icons";

/** The three copyable artifacts plus the plain-English description. */
export function buildArtifacts(s: NormalizedSchedule): {
  description: string;
  crontab: string;
  cron: string;
  guard: string;
} {
  return {
    description: describeSchedule(s),
    crontab: crontabBlock(s),
    cron: cronLine(s),
    guard: shellGuardScript(s),
  };
}

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

/** Render the generated output: the crontab block, the cron line, and the script. */
export function renderOutputs(s: NormalizedSchedule): string {
  const a = buildArtifacts(s);
  return [
    `<p class="preview-desc">${escapeHtml(a.description)}</p>`,
    outputBlock("crontab", "Full crontab block", "paste into `crontab -e`", a.crontab),
    outputBlock("cron", "Cron line only", "the gating frequency", a.cron),
    outputBlock("guard", "Shell guard script", "alternative: a standalone .sh", a.guard),
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
