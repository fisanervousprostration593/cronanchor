# Changelog

All notable changes to CronAnchor are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-05-28

Cross-platform output, systemd, natural-language input, a date checker, and multi-job
export. All additive — existing schedules and links keep working.

### Added

- **Portable guard** — the crontab block and the standalone `.sh` now compute the day
  number with pure POSIX shell math (Julian Day Number from `date +%Y/%m/%d`), so they run
  identically on GNU/Linux, macOS/BSD, and busybox. The compact GNU `date -d` one-liner is
  still offered as a convenience.
- **systemd timer + service** output — an `OnCalendar` timer plus a service whose
  `ExecCondition` enforces the true interval (the idiomatic systemd biweekly pattern),
  with install notes.
- **Natural-language input** — describe a schedule in words (e.g. "every other Tuesday at
  9am", "biweekly on Friday", "every 3 weeks starting 2025-06-02") and it fills the form.
- **"Would it run on date X?" checker** — confirm whether a specific date is a fire date,
  or see the next run.
- **Multi-job crontab file** — collect several schedules into one combined, downloadable
  crontab file. The list is encoded in the URL (shareable, nothing stored on disk).

### Changed

- The guard no longer requires GNU coreutils by default (portable output is primary).
- CI: opt into the Node 24 action runtime and build on Node 22.

## [1.0.0] — 2026-05-28

Initial release.

### Added

- Three cadence modes: **every N days**, **every N weeks on a weekday**, and **every N
  weeks anchored to a date**.
- Anchor start-date and IANA timezone selection (timezone auto-detected).
- Generated output: the gating cron line, a correct DST-safe shell guard, and a
  ready-to-paste full crontab block, each with one-click copy.
- Live preview of the next 20 real fire dates in the chosen timezone, with the
  day-interval between consecutive runs.
- An explainer of why plain `*/14` cron is wrong (the month-boundary reset).
- Shareable/bookmarkable configuration encoded in the URL.
- Fully client-side, offline, zero-tracking; self-hosted fonts; zero runtime
  dependencies.
- Comprehensive test suite (63 tests) covering DST transitions, leap years, month
  boundaries, past/future anchors, validation, URL state, and exact guard-string output;
  the generated guard is cross-checked against GNU coreutils `date`.

[1.1.0]: https://github.com/Skytuhua/cronanchor/releases/tag/v1.1.0
[1.0.0]: https://github.com/Skytuhua/cronanchor/releases/tag/v1.0.0
