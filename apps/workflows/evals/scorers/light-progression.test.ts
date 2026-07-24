import { describe, expect, it } from 'vitest'

import {
  countLightFeedback,
  scoreLightProgression,
  sumPrescribedReps,
  sumPrescribedWeightKg,
} from './light-progression.ts'

function day(
  exercises: Array<{
    feedback: string | null
    reps: number
    weight_kg: number | null
  }>,
) {
  return {
    exercises: exercises.map((ex) => ({
      feedback: ex.feedback,
      prescribed: { reps: ex.reps, weight_kg: ex.weight_kg },
    })),
  }
}

const fourLights = [
  day([
    { feedback: 'light', reps: 8, weight_kg: 60 },
    { feedback: 'light', reps: 8, weight_kg: 50 },
    { feedback: 'light', reps: 6, weight_kg: 80 },
    { feedback: 'light', reps: 5, weight_kg: 90 },
  ]),
]

describe('light progression scorer', () => {
  it('returns null when lightCount <= 3', () => {
    const input = [
      day([
        { feedback: 'light', reps: 8, weight_kg: 60 },
        { feedback: 'light', reps: 8, weight_kg: 50 },
        { feedback: 'easy', reps: 6, weight_kg: 80 },
      ]),
    ]
    const output = [
      day([
        { feedback: null, reps: 10, weight_kg: 60 },
        { feedback: null, reps: 10, weight_kg: 50 },
        { feedback: null, reps: 8, weight_kg: 80 },
      ]),
    ]

    expect(countLightFeedback(input)).toBe(2)
    expect(
      scoreLightProgression({ inputWeekSchedule: input, outputSchedule: output }),
    ).toBeNull()
  })

  it('scores 1 when aggregate reps increase after >3 light signals', () => {
    const output = [
      day([
        { feedback: null, reps: 10, weight_kg: 60 },
        { feedback: null, reps: 10, weight_kg: 50 },
        { feedback: null, reps: 8, weight_kg: 80 },
        { feedback: null, reps: 5, weight_kg: 90 },
      ]),
    ]

    expect(sumPrescribedReps(fourLights)).toBe(27)
    expect(sumPrescribedReps(output)).toBe(33)
    expect(sumPrescribedWeightKg(fourLights)).toBe(280)

    const result = scoreLightProgression({
      inputWeekSchedule: fourLights,
      outputSchedule: output,
    })
    expect(result).toMatchObject({
      name: 'LightProgression',
      score: 1,
      metadata: expect.objectContaining({ lightCount: 4, triggeredBy: 'reps' }),
    })
  })

  it('scores 1 when only aggregate weight increases', () => {
    const output = [
      day([
        { feedback: null, reps: 8, weight_kg: 62.5 },
        { feedback: null, reps: 8, weight_kg: 50 },
        { feedback: null, reps: 6, weight_kg: 80 },
        { feedback: null, reps: 5, weight_kg: 90 },
      ]),
    ]

    const result = scoreLightProgression({
      inputWeekSchedule: fourLights,
      outputSchedule: output,
    })
    expect(result?.score).toBe(1)
    expect(result?.metadata.triggeredBy).toBe('weight')
  })

  it('scores 0 when load does not increase', () => {
    const output = [
      day([
        { feedback: null, reps: 8, weight_kg: 60 },
        { feedback: null, reps: 8, weight_kg: 50 },
        { feedback: null, reps: 6, weight_kg: 80 },
        { feedback: null, reps: 5, weight_kg: 90 },
      ]),
    ]

    const result = scoreLightProgression({
      inputWeekSchedule: fourLights,
      outputSchedule: output,
    })
    expect(result?.score).toBe(0)
    expect(result?.metadata.triggeredBy).toBe('neither')
  })
})
