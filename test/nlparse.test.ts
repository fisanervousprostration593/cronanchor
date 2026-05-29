import { describe, it, expect } from "vitest";
import { parseNaturalSchedule } from "../src/core/nlparse";

function patch(input: string) {
  const r = parseNaturalSchedule(input);
  if (!r.ok) throw new Error(`expected ok for "${input}"`);
  return r.patch;
}

describe("parseNaturalSchedule — cadence", () => {
  it("every N days", () => {
    expect(patch("every 14 days")).toMatchObject({ mode: "everyNDays", interval: 14 });
    expect(patch("every 3 day")).toMatchObject({ mode: "everyNDays", interval: 3 });
  });

  it("daily / every day / every other day", () => {
    expect(patch("daily")).toMatchObject({ mode: "everyNDays", interval: 1 });
    expect(patch("every day")).toMatchObject({ mode: "everyNDays", interval: 1 });
    expect(patch("every other day")).toMatchObject({ mode: "everyNDays", interval: 2 });
  });

  it("weekly / biweekly / fortnightly (no weekday -> anchored)", () => {
    expect(patch("weekly")).toMatchObject({ mode: "everyNWeeksAnchored", interval: 1 });
    expect(patch("biweekly")).toMatchObject({ mode: "everyNWeeksAnchored", interval: 2 });
    expect(patch("fortnightly")).toMatchObject({
      mode: "everyNWeeksAnchored",
      interval: 2,
    });
    expect(patch("every other week")).toMatchObject({
      mode: "everyNWeeksAnchored",
      interval: 2,
    });
  });

  it("every N weeks on <weekday>", () => {
    expect(patch("every 2 weeks on monday")).toMatchObject({
      mode: "everyNWeeksWeekday",
      interval: 2,
      weekday: 1,
    });
    expect(patch("biweekly on friday")).toMatchObject({
      mode: "everyNWeeksWeekday",
      interval: 2,
      weekday: 5,
    });
  });

  it("every other <weekday> and every <weekday>", () => {
    expect(patch("every other tuesday")).toMatchObject({
      mode: "everyNWeeksWeekday",
      interval: 2,
      weekday: 2,
    });
    expect(patch("every monday")).toMatchObject({
      mode: "everyNWeeksWeekday",
      interval: 1,
      weekday: 1,
    });
    expect(patch("every Sun")).toMatchObject({
      mode: "everyNWeeksWeekday",
      interval: 1,
      weekday: 0,
    });
  });
});

describe("parseNaturalSchedule — time and start date", () => {
  it("parses 12h and 24h times", () => {
    expect(patch("every 14 days at 9am")).toMatchObject({ hour: 9, minute: 0 });
    expect(patch("every day at 9:30pm")).toMatchObject({ hour: 21, minute: 30 });
    expect(patch("every day at 14:05")).toMatchObject({ hour: 14, minute: 5 });
    expect(patch("daily at 12am")).toMatchObject({ hour: 0, minute: 0 });
    expect(patch("daily at 12pm")).toMatchObject({ hour: 12, minute: 0 });
  });

  it("parses a start date (starting/from)", () => {
    expect(patch("every 3 weeks starting 2025-06-02")).toMatchObject({
      anchorDate: "2025-06-02",
    });
    expect(patch("every other week from 2025-01-06")).toMatchObject({
      anchorDate: "2025-01-06",
    });
  });

  it("does not mistake a weekday 'on' for a date", () => {
    const p = patch("every 2 weeks on monday");
    expect(p.anchorDate).toBeUndefined();
  });
});

describe("parseNaturalSchedule — rejects junk", () => {
  it("returns a hint for unrecognized input", () => {
    for (const bad of ["", "   ", "hello world", "sometime soon", "tuesday"]) {
      const r = parseNaturalSchedule(bad);
      expect(r.ok).toBe(false);
    }
  });
});

describe("parseNaturalSchedule — rejects ambiguous/unsupported (no silent wrong output)", () => {
  it("rejects multiple weekdays in one phrase", () => {
    expect(parseNaturalSchedule("every monday and friday").ok).toBe(false);
    expect(parseNaturalSchedule("every saturday and sunday").ok).toBe(false);
  });

  it("rejects invalid or partial times instead of dropping them", () => {
    expect(parseNaturalSchedule("every 3 days at 25:00").ok).toBe(false);
    expect(parseNaturalSchedule("every 3 days at 9:99").ok).toBe(false);
    expect(parseNaturalSchedule("daily at 7:5").ok).toBe(false); // single-digit minute
    expect(parseNaturalSchedule("daily at noon").ok).toBe(false);
  });

  it("rejects day-of-month ('on the Nth') which the tool can't express", () => {
    expect(parseNaturalSchedule("every 2 weeks on the 3rd").ok).toBe(false);
    expect(parseNaturalSchedule("monthly on the 15th").ok).toBe(false);
  });

  it("rejects an impossible start date", () => {
    expect(parseNaturalSchedule("every 2 weeks starting 2025-13-40").ok).toBe(false);
  });

  it("still accepts the valid forms unchanged", () => {
    expect(patch("every 3 days at 9:30am")).toMatchObject({ hour: 9, minute: 30 });
    expect(patch("biweekly on friday at 14:00")).toMatchObject({
      mode: "everyNWeeksWeekday",
      weekday: 5,
      hour: 14,
      minute: 0,
    });
  });
});
