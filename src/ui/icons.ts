/** Inline SVG icons (never emojis-as-icons). Lucide-style 24px stroke icons. */

const svg = (paths: string): string =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const clipboardIcon = svg(
  '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
);

export const checkIcon = svg('<path d="M20 6 9 17l-5-5"/>');

export const clockIcon = svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');

export const shieldIcon = svg(
  '<path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z"/>',
);
