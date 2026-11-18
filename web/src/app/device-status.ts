import { deviceState, downloadPrivateModel, type DeviceState } from '../ai/gate';
import { onDeviceOnly } from '../ai/models';
import { PROFILE_SYSTEM } from '../ai/prompts';
import { h } from '../ui/dom';

/** Header pill showing whether this browser can run private (on-device) AI. */
export const devicePill = h('span', { class: 'pill' }, 'Checking private AI…');

let state: DeviceState = 'no-api';

export async function refreshDeviceState(): Promise<DeviceState> {
  state = await deviceState();
  devicePill.replaceChildren();
  if (state === 'available') devicePill.append('🔒 Private AI ready');
  else if (state === 'downloadable' || state === 'downloading') {
    const btn = h(
      'button',
      { class: 'link', onclick: () => void enablePrivateAI(btn) },
      'Enable private AI (one-time download)',
    );
    devicePill.append(btn);
  } else devicePill.append('No on-device AI in this browser · you can still vote by hand');
  return state;
}

async function enablePrivateAI(btn: HTMLButtonElement): Promise<void> {
  // Chrome only starts the model download after a user gesture, so this runs from a click.
  btn.disabled = true;
  await downloadPrivateModel(
    onDeviceOnly(PROFILE_SYSTEM),
    (p) => (btn.textContent = `Downloading… ${Math.round(p * 100)}%`),
  );
  await refreshDeviceState();
}
