import type { DeviceState } from '../../ai/gate';
import { understandNote } from '../../ai/features';
import { PrivateAIUnavailable } from '../../ai/gate';
import { privateNote, privateProfile } from '../../data/notes';
import { emptyProfile, type PrivateProfile } from '../../domain/attrs';
import { busy, button, field, notice, pageHead, toast } from '../../ui/components';
import { h } from '../../ui/dom';
import { icon } from '../../ui/icons';
import {
  deviceNow,
  downloadProgress,
  enablePrivateAI,
  onDeviceState,
  onDownloadProgress,
} from '../device-status';
import { reportError } from '../report';
import { refresh, type ScreenContext } from '../router';
import { profileEditor } from './profile-editor';

/** The private note and the profile the device extracted from it. Nothing here is uploaded. */
export function noteScreen({ root, onCleanup }: ScreenContext): void {
  const note = h('textarea', {
    rows: 6,
    value: privateNote.get(),
    placeholder:
      'I’m pregnant, so no raw fish or soft cheese. Budget about $30. My knee is bad, so no stairs. Not the Tap Room.',
  });
  const out = h('div', { class: 'stack' });

  const showProfile = (p: PrivateProfile, source: 'on_device' | null) => {
    out.replaceChildren(
      profileEditor(p, source, (saved) => {
        privateProfile.set(saved);
        toast('Saved on this device');
      }),
    );
  };

  const read = button('Read my note on this device', {
    variant: 'primary',
    icon: 'lock',
    onClick: () =>
      void busy(read, 'Reading on this device…', async () => {
        privateNote.set(note.value);
        try {
          showProfile(await understandNote(note.value), 'on_device');
        } catch (e) {
          if (e instanceof PrivateAIUnavailable) {
            showProfile(privateProfile.get() ?? emptyProfile(), null);
            out.prepend(
              notice(
                'warn',
                'This browser can’t run private AI.',
                'Your note was not sent anywhere. Fill in your limits by hand below, or vote by hand in each room.',
              ),
            );
          } else
            out.replaceChildren(
              notice('error', 'Reading your note failed.', 'Nothing was sent anywhere. Try again.'),
            );
        }
      }),
  });
  const remove = button('Delete my note', {
    variant: 'ghost',
    icon: 'trash',
    onClick: () => {
      privateNote.set('');
      privateProfile.set(null);
      toast('Deleted from this device', 'trash');
      refresh();
    },
  });

  root.append(
    pageHead(
      'Your private note',
      'Only your device knows',
      'Write what the group’s choice has to work around. It’s stored in this browser and read by the AI model on this device. It is never uploaded.',
    ),
    h(
      'div',
      { class: 'split' },
      h(
        'section',
        { class: 'stack', style: '--stack: var(--s-6)' },
        h(
          'div',
          { class: 'panel stack' },
          field(
            'Your note',
            note,
            'Food, budget, access, places to avoid: anything you’d rather not explain.',
          ),
          h('div', { class: 'cluster' }, read, privateNote.get() || privateProfile.get() ? remove : null),
        ),
        out,
      ),
      h('aside', {}, devicePanel(onCleanup)),
    ),
  );
  const saved = privateProfile.get();
  if (saved) showProfile(saved, null);
}

/** Explains this browser's on-device AI status and offers the one-time model download. */
function devicePanel(onCleanup: (fn: () => void) => void): HTMLElement {
  const panel = h('div', { class: 'panel stack' });
  // One progress line for the whole download, kept across re-renders of the panel.
  const progress = h('p', { class: 'small muted', 'aria-live': 'polite' });
  const showProgress = (p: number | null) => {
    progress.textContent = p == null ? '' : `${Math.round(p * 100)}% downloaded`;
  };
  showProgress(downloadProgress());
  onCleanup(onDownloadProgress(showProgress));

  const render = (s: DeviceState) => {
    const download = button('Download private AI', {
      variant: 'primary',
      icon: 'download',
      onClick: () =>
        void enablePrivateAI().catch((e) => {
          reportError(e);
          toast('The download didn’t finish. Check your free disk space and try again.', 'alert');
        }),
    });
    const body: Record<DeviceState, HTMLElement[]> = {
      available: [
        h('p', { class: 'small' }, 'This browser can read your note and check options without the internet.'),
      ],
      downloadable: [
        h(
          'p',
          { class: 'small' },
          'Chrome needs to download its on-device model once (a few GB). After that, private checks run offline.',
        ),
        download,
      ],
      downloading: [
        h(
          'p',
          { class: 'small' },
          'Chrome is downloading its on-device model. It keeps going if you leave this page.',
        ),
        progress,
      ],
      unavailable: [
        h(
          'p',
          { class: 'small' },
          'This device doesn’t meet Chrome’s requirements for on-device AI. You can still vote by hand; nothing is sent to the cloud instead.',
        ),
      ],
      'no-api': [
        h(
          'p',
          { class: 'small' },
          'This browser has no on-device AI. Use desktop Chrome for private checks, or vote by hand in each room.',
        ),
      ],
    };
    panel.replaceChildren(
      h(
        'div',
        { class: 'cluster', style: '--cluster: var(--s-2)' },
        icon(s === 'available' ? 'lock' : 'device'),
        h('strong', {}, s === 'available' ? 'Private AI is ready' : 'Private AI on this device'),
      ),
      ...body[s],
    );
  };
  render(deviceNow());
  onCleanup(onDeviceState(render));
  return panel;
}
