// The on-device gate.
//
// Firebase AI Logic's ONLY_ON_DEVICE mode does NOT throw in browsers that lack the Prompt API
// (Safari, Firefox, Chrome on Android): the SDK finds no on-device adapter and silently sends
// the request to the cloud (firebase-js-sdk hybrid-helpers.ts, as of 13.x). For a feature that
// promises "never leaves your device", that is unacceptable, so every private call goes through
// assertDeviceReady() first and assertRanOnDevice() after.

import type { GenerativeModel } from 'firebase/ai';
import { record } from '../ledger';

export type DeviceState = 'no-api' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

/** Text in, text out, English. Overrides the SDK default, which also asks for image input. */
export const TEXT_ONLY = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

interface PromptApiGlobal {
  availability(options: typeof TEXT_ONLY): Promise<Exclude<DeviceState, 'no-api'>>;
}

export async function deviceState(): Promise<DeviceState> {
  const LM = (globalThis as { LanguageModel?: PromptApiGlobal }).LanguageModel;
  if (!LM?.availability) return 'no-api';
  try {
    return await LM.availability(TEXT_ONLY);
  } catch {
    return 'unavailable';
  }
}

export class PrivateAIUnavailable extends Error {
  constructor(readonly state: DeviceState) {
    super(`On-device AI is not ready (${state}).`);
  }
}

export async function assertDeviceReady(): Promise<void> {
  const s = await deviceState();
  if (s !== 'available') throw new PrivateAIUnavailable(s);
}

/** Defence in depth: refuse to use an answer that did not come from this device. */
export function assertRanOnDevice(source: string | undefined, feature: string): void {
  if (source !== 'on_device') {
    record({ kind: 'blocked', feature, detail: `Expected on-device inference, got "${source}". Result discarded.` });
    throw new Error(`${feature}: expected on-device inference, got ${source}`);
  }
}

/**
 * Starts the one-time model download. Chrome requires this to happen on or after a user
 * gesture, so call it from a click handler. Progress is 0..1.
 */
export async function downloadPrivateModel(model: GenerativeModel, onProgress: (p: number) => void): Promise<void> {
  await model.initializeDeviceModel(onProgress);
}
