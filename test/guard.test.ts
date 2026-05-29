import { describe, it, expect } from "vitest";
import { guardTest, crontabBlock, shellGuardScript } from "../src/core/guard";
import { buildSchedule, type ScheduleParts } from "../src/core/schedule";
import { dayNumber, parseCivilDate } from "../src/core/dates";

function parts(over: Partial<ScheduleParts>): ScheduleParts {
  return {
    mode: "everyNDays",
    interval: 14,
    weekday: 1,
    hour: 9,
    minute: 0,
    anchor: parseCivilDate("2025-01-01")!,
    timezone: "UTC",
    command: "/path/to/job.sh",
    ...over,
  };
}

// Sanity-anchor the baked-in day numbers the guard relies on.
describe("baked anchor day-numbers", () => {
  it("matches the engine", () => {
    expect(dayNumber({ year: 2025, month: 1, day: 1 })).toBe(20089);
    expect(dayNumber({ year: 2025, month: 3, day: 3 })).toBe(20150);
  });
});

describe("guardTest", () => {
  it("day mode, unescaped (for a script)", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    expect(guardTest(s, "%")).toBe(
      `[ $(( ($(date -u -d "$(TZ='UTC' date +%F)" +%s) / 86400 - 20089) % 14 )) -eq 0 ]`,
    );
  });

  it("day mode, escaped (for crontab)", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    expect(guardTest(s, "\\%")).toBe(
      `[ $(( ($(date -u -d "$(TZ='UTC' date +\\%F)" +\\%s) / 86400 - 20089) \\% 14 )) -eq 0 ]`,
    );
  });

  it("week mode divides the day-difference by 7", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 1,
        anchor: parseCivilDate("2025-03-03")!,
      }),
    );
    expect(guardTest(s, "%")).toBe(
      `[ $(( ($(date -u -d "$(TZ='UTC' date +%F)" +%s) / 86400 - 20150) / 7 % 2 )) -eq 0 ]`,
    );
  });
});

describe("crontabBlock", () => {
  it("includes CRON_TZ, the cron line, the escaped guard, and the command", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    const block = crontabBlock(s);
    expect(block).toContain("CRON_TZ=UTC");
    expect(block).toContain("0 9 * * * [ $((");
    expect(block).toContain("&& /path/to/job.sh");
    // crontab must escape every % as \%
    expect(block).toContain("+\\%F");
    expect(block).toContain("\\% 14");
    // and must NOT contain a bare unescaped %F
    expect(block).not.toMatch(/[^\\]%F/);
  });

  it("escapes % inside the user command for crontab", () => {
    const s = buildSchedule(parts({ command: "echo 100%done" }));
    expect(crontabBlock(s)).toContain("&& echo 100\\%done");
  });

  it("notes when interval is 1 (guard is a no-op)", () => {
    const s = buildSchedule(parts({ interval: 1 }));
    expect(crontabBlock(s)).toContain("interval is 1");
  });
});

describe("shellGuardScript", () => {
  it("is a runnable sh script with the baked anchor and an exit guard", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    const script = shellGuardScript(s);
    expect(script.startsWith("#!/usr/bin/env sh")).toBe(true);
    expect(script).toContain("anchor_days=20089");
    expect(script).toContain(
      `today_days=$(( $(date -u -d "$(TZ='UTC' date +%F)" +%s) / 86400 ))`,
    );
    expect(script).toContain("|| exit 0");
    expect(script).toContain("/path/to/job.sh");
    // a script uses plain %, never escaped
    expect(script).not.toContain("\\%");
  });

  it("keeps the user command unescaped in a script", () => {
    const s = buildSchedule(parts({ command: "echo 100%done" }));
    expect(shellGuardScript(s)).toContain("echo 100%done");
  });
});
