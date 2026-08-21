# Imperial units by default, with a metric setting

## Problem Statement

StrengthSync targets athletes in the United States, but every weight and height
in the product is metric. Onboarding asks for height in centimetres and body
weight in kilograms. The four strength benchmarks are asked for in kilograms.
The AI coach prescribes loads in kilograms and its progression rule advances a
lift by one kilogram. The tracker shows a prescribed load as "60 kg" and the
history screen reports a week-over-week change as "2kg ↑".

For the intended athlete this is unusable at the first screen. They do not know
their height in centimetres or their bench press in kilograms, and converting
under the mild pressure of a signup form is exactly the kind of friction that
loses a beta invite. Worse, the numbers the coach gives back are unactionable in
a US gym: plates are denominated in pounds, the bar is 45 lb, and the smallest
practical jump on most lifts is 5 lb. A one-kilogram progression cannot be
loaded onto the equipment the athlete is standing in front of.

A minority of athletes — including the account holder — do think in kilograms
and centimetres and want to keep using them.

## Solution

Imperial becomes the product's native language. Weights are pounds, heights are
feet and inches, and every prescription the coach produces lands on a load an
athlete can actually build from the plates on the rack.

Athletes who prefer metric flip one setting. Onboarding opens with an
imperial/metric control, so the very first question is asked in whatever unit
the athlete thinks in, and the same control lives on the Account page so the
choice can be corrected later. Choosing metric changes what is displayed and
what onboarding asks for; it does not change what is stored. Underneath, every
measurement is imperial for every athlete, and metric is a presentation layer
applied at the moment a number reaches the screen.

The coach's progression rule moves in five-pound steps, matching the smallest
increment a standard plate set supports, and every load the coach produces is
guaranteed to sit on that five-pound grid — including loads it invents itself.

## User Stories

1. As a US athlete signing up, I want onboarding to ask for my weight in pounds, so that I can answer without doing arithmetic.
2. As a US athlete signing up, I want to enter my height as feet and inches, so that I can give the number I actually know about myself.
3. As a US athlete signing up, I want the four strength benchmark questions asked in pounds, so that I can type the numbers I see on my own plates.
4. As a US athlete signing up, I want to state a target body weight in pounds, so that my goal is expressed in the units I will weigh myself in.
5. As a metric athlete signing up, I want to switch the whole questionnaire to kilograms and centimetres at the first step, so that I never have to convert anything.
6. As a metric athlete, I want that switch to apply to every later step of onboarding without asking me again, so that the questionnaire stays coherent from start to finish.
7. As an athlete, I want my unit choice remembered after I finish onboarding, so that the app keeps speaking to me the way I set it up.
8. As an athlete who picked the wrong unit at signup, I want to change it from my Account page, so that a mis-tap on the first screen is not permanent.
9. As an athlete, I want the unit setting to take effect immediately when I change it, so that I can confirm I picked the right one.
10. As a US athlete looking at today's session, I want each prescribed load shown in pounds, so that I know what to load on the bar.
11. As a metric athlete looking at today's session, I want each prescribed load shown in kilograms, so that I know what to load on the bar.
12. As an athlete, I want the unit shown next to every weight rather than assumed, so that I am never guessing which system a number is in.
13. As an athlete reviewing my history, I want past loads shown in my chosen unit, so that my history is readable in the same terms as my current week.
14. As an athlete reviewing my history, I want week-over-week changes shown in my chosen unit, so that I can see whether I am progressing.
15. As a metric athlete, I want a week-over-week change to equal the difference between the two numbers I can see on screen, so that the history does not appear to contradict itself.
16. As a US athlete, I want the coach to prescribe loads that are multiples of five pounds, so that I can build every prescription from a normal plate set.
17. As a US athlete, I want a progression to advance a lift by five pounds rather than an unloadable fraction, so that "increase the weight" means something I can act on.
18. As an athlete, I want a load the coach produced off-grid to be corrected silently rather than failing my week generation, so that a model slip never blocks my training.
19. As a metric athlete, I want the load I typed at onboarding to come back to me as the same number I typed, so that the conversion is invisible.
20. As an athlete, I want the coach's written notes to describe what to do rather than quote a number, so that the guidance can never contradict the prescribed load shown beside it.
21. As an athlete, I want the coach to know which unit my recorded strength is in, so that my first plan is anchored to the right loads rather than a number it misread by a factor of two.
22. As a metric athlete, I want my height stored accurately enough that nothing is visibly distorted, so that switching units is lossless in practice.
23. As an athlete, I want body weight and target weight left exactly as I entered them rather than rounded to a training grid, so that my goal is not silently moved.
24. As an athlete logging a set, I want the recorded load to follow the prescription in my chosen unit, so that tapping through a session needs no thought about units.
25. As an athlete who switches units mid-week, I want my in-progress week to re-render in the new unit without losing any logged sets, so that changing a display preference is never destructive.
26. As a new athlete, I want a sensible default of imperial, so that the common case requires no configuration at all.
27. As the operator, I want the unit preference delivered with the session bootstrap, so that the first screen after sign-in renders in the right unit without a second round trip or a visible flicker.
28. As the operator, I want exactly one endpoint that writes the preference, so that the onboarding toggle and the Account toggle can never drift apart.
29. As the operator, I want the unit carried in the field name of every stored measurement, so that a value pulled out of a free-form JSON blob is self-describing.
30. As the operator, I want the demo seed data expressed in imperial, so that a seeded environment looks like a real US athlete's account.
31. As the operator, I want no athlete-visible data migration, so that shipping this does not risk corrupting existing training history.
32. As the operator, I want the architecture docs updated alongside the change, so that the canonical-unit rule is written down rather than inferred from the schema.
33. As the operator, I want the prompt changes covered by evals, so that a regression in how the coach handles units is caught before an athlete sees it.

