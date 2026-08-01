import { use, useState } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { completedWeeksResource } from '@/api/historyResource'
import { toWeekHistory } from '@/routes/history/toWeekHistory'
import { Button } from '@/shadcn/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shadcn/ui/table'

export function HistoryPage(): JSX.Element {
  const { clientId, planId } = useParams() as { clientId: string; planId: string }
  const { weeks, plan } = use(completedWeeksResource(clientId, planId))
  const history = toWeekHistory(weeks, plan.total_weeks)
  const [page, setPage] = useState(() => Math.max(0, history.length - 1))

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed weeks.</p>
  }

  const index = Math.min(page, history.length - 1)
  const week = history[index]!
  const sn = `S${week.week_index}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          Week {sn} / S{week.total_weeks}
        </h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setPage(index - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index >= history.length - 1}
            onClick={() => setPage(index + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {week.days.map((day) => (
        <Table key={day.day_index}>
          <TableHeader>
            <TableRow>
              <TableHead>Day {day.day_index}</TableHead>
              <TableHead>{sn} - series</TableHead>
              <TableHead>{sn} - reps</TableHead>
              <TableHead>{sn} - weight</TableHead>
              <TableHead>diff previous week</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {day.exercises.map((exercise) => (
              <TableRow key={exercise.exercise_key}>
                <TableCell>{exercise.name}</TableCell>
                <TableCell>{exercise.series ?? ''}</TableCell>
                <TableCell>{exercise.reps ?? ''}</TableCell>
                <TableCell>{exercise.weight == null ? '' : `${exercise.weight}kg`}</TableCell>
                <TableCell>{exercise.diff}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ))}
    </div>
  )
}
