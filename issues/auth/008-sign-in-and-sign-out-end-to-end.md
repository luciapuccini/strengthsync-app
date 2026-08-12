## Parent PRD

`issues/auth/prd.md`

## What to build

The rest of the session lifecycle: a returning athlete signs in, an athlete
leaves, and an expired session sends them back to the front door instead of an
error card.

- The sign-in form submits for real, with the same pending state and persistent
  error region as sign-up.
- A sign-out control in the app header, beside the existing navigation. It calls
  the sign-out route so the cookie is cleared server-side, clears the session
  state, and returns to sign-in.
- A single unauthorized-handling path: the shared request helper invokes a
  handler registered once at startup, which signs the session out. The API module
  registers a handler rather than importing the store, so its tests stay
  independent of the store.

With the demo credential seeded, this slice is verifiable against the seeded
athlete's real training data.

See the "Routing and screens" and "Client modules" sections of the parent PRD.

## Acceptance criteria

- [ ] Submitting the sign-in form with correct credentials signs the athlete in and lands them in the app.
- [ ] A wrong password and an unknown email produce one message that does not reveal whether the account exists.
- [ ] The submit button shows progress and refuses a second press while a request is in flight.
- [ ] The error message stays on screen while the athlete corrects the field.
- [ ] The header offers a sign-out control that clears the cookie server-side, clears session state, and returns to sign-in.
- [ ] An unauthorized response from any API call signs the session out and returns the athlete to sign-in, rather than surfacing the generic failure card.
- [ ] The unauthorized handler is registered once at startup, and the API module does not import the store.
- [ ] Signing in as the seeded demo athlete reaches their existing plan, week and history.
- [ ] Commit passes lefthook pre-commit: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Blocked by

- Blocked by `issues/auth/007-sign-up-end-to-end.md`

## User stories addressed

Reference by number from the parent PRD:

- User story 5
- User story 6
- User story 8
- User story 12
- User story 13
- User story 14
- User story 27
