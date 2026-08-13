import type { ExerciseFeedback, ExerciseLog, Week, WeekDay } from '@/api/types';

import { isDayComplete, performedCount, updateDay } from './utils/weekUtils';

function updateExercise(
  day: WeekDay,
  exerciseKey: string,
  update: (exercise: ExerciseLog) => ExerciseLog,
): WeekDay {
  const exercises = day.exercises.map((exercise) =>
    exercise.exercise_key === exerciseKey ? update(exercise) : exercise,
  );
  const nextDay = { ...day, exercises };
  return { ...nextDay, completed: exercises.length > 0 && isDayComplete(nextDay) };
}

export function toggleSet(
  week: Week,
  dayIndex: number,
  exerciseKey: string,
  setIndex: number,
): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => {
      if (exercise.skipped) return exercise;
      const done = performedCount(exercise);
      if (setIndex === done - 1) {
        return { ...exercise, sets: exercise.sets.slice(0, -1) };
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
        };
      }
      return exercise;
    }),
  );
}

export function setFeedback(
  week: Week,
  dayIndex: number,
  exerciseKey: string,
  feedback: ExerciseFeedback | null,
): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => ({ ...exercise, feedback })),
  );
}

export function toggleSkip(week: Week, dayIndex: number, exerciseKey: string): Week {
  return updateDay(week, dayIndex, (day) =>
    updateExercise(day, exerciseKey, (exercise) => ({
      ...exercise,
      skipped: !exercise.skipped,
      sets: [],
    })),
  );
}
