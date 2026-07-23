import { useCallback, useEffect, useReducer } from 'react'
import type { JSX } from 'react'

import type { Week, WeekDay } from '@strengthsync/domain/model'

import { saveDayLog } from '@/api/client'
import { Program } from '@/components/week-tracker/components/program/program'
import { WeekHeading } from '@/components/week-tracker/components/week-heading/weekHeading'
import { toUpdateDayLog } from '@/state/dayLog'
import {
  loadTrackingDraft,
  removeTrackingDraft,
  saveTrackingDraft,
} from '@/state/trackingStorage'
import { invalidateCurrentWeek } from '@/state/weekResource'
import { weekReducer } from '@/state/weekReducer'

type WeekTrackerProps = {
  clientId: string
  clientName: string
  initialWeek: Week
  totalWeeks: number | null
}

export function WeekTracker({
  clientId,
  clientName,
  initialWeek,
  totalWeeks,
}: WeekTrackerProps): JSX.Element {
  const [week, dispatch] = useReducer(
    weekReducer,
    initialWeek,
    (serverWeek) => loadTrackingDraft(serverWeek) ?? serverWeek,
  )

  useEffect(() => {
    saveTrackingDraft(week)
  }, [week])

  const saveDay = useCallback(
    async (day: WeekDay): Promise<void> => {
      const savedWeek = await saveDayLog(
        clientId,
        week.id,
        day.day_index,
        toUpdateDayLog(day),
      )
      removeTrackingDraft(week.id)
      invalidateCurrentWeek(clientId)
      dispatch({ type: 'HYDRATE', week: savedWeek })
    },
    [clientId, week.id],
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <WeekHeading
        clientId={clientId}
        clientName={clientName}
        totalWeeks={totalWeeks}
        week={week}
      />
      <Program dispatch={dispatch} onSaveDay={saveDay} week={week} />
    </div>
  )
}
