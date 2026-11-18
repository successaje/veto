import { h, type Child } from './dom';
import { icon, type IconName } from './icons';

// ---------- buttons ----------

export interface ButtonOptions {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  block?: boolean;
  icon?: IconName;
  iconAfter?: IconName;
  disabled?: boolean;
  type?: 'button' | 'submit';
  label?: string;
  onClick?: (ev: MouseEvent) => void;
}

export function button(text: string, opts: ButtonOptions = {}): HTMLButtonElement {
  const cls = [
    'btn',
    opts.variant && opts.variant !== 'secondary' ? `btn-${opts.variant}` : '',
    opts.size === 'sm' ? 'btn-sm' : '',
    opts.block ? 'btn-block' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const btn = h(
    'button',
    {
      type: opts.type ?? 'button',
      class: cls,
      disabled: opts.disabled,
      'aria-label': opts.label,
      onclick: opts.onClick,
    },
    opts.icon ? icon(opts.icon) : null,
    h('span', { class: 'btn-text' }, text),
    opts.iconAfter ? icon(opts.iconAfter) : null,
  );
  return btn;
}

/** A link styled as a button, for navigation. */
export function linkButton(text: string, href: string, opts: Omit<ButtonOptions, 'onClick'> = {}) {
  const a = h(
    'a',
    {
      href,
      class: ['btn', opts.variant && opts.variant !== 'secondary' ? `btn-${opts.variant}` : '']
        .filter(Boolean)
        .join(' '),
    },
    opts.icon ? icon(opts.icon) : null,
    h('span', { class: 'btn-text' }, text),
    opts.iconAfter ? icon(opts.iconAfter) : null,
  );
  return a;
}

/**
 * Run `work` with the button in a busy state (spinner, disabled, optional label), restoring it
 * afterwards whether the work succeeds or throws. The result or error is passed through.
 */
export async function busy<T>(btn: HTMLButtonElement, busyText: string | null, work: () => Promise<T>) {
  const textEl = btn.querySelector('.btn-text');
  const original = textEl?.textContent ?? '';
  btn.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  if (busyText && textEl) textEl.textContent = busyText;
  try {
    return await work();
  } finally {
    btn.removeAttribute('aria-busy');
    btn.disabled = false;
    if (textEl) textEl.textContent = original;
  }
}

// ---------- form ----------

let fieldSeq = 0;

export function field(
  label: string,
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  hint?: string,
): HTMLElement {
  const id = control.id || `f${++fieldSeq}`;
  control.id = id;
  const hintEl = hint ? h('p', { class: 'field-hint', id: `${id}-hint` }, hint) : null;
  if (hintEl) control.setAttribute('aria-describedby', hintEl.id);
  return h('div', { class: 'field' }, h('label', { class: 'field-label', for: id }, label), control, hintEl);
}

// ---------- status ----------

export type Tone = 'info' | 'good' | 'warn' | 'error';
const toneIcon: Record<Tone, IconName> = { info: 'info', good: 'check', warn: 'alert', error: 'alert' };

/** Inline message: what happened and what to do next. */
export function notice(tone: Tone, title: Child, ...body: Child[]): HTMLElement {
  return h(
    'div',
    { class: `notice notice-${tone}`, role: tone === 'error' ? 'alert' : 'status' },
    icon(toneIcon[tone]),
    h('div', { class: 'stack', style: '--stack: var(--s-2)' }, h('strong', {}, title), ...body),
  );
}

/** Where an AI answer was computed: on this device or in the cloud. */
export function sourceTag(source: 'on_device' | 'in_cloud'): HTMLElement {
  return source === 'on_device'
    ? h('span', { class: 'tag tag-device' }, icon('lock'), 'On this device')
    : h('span', { class: 'tag tag-cloud' }, icon('cloud'), 'Cloud');
}

export function pageHead(eyebrow: string, title: string, lede?: Child): HTMLElement {
  return h(
    'header',
    { class: 'page-head' },
    h('p', { class: 'eyebrow' }, eyebrow),
    h('h1', {}, title),
    lede ? h('p', { class: 'lede' }, lede) : null,
  );
}

export function emptyState(title: string, body: string, action?: HTMLElement): HTMLElement {
  return h('div', { class: 'empty' }, h('h3', {}, title), h('p', { class: 'muted' }, body), action ?? null);
}

export function skeleton(lines = 3): HTMLElement {
  return h(
    'div',
    { class: 'stack', style: '--stack: var(--s-3)', 'aria-hidden': 'true' },
    ...Array.from({ length: lines }, (_, i) =>
      h('span', { class: 'skeleton', style: `width: ${[92, 74, 58, 83][i % 4]}%` }),
    ),
  );
}

// ---------- staged progress ----------

export interface Steps {
  el: HTMLOListElement;
  /** Mark step `i` active and every earlier step done. */
  at(i: number): void;
  done(): void;
}

export function steps(labels: string[]): Steps {
  const items = labels.map((l) => h('li', { 'data-state': 'pending' }, l));
  const el = h('ol', { class: 'steps', 'aria-live': 'polite' }, ...items);
  const at = (i: number) =>
    items.forEach((li, k) => li.setAttribute('data-state', k < i ? 'done' : k === i ? 'active' : 'pending'));
  return { el, at, done: () => at(items.length) };
}

// ---------- toasts ----------

let region: HTMLElement | null = null;

/** Brief confirmation at the bottom of the screen ("Link copied"). Announced to screen readers. */
export function toast(message: string, iconName: IconName = 'check'): void {
  region ??= document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
  const t = h('div', { class: 'toast' }, icon(iconName), message);
  region.append(t);
  setTimeout(() => {
    t.classList.add('leaving');
    setTimeout(() => t.remove(), 250);
  }, 2400);
}
