import { use, useEffect } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { GeneratePlanButton } from '@/components/week-tracker/components/generate-plan-button/generatePlanButton'
import { WeekTracker } from '@/components/week-tracker/weekTracker'
import { useSelectedClient } from '@/state/selectedClient'
import { currentWeekResource } from '@/state/weekResource'

export function TrackerPage(): JSX.Element {
  const clientId = useParams().clientId as string
  const { clientId: selectedClientId, select } = useSelectedClient()
  const data = use(currentWeekResource(clientId))

  useEffect(() => {
    if (selectedClientId !== clientId) select(clientId)
  }, [clientId, select, selectedClientId])

  if (data.week === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">No current week</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a plan to create this client&apos;s first training week.
        </p>
        <div className="mt-4 flex">
          <GeneratePlanButton clientId={clientId} />
        </div>
      </div>
    )
  }

  return (
    <WeekTracker
      clientId={clientId}
      clientName={data.client?.display_name ?? 'Athlete'}
      initialWeek={data.week}
      totalWeeks={data.plan?.total_weeks ?? null}
    />
  )
}
