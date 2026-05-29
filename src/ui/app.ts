/**
 * Wires inputs → core → rendered output, keeps the URL in sync, and manages UI state.
 * Every change rebuilds an immutable ScheduleConfig, validates it, and renders either the
 * output + preview or field-level errors. The only UI state not held by a native input is
 * `currentMode` (the segmented control's selection); the core stays pure.
 */

import { formatCivilDate, todayInZone, weekdayName } from "../core/dates";
import { formatTime, nextFireDates } from "../core/schedule";
import { detectTimezone, listTimezones } from "../core/timezones";
import type { CadenceMode, ScheduleConfig, Weekday } from "../core/types";
import { decodeConfigFromQuery, encodeConfigToQuery } from "../core/urlstate";
import { validateConfig } from "../core/validate";
import { copyText, escapeHtml, must } from "./dom";
import { checkIcon, clipboardIcon, clockIcon, shieldIcon } from "./icons";
import { renderEmpty, renderErrorBlock, renderOutputs, renderPreview } from "./render";

const PREVIEW_COUNT = 20;

const MODES: { id: CadenceMode; label: string }[] = [
  { id: "everyNDays", label: "Every N days" },
  { id: "everyNWeeksWeekday", label: "Every N weeks on…" },
  { id: "everyNWeeksAnchored", label: "Every N weeks (from date)" },
];

function defaultConfig(): ScheduleConfig {
  const timezone = detectTimezone();
  const today = formatCivilDate(todayInZone(timezone));
  return {
    mode: "everyNWeeksWeekday",
    interval: 2,
    weekday: 1,
    hour: 9,
    minute: 0,
    anchorDate: today,
    timezone,
    command: "/path/to/job.sh",
  };
}

function timezoneOptions(selected: string): string {
  const zones = listTimezones();
  if (!zones.includes(selected)) zones.unshift(selected);
  return zones
    .map(
      (z) =>
        `<option value="${escapeHtml(z)}"${z === selected ? " selected" : ""}>${escapeHtml(z)}</option>`,
    )
    .join("");
}

function weekdayOptions(selected: number): string {
  let out = "";
  for (let i = 0; i < 7; i++) {
    out += `<option value="${i}"${i === selected ? " selected" : ""}>${weekdayName(i)}</option>`;
  }
  return out;
}

