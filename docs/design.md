# Design system

Veto is about discretion, so the interface should feel calm and trustworthy, closer to a well-made
paper menu than a dashboard. Tokens live in [`web/src/styles/tokens.css`](../web/src/styles/tokens.css);
components never hard-code colors, sizes or durations.

## Personality

- **Paper and ink.** Warm off-white surfaces, near-black text, hairline borders instead of heavy
  shadows. Dark mode is the same idea inverted, not a neon theme.
- **One accent, with a meaning.** Vermilion is the veto mark: the logo, a "Can't do it" answer, a
  struck-through option. It never decorates.
- **Two quiet signal colors.** Green means "on this device / works"; blue means "cloud". They appear
  only on the source tags and verdicts, so users learn them quickly.
- **Editorial type.** Fraunces for headings, Hanken Grotesk for interface text. Both are self-hosted
  (`@fontsource-variable/*`): a privacy product shouldn't call a font CDN.

## Scales

| Token family | Values                                                                |
| ------------ | --------------------------------------------------------------------- |
| Type         | 12 · 14 · 16 · 18 · 22 · 28 · 36 px, plus a fluid display size        |
| Space        | 4 px steps: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80        |
| Radius       | 6 (controls) · 10 (panels) · 14 · full (status pills only)            |
| Motion       | 120 ms (hover) · 200 ms (state) · 320 ms (enter), decelerating easing |
| Layout       | 40 rem reading column, 72 rem page, side column from 960 px           |
| Touch        | 44 px minimum target                                                  |

## Components

All in [`web/src/ui/components.ts`](../web/src/ui/components.ts) and
[`components.css`](../web/src/styles/components.css):

| Component        | Use                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `button`, `busy` | Primary (ink), secondary (outline), ghost, danger; busy shows a spinner and a verb ("Sending…") |
| `field`          | Label, control, hint wired with `for` and `aria-describedby`                                    |
| `notice`         | Inline message with a next step: info, good, warn, error                                        |
| `sourceTag`      | Where an AI answer was computed: "On this device" or "Cloud"                                    |
| `steps`          | Staged progress for multi-step work (start the vote, decide)                                    |
| `skeleton`       | Placeholder while data loads                                                                    |
| `emptyState`     | Why it's empty and what to do next                                                              |
| `toast`          | Brief confirmation ("Link copied"), announced to screen readers                                 |
| `optionItem`     | A place: name, area, price, evidence, and a verdict or vote control                             |
| segmented choice | Vote by hand: Can't do it · Meh · Good · Love it                                                |

## Rules

- Prefer sections divided by hairlines over stacks of cards. Panels are for the one thing the user
  is doing on that screen.
- Every async action shows what is happening in words, not just a spinner.
- Errors say what happened, what to do, and whether private data is safe.
- No emoji as icons. Icons are a small hand-drawn set in [`ui/icons.ts`](../web/src/ui/icons.ts),
  sized relative to their text.
- `prefers-reduced-motion` turns animation off entirely.
