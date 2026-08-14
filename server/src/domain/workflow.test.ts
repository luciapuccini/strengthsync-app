import { describe, expect, it } from 'vitest';

import { GeneratedPlanInputSchema } from './workflow.ts';

/** Relocated from the deleted domain contracts test. */
describe('GeneratedPlanInputSchema', () => {
  it('accepts a generated plan with null rationale', () => {
    const result = GeneratedPlanInputSchema.safeParse({
      label: 'Block 2',
      total_weeks: 4,
      week_template: [],
      rationale: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects a block shorter than four weeks', () => {
    const result = GeneratedPlanInputSchema.safeParse({
      label: 'Block 2',
      total_weeks: 3,
      week_template: [],
      rationale: null,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a block longer than eight weeks', () => {
    const result = GeneratedPlanInputSchema.safeParse({
      label: 'Block 2',
      total_weeks: 9,
      week_template: [],
      rationale: null,
    });

    expect(result.success).toBe(false);
  });
});
