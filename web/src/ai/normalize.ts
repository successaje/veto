// Pure clean-up of model output. Small models drift; never trust raw JSON from either side.

import { ATTRS, emptyProfile, type Candidate, type PrivateProfile } from '../attrs';

type Json = Record<string, unknown>;

const asObj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const asStr = (v: unknown, max = 120): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asBool = (v: unknown): boolean => v === true;
const asLimit = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : null;
function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function pickMany(v: unknown, allowed: readonly string[], max = 8): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.includes(x)))].slice(0, max);
}
function strings(v: unknown, maxItems = 5, maxLen = 60): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asStr(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function parseJson(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

export function sanitizeProfile(raw: unknown): PrivateProfile {
  const o = asObj(raw);
  const h = asObj(o.hard);
  const s = asObj(o.soft);
  const base = emptyProfile();
  return {
    hard: {
      avoidFoods: pickMany(h.avoidFoods, ATTRS.foods),
      avoidVenueTypes: pickMany(h.avoidVenueTypes, ATTRS.venueTypes),
      needsStepFree: asBool(h.needsStepFree),
      stepFreeUnknown: pick(h.stepFreeUnknown, ['veto', 'confirm'] as const, base.hard.stepFreeUnknown),
      maxPerPerson: asLimit(h.maxPerPerson),
      maxTravelMin: asLimit(h.maxTravelMin),
      avoidAlcoholFocus: asBool(h.avoidAlcoholFocus),
      needsQuiet: asBool(h.needsQuiet),
      requireDietTags: pickMany(h.requireDietTags, ATTRS.dietTags),
      avoidNames: strings(h.avoidNames),
    },
    soft: { likes: strings(s.likes, 5, 40), dislikes: strings(s.dislikes, 5, 40) },
    other: asStr(o.other, 120),
  };
}

export function sanitizeCandidates(raw: unknown, max: number): Candidate[] {
  const items = Array.isArray(asObj(raw).items) ? (asObj(raw).items as unknown[]) : [];
  return items
    .map(asObj)
    .filter((c) => asStr(c.name))
    .slice(0, Math.min(max, 10))
    .map((c, i) => ({
      i,
      name: asStr(c.name, 60),
      area: asStr(c.area, 60),
      placeId: asStr(c.placeId, 200) || undefined,
      mapsUri: asStr(c.mapsUri, 400) || undefined,
      priceBand: Math.min(4, Math.max(1, Math.round(Number(c.priceBand) || 2))) as Candidate['priceBand'],
      estPerPerson: asLimit(c.estPerPerson),
      travelMin: asLimit(c.travelMin),
      stepFree: pick(c.stepFree, ['yes', 'limited', 'no', 'unknown'] as const, 'unknown'),
      noise: pick(c.noise, ['quiet', 'moderate', 'loud', 'unknown'] as const, 'unknown'),
      alcoholFocus: pick(c.alcoholFocus, ['low', 'medium', 'high', 'unknown'] as const, 'unknown'),
      servesHeavily: pickMany(c.servesHeavily, ATTRS.foods, 4),
      dietTags: pickMany(c.dietTags, ATTRS.dietTags, 6),
      venueTypes: pickMany(c.venueTypes, ATTRS.venueTypes, 4),
      evidence: asStr(c.evidence, 240),
    }));
}

/** Scores for the given indices, clamped to 0..3. Missing indices default to a neutral 1. */
export function sanitizeScores(raw: unknown, indices: number[]): Map<number, 0 | 1 | 2 | 3> {
  const out = new Map<number, 0 | 1 | 2 | 3>(indices.map((i) => [i, 1]));
  const list = Array.isArray(asObj(raw).scores) ? (asObj(raw).scores as unknown[]) : [];
  for (const item of list.map(asObj)) {
    const i = Number(item.i);
    const s = Math.round(Number(item.s));
    if (out.has(i) && s >= 0 && s <= 3) out.set(i, s as 0 | 1 | 2 | 3);
  }
  return out;
}
