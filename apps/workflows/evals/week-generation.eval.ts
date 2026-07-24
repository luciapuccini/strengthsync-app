import { Eval } from 'braintrust'

import { runGenerateNextWeek } from './run-step.ts'
import { lightProgressionScorer } from './scorers/light-progression.ts'
import { weekQualityScorer } from './scorers/quality.ts'
import fixtures from './fixtures/week-generation.json'

export type WeekEvalCase = (typeof fixtures)[number]

const limit = Number(process.env.EVAL_LIMIT ?? fixtures.length)

Eval('StrengthSync generate_next_week', {
  data: () =>
    fixtures.slice(0, Math.max(1, limit)).map((tc) => ({
      input: tc.input,
      expected: {
        ...tc.input,
        expectedCharacteristics: tc.expectedCharacteristics,
      },
      metadata: { id: tc.id },
    })),

  task: async (input) => runGenerateNextWeek(input),

  scores: [lightProgressionScorer, weekQualityScorer],
})
