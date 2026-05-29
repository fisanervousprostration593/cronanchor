# BUILD LOG

A running journal of decisions, dead ends, fixes, and review findings — so the whole
journey is reconstructable after the fact. Newest entries at the bottom of each phase.

---

## Phase 0 — Environment & capability setup

- **Toolchain inventoried** (Windows 11, PowerShell + Bash):
  - git 2.53.0, gh 2.87.3 (authenticated as **Skytuhua** via OS keyring), node v24.14.0,
    npm 11.9.0, python 3.13 & 3.14, git-lfs 3.7.1, browser automation available.
  - `gh api user` → `Skytuhua`; repo + release creation confirmed working.
- **GH_TOKEN / GITHUB_TOKEN env vars are NOT set**, but `gh` is authenticated via the OS
  keyring, so publishing works regardless. `gh auth setup-git` was run so `git push`
  uses the gh credential helper. The token value is never printed, logged, or committed.
- **Scratch workspace:** `C:\Users\user\dev`. **Project folder:** `…\dev\cronanchor`.

## Phase 1 — Discovery & research

- Ran discovery as a parallel research workflow: 8 niche-domain scouts → 39 candidates →
  rubric scoring → deep-dive of top 4 → final synthesis. Full result in `RESEARCH.md`.
- **Chosen: CronAnchor** — a true-interval (every N days / N weeks) cron generator with
  an anchored, DST-safe shell guard and a next-20-fire-date preview. Top rubric score
  (65), the only 5/5 across all weighted criteria. Two nominally higher-ranked ideas
  (CaptionLint, MatrixPeek) failed deep-dive verification (their "no tool exists"
  premise was false). CronAnchor's deep-dive instead *confirmed* a competitor ships the
  broken `*/14` expression.
- **Key engineering decision validated up front:** the correct fix is a daily/weekly cron
  gated by a shell guard that counts whole calendar days from an anchor, using
  UTC-reinterpreted civil dates so day-differences are exact multiples of 86400
  (DST-immune, server-tz-independent). Avoids the fragile epoch-week-parity trick.

## Phase 2 — Project scaffolding

- `git init` in `…\dev\cronanchor`. Repo-local identity set to **Skytuhua /
  Skytuhua@users.noreply.github.com** (global identity "Leo" left untouched).
- **Commit signing disabled for this repo** (`git config commit.gpgsign false`) — fresh
  project with no source-signing context; unsigned commits under the owner's identity are
  intended.
- Wrote `RESEARCH.md`, `SPEC.md`, `ARCHITECTURE.md`, this `BUILD_LOG.md`, `TASKS.md`,
  `.gitignore`, `LICENSE` (MIT, © Skytuhua), and a `README.md` skeleton.
- **Stack decision:** Vite + TypeScript (strict), vanilla DOM UI, **zero runtime deps**,
  Vitest for the edge-case suite, Prettier/ESLint + `tsc` for lint, GitHub Pages deploy.
  Rationale in `ARCHITECTURE.md` §2.

## Phase 3 — Dependencies & dev loop

- Added `.gitattributes` to force **LF** in the repo (critical: generated shell guards
  must be LF, never CRLF).
