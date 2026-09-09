import type { ExerciseFeedback, Week } from '../model/index.ts';

/**
 * The staged progression ceiling.
 * See docs/architecture/workflows.md — "Progression ceiling".
 */

export const PROGRESSION_MODES = ['hold', 'reps', 'weight'] as const;
export type ProgressionMode = (typeof PROGRESSION_MODES)[number];

export type ProgressionCeiling = {
  next_week_index: number;
  default_mode: ProgressionMode;
  by_exercise: Record<string, ProgressionMode>;
};

/** Weeks 1 and 2 of a plan settle the routine; evaluation starts at week 3. */
const EVALUATION_STARTS_AT_WEEK = 3;
const WEIGHT_PUSH_STARTS_AT_WEEK = 5;
/** "more than 3 consecutive weeks" of easy/light feedback. */
const EASY_WEEKS_BEFORE_WEIGHT = 4;

const EASY_FEEDBACKS: ExerciseFeedback[] = ['easy', 'light'];

type ExerciseWeek = { weight_lb: number | null; easy: boolean };

function exercisesOfWeek(week: Week): Map<string, ExerciseWeek> {
  const weights = new Map<string, number | null>();
  const feedbacks = new Map<string, (ExerciseFeedback | null)[]>();
  for (const day of week.schedule) {
    for (const exercise of day.exercises) {
      const key = exercise.exercise_key;
      const seen = weights.get(key) ?? null;
      const prescribed = exercise.prescribed.weight_lb;
      // several days can schedule the same lift: the heaviest prescription is the load
      weights.set(key, prescribed === null ? seen : Math.max(prescribed, seen ?? prescribed));
      feedbacks.set(key, [...(feedbacks.get(key) ?? []), exercise.feedback]);
    }
  }
  return new Map(
    [...weights].map(([key, weight_lb]) => {
      const rated = (feedbacks.get(key) ?? []).filter((f) => f !== null);
      return [
        key,
        { weight_lb, easy: rated.length > 0 && rated.every((f) => EASY_FEEDBACKS.includes(f)) },
      ];
    }),
  );
}

type ExerciseHistory = { week_index: number; exercises: Map<string, ExerciseWeek> }[];

function scanExercise(key: string, history: ExerciseHistory) {
  let easyRun = 0;
  let lastPushWeek = 0;
  let lastWeight: number | null = null;
  for (const week of history) {
    const entry = week.exercises.get(key);
    if (!entry) continue;
    if (entry.weight_lb !== null && lastWeight !== null && entry.weight_lb > lastWeight) {
      // a weight push restarts the cycle: the run before it no longer counts
      lastPushWeek = week.week_index;
      easyRun = 0;
    }
    lastWeight = entry.weight_lb ?? lastWeight;
    if (week.week_index > lastPushWeek) easyRun = entry.easy ? easyRun + 1 : 0;
  }
  return { easyRun, lastPushWeek };
}

function exerciseMode(
  key: string,
  history: ExerciseHistory,
  nextWeekIndex: number,
): ProgressionMode {
  const { easyRun, lastPushWeek } = scanExercise(key, history);
  // weeks counted from the last push, or from plan week 1 when there was none
  const cycleWeek = nextWeekIndex - lastPushWeek;
  if (cycleWeek < EVALUATION_STARTS_AT_WEEK) return 'hold';
  if (cycleWeek >= WEIGHT_PUSH_STARTS_AT_WEEK && easyRun >= EASY_WEEKS_BEFORE_WEIGHT) {
    return 'weight';
  }
  return 'reps';
}

export function progressionCeiling(
  nextWeekIndex: number,
  completedWeeks: Week[],
): ProgressionCeiling {
  if (nextWeekIndex < EVALUATION_STARTS_AT_WEEK) {
    return { next_week_index: nextWeekIndex, default_mode: 'hold', by_exercise: {} };
  }
  const history = [...completedWeeks]
    .sort((a, b) => a.week_index - b.week_index)
    .map((week) => ({ week_index: week.week_index, exercises: exercisesOfWeek(week) }));
  const keys = new Set(history.flatMap((week) => [...week.exercises.keys()]));
  return {
    next_week_index: nextWeekIndex,
    default_mode: 'reps',
    by_exercise: Object.fromEntries(
      [...keys].map((key) => [key, exerciseMode(key, history, nextWeekIndex)]),
    ),
  };
}
