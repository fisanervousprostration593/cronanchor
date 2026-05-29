/**
 * Combines multiple schedules into a single crontab file for export. Each job is validated
 * and rendered with the portable guard; invalid jobs are skipped (never silently wrong).
 */

import { portableCrontabBlock } from "./guard";
import type { ScheduleConfig } from "./types";
import { validateConfig } from "./validate";

/** Upper bound on jobs in a session/URL (keeps the shareable URL bounded). */
export const MAX_JOBS = 50;

/** A combined, paste-ready crontab file from multiple schedules. */
export function combinedCrontabFile(configs: readonly ScheduleConfig[]): string {
  const blocks: string[] = [];
  for (const config of configs.slice(0, MAX_JOBS)) {
    const result = validateConfig(config);
    if (result.ok) blocks.push(portableCrontabBlock(result.schedule));
  }
  const count = blocks.length;
  const header = [
    "# CronAnchor — combined crontab file",
    `# ${count} job${count === 1 ? "" : "s"}. Paste into \`crontab -e\`.`,
    "# Each job is portable (GNU/Linux, macOS/BSD, busybox).",
    "",
  ].join("\n");
  return header + blocks.join("\n\n") + (count > 0 ? "\n" : "");
}
