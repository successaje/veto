// The five AI calls. Every call records what it sent (or that nothing left) in the ledger.

import type { Candidate, PrivateProfile, RoomSpec } from '../domain/attrs';
import { cfg } from '../data/firebase';
import { record, words } from '../data/ledger';
import { hardCheck, type HardResult } from '../domain/matcher';
import type { Choice } from '../domain/tally';
import fixture from '../../../eval/candidates.sample.json';
import { assertDeviceReady, assertRanOnDevice, deviceState, withDeadline } from './gate';
import { attachSources, mapsSources } from './maps';
import { cloudOnly, onDeviceOnly, preferDevice } from './models';
import { groundProfile, parseJson, sanitizeCandidates, sanitizeProfile, sanitizeScores } from './normalize';
import {
  CANDIDATE_SEARCH_SYSTEM,
  EXPLAIN_SYSTEM,
  FIT_SYSTEM,
  NORMALIZE_SYSTEM,
  PROFILE_EXAMPLES,
  PROFILE_SYSTEM,
  SPEC_SYSTEM,
} from './prompts';
import { candidatesSchema, fitSchema, profileSchema, specSchema } from './schemas';
import { reportError } from '../app/report';

export type Source = 'on_device' | 'in_cloud';

// 1. Room helper (PREFER_ON_DEVICE, public text) ---------------------------------------------

export async function parseRoomSpec(message: string): Promise<{ spec: RoomSpec; source: Source }> {
  const r = await preferDevice(SPEC_SYSTEM, specSchema).generateContent(message);
  const source = (r.response.inferenceSource ?? 'in_cloud') as Source;
  record({
    kind: source === 'on_device' ? 'device-ai' : 'cloud-ai',
    feature: 'Room helper',
    detail:
      source === 'on_device'
        ? 'Ran on this device.'
        : `Sent your public plan (${words(message)} words) to Gemini.`,
  });
  const o = parseJson(r.response.text()) as Partial<RoomSpec>;
  return {
    source,
    spec: {
      title: String(o.title ?? 'Group plan').slice(0, 60),
      area: String(o.area ?? '').slice(0, 60),
      when: String(o.when ?? 'TBD').slice(0, 60),
      groupSize: Math.min(20, Math.max(2, Number(o.groupSize) || 4)),
      vibe: String(o.vibe ?? '').slice(0, 80),
    },
  };
}

// 2. Find options (ONLY_IN_CLOUD + Grounding with Google Maps) --------------------------------

export interface FoundCandidates {
  items: Candidate[];
  /** 'fallback' = Maps was switched on but failed, so the room got the demo list instead. */
  source: 'maps' | 'fixture' | 'fallback';
  /** Google Maps sources of the options. Shown next to them, as the Maps terms require. */
  attributions: { title: string; uri: string }[];
}

/** Grounding returns at least this many real places, or the demo list is used instead. */
const MIN_PLACES = 3;

export async function findCandidates(spec: RoomSpec): Promise<FoundCandidates> {
  const max = cfg.maxCandidates();
  if (cfg.candidateSource() === 'maps') {
    try {
      return await fromMaps(spec, max);
    } catch (e) {
      // Usually quota: grounding needs a billed project. A room must never get stuck on it.
      reportError(e);
      record({
        kind: 'local',
        feature: 'Find options',
        detail: 'Google Maps search didn’t work, so the room got the built-in demo list.',
      });
      return demoList(max, 'fallback');
    }
  }
  record({
    kind: 'local',
    feature: 'Find options',
    detail: 'Used the built-in demo list. Nothing sent to AI.',
  });
  return demoList(max, 'fixture');
}

function demoList(max: number, source: 'fixture' | 'fallback'): FoundCandidates {
  return { items: (fixture.items as Candidate[]).slice(0, max), source, attributions: [] };
}

async function fromMaps(spec: RoomSpec, max: number): Promise<FoundCandidates> {
  const publicAsk = `Group outing: ${spec.title}. Area: ${spec.area}. When: ${spec.when}. People: ${spec.groupSize}. Vibe: ${spec.vibe}.`;

  // Step 1: grounded search. Tools and a response schema are kept in separate calls on purpose.
  let grounded;
  try {
    grounded = await cloudOnly({
      system: CANDIDATE_SEARCH_SYSTEM,
      tools: [{ googleMaps: {} }],
      toolConfig:
        spec.lat != null && spec.lng != null
          ? { retrievalConfig: { latLng: { latitude: spec.lat, longitude: spec.lng } } }
          : undefined,
    }).generateContent(publicAsk);
  } finally {
    // The request left the device whether or not it succeeded.
    record({
      kind: 'cloud-ai',
      feature: 'Find options',
      detail: `Sent the room's public details (${words(publicAsk)} words) to Gemini with Google Maps. No one's private notes.`,
    });
  }
  const sources = mapsSources(grounded.response.candidates?.[0]?.groundingMetadata?.groundingChunks);
  if (sources.length < MIN_PLACES) throw new Error(`Google Maps returned ${sources.length} places`);

  // Step 2: normalise into the shared vocabulary, then keep only options with a Maps source.
  const normalised = await cloudOnly({ system: NORMALIZE_SYSTEM, schema: candidatesSchema }).generateContent(
    grounded.response.text(),
  );
  const items = attachSources(sanitizeCandidates(parseJson(normalised.response.text()), 10), sources).slice(
    0,
    max,
  );
  if (items.length < MIN_PLACES) throw new Error(`Only ${items.length} options matched a Maps source`);
  record({
    kind: 'cloud-ai',
    feature: 'Find options',
    detail: `Sent the places Google Maps found (${words(grounded.response.text())} words) to Gemini to describe them in the shared vocabulary.`,
  });
  return {
    items,
    source: 'maps',
    attributions: items.map((c) => ({ title: c.name, uri: c.mapsUri! })),
  };
}

