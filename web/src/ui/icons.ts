/**
 * Veto's icon set: 24px grid, 1.75 stroke, round caps. Drawn for this project, so there is no
 * icon-font or library dependency. Every icon is decorative (aria-hidden); labels carry meaning.
 */
const PATHS = {
  mark: '<path d="M5 4.5 12 19.5 19 4.5" /><path d="M3.5 13.5 20.5 9" class="accent-stroke" />',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />',
  cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.6 4.5 4.5 0 0 0 7 18.5Z" />',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5" />',
  x: '<path d="M6 6l12 12M18 6 6 18" />',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h9" />',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6" />',
  users:
    '<circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6a6.5 6.5 0 0 1 3.5 5.4" />',
  shield: '<path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />',
  alert: '<circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" />',
  info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" />',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" />',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" />',
  chevronRight: '<path d="m9 6 6 6-6 6" />',
  database:
    '<ellipse cx="12" cy="6" rx="7" ry="2.5" /><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />',
  device: '<rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M11 18.5h2" />',
  ban: '<circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" />',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, className = ''): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="icon ${className}">${PATHS[name]}</svg>`;
  return tpl.content.firstElementChild as SVGSVGElement;
}
