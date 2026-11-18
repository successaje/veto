// Pure helpers for Grounding with Google Maps. No Firebase imports, so they are unit-tested.
//
// The Maps terms require every place we show to come with its Google Maps source (title + link),
// attributed to "Google Maps". So an option the model names but Maps did not return is dropped:
// it has no source, and it may not be a real place.

import type { GroundingChunk } from 'firebase/ai';
import type { Candidate } from '../domain/attrs';

export interface MapsSource {
  title: string;
  uri: string;
  /** `places/{id}`. The one Maps field the terms let us keep without a time limit. */
  placeId?: string;
}

/** The Google Maps sources in a grounded response, in order, without duplicates. */
export function mapsSources(chunks: GroundingChunk[] | undefined): MapsSource[] {
  const seen = new Set<string>();
  const out: MapsSource[] = [];
  for (const m of (chunks ?? []).map((c) => c.maps)) {
    if (!m?.uri || !m.title || seen.has(m.uri)) continue;
    seen.add(m.uri);
    out.push({ title: m.title, uri: m.uri, placeId: m.placeId || undefined });
  }
  return out;
}

/** A loose key for matching names: case, accents, punctuation, "&" and a leading "The" don't count. */
export function nameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^the /, '');
}

function findSource(name: string, sources: MapsSource[], used: Set<MapsSource>): MapsSource | undefined {
  const key = nameKey(name);
  if (!key) return undefined;
  const free = sources.filter((s) => !used.has(s));
  const exact = free.find((s) => nameKey(s.title) === key);
  if (exact) return exact;
  // "Tartine" vs "Tartine Bakery": one name contains the other, as whole words.
  return free.find((s) => {
    const other = nameKey(s.title);
    const [short, long] = other.length < key.length ? [other, key] : [key, other];
    return short.length >= 4 && ` ${long} `.includes(` ${short} `);
  });
}

/**
 * Keep only the options that have a Google Maps source, attach that source to each, and renumber
 * them 0..n-1 (the tally has one slot per index).
 */
export function attachSources(items: Candidate[], sources: MapsSource[]): Candidate[] {
  const used = new Set<MapsSource>();
  const out: Candidate[] = [];
  for (const c of items) {
    const s = findSource(c.name, sources, used);
    if (!s) continue;
    used.add(s);
    out.push({ ...c, i: out.length, name: s.title.slice(0, 60), mapsUri: s.uri, placeId: s.placeId });
  }
  return out;
}
