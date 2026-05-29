import { describe, it, expect } from "vitest";
import { systemdUnits } from "../src/core/systemd";
import { buildSchedule, type ScheduleParts } from "../src/core/schedule";
import { parseCivilDate } from "../src/core/dates";

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

describe("OnCalendar", () => {
  it("days mode is daily with the time and timezone", () => {
    const { timer } = systemdUnits(buildSchedule(parts({ interval: 14 })));
    expect(timer).toContain("OnCalendar=*-*-* 09:00:00 UTC");
    expect(timer).toContain("Persistent=true");
    expect(timer).toContain("WantedBy=timers.target");
  });

  it("week mode is weekday-gated with the systemd Dow", () => {
    const { timer } = systemdUnits(
      buildSchedule(
        parts({
          mode: "everyNWeeksWeekday",
          interval: 2,
          weekday: 1,
          hour: 8,
          minute: 30,
          anchor: parseCivilDate("2025-03-03")!,
        }),
      ),
    );
    expect(timer).toContain("OnCalendar=Mon *-*-* 08:30:00 UTC");
  });

  it("maps Sunday correctly", () => {
    const { timer } = systemdUnits(
      buildSchedule(
        parts({
          mode: "everyNWeeksWeekday",
          interval: 2,
          weekday: 0,
          anchor: parseCivilDate("2025-03-02")!, // a Sunday
        }),
      ),
    );
    expect(timer).toContain("OnCalendar=Sun *-*-*");
  });
});

describe("service ExecCondition (interval gate)", () => {
  it("uses the portable test with %% escaping, unquoted TZ, the floor and modulo", () => {
    const { service } = systemdUnits(buildSchedule(parts({ interval: 14 })));
    expect(service).toContain("Type=oneshot");
    expect(service).toContain("ExecCondition=/bin/sh -c '");
    expect(service).toContain("Y=$(TZ=UTC date +%%Y)");
    expect(service).toContain("today_days=$(( jdn - 2440588 ))");
    expect(service).toContain("diff=$(( today_days - 20089 ))");
    expect(service).toContain(`[ "$diff" -ge 0 ] && [ $(( diff %% 14 )) -eq 0 ]`);
    // no GNU `date -u -d` invocation
    expect(service).not.toContain("date -u -d");
  });

  it("week mode divides by 7", () => {
    const { service } = systemdUnits(
      buildSchedule(
        parts({
          mode: "everyNWeeksAnchored",
          interval: 3,
          anchor: parseCivilDate("2024-02-29")!,
        }),
      ),
    );
    expect(service).toContain("[ $(( diff %% 7 + diff / 7 %% 3 )) -eq 0 ]");
  });
});

describe("service ExecStart", () => {
  it("wraps the command in sh -c", () => {
    const { service } = systemdUnits(
      buildSchedule(parts({ command: "/path/to/job.sh" })),
    );
    expect(service).toContain("ExecStart=/bin/sh -c '/path/to/job.sh'");
  });

  it("escapes single quotes in the command", () => {
    const { service } = systemdUnits(buildSchedule(parts({ command: "echo 'hi'" })));
    expect(service).toContain(`ExecStart=/bin/sh -c 'echo '\\''hi'\\'''`);
  });

  it("escapes % as %% in the command", () => {
    const { service } = systemdUnits(buildSchedule(parts({ command: "echo 100%done" })));
    expect(service).toContain("echo 100%%done");
  });
});

describe("install notes", () => {
  it("explains where to save and how to enable", () => {
    const { install } = systemdUnits(buildSchedule(parts({})));
    expect(install).toContain("~/.config/systemd/user/cronanchor.timer");
    expect(install).toContain("systemctl --user enable --now cronanchor.timer");
  });
});
