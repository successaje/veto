# Eval data

Synthetic people and fictional places only. Never add a real person's note.

- `candidates.sample.json`: 10 fictional places described in the shared vocabulary. Also the demo-safe
  candidate source (Remote Config `candidate_source = fixture`).
- `notes.sample.json`: private notes with the profile a perfect model would extract (`gold`) and the
  vetoes the matcher must produce from it (`expectedVetoes`), plus group scenarios.

Two levels of checking:

1. **Labels and rules** (`web/src/matcher.test.ts`, runs in CI): gold profiles → matcher → expected vetoes.
   Every platform's matcher port must pass these same cases.
2. **On-device model** (`web/eval.html`, Android and iOS debug screens): note → on-device profile → matcher
   → compare with expected vetoes. Report recall, precision, exact sets and latency per platform.

Grow the set to about 40 notes before tuning prompts. Include tricky negatives (someone who *likes* bars,
"I'm fine with anything", allergies that do not matter for these places).
