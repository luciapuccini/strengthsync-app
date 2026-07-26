# Close StrengthSync MVP gaps

Status: in progress

## Current conclusion

The repository has a solid foundation, a usable seeded-week tracker, both Temporal workflows implemented end to end, and Braintrust observability with manual plan/week evals. Remaining MVP gaps are profile/history/refresh UI and journey hardening.

## 1. Make plan generation work end to end

Status: done (2026-07-23)

- Replaced the sentinel workflow with Temporal activities for context loading, structured generation, validation, and activation.
- Added an authenticated internal-API client and registered activities in `apps/workflows/src/worker.ts`.
- Extended `services/agent` with traced profile/history summaries and structured OpenAI plan generation.
- Fixed first-plan generation: context allows no active plan; replacement requires a completed final week and no in_flight week.

Remaining from this item for a later UX pass: coach-notes input in the UI and gating generate-plan on plan completion.

## 2. Implement weekly progression

Status: done (2026-07-23)

- Replaced the weekly-progression stub with complete-week → context → analyze → plan-boundary → generate/create-next activities.
- `completeWeek` allows completing weeks with incomplete days; analysis uses schedule `completed` flags for adherence.
- Analysis stays transient (Temporal/trace only); D1 receives the frozen week and the next schedule.
- Added orchestration and repository tests for idempotent creates, LLM-after-freeze retries, and non-retryable validation.

## 3. Add required observability

Status: done (2026-07-24)

- Replaced the console-only recorder path with a Braintrust-backed `LlmCallRecorder` (console fallback when unset).
- Traces record validated inputs/outputs, workflow metadata, latency, and safe errors; payloads stay out of D1.
- Added manual `pnpm eval:score` / `pnpm eval:replay` for `generate_plan` and `generate_next_week`, with LightProgression + ClosedQA scorers and focused recorder/scorer tests.

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