## Implementation Decisions

### Canonical unit

Imperial is canonical, with no exceptions. Every measurement that is stored,
transmitted over the API, or placed in a prompt is in pounds or inches. Metric
exists only as a rendering of those values.

The one field outside the rule is the protein target, which stays in grams —
US nutrition labels are gram-denominated, so grams are the imperial-native unit
there.

### Naming

Every measurement field carries its unit as a suffix: pounds for body weight,
target weight, the four strength benchmarks, prescribed loads and performed
loads; inches for height. This applies inside the free-form JSON profile blobs
as well as to typed schema fields.

The strength-loads blob currently uses bare keys with no unit anywhere, and the
model reads those key names literally. Its keys gain the pound suffix, bringing
it in line with the goals and body-composition blobs, which already carry
suffixed keys. The system prompt states the unit as well; the two are
deliberately redundant, because the strength-loads blob is what the model
anchors a new athlete's first prescriptions to.

### Height precision

Height is stored in inches to one decimal place. An imperial entry of feet plus
whole inches lands on an exact integer; a metric entry rounds to a tenth of an
inch, a drift under 1.5 mm. Whole-inch storage was rejected: it would quantise
two distinct centimetre heights onto the same inch, which is invisible today
but would bake in a small error if height is ever displayed back.

### The preference

A single column on the client record holds `imperial` or `metric`, defaulting to
`imperial`. One setting governs both weight and height together; separate
weight and height preferences were rejected because the mixed combinations are
not real user needs and would double the control surface.

The preference is returned with the session bootstrap that already fetches the
signed-in client, so it is available before the first screen renders. A new
partial-update endpoint on that same resource writes it and returns the updated
client, which the session store adopts directly.

Both the onboarding toggle and the Account toggle are the same control calling
that one endpoint. The alternative — carrying the preference in the onboarding
answers payload — was rejected because the onboarding endpoint's contract is
about profiles, the preference lives on a different table, and its response
would have had to widen to return the client or the store would go stale.

If the toggle's write fails during onboarding, the form continues in the chosen
unit locally and the submitted answers are still converted to canonical
imperial, so the stored data is correct either way; only the display preference
would be wrong, and it is correctable from the Account page.