function shellHtml(c: ScheduleConfig): string {
  const time = formatTime({ hour: c.hour, minute: c.minute });
  return `
  <div class="page stack">
    <header class="masthead">
      <h1>Cron<span class="anchor-accent">Anchor</span></h1>
      <p class="tagline">Generate a correct cron schedule for true <strong>every&nbsp;N&nbsp;days</strong> and <strong>every&nbsp;N&nbsp;weeks</strong> intervals — verified before you install.</p>
    </header>

    <details class="card explainer" id="explainer">
      <summary>Why <code>0 0 */14 * *</code> is <strong>not</strong> "every 14 days"<span class="toggle-hint">— show why</span></summary>
      <div class="detail stack">
        <p>Cron evaluates <code>*/14</code> inside the day-of-month field (range 1–31), so it fires on
        <span class="fires-list">days 1, 15, 29</span> — then <strong>resets at the month boundary</strong>.
        The gap from the 29th to the next 1st is only 2–3 days, not 14.</p>
        <p>The fix: run cron at a gating frequency (daily, or weekly on a weekday) and add a small
        <strong>shell guard</strong> that only lets the job run on true interval boundaries, counted from an
        <strong>anchor date</strong>. CronAnchor writes that guard for you — DST-safe — and shows the real fire dates.</p>
      </div>
    </details>

    <section class="card" aria-labelledby="cfg-title">
      <h2 id="cfg-title">Configure</h2>
      <div class="field field--wide">
        <label id="mode-label">Cadence</label>
        <div class="segmented" role="group" aria-labelledby="mode-label" id="mode-group">
          ${MODES.map(
            (m) =>
              `<button type="button" data-mode="${m.id}" aria-pressed="${m.id === c.mode}">${m.label}</button>`,
          ).join("")}
        </div>
      </div>

      <div class="field-grid">
        <div class="field">
          <label for="interval" id="interval-label">Interval (N)</label>
          <input type="number" id="interval" min="1" step="1" inputmode="numeric"
            value="${c.interval}" aria-describedby="interval-unit err-interval" />
          <span class="field-note" id="interval-unit"></span>
          <span class="field-error" id="err-interval" data-error-for="interval" aria-live="polite"></span>
        </div>

        <div class="field" id="field-weekday">
          <label for="weekday">Weekday</label>
          <select id="weekday" aria-describedby="err-weekday">${weekdayOptions(c.weekday)}</select>
          <span class="field-note" id="weekday-derived"></span>
          <span class="field-error" id="err-weekday" data-error-for="weekday" aria-live="polite"></span>
        </div>

        <div class="field">
          <label for="time">Time of day</label>
          <input type="time" id="time" value="${time}" aria-describedby="err-hour err-minute" />
          <span class="field-error" id="err-hour" data-error-for="hour" aria-live="polite"></span>
          <span class="field-error" id="err-minute" data-error-for="minute" aria-live="polite"></span>
        </div>

        <div class="field">
          <label for="anchor">Anchor start date</label>
          <input type="date" id="anchor" value="${escapeHtml(c.anchorDate)}" aria-describedby="err-anchor" />
          <span class="field-note" id="anchor-effective"></span>
          <span class="field-error" id="err-anchor" data-error-for="anchorDate" aria-live="polite"></span>
        </div>

        <div class="field">
          <label for="timezone">Timezone (IANA)</label>
          <select id="timezone" aria-describedby="err-timezone">${timezoneOptions(c.timezone)}</select>
          <span class="field-error" id="err-timezone" data-error-for="timezone" aria-live="polite"></span>
        </div>

        <div class="field field--wide">
          <label for="command">Command</label>
          <input type="text" id="command" value="${escapeHtml(c.command)}"
            spellcheck="false" autocapitalize="off" autocorrect="off" aria-describedby="err-command" />
          <span class="field-error" id="err-command" data-error-for="command" aria-live="polite"></span>
        </div>
      </div>
    </section>

    <section class="card" aria-labelledby="out-title">
      <h2 id="out-title">Generated schedule</h2>
      <div id="output">${renderEmpty()}</div>
    </section>

    <section class="card" aria-labelledby="prev-title">
      <h2 id="prev-title">Next ${PREVIEW_COUNT} fire dates</h2>
      <p class="section-hint">The real dates this job will run — your proof the cadence is right.</p>
      <div id="preview">${renderEmpty()}</div>
    </section>

    <footer class="site-footer">
      <p><span class="badge">${shieldIcon} 100% client-side</span> — nothing you type leaves your browser; no network calls, no tracking.</p>
      <p><span class="badge">${clockIcon} GNU coreutils</span> — the generated guard targets GNU <code>date</code> (Linux). BSD/macOS/busybox <code>date</code> differ.</p>
      <p>Open source under the MIT license.</p>
    </footer>
  </div>`;
}

