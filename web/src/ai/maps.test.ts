import { describe, expect, it } from 'vitest';
import type { Candidate } from '../domain/attrs';
import { attachSources, mapsSources, nameKey } from './maps';

const option = (name: string, i = 0): Candidate => ({
  i,
  name,
  area: 'Mission',
  priceBand: 2,
  estPerPerson: null,
  travelMin: null,
  stepFree: 'unknown',
  noise: 'unknown',
  alcoholFocus: 'unknown',
  servesHeavily: [],
  dietTags: [],
  venueTypes: [],
  evidence: '',
});

const src = (title: string, n: number) => ({
  title,
  uri: `https://maps.google.com/?cid=${n}`,
  placeId: `places/${n}`,
});

describe('mapsSources', () => {
  it('keeps Maps chunks with a title and link, once each, in order', () => {
    const chunks = [
      { maps: src('Tartine Bakery', 1) },
      { web: { uri: 'https://example.com', title: 'A blog' } },
      { maps: { uri: 'https://maps.google.com/?cid=2' } },
      { maps: src('Tartine Bakery', 1) },
      { maps: { ...src('Foreign Cinema', 3), placeId: '' } },
    ];
    expect(mapsSources(chunks)).toEqual([
      src('Tartine Bakery', 1),
      { title: 'Foreign Cinema', uri: 'https://maps.google.com/?cid=3', placeId: undefined },
    ]);
  });

  it('copes with a response that has no grounding', () => {
    expect(mapsSources(undefined)).toEqual([]);
  });
});

describe('nameKey', () => {
  it('ignores case, accents, punctuation, "&" and a leading "The"', () => {
    expect(nameKey('The Café  Ñoño!')).toBe('cafe nono');
    expect(nameKey('Rosa & Co.')).toBe(nameKey('rosa and co'));
    expect(nameKey('Theory Bar')).toBe('theory bar');
  });
});

describe('attachSources', () => {
  const sources = [src('Tartine Bakery', 1), src('Foreign Cinema', 2), src('La Taqueria', 3)];

  it('attaches each option to its source and uses the Maps name', () => {
    const out = attachSources([option('foreign cinema', 0), option('Tartine', 1)], sources);
    expect(out.map((c) => [c.i, c.name, c.mapsUri, c.placeId])).toEqual([
      [0, 'Foreign Cinema', 'https://maps.google.com/?cid=2', 'places/2'],
      [1, 'Tartine Bakery', 'https://maps.google.com/?cid=1', 'places/1'],
    ]);
  });

  it('drops options Maps did not return and renumbers the rest', () => {
    const out = attachSources([option('Made Up Diner', 0), option('La Taqueria', 1)], sources);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ i: 0, name: 'La Taqueria' });
  });

  it('uses each source once, so two options cannot share a place', () => {
    const out = attachSources([option('Tartine Bakery'), option('Tartine Bakery', 1)], sources);
    expect(out).toHaveLength(1);
  });

  it('does not match on a short fragment or part of a word', () => {
    expect(attachSources([option('La')], sources)).toEqual([]);
    expect(attachSources([option('Tartin')], [src('Tartine Bakery', 1)])).toEqual([]);
  });
});
