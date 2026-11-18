import { parseRoomSpec } from '../../ai/features';
import { myRooms, nextAction, NEXT_LABEL, type RoomSummary } from '../../data/my-rooms';
import { icon } from '../../ui/icons';
import { displayName, privateProfile } from '../../data/notes';
import { createRoom, joinRoom } from '../../data/rooms';
import type { RoomSpec } from '../../domain/attrs';
import { busy, button, field, notice, pageHead, sourceTag } from '../../ui/components';
import { h } from '../../ui/dom';
import { navigate, type ScreenContext } from '../router';

const EXAMPLE = 'Dinner Saturday 7pm near Riverside for 4, something relaxed';

/** Start a plan (host) or open an invite (member). */
export function homeScreen({ root }: ScreenContext): void {
  const rooms = myRooms.list();
  const plan = h('textarea', { rows: 3, placeholder: EXAMPLE });
  const details = h('div');
  const planError = h('div');

  const setUp = button('Set up the room', {
    variant: 'primary',
    iconAfter: 'arrowRight',
    onClick: () =>
      void busy(setUp, 'Reading your plan…', async () => {
        planError.replaceChildren();
        try {
          const { spec, source } = await parseRoomSpec(plan.value.trim() || EXAMPLE);
          details.replaceChildren(specForm(spec, source));
          details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          planError.replaceChildren(
            notice('error', 'Couldn’t read that plan.', 'Try again, or fill in the details yourself.'),
          );
          details.replaceChildren(
            specForm({ title: '', area: '', when: '', groupSize: 4, vibe: '' } as RoomSpec, null),
          );
        }
      }),
  });

  const invite = h('input', { placeholder: 'Paste the link you were sent', inputmode: 'url' });
  const inviteError = h('p', { class: 'field-error', role: 'alert' });
  const openInvite = () => {
    const id = invite.value.match(/r\/([A-Za-z0-9]+)/)?.[1] ?? invite.value.trim();
    if (/^[A-Za-z0-9]{6,}$/.test(id)) navigate(`/r/${id}`);
    else inviteError.textContent = 'That doesn’t look like a Veto link.';
  };
  invite.addEventListener('keydown', (e) => e.key === 'Enter' && openInvite());

  root.append(
    pageHead(
      'Plan something',
      'Pick a place that works for everyone',
      'Describe the plan. Everyone you invite decides privately on their own device, and the group only learns what works for all.',
    ),
    h(
      'div',
      { class: 'split' },
      h(
        'section',
        { class: 'stack', style: '--stack: var(--s-6)', 'aria-label': 'New room' },
        h(
          'div',
          { class: 'panel stack' },
          field('What’s the plan?', plan, 'Only these public details are sent to the cloud to find options.'),
          h('div', {}, setUp),
          planError,
        ),
        details,
      ),
      h(
        'aside',
        { class: 'stack', style: '--stack: var(--s-6)' },
        rooms.length ? yourRooms(rooms) : null,
        h(
          'div',
          { class: 'stack', style: '--stack: var(--s-3)' },
          h('h2', { style: 'font-size: var(--text-lg)' }, 'Got an invite?'),
          invite,
          inviteError,
          button('Open room', { onClick: openInvite, iconAfter: 'arrowRight' }),
        ),
        rooms.length
          ? null
          : h(
              'div',
              { class: 'stack small', style: '--stack: var(--s-2)' },
              h('hr', { class: 'divider' }),
              h('p', { class: 'eyebrow' }, 'How it works'),
              h(
                'ol',
                { class: 'stack muted', style: '--stack: var(--s-2); margin: 0; padding-left: 1.1rem' },
                h('li', {}, 'You describe the plan and share a link.'),
                h('li', {}, 'Each person’s device checks the options against their private note.'),
                h('li', {}, 'Only anonymous counts are shared. The group sees what works for everyone.'),
              ),
            ),
      ),
    ),
  );
}

/** Rooms this device joined or started, with the member's next step. Stored locally only. */
function yourRooms(rooms: RoomSummary[]): HTMLElement {
  return h(
    'section',
    { class: 'stack', style: '--stack: var(--s-3)', 'aria-label': 'Your rooms' },
    h('h2', { style: 'font-size: var(--text-lg)' }, 'Your rooms'),
    h(
      'ul',
      { class: 'options' },
      ...rooms.slice(0, 6).map((r) => {
        const next = nextAction(r, r.host);
        const urgent = next === 'decide' || next === 'start';
        return h(
          'li',
          { class: 'option', style: 'padding: var(--s-3) 0' },
          h(
            'a',
            { href: `/r/${r.id}`, class: 'spread', style: 'text-decoration: none' },
            h(
              'span',
              { class: 'stack', style: '--stack: 0' },
              h('span', { style: 'font-weight: 650' }, r.title || 'Untitled plan'),
              h(
                'span',
                { class: 'small', style: `color: ${urgent ? 'var(--accent)' : 'var(--ink-3)'}` },
                [NEXT_LABEL[next], r.when].filter(Boolean).join(' · '),
              ),
            ),
            icon('chevronRight'),
          ),
        );
      }),
    ),
    h('p', { class: 'small muted' }, 'Kept on this device only.'),
  );
}

/** The public room details, editable before the room is created. */
function specForm(spec: RoomSpec, source: 'on_device' | 'in_cloud' | null): HTMLElement {
  const title = h('input', { value: spec.title, placeholder: 'Dinner', required: true });
  const area = h('input', { value: spec.area, placeholder: 'Neighborhood or address' });
  const when = h('input', { value: spec.when, placeholder: 'Saturday 7pm' });
  const size = h('input', {
    type: 'number',
    min: 2,
    max: 20,
    inputmode: 'numeric',
    value: String(spec.groupSize || 4),
  });
  const vibe = h('input', { value: spec.vibe, placeholder: 'Relaxed, quick, celebratory…' });
  const name = h('input', { value: displayName.get(), placeholder: 'How the group knows you' });
  const error = h('div');

  const create = button('Create room and get the link', {
    variant: 'primary',
    iconAfter: 'arrowRight',
    onClick: () =>
      void busy(create, 'Creating the room…', async () => {
        error.replaceChildren();
        if (!title.value.trim()) {
          title.focus();
          error.replaceChildren(notice('warn', 'Give the plan a title.', 'Something like “Dinner”.'));
          return;
        }
        try {
          displayName.set(name.value.trim());
          const id = await createRoom({
            title: title.value.trim(),
            area: area.value.trim(),
            when: when.value.trim(),
            groupSize: Number(size.value) || 4,
            vibe: vibe.value.trim(),
          });
          await joinRoom(id, name.value.trim() || 'Host', privateProfile.get() ? 'ai' : 'swipe');
          navigate(`/r/${id}`);
        } catch {
          error.replaceChildren(
            notice('error', 'The room wasn’t created.', 'Check your connection and try again.'),
          );
        }
      }),
  });

  return h(
    'div',
    { class: 'panel stack enter', style: '--stack: var(--s-5)' },
    h(
      'div',
      { class: 'spread' },
      h('h2', { style: 'font-size: var(--text-lg)' }, 'Room details'),
      source ? sourceTag(source) : null,
    ),
    field('Title', title),
    h('div', { class: 'field-row' }, field('When', when), field('Where', area)),
    h('div', { class: 'field-row' }, field('People', size), field('Vibe', vibe)),
    field('Your name', name),
    h(
      'p',
      { class: 'small muted' },
      'Everyone in the room sees these details, and they are the only thing the cloud sees when finding options.',
    ),
    error,
    h('div', {}, create),
  );
}
