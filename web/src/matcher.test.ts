import { describe, expect, it } from 'vitest';
import candidatesFile from '../../eval/candidates.sample.json';
import notesFile from '../../eval/notes.sample.json';
import type { Candidate, PrivateProfile } from './attrs';
import { hardCheck, vetoSet } from './matcher';
import { ballotIncrements, rank, zeroTally } from './tally';

const candidates = candidatesFile.items as Candidate[];
const cases = notesFile.cases as { id: string; gold: PrivateProfile; expectedVetoes: number[] }[];

describe('matcher (gold profiles → hard vetoes)', () => {
  for (const c of cases) {
    it(`${c.id}`, () => {
      expect(vetoSet(c.gold, candidates)).toEqual(c.expectedVetoes);
    });
  }

  it('keeps reasons and confirmations private and specific', () => {
    const lena = cases.find((c) => c.id === 'lena-calls-ahead')!.gold;
    const trattoria = hardCheck(lena, candidates[3]);
    expect(trattoria.veto).toBe(false);
    expect(trattoria.confirm).toEqual(['step-free entrance and restroom']);
  });

  for (const g of notesFile.groups) {
    it(`group ${g.id} leaves only places that work for everyone`, () => {
      const vetoed = new Set(
        g.members.flatMap((id) => vetoSet(cases.find((c) => c.id === id)!.gold, candidates)),
      );
      const open = candidates.map((c) => c.i).filter((i) => !vetoed.has(i));
      expect(open).toEqual(g.expectedOpen);
    });
  }
});

describe('tally', () => {
  it('turns ballots into bounded increments', () => {
    const inc = ballotIncrements([{ i: 0, veto: true }, { i: 3, veto: false, score: 2 }]);
    expect(inc.v0).toBe(1);
    expect(inc.s0).toBe(0);
    expect(inc.s3).toBe(2);
    expect(inc.submitted).toBe(1);
    expect(Object.keys(inc)).toHaveLength(21);
  });

  it('rejects duplicate or out-of-range slots', () => {
    expect(() => ballotIncrements([{ i: 1, veto: true }, { i: 1, veto: true }])).toThrow();
    expect(() => ballotIncrements([{ i: 10, veto: true }])).toThrow();
  });

  it('ranks by no-veto first, then total score, then list order', () => {
    const t = zeroTally();
    t.v0 = 1;
    t.s1 = 3;
    t.s2 = 5;
    t.s3 = 5;
    expect(rank(t, 4)).toEqual({ winner: 2, order: [2, 3, 1], ruledOut: 1 });
  });

  it('reports when nothing works for everyone', () => {
    const t = zeroTally();
    t.v0 = 1;
    t.v1 = 2;
    expect(rank(t, 2)).toEqual({ winner: null, order: [], ruledOut: 2 });
  });
});
