import { describe, it, expect } from "vitest";
import { validateConfig, MAX_INTERVAL } from "../src/core/validate";
import type { ScheduleConfig } from "../src/core/types";

function config(over: Partial<ScheduleConfig> = {}): ScheduleConfig {
  return {
    mode: "everyNDays",
    interval: 14,
    weekday: 1,
    hour: 9,
    minute: 0,
    anchorDate: "2025-01-01",
    timezone: "UTC",
    command: "/path/to/job.sh",
    ...over,
  };
}

function errorFields(c: ScheduleConfig): string[] {
  const r = validateConfig(c);
  return r.ok ? [] : r.errors.map((e) => e.field);
}

describe("valid config", () => {
  it("passes and builds a schedule", () => {
    const r = validateConfig(config());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.schedule.interval).toBe(14);
      expect(r.schedule.periodDays).toBe(14);
    }
  });
});

describe("interval validation", () => {
  it("rejects zero, negative, and non-integer", () => {
    expect(errorFields(config({ interval: 0 }))).toContain("interval");
    expect(errorFields(config({ interval: -3 }))).toContain("interval");
    expect(errorFields(config({ interval: 1.5 }))).toContain("interval");
  });

  it("accepts 1", () => {
    expect(validateConfig(config({ interval: 1 })).ok).toBe(true);
  });

  it("rejects absurdly large intervals", () => {
    expect(errorFields(config({ interval: MAX_INTERVAL + 1 }))).toContain("interval");
  });
});

describe("weekday validation", () => {
  it("requires a valid weekday only for everyNWeeksWeekday", () => {
    expect(
      errorFields(config({ mode: "everyNWeeksWeekday", weekday: 9 as never })),
    ).toContain("weekday");
    // weekday is ignored in days mode, so a bad value there is not an error
    expect(
      errorFields(config({ mode: "everyNDays", weekday: 9 as never })),
    ).not.toContain("weekday");
  });
});

describe("time validation", () => {
  it("rejects out-of-range hours and minutes", () => {
    expect(errorFields(config({ hour: 24 }))).toContain("hour");
    expect(errorFields(config({ hour: -1 }))).toContain("hour");
    expect(errorFields(config({ minute: 60 }))).toContain("minute");
  });
});

describe("anchor validation", () => {
  it("rejects impossible and malformed dates", () => {
    expect(errorFields(config({ anchorDate: "2025-02-30" }))).toContain("anchorDate");
    expect(errorFields(config({ anchorDate: "nope" }))).toContain("anchorDate");
    expect(errorFields(config({ anchorDate: "" }))).toContain("anchorDate");
  });
});

describe("timezone validation", () => {
  it("rejects invalid zones", () => {
    expect(errorFields(config({ timezone: "Mars/Phobos" }))).toContain("timezone");
    expect(errorFields(config({ timezone: "" }))).toContain("timezone");
  });
});

describe("command validation", () => {
  it("rejects empty/whitespace commands", () => {
    expect(errorFields(config({ command: "" }))).toContain("command");
    expect(errorFields(config({ command: "   " }))).toContain("command");
  });

  it("rejects commands containing newlines (crontab line-injection guard)", () => {
    expect(errorFields(config({ command: "echo hi\nrm -rf /tmp/foo" }))).toContain(
      "command",
    );
    expect(errorFields(config({ command: "echo hi\r\necho bye" }))).toContain("command");
  });
});

describe("multiple errors", () => {
  it("reports all problems at once", () => {
    const fields = errorFields(
      config({ interval: 0, hour: 99, anchorDate: "bad", timezone: "x", command: "" }),
    );
    expect(new Set(fields)).toEqual(
      new Set(["interval", "hour", "anchorDate", "timezone", "command"]),
    );
  });
});
