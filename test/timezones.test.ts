import { describe, it, expect } from "vitest";
import { listTimezones, isValidTimezone, detectTimezone } from "../src/core/timezones";

describe("listTimezones", () => {
  it("returns a non-empty list with UTC first and no duplicates of UTC", () => {
    const zones = listTimezones();
    expect(zones.length).toBeGreaterThan(0);
    expect(zones[0]).toBe("UTC");
    expect(zones.filter((z) => z === "UTC")).toHaveLength(1);
  });

  it("includes well-known zones", () => {
    const zones = listTimezones();
    expect(zones).toContain("America/New_York");
    expect(zones).toContain("Asia/Tokyo");
  });
});

describe("isValidTimezone", () => {
  it("accepts real zones", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("Europe/London")).toBe(true);
  });

  it("rejects bogus or empty zones", () => {
    expect(isValidTimezone("Mars/Phobos")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("   ")).toBe(false);
  });
});

describe("detectTimezone", () => {
  it("returns a valid IANA zone", () => {
    expect(isValidTimezone(detectTimezone())).toBe(true);
  });
});
