# SPEC — CronAnchor v1

> Product requirements for v1. The contract for "done." See `RESEARCH.md` for *why*
> this product exists and `ARCHITECTURE.md` for *how* it's built.

## 1. Summary

CronAnchor is a single-page, fully offline web tool that generates a **correct** cron
schedule for *true* fixed intervals — "every N days" and "every N weeks" — that plain
cron cannot natively express. For each schedule it produces:

1. a **gating cron line** (fires at the candidate frequency),
2. a **copy-pasteable shell guard** that makes the job run only on the real interval
   boundaries, anchored to a chosen start date and DST-safe, and
3. a **live preview of the next 20 real fire dates** in the chosen timezone, so the
   user can verify the schedule *before* installing it.

## 2. The problem (one line)

`0 0 */14 * *` does **not** mean "every 14 days" — cron evaluates `*/14` inside the
day-of-month field, firing on days 1, 15, 29 and then resetting at the month boundary.
There is no native cron syntax for true N-day / N-week intervals.

## 3. Users & primary flows

**Primary user:** a sysadmin/DevOps/developer who needs a job to run every 2 weeks (or
every 14 days, every 3 weeks, …) via `crontab` and has hit the `*/N` wall.

**Primary flow:**
1. User picks a **cadence mode** and parameters (interval N, weekday, time).
2. User sets an **anchor start date** and an **IANA timezone**.
3. CronAnchor renders, live, the **cron line**, the **shell guard**, the **full ready
   crontab block**, and the **next 20 fire dates**.
4. User reads the inline explainer to understand *why* naive cron is wrong.
5. User clicks **Copy** and pastes the crontab block into their server.

## 4. v1 feature set (MUST)

### 4.1 Cadence modes
- **F1. Every N days** — run every N days from the anchor, at a chosen time.
- **F2. Every N weeks on weekday W** — run every N weeks on a specified weekday, at a
  chosen time (anchor establishes which week is "week 0").
- **F3. Every N weeks anchored to date X** — like F2 but the weekday is derived from
  the anchor date X.

Each mode takes: interval `N` (integer ≥ 1), time of day `HH:MM` (24h), an **anchor
date** (`YYYY-MM-DD`), and an **IANA timezone** (default: the browser's detected zone).

### 4.2 Generated output
- **F4. Gating cron line.** Daily for F1 (`M H * * *`); weekly-on-weekday for F2/F3
  (`M H * * W`). 5-field standard cron.
- **F5. Shell guard.** A POSIX/GNU-`date` snippet that exits unless the current date is
  a true interval boundary measured from the anchor, using **integer day-count modulo
  from a baked-in anchor day-number** (not the fragile epoch-week-parity trick). It must
  be DST-safe and independent of the server's own timezone (it pins `TZ` to the chosen
  zone and reinterprets the calendar date at UTC midnight for exact day arithmetic).
- **F6. Full crontab block.** The complete, paste-ready block: an optional `CRON_TZ`
  line, the cron line, and the command wrapped by the guard, with explanatory comments.
- **F7. Next-20 preview.** The next 20 datetimes the command will actually execute,
  rendered in the chosen timezone with weekday names and the day-interval between
  consecutive fires (to make the cadence obvious at a glance). If the anchor is in the
  future, the preview starts at the anchor.
- **F8. Copy buttons.** One-click copy for the crontab block (and individually for the
  cron line and the guard), with visible "copied" feedback.

### 4.3 Education
- **F9. "Why plain cron is wrong" explainer.** A prominent, always-available panel that
  shows the `*/14` month-reset failure concretely (fires on 1, 15, 29, then a 2–3 day
  gap) and explains the anchored-guard fix.
- **F10. Guard platform note.** Clearly states the guard targets **GNU coreutils
  `date`** and notes BSD/macOS/busybox differences.

### 4.4 Quality & robustness (MUST)
- **F11. Input validation & live error states.** Reject/curtail invalid input (N < 1 or
  non-integer, malformed time, impossible/empty date, blank timezone) with clear,
  specific inline messages — never a crash, never silent wrong output.
- **F12. Correct edge-case math.** DST transitions, leap years (incl. anchor on Feb 29),
  non-Sunday week starts, anchors in the past and future, month boundaries. Verified by
  an automated test suite.
- **F13. URL state (shareable).** The current configuration is encoded in the URL query
  so a configured schedule can be linked/bookmarked and restored on load.
- **F14. Offline & private.** Zero network calls at runtime; all computation in-browser.
  Stated visibly ("nothing leaves your browser").
- **F15. Responsive & accessible UI.** Usable at 375 / 768 / 1024 / 1440 px; keyboard
  operable; visible focus; contrast ≥ 4.5:1; honors `prefers-reduced-motion`.

## 5. Non-goals (explicitly OUT for v1)

- systemd-timer output (`OnCalendar` + guard) — *v1.1*.
- Multi-job / full-crontab-file management or export — *later*.
- Natural-language input ("every other Tuesday" parsing) — *v1.1*.
- Per-platform guard variants for BSD/macOS/busybox `date` — v1 targets GNU coreutils
  and says so; cross-platform emission is *later*.
- Standard 5-field cron building for trivially divisible intervals — crontab.guru
  already does this well.
- Becoming a hosted scheduler or replacing cron.
- Accounts, persistence beyond URL state, analytics, or any server component.

## 6. Success criteria ("done")

- All MUST features (F1–F15) implemented and working — no placeholders, no
  advertised-but-broken behavior.
- The generated guard, when reasoned through against the preview, fires on exactly the
  previewed dates for every cadence mode.
- Automated test suite covers F12 edge cases and passes; core date logic has high
  coverage.
- The app builds to a static bundle, runs with zero network calls, and is responsive
  and keyboard-accessible.
- A first-time user can produce a correct, trustworthy crontab block and understand why
  it's correct, without external help.

## 7. Acceptance examples (illustrative, to be locked by tests)

- **Every 14 days from 2025-01-01, 09:00, UTC** → cron `0 9 * * *`; guard fires when
  `(dayNumber(today) − dayNumber(2025-01-01)) mod 14 == 0`; preview: 2025-01-01,
  01-15, 01-29, 02-12, 02-26, 03-12, … (true 14-day spacing across month/DST/leap
  boundaries — *not* 1/15/29 resetting each month).
- **Every 2 weeks on Monday, anchored 2025-03-03 (a Monday), 08:30, America/New_York**
  → cron `30 8 * * 1`; guard fires when `weeksSinceAnchor mod 2 == 0`; preview spacing
  is exactly 14 days, with the local clock staying 08:30 across the March DST change.
- **Every 3 weeks anchored to 2024-02-29 (leap day, a Thursday)** → weekday derived =
  Thursday; cron `… * * 4`; preview spaced 21 days from the anchor with no leap-year
  drift.
