# Changelog

All notable changes to CronAnchor are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/Skytuhua/cronanchor/releases/tag/v1.0.0
