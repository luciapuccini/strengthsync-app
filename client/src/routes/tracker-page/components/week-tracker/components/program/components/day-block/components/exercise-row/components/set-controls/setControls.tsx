import type { JSX } from 'react';

import type { ExerciseLog } from '@/api/types';

import { Button } from '@/shadcn/ui/button';
import { cn } from '@/shadcn/lib/utils';
import { trackFirstSetLogged } from '@/lib/analytics';
import { performedCount } from '@/reducers/utils/weekUtils';
import { useAppStore } from '@/store/useAppStore';

type SetControlsProps = {
  dayIndex: number;
  exercise: ExerciseLog;
};

export function SetControls({ dayIndex, exercise }: SetControlsProps): JSX.Element {
  const toggleSet = useAppStore((s) => s.toggleSet);
  const toggleSkip = useAppStore((s) => s.toggleSkip);
  const client = useAppStore((s) => s.client);
  const done = performedCount(exercise);
  return (
    <div className="ml-6 flex flex-wrap gap-2">
      {Array.from({ length: exercise.prescribed.series }, (_, setIndex) => {
        const isDone = setIndex < done;
        const isLogging = setIndex === done;
        const interactive = !exercise.skipped && (isLogging || setIndex === done - 1);
        return (
          <Button
            key={`${exercise.exercise_key}-set-${setIndex}`}
            type="button"
            variant={isDone ? 'default' : 'outline'}
            disabled={!interactive}
            className={cn('size-11 p-0 text-sm font-bold', !interactive && 'opacity-40')}
            aria-label={`${isDone ? 'Undo' : 'Log'} set ${setIndex + 1} for ${exercise.name}`}
            onClick={() => {
              if (isLogging && client !== null) trackFirstSetLogged(client.id);
              toggleSet(dayIndex, exercise.exercise_key, setIndex);
            }}
          >
            {setIndex + 1}
          </Button>
        );
      })}
      <Button
        type="button"
        variant={exercise.skipped ? 'secondary' : 'ghost'}
        className="min-h-11 px-3 text-xs"
        onClick={() => toggleSkip(dayIndex, exercise.exercise_key)}
      >
        {exercise.skipped ? 'Undo skip' : 'Skip'}
      </Button>
    </div>
  );
}
