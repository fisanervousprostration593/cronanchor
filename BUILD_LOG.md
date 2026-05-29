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
