import { findCandidates } from '../../../ai/features';
import { uid } from '../../../data/firebase';
import { startVoting } from '../../../data/rooms';
import { busy, button, notice, steps, toast } from '../../../ui/components';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** Before voting: the invite link, and the host's start button. */
export function lobby({ id, room, members }: RoomCtx): HTMLElement {
  const isHost = room.hostUid === uid();
  const invite = `${location.origin}/r/${id}`;
  const status = h('div', { class: 'stack' });

  const copy = button('Copy link', {
    icon: 'copy',
    onClick: async () => {
      try {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
          await navigator.share({ title: room.spec.title, text: 'Help pick a place:', url: invite });
        } else {
          await navigator.clipboard.writeText(invite);
          toast('Link copied');
        }
      } catch {
        /* share sheet dismissed */
      }
    },
  });

  const start = button('Find options and start the vote', {
    variant: 'primary',
    iconAfter: 'arrowRight',
    onClick: () =>
      void busy(start, 'Starting…', async () => {
        const progress = steps([
          'Finding options from the public details only',
          'Sharing them with the room',
          'Opening the vote',
        ]);
        status.replaceChildren(progress.el);
        try {
          progress.at(0);
          const found = await findCandidates(room.spec);
          progress.at(1);
          await startVoting(id, found);
          progress.at(2);
        } catch {
          status.replaceChildren(
            notice('error', 'The vote didn’t start.', 'Finding options failed. Try again in a moment.'),
          );
        }
      }),
  });

  return h(
    'div',
    { class: 'stack', style: '--stack: var(--s-6)' },
    h(
      'div',
      { class: 'panel stack' },
      h('h2', { style: 'font-size: var(--text-lg)' }, 'Invite the group'),
      h('p', { class: 'small muted' }, 'Anyone with this link can join until the vote starts.'),
      h(
        'div',
        { class: 'cluster' },
        h('code', { style: 'overflow-wrap: anywhere; flex: 1 1 14rem' }, invite),
        copy,
      ),
    ),
    isHost
      ? h(
          'div',
          { class: 'stack' },
          h('div', {}, start),
          members.length < 2
            ? h(
                'p',
                { class: 'small muted' },
                'Only you so far. Share the link first: people can’t join once the vote starts.',
              )
            : h(
                'p',
                { class: 'small muted' },
                'Everyone who has joined will vote. People can’t join after this.',
              ),
          status,
        )
      : notice('info', 'Waiting for the host to start the vote.', 'This page updates on its own.'),
  );
}
