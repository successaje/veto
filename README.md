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

Every answer shows where it ran (🔒 on this device / ☁️ cloud), read from `response.inferenceSource`.
The **What left my device** screen logs every AI call and database write.

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

| Data                                   | Where it lives                            | Who can see it                                    |
| -------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| Private note and profile               | This browser's local storage              | Only you                                          |
| Your reasons ("✗ centres on raw fish") | This browser                              | Only you                                          |
| Room details (title, area, time, vibe) | Firestore; sent to Gemini to find options | The room, Google                                  |
| Your vote                              | Anonymous increments to one shared tally  | Nobody until everyone has voted, then only totals |

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
  src/ui/                   DOM helper and shared views
eval/                       synthetic notes, candidate fixtures, expected vetoes
android/  ios/              native clients (see their READMEs)
docs/                       threat model, demo script
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

Tests:

```bash
cd web && npm test                          # matcher, tally, eval-label consistency
cd firebase && npm install && npm run test:rules   # security rules (needs Java 21+)
```

The Firestore emulator runs on port 8180, not the usual 8080, so it doesn't collide with other local
servers. With Homebrew's Java (keg-only), put it on the PATH first:
`export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`.

## Status

- [x] Shared vocabulary, deterministic matcher, tally and ranking (unit-tested)
- [x] Firestore security rules with tests for every privacy guarantee
- [x] Web app: rooms, private note, five AI calls, manual voting fallback, results, ledger
- [x] On-device eval page
- [ ] Day-1 spike on real hardware: on-device structured output, Maps grounding on the free tier
- [ ] Android client
- [ ] iOS client (joins rooms)
- [ ] Eval numbers, hosted demo, video

## License

[Apache 2.0](LICENSE)
