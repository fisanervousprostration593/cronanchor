# TASK BREAKDOWN

Build checklist — **v1.0.0 shipped**. All phases complete; see `BUILD_LOG.md` for the
full journal and `REVIEW.md` for QA.

## Phase 2 — Scaffolding
- [x] Project folder + `git init` + repo-local identity
- [x] `RESEARCH.md`, `SPEC.md`, `ARCHITECTURE.md`, `BUILD_LOG.md`
- [x] `.gitignore`, `LICENSE` (MIT), `README.md`, this `TASKS.md`
- [x] Initial commit

## Phase 3 — Dependencies & dev loop
- [x] `package.json` (Vite + TS + Vitest + Prettier + ESLint, pinned, zero runtime deps)
- [x] `tsconfig.json` (strict), `vite.config.ts`, prettier/eslint config
- [x] Hello-world baseline: `dev`, `build`, `test`, `lint`, `format` all green

## Phase 3.5 — Design system (ui-ux-pro-max)
- [x] Clone skill, smoke-test `search.py`
- [x] `design-system/MASTER.md` (pattern, colors+hex, typography, spacing, effects, anti-patterns, checklist)
- [x] Per-page overrides (`generator.md`, `explainer.md`)
- [x] `--domain` deep-dives (style, color, typography, ux) + `--stack` guidelines folded in
- [x] `DESIGN_NOTES.md` (own-words synthesis)

## Phase 4 — Build
- [x] `core/` — types, dates, schedule, guard, timezones, urlstate, validate (+ tests)
- [x] `ui/` — form, live output, preview, copy buttons, explainer, error/empty states
- [x] Styles implemented strictly to the design system
- [x] Responsive (375/768/1024/1440), keyboard a11y, reduced-motion
- [x] All SPEC features F1–F15 working; build green; generated guard verified vs GNU date

## Phase 5 — Self-review & QA (workflow)
- [x] 7-angle review workflow + adversarial verification
- [x] Browser functional/visual/edge/a11y review with screenshot evidence
- [x] All material findings fixed + re-verified (incl. HIGH future-anchor guard bug)
- [x] `REVIEW.md`

## Phase 6 — Docs & packaging
- [x] Final `README.md` (screenshots, install, usage, limits, license)
- [x] `CHANGELOG.md`; GitHub Actions Pages workflow
- [x] Build artifact (`cronanchor-v1.0.0-static.zip`) verified from a clean state

## Phase 7 — Ship
- [x] Public GitHub repo, clean history pushed (branch `main`)
- [x] Description, topics, homepage
- [x] Tagged release `v1.0.0` + notes + attached artifact
- [x] GitHub Pages live + linked
- [x] Verified repo/release/artifact/live site; contributors = Skytuhua only
