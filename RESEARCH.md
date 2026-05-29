# RESEARCH — Product Discovery & Selection

> Phase 1 artifact. How CronAnchor was chosen: the market scan, the scored
> shortlist, the deep-dive verification, and the evidence behind the decision.

## Method

Discovery was run as a parallel research process: eight independent scouts swept
distinct niche domains (developer tools, data/format utilities, privacy/local-first
tools, productivity micro-apps, hobbyist/creative, accessibility, open-data
visualization, education) for **specific, recurring, evidenced** pain that no good
free tool solves. Every candidate was pre-constrained to be:

- buildable as a **fully client-side web app or a self-contained CLI** (no backend),
- free of **paid/key-gated APIs** and any data that can't be lawfully obtained,
- **demonstrable** (screenshot-able), and
- **unambiguously lawful and safe** to publish.

That produced **39 raw candidates**. They were de-duplicated and scored against the
selection rubric (below), the top four were independently deep-dived with web
verification and citations, and one was chosen.

## Scoring rubric

| Criterion | Weight | Meaning |
|---|---|---|
| Niche | High (×3) | Specific underserved audience, not a crowded general market |
| Real demand | High (×3) | Observable evidence people want it (web-verified ≫ inferred) |
| Doable | High (×3) | Fully buildable & polished by one engineer, no paid APIs/backend |
| Demonstrable | Medium (×2) | Can be shown working (browser screenshot / clear CLI output) |
| Defensible scope | Medium (×2) | Sharp, finishable core describable in one paragraph |
| Legal/ethical | Gate | Unambiguously lawful & safe — failure discards the candidate |

`weightedTotal = 3·(niche + realDemand + doable) + 2·(demonstrable + defensibleScope)`

## Shortlist (top of 39)

| Rank | Candidate | Score | Deep-dive verdict |
|---|---|---|---|
| **1** | **CronAnchor** — true-interval cron generator | **65** | **viable → chosen** |
| 2 | CaptionLint — CLI caption a11y validator | 63 | weak (checks already shipped free by subfixer / Subtitle Edit) |
| 3 | RRULE Lens — iCalendar recurrence inspector | 62 | viable (but 3 free tools already show occurrences; engine-trust paradox) |
| 4 | MatrixPeek — GH Actions matrix expander | 62 | weak (premise false — `katexochen/github-matrix-parser` already does it) |
| — | HeadwayDiff — GTFS frequency diff | 59 | not deep-dived (larger scope than the winner) |
| — | AltAudit / HueOnly — a11y linters | 58 | not deep-dived |

CronAnchor was the **only** candidate to score 5/5 on every weighted criterion. The
two higher-ranked-on-paper alternatives (CaptionLint, MatrixPeek) **failed their
deep-dives**: independent verification found their core "no tool exists" premise was
false — the exact functionality already ships for free. CronAnchor's deep-dive, by
contrast, *strengthened* the case: it confirmed a leading competitor is actively
shipping the broken expression.

## The chosen product: CronAnchor

**One-line pitch.** A free, fully client-side tool that generates a correct,
copy-pasteable cron + shell guard for *true* N-week / N-day intervals — and shows you
the next 20 real fire dates so you can trust it before you install.

**Target user.** Sysadmins, DevOps engineers, and developers who must schedule
genuinely periodic jobs (every 2 weeks, every 14 days, every 3 weeks) and are stuck
with plain `crontab` — people who have hit the `*/N` month-reset wall and don't want
to abandon cron for systemd timers or a paid cloud scheduler.

**The core problem.** Standard cron has **no native way** to express true fixed
intervals that don't evenly divide a month or week. The obvious `0 0 */14 * *` is a
trap: cron interprets `*/14` *within* the day-of-month field (range 1–31), so it fires
on days **1, 15, 29 — then resets at the month boundary** (a 2–3 day gap, not 14
days). The only real workaround is a hand-written shell guard with epoch/modulo math
that the user must edit by hand and **cannot verify** until it misfires in production.
No existing free generator emits a correct anchored guard *or* previews the actual
fire dates.

**The differentiator.** *Verification before install.* You pick a cadence, an anchor
start date, and a timezone, and CronAnchor instantly gives you (1) the gating cron
line, (2) a correct, ready-to-paste shell guard with the anchor and interval already
baked in, and (3) a live list of the next 20 real fire dates in your timezone. The
whole value proposition is **"unlike the others, this one is right — and it proves it
to you."**

### Why there is real demand (web-verified)

The "cron can't do true biweekly/N-day intervals" pain recurs across many independent
communities — and notably **spans schedulers**, showing it's a fundamental gap, not a
niche annoyance:

