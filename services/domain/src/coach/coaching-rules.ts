/**
 * The active coaching-rules document. Included in every generation call;
 * the internal context endpoints return it as `coaching_rules`.
 * Ported from the POC's src/app/coach/training_rules.md.
 * Rule versioning can be added later; the MVP uses this single document.
 */
export const COACHING_RULES = `## Fitness coach rules for weight training progress

1. clients need to be pushed weekly. This could mean:
   - if last week some weights dropped below the baseline of the plan, the target is to get back there.
   - if all excersises were accomplished correctly with series x reps as planned, then we want to push the client to have in Compound lifts excersises 2 more reps before changing weights.
   - if all excersises were accomplished correctly with series x reps as planned AND the previous week was already pushing the extra reps, then is time to increase this excersise weight. +1kg

2. Nutrition context matters. A client that is not eating enough calories and protien cannot be pushed.

3. Extra daily activities compond and also cause fatigue to the client. Walking and extra cardio activities can be a good reason to post-pone the pushing rule (1) to next week

4. Rest days, include light activities. Clients should target 10k steps and other cardio activities. Ask for personal preferences. Ex.swimming, taking a pilates class, yoga ...
`
