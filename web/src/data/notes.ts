// Private note and profile storage. These live in this browser's localStorage only.
// Nothing in this file talks to the network, and nothing else should copy these values out.

import type { Choice } from '../domain/tally';
import type { HardResult } from '../domain/matcher';
import { emptyProfile, type PrivateProfile } from '../domain/attrs';

const NOTE = 'veto.private.note';
const PROFILE = 'veto.private.profile';
const NAME = 'veto.name';

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null): void {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked; the app still works for this session */
  }
}

export const privateNote = {
  get: () => get(NOTE) ?? '',
  set: (v: string) => set(NOTE, v),
};

export const privateProfile = {
  get: (): PrivateProfile | null => {
    const raw = get(PROFILE);
    if (!raw) return null;
    try {
      return { ...emptyProfile(), ...(JSON.parse(raw) as PrivateProfile) };
    } catch {
      return null;
    }
  },
  set: (p: PrivateProfile | null) => set(PROFILE, p ? JSON.stringify(p) : null),
};

export const displayName = {
  get: () => get(NAME) ?? '',
  set: (v: string) => set(NAME, v.slice(0, 40)),
};

/** Per-room private state: whether I voted, and my private reasons. Never uploaded. */
export interface MyDecision {
  voted: boolean;
  choices?: Choice[];
  details?: Record<number, HardResult & { score?: number }>;
}

export const myDecision = {
  get: (roomId: string): MyDecision => {
    try {
      return JSON.parse(get(`veto.room.${roomId}`) ?? '{"voted":false}') as MyDecision;
    } catch {
      return { voted: false };
    }
  },
  set: (roomId: string, d: MyDecision) => set(`veto.room.${roomId}`, JSON.stringify(d)),
};
