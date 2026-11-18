# Veto for Android (to build: plan days 5–6)

Kotlin + Jetpack Compose. Not scaffolded yet: the Gradle project should be created in Android Studio,
then follow this file. Everything here must match the web client's contract.

## Pinned dependencies (as of Nov 17, 2026)

```kotlin
// firebase-ai-ondevice is NOT in the Firebase BoM; pin both versions explicitly.
implementation("com.google.firebase:firebase-ai:18.2.0")
implementation("com.google.firebase:firebase-ai-ondevice:16.0.0-beta08")
ksp("com.google.firebase:firebase-ai-ksp-processor:17.0.0")   // @Generable structured output
implementation(platform("com.google.firebase:firebase-bom:<latest>"))
implementation("com.google.firebase:firebase-firestore")
implementation("com.google.firebase:firebase-auth")
implementation("com.google.firebase:firebase-config")
implementation("com.google.firebase:firebase-appcheck-playintegrity")
debugImplementation("com.google.firebase:firebase-appcheck-debug:20.1.0")
```

Put `google-services.json` in `android/app/` (git-ignored).

## The contract (shared with web and iOS)

- Vocabulary: `../shared/attributes.v1.json`.
- Firestore layout and write shapes: see the header of `../firebase/firestore.rules`. Every write must
  match one of those shapes exactly or the rules reject it.
- Ballot → increments and ranking: port `../web/src/domain/tally.ts`.
- Hard rules: port `../web/src/domain/matcher.ts`, and run every case in `../eval/notes.sample.json` as a unit
  test (gold profile → expected vetoes). The ports must agree exactly.
- Room links: `https://<project>.web.app/r/<roomId>` (set up App Links for this path).

## On-device rules for this app

- Private calls (understand my note, soft fit) use `InferenceMode.ONLY_ON_DEVICE`. Before each call,
  check the on-device model status is AVAILABLE. After it, require
  `response.inferenceSource == InferenceSource.ON_DEVICE`, or discard the result.
- If no on-device model: the member votes by hand. Never fall back to the cloud for private data.
- Use the STABLE model option. PREVIEW (Nano 4 Full/Fast) needs AICore Developer Preview enrollment,
  which judges' phones won't have.
- Inference only works while the app is in the foreground (`BACKGROUND_USE_BLOCKED` otherwise). Handle
  `BUSY` and battery-quota errors with backoff.
- Keep input under ~4,000 tokens and output under ~256 tokens. The fit schema `{scores:[{i,s}]}` is
  compact on purpose.
- Structured output: `generateObject()` with `@Generable` / `@Guide` data classes (each needs an empty
  `companion object`; wrap enums in a data class). Use -1 for "unknown/none" numbers, as on web.
- Check status and download the model at startup (see `FriendlyMeals-Android`'s view model for the
  pattern), and show progress.

API names above come from the Firebase release notes and the FriendlyMeals sample. Confirm them in the
day-5 spike before building screens.

## Screens

Join (from link) → My private note (+ "what your device understood") → Room (lobby / voting / results)
→ What left my device. The host flow is optional on Android; web can host.
