import { UpdateDayLogSchema } from '@strengthsync/domain/contracts'
import type { UpdateDayLog } from '@strengthsync/domain/contracts'
import type { WeekDay } from '@strengthsync/domain/model'

export function toUpdateDayLog(day: WeekDay): UpdateDayLog {
  return UpdateDayLogSchema.parse({
    completed: day.completed,
    exercises: day.exercises.map((exercise) => ({
      exercise_key: exercise.exercise_key,
      skipped: exercise.skipped,
      feedback: exercise.feedback,
      sets: exercise.skipped ? [] : exercise.sets,
    })),
  })
}
