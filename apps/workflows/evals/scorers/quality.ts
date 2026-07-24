import { ClosedQA, init } from 'autoevals'
import type { EvalScorer } from 'braintrust'
import OpenAI from 'openai'

import type {
  GenerateNextWeekPromptInput,
  GeneratePlanPromptInput,
  NextWeekSchedule,
} from '@strengthsync/domain/coach'
import type { GeneratedPlanInput } from '@strengthsync/domain/contracts'

import { OPENAI_API_KEY, OPENAI_MODEL } from '../../src/config.ts'

export type QualityFixture = {
  expectedCharacteristics?: string[]
}

/**
 * Autoevals defaults to the Braintrust gateway + gpt-5-mini when
 * BRAINTRUST_API_KEY is set. Route ClosedQA straight to OpenAI with the
 * same model as workflow activities instead.
 */
let judgeReady = false
function ensureJudgeClient(): void {
  if (judgeReady) return
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for ClosedQA quality scorers')
  }
  init({
    client: new OpenAI({ apiKey: OPENAI_API_KEY }),
    defaultModel: OPENAI_MODEL,
  })
  judgeReady = true
}

async function averageClosedQA(args: {
  input: unknown
  output: unknown
  criteria: string[]
}): Promise<{ name: string; score: number; metadata: Record<string, unknown> } | null> {
  if (args.criteria.length === 0) return null
  ensureJudgeClient()

  const inputText = JSON.stringify(args.input)
  const outputText = JSON.stringify(args.output)

  const results = await Promise.all(
    args.criteria.map((criterion) =>
      ClosedQA({
        input: inputText,
        output: outputText,
        criteria: criterion,
        model: OPENAI_MODEL,
      }),
    ),
  )

  const scores = results.map((r) => r.score ?? 0)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length

  return {
    name: 'Characteristics',
    score: avg,
    metadata: {
      criteria: args.criteria,
      scores: Object.fromEntries(args.criteria.map((c, i) => [c, scores[i]])),
      model: OPENAI_MODEL,
    },
  }
}

export const planQualityScorer: EvalScorer<
  GeneratePlanPromptInput,
  GeneratedPlanInput,
  QualityFixture
> = async ({ input, output, expected }) => {
  const criteria = expected?.expectedCharacteristics ?? []
  return averageClosedQA({ input, output, criteria })
}

export const weekQualityScorer: EvalScorer<
  GenerateNextWeekPromptInput,
  NextWeekSchedule,
  QualityFixture
> = async ({ input, output, expected }) => {
  const criteria = expected?.expectedCharacteristics ?? []
  return averageClosedQA({ input, output, criteria })
}
