import { describe, it } from "vitest";
import { systemdUnits } from "../src/core/systemd";
import { buildSchedule } from "../src/core/schedule";

describe("probe", () => {
  it("emits ExecStart/ExecCondition", () => {
    const s = buildSchedule({
      mode: "everyNWeeksWeekday",
      interval: 2,
      weekday: 1,
      hour: 9,
      minute: 30,
      anchor: { year: 2024, month: 1, day: 1 },
      timezone: "America/New_York",
      command: "echo it's 50% done",
    });
    const u = systemdUnits(s);
    console.log("=====TIMER=====\n" + u.timer);
    console.log("=====SERVICE=====\n" + u.service);
  });
});
