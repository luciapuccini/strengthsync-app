import { use } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { completedWeeksResource } from '@/api/historyResource'
import { toWeekHistory } from '@/routes/history/toWeekHistory'

/** Temporary wire until plan total_weeks + pagination land. */
export function HistoryPage(): JSX.Element {
  const { clientId, planId } = useParams() as { clientId: string; planId: string }
  const weeks = use(completedWeeksResource(clientId, planId))
  const totalWeeks = Math.max(1, ...weeks.map((week) => week.week_index))
  const history = toWeekHistory(weeks, totalWeeks)
  return <div>{history.length} week(s)</div>
}
