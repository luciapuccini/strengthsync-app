/**
 * The active coaching-rules document. Included in every generation call.
 * See docs/architecture/workflows.md — "Progression ceiling".
 * Rule versioning can be added later; the MVP uses this single document.
 */
export const COACHING_RULES = `## Fitness coach rules for weight training progress

1. Clients are pushed in stages, not every week. Every weekly request carries a
   progression_ceiling with a mode for each exercise. The mode is a ceiling, never an order:
   push less when the week does not support it, never more.
   - "hold": repeat the same series x reps x weight.
   - "reps": add up to 2 reps to compound lifts, and keep every weight unchanged.
   - "weight": add +5 lb to that exercise, and set its reps back to the plan baseline.

2. The ceiling follows these progression rules:
   - Weeks 1 and 2 of a plan: no pushing. The client gets used to the routine first.
   - From week 3: evaluate the completed week. If the client did the work as prescribed,
     push reps only. Weeks 3 and 4 keep the same weights.
   - From week 5: push the weight of an exercise only if the client gave "easy" or "light"
     feedback for that exercise for more than 3 consecutive weeks. +5 lb.
   - After a weight push, that exercise starts again at rule 2, first bullet: no pushing
     for the next 2 weeks.

3. Getting back to the plan baseline is not a push. If some weights dropped below the
   baseline of the plan, the target is to get back there, at any ceiling.

4. Nutrition context matters. A client that is not eating enough calories and protein cannot
   be pushed.

5. Extra daily activities compound and also cause fatigue to the client. Walking and extra
   cardio activities can be a good reason to hold instead of push.

6. Rest days include light activities. Clients should target 10k steps and other cardio
   activities. Ask for personal preferences. Ex. swimming, taking a pilates class, yoga ...
`;
