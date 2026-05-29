<!-- README skeleton — finalized in Phase 6 with screenshots, install & usage. -->

# CronAnchor

**Schedule cron jobs for true `every N days` / `every N weeks` intervals — the ones
plain cron genuinely can't express — and see the next 20 real fire dates before you
install.**

`0 0 */14 * *` does **not** mean "every 14 days." Cron evaluates `*/14` inside the
day-of-month field, so it fires on days **1, 15, 29 — then resets at the month
boundary**. CronAnchor generates the correct cron line plus an anchored, DST-safe shell
guard, and previews the actual fire dates so you can trust the schedule.

- 🔒 100% client-side — nothing leaves your browser
- 📅 Live preview of the next 20 real fire dates in your timezone
- 🧮 DST-safe, leap-year-safe day math (zero runtime dependencies)
- 📋 One-click copy of a ready-to-paste crontab block

> Status: in development. Full usage, screenshots, and install instructions land in
> Phase 6.

## License

MIT © Skytuhua — see [LICENSE](./LICENSE).
