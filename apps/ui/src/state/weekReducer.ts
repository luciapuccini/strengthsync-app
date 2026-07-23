import type {
  ExerciseFeedback,
  ExerciseLog,
  Week,
  WeekDay,
} from '@strengthsync/domain/model'

export type WeekState = Week

export type WeekAction =
  | { type: 'HYDRATE'; week: Week }
  | { type: 'TOGGLE_SET'; dayIndex: number; exerciseKey: string; setIndex: number }
  | {
      type: 'SET_FEEDBACK'
      dayIndex: number
      exerciseKey: string
      feedback: ExerciseFeedback | null
    }
  | { type: 'TOGGLE_SKIP'; dayIndex: number; exerciseKey: string }
  | { type: 'MARK_DAY_COMPLETE'; dayIndex: number }

export function performedCount(exercise: ExerciseLog): number {
  return exercise.sets.length
}

export function remainingSets(exercise: ExerciseLog): number {
  return Math.max(0, exercise.prescribed.series - performedCount(exercise))
}

export function isExerciseComplete(exercise: ExerciseLog): boolean {
  return exercise.skipped || performedCount(exercise) >= exercise.prescribed.series
}

export function isDayComplete(day: WeekDay): boolean {
  if (day.exercises.length === 0) return day.completed
  return day.exercises.every(isExerciseComplete)
}

function updateDay(week: Week, dayIndex: number, update: (day: WeekDay) => WeekDay): Week {
  return {
    ...week,
    schedule: week.schedule.map((day) => (day.day_index === dayIndex ? update(day) : day)),
  }
}

function updateExercise(
  day: WeekDay,
  exerciseKey: string,
  update: (exercise: ExerciseLog) => ExerciseLog,
): WeekDay {
  const exercises = day.exercises.map((exercise) =>
    exercise.exercise_key === exerciseKey ? update(exercise) : exercise,
  )
  const nextDay = { ...day, exercises }
  return { ...nextDay, completed: exercises.length > 0 && isDayComplete(nextDay) }
}

export function toggleSet(
  week: Week,
  dayIndex: number,
  exerciseKey: string,
  setIndex: number,
): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => {
      if (exercise.skipped) return exercise
      const done = performedCount(exercise)
      if (setIndex === done - 1) {
        return { ...exercise, sets: exercise.sets.slice(0, -1) }
      }
      if (setIndex === done && done < exercise.prescribed.series) {
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              performed_reps: exercise.prescribed.reps,
              performed_weight_kg: exercise.prescribed.weight_kg,
            },
          ],
        }
      }
      return exercise
    }),
  )
}

export function setFeedback(
  week: Week,
  dayIndex: number,
  exerciseKey: string,
  feedback: ExerciseFeedback | null,
): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => ({ ...exercise, feedback })),
  )
}

export function toggleSkip(week: Week, dayIndex: number, exerciseKey: string): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => ({
      ...exercise,
      skipped: !exercise.skipped,
      sets: [],
    })),
  )
}

export function markDayComplete(week: Week, dayIndex: number): Week {
  return updateDay(week, dayIndex, (day) => ({ ...day, completed: true }))
}

export function weekReducer(state: WeekState, action: WeekAction): WeekState {
  switch (action.type) {
    case 'HYDRATE':
      return action.week
    case 'TOGGLE_SET':
      return toggleSet(state, action.dayIndex, action.exerciseKey, action.setIndex)
    case 'SET_FEEDBACK':
      return setFeedback(
        state,
        action.dayIndex,
        action.exerciseKey,
        action.feedback,
      )
    case 'TOGGLE_SKIP':
      return toggleSkip(state, action.dayIndex, action.exerciseKey)
    case 'MARK_DAY_COMPLETE':
      return markDayComplete(state, action.dayIndex)
  }
}
