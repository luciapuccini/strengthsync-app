import { SaveDayLogSchema } from '@strengthsync/domain/contracts'
import type { SaveDayLog } from '@strengthsync/domain/contracts'
import type { WeekDay } from '@strengthsync/domain/model'

export function toSaveDayLog(day: WeekDay): SaveDayLog {
  return SaveDayLogSchema.parse({
    exercises: day.exercises.map((exercise) => ({
      exercise_key: exercise.exercise_key,
      skipped: exercise.skipped,
      feedback: exercise.feedback,
      sets: exercise.skipped ? [] : exercise.sets,
    })),
  })
}
