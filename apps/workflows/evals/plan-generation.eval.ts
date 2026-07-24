import { Eval } from 'braintrust'

import { runGeneratePlan } from './run-step.ts'
import { planQualityScorer } from './scorers/quality.ts'
import fixtures from './fixtures/plan-generation.json'

export type PlanEvalCase = (typeof fixtures)[number]

const limit = Number(process.env.EVAL_LIMIT ?? fixtures.length)

Eval('StrengthSync generate_plan', {
  data: () =>
    fixtures.slice(0, Math.max(1, limit)).map((tc) => ({
      input: tc.input,
      expected: {
        ...tc.input,
        expectedCharacteristics: tc.expectedCharacteristics,
      },
      metadata: { id: tc.id },
    })),

  task: async (input) => runGeneratePlan(input),

  scores: [planQualityScorer],
})
