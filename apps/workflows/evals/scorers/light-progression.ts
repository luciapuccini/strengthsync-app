import type { EvalScorer } from 'braintrust'

import type {
  GenerateNextWeekPromptInput,
  NextWeekSchedule,
} from '@strengthsync/domain/coach'
import type { WeekDay } from '@strengthsync/domain/model'

type ExerciseLike = {
  feedback?: string | null
  prescribed: { reps: number; weight_kg: number | null }
}

function flattenExercises(
  schedule: Array<{ exercises: ExerciseLike[] }>,
): ExerciseLike[] {
  return schedule.flatMap((day) => day.exercises)
}

export function sumPrescribedReps(schedule: Array<{ exercises: ExerciseLike[] }>): number {
  return flattenExercises(schedule).reduce((sum, ex) => sum + ex.prescribed.reps, 0)
}

export function sumPrescribedWeightKg(
  schedule: Array<{ exercises: ExerciseLike[] }>,
): number {
  return flattenExercises(schedule).reduce(
    (sum, ex) => sum + (ex.prescribed.weight_kg ?? 0),
    0,
  )
}

export function countLightFeedback(
  schedule: Array<{ exercises: ExerciseLike[] }>,
): number {
  return flattenExercises(schedule).filter((ex) => ex.feedback === 'light').length
}

/**
 * When last week had more than 3 `light` feedback signals, expect next week's
 * aggregate prescribed reps or weight_kg to increase.
 * Returns null when the gate does not apply (Braintrust skips).
 */
export function scoreLightProgression(args: {
  inputWeekSchedule: WeekDay[] | Array<{ exercises: ExerciseLike[] }>
  outputSchedule: WeekDay[] | Array<{ exercises: ExerciseLike[] }>
}): { name: string; score: number; metadata: Record<string, unknown> } | null {
  const lightCount = countLightFeedback(args.inputWeekSchedule)
  if (lightCount <= 3) return null

  const sumRepsIn = sumPrescribedReps(args.inputWeekSchedule)
  const sumWeightIn = sumPrescribedWeightKg(args.inputWeekSchedule)
  const sumRepsOut = sumPrescribedReps(args.outputSchedule)
  const sumWeightOut = sumPrescribedWeightKg(args.outputSchedule)

  const repsUp = sumRepsOut > sumRepsIn
  const weightUp = sumWeightOut > sumWeightIn
  const ok = repsUp || weightUp

  return {
    name: 'LightProgression',
    score: ok ? 1 : 0,
    metadata: {
      lightCount,
      sumRepsIn,
      sumRepsOut,
      sumWeightIn,
      sumWeightOut,
      triggeredBy: repsUp ? 'reps' : weightUp ? 'weight' : 'neither',
      reason: ok
        ? 'aggregate load increased after many light signals'
        : 'expected higher aggregate reps or weight after >3 light signals',
    },
  }
}

export const lightProgressionScorer: EvalScorer<
  GenerateNextWeekPromptInput,
  NextWeekSchedule,
  unknown
> = ({ input, output }) => {
  return scoreLightProgression({
    inputWeekSchedule: input.week.schedule,
    outputSchedule: output.schedule,
  })
}
