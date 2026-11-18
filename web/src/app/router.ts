export type Cleanup = () => void;

export interface ScreenContext {
  /** Element the screen renders into. Cleared before every navigation. */
  root: HTMLElement;
  /** Values captured by `:name` segments in the route path. */
  params: Record<string, string>;
  /** Register teardown (listeners, Firestore subscriptions) for when the user navigates away. */
  onCleanup(fn: Cleanup): void;
}

export type Screen = (ctx: ScreenContext) => void | Promise<void>;

interface Route {
  pattern: RegExp;
  keys: string[];
  screen: Screen;
}

const routes: Route[] = [];
let cleanups: Cleanup[] = [];
let outlet: HTMLElement | null = null;
let notFound: Screen = () => {};
const listeners = new Set<(path: string) => void>();

/** Called after every navigation with the new path (e.g. to mark the current nav link). */
export function onNavigate(fn: (path: string) => void): void {
  listeners.add(fn);
}

/** Register a screen for a path such as `/r/:roomId`. */
export function route(path: string, screen: Screen): void {
  const keys: string[] = [];
  const source = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key);
    return '([A-Za-z0-9_-]+)';
  });
  routes.push({ pattern: new RegExp(`^${source}/?$`), keys, screen });
}

/** The current in-app path. */
export function currentPath(): string {
  return location.pathname.replace(/\/+$/, '') || '/';
}

export function navigate(path: string, { replace = false } = {}): void {
  if (path === currentPath()) return;
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  render();
  window.scrollTo(0, 0);
}

/** Same-origin links to app routes navigate in place instead of reloading the page. */
function interceptLinks(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const a = (event.target as Element | null)?.closest('a');
  if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
  if (!routes.some((r) => r.pattern.test(a.pathname.replace(/\/+$/, '') || '/'))) return;
  event.preventDefault();
  navigate(a.pathname);
}

function render(): void {
  if (!outlet) return;
  cleanups.forEach((fn) => fn());
  cleanups = [];
  const path = currentPath();
  // A fresh wrapper per navigation so the entrance animation runs on every screen change.
  const screen = document.createElement('div');
  screen.className = 'screen';
  outlet.replaceChildren(screen);
  listeners.forEach((fn) => fn(path));
  const onCleanup = (fn: Cleanup) => void cleanups.push(fn);
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
    void r.screen({ root: screen, params, onCleanup });
    return;
  }
  void notFound({ root: screen, params: {}, onCleanup });
}

/** Re-render the current route, e.g. after deleting data the screen depends on. */
export const refresh = render;

export function startRouter(root: HTMLElement, fallback: Screen): void {
  outlet = root;
  notFound = fallback;
  window.addEventListener('popstate', render);
  document.addEventListener('click', interceptLinks);
  render();
}
