# DESIGN NOTES — CronAnchor

> My own-words synthesis of the design system. This is the contract Phase 4 builds to.
> The full, binding spec lives in `design-system/MASTER.md` (+ `pages/` overrides); this
> is the at-a-glance summary so the build stays faithful without re-reading everything.

## The feel in one sentence

A calm, dark **developer console**: a single-purpose tool that looks precise and
trustworthy, where the code it generates is the hero and nothing competes with it.

## Pattern — Tool-First Single Column

One centered column (~720px max), mobile-first, no nav. Top to bottom: header → a short
"why plain cron is wrong" warning callout → the configurator → the generated output
(cron line, shell guard, full crontab block) → the next-20 fire-date preview → footer
(offline/privacy + GNU-coreutils note + license). Cause sits directly above effect.

## Style — Dark only (refined OLED)

Dark, high-contrast, terminal-adjacent but **calm** — explicitly *not* neon cyberpunk
(no glitch, no scanlines). Slate background rather than pure black for read comfort.
`color-scheme: dark`. Aim WCAG AAA (≥7:1) on body text, never below 4.5:1.

## Palette (hex — use exactly)

- Background `#0F172A` · Card/panel `#1B2336` · Muted surface `#272F42`
- Foreground `#F8FAFC` · Muted foreground `#94A3B8` · Border `#475569`
- Primary `#1E293B` (on it: `#FFFFFF`) · Secondary `#334155`
- **Accent green `#22C55E`** (on it: `#0F172A`) — correctness only: valid output,
  "copied", fire-date markers. Never decorative.
- **Warning amber `#F59E0B`** — the "cron trap" callout + the broken `*/14` example only.
- Destructive red `#EF4444` (on it: `#FFFFFF`) — validation errors.
- Focus ring **sky `#38BDF8`** — visible keyboard focus on dark panels.

## Typography — "Developer Mono"

- **JetBrains Mono** for headings and *all* code/cron/shell/date output.
- **IBM Plex Sans** for body, labels, UI text.
- Fonts are **vendored/self-hosted** (zero runtime network calls).
- Scale (rem): 0.78 / 0.875 / 1 / 1.125 / 1.5 / 2 / clamp(2,5vw,2.5). Body line-height
  ≥ 1.5. Preview numbers use `tabular-nums` so date columns line up.

## Spacing, radii, container

8-pt-ish scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px (`--space-1…8`). Radii: 6 (inputs),
10 (panels), 14 (main container). Container padding responsive:
`clamp(16px, 4vw, 32px)`.

## Key effects (subtle, state-only)

150–300ms transitions on hover/focus/state. Minimal accent glow only on the
active/correct state, sparingly. `:focus-visible` ring everywhere. Copy → brief green
"Copied" then revert. **No** continuous or decorative motion. All motion disabled under
`prefers-reduced-motion: reduce`.

## Anti-patterns to avoid (each = a defect)

Light mode / white backgrounds · emojis as icons (use inline SVG) · decorative/infinite
animation · frozen UI with no feedback during work · `z-index:9999` hacks · `:focus`
that shows on click (use `:focus-visible`) · grey-on-grey under 4.5:1 · neon overload ·
stale output shown while inputs are invalid · placeholder-as-label · copy buttons with
no confirmation · preview rows missing the interval-gap indicator.

## Required UI states

Every interactive area must have: **empty** (calm muted prompt, never blank), **valid /
success** (generated output + green confirmation), **error** (inline red message at the
offending field; output explains what's blocking), and **compute/loading** feedback if
any operation isn't instant. Responsive and unbroken at 375 / 768 / 1024 / 1440px;
fully keyboard-operable with visible focus.
