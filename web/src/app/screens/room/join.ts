import { displayName, privateProfile } from '../../../data/notes';
import { joinRoom } from '../../../data/rooms';
import { busy, button, field, linkButton, notice } from '../../../ui/components';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** Shown to someone who opened the link but hasn't joined yet. */
export function joinCard(ctx: RoomCtx): HTMLElement {
  const hasProfile = !!privateProfile.get();
  const name = h('input', { value: displayName.get(), placeholder: 'How the group knows you' });
  const error = h('div');

  if (ctx.room.status !== 'lobby') {
    const decided = ctx.room.status === 'results';
    return h(
      'div',
      { class: 'stack' },
      notice(
        'info',
        decided ? 'This group has already decided.' : 'This vote has already started.',
        decided
          ? 'Only people who took part can see the result.'
          : 'New people can’t join once voting begins. Ask the host to start a new room.',
      ),
      h('div', {}, linkButton('Plan something new', '/app', { iconAfter: 'arrowRight' })),
    );
  }

  const join = button('Join the room', {
    variant: 'primary',
    iconAfter: 'arrowRight',
    onClick: () =>
      void busy(join, 'Joining…', async () => {
        error.replaceChildren();
        try {
          displayName.set(name.value.trim());
          await joinRoom(ctx.id, name.value.trim() || 'Guest', hasProfile ? 'ai' : 'swipe');
          ctx.joined();
        } catch {
          error.replaceChildren(
            notice('error', 'Couldn’t join.', 'The vote may have just started. Refresh to check.'),
          );
        }
      }),
  });

  return h(
    'div',
    { class: 'panel stack', style: '--stack: var(--s-5)' },
    h(
      'p',
      { class: 'lede' },
      'Your reasons stay on this device. The group only learns what works for everyone.',
    ),
    hasProfile
      ? notice('good', 'Your private note is ready.', 'Your device will check the options for you.')
      : notice(
          'info',
          'No private note on this device yet.',
          h(
            'span',
            {},
            'Write one so your device can decide for you, or join and vote by hand. ',
            h('a', { href: '/app/note' }, 'Write my private note'),
          ),
        ),
    field('Your name', name),
    error,
    h('div', { class: 'cluster' }, join, hasProfile ? null : linkButton('Write a note first', '/app/note')),
  );
}
