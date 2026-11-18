import { uid } from '../../../data/firebase';
import { myRooms } from '../../../data/my-rooms';
import { myDecision } from '../../../data/notes';
import {
  getCandidates,
  isMember,
  tryReveal,
  watchMembers,
  watchRoom,
  type CandidateDoc,
  type Member,
  type Room,
} from '../../../data/rooms';
import { linkButton, skeleton } from '../../../ui/components';
import { h } from '../../../ui/dom';
import { icon } from '../../../ui/icons';
import type { ScreenContext } from '../../router';
import type { RoomCtx } from './context';
import { joinCard } from './join';
import { lobby } from './lobby';
import { results } from './results';
import { voting } from './voting';

/**
 * A room moves lobby → voting → results. This controller owns the Firestore subscriptions and
 * picks the view for the current phase; each phase lives in its own module.
 */
export async function roomScreen({ root, params, onCleanup }: ScreenContext): Promise<void> {
  const id = params.roomId;
  let room: Room | null | undefined; // undefined until the first snapshot arrives
  let members: Member[] = [];
  let candidates: CandidateDoc | null = null;
  const view = h('div');
  root.append(view);
  view.append(h('div', { class: 'stack', 'aria-busy': 'true' }, skeleton(1), skeleton(4)));

  let member = await isMember(id);

  const subscribeMembers = () =>
    onCleanup(
      watchMembers(id, (m) => {
        members = m;
        render();
      }),
    );

  onCleanup(
    watchRoom(id, async (r) => {
      room = r;
      if (r && r.status !== 'lobby' && !candidates && member) candidates = await getCandidates(id);
      if (r?.status === 'voting' && r.submitted === r.expected && member) await tryReveal(id);
      render();
    }),
  );
  if (member) subscribeMembers();

  function render(): void {
    if (room === undefined) return;
    if (room === null) {
      view.replaceChildren(
        h(
          'div',
          { class: 'state-screen' },
          h('h1', {}, 'This room doesn’t exist'),
          h(
            'p',
            { class: 'muted' },
            'The link may be mistyped or the room may have been removed. Check it with whoever sent it.',
          ),
          linkButton('Plan something new', '/app', { variant: 'primary' }),
        ),
      );
      return;
    }
    const ctx: RoomCtx = {
      id,
      room,
      members,
      candidates,
      rerender: render,
      joined: () => {
        member = true;
        subscribeMembers();
        render();
      },
    };
    if (member) {
      myRooms.remember({
        id,
        title: room.spec.title,
        when: room.spec.when,
        status: room.status,
        voted: myDecision.get(id).voted,
        host: room.hostUid === uid(),
      });
    }
    const phase = !member
      ? joinCard(ctx)
      : room.status === 'lobby'
        ? lobby(ctx)
        : room.status === 'voting'
          ? voting(ctx)
          : results(ctx);
    view.replaceChildren(
      roomHead(room),
      h('div', { class: 'split' }, h('section', {}, phase), member ? roomAside(ctx) : h('aside')),
    );
  }
}

function roomHead(room: Room): HTMLElement {
  const meta = [room.spec.when, room.spec.area, room.spec.vibe].filter(Boolean).join(' · ');
  const phase = { lobby: 'Gathering people', voting: 'Deciding', results: 'Decided' }[room.status];
  return h(
    'header',
    { class: 'page-head' },
    h('p', { class: 'eyebrow' }, phase),
    h('h1', {}, room.spec.title || 'Untitled plan'),
    meta ? h('p', { class: 'lede' }, meta) : null,
  );
}

/** Who's here and how far along the room is. Counts only, never who voted what. */
function roomAside({ room, members }: RoomCtx): HTMLElement {
  const me = uid();
  const progress =
    room.status === 'lobby' ? `${members.length} joined` : `${room.submitted} of ${room.expected} decided`;
  return h(
    'aside',
    { class: 'stack small', style: '--stack: var(--s-4)' },
    h('div', { class: 'cluster', style: '--cluster: var(--s-2)' }, icon('users'), h('strong', {}, progress)),
    room.status !== 'results' && room.expected > 0
      ? h(
          'div',
          {
            role: 'progressbar',
            'aria-valuemin': 0,
            'aria-valuemax': room.expected,
            'aria-valuenow': room.submitted,
            style: 'height: 4px; border-radius: 999px; background: var(--sunken); overflow: hidden',
          },
          h('div', {
            style: `height: 100%; width: ${(100 * room.submitted) / room.expected}%; background: var(--good); transition: width var(--dur-3) var(--ease-out)`,
          }),
        )
      : null,
    h(
      'ul',
      { class: 'stack', style: '--stack: var(--s-2); margin: 0; padding: 0; list-style: none' },
      ...members.map((m) =>
        h(
          'li',
          { class: 'spread' },
          h('span', {}, m.name || 'Someone', m.uid === me ? h('span', { class: 'muted' }, ' (you)') : null),
          h(
            'span',
            { class: 'muted', title: m.mode === 'ai' ? 'Decides with private AI' : 'Votes by hand' },
            m.mode === 'ai' ? 'Private AI' : 'By hand',
          ),
        ),
      ),
    ),
  );
}
