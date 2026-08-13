import { describe, expect, it } from 'vitest';

import { makeWeek } from '@/test/weekFixture';

import { toSaveDayLog } from './dayLog';

describe('toSaveDayLog', () => {
  it('maps editable exercise fields without a completed flag', () => {
    const day = makeWeek().schedule[0]!;
    day.exercises[0]!.feedback = 'easy';
    day.exercises[0]!.sets = [{ performed_reps: 8, performed_weight_kg: 30 }];

    expect(toSaveDayLog(day)).toEqual({
      exercises: [
        {
          exercise_key: 'bench_press',
          skipped: false,
          feedback: 'easy',
          sets: [{ performed_reps: 8, performed_weight_kg: 30 }],
        },
      ],
    });
  });

  it('always removes sets from a skipped exercise', () => {
    const day = makeWeek().schedule[0]!;
    day.exercises[0]!.skipped = true;
    day.exercises[0]!.sets = [{ performed_reps: 8, performed_weight_kg: 30 }];
    expect(toSaveDayLog(day).exercises[0]!.sets).toEqual([]);
  });
});
