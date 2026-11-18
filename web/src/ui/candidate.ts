import type { Source } from '../ai/features';
import type { Candidate } from '../domain/attrs';
import { h, type Child } from './dom';

/** Where an AI answer came from, as reported by the SDK's `inferenceSource`. */
export const sourceBadge = (s: Source) =>
  h('span', { class: `badge ${s}` }, s === 'on_device' ? '🔒 on this device' : '☁️ cloud');

/** One option: name, area, price band, evidence and an optional Maps link, plus a slot on the right. */
export function candidateRow(c: Candidate, extra?: Child) {
  return h(
    'div',
    { class: 'cand' },
    h(
      'div',
      {},
      h('strong', {}, c.name),
      ' ',
      h('span', { class: 'muted' }, `${c.area} · ${'$'.repeat(c.priceBand)}`),
      h('p', { class: 'muted small' }, c.evidence),
      c.mapsUri && h('a', { href: c.mapsUri, target: '_blank', rel: 'noopener' }, 'Open in Google Maps'),
    ),
    extra,
  );
}
