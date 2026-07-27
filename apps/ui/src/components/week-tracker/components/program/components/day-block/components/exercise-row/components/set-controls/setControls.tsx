import type { Dispatch, JSX } from 'react'

import type { ExerciseLog } from '@strengthsync/domain/model'

import { Button } from '@/shadcn/ui/button'
import { cn } from '@/shadcn/lib/utils'
import { performedCount } from '@/utils/weekReducer'
import type { WeekAction } from '@/utils/weekReducer'

type SetControlsProps = {
  dayIndex: number
  dispatch: Dispatch<WeekAction>
  exercise: ExerciseLog
}

export function SetControls({
  dayIndex,
  dispatch,
  exercise,
}: SetControlsProps): JSX.Element {
  const done = performedCount(exercise)
  return (
    <div className="ml-6 flex flex-wrap gap-2">
      {Array.from({ length: exercise.prescribed.series }, (_, setIndex) => {
        const isDone = setIndex < done
        const interactive =
          !exercise.skipped && (setIndex === done || setIndex === done - 1)
        return (
          <Button
            key={`${exercise.exercise_key}-set-${setIndex}`}
            type="button"
            variant={isDone ? 'default' : 'outline'}
            disabled={!interactive}
            className={cn('size-11 p-0 text-sm font-bold', !interactive && 'opacity-40')}
            aria-label={`${isDone ? 'Undo' : 'Log'} set ${setIndex + 1} for ${exercise.name}`}
            onClick={() =>
              dispatch({
                type: 'TOGGLE_SET',
                dayIndex,
                exerciseKey: exercise.exercise_key,
                setIndex,
              })
            }
          >
            {setIndex + 1}
          </Button>
        )
      })}
      <Button
        type="button"
        variant={exercise.skipped ? 'secondary' : 'ghost'}
        className="min-h-11 px-3 text-xs"
        onClick={() =>
          dispatch({
            type: 'TOGGLE_SKIP',
            dayIndex,
            exerciseKey: exercise.exercise_key,
          })
        }
      >
        {exercise.skipped ? 'Undo skip' : 'Skip'}
      </Button>
    </div>
  )
}
