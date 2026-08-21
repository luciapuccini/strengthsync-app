# Final sweep

**Type:** HITL

## Parent PRD

`issues/prd.md`

## What to build

Nothing. This is a review of the finished implementation against the PRD,
carried out with the user, producing a written verdict rather than code.

Work through the four questions below and report findings. Where a finding is a
defect or a divergence, record it — do not fix it inside this issue. Anything
worth acting on becomes its own issue.

### Are we on track with what we planned for?

Walk the 33 user stories in the parent PRD and confirm each is satisfied by
shipped behaviour, not merely by code that appears to address it. Confirm the
decisions in "Implementation Decisions" survived contact with the
implementation — in particular that imperial is canonical with no exceptions
beyond the protein target, that conversion happens only at the display edge,
and that the five-pound snap sits on the domain schemas rather than at call
sites.

### Did anything diverge from project standards and notation?

Look for conversion arithmetic or rounding constants that ended up outside the
units module, unit-bearing fields that lost their suffix, blob keys that stayed
bare, and any second writer of the preference column. Check the naming and
structure of new modules against their neighbours rather than against this
PRD's prose.

### Are bugs and out-of-scope findings documented and not actioned?

Confirm that anything discovered along the way and deliberately left alone is
written down somewhere durable, and that nothing in "Out of Scope" was quietly
built anyway — especially a profile view, per-measurement preferences, or a
metric-native progression step.

### Was the documentation updated consistently with the progress?

Check that the domain-model and API-contract docs describe the canonical-unit
rule, the suffixed blob keys, the preference column and the partial-update
endpoint, and that no doc still describes the metric-canonical world.

### Suggested next steps

Close with a recommendation. The parent PRD's "Further Notes" flags one item
that is not this work's responsibility but gates the same milestone: the
unresolved email deliverability question in the launch-readiness notes, which
blocks the first beta invite independently of units.

## Acceptance criteria

- [ ] All 33 user stories reviewed against shipped behaviour, with any unmet ones named
- [ ] Implementation decisions confirmed to have survived, with any divergence named
- [ ] Standards and notation divergences listed, or their absence stated
- [ ] Out-of-scope items confirmed not built; discovered bugs confirmed documented and not actioned
- [ ] Documentation confirmed consistent, with any stale metric-canonical references named
- [ ] Suggested next steps written, including the invite-blocking deliverability question
- [ ] Findings reviewed with the user

## Blocked by

- Blocked by `issues/001-imperial-becomes-canonical.md`
- Blocked by `issues/002-five-pound-grid.md`
- Blocked by `issues/003-preference-persists.md`
- Blocked by `issues/004-metric-rendering.md`
- Blocked by `issues/005-metric-onboarding.md`

## User stories addressed

None directly - this issue verifies all 33.

## STATUS

TODO
