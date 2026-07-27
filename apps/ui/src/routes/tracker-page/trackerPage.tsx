import { use, useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { GeneratePlanButton } from '@/components/week-tracker/components/generate-plan-button/generatePlanButton'
import { WeekTracker } from '@/components/week-tracker/weekTracker'
import { currentWeekResource } from '@/api/weekResource'
import type { TrackerData } from '@/api/weekResource'
import { useAppStore } from '@/store/useAppStore'

export function TrackerPage(): JSX.Element {
  const clientId = useParams().clientId as string
  const data = use(currentWeekResource(clientId))
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const selectClient = useAppStore((s) => s.selectClient)

  // Hydrate the store synchronously during render (React's "adjust state
  // during render" pattern), guarded by reference equality against the
  // resolved resource. This keeps the store as the single source of truth
  // for `week` (so refreshTracker() can flip this page without a Suspense
  // re-fallback) while avoiding an effect-driven flash or a stale-store
  // frame when switching clients.
  const [hydratedFrom, setHydratedFrom] = useState<TrackerData | null>(null)
  if (hydratedFrom !== data) {
    setHydratedFrom(data)
    useAppStore.getState().hydrateTracker(data)
  }
  const week = useAppStore((s) => s.week)

  useEffect(() => {
    if (selectedClientId !== clientId) selectClient(clientId)
  }, [clientId, selectClient, selectedClientId])

  if (week === null) {
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

  return <WeekTracker clientId={clientId} />
}
