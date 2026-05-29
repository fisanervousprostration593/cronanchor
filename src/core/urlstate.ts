/**
 * Serialize a configuration to/from a URL query string so a schedule can be shared,
 * bookmarked, and restored on load. Decoding is lenient: it best-effort restores values
 * and leaves correctness to `validateConfig` (so a shared link with a stale value still
 * loads and shows a clear error rather than silently breaking).
 */

import type { CadenceMode, ScheduleConfig, Weekday } from "./types";

const MODES: readonly CadenceMode[] = [
  "everyNDays",
  "everyNWeeksWeekday",
  "everyNWeeksAnchored",
];

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Encode a config into a `URLSearchParams` query string (no leading "?"). */
export function encodeConfigToQuery(c: ScheduleConfig): string {
  const p = new URLSearchParams();
  p.set("mode", c.mode);
  p.set("n", String(c.interval));
  p.set("wd", String(c.weekday));
  p.set("t", `${pad2(c.hour)}:${pad2(c.minute)}`);
  p.set("a", c.anchorDate);
  p.set("tz", c.timezone);
  p.set("cmd", c.command);
  return p.toString();
}

function parseIntOr(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Decode a config from a query string, falling back to `defaults` for missing or
 * unparseable fields. Always returns a complete `ScheduleConfig`.
 */
export function decodeConfigFromQuery(
  query: string,
  defaults: ScheduleConfig,
): ScheduleConfig {
  const p = new URLSearchParams(query);

  const modeRaw = p.get("mode");
  const mode = MODES.includes(modeRaw as CadenceMode)
    ? (modeRaw as CadenceMode)
    : defaults.mode;

  const interval = parseIntOr(p.get("n"), defaults.interval);

  const wdRaw = parseIntOr(p.get("wd"), defaults.weekday);
  const weekday = (wdRaw >= 0 && wdRaw <= 6 ? wdRaw : defaults.weekday) as Weekday;

  let hour = defaults.hour;
  let minute = defaults.minute;
  const t = p.get("t");
  if (t) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (m) {
      hour = Number(m[1]);
      minute = Number(m[2]);
    }
  }

  const anchorDate = p.get("a") ?? defaults.anchorDate;
  const timezone = p.get("tz") ?? defaults.timezone;
  const command = p.get("cmd") ?? defaults.command;

  return { mode, interval, weekday, hour, minute, anchorDate, timezone, command };
}
