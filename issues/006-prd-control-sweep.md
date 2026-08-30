# PRD control sweep

## Parent PRD

`issues/prd.md`

## What to build

A final review pass over the whole implementation, once every other slice is
done. This produces findings and a written summary, not features.

Answer, with evidence rather than assertion:

**Are we on track with what we planned for?**
Walk the PRD's decisions and confirm each one actually landed as written —
particularly the ones that were argued over: streaming only with no tools, the
route replaced in place rather than added beside, semantic events rather than
snapshots, `ready` carrying identifiers only, the failed screen wiping rather
than preserving, and no new analytics. Name anything that drifted.

**Did any file or function diverge from project standards?**
Check the changed surface against the repo's conventions: the generated-contract
pipeline as the single channel to the client, the domain-to-HTTP schema bridging
pattern, the reducer naming convention, the import boundaries, and the lint
ceilings on function length and complexity. Streaming code tends to grow long
handlers; verify it did not.

**Are bugs and out-of-scope findings documented and not actioned?**
Anything noticed along the way that was not part of this PRD should be written
down, not fixed silently. Confirm nothing was quietly expanded in scope.

**Was `/docs` updated consistently with the progress?**
The PRD scoped documentation deliberately narrowly — only two false statements
corrected, no new streaming-conventions section. Confirm that held, and confirm
the two corrections are actually accurate now. Flag any other statement in
`/docs` that this work has since made false.

**Suggested next steps.**
Including, at minimum, a view on the two things the PRD explicitly deferred: the
missing perceived-latency metric, and the silent-buffering failure mode that
nothing currently detects.

## Acceptance criteria

- [x] Every PRD decision is checked off as landed, or the divergence is named and
      explained.
- [x] The changed surface is checked against the repo's conventions and import
      boundaries; divergences are listed.
- [x] Out-of-scope findings and any bugs noticed are documented and explicitly
      left unactioned.
- [x] `/docs` is confirmed consistent with the shipped behaviour; any newly false
      statement elsewhere in `/docs` is flagged.
- [ ] The stream is confirmed by hand not to be silently buffered — first event
      visibly arriving well before the last. NOT DONE: needs a running
      `wrangler dev` with a real OPENAI_API_KEY. See section 5 of
      `docs/audits/streaming-first-plan-sweep.md`.
- [x] A written summary with recommended next steps is produced
      (`docs/audits/streaming-first-plan-sweep.md`) and reviewed with the user.

## Blocked by

- Blocked by `issues/001-streaming-transport-tracer.md`
- Blocked by `issues/002-day-events-and-checklist.md`
- Blocked by `issues/003-retire-the-orb.md`
- Blocked by `issues/004-mid-stream-failure.md`
- Blocked by `issues/005-commit-on-disconnect.md`

## User stories addressed

None directly - this is a control pass over all of them.

## STATUS

DONE — except the by-hand buffering check, which is recorded as an open gap.
