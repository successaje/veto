import './style.css';
import { emptyProfile, type Candidate, type PrivateProfile, type RoomSpec } from './domain/attrs';
import {
  decidePrivately,
  explainWinner,
  findCandidates,
  parseRoomSpec,
  understandNote,
  type Source,
} from './ai/features';
import { deviceState, downloadPrivateModel, PrivateAIUnavailable, type DeviceState } from './ai/gate';
import { onDeviceOnly } from './ai/models';
import { PROFILE_SYSTEM } from './ai/prompts';
import { sanitizeProfile } from './ai/normalize';
import { ready, uid } from './data/firebase';
import { clearLedger, entries, onLedgerChange, type LedgerEntry } from './data/ledger';
import { displayName, myDecision, privateNote, privateProfile } from './data/notes';
import {
  createRoom,
  getCandidates,
  isMember,
  joinRoom,
  readTally,
  startVoting,
  submitBallot,
  tryReveal,
  watchMembers,
  watchRoom,
  type CandidateDoc,
  type Member,
  type Room,
} from './data/rooms';
import { rank, type Choice } from './domain/tally';

// ---------- tiny DOM helper ----------
type Child = Node | string | number | null | undefined | false;
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'value' || k === 'disabled' || k === 'checked')
      (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const badge = (s: Source) =>
  h('span', { class: `badge ${s}` }, s === 'on_device' ? '🔒 on this device' : '☁️ cloud');

const root = document.querySelector<HTMLDivElement>('#app')!;
const main = h('main');
const pill = h('span', { class: 'pill' }, 'Checking private AI…');
let cleanups: (() => void)[] = [];

// ---------- private AI status ----------
let state: DeviceState = 'no-api';
async function refreshState() {
  state = await deviceState();
  pill.replaceChildren();
  if (state === 'available') pill.append('🔒 Private AI ready');
  else if (state === 'downloadable' || state === 'downloading') {
    const btn = h(
      'button',
      { class: 'link', onclick: () => void enablePrivateAI(btn) },
      'Enable private AI (one-time download)',
    );
    pill.append(btn);
  } else pill.append('No on-device AI in this browser · you can still vote by hand');
}
async function enablePrivateAI(btn: HTMLButtonElement) {
  // Chrome only starts the model download after a user gesture, so this runs from a click.
  btn.disabled = true;
  await downloadPrivateModel(
    onDeviceOnly(PROFILE_SYSTEM),
    (p) => (btn.textContent = `Downloading… ${Math.round(p * 100)}%`),
  );
  await refreshState();
}

// ---------- routing ----------
function route() {
  cleanups.forEach((f) => f());
  cleanups = [];
  main.replaceChildren();
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/r\/([A-Za-z0-9]+)/);
  if (m) void roomScreen(m[1]);
  else if (hash.startsWith('#/note')) noteScreen();
  else if (hash.startsWith('#/ledger')) ledgerScreen();
  else homeScreen();
}

// ---------- home: create or join ----------
function homeScreen() {
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
      status.replaceChildren('Room details ', badge(source));
      form.replaceChildren(specForm(spec));
    } catch (e) {
      status.textContent = `Couldn't read that: ${(e as Error).message}`;
    }
  }

  main.append(
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
            if (id) location.hash = `#/r/${id}`;
          },
        },
        'Open',
      ),
    ),
  );
}

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
          location.hash = `#/r/${id}`;
        },
      },
      'Create room',
    ),
  );
}

