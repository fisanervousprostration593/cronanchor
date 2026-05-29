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
