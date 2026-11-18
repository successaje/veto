# Build log

Milestones in the order they landed. Dates are 2026. The plan this follows runs from day 0
(Tue Nov 17) to submission (Mon Nov 30, 10 AM PT).

| Date   | Milestone                                                                                    |
| ------ | -------------------------------------------------------------------------------------------- |
| Nov 17 | Repository scaffolded: rules, shared vocabulary, web client with five AI calls, eval data    |
| Nov 17 | Firestore rules verified against the emulator: 11 tests for the privacy guarantees           |
| Nov 17 | Firebase project live: Firestore (eur3), rules, Remote Config, anonymous auth, AI Logic      |
| Nov 18 | First real cloud call (`gemini-3.5-flash-lite`) and a full room run against the live project |
| Nov 18 | Fixed: tally read before the server confirmed results; retry states for sign-in and results  |
| Nov 18 | CI, formatting and contribution conventions                                                  |
| Nov 18 | Product model written: flows, routes, error states                                           |
| Nov 18 | Module structure (domain, data, ai, app, ui) and real URLs (`/app`, `/r/:id`)                |
| Nov 18 | Design system: tokens, self-hosted fonts, icons, components; every screen redesigned         |
| Nov 18 | Landing page at `/`, static and Firebase-free                                                |
| Nov 18 | Your rooms on the app home, one-tap voting by hand, staged sending, offline state            |
| Nov 18 | Private profile editor with a plain-language read-back, replacing raw JSON                   |
| Nov 18 | Fixed before first deploy: App Check debug token was inlined into production bundles         |
| Nov 18 | Live on Hosting with App Check (reCAPTCHA Enterprise); full room verified on the live site   |
| Nov 18 | Maps grounding probed (needs billing); source links per place; labelled demo fallback        |

## Open items

- On-device call in a real Chrome profile (hardware check on the dev Mac is pending), then eval numbers.
- Switch on Maps grounding: billing, a budget alert and a TTL on stored results first
  ([maps-grounding.md](maps-grounding.md)).
- Enforce App Check for Firestore and AI Logic once real-browser traffic shows valid tokens.
- Android and iOS clients (plan days 5 to 7).
