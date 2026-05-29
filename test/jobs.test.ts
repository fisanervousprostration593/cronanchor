import { describe, it, expect } from "vitest";
import { combinedCrontabFile, MAX_JOBS } from "../src/core/jobs";
import type { ScheduleConfig } from "../src/core/types";

const base: ScheduleConfig = {
  mode: "everyNDays",
  interval: 14,
  weekday: 1,
  hour: 9,
  minute: 0,
  anchorDate: "2025-01-01",
  timezone: "UTC",
  command: "/path/to/job.sh",
};

describe("combinedCrontabFile", () => {
  it("renders a header with the job count and one portable block per valid job", () => {
    const file = combinedCrontabFile([
      base,
      { ...base, interval: 2, mode: "everyNWeeksWeekday", anchorDate: "2025-03-03" },
    ]);
    expect(file).toContain("# CronAnchor — combined crontab file");
    expect(file).toContain("# 2 jobs.");
    expect(file).toContain("CRON_TZ=UTC");
    // two CRON_TZ lines => two jobs
    expect(file.match(/CRON_TZ=/g)?.length).toBe(2);
    // portable (no GNU `date -u -d` invocation)
    expect(file).not.toContain("date -u -d");
  });

  it("skips invalid jobs (and counts only valid ones)", () => {
    const file = combinedCrontabFile([base, { ...base, interval: 0 }]);
    expect(file).toContain("# 1 job.");
    expect(file.match(/CRON_TZ=/g)?.length).toBe(1);
  });

  it("caps at MAX_JOBS", () => {
    const many = Array.from({ length: MAX_JOBS + 5 }, () => base);
    const file = combinedCrontabFile(many);
    expect(file.match(/CRON_TZ=/g)?.length).toBe(MAX_JOBS);
  });
});
