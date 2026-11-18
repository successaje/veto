import type { Candidate } from '../domain/attrs';
import { h, type Child } from './dom';
import { icon } from './icons';

const price = (band: number) => (band > 0 ? '$'.repeat(band) : '');

/**
 * One option: name, area and price, the evidence behind it, an optional Maps link, and a slot
 * for a verdict or a vote control. `state` strikes the name through (`out`) or marks it as fine.
 */
export function optionItem(c: Candidate, extra?: Child, state?: 'in' | 'out'): HTMLLIElement {
  return h(
    'li',
    { class: `option${state ? ` is-${state}` : ''}` },
    h(
      'div',
      { class: 'stack', style: '--stack: var(--s-1)' },
      h(
        'div',
        { class: 'option-head' },
        h('span', { class: 'option-name' }, c.name),
        h('span', { class: 'option-meta' }, [c.area, price(c.priceBand)].filter(Boolean).join(' · ')),
      ),
      c.evidence ? h('p', { class: 'option-evidence' }, c.evidence) : null,
      c.mapsUri ? mapsLink(c.mapsUri) : null,
    ),
    extra,
  );
}

export function optionList(...items: HTMLLIElement[]): HTMLUListElement {
  return h('ul', { class: 'options' }, ...items);
}

/** "Google Maps" exactly as the attribution rules ask: never translated, wrapped or restyled. */
export const mapsName = (): HTMLElement => h('span', { class: 'maps-attr', translate: 'no' }, 'Google Maps');

/** The source link for one place, right under it. */
export function mapsLink(uri: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'option-source small', href: uri, target: '_blank', rel: 'noopener' },
    'Open in ',
    mapsName(),
  );
}

/**
 * Where the options came from, shown right after them: Google Maps, or the demo list (and why).
 * Nobody should plan a real evening around a made-up place without being told.
 */
export function placesNote(source: 'maps' | 'fixture' | 'fallback' | undefined): HTMLElement {
  if (source === 'maps') {
    return h(
      'p',
      { class: 'places-note small muted' },
      icon('mapPin'),
      h('span', {}, 'Places and links from ', mapsName(), '.'),
    );
  }
  return h(
    'p',
    { class: 'places-note small muted' },
    icon('info'),
    h(
      'span',
      {},
      source === 'fallback'
        ? 'Live search with Google Maps didn’t work this time, so these are demo places, made up for trying Veto.'
        : 'These are demo places, made up for trying Veto. Live search with Google Maps isn’t switched on yet.',
    ),
  );
}
