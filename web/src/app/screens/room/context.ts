import type { CandidateDoc, Member, Room } from '../../../data/rooms';

/** What every phase of the room view can read, and how it asks the controller for changes. */
export interface RoomCtx {
  id: string;
  room: Room;
  members: Member[];
  candidates: CandidateDoc | null;
  /** Redraw the room from the latest state. */
  rerender(): void;
  /** Called once this browser has joined, so the controller subscribes to members. */
  joined(): void;
}
