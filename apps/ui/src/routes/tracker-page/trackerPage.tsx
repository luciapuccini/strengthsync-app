import { use, useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { GeneratePlanButton } from '@/components/week-tracker/components/generate-plan-button/generatePlanButton'
import { WeekTracker } from '@/components/week-tracker/weekTracker'
import { currentWeekResource, invalidateCurrentWeek } from '@/api/weekResource'
import { useAppStore } from '@/store/useAppStore'

export function TrackerPage(): JSX.Element {
  const clientId = useParams().clientId as string
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const selectClient = useAppStore((s) => s.selectClient)
  const [, setResourceVersion] = useState(0)
  const data = use(currentWeekResource(clientId))

  useEffect(() => {
    if (selectedClientId !== clientId) selectClient(clientId)
  }, [clientId, selectClient, selectedClientId])

  const refreshCurrentWeek = useCallback(() => {
    invalidateCurrentWeek(clientId)
    setResourceVersion((version) => version + 1)
  }, [clientId])

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
      initialWeek={data.week}
      onCompleteWeek={refreshCurrentWeek}
    />
  )
}
