# Close StrengthSync MVP gaps

Status: in progress

## Current conclusion

The repository has a solid foundation and a usable seeded-week tracker, but it is not yet an end-to-end MVP. The two workflow entry points are stubs, Braintrust is not connected, profile/history screens are absent, and successful workflows do not reliably refresh the UI.

## 1. Make plan generation work end to end

Status: done (2026-07-23)

- Replaced the sentinel workflow with Temporal activities for context loading, structured generation, validation, and activation.
- Added an authenticated internal-API client and registered activities in `apps/workflows/src/worker.ts`.
- Extended `services/agent` with traced profile/history summaries and structured OpenAI plan generation.
- Fixed first-plan generation: context allows no active plan; replacement requires a completed final week and no in_flight week.

Remaining from this item for a later UX pass: coach-notes input in the UI and gating generate-plan on plan completion.

## 2. Implement weekly progression

- Replace `apps/workflows/src/workflows/weekly-progression.ts` with complete-week, context, analysis, plan-boundary, next-week generation, and idempotent persistence activities.
- Validate that all scheduled days are complete before freezing the week.
- Preserve transient analysis in Temporal/trace context only; write only the completed week and generated next schedule to D1.
- Test retries and duplicate starts so failures cannot create duplicate plans or weeks.

## 3. Add required observability

- Replace the console recorder in `apps/workflows/src/observability/llm-call-recorder.ts` with Braintrust tracing for every successful or failed LLM call.
- Record validated inputs/outputs, workflow metadata, latency, and safe errors without storing trace payloads in D1.
- Add the documented manual score/replay commands and focused recorder/activity tests.

## 4. Complete the browser product surface

- Add a client profile route and form using the existing `getProfile`/`updateProfile` API wrappers for goals, body composition, loads, nutrition, swimming, and schedule preferences.
- Add editable performed reps and optional performed weight per set; current controls only copy prescribed values.
- Refactor current-week loading so workflow success fetches and renders the new live D1 state without a manual reload.
- Add persistent failed-workflow state and wire the existing retry endpoint.
- Add previous-plan and completed-week history routes using the existing read APIs.

## 5. Harden and verify the MVP journey

- Add component tests for profile, tracker, lifecycle actions, refresh, and retry behavior.
- Add an integration path covering: create client → complete profile → generate first plan → log/complete days → progress weeks → generate replacement plan → inspect retained history.
- Add UI production build validation to `.github/workflows/ci.yml` and smoke-test D1 migration/seed compatibility.
- Keep streaming coach chat out of this MVP, per the resolved scope decision.
- Treat direct plan import as optional because the selected MVP path is AI generation; document that interpretation in `docs/mvp_scope.md`.
