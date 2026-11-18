import { explainWinner } from '../../../ai/features';
import { myDecision } from '../../../data/notes';
import { getCandidates, readTally } from '../../../data/rooms';
import { rank } from '../../../domain/tally';
import { candidateRow, sourceBadge } from '../../../ui/candidate';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** After everyone has voted: the winner, why it works, and the other options that work. */
export function results(ctx: RoomCtx): HTMLElement {
  const { id, room, candidates } = ctx;
  const box = h('div', { class: 'card' }, h('p', {}, 'Counting…'));
  void (async () => {
    let tally;
    try {
      tally = await readTally(id);
    } catch {
      box.replaceChildren(
        h('p', { class: 'err' }, "Couldn't load the results yet."),
        h('button', { onclick: () => ctx.rerender() }, 'Try again'),
      );
      return;
    }
    const items = candidates?.items ?? (await getCandidates(id))?.items ?? [];
    const rk = rank(tally, items.length);
    if (rk.winner == null) {
      box.replaceChildren(
        h('h3', {}, 'Nothing on this list works for everyone.'),
        h(
          'p',
          { class: 'muted' },
          'Nobody has to say why. The host can start a new room with different options.',
        ),
      );
      return;
    }
    const win = items[rk.winner];
    const mine = myDecision.get(id).details?.[win.i];
    const why = h('p', { class: 'muted' }, 'Writing a short summary…');
    box.replaceChildren(
      h(
        'div',
        {},
        h('h3', {}, '✨ Works for everyone'),
        candidateRow(win),
        why,
        mine?.confirm.length
          ? h('p', { class: 'small' }, `Just for you: you might want to check ${mine.confirm.join(', ')}.`)
          : null,
        h(
          'p',
          { class: 'muted small' },
          `${rk.ruledOut} option${rk.ruledOut === 1 ? '' : 's'} didn't work for someone. Nobody had to explain.`,
        ),
        rk.order.length > 1 &&
          h(
            'details',
            {},
            h('summary', {}, 'Other options that work'),
            ...rk.order.slice(1).map((i) => candidateRow(items[i])),
          ),
      ),
    );
    try {
      const ex = await explainWinner(win, room.spec);
      why.replaceChildren(ex.text, ' ', sourceBadge(ex.source));
    } catch {
      why.textContent = '';
    }
  })();
  return box;
}
