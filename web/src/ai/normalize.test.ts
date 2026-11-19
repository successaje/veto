import { describe, expect, it } from 'vitest';
import { emptyProfile, type PrivateProfile } from '../domain/attrs';
import { groundProfile, parseJson, sanitizeCandidates, sanitizeProfile, sanitizeScores } from './normalize';

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
    const items = Array.from({ length: 12 }, (_, k) => ({
      name: `Place ${k}`,
      priceBand: 9,
      stepFree: 'ramp',
    }));
    const out = sanitizeCandidates({ items: [{ name: '' }, ...items] }, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toMatchObject({
      i: 0,
      name: 'Place 0',
      priceBand: 4,
      stepFree: 'unknown',
      estPerPerson: null,
    });
    expect(out[9].i).toBe(9);
  });
});

describe('sanitizeScores', () => {
  it('keeps only requested indices and valid scores', () => {
    const s = sanitizeScores(
      {
        scores: [
          { i: 2, s: 3 },
          { i: 5, s: 9 },
          { i: 7, s: 0 },
        ],
      },
      [2, 5],
    );
    expect([...s]).toEqual([
      [2, 3],
      [5, 1],
    ]);
  });
});

describe('parseJson', () => {
  it('strips markdown fences', () => {
    expect(parseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe('groundProfile', () => {
  const withHard = (hard: Partial<PrivateProfile['hard']>): PrivateProfile => {
    const p = emptyProfile();
    return { ...p, hard: { ...p.hard, ...hard } };
  };

  it('keeps limits the note states and drops numbers it never mentions', () => {
    const p = groundProfile(withHard({ maxPerPerson: 20, maxTravelMin: 25 }), 'I can do about $20 a head.');
    expect(p.hard.maxPerPerson).toBe(20);
    expect(p.hard.maxTravelMin).toBeNull();
  });

  it('does not match a number inside a longer one', () => {
    expect(
      groundProfile(withHard({ maxPerPerson: 15 }), 'Payday is the 150th day').hard.maxPerPerson,
    ).toBeNull();
  });

  it('trusts numbers when the note spells them out', () => {
    const p = groundProfile(withHard({ maxTravelMin: 30 }), 'Nothing more than half an hour away.');
    expect(p.hard.maxTravelMin).toBe(30);
  });

  it('keeps only place names the note contains, ignoring case and a leading "The"', () => {
    const p = groundProfile(
      withHard({ avoidNames: ['The Tap Room', 'The Rusty Mug', "Luigi's"] }),
      'My ex works at the tap room, so not there.',
    );
    expect(p.hard.avoidNames).toEqual(['The Tap Room']);
  });
});
