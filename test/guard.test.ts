import { describe, it, expect } from "vitest";
import { crontabBlock, shellGuardScript } from "../src/core/guard";
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

describe("crontabBlock", () => {
  it("day mode: CRON_TZ, cron line, anchor floor, escaped modulo, command", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    const block = crontabBlock(s);
    expect(block).toContain("CRON_TZ=UTC");
    // single date read into d, then floor + interval test + command
    expect(block).toContain(
      `0 9 * * * d=$(( $(date -u -d "$(TZ='UTC' date +\\%F)" +\\%s) / 86400 - 20089 )); [ "$d" -ge 0 ] && [ $(( d \\% 14 )) -eq 0 ] && /path/to/job.sh`,
    );
    // crontab must escape every % as \%
    expect(block).not.toMatch(/[^\\]%F/);
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
    const block = crontabBlock(s);
    expect(block).toContain("- 20150 ))");
    expect(block).toContain(`[ $(( d / 7 \\% 2 )) -eq 0 ]`);
    expect(block).toContain('[ "$d" -ge 0 ]');
  });

  it("escapes % inside the user command for crontab", () => {
    const s = buildSchedule(parts({ command: "echo 100%done" }));
    expect(crontabBlock(s)).toContain("&& echo 100\\%done");
  });

  it("notes when interval is 1 (only the anchor floor applies)", () => {
    const s = buildSchedule(parts({ interval: 1 }));
    expect(crontabBlock(s)).toContain("interval is 1");
  });
});

describe("shellGuardScript", () => {
  it("is a runnable sh script with the baked anchor, an anchor floor, and the interval test", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    const script = shellGuardScript(s);
    expect(script.startsWith("#!/usr/bin/env sh")).toBe(true);
    expect(script).toContain("anchor_days=20089");
    expect(script).toContain(
      `today_days=$(( $(date -u -d "$(TZ='UTC' date +%F)" +%s) / 86400 ))`,
    );
    expect(script).toContain(`[ "$today_days" -ge "$anchor_days" ] || exit 0`);
    expect(script).toContain(
      `[ $(( (today_days - anchor_days) % 14 )) -eq 0 ] || exit 0`,
    );
    expect(script).toContain("/path/to/job.sh");
    // a script uses plain %, never escaped
    expect(script).not.toContain("\\%");
  });

  it("week mode keeps the /7 in the script", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksAnchored",
        interval: 3,
        anchor: parseCivilDate("2024-02-29")!,
      }),
    );
    expect(shellGuardScript(s)).toContain(
      `[ $(( (today_days - anchor_days) / 7 % 3 )) -eq 0 ] || exit 0`,
    );
  });

  it("keeps the user command unescaped in a script", () => {
    const s = buildSchedule(parts({ command: "echo 100%done" }));
    expect(shellGuardScript(s)).toContain("echo 100%done");
  });
});

// Regression: a FUTURE anchor must never fire before the anchor. The emitted guard's
// `>= anchor` floor is what prevents the C-modulo from matching pre-anchor dates.
describe("future-anchor floor (regression)", () => {
  it("crontab block includes the >= 0 floor for a future anchor", () => {
    const s = buildSchedule(
      parts({ mode: "everyNDays", interval: 14, anchor: parseCivilDate("2030-01-06")! }),
    );
    expect(crontabBlock(s)).toContain('[ "$d" -ge 0 ]');
  });

  it("script includes the >= anchor_days floor for a future anchor", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 0,
        anchor: parseCivilDate("2030-01-06")!,
      }),
    );
    expect(shellGuardScript(s)).toContain(
      `[ "$today_days" -ge "$anchor_days" ] || exit 0`,
    );
  });
});
