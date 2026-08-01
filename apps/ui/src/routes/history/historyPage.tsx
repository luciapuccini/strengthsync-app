import { use } from 'react'
import type { JSX } from 'react'
import { useParams } from 'react-router-dom'

import { completedWeeksResource } from '@/api/historyResource'
import { toHistoryRows } from '@/routes/history/toHistoryRows'
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
  const weeks = use(completedWeeksResource(clientId, planId))
  const rows = toHistoryRows(weeks)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Week</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Day type</TableHead>
          <TableHead>Exercise</TableHead>
          <TableHead>Series</TableHead>
          <TableHead>Reps</TableHead>
          <TableHead>Weight</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.week}-${row.date}-${row.exercise}-${index}`}>
            <TableCell>{row.week}</TableCell>
            <TableCell>{row.date}</TableCell>
            <TableCell>{row.day_type}</TableCell>
            <TableCell>{row.exercise}</TableCell>
            <TableCell>{row.series ?? ''}</TableCell>
            <TableCell>{row.reps ?? ''}</TableCell>
            <TableCell>{row.weight ?? ''}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
