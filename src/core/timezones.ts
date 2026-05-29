/** IANA timezone helpers, built on `Intl` (no data shipped by us). */

const intl = Intl as typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

/** A small, always-available fallback if `Intl.supportedValuesOf` is missing. */
const FALLBACK_ZONES: readonly string[] = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/** The full list of IANA zones the runtime supports, with UTC first. */
export function listTimezones(): string[] {
  let zones: string[];
  if (typeof intl.supportedValuesOf === "function") {
    try {
      zones = intl.supportedValuesOf("timeZone");
    } catch {
      zones = [...FALLBACK_ZONES];
    }
  } else {
    zones = [...FALLBACK_ZONES];
  }
  const withoutUtc = zones.filter((z) => z !== "UTC");
  return ["UTC", ...withoutUtc];
}

/** Whether `tz` is a timezone the runtime accepts. */
export function isValidTimezone(tz: string): boolean {
  if (!tz || tz.trim().length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The runtime's current timezone, or "UTC" if it can't be detected. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
