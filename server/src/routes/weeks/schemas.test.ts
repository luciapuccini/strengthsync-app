import { describe, expect, it } from 'vitest';

import { SaveDayLogSchema, UpdateDayLogSchema } from './schemas.ts';

/**
 * Relocated from the deleted domain contracts test. The
 * cross-field rule has no JSON Schema representation, so nothing in the
 * generated document proves it survives — only this does.
 */

const skippedWithSets = {
  exercise_key: 'press_banca',
  skipped: true,
  feedback: null,
  sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
};

describe('UpdateDayLogSchema', () => {
  it('accepts a day log with performed sets', () => {
    const log = {
      completed: true,
      exercises: [
        {
          exercise_key: 'press_banca',
          skipped: false,
          feedback: 'hard',
          sets: [
            { performed_reps: 8, performed_weight_kg: 60 },
            { performed_reps: 7, performed_weight_kg: 60 },
          ],
        },
      ],
    };

    expect(UpdateDayLogSchema.parse(log)).toEqual(log);
  });

  it('rejects a skipped exercise with performed sets', () => {
    const result = UpdateDayLogSchema.safeParse({
      completed: false,
      exercises: [skippedWithSets],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a skipped exercise with empty sets', () => {
    const result = UpdateDayLogSchema.safeParse({
      completed: false,
      exercises: [{ exercise_key: 'press_banca', skipped: true, feedback: null, sets: [] }],
    });

    expect(result.success).toBe(true);
  });
});

describe('SaveDayLogSchema', () => {
  it('accepts exercises only and strips unknown keys', () => {
    const exercises = [
      {
        exercise_key: 'press_banca',
        skipped: false,
        feedback: 'hard' as const,
        sets: [{ performed_reps: 8, performed_weight_kg: 60 }],
      },
    ];

    expect(
      SaveDayLogSchema.parse({
        completed: false,
        exercises,
        extra: 'drop-me',
      }),
    ).toEqual({ exercises });
  });

  it('rejects a skipped exercise with performed sets', () => {
    const result = SaveDayLogSchema.safeParse({ exercises: [skippedWithSets] });

    expect(result.success).toBe(false);
  });
});
