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
  return location.hash.replace(/^#/, '') || '/';
}

export function navigate(path: string): void {
  location.hash = path;
}

function render(): void {
  if (!outlet) return;
  cleanups.forEach((fn) => fn());
  cleanups = [];
  outlet.replaceChildren();
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
    void r.screen({ root: outlet, params, onCleanup: (fn) => cleanups.push(fn) });
    return;
  }
  void notFound({ root: outlet, params: {}, onCleanup: (fn) => cleanups.push(fn) });
}

/** Re-render the current route, e.g. after deleting data the screen depends on. */
export const refresh = render;

export function startRouter(root: HTMLElement, fallback: Screen): void {
  outlet = root;
  notFound = fallback;
  window.addEventListener('hashchange', render);
  render();
}
