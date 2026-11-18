// "The model reads; code decides."
// The on-device model turns a private note into a PrivateProfile. This file, not the model,
// decides hard vetoes, so the result is predictable, testable and identical on every platform.
// Android and iOS ports must pass the same cases in eval/.

import type { Candidate, PrivateProfile } from './attrs';

export interface HardResult {
  veto: boolean;
  /** Why it was ruled out. Shown only on this device, never uploaded. */
  reasons: string[];
  /** Things worth checking before you go. Shown only on this device, never uploaded. */
  confirm: string[];
}

export function hardCheck(p: PrivateProfile, c: Candidate): HardResult {
  const h = p.hard;
  const reasons: string[] = [];
  const confirm: string[] = [];

  for (const f of h.avoidFoods) {
    if (c.servesHeavily.includes(f)) reasons.push(`centres on ${label(f)}`);
  }
  for (const t of h.avoidVenueTypes) {
    if (c.venueTypes.includes(t)) reasons.push(`is ${label(t)}`);
  }
  for (const tag of h.requireDietTags) {
    if (!c.dietTags.includes(tag)) reasons.push(`no ${label(tag)} listed`);
  }
  const lowerName = c.name.toLowerCase();
  for (const n of h.avoidNames) {
    const needle = n.trim().toLowerCase();
    if (needle && lowerName.includes(needle)) reasons.push(`it's ${c.name}`);
  }

  if (h.needsStepFree) {
    if (c.stepFree === 'no') reasons.push('entrance is not step-free');
    else if (c.stepFree === 'limited' || c.stepFree === 'unknown') {
      if (h.stepFreeUnknown === 'veto') reasons.push(`step-free access is ${c.stepFree}`);
      else confirm.push('step-free entrance and restroom');
    }
  }

  if (h.maxPerPerson != null) {
    if (c.estPerPerson == null) confirm.push(`price (your limit is about $${h.maxPerPerson})`);
    else if (c.estPerPerson > h.maxPerPerson) reasons.push(`about $${c.estPerPerson} a head`);
  }

  if (h.maxTravelMin != null) {
    if (c.travelMin == null) confirm.push('travel time');
    else if (c.travelMin > h.maxTravelMin) reasons.push(`${c.travelMin} min away`);
  }

  if (h.avoidAlcoholFocus) {
    if (c.alcoholFocus === 'high') reasons.push('drinking is the main event');
    else if (c.alcoholFocus === 'unknown') confirm.push('how bar-focused it is');
  }

  if (h.needsQuiet) {
    if (c.noise === 'loud') reasons.push('it is loud');
    else if (c.noise === 'unknown') confirm.push('noise level');
  }

  return { veto: reasons.length > 0, reasons, confirm };
}

/** Indices this profile hard-vetoes, in order. */
export function vetoSet(p: PrivateProfile, candidates: Candidate[]): number[] {
  return candidates.filter((c) => hardCheck(p, c).veto).map((c) => c.i);
}

function label(s: string): string {
  return s.replace(/_/g, ' ');
}
