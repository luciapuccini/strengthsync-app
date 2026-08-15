# Two different things in the client are called "reducer"

Your note is a clarification you captured about `client/src/reducers/weekReducer.ts`:
"reducer" there means *reduce a change onto week state*, Redux-style naming — it is
not Redux's dispatcher pattern. The file exports one function per action
(`toggleSet`, `setFeedback`, `toggleSkip`), each taking `(week, ...args)` and
returning a new `Week`. Written as a single reducer it would be
`weekReducer(week, action): Week` with an action union, and `trackerSlice` would
call `set({ week: weekReducer(state.week, action) })`. Same idea, different
packaging — each action inlined as its own function instead of one switch.

The thing worth tracking is that the repo now has both packagings side by side:

| File | Shape |
|---|---|
| `client/src/reducers/weekReducer.ts` | one exported function per action, no action union |
| `client/src/routes/onboarding/onboardingReducer.ts` | true `(state, action)` switch over an `OnboardingAction` union |

`trackerSlice.ts` already carries the missing half of the pattern: `patchWeek`
passes an action *name* string (`'toggleSet'`, `'setFeedback'`, `'toggleSkip'`)
to zustand devtools, so the action names exist — they are just strings next to
the call rather than a discriminated union.

Two ways to settle it, and doing nothing is a third:

1. **Document the convention** — a doc comment at the top of `weekReducer.ts`
   saying what "reducer" means here and why it is not a switch, same way
   `onboarding-schema.ts` and `week-draft-schema.ts` explain themselves.
2. **Collapse to one switch**, matching `onboardingReducer.ts`, and derive the
   devtools action name from `action.type` instead of a literal.

Option 1 is the cheaper one and keeps the per-action functions individually
testable, which is how `weekReducer.test.ts` is written today. Option 2 only pays
off if the number of week actions grows.

---

## Category

**4. House cleaning** — naming/consistency for coding DX. No behaviour changes
either way; it exists so the next person reading `reducers/` does not expect a
Redux store, and so the two "reducers" stop meaning two different things.

---

## Priority

**2. Can wait** — touches no MVP scope item in `docs/mvp.md` and changes nothing
a user sees. Cheapest moment to do option 1 is whenever `weekReducer.ts` is open
for another reason.

---

## Original note

> "Reducer" here means reduce a change onto week state, Redux-style naming, not
> Redux's dispatcher pattern. If you rewrote it as one reducer it would look like:
>
> ```js
> function weekReducer(week: Week, action:
>   | { type: 'toggleSet'; dayIndex: number; exerciseKey: string; setIndex: number }
>   | ...
> ): Week
> ```
>
> and the slice would `set({ week: weekReducer(state.week, action) })`. Same idea,
> different packaging: they inlined each action as its own function instead of one switch.
