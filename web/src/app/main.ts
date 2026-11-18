import '@fontsource-variable/fraunces';
import '@fontsource-variable/hanken-grotesk';
import '../styles/app.css';
import { ready } from '../data/firebase';
import { button, notice, skeleton } from '../ui/components';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { deviceIndicator, refreshDeviceState } from './device-status';
import { onNavigate, route, startRouter, type ScreenContext } from './router';
import { homeScreen } from './screens/home';
import { noteScreen } from './screens/note';
import { privacyScreen } from './screens/privacy';
import { roomScreen } from './screens/room';

// Room links are real paths (/r/<id>) so Android App Links and iOS Universal Links can claim them.
route('/app', homeScreen);
route('/app/note', noteScreen);
route('/app/privacy', privacyScreen);
route('/r/:roomId', roomScreen);

const navLink = (href: string, iconName: 'pen' | 'eye', label: string) =>
  h('a', { href, title: label }, icon(iconName), h('span', { class: 'nav-label' }, label));
const nav = h(
  'nav',
  { class: 'app-nav', 'aria-label': 'Main' },
  navLink('/app/note', 'pen', 'Your note'),
  navLink('/app/privacy', 'eye', 'What left this device'),
);
onNavigate((path) =>
  nav.querySelectorAll('a').forEach((a) => {
    if (a.pathname === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }),
);

// Connection status. Firestore queues writes while offline, so say what that means for the user.
const offlineBanner = h(
  'div',
  { class: 'offline-banner', role: 'status', hidden: navigator.onLine },
  icon('alert'),
  'You’re offline. Your note is safe on this device; anything you send will go when you reconnect.',
);
addEventListener('offline', () => (offlineBanner.hidden = false));
addEventListener('online', () => (offlineBanner.hidden = true));

const main = h('main', { class: 'app-main', id: 'main' });
document
  .querySelector('#app')!
  .append(
    h(
      'header',
      { class: 'app-header' },
      h(
        'div',
        { class: 'app-header-inner' },
        h('a', { href: '/app', class: 'wordmark' }, icon('mark', 'wordmark-mark'), 'Veto'),
        nav,
        deviceIndicator,
      ),
      offlineBanner,
    ),
    main,
  );

function notFound({ root }: ScreenContext): void {
  root.append(
    h(
      'div',
      { class: 'state-screen' },
      h('h1', {}, 'Nothing here'),
      h('p', { class: 'muted' }, 'This page doesn’t exist. If someone sent you a link, check it with them.'),
      h('a', { class: 'btn btn-primary', href: '/app' }, 'Go to Veto'),
    ),
  );
}

main.append(
  h(
    'div',
    { class: 'state-screen', 'aria-busy': 'true' },
    h('p', { class: 'muted' }, 'Connecting…'),
    h('div', { style: 'width: 100%' }, skeleton(3)),
  ),
);

void (async () => {
  await refreshDeviceState(); // on-device status doesn't need the network
  try {
    await ready();
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'unknown';
    const offline = !navigator.onLine;
    main.replaceChildren(
      h(
        'div',
        { class: 'state-screen' },
        h('h1', {}, 'Can’t connect'),
        notice(
          'error',
          offline ? 'You’re offline.' : 'Veto couldn’t sign you in.',
          h(
            'span',
            {},
            'Your private note is safe on this device. ',
            offline ? 'Reconnect and try again.' : `Try again in a moment (${code}).`,
          ),
        ),
        button('Try again', { variant: 'primary', icon: 'refresh', onClick: () => location.reload() }),
      ),
    );
    return;
  }
  startRouter(main, notFound);
})();
