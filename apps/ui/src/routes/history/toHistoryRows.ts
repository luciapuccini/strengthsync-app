import { z } from 'zod'

import { DayTypeSchema, type Week } from '@strengthsync/domain/model'

export const HistoryRowSchema = z.object({
  week: z.number().int().positive(),
  date: z.string().min(1),
  day_type: DayTypeSchema,
  exercise: z.string(),
  series: z.number().int().nonnegative().nullable(),
  reps: z.string().nullable(),
  weight: z.string().nullable(),
})
export type HistoryRow = z.infer<typeof HistoryRowSchema>

function performedFields(sets: Week['schedule'][number]['exercises'][number]['sets']): {
  series: number | null
  reps: string | null
  weight: string | null
} {
  if (sets.length === 0) return { series: null, reps: null, weight: null }
  return {
    series: sets.length,
    reps: sets.map((set) => String(set.performed_reps)).join(', '),
    weight: sets.map((set) => (set.performed_weight_kg == null ? '' : String(set.performed_weight_kg))).join(', '),
  }
}

export function toHistoryRows(weeks: Week[]): HistoryRow[] {
  const rows: HistoryRow[] = []
  for (const week of weeks) {
    for (const day of week.schedule) {
      if (day.exercises.length === 0) {
        rows.push(
          HistoryRowSchema.parse({
            week: week.week_index,
            date: day.date,
            day_type: day.type,
            exercise: '',
            series: null,
            reps: null,
            weight: null,
          }),
        )
        continue
      }
      for (const exercise of day.exercises) {
        rows.push(
          HistoryRowSchema.parse({
            week: week.week_index,
            date: day.date,
            day_type: day.type,
            exercise: exercise.name,
            ...performedFields(exercise.sets),
          }),
        )
      }
    }
  }
  return rows
}
