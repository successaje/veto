// Security-rules tests for Veto's privacy guarantees.
// Run with:  cd firebase && npm install && npm run test:rules
// (needs Java 21+ for the Firestore emulator)

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { ballotIncrements, rank, zeroTally, type Choice } from '../../web/src/tally';

const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const RID = 'r1';

let env: RulesTestEnvironment;
const db = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-veto', firestore: { rules: RULES } });
});
afterAll(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

function createRoom(host = 'alice') {
  const d = db(host);
  const b = writeBatch(d);
  b.set(doc(d, 'rooms', RID), {
    hostUid: host,
    spec: { title: 'Dinner' },
    status: 'lobby',
    memberCount: 0,
    expected: 0,
    submitted: 0,
    attrVersion: 1,
    createdAt: serverTimestamp(),
  });
  b.set(doc(d, 'rooms', RID, 'tally', 'main'), zeroTally());
  return b.commit();
}

function join(uid: string) {
  const d = db(uid);
  const b = writeBatch(d);
  b.set(doc(d, 'rooms', RID, 'members', uid), {
    name: uid,
    platform: 'web',
    mode: 'ai',
    joinedAt: serverTimestamp(),
  });
  b.update(doc(d, 'rooms', RID), { memberCount: increment(1) });
  return b.commit();
}

function startVoting(expected: number, host = 'alice') {
  const d = db(host);
  const b = writeBatch(d);
  b.set(doc(d, 'rooms', RID, 'public', 'candidates'), {
    items: [
      { i: 0, name: 'A' },
      { i: 1, name: 'B' },
      { i: 2, name: 'C' },
    ],
    source: 'fixture',
    createdAt: serverTimestamp(),
  });
  b.update(doc(d, 'rooms', RID), { status: 'voting', expected });
  return b.commit();
}

function vote(uid: string, choices: Choice[]) {
  return voteRaw(uid, ballotIncrements(choices));
}

function voteRaw(uid: string, inc: Record<string, number>) {
  const d = db(uid);
  const b = writeBatch(d);
  b.set(doc(d, 'rooms', RID, 'ballots', uid), { at: serverTimestamp() });
  b.update(
    doc(d, 'rooms', RID, 'tally', 'main'),
    Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, increment(v)])),
  );
  b.update(doc(d, 'rooms', RID), { submitted: increment(1) });
  return b.commit();
}

const reveal = (uid: string) => updateDoc(doc(db(uid), 'rooms', RID), { status: 'results' });

/** alice hosts; alice, bob and carol join; voting opens with 3 expected. */
async function roomInVoting() {
  await assertSucceeds(createRoom());
  for (const u of ['alice', 'bob', 'carol']) await assertSucceeds(join(u));
  await assertSucceeds(startVoting(3));
}

describe('joining', () => {
  it('lets people join a lobby once', async () => {
    await assertSucceeds(createRoom());
    await assertSucceeds(join('bob'));
    await assertFails(join('bob'));
  });

  it('blocks joining after voting starts', async () => {
    await roomInVoting();
    await assertFails(join('dave'));
  });
});

describe('starting a vote', () => {
  it('only the host can start, and expected must equal the member count', async () => {
    await assertSucceeds(createRoom());
    await assertSucceeds(join('alice'));
    await assertSucceeds(join('bob'));
    await assertFails(startVoting(2, 'bob'));
    await assertFails(startVoting(1));
    await assertSucceeds(startVoting(2));
  });

  it('hides candidates from people who are not in the room', async () => {
    await roomInVoting();
    await assertFails(getDoc(doc(db('mallory'), 'rooms', RID, 'public', 'candidates')));
    await assertSucceeds(getDoc(doc(db('bob'), 'rooms', RID, 'public', 'candidates')));
  });
});

describe('voting', () => {
  it('accepts one ballot per member', async () => {
    await roomInVoting();
    await assertSucceeds(
      vote('bob', [
        { i: 0, veto: true },
        { i: 1, veto: false, score: 2 },
      ]),
    );
    await assertFails(vote('bob', [{ i: 2, veto: false, score: 3 }]));
  });

  it('rejects ballots from outsiders', async () => {
    await roomInVoting();
    await assertFails(vote('mallory', [{ i: 0, veto: true }]));
  });

  it('rejects a double veto on one candidate', async () => {
    await roomInVoting();
    const inc = ballotIncrements([]);
    inc.v0 = 2;
    await assertFails(voteRaw('bob', inc));
  });

  it('rejects a veto and a score on the same candidate', async () => {
    await roomInVoting();
    const inc = ballotIncrements([]);
    inc.v0 = 1;
    inc.s0 = 1;
    await assertFails(voteRaw('bob', inc));
  });

  it('rejects scores above 3', async () => {
    await roomInVoting();
    const inc = ballotIncrements([]);
    inc.s1 = 4;
    await assertFails(voteRaw('bob', inc));
  });

  it('never lets anyone read a ballot back', async () => {
    await roomInVoting();
    await assertSucceeds(vote('bob', [{ i: 0, veto: true }]));
    await assertFails(getDoc(doc(db('bob'), 'rooms', RID, 'ballots', 'bob')));
    await assertFails(getDoc(doc(db('alice'), 'rooms', RID, 'ballots', 'bob')));
  });
});

describe('results', () => {
  it('keeps the tally hidden from everyone, host included, until all have voted', async () => {
    await roomInVoting();
    await assertSucceeds(
      vote('alice', [
        { i: 0, veto: true },
        { i: 1, veto: false, score: 1 },
        { i: 2, veto: false, score: 3 },
      ]),
    );
    await assertFails(getDoc(doc(db('alice'), 'rooms', RID, 'tally', 'main')));
    await assertSucceeds(
      vote('bob', [
        { i: 0, veto: false, score: 3 },
        { i: 1, veto: false, score: 2 },
        { i: 2, veto: false, score: 2 },
      ]),
    );
    await assertFails(reveal('bob'));
    await assertSucceeds(
      vote('carol', [
        { i: 0, veto: false, score: 3 },
        { i: 1, veto: true },
        { i: 2, veto: false, score: 1 },
      ]),
    );
    await assertFails(reveal('mallory'));
    await assertSucceeds(reveal('carol'));

    const snap = await assertSucceeds(getDoc(doc(db('bob'), 'rooms', RID, 'tally', 'main')));
    const tally = snap.data() as Record<string, number>;
    expect(tally.submitted).toBe(3);
    // Candidate 0 and 1 were each vetoed by someone; candidate 2 works for all three.
    expect(rank(tally, 3)).toEqual({ winner: 2, order: [2], ruledOut: 2 });
  });
});
