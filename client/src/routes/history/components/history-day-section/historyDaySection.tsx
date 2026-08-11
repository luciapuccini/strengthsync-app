import type { JSX } from 'react'

import type { HistoryDay } from '@/routes/history/toWeekHistory'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shadcn/ui/table'

type HistoryDaySectionProps = {
  day: HistoryDay
  sn: string
}

export function HistoryDaySection({ day, sn }: HistoryDaySectionProps): JSX.Element {
  if (day.day_type === 'rest' || day.day_type === 'swimming') {
    return (
      <div>
        <h2 className="text-sm font-semibold">Day {day.day_index}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {day.day_type === 'rest'
            ? 'Rest day. No strength exercises.'
            : 'Swimming day. No strength exercises.'}
        </p>
      </div>
    )
  }

  return (
    <Table>
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
  )
}
