import { explainWinner } from '../../../ai/features';
import { myDecision } from '../../../data/notes';
import { getCandidates, readTally } from '../../../data/rooms';
import { rank } from '../../../domain/tally';
import { mapsLink, optionItem, optionList, placesNote } from '../../../ui/candidate';
import { button, linkButton, notice, skeleton, sourceTag } from '../../../ui/components';
import { h } from '../../../ui/dom';
import { icon } from '../../../ui/icons';
import type { RoomCtx } from './context';
import { reportError } from '../../report';

/** After everyone has voted: the winner, why it works, and the other options that work. */
export function results(ctx: RoomCtx): HTMLElement {
  const { id, room, candidates } = ctx;
  const box = h('div', { 'aria-busy': 'true' }, h('div', { class: 'panel' }, skeleton(4)));
  void (async () => {
    let tally;
    try {
      tally = await readTally(id);
    } catch (e) {
      reportError(e);
      box.replaceChildren(
        notice(
          'error',
          'Couldn’t load the results yet.',
          'Everyone has voted; the count just didn’t arrive.',
        ),
        h(
          'div',
          { style: 'margin-top: var(--s-4)' },
          button('Try again', { icon: 'refresh', onClick: () => ctx.rerender() }),
        ),
      );
      return;
    }
    const list = candidates ?? (await getCandidates(id));
    const items = list?.items ?? [];
    const source = list?.source;
    const rk = rank(tally, items.length);
    box.removeAttribute('aria-busy');
    const ruledOut = h(
      'p',
      { class: 'small muted' },
      `${rk.ruledOut} option${rk.ruledOut === 1 ? '' : 's'} didn’t work for someone. Nobody had to explain.`,
    );

    if (rk.winner == null) {
      box.replaceChildren(
        h(
          'div',
          { class: 'panel stack enter' },
          h('p', { class: 'eyebrow' }, 'No match this time'),
          h('h2', {}, 'Nothing on this list works for everyone'),
          h(
            'p',
            { class: 'muted' },
            'That’s useful to know, and nobody had to say why. Start a new room with a different area or vibe.',
          ),
          h(
            'div',
            {},
            linkButton('Plan another round', '/app', { variant: 'primary', iconAfter: 'arrowRight' }),
          ),
        ),
      );
      return;
    }

    const win = items[rk.winner];
    const mine = myDecision.get(id).details?.[win.i];
    const why = h('div', { class: 'stack', style: '--stack: var(--s-2)' }, skeleton(2));
    const others = rk.order.slice(1);
    box.replaceChildren(
      h(
        'div',
        { class: 'stack', style: '--stack: var(--s-6)' },
        h(
          'div',
          { class: 'panel stack enter', style: '--stack: var(--s-4)' },
          h(
            'p',
            {
              class: 'eyebrow',
              style: 'color: var(--good); display: flex; gap: var(--s-2); align-items: center',
            },
            icon('check'),
            'Works for everyone',
          ),
          h('h2', { style: 'font-size: var(--text-2xl)' }, win.name),
          h('p', { class: 'muted' }, [win.area, '$'.repeat(win.priceBand)].filter(Boolean).join(' · ')),
          win.mapsUri ? mapsLink(win.mapsUri) : null,
          why,
          mine?.confirm.length
            ? notice(
                'info',
                'Just for you',
                `You might want to check ${mine.confirm.join(', ')} before you go.`,
              )
            : null,
          ruledOut,
        ),
        others.length
          ? h(
              'details',
              { class: 'stack' },
              h(
                'summary',
                { style: 'cursor: pointer; font-weight: 650' },
                `${others.length} other options that work`,
              ),
              optionList(...others.map((i) => optionItem(items[i]))),
            )
          : null,
        placesNote(source),
      ),
    );
    try {
      const ex = await explainWinner(win, room.spec);
      why.replaceChildren(h('p', {}, ex.text), h('div', {}, sourceTag(ex.source)));
    } catch (e) {
      reportError(e);
      why.replaceChildren(h('p', { class: 'muted' }, win.evidence));
    }
  })();
  return box;
}
