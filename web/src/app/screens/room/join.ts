import { displayName, privateProfile } from '../../../data/notes';
import { joinRoom } from '../../../data/rooms';
import { h } from '../../../ui/dom';
import type { RoomCtx } from './context';

/** Shown to someone who opened the link but hasn't joined yet. */
export function joinCard(ctx: RoomCtx): HTMLElement {
  const name = h('input', { value: displayName.get(), placeholder: 'Your name' });
  const hasProfile = !!privateProfile.get();
  return h(
    'div',
    { class: 'card' },
    h(
      'p',
      {},
      hasProfile
        ? 'Your private profile on this device will decide for you. Nothing about it is shared.'
        : 'Tip: add a private note first so your device can decide for you. Or just vote by hand.',
    ),
    !hasProfile && h('a', { href: '/app/note' }, 'Write my private note'),
    name,
    h(
      'button',
      {
        class: 'primary',
        onclick: async () => {
          displayName.set(name.value);
          await joinRoom(ctx.id, name.value, hasProfile ? 'ai' : 'swipe');
          ctx.joined();
        },
      },
      'Join',
    ),
  );
}
