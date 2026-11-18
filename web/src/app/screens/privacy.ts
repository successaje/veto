import { clearLedger, entries, onLedgerChange, type LedgerEntry } from '../../data/ledger';
import { button, emptyState, linkButton, pageHead } from '../../ui/components';
import { h } from '../../ui/dom';
import { icon, type IconName } from '../../ui/icons';
import type { ScreenContext } from '../router';

const KIND: Record<LedgerEntry['kind'], { icon: IconName; label: string; tone: string }> = {
  'device-ai': { icon: 'lock', label: 'On this device', tone: 'var(--good)' },
  'cloud-ai': { icon: 'cloud', label: 'Sent to the cloud', tone: 'var(--cloud)' },
  firestore: { icon: 'database', label: 'Saved to the room', tone: 'var(--ink-2)' },
  local: { icon: 'device', label: 'Stayed local', tone: 'var(--ink-2)' },
  blocked: { icon: 'ban', label: 'Blocked', tone: 'var(--accent)' },
};

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** "What left this device": every AI call and database write this browser made. */
export function privacyScreen({ root, onCleanup }: ScreenContext): void {
  const list = h('div');
  const render = () => {
    const all = entries();
    if (!all.length) {
      list.replaceChildren(
        emptyState(
          'Nothing has left this device yet',
          'When you set up a room, decide, or vote, each step is listed here: what was sent, where, and how much.',
          linkButton('Plan something', '/app', { iconAfter: 'arrowRight' }),
        ),
      );
      return;
    }
    list.replaceChildren(
      h(
        'ol',
        { class: 'options', style: 'list-style: none' },
        ...all.map((e) => {
          const k = KIND[e.kind];
          return h(
            'li',
            { class: 'option', style: 'grid-template-columns: auto 1fr; align-items: start' },
            h('span', { style: `color: ${k.tone}; padding-top: 0.15rem` }, icon(k.icon)),
            h(
              'div',
              { class: 'stack', style: '--stack: var(--s-1)' },
              h(
                'div',
                { class: 'option-head' },
                h('span', { style: 'font-weight: 650' }, e.feature),
                h('span', { class: 'option-meta' }, `${k.label} · ${time.format(e.at)}`),
              ),
              h('p', { class: 'option-evidence' }, e.detail),
            ),
          );
        }),
      ),
    );
  };
  render();
  onCleanup(onLedgerChange(render));

  root.append(
    pageHead(
      'Privacy',
      'What left this device',
      'Every AI call and every database write this browser made, newest first. Your private note never appears here, because it never leaves.',
    ),
    h(
      'div',
      { class: 'split' },
      h('section', {}, list),
      h(
        'aside',
        { class: 'stack small', style: '--stack: var(--s-4)' },
        h('p', { class: 'eyebrow' }, 'Who sees what'),
        h(
          'dl',
          { class: 'stack', style: '--stack: var(--s-3); margin: 0' },
          ...(
            [
              ['The cloud', 'The room’s public details, to find options and write a summary.'],
              ['The room', 'Your display name, and +1s on anonymous counters when you vote.'],
              ['Nobody', 'Your note, your limits, and which options you ruled out.'],
            ] as const
          ).map(([who, what]) =>
            h(
              'div',
              {},
              h('dt', { style: 'font-weight: 650' }, who),
              h('dd', { class: 'muted', style: 'margin: 0' }, what),
            ),
          ),
        ),
        h('hr', { class: 'divider' }),
        button('Clear this list', { variant: 'ghost', size: 'sm', icon: 'trash', onClick: clearLedger }),
      ),
    ),
  );
}