/** On-device answers normally take 4 to 8 s on an 8 GB Mac; past this, something is stuck. */
const DEVICE_DEADLINE_MS = 30_000;

// 3. Understand my note (ONLY_ON_DEVICE, private) ----------------------------------------------

export async function understandNote(note: string): Promise<PrivateProfile> {
  await assertDeviceReady();
  const system = cfg.promptProfile() || PROFILE_SYSTEM;
  const r = await withDeadline(DEVICE_DEADLINE_MS, (signal) =>
    onDeviceOnly(system, profileSchema, { examples: PROFILE_EXAMPLES, signal }).generateContent(note),
  );
  assertRanOnDevice(r.response.inferenceSource, 'Understand my note');
  record({
    kind: 'device-ai',
    feature: 'Understand my note',
    detail: 'Ran on this device. Your note was not sent anywhere.',
  });
  return groundProfile(sanitizeProfile(parseJson(r.response.text())), note);
}

// 4. Private fit check (code for hard rules + ONLY_ON_DEVICE for soft fit) --------------------

export interface PrivateDecision {
  choices: Choice[];
  details: Record<number, HardResult & { score?: number }>;
}

export async function decidePrivately(
  profile: PrivateProfile,
  candidates: Candidate[],
): Promise<PrivateDecision> {
  const details: PrivateDecision['details'] = {};
  for (const c of candidates) details[c.i] = hardCheck(profile, c);
  const open = candidates.filter((c) => !details[c.i].veto);

  let scores = new Map<number, 0 | 1 | 2 | 3>(open.map((c) => [c.i, 2]));
  const hasSoft = profile.soft.likes.length + profile.soft.dislikes.length > 0 || profile.other.length > 0;
  // Hard rules above need no model. Soft scoring uses the on-device model when it is ready;
  // if it is not, everyone still votes with neutral scores. It never falls back to the cloud.
  if (open.length > 0 && hasSoft && (await deviceState()) === 'available') {
    await assertDeviceReady();
    const prompt = [
      `Likes: ${profile.soft.likes.join('; ') || 'none'}`,
      `Dislikes: ${profile.soft.dislikes.join('; ') || 'none'}`,
      `Also: ${profile.other || 'nothing'}`,
      'Places:',
      ...open.map(
        (c) => `${c.i}. ${c.name} (${c.area}), price band ${c.priceBand}, noise ${c.noise}. ${c.evidence}`,
      ),
    ].join('\n');
    const system = cfg.promptFit() || FIT_SYSTEM;
    const r = await withDeadline(DEVICE_DEADLINE_MS, (signal) =>
      onDeviceOnly(system, fitSchema, { signal }).generateContent(prompt),
    );
    assertRanOnDevice(r.response.inferenceSource, 'Private fit check');
    scores = sanitizeScores(
      parseJson(r.response.text()),
      open.map((c) => c.i),
    );
  }
  record({
    kind: 'device-ai',
    feature: 'Private fit check',
    detail: 'Rules and scoring ran on this device. Your reasons stay here.',
  });

  const choices: Choice[] = candidates.map((c) =>
    details[c.i].veto ? { i: c.i, veto: true } : { i: c.i, veto: false, score: scores.get(c.i) ?? 2 },
  );
  for (const [i, s] of scores) details[i] = { ...details[i], score: s };
  return { choices, details };
}

// 5. Explain the winner (PREFER_ON_DEVICE, public facts only) ---------------------------------

export async function explainWinner(c: Candidate, spec: RoomSpec): Promise<{ text: string; source: Source }> {
  const facts = `${spec.title}, ${spec.when}. Place: ${c.name} in ${c.area}. Price band ${c.priceBand}. Noise: ${c.noise}. ${c.evidence}`;
  const r = await preferDevice(EXPLAIN_SYSTEM).generateContent(facts);
  const source = (r.response.inferenceSource ?? 'in_cloud') as Source;
  record({
    kind: source === 'on_device' ? 'device-ai' : 'cloud-ai',
    feature: 'Explain the pick',
    detail:
      source === 'on_device'
        ? 'Ran on this device.'
        : `Sent public facts about ${c.name} (${words(facts)} words) to Gemini.`,
  });
  return { text: r.response.text().trim(), source };
}
