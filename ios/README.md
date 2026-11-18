# Veto for iOS (stretch: plan day 7)

SwiftUI, **joiner only**: join a room from a link, keep a private note, decide on-device, vote, see
results. Hosting stays on web/Android. Needs an iPhone with Apple Intelligence (iPhone 15 Pro or later).

## Pick an SDK path on day 7 (spike both if needed)

**Path A (try first): firebase-ios-sdk 12.19.3, pinned.**
- firebase-ios-sdk 13.0.0 (Oct 7, 2026) removed `HybridModel` and `FirebaseAI.SystemLanguageModel`.
  Pin 12.19.x to keep them.
- Use a session on the on-device model only (Apple Foundation Models through Firebase). This is clearly
  "via Firebase AI Logic".
- Verify which model answered with `response.rawResponse.modelVersion`
  (`"apple-foundation-models-system-language-model"` means on device).
- Limits: text only, about 4,096 tokens. Firebase lists structured output on this path with docs
  "coming soon", so confirm it works in the spike.

**Path B: firebase-ios-sdk 13.x + iOS 27 / Xcode 27.**
- Private calls use Apple's `LanguageModelSession(model: SystemLanguageModel.default)` with `@Generable`.
- Firebase's `geminiLanguageModel(name:)` provides Gemini inside the same API if iOS ever needs the cloud.
- Routing is manual on this path.
- Ask in the Devpost Discord #hackathon-help whether Path B satisfies "via Firebase AI Logic" before
  committing to it.

## The contract

Same as Android: `../shared/attributes.v1.json`, the write shapes in `../firebase/firestore.rules`,
ports of `../web/src/tally.ts` and `../web/src/matcher.ts`, and the cases in `../eval/notes.sample.json`
as unit tests. Room links: `https://<project>.web.app/r/<roomId>` (Universal Links).

App Check: App Attest provider, debug provider for development. `GoogleService-Info.plist` is git-ignored.

If there is no Apple Intelligence on the device, vote by hand. Never send the private note to the cloud.
