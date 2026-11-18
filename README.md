# Veto

**Pick a place that works for everyone, without anyone having to explain why.**

Group plans fail on the things people won't say out loud: a pregnancy nobody knows about yet, a tight
budget, eight months sober, a wheelchair. In Veto, each person writes what matters in a private note that
never leaves their phone or laptop. The cloud finds options from the room's public details. Each device
then decides privately, and the group only receives anonymous counts. The answer is a place that works for
everyone, and nobody had to explain anything.

> The cloud knows the world. Your device knows you.

Built for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/) with
[Firebase AI Logic](https://firebase.google.com/docs/ai-logic/hybrid) hybrid inference.

## How it works

1. **The host describes the plan** ("dinner Saturday near Riverside, relaxed") and shares a link.
2. **Each member writes a private note once** (pregnant, sober, under $30, no stairs, not the Tap Room). Their
   device turns it into limits they can check and correct. The note never leaves the device.
3. **The cloud finds up to ten real places** from the public plan only.
4. **Each device decides privately.** Code rules out places that break a limit; the on-device model ranks
   the rest. The member sees their own result, then sends one vote made of anonymous +1s. No device AI?
   They vote by hand: every option starts at "Fine" and they change only what matters.
5. **When the last vote lands, everyone sees the winner** and how many options didn't work for someone.
   Nobody learns who ruled what out, or why.

The product model, with every flow and error state, is in [docs/product.md](docs/product.md).

## How Veto uses Firebase AI Logic

Each feature has its own model instance and inference mode. All five calls live in
[`web/src/ai/features.ts`](web/src/ai/features.ts); the model factories are in
[`web/src/ai/models.ts`](web/src/ai/models.ts).

| #   | Feature                                                                    | Who runs it | Mode                                         | What it sees                     | Why this mode                                                        |
| --- | -------------------------------------------------------------------------- | ----------- | -------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| 1   | Room helper: "dinner Saturday near Riverside, chill" → public room details | Host        | `PREFER_ON_DEVICE`                           | Public text                      | Free and instant on device; still works on any browser via the cloud |
| 2   | Find options                                                               | Host        | `ONLY_IN_CLOUD` + Grounding with Google Maps | The room's public details only   | Needs world knowledge and real places                                |
| 3   | Understand my note → private profile                                       | Each member | `ONLY_ON_DEVICE`                             | Their private note               | Private: must never leave the device                                 |
| 4   | Private fit check                                                          | Each member | Plain code + `ONLY_ON_DEVICE`                | Private profile + public options | Private: reasons never leave the device                              |
| 5   | Explain the pick                                                           | Anyone      | `PREFER_ON_DEVICE`                           | Public facts about the winner    | Public; on device when possible                                      |

Every AI answer is tagged with where it ran ("On this device" or "Cloud"), read from
`response.inferenceSource`. The **What left this device** screen (`/app/privacy`) logs every AI call and
database write, so anyone can check that the note never appears.

### "The model reads; code decides"

The on-device model only turns a messy private note into a structured profile, using a shared vocabulary
([`shared/attributes.v1.json`](shared/attributes.v1.json)) that the cloud also uses to describe places.
Hard rules ("no raw fish", "step-free entrance", "under $20") are then applied by plain, tested code in
[`web/src/domain/matcher.ts`](web/src/domain/matcher.ts), so they are predictable and identical on every platform. The
model scores only soft preferences. Members can read and correct what their device understood.

### Guarding `ONLY_ON_DEVICE`

In browsers without Chrome's Prompt API (Safari, Firefox, Chrome on Android), the Firebase JS SDK sends
`ONLY_ON_DEVICE` requests to the cloud instead of throwing. Veto checks for the on-device model itself
before every private call and discards any private answer whose `inferenceSource` is not `on_device`
([`web/src/ai/gate.ts`](web/src/ai/gate.ts)). Without on-device AI, members vote by hand; private notes
never fall back to the cloud.

## Privacy model

| Data                                    | Where it lives                            | Who can see it                                    |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Private note and profile                | This browser's local storage              | Only you                                          |
| Your verdicts ("not for you: raw fish") | This browser                              | Only you                                          |
| Room details (title, area, time, vibe)  | Firestore; sent to Gemini to find options | The room, Google                                  |
| Your vote                               | Anonymous increments to one shared tally  | Nobody until everyone has voted, then only totals |

The database enforces this ([`firebase/firestore.rules`](firebase/firestore.rules)):

- Each member can vote once.
- A vote is a bounded change: on each option, either one veto or a score from 0 to 3.
- Nobody, including the host, can read the tally until everyone has voted. This stops anyone diffing the
  counters after each vote to work out who vetoed what.

See [docs/threat-model.md](docs/threat-model.md) for what this does and does not protect against.

## Evaluation

| Platform         | Model                   | Cases | Exact veto sets | Hard-constraint recall | Precision | p50 latency |
| ---------------- | ----------------------- | ----- | --------------- | ---------------------- | --------- | ----------- |
| Chrome (desktop) | Gemini Nano             | 9     | _todo_          | _todo_                 | _todo_    | _todo_      |
| Android          | Gemini Nano (STABLE)    | 9     | _todo_          | _todo_                 | _todo_    | _todo_      |
| iOS              | Apple Foundation Models | 9     | _todo_          | _todo_                 | _todo_    | _todo_      |

Run the web eval at `/eval.html`. The dataset is in [`eval/`](eval/): synthetic people only.

## Architecture

```
/            landing page  (static HTML, no Firebase, ~1 KB of JS)
/app, /r/:id the app       (Vite + TypeScript, no framework)

app/   shell, router, screens ─┐
ui/    design-system components │ render
                               ▼
ai/    five AI calls ── gate.ts: on-device check before, inferenceSource check after
domain/ vocabulary · matcher (hard rules) · tally (ballot → +1s, ranking)   ← pure, unit-tested
data/  Firebase init · rooms (one write shape per security rule) · local notes · ledger
                               ▼
Firestore  rooms/{id} · members · public/candidates · ballots (content-free) · tally/main
           enforced by firebase/firestore.rules, tested against the emulator in CI
```

- **No server code.** Security rules carry every guarantee, so Veto runs on the Spark plan.
- **One vocabulary** ([`shared/attributes.v1.json`](shared/attributes.v1.json)) is used by cloud prompts,
  on-device prompts, the matcher and every platform. Android and iOS port `domain/` and must pass the same
  cases.
- **Remote Config** holds model names and the candidate source, so models can change without a release.
- **App Check** (reCAPTCHA Enterprise on web) protects the AI and Firestore endpoints.

Design decisions and the component inventory are in [docs/design.md](docs/design.md).

## Repository layout

```
shared/attributes.v1.json   vocabulary shared by cloud, device and every platform
firebase/                   Firestore rules + rules tests, Remote Config template
web/                        Chrome web app (Vite + TypeScript, no framework)
  index.html                landing page (static, no Firebase)
  app.html                  the app: /app, /app/note, /app/privacy, /r/:roomId
  src/domain/               pure logic: vocabulary, hard-constraint matcher, tally and ranking
  src/data/                 Firebase setup, rooms (one write per security rule), local notes, ledger
  src/ai/                   the five AI calls, on-device gate, schemas, prompts
  src/app/                  shell, History API router, device status, one module per screen
  src/ui/                   DOM helper, icons, design-system components
  src/styles/               tokens, base, components, app and landing styles
eval/                       synthetic notes, candidate fixtures, expected vetoes
android/  ios/              native clients (see their READMEs)
docs/                       product model, design system, threat model, demo script, build log
.github/                    CI (format, types, tests, build, rules) and the PR template
```

## Run it

Prerequisites: Node 24.12+ (the Firebase 13 SDK's minimum), a Firebase project, and for on-device AI a desktop Chrome that supports built-in
AI (22 GB free disk; GPU with more than 4 GB VRAM, or 16 GB RAM). Check `chrome://on-device-internals`.

1. In the Firebase console, enable **Firebase AI Logic** (Gemini Developer API), **Firestore**,
   **Authentication → Anonymous**, **App Check** (reCAPTCHA Enterprise for web), and **Remote Config**.
2. `cp web/.env.example web/.env.local` and fill in your web app config (`firebase apps:sdkconfig WEB`).
   The reCAPTCHA Enterprise site key is only needed for deployed builds; local development runs on the
   App Check debug token.
3. Deploy rules and config: `npx firebase-tools deploy --only firestore:rules,remoteconfig --project <id>`
4. Run: `cd web && npm install && npm run dev`, then open http://localhost:5173/app
5. Put a UUID in `VITE_APPCHECK_DEBUG_TOKEN` (or copy the one the browser console prints) and add it under
   App Check → Apps → your web app → Manage debug tokens. A fixed token works in every browser you test
   in. Never commit it.

Options come from a built-in demo list until you set Remote Config `candidate_source` to `maps`.

### Environment variables (`web/.env.local`)

| Variable                             | Required          | Where it comes from                                 |
| ------------------------------------ | ----------------- | --------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`              | Yes               | `firebase apps:sdkconfig WEB`                       |
| `VITE_FIREBASE_AUTH_DOMAIN`          | Yes               | same                                                |
| `VITE_FIREBASE_PROJECT_ID`           | Yes               | same                                                |
| `VITE_FIREBASE_APP_ID`               | Yes               | same                                                |
| `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` | Deployed builds   | App Check → your web app → reCAPTCHA Enterprise     |
| `VITE_APPCHECK_DEBUG_TOKEN`          | Local development | Any UUID, registered under App Check → debug tokens |

### Tests

```bash
npm install && npm run check                 # format, types, unit tests (matcher, tally, labels, rooms), build
cd firebase && npm install && npm run test:rules   # security rules against the emulator (Java 21+)
```

CI runs both on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

### Deploy

```bash
npm --prefix web run build
npx firebase-tools deploy --only hosting,firestore:rules,remoteconfig,auth --project <id>
```

Hosting serves the landing page at `/` and rewrites `/app/**` and `/r/**` to the app.

The Firestore emulator runs on port 8180, not the usual 8080, so it doesn't collide with other local
servers. With Homebrew's Java (keg-only), put it on the PATH first:
`export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`.

## Status

- [x] Shared vocabulary, deterministic matcher, tally and ranking (unit-tested)
- [x] Firestore security rules with tests for every privacy guarantee, run in CI
- [x] Web app: rooms, private note with a profile editor, five AI calls, one-tap manual voting, results,
      your rooms, privacy log, offline state
- [x] Design system and landing page
- [x] Live Firebase project: cloud AI call and a full room verified end to end
- [x] On-device eval page
- [ ] On-device run on real hardware: structured output and eval numbers
- [ ] Maps grounding on the free tier
- [ ] Android client
- [ ] iOS client (joins rooms)
- [ ] Eval numbers, hosted demo, video

## License

[Apache 2.0](LICENSE)
