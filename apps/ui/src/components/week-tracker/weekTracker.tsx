import { useCallback, useReducer } from 'react'
import type { JSX } from 'react'

import type { Week, WeekDay } from '@strengthsync/domain/model'

import { saveDayLog } from '@/api/client'
import { toUpdateDayLog } from '@/api/dayLog'
import { invalidateCurrentWeek } from '@/api/weekResource'
import { Program } from '@/components/week-tracker/components/program/program'
import { WeekHeading } from '@/components/week-tracker/components/week-heading/weekHeading'
import { weekReducer } from '@/utils/weekReducer'

type WeekTrackerProps = {
  clientId: string
  initialWeek: Week
  onCompleteWeek: () => void
}

export function WeekTracker({
  clientId,
  initialWeek,
  onCompleteWeek,
}: WeekTrackerProps): JSX.Element {
  const [week, dispatch] = useReducer(weekReducer, initialWeek)

  const saveDay = useCallback(
    async (day: WeekDay): Promise<void> => {
      const savedWeek = await saveDayLog(
        clientId,
        week.id,
        day.day_index,
        toUpdateDayLog(day),
      )
      invalidateCurrentWeek(clientId)
      dispatch({ type: 'HYDRATE', week: savedWeek })
    },
    [clientId, week.id],
  )

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <WeekHeading
        clientId={clientId}
        week={week}
        onCompleteWeek={onCompleteWeek}
      />
      <Program dispatch={dispatch} onSaveDay={saveDay} week={week} />
    </div>
  )
}