export function mountApp(root: HTMLElement): void {
  const initial = decodeConfigFromQuery(window.location.search, defaultConfig());
  root.innerHTML = shellHtml(initial);

  let currentMode: CadenceMode = initial.mode;

  const el = {
    modeGroup: must<HTMLDivElement>(root, "#mode-group"),
    interval: must<HTMLInputElement>(root, "#interval"),
    intervalUnit: must<HTMLSpanElement>(root, "#interval-unit"),
    fieldWeekday: must<HTMLDivElement>(root, "#field-weekday"),
    weekday: must<HTMLSelectElement>(root, "#weekday"),
    weekdayDerived: must<HTMLSpanElement>(root, "#weekday-derived"),
    time: must<HTMLInputElement>(root, "#time"),
    anchor: must<HTMLInputElement>(root, "#anchor"),
    anchorEffective: must<HTMLSpanElement>(root, "#anchor-effective"),
    timezone: must<HTMLSelectElement>(root, "#timezone"),
    command: must<HTMLInputElement>(root, "#command"),
    output: must<HTMLDivElement>(root, "#output"),
    preview: must<HTMLDivElement>(root, "#preview"),
  };

  function readConfig(): ScheduleConfig {
    const [hStr, mStr] = el.time.value.split(":");
    const hour = Number(hStr);
    const minute = Number(mStr);
    return {
      mode: currentMode,
      interval: Math.trunc(Number(el.interval.value)),
      weekday: Number(el.weekday.value) as Weekday,
      hour: Number.isFinite(hour) ? hour : NaN,
      minute: Number.isFinite(minute) ? minute : NaN,
      anchorDate: el.anchor.value,
      timezone: el.timezone.value,
      command: el.command.value,
    };
  }

  function clearErrors(): void {
    root
      .querySelectorAll<HTMLElement>(".field-error")
      .forEach((s) => (s.textContent = ""));
    [el.interval, el.weekday, el.time, el.anchor, el.timezone, el.command].forEach(
      (input) => input.removeAttribute("aria-invalid"),
    );
  }

  function showErrors(errors: readonly { field: string; message: string }[]): void {
    const fieldToInput: Record<string, HTMLElement> = {
      interval: el.interval,
      weekday: el.weekday,
      hour: el.time,
      minute: el.time,
      anchorDate: el.anchor,
      timezone: el.timezone,
      command: el.command,
    };
    for (const e of errors) {
      const span = root.querySelector<HTMLElement>(
        `.field-error[data-error-for="${e.field}"]`,
      );
      if (span) span.textContent = e.message;
      const input = fieldToInput[e.field];
      if (input) input.setAttribute("aria-invalid", "true");
    }
  }

  function syncModeUI(): void {
    el.modeGroup.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset["mode"] === currentMode));
    });
    // Weekday is only chosen explicitly in everyNWeeksWeekday.
    el.fieldWeekday.style.display = currentMode === "everyNWeeksWeekday" ? "" : "none";
    el.intervalUnit.textContent =
      currentMode === "everyNDays" ? "days between runs" : "weeks between runs";
  }

  function update(): void {
    syncModeUI();
    const config = readConfig();

    // Keep the URL shareable/bookmarkable.
    const query = encodeConfigToQuery(config);
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);

    clearErrors();
    const result = validateConfig(config);

    if (!result.ok) {
      showErrors(result.errors);
      el.output.innerHTML = renderErrorBlock(result.errors);
      el.preview.innerHTML = renderEmpty();
      el.anchorEffective.textContent = "";
      el.weekdayDerived.textContent = "";
      return;
    }

    const { schedule } = result;
    el.output.innerHTML = renderOutputs(schedule);

    const fires = nextFireDates(schedule, PREVIEW_COUNT, todayInZone(schedule.timezone));
    el.preview.innerHTML = renderPreview(schedule, fires);

    // Helpful derived hints.
    const eff = formatCivilDate(schedule.effectiveAnchor);
    el.anchorEffective.textContent =
      eff === config.anchorDate ? "" : `First run adjusts to ${eff}`;
    el.weekdayDerived.textContent =
      currentMode === "everyNWeeksAnchored"
        ? `Derived from the anchor: ${weekdayName(schedule.weekday)}`
        : "";

    wireCopyButtons();
  }

  function wireCopyButtons(): void {
    const idle = `${clipboardIcon}<span class="btn-label">Copy</span>`;
    const done = `${checkIcon}<span class="btn-label">Copied</span>`;
    const failed = `${clipboardIcon}<span class="btn-label">Press Ctrl+C</span>`;
    el.output.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset["copy"];
        const pre = el.output.querySelector<HTMLPreElement>(`pre[data-code="${id}"]`);
        if (!pre) return;
        const ok = await copyText(pre.textContent ?? "");
        btn.innerHTML = ok ? done : failed;
        btn.classList.toggle("copied", ok);
        window.setTimeout(() => {
          btn.innerHTML = idle;
          btn.classList.remove("copied");
        }, 1500);
      });
    });
  }

  // ----- events -----
  el.modeGroup.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      currentMode = (b.dataset["mode"] as CadenceMode) ?? currentMode;
      update();
    });
  });

  [el.interval, el.weekday, el.time, el.anchor, el.timezone, el.command].forEach(
    (input) => {
      input.addEventListener("input", update);
      input.addEventListener("change", update);
    },
  );

  update();
}
