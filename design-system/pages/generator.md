# Page Override: Generator (configurator + output + preview)

> The primary interactive surface. Inherits everything from `../MASTER.md`; only the
> deltas below apply. Style, palette, typography, spacing, anti-patterns, and the
> pre-delivery checklist all come from MASTER unchanged.

## Role on the page

Sections 3–5 of the MASTER pattern: the **configurator** (inputs), the **output**
(cron line · shell guard · full crontab block), and the **next-20 preview**.

## Layout deltas

- **Two logical zones, single column:** inputs on top, generated results directly below,
  so the user sees cause → effect without scrolling away from the form. On ≥768px the
  configurator may use a 2-column field grid; results stay full-width.
- **Sticky relationship:** when results exist, they sit immediately under the inputs in
  a distinct `--color-card` panel with a thin `--color-border`.
- **Output blocks** are JetBrains Mono on a slightly darker inset (`--color-muted`),
  each with a copy button top-right and a short label above (e.g. "Cron line",
  "Shell guard", "Full crontab block").

## Component specifics

- **Inputs:** segmented control for cadence mode (3 options); number input for interval
  N (min 1); native `<select>` for weekday + timezone; native `date` + `time` inputs.
  Labels always visible (no placeholder-as-label). 44px min touch target.
- **Copy buttons:** ghost/secondary style; on click show accent-green "Copied" for ~1.5s
  (the only place accent green animates), then revert. Icon = inline SVG clipboard.
- **Preview list:** monospace rows with `tabular-nums`; each row = weekday + date +
  local time, with a muted "+N d" gap chip showing the interval between consecutive
  fires (this is the *proof* the cadence is correct). Accent-green left tick marker.
- **Empty state:** before valid input, the output area shows a calm muted placeholder
  ("Set a cadence and an anchor date to generate your schedule"), never a blank void.
- **Error state:** invalid input renders an inline `--color-destructive` message next to
  the offending field; the output area explains what's blocking generation rather than
  showing stale/wrong output.

## Anti-patterns specific to this page

- ❌ Showing stale output while inputs are invalid (must clear or mark invalid).
- ❌ Placeholder text used as the only label.
- ❌ Copy button with no confirmation feedback.
- ❌ Preview dates without the gap indicator (the gap is the whole point).
