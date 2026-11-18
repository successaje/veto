import type { Candidate } from '../domain/attrs';
import { h, type Child } from './dom';

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
      c.mapsUri
        ? h(
            'a',
            { class: 'small muted', href: c.mapsUri, target: '_blank', rel: 'noopener' },
            'Open in Google Maps',
          )
        : null,
    ),
    extra,
  );
}

export function optionList(...items: HTMLLIElement[]): HTMLUListElement {
  return h('ul', { class: 'options' }, ...items);
}
