import { describe, it, expect } from "vitest";
import {
  encodeConfigToQuery,
  decodeConfigFromQuery,
  encodeJobsParam,
  decodeJobsParam,
  encodeState,
} from "../src/core/urlstate";
import { MAX_JOBS } from "../src/core/jobs";
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

describe("jobs param", () => {
  const jobA: ScheduleConfig = {
    ...defaults,
    mode: "everyNDays",
    interval: 14,
    anchorDate: "2025-01-01",
  };
  const jobB: ScheduleConfig = {
    ...defaults,
    timezone: "America/New_York",
    command: "/usr/local/bin/backup --full",
  };

  it("round-trips a job list through encodeState/decodeJobsParam", () => {
    const query = encodeState(defaults, [jobA, jobB]);
    expect(decodeJobsParam(query, defaults)).toEqual([jobA, jobB]);
  });

  it("omits the jobs param when the list is empty", () => {
    const query = encodeState(defaults, []);
    expect(query).not.toContain("jobs=");
    expect(decodeJobsParam(query, defaults)).toEqual([]);
  });

  it("decodes leniently and returns [] on garbage", () => {
    expect(decodeJobsParam("jobs=not-json", defaults)).toEqual([]);
    expect(decodeJobsParam("jobs=" + encodeURIComponent("{}"), defaults)).toEqual([]);
    expect(decodeJobsParam("", defaults)).toEqual([]);
  });

  it("caps at MAX_JOBS", () => {
    const many = Array.from({ length: MAX_JOBS + 10 }, () => jobA);
    const raw = encodeJobsParam(many);
    const query = "jobs=" + encodeURIComponent(raw);
    expect(decodeJobsParam(query, defaults).length).toBe(MAX_JOBS);
  });
});
