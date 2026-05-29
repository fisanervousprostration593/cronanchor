# Page Override: Explainer ("why plain cron is wrong")

> The instructional callout near the top (section 2 of the MASTER pattern). Inherits
> everything from `../MASTER.md`; only the deltas below apply. It stays in the same
> dark, calm developer aesthetic — NOT a playful/light style.

## Role on the page

Teach the core gotcha in seconds so the user trusts the tool: `0 0 */14 * *` does **not**
mean "every 14 days." Concrete, scannable, not a wall of text.

## Layout & emphasis deltas

- **Callout panel** on `--color-card` with a left accent border in `--color-warning`
  (amber) — this is the one place warning-amber leads, signalling "here's the trap."
- **Show the broken vs. correct contrast visually:**
  - The broken expression `0 0 */14 * *` rendered in JetBrains Mono with a small
    amber "fires: 1, 15, 29, then resets" annotation.
  - A short line stating the fix: a daily/weekly cron + an anchored shell guard.
- **Collapsible detail:** a one-line summary always visible; an optional "show why"
  disclosure expands the month-boundary explanation. Default collapsed on mobile,
  expanded on ≥1024px. Disclosure is keyboard-operable (`<details>`/`<summary>` or
  button + `aria-expanded`).
- Keep it **above** the configurator so first-time users get the "aha" before they
  configure; returning users can collapse it.

## Tone

- Plain, confident, technical. No marketing fluff, no emoji. One vivid example
  (days 1/15/29) beats three paragraphs.

## Anti-patterns specific to this page

- ❌ Any non-dark / playful styling (the raw engine suggestion of Claymorphism is
  explicitly rejected — it conflicts with MASTER's dark developer aesthetic).
- ❌ Amber used decoratively elsewhere — it is reserved for "the trap" here and error
  emphasis.
- ❌ A long unscannable paragraph; the gotcha must be graspable in one read.
