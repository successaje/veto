// "Your rooms": the rooms this browser has joined or started, kept on this device only so a
// returning member sees their next step first. Holds only public room details.

import type { RoomStatus } from './rooms';

export interface RoomSummary {
  id: string;
  title: string;
  when: string;
  status: RoomStatus;
  /** Whether this browser has sent its vote. */
  voted: boolean;
  /** Last time this room was seen, ms since epoch. */
  seenAt: number;
}

export type NextAction = 'start' | 'waiting-start' | 'decide' | 'waiting-others' | 'decided';

const KEY = 'veto.rooms.v1';
const MAX = 20;

/** Insert or update a room, newest first, capped. Pure, for tests. */
export function upsert(list: RoomSummary[], room: RoomSummary): RoomSummary[] {
  return [room, ...list.filter((r) => r.id !== room.id)].slice(0, MAX);
}

/** What this member should do next in a room. Pure, for tests. */
export function nextAction(room: Pick<RoomSummary, 'status' | 'voted'>, isHost: boolean): NextAction {
  if (room.status === 'lobby') return isHost ? 'start' : 'waiting-start';
  if (room.status === 'voting') return room.voted ? 'waiting-others' : 'decide';
  return 'decided';
}

export const NEXT_LABEL: Record<NextAction, string> = {
  start: 'Ready to start',
  'waiting-start': 'Waiting for the host',
  decide: 'Your turn to decide',
  'waiting-others': 'Waiting for others',
  decided: 'Decided',
};

export const myRooms = {
  list(): RoomSummary[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RoomSummary[];
    } catch {
      return [];
    }
  },
  remember(room: Omit<RoomSummary, 'seenAt'>): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(upsert(myRooms.list(), { ...room, seenAt: Date.now() })));
    } catch {
      /* storage blocked: the list is a convenience */
    }
  },
};
