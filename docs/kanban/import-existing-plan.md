# Import an existing training plan instead of filling the wizard

Some athletes arrive already following a plan. Instead of making them answer the
four-step onboarding questionnaire, let them hand over what they already train —
a `.csv` or `.md` upload, or a pasted description — and use that as the starting
point. Fields the wizard would have asked for get assumed rather than collected
(someone who arrives with a written plan is probably not a beginner, so
`experience: intermediate`), with which fields are safe to assume still TBD.

## What it would actually skip

The wizard is four steps (`ONBOARDING_STEPS` in
`client/src/routes/onboarding/onboardingReducer.ts`): personal, goal, training,
life. A file describing someone's current training realistically only fills the
**training** step — `days_per_week`, `rest_day`, the main-lift working weights,
and an experience level inferred from the programme's shape.

It cannot fill personal (sex, age, height, weight) or goal (lose fat / build
muscle / get stronger, target date). Those are not in a training plan, and they
are exactly what the coaching prompt reads: `buildFirstPlanPrompt`
(`server/src/domain/coach/first-plan.ts`) sends `{coaching_rules, profile}` and
nothing else. So this is "skip a step and pre-fill", not "skip most of
onboarding" — unless we accept defaulting body data, which then flows straight
into a generated plan.

## Open questions before this is buildable

- **Does an import become a `Plan` row, or profile input?** If we import the plan
  verbatim we bypass the model entirely and `plans.rationale` has nothing in it —
  the whole product premise is that week 2 is an *adaptation* of week 1, which
  needs the profile regardless. Likelier answer: the import seeds the profile and
  the model still generates week 1 from it.
- **What is the input format really?** A free-form `.md` means an LLM parse (a
  paid call, per sign-up, before the invite gate has proven anything). A `.csv`
  means a column contract we invent and nobody's existing spreadsheet matches.
- **What happens when parsing gets it wrong?** Silently wrong working weights are
  worse than a wizard, because the athlete never saw the number they "gave" us.
  Needs a review-and-confirm screen, which is most of a wizard step again.
- **Does the imported plan have to map onto our `DayType` vocabulary**
  (`upper_body | leg_day | full_body | rest | activity | cardio`) and the
  `day_index` 1–7 template shape? Anything that does not map has to be dropped or
  guessed at.

---

## Category

**3. Enhancement** — an idea from development that is outside current scope and
still needs refinement. The parsing strategy and the assumed-fields list are both
undecided, and the questions above are design decisions, not implementation
details.

---

## Priority

**2. Can wait** — `docs/mvp.md` freezes scope at eight items and this is not one
of them. The MVP's success metric is that an invited athlete signs up, gets a
plan, and logs a training day; the existing wizard already carries them through
that, and this adds a parsing failure mode plus a paid model call on the path
that matters most. Right thing to revisit once there is evidence people abandon
onboarding — which PostHog funnel events (scope item 5) will show.

---

## Original note

> idea, new client already has a plan. lets allow importing or describing the
> current training they do. a .csv or .md for current plan import. could skip most
> of the onboarding wizard in that case -> we would assume some fields, Ex
> intermidiate user .. TBD
