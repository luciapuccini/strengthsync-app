# Imperial units by default, with a metric setting

**Shipped.** Branch `imperial-units`, commits `5a66f35..bc9888c`.

The app targets US athletes, so pounds and inches are now canonical everywhere —
storage, API, prompts — and metric is a render-time preference for the minority
who want it. The AI coach's progression rule advances five pounds rather than an
increment no US plate set can build.

Delivered in five slices: imperial rename and migration, the five-pound grid and
the ban on weights in coach prose, the preference column made reachable, metric
rendering, and metric onboarding. A sixth slice reviewed the result: 32 of 33
user stories met by shipped behaviour.

Details live where they belong: `docs/architecture/domain_model.md` states the
canonical-unit invariant and the suffixed blob-key convention;
`docs/architecture/api_contracts.md` lists `PATCH /api/me`.

## Accepted limitations

**Benchmark loads do not round-trip exactly for metric athletes.** A typed
kilogram value converts to pounds and then snaps to the five-pound grid, so 90
of 161 whole-kilogram values come back one kilogram different — 101 kg stores as
225 lb and reads back as 102 kg. 100 kg happens to round-trip, which is what made
this easy to miss. Accepted deliberately: nothing renders a stored benchmark back
to the athlete today, so it is invisible. **It becomes visible the moment a
profile view exists** — treat that as a prerequisite of building one.

**The coach prompt changes have no eval coverage.** `docs/architecture/evals.md`
describes a future Braintrust setup; there is no runner, no dependency and no
cases in the repo. The five-pound snap itself is unit-tested, so what is
uncovered is whether the model obeys the instruction, not whether the guarantee
holds.

## Carried forward

- The first beta invite is still blocked on the email-deliverability question in
  `docs/todos/008-launch-readiness.md`, independently of any of this.
- `.claude/rules/` and `.agents/rules/` both exist and have drifted. Pick one.
