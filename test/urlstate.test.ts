import { describe, it, expect } from "vitest";
import { encodeConfigToQuery, decodeConfigFromQuery } from "../src/core/urlstate";
import type { ScheduleConfig } from "../src/core/types";

const defaults: ScheduleConfig = {
  mode: "everyNWeeksWeekday",
  interval: 2,
  weekday: 1,
  hour: 9,
  minute: 0,
  anchorDate: "2025-01-06",
  timezone: "UTC",
  command: "/path/to/job.sh",
};

describe("url state round-trip", () => {
  it("encodes and decodes back to the same config", () => {
    const config: ScheduleConfig = {
      mode: "everyNDays",
      interval: 14,
      weekday: 3,
      hour: 8,
      minute: 30,
      anchorDate: "2025-03-03",
      timezone: "America/New_York",
      command: "/usr/local/bin/backup --full",
    };
    const query = encodeConfigToQuery(config);
    expect(decodeConfigFromQuery(query, defaults)).toEqual(config);
  });

  it("preserves commands with spaces and symbols", () => {
    const config: ScheduleConfig = {
      ...defaults,
      command: 'echo "hello world" && run --flag=1',
    };
    expect(decodeConfigFromQuery(encodeConfigToQuery(config), defaults)).toEqual(config);
  });
});

describe("lenient decoding", () => {
  it("uses defaults for an empty query", () => {
    expect(decodeConfigFromQuery("", defaults)).toEqual(defaults);
  });

  it("falls back on unknown mode and bad interval", () => {
    const c = decodeConfigFromQuery("mode=bogus&n=notanumber", defaults);
    expect(c.mode).toBe(defaults.mode);
    expect(c.interval).toBe(defaults.interval);
  });

  it("falls back on out-of-range weekday", () => {
    expect(decodeConfigFromQuery("wd=9", defaults).weekday).toBe(defaults.weekday);
  });

  it("parses a valid time and ignores a malformed one", () => {
    expect(decodeConfigFromQuery("t=07:45", defaults)).toMatchObject({
      hour: 7,
      minute: 45,
    });
    expect(decodeConfigFromQuery("t=garbage", defaults)).toMatchObject({
      hour: defaults.hour,
      minute: defaults.minute,
    });
  });
});
