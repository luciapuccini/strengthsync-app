import type { JSX } from 'react';

import { CompleteWeekButton } from '@/routes/tracker-page/components/week-tracker/components/complete-week-button/completeWeekButton';
import { weekSummary } from '@/routes/tracker-page/weekSummary';
import { todayIso } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';
import { formatIsoDate } from '@/utils/formatIsoDate';

export function WeekHeader(): JSX.Element {
  const week = useAppStore((s) => s.week)!;
  const plan = useAppStore((s) => s.plan);
  const isOver = todayIso() >= week.end_date;
  const { recordedDays, plannedDays, endWeekday } = weekSummary(week);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Week S{week.week_index}
          {plan !== null && <span className="tabular-nums"> of S{plan.total_weeks}</span>}
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatIsoDate(week.start_date)} – {formatIsoDate(week.end_date)} · {recordedDays} of{' '}
          {plannedDays} training days recorded
        </p>
      </div>
      <div className="flex min-h-11 items-center">
        {isOver ? (
          <CompleteWeekButton />
        ) : (
          <p className="text-sm text-muted-foreground">Ends on {endWeekday}</p>
        )}
      </div>
    </div>
  );
}
