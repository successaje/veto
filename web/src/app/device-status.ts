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

/** Download progress (0–1) while this page is downloading the model, otherwise null. */
let progress: number | null = null;
const progressListeners = new Set<(p: number | null) => void>();

export const deviceNow = (): DeviceState => current;
export const downloadProgress = (): number | null => progress;

/** Subscribe to on-device AI state changes. Returns an unsubscribe function. */
export function onDeviceState(fn: (s: DeviceState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Subscribe to download progress. Separate from state so a progress tick doesn't re-render screens. */
export function onDownloadProgress(fn: (p: number | null) => void): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

function show(s: DeviceState): void {
  current = s;
  deviceIndicator.dataset.state = s;
  deviceIndicator.title = LABEL[s];
  indicatorLabel.textContent = LABEL[s];
  listeners.forEach((fn) => fn(s));
}

function setProgress(p: number | null): void {
  progress = p;
  progressListeners.forEach((fn) => fn(p));
}

export async function refreshDeviceState(): Promise<DeviceState> {
  show(await deviceState());
  return current;
}

/**
 * Download Chrome's on-device model. Must run from a click: Chrome only starts the download
 * after a user gesture. The header and the note screen follow along through the listeners.
 */
export async function enablePrivateAI(): Promise<DeviceState> {
  setProgress(0);
  show('downloading');
  try {
    await downloadPrivateModel(onDeviceOnly(PROFILE_SYSTEM), setProgress);
  } finally {
    setProgress(null);
    await refreshDeviceState();
  }
  return current;
}
