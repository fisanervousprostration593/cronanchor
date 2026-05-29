import { describe, it, expect } from "vitest";
import { APP_NAME, APP_VERSION } from "../src/core/meta";

describe("app metadata", () => {
  it("has the product name", () => {
    expect(APP_NAME).toBe("CronAnchor");
  });

  it("uses a semver version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
