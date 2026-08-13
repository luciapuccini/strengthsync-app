import type { ExerciseLog, Week, WeekDay } from '@/api/types';

export function performedCount(exercise: ExerciseLog): number {
  return exercise.sets.length;
}

export function remainingSets(exercise: ExerciseLog): number {
  return Math.max(0, exercise.prescribed.series - performedCount(exercise));
}

export function isExerciseComplete(exercise: ExerciseLog): boolean {
  return exercise.skipped || performedCount(exercise) >= exercise.prescribed.series;
}

export function isDayComplete(day: WeekDay): boolean {
  if (day.exercises.length === 0) return day.completed;
  return day.exercises.every(isExerciseComplete);
}

export function updateDay(week: Week, dayIndex: number, update: (day: WeekDay) => WeekDay): Week {
  return {
    ...week,
    schedule: week.schedule.map((day) => (day.day_index === dayIndex ? update(day) : day)),
  };
}
