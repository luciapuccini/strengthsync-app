import { use } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { completedWeeksResource } from '@/api/historyResource'
import { toWeekHistory } from '@/routes/history/toWeekHistory'

/** Temporary wire until pagination UI lands. */
export function HistoryPage(): JSX.Element {
  const { clientId, planId } = useParams() as { clientId: string; planId: string }
  const { weeks, plan } = use(completedWeeksResource(clientId, planId))
  const history = toWeekHistory(weeks, plan.total_weeks)
  return <div>{history.length} week(s)</div>
}
