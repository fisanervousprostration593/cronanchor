import { describe, it, expect } from "vitest";
import {
  buildSchedule,
  cronLine,
  nextFireDates,
  describeSchedule,
  formatTime,
  type ScheduleParts,
} from "../src/core/schedule";
import { formatCivilDate, parseCivilDate, type CivilDate } from "../src/core/dates";

function parts(over: Partial<ScheduleParts>): ScheduleParts {
  return {
    mode: "everyNDays",
    interval: 14,
    weekday: 1,
    hour: 9,
    minute: 0,
    anchor: { year: 2025, month: 1, day: 1 },
    timezone: "UTC",
    command: "/path/to/job.sh",
    ...over,
  };
}

const fmt = (d: CivilDate) => formatCivilDate(d);

describe("cronLine", () => {
  it("is daily for every-N-days", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", hour: 9, minute: 0 }));
    expect(cronLine(s)).toBe("0 9 * * *");
  });

  it("gates on the weekday for week modes", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 1,
        hour: 8,
        minute: 30,
        anchor: { year: 2025, month: 3, day: 3 },
      }),
    );
    expect(cronLine(s)).toBe("30 8 * * 1");
  });
});

describe("every N days — the */14 anti-case", () => {
  it("produces true 14-day spacing across month boundaries", () => {
    const s = buildSchedule(
      parts({ mode: "everyNDays", interval: 14, anchor: parseCivilDate("2025-01-01")! }),
    );
    const fires = nextFireDates(s, 6, { year: 2025, month: 1, day: 1 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2025-01-01",
      "2025-01-15",
      "2025-01-29",
      "2025-02-12", // NOT a reset to the 1st — this is the whole point
      "2025-02-26",
      "2025-03-12",
    ]);
    // every gap is exactly 14 days
    expect(fires.slice(1).every((f) => f.gapDays === 14)).toBe(true);
  });

  it("starts at the anchor when the anchor is in the future", () => {
    const s = buildSchedule(
      parts({ mode: "everyNDays", interval: 10, anchor: parseCivilDate("2030-06-01")! }),
    );
    const fires = nextFireDates(s, 3, { year: 2025, month: 1, day: 1 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2030-06-01",
      "2030-06-11",
      "2030-06-21",
    ]);
  });

  it("only lists fires at or after 'from' when the anchor is in the past", () => {
    const s = buildSchedule(
      parts({ mode: "everyNDays", interval: 14, anchor: parseCivilDate("2025-01-01")! }),
    );
    const fires = nextFireDates(s, 2, { year: 2025, month: 2, day: 1 });
    // first fire on/after 2025-02-01 in the 14-day series from 2025-01-01 is 2025-02-12
    expect(fmt(fires[0]!.date)).toBe("2025-02-12");
    expect(fmt(fires[1]!.date)).toBe("2025-02-26");
  });

  it("every-1-day is just daily", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 1 }));
    const fires = nextFireDates(s, 3, { year: 2025, month: 1, day: 1 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
    ]);
  });
});

describe("every N weeks on weekday", () => {
  it("spaces fires exactly 14 days and lands on the chosen weekday", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 1, // Monday
        anchor: parseCivilDate("2025-03-03")!, // a Monday
      }),
    );
    const fires = nextFireDates(s, 4, { year: 2025, month: 3, day: 3 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2025-03-03",
      "2025-03-17",
      "2025-03-31",
      "2025-04-14",
    ]);
    expect(fires.every((f) => f.weekday === 1)).toBe(true);
    expect(fires.slice(1).every((f) => f.gapDays === 14)).toBe(true);
  });

  it("advances the anchor to the next target weekday when it doesn't match", () => {
    // anchor 2025-03-05 is a Wednesday; target weekday Monday -> first fire 2025-03-10.
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 1,
        anchor: parseCivilDate("2025-03-05")!,
      }),
    );
    expect(fmt(s.effectiveAnchor)).toBe("2025-03-10");
    const fires = nextFireDates(s, 2, { year: 2025, month: 3, day: 1 });
    expect(fires.map((f) => fmt(f.date))).toEqual(["2025-03-10", "2025-03-24"]);
  });

  it("keeps 14-day spacing across a spring-forward DST change", () => {
    // US DST starts 2025-03-09. Weekly-on-Sunday every 2 weeks across it stays 14 days.
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 0, // Sunday
        anchor: parseCivilDate("2025-03-02")!, // a Sunday, before DST
        timezone: "America/New_York",
      }),
    );
    const fires = nextFireDates(s, 3, { year: 2025, month: 3, day: 2 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2025-03-02",
      "2025-03-16", // 14 days later, after the DST jump
      "2025-03-30",
    ]);
    expect(fires.slice(1).every((f) => f.gapDays === 14)).toBe(true);
  });
});

describe("every N weeks anchored to date", () => {
  it("derives the weekday from a leap-day anchor (Thursday)", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksAnchored",
        interval: 3,
        anchor: parseCivilDate("2024-02-29")!, // leap day, a Thursday
      }),
    );
    expect(s.weekday).toBe(4); // Thursday
    expect(cronLine(s)).toBe("0 9 * * 4");
    const fires = nextFireDates(s, 3, { year: 2024, month: 2, day: 29 });
    expect(fires.map((f) => fmt(f.date))).toEqual([
      "2024-02-29",
      "2024-03-21", // 21 days later
      "2024-04-11",
    ]);
    expect(fires.slice(1).every((f) => f.gapDays === 21)).toBe(true);
  });
});

describe("describeSchedule & formatTime", () => {
  it("formats time", () => {
    expect(formatTime({ hour: 8, minute: 5 })).toBe("08:05");
  });

  it("describes days mode", () => {
    const s = buildSchedule(parts({ mode: "everyNDays", interval: 14 }));
    expect(describeSchedule(s)).toBe(
      "Run every 14 days at 09:00 (UTC), starting 2025-01-01.",
    );
  });

  it("describes week mode", () => {
    const s = buildSchedule(
      parts({
        mode: "everyNWeeksWeekday",
        interval: 2,
        weekday: 1,
        hour: 8,
        minute: 30,
        anchor: parseCivilDate("2025-03-03")!,
      }),
    );
    expect(describeSchedule(s)).toBe(
      "Run every 2 weeks on Monday at 08:30 (UTC), starting 2025-03-03.",
    );
  });
});
