import '../style.css';
import { ready } from '../data/firebase';
import { h } from '../ui/dom';
import { devicePill, refreshDeviceState } from './device-status';
import { route, startRouter } from './router';
import { homeScreen } from './screens/home';
import { noteScreen } from './screens/note';
import { privacyScreen } from './screens/privacy';
import { roomScreen } from './screens/room';

// Room links are real paths (/r/<id>) so Android App Links and iOS Universal Links can claim them.
route('/app', homeScreen);
route('/app/note', noteScreen);
route('/app/privacy', privacyScreen);
route('/r/:roomId', roomScreen);

const root = document.querySelector<HTMLDivElement>('#app')!;
const main = h('main');
root.append(
  h(
    'header',
    {},
    h('a', { href: '/app', class: 'logo' }, 'Veto'),
    h(
      'nav',
      {},
      h('a', { href: '/app/note' }, 'My private note'),
      h('a', { href: '/app/privacy' }, 'What left my device'),
    ),
    devicePill,
  ),
  main,
);

void (async () => {
  await refreshDeviceState(); // on-device status doesn't need the network
  try {
    await ready();
  } catch (e) {
    const code = (e as { code?: string }).code ?? (e as Error).message;
    main.replaceChildren(
      h(
        'div',
        { class: 'card' },
        h('h2', {}, "Can't connect"),
        h('p', { class: 'err' }, `Couldn't sign in (${code}). Your private note is safe on this device.`),
        h('button', { class: 'primary', onclick: () => location.reload() }, 'Try again'),
      ),
    );
    return;
  }
  startRouter(main, homeScreen);
})();
