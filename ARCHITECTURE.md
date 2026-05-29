# ARCHITECTURE — CronAnchor

> How CronAnchor is built and *why*. Pairs with `SPEC.md` (what) and `RESEARCH.md`
> (why it exists).

## 1. Guiding principles

1. **Correctness is the product.** The entire value proposition is "this one is right."
   The date engine is pure, deterministic, dependency-free, and exhaustively tested.
2. **Zero runtime dependencies.** All math uses native `Date` + `Intl`. We deliberately
   do *not* pull in a date library — depending on one would mean inheriting its bugs in
   the exact domain (recurrence/DST) where we promise correctness.
3. **Offline & private.** No network at runtime. No analytics. No backend. It is safe to
   paste production schedules.
4. **Static & portable.** Builds to plain HTML/CSS/JS, hostable on GitHub Pages.
5. **Separation of concerns.** A framework-agnostic `core/` (pure logic, fully testable
   with no DOM) is consumed by a thin vanilla-TS `ui/` layer.

## 2. Tech stack & rationale

| Concern | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** (strict) | Type-safety on the date math where mistakes are costly. |
| Build/dev | **Vite** | Fast dev server + tiny static build; first-class TS; trivial GH Pages output via `base`. |
| UI | **Vanilla TS + DOM** (no framework) | The UI is a form + live output; a framework is unnecessary weight. Keeps the bundle tiny and the dependency surface ≈ zero. |
| Date math | **Native `Date` + `Intl.DateTimeFormat`** | DST/timezone correctness without a third-party recurrence engine. |
| Tests | **Vitest** | Fast, TS-native, great for the table-driven edge-case suite. |
| Format/lint | **Prettier** + `tsc --noEmit` (+ ESLint) | Consistent style; type-check as the primary correctness lint. |
| Deploy | **GitHub Pages** via GitHub Actions | Free static hosting matching the offline model. |

Runtime npm dependencies: **none.** All packages are `devDependencies`.

## 3. The date engine (the heart)

### 3.1 DST-immune day numbering

The cornerstone is a **day number**: the count of whole calendar days from the Unix
epoch for a given civil date, computed by reinterpreting that date at **UTC midnight**:

```
dayNumber(y, m, d) = Date.UTC(y, m - 1, d) / 86_400_000   // always an exact integer
```

Because `Date.UTC` ignores DST and local offsets, the difference between two day
numbers is the exact number of calendar days between the two civil dates — immune to
DST and to whatever timezone the server runs in.

The **generated shell guard mirrors this exactly**:

```sh
# today's civil date in the target zone, reinterpreted at UTC midnight, in whole days
today_days=$(( $(date -u -d "$(TZ='<ZONE>' date +\%F)" +\%s) / 86400 ))
[ $(( (today_days - <ANCHOR_DAYS>) \% <N> )) -eq 0 ] && <command>
```

`<ANCHOR_DAYS>` is `dayNumber(anchor)` computed in the app and baked in as a constant,
so the guard and the preview agree by construction. (`%` is written `\%` because cron
treats an unescaped `%` as a newline.)

### 3.2 What "today" is

The interval is measured in **civil days in the chosen IANA timezone**. The app derives
"today in zone" with `Intl.DateTimeFormat(..., { timeZone })` and the guard pins
`TZ='<ZONE>'` on the `date` call, so both compute the same civil date regardless of the
machine's own timezone.

### 3.3 Fire-date generation (preview)

- **Every N days (F1):** dates where `(dayNumber(date) − ANCHOR_DAYS) mod N == 0`, i.e.
  `anchor, anchor+N, anchor+2N, …`, each at `HH:MM` in the zone.
- **Every N weeks (F2/F3):** cron restricts firing to weekday `W`; among those, keep
  dates where `((dayNumber(date) − ANCHOR_DAYS) / 7) mod N == 0`. The anchor is
  normalized to the first on-or-after date that lands on `W`.

