import { clearLedger, entries, onLedgerChange, type LedgerEntry } from '../../data/ledger';
import { h } from '../../ui/dom';
import type { ScreenContext } from '../router';

const icon: Record<LedgerEntry['kind'], string> = {
  'device-ai': '🔒',
  'cloud-ai': '☁️',
  firestore: '🗄️',
  local: '📦',
  blocked: '⛔',
};

/** "What left my device": every AI call and database write this browser made. */
export function privacyScreen({ root, onCleanup }: ScreenContext): void {
  const list = h('div');
  const render = () =>
    list.replaceChildren(
      ...entries().map((e) =>
        h(
          'div',
          { class: `row ${e.kind}` },
          h('span', {}, icon[e.kind]),
          h('strong', {}, e.feature),
          h('span', {}, e.detail),
          h('time', { class: 'muted' }, new Date(e.at).toLocaleTimeString()),
        ),
      ),
    );
  render();
  onCleanup(onLedgerChange(render));
  root.append(
    h(
      'section',
      {},
      h('h2', {}, 'What left my device'),
      h(
        'p',
        { class: 'muted' },
        'Every AI call and database write this browser made. Your private note never appears here because it never leaves.',
      ),
      h('button', { onclick: clearLedger }, 'Clear'),
      list,
    ),
  );
}
