// Pure tally logic shared by the web app and the security-rules tests.
// Keep this file free of imports so both can use it.

export const SLOTS = 10;

/** One member's private decision about one candidate. Only its effect on counters leaves the device. */
export type Choice = { i: number; veto: true } | { i: number; veto: false; score: 0 | 1 | 2 | 3 };

export type TallyDoc = Record<string, number>;

export function zeroTally(): TallyDoc {
  const t: TallyDoc = { submitted: 0 };
  for (let i = 0; i < SLOTS; i++) {
    t[`v${i}`] = 0;
    t[`s${i}`] = 0;
  }
  return t;
}

/**
 * Turns a ballot into per-field increments. Every slot appears so the write
 * looks the same shape no matter what was chosen; slots without a choice get +0.
 */
export function ballotIncrements(choices: Choice[]): TallyDoc {
  const inc: TallyDoc = { submitted: 1 };
  for (let i = 0; i < SLOTS; i++) {
    inc[`v${i}`] = 0;
    inc[`s${i}`] = 0;
  }
  const seen = new Set<number>();
  for (const c of choices) {
    if (!Number.isInteger(c.i) || c.i < 0 || c.i >= SLOTS) throw new Error(`bad slot ${c.i}`);
    if (seen.has(c.i)) throw new Error(`duplicate slot ${c.i}`);
    seen.add(c.i);
    if (c.veto) inc[`v${c.i}`] = 1;
    else inc[`s${c.i}`] = c.score;
  }
  return inc;
}

export interface Ranking {
  /** Index of the best candidate nobody vetoed, or null if every candidate was vetoed. */
  winner: number | null;
  /** Non-vetoed candidates, best first. */
  order: number[];
  /** How many of the real candidates someone could not do. Never says who, or how many people. */
  ruledOut: number;
}

/** Ranks the first `count` slots: drop anything vetoed, then highest total score, then list order. */
export function rank(tally: TallyDoc, count: number): Ranking {
  const open: number[] = [];
  for (let i = 0; i < Math.min(count, SLOTS); i++) {
    if ((tally[`v${i}`] ?? 0) === 0) open.push(i);
  }
  open.sort((a, b) => (tally[`s${b}`] ?? 0) - (tally[`s${a}`] ?? 0) || a - b);
  return { winner: open[0] ?? null, order: open, ruledOut: Math.min(count, SLOTS) - open.length };
}
