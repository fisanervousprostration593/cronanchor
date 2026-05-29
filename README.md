# CronAnchor

*Cron for **every 14 days**, **every 2 weeks**, **biweekly** / **every other week**,
**every 3 weeks** — true fixed intervals plain cron can't express.*

**A 100% client-side tool that builds correct cron schedules for true `every N days` and
`every N weeks` intervals — and shows you the next 20 real fire dates before you install.**
It emits a portable POSIX shell guard, a systemd timer + service, and a combined
multi-job crontab; you can describe the schedule in plain English and check whether any
given date will run — all in your browser, with zero runtime dependencies.

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-96%20passing-22c55e.svg)](#development)
[![Runtime deps](https://img.shields.io/badge/runtime%20deps-0-22c55e.svg)](#how-it-works)
&nbsp;**[▶ Live demo](https://skytuhua.github.io/cronanchor/)**

![CronAnchor — configure a cadence, anchor date, and timezone](docs/screenshots/hero.png)

---

## Contents

- [The problem](#the-problem)
- [What CronAnchor does](#what-cronanchor-does)
- [How CronAnchor compares](#how-cronanchor-compares)
- [Example output](#example-output)
- [Plain-English input](#plain-english-input)
- [How it works](#how-it-works)
- [Usage](#usage)
- [Run / build locally](#run--build-locally)
- [Project structure](#project-structure)
- [FAQ](#faq)
- [Limitations](#limitations)
- [Development](#development)
- [License](#license)

## The problem

`0 0 */14 * *` does **not** mean "every 14 days."

Cron evaluates `*/14` inside the **day-of-month** field (range 1–31), so it fires on
days **1, 15, 29 — and then resets at the month boundary**. The gap from the 29th to the
next 1st is only 2–3 days, not 14. Standard cron has no native syntax for true intervals
that don't evenly divide a month or a week (every 2 weeks, every 14 days, every 3 weeks).

The only real workaround is a hand-written shell guard with epoch/modulo math that you
have to edit yourself and **can't verify** until it misfires in production weeks later.
Even popular cron generators get this wrong and ship the broken `*/14` expression with no
warning.

## What CronAnchor does

**The trick:** let cron fire often, then add a small shell **guard** that runs the job
only on the real interval boundaries, counted from a fixed start date (the **anchor**).
You pick a cadence, an **anchor start date**, and an **IANA timezone**; CronAnchor
instantly gives you:

1. **A gating cron line** — fires more often than you want (daily, or weekly on a
   weekday); the guard below narrows it down to the true interval.
2. **A correct, copy-pasteable shell guard** — lets the job run *only* on true interval
   boundaries, anchored to your start date, **DST-safe**, ready to paste into
   `crontab -e` (or saved as a standalone `.sh`).
3. **A live preview of the next 20 real fire dates** in your timezone — your proof the
   schedule is right *before* you install it.

**Also includes:**

- a **systemd timer + service** pair (interval test via `ExecCondition`),
- **plain-English input** — describe the schedule in words (e.g. *"every other Tuesday at
  9am"*),
- a **"would it run on date X?"** checker for any single day,
- a **combined multi-job crontab file** — collect several schedules and download one file.

### Highlights

- 🖥️ **Portable by default** — the guard uses pure POSIX shell math (no `date -d`), so it
  runs on **GNU/Linux, macOS/BSD, and busybox** alike. A compact GNU-only one-liner and a
  systemd timer are offered too.
- 🔒 **100% client-side** — nothing you type leaves your browser; no network calls, no
  tracking, no accounts. Safe to use with production schedules.
- 🧮 **Correct by construction** — DST-, leap-year-, and month-boundary-safe day math,
  with **zero runtime dependencies**. The in-app preview and the generated guard derive
  their dates the same way, so they always agree.
- 📋 One-click copy, shareable URLs (config *and* job list), keyboard-accessible,
  responsive.

## How CronAnchor compares

| Approach | True every-N-days / N-weeks? | Preview before install? | Notes |
| --- | --- | --- | --- |
| Plain `*/14` cron | ❌ resets at month/week boundary | ❌ | The bug this tool exists to avoid. |
| [crontab.guru](https://crontab.guru) | ❌ (great for *divisible* schedules) | partial | Use it for ordinary schedules. |
| Hand-rolled bash guard | ✅ if the math is right | ❌ unverifiable until it misfires | Fragile epoch/week-parity arithmetic. |
| systemd `OnCalendar` | ❌ alone (needs `ExecCondition`) | ❌ | Idiomatic on Linux, but systemd-only. |
| **CronAnchor** | ✅ | ✅ next 20 real fire dates | Generates all of the above outputs. |

## Example output

Every example below is the **actual** generated output for one canonical config:
*every 14 days, from 2025-01-01, at 09:00 UTC, running `/usr/local/bin/backup.sh`*.
Its next fire dates are **2025-01-01, 2025-01-15, 2025-01-29, 2025-02-12, …** — true
14-day spacing across the month boundary.

### Portable crontab block (recommended default)

Paste straight into `crontab -e`. Runs on GNU/Linux, macOS/BSD, and busybox — no `date -d`.

```sh
# CronAnchor: Run every 14 days at 09:00 (UTC), starting 2025-01-01.
# Portable POSIX guard — runs on GNU/Linux, macOS/BSD, and busybox (no `date -d`).
CRON_TZ=UTC
0 9 * * * Y=$(TZ='UTC' date +\%Y); M=$(TZ='UTC' date +\%m); D=$(TZ='UTC' date +\%d); M=${M#0}; D=${D#0}; a=$(( (14 - M) / 12 )); y=$(( Y + 4800 - a )); m=$(( M + 12 * a - 3 )); jdn=$(( D + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045 )); today_days=$(( jdn - 2440588 )); diff=$(( today_days - 20089 )); [ "$diff" -ge 0 ] && [ $(( diff \% 14 )) -eq 0 ] && /usr/local/bin/backup.sh
```

CronAnchor can also emit a standalone `.sh` guard with the same logic (a `#!/usr/bin/env
sh` header and a `CRON_TZ` / cron-line / `/path/to/this-script.sh` usage comment) for when
you'd rather keep the math in a file than inline in the crontab.

### systemd timer + service

`OnCalendar` can't express true biweekly either, so the **timer** fires at the gating
frequency and the **service** gates with `ExecCondition=` (non-zero exit = clean skip):

```ini
# CronAnchor timer: Run every 14 days at 09:00 (UTC), starting 2025-01-01.
# The trailing timezone in OnCalendar requires systemd >= v252.
[Unit]
Description=CronAnchor: Run every 14 days at 09:00 (UTC), starting 2025-01-01.

[Timer]
OnCalendar=*-*-* 09:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# CronAnchor service: runs only on true interval boundaries via ExecCondition.
[Unit]
Description=CronAnchor job: Run every 14 days at 09:00 (UTC), starting 2025-01-01.

[Service]
Type=oneshot
ExecCondition=/bin/sh -c 'Y=$(TZ=UTC date +%%Y); M=$(TZ=UTC date +%%m); D=$(TZ=UTC date +%%d); M=${M#0}; D=${D#0}; a=$(( (14 - M) / 12 )); y=$(( Y + 4800 - a )); m=$(( M + 12 * a - 3 )); jdn=$(( D + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045 )); today_days=$(( jdn - 2440588 )); diff=$(( today_days - 20089 )); [ "$diff" -ge 0 ] && [ $(( diff %% 14 )) -eq 0 ]'
ExecStart=/bin/sh -c '/usr/local/bin/backup.sh'
```

The app also generates the install notes (where to save the units and how to
`systemctl --user enable --now cronanchor.timer`).

### Compact GNU one-liner (alternative)

Shorter, but requires GNU coreutils `date` — for GNU/Linux only:

```sh
# CronAnchor (compact — GNU coreutils `date` only): Run every 14 days at 09:00 (UTC), starting 2025-01-01.
CRON_TZ=UTC
0 9 * * * d=$(( $(date -u -d "$(TZ='UTC' date +\%F)" +\%s) / 86400 - 20089 )); [ "$d" -ge 0 ] && [ $(( d \% 14 )) -eq 0 ] && /usr/local/bin/backup.sh
```

### "Would it run on date X?"

The date checker uses the same math as the preview, so they always agree. For the config
above: **2025-02-12 → yes** (a fire date); **2025-02-13 → no**, next run **2025-02-26**.

## Plain-English input

Instead of filling the form, you can type a phrase and CronAnchor fills it for you. This
is a small, deterministic grammar (not open-ended NLP) — it patches the form rather than
guessing. Recognized (case-insensitive):

- **Days:** `every day` / `daily`, `every N days`, `every other day`
- **Weeks:** `weekly` / `every week`, `biweekly` / `fortnightly`, `every other week`,
  `every N weeks [on <weekday>]`, `every <weekday>`, `every other <weekday>`
- **Optional clauses:** `at H[:MM][am|pm]` and `starting | from | on YYYY-MM-DD`

```text
every 14 days
every other Tuesday at 9am
biweekly on Friday
every 3 weeks starting 2025-06-02
```

Ambiguous or unsupported phrasings are rejected with a hint rather than producing a wrong
schedule: multiple weekdays in one job, day-of-month like *"on the 3rd"*, and non-numeric
times like *"at noon"*.

## How it works

The trick is to measure whole **calendar days** from your anchor and gate on them. The
default output is **portable**: it derives today's day-number with pure POSIX shell math
(the Julian Day Number from `date +%Y/%m/%d`), so it runs on GNU/Linux, macOS/BSD, and
busybox without `date -d`. The mechanism, in three steps:

1. **Cron fires at the gating frequency** (daily, or weekly on the weekday).
2. **The guard computes today's day-number** — the calendar date reinterpreted at **UTC
   midnight**, so the arithmetic is immune to DST and to the server's own timezone.
3. **The job runs only when** the difference from the baked-in anchor day-number is `≥ 0`
   (on/after the anchor) **and** an exact multiple of the interval.

This deliberately avoids the fragile `date +%s / 604800 % 2` epoch-week-parity trick,
which drifts across DST and depends on the locale week start. Because the in-app preview
and the generated guard count days the same way, the dates you preview are exactly the
dates that will fire.

## Usage

**Fastest path:** open the live demo, type `every 14 days` in the plain-English box, and
read the next-20 preview.

1. Open the **[live demo](https://skytuhua.github.io/cronanchor/)** (or run it locally,
   below).
2. Choose a **cadence**:
   - **Every N days** — e.g. every 14 days.
   - **Every N weeks on a weekday** — e.g. every 2 weeks on Monday.
   - **Every N weeks from a date** — the weekday is taken from your anchor date.
3. Set the **interval**, **time of day**, **anchor start date**, and **timezone** — or
   just type it in plain words (e.g. *"every other Tuesday at 9am"*) and hit **Apply**.
4. Read the **next 20 fire dates** to confirm the cadence, or use **"Would it run on a
   specific date?"** to check any single day.
5. Copy the output you want: the portable **crontab block**, the standalone **shell guard
   script**, the compact **GNU one-liner**, or the **systemd timer + service**.
6. Need several jobs at once? Click **Add to crontab file** to collect them, then copy or
   download the **combined crontab file**.

The full configuration *and* the job list are encoded in the URL, so any schedule (or set
of schedules) is shareable and bookmarkable — nothing is stored on disk.

![The generated schedule and fire-date preview](docs/screenshots/cronanchor-full.png)

## Run / build locally

Requires Node.js 20.19+ or 22.12+ (the Vite 8 / Vitest 4 toolchain; CI runs on Node 22).

```sh
git clone https://github.com/Skytuhua/cronanchor.git
cd cronanchor
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # produce a static bundle in dist/
npm run preview  # serve the production build locally
```

The build in `dist/` is a fully static site — host it anywhere (GitHub Pages, Netlify,
an S3 bucket, or just open it from a file server).

## Project structure

```text
src/
  core/   pure, dependency-free engine (no DOM) — fully tested
    dates.ts       civil-date / day-number / Julian-Day math
    schedule.ts    normalize cadence, cron line, fire dates, isFireDate
    guard.ts       portable + GNU crontab blocks and standalone .sh guard
    systemd.ts     .timer + .service (ExecCondition) generator
    nlparse.ts     plain-English phrase parser
    jobs.ts        combined multi-job crontab file
    validate.ts    input validation at the boundary
    timezones.ts   IANA zone list
    urlstate.ts    config + job list <-> URL
    types.ts / meta.ts
  ui/     thin DOM layer that wires the core engine to the page
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and [`SPEC.md`](./SPEC.md)
for the feature contract.

## FAQ

- **My guard never fires.** Nothing runs before the anchor date (the `diff >= 0` floor),
  and cron/systemd must call the guard at the *gating* frequency — daily for day cadences,
  or on the weekday in the cron line for week cadences. The guard self-skips on
  off-boundary days; you supply the frequent trigger.
- **What if the interval is 1?** Only the anchor start-date floor applies — the interval
  check is always true (CronAnchor adds a note saying so).
- **BSD / macOS?** Use the **portable** crontab block or `.sh` script, not the compact GNU
  one-liner (`date -d` is GNU-only).
- **systemd caveats?** The timezone in `OnCalendar` needs **systemd ≥ v252**. With
  `Persistent=true`, a run missed while powered off is only recovered if boot lands on a
  true interval boundary — the `ExecCondition` still gates by date.
- **Why the `\%` in the crontab line?** Cron treats a bare `%` as a newline, so CronAnchor
  escapes every literal percent in the inline guard.

## Limitations

- The systemd timer puts the timezone in `OnCalendar`, which requires **systemd ≥ v252**;
  the `ExecStart` is wrapped in `sh -c` and may need tweaking for a login shell or a
  specific working directory.
- The optional **compact one-liner** requires GNU coreutils `date` and is clearly labelled
  as such; the default portable guard has no such requirement.
- The multi-job list lives only in the URL (no browser storage), so it's shareable but
  bounded in size (up to 50 jobs).
- For ordinary divisible schedules, use [crontab.guru](https://crontab.guru) — CronAnchor
  is focused on the intervals plain cron can't express.

## Development

```sh
npm test            # run the Vitest suite (96 tests)
npm run coverage    # tests with coverage
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm run format      # prettier --write
```

The pure, dependency-free engine lives in `src/core/` and carries the bulk of the tests
(DST transitions, leap years, month boundaries, past/future anchors, the portable
Julian-Day formula vs. the date engine, exact guard/systemd output, the natural-language
parser, and URL state). Contributions should keep `src/core/` DOM-free and fully tested;
CI (`.github/workflows/deploy.yml`) runs lint, typecheck, test, and build on every push to
`main`, so run `npm run lint && npm run typecheck && npm test` before opening a PR. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the design and [`SPEC.md`](./SPEC.md) for the
feature contract.

## License

[MIT](./LICENSE) © Skytuhua
