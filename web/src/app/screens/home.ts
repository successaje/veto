import { parseRoomSpec } from '../../ai/features';
import { displayName, privateProfile } from '../../data/notes';
import { createRoom, joinRoom } from '../../data/rooms';
import type { RoomSpec } from '../../domain/attrs';
import { sourceBadge } from '../../ui/candidate';
import { h } from '../../ui/dom';
import { navigate, type ScreenContext } from '../router';

/** Start a plan (host) or open an invite (member). */
export function homeScreen({ root }: ScreenContext): void {
  const plan = h('textarea', {
    rows: 3,
    placeholder: 'Dinner Saturday 7pm near Riverside for 4, something relaxed',
  });
  const form = h('div');
  const status = h('p', { class: 'muted' });
  const join = h('input', { placeholder: 'Paste an invite link' });

  async function setUp() {
    status.textContent = 'Reading your plan…';
    try {
      const { spec, source } = await parseRoomSpec(plan.value || plan.placeholder);
      status.replaceChildren('Room details ', sourceBadge(source));
      form.replaceChildren(specForm(spec));
    } catch (e) {
      status.textContent = `Couldn't read that: ${(e as Error).message}`;
    }
  }

  root.append(
    h(
      'section',
      {},
      h('h2', {}, 'Plan something together'),
      h(
        'p',
        { class: 'muted' },
        'Everyone keeps their reasons on their own device. The group only learns what works for all.',
      ),
      plan,
      h('button', { onclick: () => void setUp() }, 'Set up room'),
      status,
      form,
    ),
    h(
      'section',
      {},
      h('h3', {}, 'Got an invite?'),
      join,
      h(
        'button',
        {
          onclick: () => {
            const id = join.value.match(/r\/([A-Za-z0-9]+)/)?.[1] ?? join.value.trim();
            if (id) navigate(`/r/${id}`);
          },
        },
        'Open',
      ),
    ),
  );
}

/** The public room details, editable before the room is created. */
function specForm(spec: RoomSpec): HTMLElement {
  const field = (label: string, input: HTMLInputElement) => h('label', {}, label, input);
  const title = h('input', { value: spec.title });
  const area = h('input', { value: spec.area });
  const when = h('input', { value: spec.when });
  const size = h('input', { type: 'number', min: 2, max: 20, value: String(spec.groupSize) });
  const vibe = h('input', { value: spec.vibe });
  const name = h('input', { value: displayName.get(), placeholder: 'Your name' });
  return h(
    'div',
    { class: 'card' },
    field('Title', title),
    field('Area', area),
    field('When', when),
    field('People', size),
    field('Vibe', vibe),
    field('Your name', name),
    h(
      'p',
      { class: 'muted' },
      'These details are public to the room and are what the cloud sees when finding options.',
    ),
    h(
      'button',
      {
        class: 'primary',
        onclick: async () => {
          displayName.set(name.value);
          const id = await createRoom({
            title: title.value,
            area: area.value,
            when: when.value,
            groupSize: Number(size.value) || 4,
            vibe: vibe.value,
          });
          await joinRoom(id, name.value, privateProfile.get() ? 'ai' : 'swipe');
          navigate(`/r/${id}`);
        },
      },
      'Create room',
    ),
  );
}
