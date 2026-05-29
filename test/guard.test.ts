import { describe, it, expect } from "vitest";
import {
  portableCrontabBlock,
  portableGuardScript,
  gnuCompactCrontab,
} from "../src/core/guard";
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

describe("baked anchor day-numbers", () => {
  it("matches the engine", () => {
    expect(dayNumber({ year: 2025, month: 1, day: 1 })).toBe(20089);
    expect(dayNumber({ year: 2025, month: 3, day: 3 })).toBe(20150);
  });
});

// The portable guard bakes the same JDN formula it emits. Prove that formula (converted
// to days-since-epoch) equals the engine's dayNumber for a wide range of dates — so the
// shell guard and the in-app preview agree by construction.
describe("portable JDN formula == dayNumber", () => {
  function jdnDays(y: number, m: number, d: number): number {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    const jdn =
      d +
      Math.floor((153 * mm + 2) / 5) +
      365 * yy +
      Math.floor(yy / 4) -
      Math.floor(yy / 100) +
      Math.floor(yy / 400) -
      32045;
    return jdn - 2440588;
  }
  it("agrees across boundaries, leap years, and far dates", () => {
    const samples: [number, number, number][] = [
      [1970, 1, 1],
      [2024, 2, 29],
      [2025, 1, 1],
      [2025, 3, 9], // DST day (date-only, irrelevant but covered)
      [2025, 12, 31],
      [2030, 1, 6],
      [2099, 7, 15],
      [2000, 2, 29],
    ];
    for (const [y, m, d] of samples) {
      expect(jdnDays(y, m, d)).toBe(dayNumber({ year: y, month: m, day: d }));
    }
  });
});

describe("portableCrontabBlock", () => {
  it("day mode: CRON_TZ, portable JDN, anchor floor, escaped modulo, command", () => {
    const block = portableCrontabBlock(buildSchedule(parts({ interval: 14 })));
    expect(block).toContain("CRON_TZ=UTC");
    expect(block).toContain("0 9 * * * Y=$(TZ='UTC' date +\\%Y)");
    expect(block).toContain("today_days=$(( jdn - 2440588 ))");
    expect(block).toContain("diff=$(( today_days - 20089 ))");
    expect(block).toContain(
      `[ "$diff" -ge 0 ] && [ $(( diff \\% 14 )) -eq 0 ] && /path/to/job.sh`,
    );
    // portable => no GNU `date -u -d` invocation, and every %-specifier escaped for crontab
    expect(block).not.toContain("date -u -d");
    expect(block).not.toMatch(/[^\\]%[Ymd]/);
  });

  it("week mode divides the diff by 7", () => {
    const block = portableCrontabBlock(
      buildSchedule(
        parts({
          mode: "everyNWeeksWeekday",
          interval: 2,
          weekday: 1,
          anchor: parseCivilDate("2025-03-03")!,
        }),
      ),
    );
    expect(block).toContain("diff=$(( today_days - 20150 ))");
    expect(block).toContain("[ $(( diff \\% 7 + diff / 7 \\% 2 )) -eq 0 ]");
  });

  it("escapes % inside the user command", () => {
    expect(
      portableCrontabBlock(buildSchedule(parts({ command: "echo 100%done" }))),
    ).toContain("&& echo 100\\%done");
  });

  it("notes interval 1", () => {
    expect(portableCrontabBlock(buildSchedule(parts({ interval: 1 })))).toContain(
      "interval is 1",
    );
  });
});

describe("portableGuardScript", () => {
  it("is a portable sh script with the floor and interval test, no date -d, no escaping", () => {
    const script = portableGuardScript(buildSchedule(parts({ interval: 14 })));
    expect(script.startsWith("#!/usr/bin/env sh")).toBe(true);
    expect(script).toContain("Y=$(TZ='UTC' date +%Y)");
    expect(script).toContain("today_days=$(( jdn - 2440588 ))");
    expect(script).toContain("anchor_days=20089");
    expect(script).toContain("diff=$(( today_days - anchor_days ))");
    expect(script).toContain(`[ "$diff" -ge 0 ] || exit 0`);
    expect(script).toContain("[ $(( diff % 14 )) -eq 0 ] || exit 0");
    expect(script).toContain("/path/to/job.sh");
    expect(script).not.toContain("date -u -d");
    expect(script).not.toContain("\\%");
  });

  it("week mode keeps the /7", () => {
    const script = portableGuardScript(
      buildSchedule(
        parts({
          mode: "everyNWeeksAnchored",
          interval: 3,
          anchor: parseCivilDate("2024-02-29")!,
        }),
      ),
    );
    expect(script).toContain("[ $(( diff % 7 + diff / 7 % 3 )) -eq 0 ] || exit 0");
  });
});

describe("gnuCompactCrontab", () => {
  it("retains the compact GNU date -d one-liner with the floor", () => {
    const block = gnuCompactCrontab(buildSchedule(parts({ interval: 14 })));
    expect(block).toContain("GNU coreutils");
    expect(block).toContain(
      `d=$(( $(date -u -d "$(TZ='UTC' date +\\%F)" +\\%s) / 86400 - 20089 ))`,
    );
    expect(block).toContain(
      `[ "$d" -ge 0 ] && [ $(( d \\% 14 )) -eq 0 ] && /path/to/job.sh`,
    );
  });
});

describe("future-anchor floor (regression)", () => {
  it("every emitted form includes a not-before-anchor floor", () => {
    const s = buildSchedule(
      parts({ interval: 14, anchor: parseCivilDate("2030-01-06")! }),
    );
    expect(portableCrontabBlock(s)).toContain('[ "$diff" -ge 0 ]');
    expect(portableGuardScript(s)).toContain('[ "$diff" -ge 0 ] || exit 0');
    expect(gnuCompactCrontab(s)).toContain('[ "$d" -ge 0 ]');
  });
});