- **crontogo.com — "What Cron Can't Do"** states cron "can't utilize intervals which
  can't serve as divisors without remainder" and cannot schedule week-based or precise
  multi-day intervals; it offers only manual bash workarounds.
  <https://crontogo.com/blog/what-cant-cron-do/>
- **Beekeeper Studio's dedicated "cron every other week" generator OUTPUTS THE BROKEN
  `0 0 */14 * *`** and presents it as a working solution, with no warning and no
  preview — direct proof a leading tool gets this wrong and the gap is unfilled.
  <https://www.beekeeperstudio.io/tools/cron-generator/examples/cron-every-other-week/>
- Recurring community threads asking for exactly this:
  **UiPath** ([biweekly workaround](https://forum.uipath.com/t/workaround-for-a-biweekly-cron-schedule/541393)),
  **Atlassian/Jira** ([every other Tuesday](https://community.atlassian.com/forums/Jira-questions/How-to-make-a-cron-expression-for-every-other-tuesday/qaq-p/1591228)),
  **LinuxQuestions** ([every 14 days](https://www.linuxquestions.org/questions/linux-general-1/crontab-entry-to-schedule-a-script-every-14-days-725887/)),
  Salesforce Trailblazer ("cron every 14 days").
- The canonical copy-paste workaround everyone reaches for is a fragile guard like
  `` expr `date +%s` / 604800 % 2 `` (week parity) or a 14-day marker-file test —
  documented as the *only* path by
  [SysTutorials](https://www.systutorials.com/how-to-run-a-cron-job-every-two-weeks-months-days/)
  and [Coderwall](https://coderwall.com/p/yzzu5a/running-a-cron-job-every-other-week).
  **No generator emits these for the user.**
- The limitation isn't cron-specific: **systemd** has had an open feature request
  *"RFE: Add support for biweekly calendar events"* (#6024) for years —
  <https://github.com/systemd/systemd/issues/6024>.
- crontab.guru even has a [`cron-bug.html`](https://crontab.guru/cron-bug.html) page
  about the day-of-month vs day-of-week pitfall, but does not generate interval guards.

*Honest negative result:* targeted Reddit/HN searches did not return indexed hits in
this run, so Reddit/HN demand is treated as **unconfirmed** (weighted down). The forum,
blog, and competitor-error evidence is more than sufficient on its own.

### Why it's doable in this environment

100% client-side static site — **no backend, no paid APIs, no unobtainable data**. All
logic is deterministic offline date math: parse cadence + anchor + IANA timezone,
compute fire dates, template the guard string. The one real engineering subtlety —
DST/timezone-correct whole-day counting — is solved by computing day-numbers from
**UTC-reinterpreted calendar dates** (`Date.UTC()` in the app; `date -u -d "$(TZ=zone
date +%F)"` in the generated guard), which makes day-differences exact multiples of
86400 and immune to DST and server timezone. This is implementable with **zero runtime
dependencies** (native `Date` + `Intl`) — a deliberately stronger correctness story
than depending on a date library that might carry the very bugs we warn about. Ships to
GitHub Pages, fully screenshot-able, finishable by one engineer. **The cost is in
correctness QA, not features.**

### Risks (from the deep-dive) and how we treat them

| Risk | Response |
|---|---|
| Correctness bar is unforgiving — one DST/leap-year off-by-one destroys trust | Exhaustive Vitest suite: DST transitions, leap years, non-Sunday week starts, past/future anchors, month boundaries. Correctness is the product. |
| Emitted guard not portable to BSD/macOS/busybox `date` | v1 targets **GNU coreutils** explicitly and says so prominently; per-platform variants deferred. |
| Low monetization / SEO displacement is hard | Out of scope. This is a craft/portfolio utility whose goal is to be *correct and useful*, not to be a business. |
| Incumbents could add the feature | The moat is correctness + UX; we simply build the best correct version. |

## Decision

**Build CronAnchor.** It is the sharpest, most defensible, fully-finishable option
with the strongest *web-verified* demand, it is unambiguously lawful and offline, and
its correctness challenge makes it a genuine engineering craft piece rather than a
thin wrapper. Runners-up (RRULE Lens, HeadwayDiff) remain interesting but each has a
weaker moat or larger scope; the two nominally higher-scored ideas failed deep-dive
verification.

### One-paragraph v1 pitch (the readiness test)

> CronAnchor is a single-page, offline web tool that finally lets you schedule a cron
> job to run *every N days* or *every N weeks* — intervals plain cron genuinely cannot
> express. Pick a cadence, an anchor start date, and a timezone; CronAnchor generates
> the cron line plus a correct, copy-pasteable shell guard (anchored, DST-safe,
> GNU-coreutils) and shows you the next 20 real fire dates so you can verify the
> schedule before you ever install it. No `*/14` month-reset trap, no fragile epoch
> math to hand-edit, nothing leaves your browser.
