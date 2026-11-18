// "What left my device": a local log of every AI call and every database write this device made.
// It lives in this browser only. It exists so people (and judges) can see the privacy promise hold.

export type LedgerKind = 'device-ai' | 'cloud-ai' | 'firestore' | 'local' | 'blocked';

export interface LedgerEntry {
  at: number;
  kind: LedgerKind;
  feature: string;
  /** Plain-language description of what was sent, or that nothing was. */
  detail: string;
}

const KEY = 'veto.ledger.v1';
const MAX = 200;

export function record(e: Omit<LedgerEntry, 'at'>): void {
  const all = entries();
  all.unshift({ ...e, at: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX)));
  } catch {
    // Storage blocked (private window etc.). The ledger is a convenience; never fail the action.
  }
  listeners.forEach((fn) => fn());
}

export function entries(): LedgerEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LedgerEntry[];
  } catch {
    return [];
  }
}

export function clearLedger(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

const listeners = new Set<() => void>();
export function onLedgerChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
