// Firestore operations. Each write shape matches a rule in firebase/firestore.rules.

import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { ATTRS, type Candidate, type RoomSpec } from './attrs';
import { db, uid } from './firebase';
import { record } from './ledger';
import { ballotIncrements, zeroTally, type Choice, type TallyDoc } from './tally';

export type RoomStatus = 'lobby' | 'voting' | 'results';

export interface Room {
  id: string;
  hostUid: string;
  spec: RoomSpec;
  status: RoomStatus;
  memberCount: number;
  expected: number;
  submitted: number;
}

export interface Member {
  uid: string;
  name: string;
  platform: string;
  mode: 'ai' | 'swipe';
}

export interface CandidateDoc {
  items: Candidate[];
  source: 'maps' | 'fixture';
  attributions?: { title: string; uri: string }[];
}

const roomRef = (id: string) => doc(db, 'rooms', id);

export async function createRoom(spec: RoomSpec): Promise<string> {
  const ref = doc(collection(db, 'rooms')); // random, unguessable id = the invite capability
  const b = writeBatch(db);
  b.set(ref, {
    hostUid: uid(),
    spec,
    status: 'lobby',
    memberCount: 0,
    expected: 0,
    submitted: 0,
    attrVersion: ATTRS.version,
    createdAt: serverTimestamp(),
  });
  b.set(doc(db, 'rooms', ref.id, 'tally', 'main'), zeroTally());
  await b.commit();
  record({ kind: 'firestore', feature: 'Create room', detail: 'Saved the public room details.' });
  return ref.id;
}

export async function joinRoom(id: string, name: string, mode: Member['mode']): Promise<void> {
  const me = uid();
  const b = writeBatch(db);
  b.set(doc(db, 'rooms', id, 'members', me), {
    name: name.slice(0, 40) || 'Someone',
    platform: 'web',
    mode,
    joinedAt: serverTimestamp(),
  });
  b.update(roomRef(id), { memberCount: increment(1) });
  await b.commit();
  record({
    kind: 'firestore',
    feature: 'Join room',
    detail: `Saved your display name ("${name}") and that you joined.`,
  });
}

export function watchRoom(id: string, cb: (room: Room | null) => void): Unsubscribe {
  // includeMetadataChanges: the server's confirmation of our own write arrives as its own event.
  return onSnapshot(roomRef(id), { includeMetadataChanges: true }, (s) => {
    // Only act on server-confirmed state. A local, unconfirmed `status: 'results'` would make the
    // client read the tally before the rules allow it.
    if (s.metadata.hasPendingWrites) return;
    cb(s.exists() ? ({ id: s.id, ...s.data() } as Room) : null);
  });
}

export function watchMembers(
  id: string,
  cb: (members: Member[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'rooms', id, 'members'),
    (s) => cb(s.docs.map((d) => ({ uid: d.id, ...d.data() }) as Member)),
    onError,
  );
}

export async function isMember(id: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, 'rooms', id, 'members', uid()))).exists();
  } catch {
    return false;
  }
}

/** Host only: publish the public candidate list and open voting for everyone currently in the room. */
export async function startVoting(id: string, found: CandidateDoc): Promise<void> {
  const snap = await getDoc(roomRef(id));
  const room = snap.data() as Room;
  const b = writeBatch(db);
  b.set(doc(db, 'rooms', id, 'public', 'candidates'), {
    items: found.items,
    source: found.source,
    attributions: found.attributions ?? [],
    createdAt: serverTimestamp(),
  });
  b.update(roomRef(id), { status: 'voting', expected: room.memberCount });
  await b.commit();
  record({
    kind: 'firestore',
    feature: 'Start voting',
    detail: `Saved ${found.items.length} public options.`,
  });
}

export async function getCandidates(id: string): Promise<CandidateDoc | null> {
  const s = await getDoc(doc(db, 'rooms', id, 'public', 'candidates'));
  return s.exists() ? (s.data() as CandidateDoc) : null;
}

/** One anonymous vote: a content-free ballot, counter increments, and submitted + 1. */
export async function submitBallot(id: string, choices: Choice[]): Promise<void> {
  const inc = ballotIncrements(choices);
  const b = writeBatch(db);
  b.set(doc(db, 'rooms', id, 'ballots', uid()), { at: serverTimestamp() });
  b.update(
    doc(db, 'rooms', id, 'tally', 'main'),
    Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, increment(v)])),
  );
  b.update(roomRef(id), { submitted: increment(1) });
  await b.commit();
  const vetoes = choices.filter((c) => c.veto).length;
  record({
    kind: 'firestore',
    feature: 'Vote',
    detail: `Added anonymous counts: ${vetoes} "doesn't work for me", ${choices.length - vetoes} scores. No reasons, no note.`,
  });
}

/** Anyone may flip the room to results once everyone has voted. Losing the race is fine. */
export async function tryReveal(id: string): Promise<void> {
  await updateDoc(roomRef(id), { status: 'results' }).catch(() => undefined);
}

export async function readTally(id: string): Promise<TallyDoc> {
  const s = await getDoc(doc(db, 'rooms', id, 'tally', 'main'));
  return s.data() as TallyDoc;
}
