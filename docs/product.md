# Veto: product model

This is the reference for what Veto is and how it should behave. Screens, routes and copy are
derived from it. When the implementation and this document disagree, fix one of them on purpose.

## Thesis

Groups pick places badly because the real constraints are private. Someone is pregnant, someone
is sober, someone is broke until Friday, someone can't do stairs, someone's ex works at the bar.
Nobody wants to say it in the group chat, so the group picks somewhere that quietly fails a person.

Veto lets each person's phone say "not that one" on their behalf, without saying why. The group
only learns which options work for everyone.

## Core user

**The member**: anyone invited to a plan who has a reason they'd rather not explain. They didn't
choose to install anything; they tapped a link.

**The host** is a member who starts the room. Hosting is a thin role: describe the plan, share
the link, start the vote.

## Core action

> Decide on the options privately, in one tap, and trust that nothing about you left your phone.

Everything else (rooms, links, results) exists to get a member to that moment and back to the
group with an answer.

## The magical moment

Four people tap "Decide privately". A few seconds later:

> **Works for everyone: Green Bowl.** 3 options didn't work for someone. Nobody had to explain.

Then the proof: the "What left this device" log shows the note never went anywhere. The cloud saw
"dinner Saturday near Riverside, relaxed"; Firestore saw +1 on a few counters.

## Product loop

The private note is written once and reused in every room. The second time someone is invited,
deciding takes one tap and no typing. What brings people back is the next plan: the host shares
a Veto link instead of starting a poll, because last time nobody had to explain.

## Why hybrid AI is the point, not a feature

| Data                                   | Where it is processed       | Why                                                  |
| -------------------------------------- | --------------------------- | ---------------------------------------------------- |
| The plan ("dinner Sat near Riverside") | Cloud (or device if ready)  | Public to the room; needs world knowledge            |
| Finding options                        | Cloud only, with grounding  | Needs maps and current places; uses public text only |
| The private note                       | Device only, never cloud    | The promise                                          |
| Fit of each option against the note    | Device only, never cloud    | Derived from the note, so it is private too          |
| "Why this works" for the winner        | Device if ready, else cloud | Uses the winner's public attributes only             |

A cloud-only version can't make the promise. A device-only version can't find real places. Veto
needs both, and the routing is visible to the user through the 🔒 / ☁️ source on every result.

## Essential flows

### First visit (from a shared link)

1. The link opens the room, not a homepage. The room title, time and place are visible at once,
   so the member knows they're in the right place.
2. One short line explains the promise: "Your reasons stay on this phone."
3. Two ways in: write a private note (recommended), or join and vote by hand.

### First visit (direct)

The landing page explains the idea in one screen: the problem, the promise, a live-looking
example of the result, and one action: "Plan something".

### Onboarding: the private note

- A plain textarea with examples of the kind of things people write.
- Saving runs the on-device model and shows "Here's what your phone understood" as editable
  chips (avoid raw fish, needs step-free entry, under about $30). Editing the chips is how members
  fix mistakes, so it must be quick.
- If the device can't run the model: say so plainly, keep the note local, and explain that
  voting by hand works and is just as private.
- The model download (Chrome, one time, large) is offered from a click with visible progress
  and a clear size warning. It is never started silently.

### Authentication

Anonymous Firebase sign-in, invisible. The member never sees an account. A display name is
asked for when joining a room, prefilled from last time.

### Primary action: deciding

- **With a profile:** "Decide privately". Staged feedback: reading your note on this device →
  checking 10 options → done. Hard constraints are checked by code; the model only scores soft fit.
  The member sees their own result privately (works / doesn't work, and why, only to them) and
  confirms before sending.
- **By hand:** every option starts at a neutral "Fine". The member only touches what matters:
  "Can't do it", "Good", "Love it". Sending is always one tap away.

### Confirmation and sending

"Send my anonymous vote" with staged feedback: sealing your vote → sent → waiting for N more.
After sending, the member can't change it (one ballot per member is enforced by the rules), and
the screen says so before they send.

### Waiting

"3 of 4 have decided." Counts only; never who. The host sees the same thing as everyone else.

### Result

Revealed automatically when the last person sends. Winner first, with a short reason, then
"Other options that work" (collapsed), then "N options didn't work for someone". If nothing
works: say so kindly and offer the host a fresh round.

### History / returning user

The app home lists "Your rooms" (kept on this device only): title, when, and state (waiting for
you, waiting for others, decided). The private note persists. A returning member sees their next
action first.

### Error recovery

| Situation                                 | What the member sees                                             |
| ----------------------------------------- | ---------------------------------------------------------------- |
| No on-device AI in this browser           | Vote by hand; nothing is sent to the cloud instead               |
| Model download fails or is interrupted    | Retry button; voting by hand still available                     |
| Offline                                   | "You're offline. Your vote is saved and sends when you're back." |
| Room not found / link mistyped            | "This room doesn't exist. Check the link with whoever sent it."  |
| Room already voting when joining          | "This vote already started. Ask the host for the next one."      |
| Sign-in fails                             | "Can't connect" with retry; the note is safe on this device      |
| Cloud AI quota or error (finding options) | Host can retry; demo list available as a fallback                |
| Results not readable yet                  | "Couldn't load the results yet" with retry                       |

## Information architecture

| Route          | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `/`            | Landing page. Static, no Firebase, loads fast      |
| `/app`         | Start a plan, join with a link, your rooms         |
| `/app/note`    | Your private note and what your device understood  |
| `/app/privacy` | What left this device (the ledger)                 |
| `/r/:roomId`   | A room: join → lobby → deciding → waiting → result |

Room links are real paths (`/r/<id>`) so Android App Links and iOS Universal Links can claim them.

## Out of scope (v1)

Chat, accounts beyond anonymous sign-in, booking, a map view, push notifications, and learning
preferences over time. Each would either add surveillance or distract from the one promise.
