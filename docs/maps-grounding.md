# Grounding with Google Maps

**Status:** wired up and switched off. The code runs when Remote Config `candidate_source` is
`maps`; the live project keeps `fixture`, because grounding needs a project with billing.

## What the probe found (Nov 18)

Calls through Firebase AI Logic (Gemini Developer API) on `veto-hybrid-ai`, which has no billing
account:

| Call                                                                        | Result                          |
| --------------------------------------------------------------------------- | ------------------------------- |
| `gemini-3.5-flash-lite`, no tools                                           | 200                             |
| `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.8-flash` + Maps | 429 within a second, every time |
| `gemini-3.5-flash-lite` + Google Search                                     | 429                             |
| `gemini-3.8-flash`, no tools                                                | 500 "high demand" (transient)   |

On an unbilled project, grounding quota is zero for both Maps and Search, so neither can run on the
free tier. With billing, the Gemini API docs list 5,000 grounded requests a month free across
Gemini 3 and newer models, then $14 per 1,000 search queries (one prompt can run several). A
request counts only when it returns at least one Maps result.

## How Veto uses it

1. **Grounded search.** The host's cloud call sends the room's public details (title, area, time,
   group size, vibe) to the cloud model with the `googleMaps` tool, plus the location when the room
   has one. No private notes.
2. **Shared vocabulary.** A second call turns the places into the attribute vocabulary the matcher
   reads (price band, access, noise, foods, diet tags).
3. **Sources.** [`attachSources`](../web/src/ai/maps.ts) keeps only options that match a Google
   Maps source and takes each option's name and link from Maps. A place the model names but Maps
   didn't return is dropped: it may not exist.
4. **Fallback.** If the call fails or fewer than three places have a source, the room gets the demo
   list instead, labelled as demo places, and the privacy log says so. A room never gets stuck on
   the search.

## Display rules followed

From the Grounding with Google Maps terms and the Firebase AI Logic docs:

- Every place shows its Maps name with an "Open in Google Maps" link to its source, directly under
  it, in the vote and in the results.
- "Places and links from Google Maps" follows every list of places.
- "Google Maps" is never translated (`translate="no"`), wrapped or restyled (Roboto, weight 400).
- Demo places are labelled as made up wherever they appear. Before this change they weren't.

## Before switching it on

- **Billing.** Upgrade the project to Blaze and set a budget alert. Check the Gemini API pricing
  page first: on a billed project, Gemini calls are charged at paid-tier rates.
- **Retention.** The terms allow grounded results to be stored for up to 90 days (to evaluate the
  display) or 6 months in a user's chat history; place IDs can be kept. The candidates document has
  no expiry yet: add a Firestore TTL policy on `public/candidates` first.
- **One call instead of two.** The terms say not to modify the grounded result. Names and links
  are shown as Maps returns them, but the descriptions pass through the vocabulary step. Once
  grounding runs, test a single grounded call with a JSON response schema; if it works, drop the
  second call.
- **Who sees results.** The terms describe showing results to the user who ran the prompt. In Veto
  the host runs it and the whole room sees the places. Confirm this reading before launch.
- **Language and regions.** Maps grounding supports English only. The Gemini API terms require
  paid services for apps offered in the EEA, Switzerland and the UK, and Maps grounding can't be
  offered in prohibited territories.

## Trying it locally

Put `VITE_CANDIDATE_SOURCE=maps` in `web/.env.development.local` and restart `npm run dev`. On an
unbilled project you'll see the fallback: the room opens with the demo list and the note "Live
search with Google Maps didn't work this time".
