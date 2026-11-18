import { decidePrivately, type PrivateDecision } from '../../../ai/features';
import { myDecision, privateProfile } from '../../../data/notes';
import { submitBallot } from '../../../data/rooms';
import type { Candidate, PrivateProfile } from '../../../domain/attrs';
import type { Choice } from '../../../domain/tally';
import { optionItem, optionList, placesNote } from '../../../ui/candidate';
import { busy, button, notice, sourceTag, steps } from '../../../ui/components';
import { h } from '../../../ui/dom';
import { icon } from '../../../ui/icons';
import type { RoomCtx } from './context';
import { reportError } from '../../report';

/** While voting: decide with the private profile on this device, or by hand. */
export function voting(ctx: RoomCtx): HTMLElement {
  const { id, candidates } = ctx;
  const items = candidates?.items ?? [];
  if (myDecision.get(id).voted) {
    return h(
      'div',
      { class: 'panel stack enter' },
      h('h2', { style: 'font-size: var(--text-lg)' }, 'Your vote is in'),
      h('p', { class: 'muted' }, 'It was sent as anonymous counts. Your reasons stayed on this device.'),
      h(
        'p',
        { class: 'small muted' },
        `Waiting for ${ctx.room.expected - ctx.room.submitted} more. You can close this page: the result will be here, and under Your rooms on the Veto home.`,
      ),
    );
  }
  const profile = privateProfile.get();
  return h(
    'div',
    { class: 'stack', style: '--stack: var(--s-6)' },
    profile ? decideWithProfile(ctx, profile, items) : decideByHand(ctx, items),
  );
}

const FINAL = 'Once sent, your vote can’t be changed.';

/** Send the ballot with visible stages; resolves once the server has it. Callers handle errors. */
async function send(
  ctx: RoomCtx,
  status: HTMLElement,
  choices: Choice[],
  details?: PrivateDecision['details'],
): Promise<void> {
  const progress = steps(['Turning your answers into anonymous counts', 'Sending them to the room', 'Sent']);
  status.replaceChildren(progress.el);
  progress.at(0);
  if (!navigator.onLine) {
    status.append(
      notice('warn', 'You’re offline.', 'Your vote will send as soon as you reconnect. Keep this page open.'),
    );
  }
  progress.at(1);
  await submitBallot(ctx.id, choices);
  progress.done();
  myDecision.set(ctx.id, { voted: true, choices, details });
  ctx.rerender();
}

function decideWithProfile(ctx: RoomCtx, profile: PrivateProfile, items: Candidate[]): HTMLElement {
  const list = optionList(...items.map((c) => optionItem(c)));
  const status = h('div', { class: 'stack' });
  const panel = h(
    'div',
    { class: 'stack', style: '--stack: var(--s-5)' },
    h(
      'div',
      { class: 'panel stack' },
      h('h2', { style: 'font-size: var(--text-lg)' }, `${items.length} options`),
      h(
        'p',
        { class: 'muted' },
        'Your device checks each one against your private note. You’ll see the result before anything is sent.',
      ),
      status,
    ),
    h('div', { class: 'stack', style: '--stack: var(--s-3)' }, list, placesNote(ctx.candidates?.source)),
  );

  const decide = button('Decide privately on this device', {
    variant: 'primary',
    icon: 'lock',
    onClick: () =>
      void busy(decide, 'Deciding…', async () => {
        const progress = steps(['Checking your hard limits', 'Scoring the rest on this device', 'Done']);
        status.replaceChildren(progress.el);
        progress.at(0);
        try {
          const d = await decidePrivately(profile, items);
          progress.done();
          const out = items.filter((c) => d.details[c.i].veto).length;
          list.replaceChildren(
            ...items.map((c) => {
              const det = d.details[c.i];
              const verdict = det.veto
                ? h('div', { class: 'option-verdict' }, icon('x'), `Not for you: ${det.reasons.join(', ')}`)
                : h(
                    'div',
                    { class: 'option-verdict' },
                    icon('check'),
                    det.confirm.length ? `Works. Worth checking: ${det.confirm.join(', ')}` : 'Works for you',
                  );
              return optionItem(c, verdict, det.veto ? 'out' : 'in');
            }),
          );
          const sending = h('div');
          const sendBtn = button('Send my anonymous vote', {
            variant: 'primary',
            iconAfter: 'arrowRight',
            onClick: () =>
              void busy(sendBtn, 'Sending…', async () => {
                try {
                  await send(ctx, sending, d.choices, d.details);
                } catch (e) {
                  reportError(e);
                  sending.replaceChildren(
                    notice(
                      'error',
                      'Your vote wasn’t sent.',
                      'Nothing changed. Check your connection and try again.',
                    ),
                  );
                }
              }),
          });
          status.replaceChildren(
            notice(
              'good',
              `${items.length - out} of ${items.length} work for you.`,
              h(
                'span',
                {},
                'Only you can see this. The group only gets anonymous counts. ',
                sourceTag('on_device'),
              ),
            ),
            h('div', { class: 'cluster' }, sendBtn, h('span', { class: 'small muted' }, FINAL)),
            sending,
          );
          decide.remove();
        } catch (e) {
          reportError(e);
          status.replaceChildren(
            notice('error', 'Your device couldn’t finish.', 'Nothing was sent. Try again, or vote by hand.'),
          );
        }
      }),
  });
  status.append(h('div', {}, decide));
  return panel;
}

