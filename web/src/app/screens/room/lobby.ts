import { findCandidates } from '../../../ai/features';
import { uid } from '../../../data/firebase';
import { startVoting } from '../../../data/rooms';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** Before voting: the invite link, who's here, and the host's start button. */
export function lobby({ id, room, members }: RoomCtx): HTMLElement {
  const isHost = room.hostUid === uid();
  const status = h('p', { class: 'muted' });
  const invite = `${location.origin}/r/${id}`;
  return h(
    'div',
    { class: 'card' },
    h('p', {}, 'Invite link: ', h('code', {}, invite)),
    h('button', { onclick: () => void navigator.clipboard.writeText(invite) }, 'Copy link'),
    h('h3', {}, `${members.length} here`),
    h('ul', {}, ...members.map((m) => h('li', {}, m.name, m.mode === 'ai' ? ' 🔒' : ' ✋'))),
    isHost
      ? h(
          'button',
          {
            class: 'primary',
            onclick: async () => {
              status.textContent = 'Finding options from the public details only…';
              try {
                const found = await findCandidates(room.spec);
                await startVoting(id, found);
              } catch (e) {
                status.textContent = `Couldn't start: ${(e as Error).message}`;
              }
            },
          },
          'Find options & start voting',
        )
      : h('p', { class: 'muted' }, 'Waiting for the host to start.'),
    status,
  );
}
