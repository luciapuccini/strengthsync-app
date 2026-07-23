import { Copy } from 'lucide-react'
import type { Dispatch, JSX } from 'react'
import { toast } from 'sonner'

import type { Week, WeekDay } from '@strengthsync/domain/model'

import { DayBlock } from '@/components/week-tracker/components/program/components/day-block/dayBlock'
import { Button } from '@/shadcn/ui/button'
import { Card, CardContent } from '@/shadcn/ui/card'
import type { WeekAction } from '@/state/weekReducer'
import { weekToMarkdown } from '@/state/weekMarkdown'

type ProgramProps = {
  dispatch: Dispatch<WeekAction>
  onSaveDay: (day: WeekDay) => Promise<void>
  week: Week
}

export function Program({ dispatch, onSaveDay, week }: ProgramProps): JSX.Element {
  async function copyWeek(): Promise<void> {
    try {
      await navigator.clipboard.writeText(weekToMarkdown(week))
      toast.success('Week copied')
    } catch {
      toast.error('Could not copy the week')
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border/50 py-3">
          <span className="text-sm font-bold text-foreground/90">Current week</span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 border-primary/40 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
            onClick={copyWeek}
          >
            <Copy className="size-3.5" />
            Copy week
          </Button>
        </div>
        {week.schedule.map((day, index) => (
          <DayBlock
            key={day.day_index}
            day={day}
            dispatch={dispatch}
            isFirst={index === 0}
            onSave={onSaveDay}
          />
        ))}
      </CardContent>
    </Card>
  )
}
