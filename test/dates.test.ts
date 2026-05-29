import { describe, it, expect } from "vitest";
import {
  dayNumber,
  civilFromDayNumber,
  weekdayOf,
  addDays,
  parseCivilDate,
  formatCivilDate,
  todayInZone,
  weekdayName,
  weekdayNameShort,
} from "../src/core/dates";

describe("dayNumber", () => {
  it("is 0 at the Unix epoch", () => {
    expect(dayNumber({ year: 1970, month: 1, day: 1 })).toBe(0);
  });

  it("counts whole days forward", () => {
    expect(dayNumber({ year: 1970, month: 1, day: 2 })).toBe(1);
    expect(dayNumber({ year: 1970, month: 2, day: 1 })).toBe(31);
  });

  it("handles dates before the epoch", () => {
    expect(dayNumber({ year: 1969, month: 12, day: 31 })).toBe(-1);
  });

  it("differences equal exact calendar-day spans across a DST boundary", () => {
    // US spring-forward 2025 was 2025-03-09; fall-back 2025-11-02. Day counting must be
    // immune to both — these are pure calendar dates.
    const a = dayNumber({ year: 2025, month: 3, day: 8 });
    const b = dayNumber({ year: 2025, month: 3, day: 10 });
    expect(b - a).toBe(2);
    const c = dayNumber({ year: 2025, month: 11, day: 1 });
    const d = dayNumber({ year: 2025, month: 11, day: 3 });
    expect(d - c).toBe(2);
  });

  it("counts exactly 14 days across a month boundary (the */14 anti-case)", () => {
    // The whole reason CronAnchor exists: real 14-day spacing, not 1/15/29 resets.
    const jan1 = dayNumber({ year: 2025, month: 1, day: 1 });
    const jan15 = dayNumber({ year: 2025, month: 1, day: 15 });
    const jan29 = dayNumber({ year: 2025, month: 1, day: 29 });
    const feb12 = dayNumber({ year: 2025, month: 2, day: 12 });
    expect(jan15 - jan1).toBe(14);
    expect(jan29 - jan15).toBe(14);
    expect(feb12 - jan29).toBe(14); // crosses into February — still 14, unlike */14
  });

  it("handles leap-year spans (Feb 29 exists in 2024)", () => {
    const feb29 = dayNumber({ year: 2024, month: 2, day: 29 });
    const mar1 = dayNumber({ year: 2024, month: 3, day: 1 });
    expect(mar1 - feb29).toBe(1);
    // 2024 is a leap year: Jan 1 2024 -> Jan 1 2025 is 366 days.
    const y2024 = dayNumber({ year: 2024, month: 1, day: 1 });
    const y2025 = dayNumber({ year: 2025, month: 1, day: 1 });
    expect(y2025 - y2024).toBe(366);
  });
});

describe("civilFromDayNumber", () => {
  it("round-trips with dayNumber", () => {
    const samples = [
      { year: 1970, month: 1, day: 1 },
      { year: 2000, month: 2, day: 29 },
      { year: 2024, month: 2, day: 29 },
      { year: 2025, month: 12, day: 31 },
      { year: 2031, month: 6, day: 15 },
    ];
    for (const d of samples) {
      expect(civilFromDayNumber(dayNumber(d))).toEqual(d);
    }
  });
});

describe("weekdayOf", () => {
  it("identifies known weekdays (0=Sun..6=Sat)", () => {
    expect(weekdayOf({ year: 2025, month: 3, day: 3 })).toBe(1); // Monday
    expect(weekdayOf({ year: 2024, month: 2, day: 29 })).toBe(4); // Thursday
    expect(weekdayOf({ year: 1970, month: 1, day: 1 })).toBe(4); // Thursday
  });
});

describe("addDays", () => {
  it("adds and subtracts across boundaries", () => {
    expect(addDays({ year: 2025, month: 1, day: 29 }, 14)).toEqual({
      year: 2025,
      month: 2,
      day: 12,
    });
    expect(addDays({ year: 2024, month: 3, day: 1 }, -1)).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });
});

describe("parseCivilDate", () => {
  it("parses valid dates", () => {
    expect(parseCivilDate("2025-01-01")).toEqual({ year: 2025, month: 1, day: 1 });
    expect(parseCivilDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseCivilDate("2025-02-29")).toBeNull(); // not a leap year
    expect(parseCivilDate("2025-02-30")).toBeNull();
    expect(parseCivilDate("2025-13-01")).toBeNull();
    expect(parseCivilDate("2025-00-10")).toBeNull();
    expect(parseCivilDate("2025-04-31")).toBeNull();
  });

  it("rejects malformed strings", () => {
    expect(parseCivilDate("")).toBeNull();
    expect(parseCivilDate("2025-1-1")).toBeNull();
    expect(parseCivilDate("not-a-date")).toBeNull();
    expect(parseCivilDate("2025/01/01")).toBeNull();
  });
});

describe("formatCivilDate", () => {
  it("zero-pads", () => {
    expect(formatCivilDate({ year: 2025, month: 1, day: 5 })).toBe("2025-01-05");
  });
});

describe("todayInZone", () => {
  it("reads the civil date in the target zone at a fixed instant", () => {
    // 2025-01-01T02:30:00Z is still 2024-12-31 in New York (UTC-5, → 21:30 EST) but
    // already 2025-01-01 in UTC.
    const instant = new Date("2025-01-01T02:30:00Z");
    expect(todayInZone("UTC", instant)).toEqual({ year: 2025, month: 1, day: 1 });
    expect(todayInZone("America/New_York", instant)).toEqual({
      year: 2024,
      month: 12,
      day: 31,
    });
  });

  it("throws on an invalid timezone", () => {
    expect(() => todayInZone("Not/AZone", new Date())).toThrow();
  });
});

describe("weekday names", () => {
  it("maps indices to names", () => {
    expect(weekdayName(0)).toBe("Sunday");
    expect(weekdayName(1)).toBe("Monday");
    expect(weekdayNameShort(6)).toBe("Sat");
  });
});
