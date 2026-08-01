import type { JSX } from 'react'

import type { Week } from '@strengthsync/domain/model'

import { CompleteWeekButton } from '@/components/week-tracker/components/complete-week-button/completeWeekButton'
import { GeneratePlanButton } from '@/components/week-tracker/components/generate-plan-button/generatePlanButton'

type WeekHeadingProps = {
  clientId: string
  week: Week
}

export function WeekHeading({ clientId, week }: WeekHeadingProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-start gap-2">
        <GeneratePlanButton clientId={clientId} />
        <CompleteWeekButton key={clientId} clientId={clientId} weekId={week.id} />
      </div>
    </div>
  )
}
