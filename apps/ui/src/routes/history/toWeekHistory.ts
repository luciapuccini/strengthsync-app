import { z } from 'zod'

import { DAY_TYPES } from '@/lib/day-types'
import type { Week } from '@/api/types'

export const HistoryExerciseSchema = z.object({
  exercise_key: z.string().min(1),
  name: z.string(),
  series: z.number().int().nonnegative().nullable(),
  reps: z.number().int().nonnegative().nullable(),
  weight: z.number().nonnegative().nullable(),
  diff: z.string(),
})
export type HistoryExercise = z.infer<typeof HistoryExerciseSchema>

export const HistoryDaySchema = z.object({
  day_index: z.number().int().min(1).max(7),
  day_type: z.enum(DAY_TYPES),
  date: z.string().min(1),
  exercises: z.array(HistoryExerciseSchema),
})
export type HistoryDay = z.infer<typeof HistoryDaySchema>

export const HistoryWeekSchema = z.object({
  week_index: z.number().int().positive(),
  total_weeks: z.number().int().positive(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  days: z.array(HistoryDaySchema),
})
export type HistoryWeek = z.infer<typeof HistoryWeekSchema>

type Scalar = { series: number | null; reps: number | null; weight: number | null }

/** warning: first-set scalar only; upgrade if per-set or modal display is needed. */
function scalars(sets: Week['schedule'][number]['exercises'][number]['sets']): Scalar {
  if (sets.length === 0) return { series: null, reps: null, weight: null }
  const first = sets[0]!
  return { series: sets.length, reps: first.performed_reps, weight: first.performed_weight_kg }
}

function formatDiff(curr: Scalar, prev: Scalar | null): string {
  if (prev === null) return ''
  const parts: string[] = []
  if (curr.weight != null && prev.weight != null && curr.weight !== prev.weight) {
    const delta = curr.weight - prev.weight
    parts.push(`${Math.abs(delta)}kg ${delta > 0 ? '↑' : '↓'}`)
  }
  if (curr.reps != null && prev.reps != null && curr.reps !== prev.reps) {
    const delta = curr.reps - prev.reps
    parts.push(`${Math.abs(delta)} rep/ser ${delta > 0 ? '↑' : '↓'}`)
  }
  return parts.join(' · ')
}

function exerciseLookup(week: Week | undefined): Map<string, Scalar> {
  const map = new Map<string, Scalar>()
  if (week === undefined) return map
  for (const day of week.schedule) {
    for (const exercise of day.exercises) {
      map.set(`${day.day_index}:${exercise.exercise_key}`, scalars(exercise.sets))
    }
  }
  return map
}

export function toWeekHistory(weeks: Week[], totalWeeks: number): HistoryWeek[] {
  const sorted = [...weeks].sort((a, b) => a.week_index - b.week_index)
  const byIndex = new Map(sorted.map((week) => [week.week_index, week]))

  return sorted.map((week) => {
    const prevLookup = exerciseLookup(byIndex.get(week.week_index - 1))
    const days = week.schedule.map((day) =>
      HistoryDaySchema.parse({
        day_index: day.day_index,
        day_type: day.type,
        date: day.date,
        exercises: day.exercises.map((exercise) => {
          const performed = scalars(exercise.sets)
          return HistoryExerciseSchema.parse({
            exercise_key: exercise.exercise_key,
            name: exercise.name,
            ...performed,
            diff: formatDiff(performed, prevLookup.get(`${day.day_index}:${exercise.exercise_key}`) ?? null),
          })
        }),
      }),
    )
    return HistoryWeekSchema.parse({
      week_index: week.week_index,
      total_weeks: totalWeeks,
      start_date: week.start_date,
      end_date: week.end_date,
      days,
    })
  })
}
