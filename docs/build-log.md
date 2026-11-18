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

## Open items

- On-device call in a real Chrome profile (hardware check on the dev Mac is pending).
- Maps-grounded candidate search on the free tier (currently the demo list).
- Android and iOS clients (plan days 5 to 7).
