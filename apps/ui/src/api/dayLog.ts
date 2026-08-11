import type { SaveDayLog, WeekDay } from "./types";

export function toSaveDayLog(day: WeekDay): SaveDayLog {
  return {
    exercises: day.exercises.map((exercise) => ({
      exercise_key: exercise.exercise_key,
      skipped: exercise.skipped,
      feedback: exercise.feedback,
      sets: exercise.skipped ? [] : exercise.sets,
    })),
  };
}