The preview lists the next 20 such datetimes ≥ now (or ≥ anchor if the anchor is in the
future), each annotated with weekday and gap-in-days from the previous fire.

### 3.4 Why not epoch-second division?

`date +%s / 86400` of a *local* midnight is not a clean multiple of 86400 when the zone
offset ≠ 0, and across a DST change the seconds between two local midnights are 23 h or
25 h — so naive epoch division drifts by a day near transitions. Forcing UTC
reinterpretation of the civil date removes that entire class of bug. The popular
`` `date +%s` / 604800 % 2 `` week-parity trick has the same flaw *plus* a locale
week-start dependency; we do not use it.

## 4. Module layout

```
cronanchor/
├─ index.html              # app shell
├─ src/
│  ├─ core/                # PURE, DOM-free, fully unit-tested
│  │  ├─ dates.ts          # dayNumber, civil-date helpers, "today in zone"
│  │  ├─ schedule.ts       # cadence model → cron line + fire dates + isFireDate
│  │  ├─ guard.ts          # portable + GNU-compact shell guard / crontab block
│  │  ├─ systemd.ts        # cadence model → .timer + .service (ExecCondition gate)
│  │  ├─ nlparse.ts        # natural-language phrase → partial config
│  │  ├─ jobs.ts           # multiple schedules → combined crontab file
│  │  ├─ timezones.ts      # IANA zone list (from Intl) + validation
│  │  ├─ urlstate.ts       # (de)serialize config + jobs ⇄ URL query
│  │  └─ types.ts          # CadenceMode, ScheduleConfig, validation result types
│  ├─ ui/                  # thin DOM layer over core
│  │  ├─ app.ts            # wire inputs → core → render; URL sync; jobs + checker
│  │  ├─ render.ts         # output panels, preview, date-check, jobs list
│  │  ├─ icons.ts          # inline SVG icons
│  │  └─ dom.ts            # small typed DOM helpers
│  ├─ styles/              # design-system tokens + component CSS (Phase 3.5)
│  └─ main.ts              # entry point
├─ test/                   # Vitest edge-case suites mirroring core/
├─ design-system/          # Phase 3.5 output (MASTER.md, pages/, etc.)
└─ docs / config / meta    # SPEC, ARCHITECTURE, RESEARCH, BUILD_LOG, README, LICENSE …
```

## 5. Data flow

```
URL query ─┐
           ├─► ScheduleConfig ──► validate ──► (valid) ──► core.schedule + core.guard
inputs  ───┘                          │                         │
                                      ▼                         ▼
                              inline error states        cron line · guard · crontab block · next-20 preview
                                                                 │
                                                          render to DOM + copy buttons + URL sync
```

Every keystroke produces a new immutable `ScheduleConfig`, which is validated and fed to
the pure core; the UI renders the result or the validation errors. No hidden mutable
state.

## 6. Dependencies & licenses

- **Runtime:** none.
- **Dev:** Vite, TypeScript, Vitest, Prettier, ESLint — all MIT/permissive. Pinned in
  `package.json` and recorded in `BUILD_LOG.md`.
- **The product's own license:** MIT (see `LICENSE`).

## 7. Deployment

`vite build` emits a static bundle to `dist/`. A GitHub Actions workflow builds and
publishes it to GitHub Pages on push to `main`; the release artifact is a zip of
`dist/`. `base` is set to the repo path for correct Pages asset URLs.

## 8. Testing strategy

Table-driven Vitest suites against `core/`:
- day-number arithmetic and civil-date round-trips,
- every-N-days and every-N-weeks fire sequences (incl. spacing assertions),
- DST-transition dates (spring-forward / fall-back) keep correct civil spacing,
- leap years incl. Feb-29 anchors,
- non-Sunday week starts / arbitrary anchor weekdays,
- past vs future anchors,
- month-boundary correctness (the `*/14` anti-case),
- guard-string generation (exact expected output, `%`-escaping),
- URL state round-trips, and input validation rejects bad input.
