# REVIEW — Self-Review & QA

> Phase 5 artifact. How CronAnchor was reviewed, what was found, what was fixed, and the
> evidence. Review was run on two fronts: a **multi-angle code-review workflow** (7
> parallel reviewers, each finding adversarially re-verified by an independent agent) and
> **browser-driven functional/visual testing** of the built app in real Chrome.

## Method

- **Code-review workflow** — 7 angles: functional-vs-SPEC, correctness/edge-case,
  code-quality, security, accessibility/performance, design-system fidelity, and
  "would a real user keep this?". Each reviewer cited `file:line`, ran the test/lint/type
  gates, and (for the date/guard logic) checked output against **real GNU coreutils
  `date` 8.32**. Every raw finding was then handed to a separate verifier agent tasked
  with reproducing or refuting it; only confirmed, real defects were kept. 28 agents
  total; raw findings were triaged down to the confirmed set below.
- **Browser testing** — the production build (`vite preview`) driven in Chrome at
  390 / 1280 / 1360 / 1440 px: every cadence mode, output generation, the next-20
  preview, copy buttons, the explainer, empty + error states, URL state, and the console.

## Outcome

The codebase came back **strong**: all 15 SPEC MUST features implemented and wired; no
XSS (every user value is escaped or numerically coerced before reaching the DOM); zero
network/secrets; 17/17 design tokens match MASTER verbatim; strict TS, lint, and 61→63
tests all green. The panel surfaced **one HIGH-severity correctness bug** and a set of
smaller defects, all now fixed and re-verified.

## Confirmed findings & fixes

| # | Severity | Finding | Fix | Re-verified |
|---|---|---|---|---|
| 1 | **HIGH** | Guard fires on interval-aligned dates **before a future anchor** (no lower bound), diverging from the preview's clamp — breaks SPEC §6/F7. | Added an anchor floor to both emitted artifacts: `[ "$d" -ge 0 ]` (crontab) / `[ "$today_days" -ge "$anchor_days" ]` (script) before the modulo. | GNU `date` 8.32 (below) + new regression tests |
| 2 | MEDIUM | `command` not validated for newlines; a shared URL could inject a second, unguarded crontab line. | `validateConfig` rejects `\r\n` in the command with a field message. | new test in `validate.test.ts` |
| 3 | MEDIUM | Error red `#EF4444` as **text** fails WCAG AA (4.16:1 on card, 3.74:1 on tint). | Added `--color-destructive-text #F87171` to MASTER + tokens (≥5:1); `#EF4444` kept for borders. | browser (error state) |
| 4 | LOW | `.card > h2` used IBM Plex Sans; MASTER says headings = JetBrains Mono. | `.card > h2` → `--font-mono`. | browser (mono headings) |
| 5 | LOW | A `minute` validation error had no inline DOM slot. | Added `data-error-for="minute"` span; linked all field errors via `aria-describedby`. | markup + typecheck |
| 6 | LOW | Dead code: exported `checkIcon` never used. | Used it — copy success now shows a ✓ checkmark (better UX than text-only). | browser (✓ Copied) |
| 7 | LOW | HH:MM formatting duplicated in `app.ts`. | `shellHtml` now calls `formatTime` from core. | typecheck |
| 8 | LOW | No Content-Security-Policy (defense-in-depth). | Added a strict CSP meta (`connect-src 'none'`, same-origin only). | browser (no console/CSP errors) |
| 9 | LOW | Non-latin font subsets shipped as dead weight. | Switched to latin-only `@fontsource` imports. | `dist/assets` 1.2 MB → 448 KB |
| — | a11y | Field errors not linked to inputs. | `aria-describedby` + `aria-live="polite"` on each error span. | markup |

### Accepted (no change) — immaterial nits with rationale

- **Segmented control uses `aria-pressed` rather than a radiogroup.** It announces state
  correctly and is keyboard-operable; a radiogroup is a stylistic preference, not a
  defect. Kept.
- **`<label id="mode-label">Cadence</label>` has no `for`.** It is referenced by the
  group's `aria-labelledby`, so the accessible name is correct; harmless. Kept.
- **`currentMode` is a single mutable UI variable.** The module comment was softened to
  acknowledge it; the core stays pure. Documentation-only.

## Evidence

### The HIGH bug — before/after, against real GNU `date` 8.32

Future anchor `2030-01-06`, every 14 days (`anchor_days=21920`):

```
date         diff   OLD guard   FIXED guard
2029-12-09   -28    FIRE (bug)  skip
2029-12-23   -14    FIRE (bug)  skip
2030-01-06     0    FIRE        FIRE
2030-01-20    14    FIRE        FIRE
2030-02-03    28    FIRE        FIRE
```

The old modulo-only guard wrongly fired on the two pre-anchor dates; the fixed guard
skips them and fires from the anchor onward — exactly matching the preview's
`Math.max` clamp.

### Core guard math (the everyday case), GNU `date` 8.32

Anchor `2025-01-01`, every 14 days: fires `2025-01-01, 01-15, 01-29, 02-12, 03-12` (true
14-day spacing across the month boundary — **not** the broken `*/14` reset to days
1/15/29). Week mode `every 2 weeks on Monday` from `2025-03-03`: fires every other
Monday. Both match the in-app preview by construction (the app and the guard both derive
day numbers from UTC-reinterpreted civil dates).

### Browser-verified states (production build, Chrome)

- **Functional:** all three cadence modes; crontab block, cron line, and shell-guard
  script generate correctly; copy buttons show ✓ Copied; next-20 preview lists true
  N-spaced dates; URL state restores a shared config.
- **States:** empty (calm placeholder), success (green description + output), error
  (inline red message + invalid border + `role="alert"` summary).
- **Visual / design fidelity:** dark developer-console aesthetic; JetBrains Mono headings
  + IBM Plex Sans body; amber explainer callout; responsive and unbroken at
  390/1280/1360/1440 px; explainer expands; **console clean, no CSP violations**.

## Gates at close of review

`npm run typecheck` ✓ · `npm run lint` ✓ · `npm run test` ✓ **63 passing** · `npm run
build` ✓ · `npm audit` 0 vulnerabilities. A full review pass produces no remaining
material findings.
