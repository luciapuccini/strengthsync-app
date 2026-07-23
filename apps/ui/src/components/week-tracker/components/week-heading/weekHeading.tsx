import type { JSX } from 'react'

import type { Week } from '@strengthsync/domain/model'

import { CompleteWeekButton } from '@/components/week-tracker/components/complete-week-button/completeWeekButton'
import { GeneratePlanButton } from '@/components/week-tracker/components/generate-plan-button/generatePlanButton'

type WeekHeadingProps = {
  clientId: string
  clientName: string
  totalWeeks: number | null
  week: Week
}

export function WeekHeading({
  clientId,
  clientName,
  totalWeeks,
  week,
}: WeekHeadingProps): JSX.Element {
  const trainingDays = week.schedule.filter(
    (day) => day.type !== 'rest' && day.type !== 'swimming',
  ).length
  const restDays = week.schedule.length - trainingDays

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-base font-extrabold text-primary">
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
              Hi, {clientName}
            </h1>
            <p className="text-xs text-muted-foreground md:text-sm">
              Week {week.week_index}
              {totalWeeks === null ? '' : ` of ${totalWeeks}`} · Strength plan
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <GeneratePlanButton clientId={clientId} />
          <CompleteWeekButton clientId={clientId} weekId={week.id} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <b className="font-extrabold text-foreground">{trainingDays}</b> training days
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <b className="font-extrabold text-foreground">{restDays}</b> recovery days
        </div>
      </div>
    </div>
  )
}
