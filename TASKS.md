# TASK BREAKDOWN

Living checklist, updated as the build proceeds.

## Phase 2 — Scaffolding
- [x] Project folder + `git init` + repo-local identity
- [x] `RESEARCH.md`, `SPEC.md`, `ARCHITECTURE.md`, `BUILD_LOG.md`
- [x] `.gitignore`, `LICENSE` (MIT), `README.md` skeleton, this `TASKS.md`
- [ ] Initial commit

## Phase 3 — Dependencies & dev loop
- [ ] `package.json` (Vite + TS + Vitest + Prettier + ESLint, pinned, zero runtime deps)
- [ ] `tsconfig.json` (strict), `vite.config.ts`, `vitest.config.ts`, prettier/eslint config
- [ ] Hello-world baseline: `dev`, `build`, `test`, `lint`, `format` all green

## Phase 3.5 — Design system (ui-ux-pro-max, BLOCKING)
- [ ] Clone skill, smoke-test `search.py`
- [ ] `design-system/MASTER.md` (pattern, colors+hex, typography, spacing, effects, anti-patterns, checklist)
- [ ] Per-page override(s) under `design-system/pages/`
- [ ] `--domain` deep-dives (style, color, typography, ux) + `--stack` guidelines folded in
- [ ] `DESIGN_NOTES.md` (own-words synthesis)

## Phase 4 — Build
- [ ] `core/types.ts` — config & result types
- [ ] `core/dates.ts` — dayNumber, civil-date helpers, today-in-zone  (+ tests)
- [ ] `core/schedule.ts` — cron line + fire-date generator  (+ tests)
- [ ] `core/guard.ts` — shell guard + full crontab block  (+ tests)
- [ ] `core/timezones.ts` — IANA list + validation
- [ ] `core/urlstate.ts` — config ⇄ URL query  (+ tests)
- [ ] `ui/` — form, live output, preview, copy buttons, explainer, error states
- [ ] Styles implemented strictly to design system
- [ ] Responsive (375/768/1024/1440), keyboard a11y, reduced-motion
- [ ] All SPEC features F1–F15 working; build green

## Phase 5 — Self-review & QA (workflow)
- [ ] Functional, visual/design-grading, edge-case, code-quality, a11y/perf, "would-keep-it" passes
- [ ] Adversarial verification of findings
- [ ] Screenshot evidence per screen/state
- [ ] `REVIEW.md`; all findings fixed + re-verified

## Phase 6 — Docs & packaging
- [ ] Final `README.md` (screenshots, install, usage, config, limits, license)
- [ ] `CHANGELOG.md`
- [ ] Build artifacts (zip of `dist/`) verified from clean state

## Phase 7 — Ship
- [ ] Public GitHub repo, clean history pushed
- [ ] Description, topics, homepage
- [ ] Tagged release `v1.0.0` + notes + attached artifact
- [ ] GitHub Pages live + linked
- [ ] Verify repo/release/artifact

## Phase 8 — Final report
- [ ] Summary with links + demo
