# Contributing to Veto

## The one rule

A member's private note, and anything derived from it, never leaves their device. Every change is
reviewed against that first. If a feature needs private data in the cloud, it doesn't ship.

## Branches

`main` is always deployable. Work happens on short-lived branches named for what they do:

| Prefix      | For                                         |
| ----------- | ------------------------------------------- |
| `feat/`     | User-facing capability                      |
| `fix/`      | A bug in existing behavior                  |
| `ui/`       | Visual or interaction work without new data |
| `refactor/` | Structure changes with no behavior change   |
| `chore/`    | Tooling, dependencies, CI                   |
| `docs/`     | Documentation only                          |

## Commits

Conventional style, present tense, one coherent step per commit:

```
feat: decide privately with the on-device profile
fix: read the tally only after the server confirms results
ui: stage the vote submission states
```

Formatting-only changes go in their own `style:` commit so reviews stay readable.

## Pull requests

Open a PR for every meaningful increment and fill in the template (What, Why, UX impact, Technical
notes, Testing). Before merging:

1. CI is green: formatting, types, unit tests, build, and the Firestore rules suite.
2. The diff has no stray files, secrets or debug output.
3. The affected flow was tried in a browser at phone and desktop widths.

Merge with a merge commit so the branch's history is kept, then delete the branch.

## Local checks

```bash
npm install && npm run check                  # format, types, unit tests, build
cd firebase && npm install && npm run test:rules   # security rules (Java 21+)
```
