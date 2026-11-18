// The shared vocabulary. The cloud describes candidates with it; your device describes
// your private needs with it; plain code compares the two. Android and iOS read the same file.
import vocab from '../../shared/attributes.v1.json';

export const ATTRS = vocab;

export type Food = (typeof vocab.foods)[number];
export type VenueType = (typeof vocab.venueTypes)[number];
export type DietTag = (typeof vocab.dietTags)[number];
export type StepFree = 'yes' | 'limited' | 'no' | 'unknown';
export type Noise = 'quiet' | 'moderate' | 'loud' | 'unknown';
export type AlcoholFocus = 'low' | 'medium' | 'high' | 'unknown';

/** Public description of a place. Everything here is fine for the whole room (and the cloud) to see. */
export interface Candidate {
  i: number;
  name: string;
  area: string;
  placeId?: string;
  mapsUri?: string;
  priceBand: 1 | 2 | 3 | 4;
  estPerPerson: number | null;
  travelMin: number | null;
  stepFree: StepFree;
  noise: Noise;
  alcoholFocus: AlcoholFocus;
  /** Foods the menu centres on (a sushi bar centres on raw_fish), not every item on it. */
  servesHeavily: Food[];
  dietTags: DietTag[];
  venueTypes: VenueType[];
  /** One or two sentences of public evidence, at most ~40 words. */
  evidence: string;
}

/** What your device understood from your private note. Stored only on this device. */
export interface PrivateProfile {
  hard: {
    avoidFoods: Food[];
    avoidVenueTypes: VenueType[];
    needsStepFree: boolean;
    /** What to do when a place's access is 'limited' or 'unknown'. */
    stepFreeUnknown: 'veto' | 'confirm';
    maxPerPerson: number | null;
    maxTravelMin: number | null;
    avoidAlcoholFocus: boolean;
    needsQuiet: boolean;
    requireDietTags: DietTag[];
    avoidNames: string[];
  };
  soft: { likes: string[]; dislikes: string[] };
  /** Anything else that matters, in a few words. Used only by the on-device soft-fit step. */
  other: string;
}

export function emptyProfile(): PrivateProfile {
  return {
    hard: {
      avoidFoods: [],
      avoidVenueTypes: [],
      needsStepFree: false,
      stepFreeUnknown: 'confirm',
      maxPerPerson: null,
      maxTravelMin: null,
      avoidAlcoholFocus: false,
      needsQuiet: false,
      requireDietTags: [],
      avoidNames: [],
    },
    soft: { likes: [], dislikes: [] },
    other: '',
  };
}

/** Public, room-level details the host provides. This is all the cloud ever sees about the group. */
export interface RoomSpec {
  title: string;
  area: string;
  when: string;
  groupSize: number;
  vibe: string;
  lat?: number;
  lng?: number;
}