### Metric rendering

Metric display divides by 2.20462 and rounds to the nearest whole kilogram.
Consecutive five-pound steps are 2.268 kg apart, so whole-kilogram rounding can
never collapse two distinct grid loads onto the same displayed number, and a
round trip from kilograms through pounds and back is stable.

All derived numbers are computed from the converted, rounded values rather than
from the canonical ones. A 135 → 140 lb progression therefore reads as "3kg ↑"
for a metric athlete, matching the 61 → 64 displayed above it. Computing the
delta canonically and then converting would yield "2kg ↑" next to a visible
three-unit change, which reads as a bug.

Conversion happens only at the display edge. Nothing converts at the API
boundary, so the client store and the server always hold identical values.

### The five-pound grid

The coaching-rules document's progression step becomes five pounds.

Athlete-typed strength benchmarks snap to the nearest five on submit, in both
unit systems. A metric athlete's 100 kg stores as 220 lb and renders back as
100 kg, so the snap is invisible to them.

Model-emitted loads snap on ingest. The snap is expressed as a transform on the
load fields of the domain schemas themselves rather than as a separate
validation step, which means it applies to model output, to inbound API writes
and to values read back from storage, with no call sites to remember and no way
to add a new path that bypasses it. Off-grid values are corrected and logged,
never rejected — a model slip must not fail a week generation.

Body weight and target weight are never snapped. They are measurements and
goals, not loads to be built from plates.

### Prompt changes

Three changes to the coach's instructions: the progression rule advances five
pounds; the system prompt states that all weights are in pounds; and the model
is barred from writing a weight into prose. Numbers belong in the load field
only, so a note says "add load" rather than naming a figure that could
contradict the prescription rendered beside it.

### Onboarding

An imperial/metric segmented control sits at the top of the first step,
defaulting to imperial, and governs the labels, bounds and conversion of every
subsequent step.

Under imperial, height is two inputs — feet and whole inches — combined into
total inches at submit. Under metric it is a single centimetres field. Body
weight, target weight and the four strength benchmarks change label and bound
with the setting, and are converted to canonical imperial at submit.

### Bounds

Validation bounds are re-expressed in imperial with the same intent as the
metric ones they replace: strength benchmarks up to 1000 lb, body weight and
target weight up to 800 lb, height up to 100 in. Body-fat percentage and the
protein target are unaffected.

### Reach of the setting

The preference visibly affects two things: which units onboarding asks in, and
how prescribed and performed loads render on the tracker and history screens.

Height and body weight are captured once and never rendered anywhere in the
app — there is no profile view and no profile editor. Changing the setting
afterwards therefore has no visible effect on them. This is accepted rather
than resolved by adding a profile screen: a read-only or editable profile view
is real product surface that happens to touch units, and belongs in its own
piece of work.

### Migration and data

The column is added with a default. No JSON traversal migration is written.
Instead, plan, week and client-profile rows are dropped and athletes re-onboard;
client, identity and coach records survive. This is only free while the first
beta invite is unsent, which is currently true.

Both seed files are rewritten with imperial values.

### Scope of delivery

This ships as one issue rather than a pipeline change followed by a settings
follow-up. Without the Account toggle, an athlete who mis-taps at onboarding is
permanently locked into the wrong unit, and the toggle itself is one control
and one endpoint — not enough to justify its own issue.

### Modules

Two new deep modules:

- **A client-side units module.** The single home of every conversion and
  rounding rule introduced here: pounds to kilograms, whole-kilogram display
  rounding, the five-pound snap, feet-and-inches to inches, centimetres to
  inches at one decimal, and weight formatting with its unit label. Pure
  functions with no React, no store access and no I/O. Every display site and
  every onboarding field goes through it, so rounding policy has exactly one
  home and can be changed in one place.

- **A server-side weight-grid transform.** The five-pound snap, composed onto
  the load fields of the domain schemas. Its value is placement rather than
  complexity: the schedule-generation parser already wraps those schemas, so a
  single field-level transform covers every path a load can enter the system by,
  and is idempotent on values read back from storage.

