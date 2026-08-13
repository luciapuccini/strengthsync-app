import type { JSX } from 'react';

import type { ExerciseLog, WeekDay } from '@/api/types';

import { FeedbackControls } from './components/feedback-controls/feedbackControls';
import { SetControls } from './components/set-controls/setControls';
import { cn } from '@/shadcn/lib/utils';
import { isExerciseComplete, remainingSets } from '@/reducers/utils/weekUtils';

type ExerciseRowProps = {
  day: WeekDay;
  exercise: ExerciseLog;
};

export function ExerciseRow({ day, exercise }: ExerciseRowProps): JSX.Element {
  const dayIndex = day.day_index;
  const ordinal =
    day.exercises.findIndex((candidate) => candidate.exercise_key === exercise.exercise_key) + 1;
  const remaining = remainingSets(exercise);
  const complete = isExerciseComplete(exercise);
  const weightLabel =
    exercise.prescribed.weight_kg === null ? null : `${exercise.prescribed.weight_kg} kg`;

  return (
    <div className={cn('flex flex-col gap-3 py-2', complete && 'text-muted-foreground')}>
      <div className="flex items-start gap-2">
        <span className="mt-1 w-4 shrink-0 text-xs font-bold text-muted-foreground/70">
          {ordinal}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('text-base font-semibold md:text-lg', complete && 'line-through')}>
            {exercise.name}
            {exercise.prescribed.notes !== null && (
              <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-wide text-primary uppercase no-underline">
                {exercise.prescribed.notes}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-medium text-muted-foreground">
            {exercise.prescribed.series}×{exercise.prescribed.reps} ·{' '}
            {exercise.prescribed.rest_time_sec}s{weightLabel === null ? '' : ` · ${weightLabel}`} ·{' '}
            {exercise.skipped ? 'Skipped' : remaining === 0 ? 'Complete' : `${remaining} remaining`}
          </div>
        </div>
      </div>
      <SetControls dayIndex={dayIndex} exercise={exercise} />
      <FeedbackControls dayIndex={dayIndex} exercise={exercise} />
    </div>
  );
}
