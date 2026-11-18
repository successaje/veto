import { describe, expect, it } from 'vitest';
import { parseJson, sanitizeCandidates, sanitizeProfile, sanitizeScores } from './normalize';

describe('sanitizeProfile', () => {
  it('drops values outside the vocabulary and maps -1 to "no limit"', () => {
    const p = sanitizeProfile({
      hard: {
        avoidFoods: ['raw_fish', 'unicorn', 'raw_fish'],
        requireDietTags: ['halal', 'paleo'],
        maxPerPerson: -1,
        maxTravelMin: 15,
        stepFreeUnknown: 'maybe',
        needsStepFree: 'yes',
      },
      soft: { likes: ['spicy food', 42] },
      other: 'x'.repeat(500),
    });
    expect(p.hard.avoidFoods).toEqual(['raw_fish']);
    expect(p.hard.requireDietTags).toEqual(['halal']);
    expect(p.hard.maxPerPerson).toBeNull();
    expect(p.hard.maxTravelMin).toBe(15);
    expect(p.hard.stepFreeUnknown).toBe('confirm');
    expect(p.hard.needsStepFree).toBe(false);
    expect(p.soft.likes).toEqual(['spicy food']);
    expect(p.other).toHaveLength(120);
  });

  it('survives garbage', () => {
    expect(sanitizeProfile(null).hard.avoidFoods).toEqual([]);
  });
});

describe('sanitizeCandidates', () => {
  it('re-indexes, caps the count and defaults unknowns', () => {
    const items = Array.from({ length: 12 }, (_, k) => ({ name: `Place ${k}`, priceBand: 9, stepFree: 'ramp' }));
    const out = sanitizeCandidates({ items: [{ name: '' }, ...items] }, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toMatchObject({ i: 0, name: 'Place 0', priceBand: 4, stepFree: 'unknown', estPerPerson: null });
    expect(out[9].i).toBe(9);
  });
});

describe('sanitizeScores', () => {
  it('keeps only requested indices and valid scores', () => {
    const s = sanitizeScores({ scores: [{ i: 2, s: 3 }, { i: 5, s: 9 }, { i: 7, s: 0 }] }, [2, 5]);
    expect([...s]).toEqual([[2, 3], [5, 1]]);
  });
});

describe('parseJson', () => {
  it('strips markdown fences', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});
