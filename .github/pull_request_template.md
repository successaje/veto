## What

<!-- What changed, in a few lines. -->

## Why

<!-- The problem this solves or the product goal it serves. -->

## UX impact

<!-- What changes for someone using Veto. "None" is a fine answer for internal work. -->

## Technical notes

<!-- Decisions worth knowing about: trade-offs, new modules, rules or schema changes. -->

## Testing

<!-- How this was verified: commands run, flows tried, widths checked. -->

- [ ] `npm run check` passes (format, types, unit tests, build)
- [ ] Rules tests pass if `firebase/` changed (`cd firebase && npm run test:rules`)
- [ ] Private data still never leaves the device (no new cloud path for notes or profiles)
