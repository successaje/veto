# Threat model

## What Veto promises

1. Your private note, the profile your device derives from it, and your reasons never leave your device.
2. Other members (including the host) cannot learn how you voted.
3. The cloud model only sees the room's public details.

## How each promise is kept

| Promise                        | Mechanism                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Note never leaves              | Private calls use `ONLY_ON_DEVICE` behind a gate that checks for Chrome's Prompt API first (the SDK would otherwise silently use the cloud in browsers without it) and rejects any answer whose `inferenceSource` is not `on_device`. The note is stored only in `localStorage`. There is no Firestore field for it, and the security rules reject unknown fields. |
| Votes are anonymous to members | A vote is only increments to one shared tally. Ballot docs are content-free and unreadable. The tally is unreadable until `submitted == expected`, so members cannot diff counters between votes.                                                                                                                                                                  |
| Votes are bounded              | Rules allow +1 veto or +0..3 score per option, never both, once per member.                                                                                                                                                                                                                                                                                        |
| Cloud sees public data only    | The only cloud prompts are the room details and public facts about places.                                                                                                                                                                                                                                                                                         |

## What it does not protect against

- **The Firebase project owner.** Someone with admin access to the database could watch each tally write
  in real time and attribute it to a user. Veto does not log this, but the guarantee is policy, not
  cryptography. A future version could aggregate inside a Cloud Function that shuffles and batches
  ballots, or use secure aggregation.
- **Inference from small groups.** In a room of two, an option vetoed once was vetoed by the other
  person (or you). Results only say whether an option "didn't work for someone", never how many, but
  small groups still leak. Optional random-veto noise is on the roadmap.
- **A compromised device or browser.** On-device means on _your_ device; malware there can read the note.
- **Free-tier data use.** Prompts sent to the Gemini Developer API on the free tier may be used to
  improve Google's products. Veto only sends public room details and public place facts.
- **Invite links.** Anyone holding a room link can see its public details and join while it is in the lobby.