const CHOICES: { label: string; veto: boolean; score: 0 | 1 | 2 | 3 }[] = [
  { label: 'Can’t do it', veto: true, score: 0 },
  { label: 'Fine', veto: false, score: 1 },
  { label: 'Good', veto: false, score: 2 },
  { label: 'Love it', veto: false, score: 3 },
];
const NEUTRAL = 1;

function decideByHand(ctx: RoomCtx, items: Candidate[]): HTMLElement {
  // Every option starts at "Fine", so a member only touches what matters and can send at once.
  const picks = new Map<number, Choice>(items.map((c) => [c.i, { i: c.i, veto: false, score: NEUTRAL }]));
  const sending = h('div');
  const sendBtn = button('Send my anonymous vote', {
    variant: 'primary',
    iconAfter: 'arrowRight',
    onClick: () =>
      void busy(sendBtn, 'Sending…', async () => {
        try {
          await send(ctx, sending, [...picks.values()]);
        } catch (e) {
          reportError(e);
          sending.replaceChildren(
            notice(
              'error',
              'Your vote wasn’t sent.',
              'Nothing changed. Check your connection and try again.',
            ),
          );
        }
      }),
  });
  const summary = h('p', { class: 'small muted', 'aria-live': 'polite' });
  const update = () => {
    const all = [...picks.values()];
    const out = all.filter((p) => p.veto).length;
    const liked = all.filter((p) => !p.veto && p.score >= 2).length;
    summary.textContent =
      out || liked
        ? [out && `${out} ruled out`, liked && `${liked} you like`].filter(Boolean).join(' · ')
        : 'Everything is “Fine” so far. Change only what matters.';
  };
  update();

  return h(
    'div',
    { class: 'stack', style: '--stack: var(--s-5)' },
    h(
      'div',
      { class: 'panel stack' },
      h('h2', { style: 'font-size: var(--text-lg)' }, 'Vote by hand'),
      h(
        'p',
        { class: 'muted' },
        'Nobody sees your answers, only the totals. “Can’t do it” rules an option out for the group without saying who or why.',
      ),
    ),
    optionList(
      ...items.map((c) => {
        const seg = h('div', { class: 'seg', role: 'group', 'aria-label': `Your answer for ${c.name}` });
        for (const ch of CHOICES) {
          seg.append(
            h(
              'button',
              {
                type: 'button',
                'aria-pressed': String(!ch.veto && ch.score === NEUTRAL),
                'data-veto': ch.veto ? '' : null,
                onclick: (ev: Event) => {
                  picks.set(c.i, ch.veto ? { i: c.i, veto: true } : { i: c.i, veto: false, score: ch.score });
                  seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
                  (ev.currentTarget as HTMLElement).setAttribute('aria-pressed', 'true');
                  update();
                },
              },
              ch.label,
            ),
          );
        }
        return optionItem(c, seg);
      }),
    ),
    placesNote(ctx.candidates?.source),
    h(
      'div',
      { class: 'stack', style: '--stack: var(--s-3)' },
      summary,
      h('div', { class: 'cluster' }, sendBtn, h('span', { class: 'small muted' }, FINAL)),
      sending,
    ),
  );
}
