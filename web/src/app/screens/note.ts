import { understandNote } from '../../ai/features';
import { PrivateAIUnavailable } from '../../ai/gate';
import { sanitizeProfile } from '../../ai/normalize';
import { privateNote, privateProfile } from '../../data/notes';
import { emptyProfile, type PrivateProfile } from '../../domain/attrs';
import { h } from '../../ui/dom';
import { refresh, type ScreenContext } from '../router';

/** The private note and the profile the device extracted from it. Nothing here is uploaded. */
export function noteScreen({ root }: ScreenContext): void {
  const note = h('textarea', {
    rows: 5,
    value: privateNote.get(),
    placeholder:
      "What should the group's choice work around? e.g. I'm sober, budget about $20, need step-free access…",
  });
  const out = h('div');
  const showProfile = (p: PrivateProfile) => {
    const json = h('textarea', { rows: 14, class: 'mono', value: JSON.stringify(p, null, 2) });
    out.replaceChildren(
      h('h3', {}, "Here's what your device understood"),
      h('p', { class: 'muted' }, 'Fix anything that is wrong. This stays in this browser.'),
      json,
      h(
        'button',
        {
          class: 'primary',
          onclick: () => {
            try {
              privateProfile.set(sanitizeProfile(JSON.parse(json.value)));
              out.append(h('p', { class: 'ok' }, 'Saved on this device.'));
            } catch {
              out.append(h('p', { class: 'err' }, 'That is not valid JSON.'));
            }
          },
        },
        'Looks right',
      ),
    );
  };

  root.append(
    h(
      'section',
      {},
      h('h2', {}, 'Only my device knows'),
      h(
        'p',
        { class: 'muted' },
        'Write what matters to you. It is stored in this browser and read by the AI model on this device only. It is never uploaded.',
      ),
      note,
      h(
        'button',
        {
          class: 'primary',
          onclick: async () => {
            privateNote.set(note.value);
            out.replaceChildren(h('p', { class: 'muted' }, 'Reading on this device…'));
            try {
              showProfile(await understandNote(note.value));
            } catch (e) {
              if (e instanceof PrivateAIUnavailable) {
                out.replaceChildren(
                  h(
                    'p',
                    { class: 'err' },
                    `On-device AI isn't available here (${e.state}). Your note was not sent anywhere.`,
                  ),
                  h('p', { class: 'muted' }, 'You can fill in the profile by hand instead:'),
                );
                showProfile(privateProfile.get() ?? emptyProfile());
              } else out.replaceChildren(h('p', { class: 'err' }, (e as Error).message));
            }
          },
        },
        'Understand my note (on this device)',
      ),
      h(
        'button',
        {
          onclick: () => {
            privateNote.set('');
            privateProfile.set(null);
            refresh();
          },
        },
        'Delete my note',
      ),
      out,
    ),
  );
  const saved = privateProfile.get();
  if (saved) showProfile(saved);
}
