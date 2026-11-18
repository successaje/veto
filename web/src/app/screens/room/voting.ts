import { decidePrivately } from '../../../ai/features';
import { myDecision, privateProfile } from '../../../data/notes';
import { submitBallot } from '../../../data/rooms';
import type { Candidate, PrivateProfile } from '../../../domain/attrs';
import type { Choice } from '../../../domain/tally';
import { candidateRow } from '../../../ui/candidate';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** While voting: decide with the private profile on this device, or by hand. */
export function voting(ctx: RoomCtx): HTMLElement {
  const { id, room, candidates } = ctx;
  const items = candidates?.items ?? [];
  const mine = myDecision.get(id);
  const wrap = h(
    'div',
    { class: 'card' },
    h('p', { class: 'muted' }, `${room.submitted} of ${room.expected} have decided.`),
  );
  if (mine.voted) {
    wrap.append(h('p', {}, '✅ Your anonymous vote is in. Your reasons stayed on this device.'));
    return wrap;
  }
  const profile = privateProfile.get();
  wrap.append(profile ? decideWithProfile(ctx, profile, items) : decideByHand(ctx, items));
  if (candidates?.attributions?.length) {
    wrap.append(
      h(
        'p',
        { class: 'small muted' },
        'Sources: ',
        ...candidates.attributions.map((a) =>
          h('a', { href: a.uri, target: '_blank', rel: 'noopener' }, `${a.title} `),
        ),
        '(Google Maps)',
      ),
    );
  }
  return wrap;
}

function decideWithProfile(ctx: RoomCtx, profile: PrivateProfile, items: Candidate[]): HTMLElement {
  const out = h('div', {}, ...items.map((c) => candidateRow(c)));
  const btn = h(
    'button',
    {
      class: 'primary',
      onclick: async () => {
        btn.disabled = true;
        btn.textContent = 'Thinking privately on this device…';
        const d = await decidePrivately(profile, items);
        out.replaceChildren(
          h('p', { class: 'muted' }, 'Only you can see this. The group only gets anonymous counts.'),
          ...items.map((c) => {
            const det = d.details[c.i];
            return candidateRow(
              c,
              det.veto
                ? h('span', { class: 'veto' }, `✗ ${det.reasons.join(', ')}`)
                : h(
                    'span',
                    { class: 'ok' },
                    `✓ ${'★'.repeat(det.score ?? 0) || 'ok'}`,
                    det.confirm.length
                      ? h('span', { class: 'small muted' }, ` · check: ${det.confirm.join(', ')}`)
                      : null,
                  ),
            );
          }),
          h(
            'button',
            {
              class: 'primary',
              onclick: async () => {
                await submitBallot(ctx.id, d.choices);
                myDecision.set(ctx.id, { voted: true, choices: d.choices, details: d.details });
                ctx.rerender();
              },
            },
            'Send my anonymous vote',
          ),
        );
      },
    },
    'Decide privately on this device',
  );
  return h('div', {}, btn, out);
}

function decideByHand(ctx: RoomCtx, items: Candidate[]): HTMLElement {
  const picks = new Map<number, Choice>();
  const send = h('button', { class: 'primary', disabled: true }, 'Send my anonymous vote');
  send.addEventListener('click', async () => {
    const choices = [...picks.values()];
    await submitBallot(ctx.id, choices);
    myDecision.set(ctx.id, { voted: true, choices });
    ctx.rerender();
  });
  const options: [string, Choice['veto'], 0 | 1 | 2 | 3][] = [
    ["Can't do it", true, 0],
    ['Meh', false, 1],
    ['Good', false, 2],
    ['Love it', false, 3],
  ];
  return h(
    'div',
    {},
    ...items.map((c) => {
      const buttons = options.map(([label, veto, score]) =>
        h(
          'button',
          {
            class: 'chip',
            onclick: (ev: Event) => {
              picks.set(c.i, veto ? { i: c.i, veto: true } : { i: c.i, veto: false, score });
              (ev.target as HTMLElement).parentElement
                ?.querySelectorAll('.chip')
                .forEach((b) => b.classList.remove('on'));
              (ev.target as HTMLElement).classList.add('on');
              send.disabled = picks.size < items.length;
            },
          },
          label,
        ),
      );
      return candidateRow(c, h('div', { class: 'chips' }, ...buttons));
    }),
    send,
  );
}
