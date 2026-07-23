import { useState } from 'react'
import type { Dispatch, JSX } from 'react'
import { toast } from 'sonner'

import type { WeekDay } from '@strengthsync/domain/model'

import { ExerciseRow } from '@/components/week-tracker/components/program/components/exercise-row/exerciseRow'
import { Badge } from '@/shadcn/ui/badge'
import { Button } from '@/shadcn/ui/button'
import { Spinner } from '@/shadcn/ui/spinner'
import type { WeekAction } from '@/state/weekReducer'

const DAY_TYPE_LABELS: Record<WeekDay['type'], string> = {
  upper_body: 'Upper body',
  leg_day: 'Leg day',
  swimming: 'Swimming',
  cardio: 'Cardio',
  rest: 'Rest',
}

type DayBlockProps = {
  day: WeekDay
  dispatch: Dispatch<WeekAction>
  isFirst: boolean
  onSave: (day: WeekDay) => Promise<void>
}

export function DayBlock({
  day,
  dispatch,
  isFirst,
  onSave,
}: DayBlockProps): JSX.Element {
  const [isSaving, setIsSaving] = useState(false)

  async function saveDay(): Promise<void> {
    setIsSaving(true)
    const dayToSave =
      day.exercises.length === 0 && !day.completed ? { ...day, completed: true } : day
    try {
      await onSave(dayToSave)
      if (dayToSave !== day) {
        dispatch({ type: 'MARK_DAY_COMPLETE', dayIndex: day.day_index })
      }
      toast.success(`Day ${day.day_index} saved`)
    } catch (error) {
      toast.error(`Could not save day ${day.day_index}`, {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className={isFirst ? 'py-4' : 'border-t border-border/50 py-4'}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge
          className={
            day.type === 'upper_body'
              ? 'border-primary/20 bg-primary/15 text-primary'
              : 'bg-foreground/10 text-foreground/70'
          }
        >
          {DAY_TYPE_LABELS[day.type]}
        </Badge>
        <span className="text-sm font-semibold text-muted-foreground">
          Day {day.day_index} · {day.date}
        </span>
        {day.completed && (
          <Badge className="border-primary/20 bg-primary/15 text-primary">Done</Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto min-h-11"
          disabled={isSaving}
          onClick={saveDay}
        >
          {isSaving && <Spinner />}
          {isSaving ? 'Saving…' : 'Save day'}
        </Button>
      </div>
      {day.notes !== null && (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{day.notes}</p>
      )}
      <div className="flex flex-col gap-3">
        {day.exercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.exercise_key}
            dayIndex={day.day_index}
            dispatch={dispatch}
            exercise={exercise}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}
