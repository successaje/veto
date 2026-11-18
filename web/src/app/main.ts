import '../style.css';
import { ready } from '../data/firebase';
import { h } from '../ui/dom';
import { devicePill, refreshDeviceState } from './device-status';
import { route, startRouter } from './router';
import { homeScreen } from './screens/home';
import { noteScreen } from './screens/note';
import { privacyScreen } from './screens/privacy';
import { roomScreen } from './screens/room';

route('/', homeScreen);
route('/note', noteScreen);
route('/ledger', privacyScreen);
route('/r/:roomId', roomScreen);

const root = document.querySelector<HTMLDivElement>('#app')!;
const main = h('main');
root.append(
  h(
    'header',
    {},
    h('a', { href: '#/', class: 'logo' }, 'Veto'),
    h(
      'nav',
      {},
      h('a', { href: '#/note' }, 'My private note'),
      h('a', { href: '#/ledger' }, 'What left my device'),
    ),
    devicePill,
  ),
  main,
);

// Shareable links use a real path (/r/<id>) so Android App Links and iOS Universal Links can claim them.
const pathRoom = location.pathname.match(/^\/r\/([A-Za-z0-9]+)/)?.[1];
if (pathRoom) history.replaceState(null, '', `/#/r/${pathRoom}`);

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
