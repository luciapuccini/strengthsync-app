## Status

DONE — commit 0f296ff

## Parent PRD

`issues/auth/prd.md`

## What to build

Two copy and state corrections that stop the app lying to a newly registered
athlete.

- The empty tracker currently reports that plan generation is temporarily
  unavailable and to check back once a plan has been assigned. For someone who
  registered thirty seconds ago that describes an outage that is not happening.
  It is rewritten to address a new athlete truthfully: they are set up, they do
  not have a training plan yet, and this is expected. A marker notes that
  first-plan onboarding is the next phase.
- The Apple and Google buttons render disabled with a short caption noting that
  social sign-in is not available yet, so nothing on the front door looks live
  while doing nothing.

**This slice is HITL.** The empty-state wording is the first thing a new athlete
reads after registering, and the social caption sits on the sign-up screen —
both are worth a review rather than a guess.

See the "Routing and screens" section of the parent PRD.

## Acceptance criteria

- [x] The empty tracker's wording addresses a newly registered athlete and makes no claim about an outage or unavailability. — `trackerPage.test.tsx`, "tells the athlete their account is set up and that no plan exists yet" and "claims no outage and nothing unavailable", the second pinning the absence of *unavailable*, *temporarily* and *check back*.
- [x] The copy is reviewed and approved rather than assumed. — three headings and three captions were put to the author before any file changed; "You're all set up" and the bare "Social sign-in isn't available yet." were the ones chosen. Not separately tested: approval is not a property of the code. A third option for each was declined, including a "coming soon" caption that would have made the same kind of unbacked promise this issue exists to remove.
- [x] A marker records that first-plan onboarding is the next phase. — a `TODO` comment in the empty branch of `trackerPage.tsx`, matching the one existing marker in the client (`signIn.tsx`'s password-recovery `TODO`). Not separately tested: a comment has no behaviour to assert.
- [x] The social buttons are rendered disabled and cannot be activated by pointer or keyboard. — `socialAuthButtons.test.tsx`, "disables both, so neither pointer nor keyboard can activate them". `toBeDisabled` asserts the native attribute specifically; see Notes for why that and not `aria-disabled`.
- [x] A caption explains that social sign-in is not available yet. — `socialAuthButtons.test.tsx`, "captions why, and describes both buttons by that caption", which also pins the `aria-describedby` wiring in both directions.
- [x] The mobile sizing and layout of both auth screens are unchanged — the form stays above the fold on a phone-width viewport. — **partly tested.** The structural half is: "places the caption after both buttons" asserts via `compareDocumentPosition` that the only added node follows both buttons, so nothing between the first field and the submit button moves, and the disabled buttons keep their classes and therefore their size. The rendered result at a phone width is *not* tested — the repository has no viewport or visual test of any kind, and neither screen had one before this. The claim rests on the diff being append-only below the submit button.
- [x] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`. — 81 client + 98 server tests; client rose from 75 by the six added here.

## Notes

- **Exports added or touched, and their production callers**, checked before
  marking this done:
  - `SocialAuthButtons` — touched. Called from `routes/sign-up/signUp.tsx` and
    `routes/sign-in/signIn.tsx`.
  - `TrackerPage` — touched. Called from `App.tsx`.
  - Nothing else. `AppleIcon`, `GoogleIcon`, the caption id and the tests'
    `renderTracker` helper are all module-local, and no export was added.
- **`disabled`, not `aria-disabled`.** The criterion asks that the buttons
  cannot be activated by pointer *or* keyboard. `aria-disabled` announces the
  state and changes nothing else: the button keeps its tab stop and its click.
  The native attribute removes the tab stop, and the shared button variant
  already carries `disabled:pointer-events-none disabled:opacity-50`, so the
  disabled appearance and the pointer behaviour both come from the primitive
  rather than from anything added here.
- **The caption sits below the buttons on purpose.** Above them it would have
  pushed the whole social block down and, on sign-up, moved content that shares
  the fold with the submit button. Below, the added height lands where both
  screens already scroll. That ordering is the layout-relevant fact, so it is
  the one the test pins.
- **The negative assertions were checked against a real failure.** The old copy
  was temporarily restored and both tracker tests failed, then reverted — a
  pinned absence that cannot trip is worth nothing.
- **Rendering the empty branch needs an awaited async `act`.** `render` wraps
  its work in a synchronous one, and a component that suspends inside that never
  has its retry flushed: the page stays on the fallback and every query finds an
  empty body. The helper in the test file explains this at the point where the
  next author will hit it.
- **A cross-athlete leak was found and recorded, not fixed here.** The browser's
  two resource caches survive a sign-out, so a second athlete signing in on the
  same tab reads the first one's tracker and history. It surfaced through the
  export check above: `invalidateCompletedWeeks` has no production caller at
  all. This slice changes neither the session nor either resource, so it is
  logged in the parent PRD's defect list rather than folded in. Recorded there
  in full.

## Blocked by

- Blocked by `issues/auth/007-sign-up-end-to-end.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 15
- User story 16
- User story 20