Modified, all shallow: the domain model schemas (renames, imperial bounds,
transform composition); the onboarding answer schema and its profile mapper
(renames, bounds, suffixed blob keys); the two coach prompt documents; the
preference persistence path from database schema through the client repository
to the session-bootstrap and partial-update endpoints and into the session
store; the onboarding UI (unit toggle, feet/inches height field, unit-aware
labels across the personal, goal and training steps); the three lift-load
display sites and the history delta rule; the Account page; and the database
migration plus both seed files.

## Testing Decisions

A good test here asserts external behaviour — what a caller passes in and what
comes back — rather than how the conversion is structured internally. Where a
test would only pin the shape of a payload, the boundary schema does that job
instead and no test is written; that is why the onboarding mapper's renames are
not separately tested despite being touched.

Three modules are covered.

**The units module.** A table of cases over its pure functions: pound
passthrough under imperial, whole-kilogram rounding under metric, the 100 kg →
220 lb → 100 kg round trip, the five-pound snap, feet-and-inches to inches, and
centimetres to inches at one decimal. This is the highest-value coverage in the
change, because every rounding decision lives here and a regression produces
silently wrong numbers rather than a crash. Prior art: the existing pure-utility
date-formatting test.

**The five-pound snap transform.** Cases in the domain model test: an off-grid
prescribed load is corrected to the nearest five; an already-gridded load is
untouched; a null load stays null; and body-weight and target-weight fields are
left alone. This pins the one behaviour where the server silently overrides what
the model produced. Prior art: the existing domain model schema test.

**The preference update endpoint.** A route-level test that the partial update
persists the preference and returns the updated client, and that a value outside
the two-member enum is rejected. Prior art: the existing signed-in-client route
tests.

Not separately covered: the history delta rule. Its transform already has a test
that asserts kilogram deltas, so that test is updated mechanically as part of the
rename, but no new assertions are added for the converted-values rule. The
onboarding UI, the Account toggle and the three display sites are not given
component tests; their logic is delegated entirely to the units module, which is
tested directly.

The prompt changes are covered by evals rather than unit tests, per the existing
evals documentation.

## Out of Scope

- **A profile view or profile editor.** Height and body weight remain
  write-once and invisible after onboarding. Making the setting fully meaningful
  for those fields, or letting an athlete correct a typo made at signup, is a
  separate feature.
- **A JSON data migration.** Existing plans, weeks and profiles are dropped
  rather than converted. This choice is only available before the first invite
  goes out.
- **Nutrition units.** The protein target stays in grams and is not part of the
  imperial rule.
- **Per-measurement unit preferences.** One setting governs weight and height
  together; mixed combinations are not supported.
- **Kilogram-denominated progression.** The five-pound grid is the only
  progression increment. Metric athletes see its effects converted, not a
  metric-native step size.
- **Plate-loading guidance.** The grid guarantees a load is buildable from a
  standard plate set; it does not tell the athlete which plates to use.
- **Account linking, invite delivery, and anything else in launch readiness.**

## Further Notes

The first beta invite is independently blocked on an unresolved email
deliverability question recorded in the launch-readiness notes. That is what
makes the wipe-and-re-onboard approach viable, and it also means this work is
not the only thing standing between the product and its first athlete — the
deliverability question needs answering regardless.

The decision to make imperial canonical rather than keeping metric storage with
imperial display was a reversal made during design. The deciding factor was the
five-pound grid: with pounds canonical, every prescribed load is an exact grid
value with no drift, and the rounding awkwardness lands on the metric minority
instead of on the US majority the product is built for. Height followed for
consistency — "imperial is canonical" is a rule with no exceptions to remember,
which was judged worth more than the marginal argument for keeping centimetres
because the model reasons in them.

The strength-loads blob having no unit in its keys and no unit in the prompt is
a pre-existing defect, not one introduced here. The model has been reading bare
numbers and inferring kilograms from context. Suffixing those keys fixes it.
