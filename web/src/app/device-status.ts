import { deviceState, downloadPrivateModel, type DeviceState } from '../ai/gate';
import { onDeviceOnly } from '../ai/models';
import { PROFILE_SYSTEM } from '../ai/prompts';
import { h } from '../ui/dom';

const LABEL: Record<DeviceState, string> = {
  available: 'Private AI ready',
  downloadable: 'Private AI: download needed',
  downloading: 'Private AI: downloading',
  unavailable: 'No private AI here',
  'no-api': 'No private AI here',
};

/** Header indicator: a colored dot plus a short label. Links to the note screen for details. */
export const deviceIndicator = h('a', {
  class: 'device-status',
  href: '/app/note',
  'data-state': 'checking',
});
const indicatorLabel = h('span', { class: 'device-label' }, 'Checking private AI…');
deviceIndicator.append(indicatorLabel);

let current: DeviceState = 'no-api';
const listeners = new Set<(s: DeviceState) => void>();

export const deviceNow = (): DeviceState => current;

/** Subscribe to on-device AI state changes. Returns an unsubscribe function. */
export function onDeviceState(fn: (s: DeviceState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function refreshDeviceState(): Promise<DeviceState> {
  current = await deviceState();
  deviceIndicator.dataset.state = current;
  deviceIndicator.title = LABEL[current];
  indicatorLabel.textContent = LABEL[current];
  listeners.forEach((fn) => fn(current));
  return current;
}

/**
 * Download Chrome's on-device model. Must run from a click: Chrome only starts the download
 * after a user gesture. `onProgress` receives 0–1.
 */
export async function enablePrivateAI(onProgress: (fraction: number) => void): Promise<DeviceState> {
  await downloadPrivateModel(onDeviceOnly(PROFILE_SYSTEM), onProgress);
  return refreshDeviceState();
}
