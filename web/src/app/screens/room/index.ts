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
import { h } from '../../../ui/dom';
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
  let room: Room | null = null;
  let members: Member[] = [];
  let candidates: CandidateDoc | null = null;
  let member = await isMember(id);
  const view = h('div');
  root.append(view);

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
    if (!room) {
      view.replaceChildren(h('p', {}, 'Room not found.'));
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
    const header = h(
      'div',
      { class: 'card' },
      h('h2', {}, room.spec.title),
      h('p', {}, `${room.spec.when} · ${room.spec.area} · ${room.spec.vibe}`),
    );
    if (!member) view.replaceChildren(header, joinCard(ctx));
    else if (room.status === 'lobby') view.replaceChildren(header, lobby(ctx));
    else if (room.status === 'voting') view.replaceChildren(header, voting(ctx));
    else view.replaceChildren(header, results(ctx));
  }
}