- `package.json` with **zero runtime dependencies**; all tooling is dev-only.
- Strict `tsconfig.json` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax`, etc.), `vite.config.ts` (with merged Vitest config + GH-Pages
  `base: /cronanchor/` in production), Prettier config, ESLint 9 flat config
  (typescript-eslint recommended).
- **Security:** initial install flagged the esbuild dev-server advisory
  (GHSA-67mh-4wv8-2f99) via transitive deps — dev-server-only, never in the static
  build. Resolved cleanly by upgrading to Vite 8.0.14 / Vitest 4.1.7 (patched esbuild):
  `npm audit` now reports **0 vulnerabilities**.
- **Gate 3 PASS** on a hello-world baseline: `typecheck`, `lint`, `format:check`,
  `test` (2 passing), and `build` (static bundle to `dist/`) all green.

## Phase 3.5 — UI/UX design system

- Cloned the design-intelligence skill to `../uipro` (outside the project; never
  committed/attributed). Smoke-tested its engine (`search.py --design-system`) — works.
- **Step 1 (analyze):** product = single-purpose DevOps utility; audience =
  sysadmins/DevOps/devs; style = minimal, dark, technical, trustworthy, data-dense;
  stack = vanilla HTML/CSS/TS (engine stack `html-tailwind`, closest match).
- **Step 2 (MASTER):** generated `design-system/MASTER.md` → Dark Mode (OLED), slate
  palette + green "run" accent, single-column pattern.
- **Step 3 (domain deep-dives):** ran `--domain style/color/typography/ux` and folded
  the richer results into MASTER: upgraded to the fuller **Developer Tool / IDE** palette
  (added card/muted-fg/on-accent/etc.), switched typography to the **"Developer Mono"**
  pairing (**JetBrains Mono** + **IBM Plex Sans**) since the product's content *is* code,
  and merged the UX anti-patterns/guidelines (loading states High, continuous-animation,
  stacking-context, focus-visible). Added semantic warning-amber + visible sky focus ring.
- **Step 4 (stack):** ran `--stack html-tailwind`; folded responsive-padding,
  prefers-reduced-motion, and focus-visible guidance into MASTER (translated to vanilla
  CSS).
- **Step 2b (per-page):** generated `pages/generator.md` and `pages/explainer.md`. The
  engine's raw page patterns mis-matched ("Webinar Registration", "Claymorphism") on
  keyword hits, so both were rewritten as curated overrides stating only the deltas from
  MASTER while staying in the dark developer aesthetic — refining to the product's voice
  as the workflow permits.
- **Step 5 (synthesize):** wrote `DESIGN_NOTES.md` in my own words — the contract Phase 4
  implements to.
- **Gate 3.5 PASS:** MASTER complete (pattern, hex colors, typography, spacing, effects,
  anti-patterns + pre-delivery checklist); per-page overrides exist; domain + stack
  searches run and folded; DESIGN_NOTES written. No skill files copied into the repo; no
  attribution anywhere.

## Phase 4 — Build

- **Core (pure, zero-dep, TDD):** `dates.ts` (day-number/civil-date math), `schedule.ts`
  (normalize + cron line + fire-date generator), `guard.ts` (shell guard + crontab
  block), `timezones.ts`, `urlstate.ts`, `validate.ts`, `types.ts`. **61 tests** across 7
  suites: DST, leap years, month boundaries, past/future anchors, weekday derivation,
  validation, URL round-trips, exact guard-string + `%`-escaping. Core coverage ~92%.
- **Correctness proof:** generated guard math verified in a real **GNU date 8.32** shell —
  computes the same `anchor_days` as the TS engine and fires on exactly the previewed
  dates (true 14-day spacing across the Jan→Feb boundary; every-other-Monday for weeks).
  The shell guard and the in-app preview agree by construction (both reinterpret the
  zone's civil date at UTC midnight).
- **UI (vanilla TS + DOM):** `tokens.css` + `app.css` implement the design system
  verbatim; `app.ts` wires inputs→core→render with immutable config, URL sync, and full
  empty/success/error states; `render.ts` builds output blocks + the next-20 preview;
  inline SVG icons (no emoji-as-icon); self-hosted JetBrains Mono + IBM Plex Sans
  (bundled, zero runtime network).
- **Browser-verified** (vite preview, real Chrome): header/explainer/configurator/output/
  preview/footer all render to the design system; the crontab block shows correctly
  `\%`-escaped `date`, the script form uses plain `%`, `anchor_days=20605` matches the
  engine; the preview lists 20 true-spaced Mondays; the error state (invalid interval)
  and empty state render correctly; console clean. Fixed one defect found via screenshot
  (oversized footer SVG icons — `.icon` sizing was scoped to `.btn`).
- **Gate 4 PASS:** all SPEC features F1–F15 implemented and working; no placeholders;
  build green; `typecheck` + `lint` + `format` + 61 tests all pass.

## Phase 5 — Self-review & QA

- Ran a **multi-angle code-review workflow** (7 parallel reviewers + adversarial
  verifiers, 28 agents) alongside **browser-driven functional/visual testing** in real
  Chrome. Full write-up in `REVIEW.md`.
- **One HIGH-severity correctness bug found and fixed:** the generated guard had no lower
  bound, so for a **future anchor** it would fire on interval-aligned dates *before* the
  anchor — diverging from the preview's `Math.max` clamp and breaking the core "fires on
  exactly the previewed dates" guarantee. Fix: an anchor floor (`[ "$d" -ge 0 ]` /
  `[ "$today_days" -ge "$anchor_days" ]`) before the modulo, in both the crontab block and
  the script. **Verified against GNU date 8.32**: pre-anchor dates now skip; added
  regression tests.
- **Other confirmed fixes:** reject newlines in the command (crontab line-injection via a
  shared URL); add `--color-destructive-text #F87171` so error text clears WCAG (was
  4.16:1/3.74:1); section `h2` → JetBrains Mono to match MASTER; add a `minute` error slot
  + `aria-describedby` linking on all fields; use the previously-dead `checkIcon` for a ✓
  copy-success state; dedupe HH:MM via `formatTime`; add a strict CSP meta
  (defense-in-depth, `connect-src 'none'`); switch fonts to latin-only subsets
  (`dist/assets` 1.2 MB → 448 KB). Three immaterial nits documented as accepted in
  `REVIEW.md`.
- **Re-verified:** 63 tests pass (added newline + future-anchor regressions), typecheck +
  lint clean, build green, `npm audit` 0 vulnerabilities; browser re-check of error
  state, mono headings, ✓ copy, and a clean console with no CSP violations.
- **Gate 5 PASS:** clean review pass with shell + browser evidence; design-system grading
  and Pre-Delivery Checklist pass (the one checklist failure — error-text contrast — is
  fixed); `REVIEW.md` captures findings, fixes, and evidence.

## Phase 6 — Documentation & packaging

- Finalized `README.md`: the problem, what it does, how it works (with the floored
  guard), usage, local run/build, limitations, development, license — plus three
  screenshots (`docs/screenshots/`) captured via headless Chrome from the production
  build, and a live-demo link.
- Added `CHANGELOG.md` (1.0.0) and a GitHub Actions Pages workflow
  (`.github/workflows/deploy.yml`) that lints, typechecks, tests, builds, and deploys
  `dist/` to Pages on push to `main`.
- **Build artifacts:** two builds — `dist/` (base `/cronanchor/`, for Pages) and a
  relative-base **portable** bundle zipped to `artifacts/cronanchor-v1.0.0-static.zip`
  (370 KB) so it runs when served from any path.
- **Verified the artifact from a clean state:** extracted the zip to a fresh dir, served
  it, confirmed index + JS reachable via relative paths (200), and headless-rendered it —
  the app mounts and generates the correct floored guard. **Gate 6 PASS.**
