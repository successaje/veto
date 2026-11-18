import { describe, expect, it } from 'vitest';
import { emptyProfile, ATTRS } from './attrs';
import { DIET_LABEL, describeHardLimits, FOOD_LABEL, listPhrase, VENUE_LABEL } from './labels';

describe('labels', () => {
  it('cover every term in the shared vocabulary', () => {
    expect(Object.keys(FOOD_LABEL).sort()).toEqual([...ATTRS.foods].sort());
    expect(Object.keys(DIET_LABEL).sort()).toEqual([...ATTRS.dietTags].sort());
    expect(Object.keys(VENUE_LABEL).sort()).toEqual([...ATTRS.venueTypes].sort());
  });
});

describe('listPhrase', () => {
  it('joins like a person would', () => {
    expect(listPhrase([])).toBe('');
    expect(listPhrase(['a'])).toBe('a');
    expect(listPhrase(['a', 'b'])).toBe('a and b');
    expect(listPhrase(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('describeHardLimits', () => {
  it('is empty for an empty profile', () => {
    expect(describeHardLimits(emptyProfile())).toEqual([]);
  });

  it('reads a profile back in plain words', () => {
    const p = emptyProfile();
    p.hard.avoidFoods = ['raw_fish', 'soft_cheese'];
    p.hard.avoidVenueTypes = ['bar_centric'];
    p.hard.needsStepFree = true;
    p.hard.maxPerPerson = 30;
    p.hard.avoidNames = ['The Tap Room'];
    expect(describeHardLimits(p)).toEqual([
      'places serving mostly raw fish and soft cheese',
      'bars',
      'places with steps',
      'anything over $30 a person',
      'The Tap Room',
    ]);
  });

  it('says when unclear access is ruled out too', () => {
    const p = emptyProfile();
    p.hard.needsStepFree = true;
    p.hard.stepFreeUnknown = 'veto';
    expect(describeHardLimits(p)).toEqual(['places without clear step-free access']);
  });
});