// ---------- my private note ----------
function noteScreen() {
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

  main.append(
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
            route();
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

// ---------- ledger ----------
function ledgerScreen() {
  const list = h('div');
  const icon: Record<LedgerEntry['kind'], string> = {
    'device-ai': '🔒',
    'cloud-ai': '☁️',
    firestore: '🗄️',
    local: '📦',
    blocked: '⛔',
  };
  const render = () =>
    list.replaceChildren(
      ...entries().map((e) =>
        h(
          'div',
          { class: `row ${e.kind}` },
          h('span', {}, icon[e.kind]),
          h('strong', {}, e.feature),
          h('span', {}, e.detail),
          h('time', { class: 'muted' }, new Date(e.at).toLocaleTimeString()),
        ),
      ),
    );
  render();
  cleanups.push(onLedgerChange(render));
  main.append(
    h(
      'section',
      {},
      h('h2', {}, 'What left my device'),
      h(
        'p',
        { class: 'muted' },
        'Every AI call and database write this browser made. Your private note never appears here because it never leaves.',
      ),
      h('button', { onclick: clearLedger }, 'Clear'),
      list,
    ),
  );
}

// ---------- room ----------
async function roomScreen(id: string) {
  let room: Room | null = null;
  let members: Member[] = [];
  let cands: CandidateDoc | null = null;
  let member = await isMember(id);
  const view = h('div');
  main.append(view);

  const subscribeMembers = () => cleanups.push(watchMembers(id, (m) => ((members = m), render())));
  cleanups.push(
    watchRoom(id, async (r) => {
      room = r;
      if (r && r.status !== 'lobby' && !cands && member) cands = await getCandidates(id);
      if (r?.status === 'voting' && r.submitted === r.expected && member) await tryReveal(id);
      render();
    }),
  );
  if (member) subscribeMembers();

  function render() {
    if (!room) return view.replaceChildren(h('p', {}, 'Room not found.'));
    const header = h(
      'div',
      { class: 'card' },
      h('h2', {}, room.spec.title),
      h('p', {}, `${room.spec.when} · ${room.spec.area} · ${room.spec.vibe}`),
    );
    if (!member) return view.replaceChildren(header, joinCard());
    if (room.status === 'lobby') return view.replaceChildren(header, lobby(room));
    if (room.status === 'voting') return view.replaceChildren(header, voting(room));
    view.replaceChildren(header, results());
  }

  function joinCard() {
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
      !hasProfile && h('a', { href: '#/note' }, 'Write my private note'),
      name,
      h(
        'button',
        {
          class: 'primary',
          onclick: async () => {
            displayName.set(name.value);
            await joinRoom(id, name.value, hasProfile ? 'ai' : 'swipe');
            member = true;
            subscribeMembers();
            render();
          },
        },
        'Join',
      ),
    );
  }

  function lobby(r: Room) {
    const isHost = r.hostUid === uid();
    const status = h('p', { class: 'muted' });
    const invite = `${location.origin}/r/${id}`;
    return h(
      'div',
      { class: 'card' },
      h('p', {}, 'Invite link: ', h('code', {}, invite)),
      h('button', { onclick: () => void navigator.clipboard.writeText(invite) }, 'Copy link'),
      h('h3', {}, `${members.length} here`),
      h('ul', {}, ...members.map((m) => h('li', {}, m.name, m.mode === 'ai' ? ' 🔒' : ' ✋'))),
      isHost
        ? h(
            'button',
            {
              class: 'primary',
              onclick: async () => {
                status.textContent = 'Finding options from the public details only…';
                try {
                  const found = await findCandidates(r.spec);
                  await startVoting(id, found);
                } catch (e) {
                  status.textContent = `Couldn't start: ${(e as Error).message}`;
                }
              },
            },
            'Find options & start voting',
          )
        : h('p', { class: 'muted' }, 'Waiting for the host to start.'),
      status,
    );
  }

  function candidateRow(c: Candidate, extra?: Child) {
    return h(
      'div',
      { class: 'cand' },
      h(
        'div',
        {},
        h('strong', {}, c.name),
        ' ',
        h('span', { class: 'muted' }, `${c.area} · ${'$'.repeat(c.priceBand)}`),
        h('p', { class: 'muted small' }, c.evidence),
        c.mapsUri && h('a', { href: c.mapsUri, target: '_blank', rel: 'noopener' }, 'Open in Google Maps'),
      ),
      extra,
    );
  }

  function voting(r: Room) {
    const items = cands?.items ?? [];
    const mine = myDecision.get(id);
    const wrap = h(
      'div',
      { class: 'card' },
      h('p', { class: 'muted' }, `${r.submitted} of ${r.expected} have decided.`),
    );
    if (mine.voted) {
      wrap.append(h('p', {}, '✅ Your anonymous vote is in. Your reasons stayed on this device.'));
      return wrap;
    }
    const profile = privateProfile.get();
    if (profile) wrap.append(decideWithProfile(profile, items));
    else wrap.append(decideByHand(items));
    if (cands?.attributions?.length) {
      wrap.append(
        h(
          'p',
          { class: 'small muted' },
          'Sources: ',
          ...cands.attributions.map((a) =>
            h('a', { href: a.uri, target: '_blank', rel: 'noopener' }, `${a.title} `),
          ),
          '(Google Maps)',
        ),
      );
    }
    return wrap;
  }

  function decideWithProfile(profile: PrivateProfile, items: Candidate[]) {
    const out = h('div', {}, ...items.map((c) => candidateRow(c)));
    const btn = h(
      'button',
      {
        class: 'primary',
        onclick: async () => {
          btn.disabled = true;
          btn.textContent = 'Thinking privately on this device…';
          const d = await decidePrivately(profile, items);
          out.replaceChildren(
            h('p', { class: 'muted' }, 'Only you can see this. The group only gets anonymous counts.'),
            ...items.map((c) => {
              const det = d.details[c.i];
              return candidateRow(
                c,
                det.veto
                  ? h('span', { class: 'veto' }, `✗ ${det.reasons.join(', ')}`)
                  : h(
                      'span',
                      { class: 'ok' },
                      `✓ ${'★'.repeat(det.score ?? 0) || 'ok'}`,
                      det.confirm.length
                        ? h('span', { class: 'small muted' }, ` · check: ${det.confirm.join(', ')}`)
                        : null,
                    ),
              );
            }),
            h(
              'button',
              {
                class: 'primary',
                onclick: async () => {
                  await submitBallot(id, d.choices);
                  myDecision.set(id, { voted: true, choices: d.choices, details: d.details });
                  render();
                },
              },
              'Send my anonymous vote',
            ),
          );
        },
      },
      'Decide privately on this device',
    );
    return h('div', {}, btn, out);
  }

  function decideByHand(items: Candidate[]) {
    const picks = new Map<number, Choice>();
    const send = h('button', { class: 'primary', disabled: true }, 'Send my anonymous vote');
    send.addEventListener('click', async () => {
      const choices = [...picks.values()];
      await submitBallot(id, choices);
      myDecision.set(id, { voted: true, choices });
      render();
    });
    const options: [string, Choice['veto'], 0 | 1 | 2 | 3][] = [
      ["Can't do it", true, 0],
      ['Meh', false, 1],
      ['Good', false, 2],
      ['Love it', false, 3],
    ];
    return h(
      'div',
      {},
      ...items.map((c) => {
        const buttons = options.map(([label, veto, score]) =>
          h(
            'button',
            {
              class: 'chip',
              onclick: (ev: Event) => {
                picks.set(c.i, veto ? { i: c.i, veto: true } : { i: c.i, veto: false, score });
                (ev.target as HTMLElement).parentElement
                  ?.querySelectorAll('.chip')
                  .forEach((b) => b.classList.remove('on'));
                (ev.target as HTMLElement).classList.add('on');
                send.disabled = picks.size < items.length;
              },
            },
            label,
          ),
        );
        return candidateRow(c, h('div', { class: 'chips' }, ...buttons));
      }),
      send,
    );
  }

  function results() {
    const box = h('div', { class: 'card' }, h('p', {}, 'Counting…'));
    void (async () => {
      let tally;
      try {
        tally = await readTally(id);
      } catch {
        box.replaceChildren(
          h('p', { class: 'err' }, "Couldn't load the results yet."),
          h('button', { onclick: () => render() }, 'Try again'),
        );
        return;
      }
      const items = cands?.items ?? (await getCandidates(id))?.items ?? [];
      const rk = rank(tally, items.length);
      if (rk.winner == null) {
        box.replaceChildren(
          h('h3', {}, 'Nothing on this list works for everyone.'),
          h(
            'p',
            { class: 'muted' },
            'Nobody has to say why. The host can start a new room with different options.',
          ),
        );
        return;
      }
      const win = items[rk.winner];
      const mine = myDecision.get(id).details?.[win.i];
      const why = h('p', { class: 'muted' }, 'Writing a short summary…');
      box.replaceChildren(
        h(
          'div',
          {},
          h('h3', {}, '✨ Works for everyone'),
          candidateRow(win),
          why,
          mine?.confirm.length
            ? h('p', { class: 'small' }, `Just for you: you might want to check ${mine.confirm.join(', ')}.`)
            : null,
          h(
            'p',
            { class: 'muted small' },
            `${rk.ruledOut} option${rk.ruledOut === 1 ? '' : 's'} didn't work for someone. Nobody had to explain.`,
          ),
          rk.order.length > 1 &&
            h(
              'details',
              {},
              h('summary', {}, 'Other options that work'),
              ...rk.order.slice(1).map((i) => candidateRow(items[i])),
            ),
        ),
      );
      try {
        const ex = await explainWinner(win, room!.spec);
        why.replaceChildren(ex.text, ' ', badge(ex.source));
      } catch {
        why.textContent = '';
      }
    })();
    return box;
  }
}

// ---------- boot ----------
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
    pill,
  ),
  main,
);
window.addEventListener('hashchange', route);
// Shareable links use a real path (/r/<id>) so Android App Links and iOS Universal Links can claim them.
const pathRoom = location.pathname.match(/^\/r\/([A-Za-z0-9]+)/)?.[1];
if (pathRoom) history.replaceState(null, '', `/#/r/${pathRoom}`);
void (async () => {
  await refreshState(); // on-device status doesn't need the network
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
  route();
})();
