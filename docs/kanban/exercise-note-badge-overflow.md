# The LLM's exercise note is rendered in a pill sized for a two-word tag

Your note is about `exercise.prescribed.notes` on the tracker. It is rendered
inline beside the exercise name as a rounded pill —
`rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase`
(`client/src/routes/tracker-page/components/week-tracker/components/program/components/day-block/components/exercise-row/exerciseRow.tsx:39`).
That styling declares a short tag: `AMRAP`, `TEMPO 3-1-1`, `LAST SET`. The model
is under no obligation to write one, so a coaching sentence lands in a shape
built for a label. The note's own framing is the right one — either the text is
constrained to tag length, or this was never a badge.

## Why it is unconstrained today

Nothing on either side bounds it.

- **Schema.** `PlannedExerciseSchema.notes` and the `prescribed.notes` inside
  `ExerciseLogSchema` are both plain `z.string().nullable()`
  (`server/src/domain/model/index.ts:158`, `:195`). No `.max()`, so the structured
  output parse accepts a paragraph.
- **Prompt.** `buildFirstPlanPrompt` (`server/src/domain/coach/first-plan.ts`)
  and `NEXT_WEEK_SYSTEM` (`server/src/workflows/strengthsync-workflow.ts:52`)
  both say a great deal about what must *not* go in `notes` — never a weight,
  say "add load" rather than a figure — and nothing at all about how long it may
  be. The one length-shaped instruction in the codebase is about day notes
  naming a declared activity, which pushes toward prose rather than away from it.
- **CSS.** The pill has no `truncate`, no `line-clamp`, no `whitespace-nowrap`.
  Long text wraps inside the exercise-name heading, so it does not clip — it
  grows, pushing the prescription line down. Note that the shared `Badge`
  component (`client/src/shadcn/ui/badge.tsx`) *does* carry
  `whitespace-nowrap overflow-hidden`; this pill is hand-rolled and inherits
  neither.

## The two fixes are not equivalent

**Constrain the text** — a `.max()` on the Zod field plus a sentence in both
system prompts ("a tag of at most N characters, not a sentence"). This is the
schema-at-the-boundary shape the repo already prefers, and the bound is enforced
at generation time by the structured-output parse, so a violating plan never
reaches the database. The cost is that the model loses a channel it may be using
for genuine coaching cues, which then have nowhere to go except `day.notes`.

**Stop calling it a badge** — render `prescribed.notes` the way `dayBlock.tsx:48`
already renders `day.notes`: a `text-sm leading-relaxed text-muted-foreground`
paragraph under the prescription line. Client-only, no prompt change, no
regeneration, and it keeps whatever the model wanted to say. The cost is a
second prose block per exercise on a screen that is deliberately dense.

Worth deciding which, rather than doing both: a max-length *and* a paragraph
render is a constraint with no reader.

## Timing

This is week-1 visible. `generate-next-week` rewrites `notes` on every turnover,
so a fix lands for everyone from their next week onward — but week 1 is exactly
the week the success metric measures ("logged a complete training day"), and a
plan already generated keeps the notes it was born with. A prompt-and-schema fix
therefore wants to be in before the batch-one plans are generated, not after.

---

## Category

**2. Bug** — a rendering defect found during development, on the tracker, with a
known trigger and two candidate fixes. Not a design question: whatever the answer,
the current state (unbounded prose in a 10px uppercase pill) is not it.

---

## Priority

**1. Top** — the tracker is the screen the MVP's success metric is read off, and
`docs/todos/008-launch-readiness.md` gates the invite batch on a real-phone run
of exactly this path. A defect that reflows the exercise row is one of the things
that run exists to catch, and catching it now is cheaper than catching it on the
phone. The fix is small on either branch.

---

## Original note

> badges text are too loong, either limit llm geneartion note text or this is not
> a badge in the UI
