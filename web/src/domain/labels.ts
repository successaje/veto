// Human words for the shared vocabulary, and a plain-language read-back of a private profile.
// Pure functions: used on the note screen and unit-tested.

import type { DietTag, Food, PrivateProfile, VenueType } from './attrs';

export const FOOD_LABEL: Record<Food, string> = {
  raw_fish: 'Raw fish',
  shellfish: 'Shellfish',
  pork: 'Pork',
  beef: 'Beef',
  peanuts: 'Peanuts',
  tree_nuts: 'Tree nuts',
  gluten: 'Gluten',
  dairy: 'Dairy',
  soft_cheese: 'Soft cheese',
  eggs: 'Eggs',
  spicy: 'Spicy food',
};

export const DIET_LABEL: Record<DietTag, string> = {
  vegetarian_friendly: 'Vegetarian options',
  vegan_friendly: 'Vegan options',
  halal: 'Halal',
  kosher: 'Kosher',
  gluten_free_options: 'Gluten-free options',
  kid_friendly: 'Kid-friendly',
};

export const VENUE_LABEL: Record<VenueType, string> = {
  bar_centric: 'Bars',
  fine_dining: 'Fine dining',
  fast_casual: 'Fast casual',
  cafe: 'Cafés',
  outdoor_only: 'Outdoor-only',
  late_night: 'Late-night spots',
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Join phrases as "a, b and c". */
export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/**
 * What the device will rule out, as short phrases, in the order a person would say them.
 * Empty when the profile has no hard limits.
 */
export function describeHardLimits(p: PrivateProfile): string[] {
  const h = p.hard;
  const out: string[] = [];
  if (h.avoidFoods.length)
    out.push(`places serving mostly ${listPhrase(h.avoidFoods.map((f) => lower(FOOD_LABEL[f])))}`);
  if (h.avoidVenueTypes.length) out.push(listPhrase(h.avoidVenueTypes.map((v) => lower(VENUE_LABEL[v]))));
  if (h.avoidAlcoholFocus) out.push('places built around drinking');
  if (h.requireDietTags.length)
    out.push(`places without ${listPhrase(h.requireDietTags.map((d) => lower(DIET_LABEL[d])))}`);
  if (h.needsStepFree)
    out.push(h.stepFreeUnknown === 'veto' ? 'places without clear step-free access' : 'places with steps');
  if (h.maxPerPerson != null) out.push(`anything over $${h.maxPerPerson} a person`);
  if (h.maxTravelMin != null) out.push(`anything more than ${h.maxTravelMin} minutes away`);
  if (h.needsQuiet) out.push('loud places');
  if (h.avoidNames.length) out.push(listPhrase(h.avoidNames));
  return out;
}
