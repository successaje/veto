/** Anything `h()` accepts as a child. `null`, `undefined` and `false` render nothing. */
export type Child = Node | string | number | null | undefined | false;

/**
 * Tiny element factory. Attributes starting with `on` and holding a function become event
 * listeners; `value`, `disabled` and `checked` are set as properties; everything else as attributes.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'value' || k === 'disabled' || k === 'checked')
      (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
